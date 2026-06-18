-- Run once in Supabase SQL Editor after the raw-material tables exist.
-- Adds purchase traceability to material movements and replaces the restock RPC
-- so each purchase can store supplier and batch/lote information.

ALTER TABLE public.material_movements
  ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS batch_code TEXT NOT NULL DEFAULT '';

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

  INSERT INTO public.material_movements(
    material_id, quantity_change, reason, unit_cost, supplier, batch_code
  )
  VALUES (
    target_material_id,
    quantity_added,
    movement_reason,
    purchase_cost / quantity_added,
    COALESCE(supplier_name, ''),
    COALESCE(batch_code, '')
  );

  RETURN current_material;
END;
$$;

REVOKE ALL ON FUNCTION public.restock_raw_material(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restock_raw_material(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
