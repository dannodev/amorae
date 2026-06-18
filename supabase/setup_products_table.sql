-- Run this in your Supabase SQL Editor to create the products table

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  "offerPrice" NUMERIC,
  "manualCost" NUMERIC NOT NULL DEFAULT 0 CHECK ("manualCost" >= 0),
  image JSONB DEFAULT '[]'::jsonb,
  description JSONB DEFAULT '[]'::jsonb,
  "inStock" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view products (no auth needed for customer browsing)
DROP POLICY IF EXISTS "Anyone can view products" ON products;
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

-- Product mutations require a valid Supabase Auth session.
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;
DROP POLICY IF EXISTS "Anyone can delete products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS inventory (
  product_id TEXT PRIMARY KEY,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
  ON inventory_movements (product_id, created_at DESC);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can view movements" ON inventory_movements;
DROP POLICY IF EXISTS "Authenticated users can create movements" ON inventory_movements;

CREATE POLICY "Anyone can view inventory"
  ON inventory FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO inventory (product_id, stock_quantity, low_stock_threshold)
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
  FROM inventory
  WHERE product_id = target_product_id
  FOR UPDATE;

  previous_quantity := COALESCE(previous_quantity, 0);
  resulting_quantity := GREATEST(0, previous_quantity + quantity_delta);

  INSERT INTO inventory (product_id, stock_quantity)
  VALUES (target_product_id, resulting_quantity)
  ON CONFLICT (product_id) DO UPDATE
  SET stock_quantity = resulting_quantity,
      updated_at = NOW();

  INSERT INTO inventory_movements (product_id, quantity_change, reason)
  VALUES (target_product_id, resulting_quantity - previous_quantity, movement_reason);

  RETURN resulting_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_inventory(TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_inventory(TEXT, INTEGER, TEXT) TO authenticated;
