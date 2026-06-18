# Seller Security

The seller dashboard uses Supabase Auth whenever Supabase is configured.

## Production setup

1. Create the seller user in Supabase under **Authentication > Users**.
2. Run `supabase/security_migration.sql` in the Supabase SQL Editor. Re-run it
   after pulling inventory updates; the script is idempotent.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Leave `VITE_ADMIN_PASSWORD` empty in production.

`VITE_` environment variables are embedded in browser JavaScript. They must
never contain an administrator password, service-role key, or other secret.

The local password fallback is enabled only by Vite development builds and
stores a four-hour session in `sessionStorage`.

## Inventory security

- Storefront visitors can read current availability, but only authenticated
  sellers can adjust quantities, thresholds, products, or order statuses.
- Checkout uses `create_order_with_inventory`, which locks inventory rows,
  validates every requested quantity and recipe ingredient, snapshots cost of
  goods, creates the order, and deducts finished goods plus raw materials in
  one database transaction.
- Manual stock changes use `adjust_inventory` and write an authenticated audit
  entry to `inventory_movements`.
- Raw-material purchases use weighted-average unit cost. Recipes store the
  grams, milliliters, liters, kilograms, or units consumed by one sale.
- Expenses and material costs are seller-only; the finance dashboard computes
  net profit from delivered sales minus COGS and operating expenses.
- Never restore public write policies on `products`, `inventory`, or
  `inventory_movements`.

## Remaining privacy consideration

Customer order tracking is scoped to an exact normalized phone number through
the `get_orders_by_phone` function. For stronger customer privacy, add a second
factor such as the order ID or a one-time code.
