-- Run this once in your Supabase SQL Editor on an existing Amorae database.
-- Adds top-level delivery columns to the orders table so the seller dashboard can
-- SELECT SUM(delivery_fee) for the period report and so the RPC can persist the
-- fee as first-class data (instead of hiding it inside the address JSONB).
--
-- This migration is idempotent and safe to re-run.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Optional: backfill the new top-level columns from any historical orders that
-- already store the fee inside the address JSONB. This is best-effort; rows
-- that don't carry the value will simply stay at 0.
UPDATE public.orders
SET
  delivery_fee = COALESCE(NULLIF(address->>'deliveryFee', '')::NUMERIC, 0),
  delivery_distance_km = NULLIF(address->>'distanceKm', '')::NUMERIC,
  delivery_status = NULLIF(address->>'deliveryStatus', ''),
  delivery_notes = NULLIF(address->>'deliveryNotes', '')
WHERE
  delivery_fee = 0
  AND address ? 'deliveryFee';

-- Index the period report hot path.
CREATE INDEX IF NOT EXISTS idx_orders_delivery_fee
  ON public.orders (delivery_fee)
  WHERE delivery_fee > 0;

-- Replace the create_order_with_inventory RPC to persist the new columns.
-- The previous definition is dropped first so we can redefine the return type
-- and the column list.
DROP FUNCTION IF EXISTS public.create_order_with_inventory(JSONB);

CREATE OR REPLACE FUNCTION public.create_order_with_inventory(order_payload JSONB)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_id UUID := gen_random_uuid();
  order_item JSONB;
  requested_quantity INTEGER;
  available_quantity INTEGER;
  tracks_inventory BOOLEAN;
  normalized_phone TEXT;
  material_requirement RECORD;
  material_available_quantity NUMERIC;
  material_unit_cost NUMERIC;
  manual_cogs NUMERIC := 0;
  order_cogs NUMERIC := 0;
  order_total NUMERIC := 0;
  order_delivery_fee NUMERIC := 0;
  order_delivery_distance NUMERIC := NULL;
  catalog_price NUMERIC;
