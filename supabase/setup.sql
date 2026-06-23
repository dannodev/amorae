-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- Create the orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_normalized TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Recibido' CHECK (status IN ('Recibido', 'Preparando', 'En Camino', 'Listo para recoger', 'Entregado')),
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  cogs NUMERIC NOT NULL DEFAULT 0 CHECK (cogs >= 0),
  payment_method TEXT DEFAULT 'whatsapp',
  is_paid BOOLEAN DEFAULT false,
  customer JSONB,
  address JSONB,
  items JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for phone lookup (used by /my-orders)
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (phone_normalized);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert orders (no auth needed)
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Only signed-in administrators may list orders directly.
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can read orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;

CREATE POLICY "Authenticated users can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Restrict updates/deletes to authenticated users only
CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Customer tracking is exposed only through this phone-scoped function.
-- It returns matching orders without granting anonymous access to the table.
CREATE OR REPLACE FUNCTION public.get_orders_by_phone(requested_phone TEXT)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.orders
  WHERE phone_normalized = regexp_replace(requested_phone, '\D', '', 'g')
    AND length(regexp_replace(requested_phone, '\D', '', 'g')) BETWEEN 10 AND 15
    AND payment_method = 'whatsapp'
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_orders_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_orders_by_phone(TEXT) TO anon, authenticated;
