# Scope: Implementation of Milestones 1 to 5

## Architecture
- HeelsUp is a full-stack Cloudflare Workers application.
- Frontend: React + Vite + Tailwind CSS. Main entry pages: `frontend/src/pages/Admin.tsx`, embedding sub-views in `frontend/src/pages/admin/`.
- Backend: Cloudflare Workers API serving endpoints under `src/routes/`, with SQLite database accessed via Cloudflare D1.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | DbConsole Removal | Delete DbConsole.tsx, occurrences in Admin.tsx, route `/api/admin/query` in src/routes/admin.js | None | PLANNED |
| 2 | Color & Size Input Alignment | Fix ColorsManager.tsx native color picker; replace UK sizes with EU sizes in ProductsManager.tsx | None | PLANNED |
| 3 | Bulk CSV Upload & Template | Implement bulk CSV upload & template download in ProductsManager.tsx, parsing client-side | M2 | PLANNED |
| 4 | POS Terminal Redesign & Channels | Run D1 migration for offline_sales, update POS backend checkout route, and POS checkout UI with channel selector | M1 | PLANNED |
| 5 | Settings & Visual Contrast | Refactor SettingsManager.tsx PUT API to batch PUT, fix all bg-neutral-900 contrast issues | M2, M3, M4 | PLANNED |

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
