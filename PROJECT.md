# Project: HeelsUp Admin Panel & POS Redesign

## Architecture
HeelsUp is structured as a full-stack Cloudflare App:
1. **Backend**: Cloudflare Workers API serving endpoints under `src/routes/`. Built-in D1 database interface, R2 for media upload, KV for keys/caching.
2. **Frontend**: React application built with Vite and Tailwind CSS. The admin panel layout is in `frontend/src/pages/Admin.tsx`, which embeds various manager sub-views located in `frontend/src/pages/admin/`.

## Code Layout
- `src/` - Cloudflare Workers backend code
  - `src/routes/` - Individual routes (products.js, pos.js, settings.js, admin.js, etc.)
  - `src/index.js` - Worker entry point and routing dispatcher
- `frontend/` - Frontend React/Vite/Tailwind project
  - `frontend/src/pages/Admin.tsx` - Main admin dashboard layout and routing tab selector
  - `frontend/src/pages/admin/` - Admin tab components (ProductsManager.tsx, PosTerminal.tsx, SettingsManager.tsx, ColorsManager.tsx, etc.)
- `migrations/` - SQLite schema migrations for D1 database
- `schema/` - Seed SQL files and database schemas

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | DbConsole Removal | Delete DbConsole.tsx, references in Admin.tsx, and backend route `/api/admin/query` | None | DONE |
| 2 | Color & Size Input Alignment | Fix ColorsManager.tsx native color picker; replace UK sizes with EU sizes in ProductsManager.tsx | None | DONE |
| 3 | Bulk CSV Upload & Template | Implement bulk CSV upload & template download in ProductsManager.tsx, parsing client-side | M2 | DONE |
| 4 | POS Terminal Redesign & Channels | Run D1 migration for offline_sales, update POS backend checkout route, and POS checkout UI with channel selector | M1 | DONE |
| 5 | Settings & Visual Contrast Alignment | Refactor SettingsManager.tsx PUT API to batch PUT, fix all bg-neutral-900 contrast issues | M2, M3, M4 | DONE |
| 6 | Storefront Enhancements | Implement search, filters, reviews, order tracking timeline, cache performance | M1-M5 | DONE |
| 7 | Verification & Forensic Audit | Fix 15 failing tests and add storefront E2E tests | M1-M6 | DONE |
| 8.1 | Fix Admin Product Gallery Previews | Fix the ReferenceError in upload.js, path-based keys support, and admin previews | None | PLANNED |
| 8.2 | Convert HEIC Images to PNG | HEIC conversion using proxy URL at the edge with fallback | M8.1 | PLANNED |
| 8.3 | Storefront Preloading | Edge HTML preloaded data injection and frame_ant.js cache hit mapping | None | PLANNED |
| 8.4 | Verification & Audit | E2E test runs and Forensic Auditor checks | M8.1, M8.2, M8.3 | PLANNED |


## Interface Contracts
### POS Checkout API (`POST /api/pos/sale`)
- Request payload:
  ```json
  {
    "customer_name": "string",
    "customer_phone": "string",
    "payment_method": "cash | card",
    "notes": "string",
    "items": [
      { "product_id": 1, "size_label": "37", "quantity": 1, "price": 85000 }
    ],
    "sales_channel": "POS | WhatsApp | Instagram"
  }
  ```
- Response: `{ "success": true, "sale_id": 123 }`

### Settings Bulk Update API (`PUT /api/admin/settings`)
- Request payload: `{ "settings_key_1": "value", "settings_key_2": "value" }` (Updates multiple keys simultaneously)
- Response: `{ "success": true }`

### Products Bulk Upload API (`POST /api/products/bulk`)
- Request payload: `{ "products": [ { "name": "Name", "sku": "SKU", "category": "Heels", "price": 99900, "mrp": 129900, "stock": 10, "sizes": ["36"], "size_stock": [{"size": "36", "stock": 10}], "description": "desc" } ] }`
- Response: `{ "success": true, "count": 1 }`
