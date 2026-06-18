-- Run once in Supabase SQL Editor on an existing Amorae database.
-- Create the seller account first in Authentication > Users.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cogs NUMERIC NOT NULL DEFAULT 0 CHECK (cogs >= 0);
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "manualCost" NUMERIC NOT NULL DEFAULT 0 CHECK ("manualCost" >= 0);

DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;

CREATE POLICY "Authenticated users can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Authenticated users can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.get_orders_by_phone(requested_phone TEXT)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.orders
  WHERE phone_normalized = regexp_replace(requested_phone, '\D', '', 'g')
    AND payment_method = 'whatsapp'
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_orders_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_orders_by_phone(TEXT) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.inventory (
  product_id TEXT PRIMARY KEY,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
  ON public.inventory_movements (product_id, created_at DESC);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Authenticated users can create movements" ON public.inventory_movements;

CREATE POLICY "Anyone can view inventory"
  ON public.inventory FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage inventory"
  ON public.inventory FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view movements"
  ON public.inventory_movements FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create movements"
  ON public.inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO public.inventory (product_id, stock_quantity, low_stock_threshold)
VALUES
  ('gd46g23h', 18, 5),
  ('gd47g34h', 12, 4),
  ('gd48g45h', 8, 3),
  ('gd49g56h', 6, 2),
  ('gd50g67h', 9, 3),
  ('gd51g68h', 14, 4),
  ('gd52g69h', 4, 2),
  ('gd53g70h', 10, 3)
ON CONFLICT (product_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.raw_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')),
  stock_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold NUMERIC NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  cost_per_unit NUMERIC NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
  supplier TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_recipes (
  product_id TEXT NOT NULL,
  material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (product_id, material_id)
);

CREATE TABLE IF NOT EXISTS public.material_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity_change NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  unit_cost NUMERIC,
  supplier TEXT NOT NULL DEFAULT '',
  batch_code TEXT NOT NULL DEFAULT '',
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  incurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_product_recipes_product ON public.product_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_material_movements_material ON public.material_movements(material_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(incurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_fee
  ON public.orders (delivery_fee)
  WHERE delivery_fee > 0;

ALTER TABLE public.material_movements
  ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS batch_code TEXT NOT NULL DEFAULT '';

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage raw materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Authenticated users can manage recipes" ON public.product_recipes;
DROP POLICY IF EXISTS "Authenticated users can view material movements" ON public.material_movements;
DROP POLICY IF EXISTS "Authenticated users can create material movements" ON public.material_movements;
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON public.expenses;

CREATE POLICY "Authenticated users can manage raw materials"
  ON public.raw_materials FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage recipes"
  ON public.product_recipes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view material movements"
  ON public.material_movements FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create material movements"
  ON public.material_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.adjust_inventory(
  target_product_id TEXT,
  quantity_delta INTEGER,
  movement_reason TEXT DEFAULT 'Ajuste manual'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_quantity INTEGER;
  resulting_quantity INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT stock_quantity INTO previous_quantity
  FROM public.inventory
  WHERE product_id = target_product_id
  FOR UPDATE;

  previous_quantity := COALESCE(previous_quantity, 0);
  resulting_quantity := GREATEST(0, previous_quantity + quantity_delta);

  INSERT INTO public.inventory (product_id, stock_quantity)
  VALUES (target_product_id, resulting_quantity)
  ON CONFLICT (product_id) DO UPDATE
  SET stock_quantity = resulting_quantity,
      updated_at = NOW();

  INSERT INTO public.inventory_movements (product_id, quantity_change, reason)
  VALUES (target_product_id, resulting_quantity - previous_quantity, movement_reason);

  RETURN resulting_quantity;
END;
$$;

DROP FUNCTION IF EXISTS public.restock_raw_material(UUID, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.restock_raw_material(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.restock_raw_material(
  target_material_id UUID,
  quantity_added NUMERIC,
  purchase_cost NUMERIC,
  movement_reason TEXT DEFAULT 'Compra',
  supplier_name TEXT DEFAULT '',
  batch_code TEXT DEFAULT ''
)
RETURNS public.raw_materials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_material public.raw_materials;
  next_quantity NUMERIC;
  next_unit_cost NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF quantity_added <= 0 OR purchase_cost < 0 THEN RAISE EXCEPTION 'Invalid purchase values'; END IF;

  SELECT * INTO current_material FROM public.raw_materials
  WHERE id = target_material_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Raw material not found'; END IF;

  next_quantity := current_material.stock_quantity + quantity_added;
  next_unit_cost := (
    current_material.stock_quantity * current_material.cost_per_unit + purchase_cost
  ) / next_quantity;

  UPDATE public.raw_materials
  SET stock_quantity = next_quantity, cost_per_unit = next_unit_cost, updated_at = NOW()
  WHERE id = target_material_id
  RETURNING * INTO current_material;

  INSERT INTO public.material_movements(material_id, quantity_change, reason, unit_cost, supplier, batch_code)
  VALUES (target_material_id, quantity_added, movement_reason, purchase_cost / quantity_added, COALESCE(supplier_name, ''), COALESCE(batch_code, ''));
  RETURN current_material;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_raw_material(
  target_material_id UUID,
  quantity_delta NUMERIC,
  movement_reason TEXT DEFAULT 'Ajuste manual'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_quantity NUMERIC;
  resulting_quantity NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT stock_quantity INTO previous_quantity FROM public.raw_materials
  WHERE id = target_material_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Raw material not found'; END IF;

  resulting_quantity := GREATEST(0, previous_quantity + quantity_delta);
  UPDATE public.raw_materials SET stock_quantity = resulting_quantity, updated_at = NOW()
  WHERE id = target_material_id;
  INSERT INTO public.material_movements(material_id, quantity_change, reason)
  VALUES (target_material_id, resulting_quantity - previous_quantity, movement_reason);
  RETURN resulting_quantity;
END;
$$;

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

REVOKE ALL ON FUNCTION public.adjust_inventory(TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restock_raw_material(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_raw_material(UUID, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_with_inventory(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_inventory(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restock_raw_material(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_raw_material(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(JSONB) TO anon, authenticated;