BEGIN
  IF jsonb_array_length(COALESCE(order_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  normalized_phone := regexp_replace(order_payload->>'phoneNormalized', '\D', '', 'g');
  IF length(normalized_phone) < 10 THEN
    RAISE EXCEPTION 'A valid customer phone is required';
  END IF;

  FOR order_item IN SELECT * FROM jsonb_array_elements(order_payload->'items')
  LOOP
    IF COALESCE(order_item->>'productId', '') = ''
      OR COALESCE(order_item->>'name', '') = ''
      OR COALESCE((order_item->>'quantity')::INTEGER, 0) <= 0 THEN
      RAISE EXCEPTION 'Every order item requires a product, name, and positive quantity';
    END IF;

    requested_quantity := (order_item->>'quantity')::INTEGER;

    IF order_item->>'productId' LIKE 'custom_%' THEN
      SELECT "offerPrice" INTO catalog_price
      FROM public.products
      WHERE id::TEXT = replace(order_item->>'productId', 'custom_', '');
    ELSE
      catalog_price := CASE order_item->>'productId'
        WHEN 'gd46g23h' THEN 50
        WHEN 'gd47g34h' THEN 75
        WHEN 'gd48g45h' THEN 90
        WHEN 'gd49g56h' THEN 280
        WHEN 'gd50g67h' THEN 265
        WHEN 'gd51g68h' THEN 45
        WHEN 'gd52g69h' THEN 325
        WHEN 'gd53g70h' THEN 95
        ELSE NULL
      END;
    END IF;

    IF catalog_price IS NULL OR catalog_price <= 0 THEN
      RAISE EXCEPTION 'Producto inválido o sin precio: %', order_item->>'name';
    END IF;
    IF COALESCE((order_item->>'offerPrice')::NUMERIC, -1) <> catalog_price THEN
      RAISE EXCEPTION 'El precio de % cambió. Actualiza tu carrito.', order_item->>'name';
    END IF;
    order_total := order_total + catalog_price * requested_quantity;

    SELECT stock_quantity, track_inventory
    INTO available_quantity, tracks_inventory
    FROM public.inventory
    WHERE product_id = order_item->>'productId'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory is not configured for %', order_item->>'name';
    END IF;

    IF tracks_inventory AND available_quantity < requested_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para %', order_item->>'name';
    END IF;
  END LOOP;

  FOR material_requirement IN
    SELECT
      recipe.material_id,
      SUM(recipe.quantity * (item.value->>'quantity')::NUMERIC) AS required_quantity
    FROM jsonb_array_elements(order_payload->'items') AS item(value)
    JOIN public.product_recipes recipe
      ON recipe.product_id = item.value->>'productId'
    GROUP BY recipe.material_id
  LOOP
    SELECT stock_quantity, cost_per_unit
    INTO material_available_quantity, material_unit_cost
    FROM public.raw_materials
    WHERE id = material_requirement.material_id
    FOR UPDATE;

    IF NOT FOUND OR material_available_quantity < material_requirement.required_quantity THEN
      RAISE EXCEPTION 'Materia prima insuficiente';
    END IF;

    order_cogs := order_cogs + material_requirement.required_quantity * material_unit_cost;
  END LOOP;

  SELECT COALESCE(SUM(
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM public.product_recipes recipe
      WHERE recipe.product_id = item.value->>'productId'
    ) THEN COALESCE(product."manualCost", 0) * (item.value->>'quantity')::NUMERIC ELSE 0 END
  ), 0)
  INTO manual_cogs
  FROM jsonb_array_elements(order_payload->'items') AS item(value)
  LEFT JOIN public.products product
    ON ('custom_' || product.id::TEXT) = item.value->>'productId';
  order_cogs := order_cogs + manual_cogs;

  -- Delivery fee / distance / status from the payload. Stored at the top level
  -- and mirrored into address for back-compat with any code that still reads
  -- it from there.
  BEGIN
    order_delivery_fee := GREATEST(0, COALESCE((order_payload->>'deliveryFee')::NUMERIC, 0));
  EXCEPTION WHEN OTHERS THEN
    order_delivery_fee := 0;
  END;
  BEGIN
    IF order_payload ? 'deliveryDistanceKm' AND order_payload->>'deliveryDistanceKm' IS NOT NULL THEN
      order_delivery_distance := (order_payload->>'deliveryDistanceKm')::NUMERIC;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    order_delivery_distance := NULL;
  END;

  INSERT INTO public.orders (
    id, phone_normalized, status, amount, cogs,
    delivery_fee, delivery_distance_km, delivery_status, delivery_notes,
    payment_method, is_paid,
    customer, address, items, notes, created_at, updated_at
  )
  VALUES (
    new_order_id,
    normalized_phone,
    CASE
      WHEN auth.uid() IS NOT NULL THEN COALESCE(order_payload->>'status', 'Recibido')
      ELSE 'Recibido'
    END,
    order_total,
    order_cogs,
    order_delivery_fee,
    order_delivery_distance,
    order_payload->>'deliveryStatus',
    order_payload->>'deliveryNotes',
    CASE
      WHEN auth.uid() IS NOT NULL THEN COALESCE(order_payload->>'paymentMethod', 'whatsapp')
      ELSE 'whatsapp'
    END,
    CASE
      WHEN auth.uid() IS NOT NULL THEN COALESCE((order_payload->>'isPaid')::BOOLEAN, false)
      ELSE false
    END,
    order_payload->'customer',
    -- Mirror fee/distance/status into address for back-compat with any
    -- downstream reader that hasn't been updated yet.
    order_payload->'address' || jsonb_build_object(
      'deliveryFee', order_delivery_fee,
      'deliveryDistanceKm', order_delivery_distance,
      'deliveryStatus', order_payload->>'deliveryStatus'
    ),
    order_payload->'items',
    order_payload->'address'->>'notes',
    NOW(),
    NOW()
  );

  FOR order_item IN SELECT * FROM jsonb_array_elements(order_payload->'items')
  LOOP
    requested_quantity := (order_item->>'quantity')::INTEGER;

    SELECT track_inventory INTO tracks_inventory
    FROM public.inventory
    WHERE product_id = order_item->>'productId';

    UPDATE public.inventory
    SET stock_quantity = CASE
          WHEN track_inventory THEN stock_quantity - requested_quantity
          ELSE stock_quantity
        END,
        updated_at = NOW()
    WHERE product_id = order_item->>'productId';

    IF tracks_inventory THEN
      INSERT INTO public.inventory_movements (
        product_id, quantity_change, reason, reference_id
      )
      VALUES (
        order_item->>'productId', -requested_quantity, 'Venta', new_order_id
      );
    END IF;
  END LOOP;

  FOR material_requirement IN
    SELECT
      recipe.material_id,
      SUM(recipe.quantity * (item.value->>'quantity')::NUMERIC) AS required_quantity
    FROM jsonb_array_elements(order_payload->'items') AS item(value)
    JOIN public.product_recipes recipe
      ON recipe.product_id = item.value->>'productId'
    GROUP BY recipe.material_id
  LOOP
    UPDATE public.raw_materials
    SET stock_quantity = stock_quantity - material_requirement.required_quantity,
        updated_at = NOW()
    WHERE id = material_requirement.material_id;

    INSERT INTO public.material_movements(material_id, quantity_change, reason, reference_id)
    VALUES (material_requirement.material_id, -material_requirement.required_quantity, 'Venta', new_order_id);
  END LOOP;

  RETURN QUERY SELECT * FROM public.orders WHERE id = new_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_inventory(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(JSONB) TO anon, authenticated;
