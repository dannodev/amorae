# Amorae — Agent Guide

## Stack

React 19 + Vite 7 + Tailwind CSS v4 + Supabase + react-router-dom v7.  
Plain JSX (no TypeScript). ESLint only — no tests, no pre-commit hooks, no CI.

## Commands (run from `client/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on `0.0.0.0:5173` (LAN accessible) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |

## Tailwind v4 quirks

Config is **inline** in `src/index.css` using `@import "tailwindcss"` + `@theme` block — there is no `tailwind.config.js`. Custom colors are `--color-primary: #DEB887` and `--color-primary-dull: #D2691E`.

## Project structure

```
client/src/
  main.jsx          — BrowserRouter + AppContextProvider wrapping App
  App.jsx           — Routes, conditionally renders <Navbar/> (hidden on /seller)
  context/AppContext — Global state: cart, orders, products, search
  assets/assets.js  — Image imports, dummyProducts[], categories[]
  config/supabase.js — Supabase client init
```

| Route | Page |
|-------|------|
| `/` | Home (MainBanner, Categories, BestSeller, etc.) |
| `/products` | Products grid with search filter |
| `/product/:id` | Product details |
| `/cart` | Cart review |
| `/checkout` | Checkout form |
| `/my-orders` | Order lookup by phone |
| `/seller` | Admin panel (no Navbar, own sidebar layout) |

## State & persistence

- **Cart**: `localStorage` key `amorae_cart`, hydrated in context init.
- **Orders**: `localStorage` key `amorae_orders` when Supabase is unavailable. Supabase is active only when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
- **Products**: `dummyProducts[]` from `assets.js` merged with custom products from Supabase `products` table (or `localStorage` key `amorae_custom_products` as fallback). Seller panel can add/delete custom products via `addProduct()` / `deleteProduct()` in context.
- **Custom products (Seller)**: `AppContext` provides `addProduct(productData)` and `deleteProduct(productId)`. Saves to Supabase `products` table when configured, falls back to `localStorage`. Image upload uses FileReader → base64 data URL.
- **Currency**: `VITE_CURRENCY` env var (default `$`).

## Env vars (client/.env)

| Var | Default | Purpose |
|-----|---------|---------|
| `VITE_CURRENCY` | `$` | Currency symbol |
| `VITE_SUPABASE_URL` | `""` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `""` | Supabase anon/public key |
| `VITE_WHATSAPP_BUSINESS_NUMBER` | `523312345678` | WhatsApp number for orders |
| `VITE_ADMIN_PASSWORD` | unset | Password for `/seller` admin panel |

## Conventions

- UI text is in **Spanish** (toasts, labels, placeholders).
- Mobile-first: all layouts default to mobile, wrap in `sm:/md:/lg:` breakpoints.
- Mobile bottom nav (md:hidden) in `Navbar.jsx` with Home, Search, Cart, Orders icons — page content needs `pb-20 md:pb-0`.
- Login modal uses `fixed inset-0 z-50` with `backdrop-blur-sm`.
- `@theme` custom colors go in `src/index.css`, not in Tailwind config.
- Import context hook as `import { useAppContext } from '../context/AppContext'`.
- Using `eslint-disable` comments is accepted (seen in `assets.js` and `AppContext.jsx`).
- `.env` is gitignored. Copy `.env.example` to `.env` for local development.
- No `import React` needed — React 19 auto-JSX. Remove it if you see it.
- Valid Tailwind `scale` values: 50, 75, 90, 95, 100, 105, 110, 125, 150 (not 102 or 108).

## Supabase setup

SQL scripts in `supabase/`:
- `setup.sql` — creates `orders` table with RLS (public insert + select, authenticated-only update/delete)
- `setup_products_table.sql` — creates `products` table with full public access (password gate in app provides protection)

## Seller route

`/seller` hides the global `<Navbar/>` and renders its own layout — a fixed sidebar on desktop, a bottom tab nav on mobile. The page wrapper in `App.jsx` removes padding when `isSellerPath` is true. Dashboard shows order counts by status; Orders tab uses card-based list with inline status dropdown and WhatsApp button per order.
- Products tab shows all products (dummy + custom) with add/delete functionality.
- Add-product form uses FileReader to read images as data URLs for persistence.
