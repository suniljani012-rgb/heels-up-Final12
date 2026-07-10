# Scope: Implementation of Milestones 2 to 5

## Architecture
- HeelsUp is structured as a full-stack Cloudflare Workers application.
- Backend: Cloudflare Workers API serving endpoints under `src/routes/`. Built-in D1 database interface, R2 for media upload, KV for keys/caching.
- Frontend: React application built with Vite and Tailwind CSS. The admin panel layout is in `frontend/src/pages/Admin.tsx`, which embeds various manager sub-views located in `frontend/src/pages/admin/`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 2 | Color & Size Input Alignment | Fix ColorsManager.tsx native color picker; replace UK sizes with EU sizes in ProductsManager.tsx | None | PLANNED |
| 3 | Bulk CSV Upload & Template | Implement bulk CSV upload & template download in ProductsManager.tsx, parsing client-side | M2 | PLANNED |
| 4 | POS Terminal Redesign & Channels | Run D1 migration for offline_sales, update POS backend checkout route, and POS checkout UI with channel selector | None | PLANNED |
| 5 | Settings & Visual Contrast Alignment | Refactor SettingsManager.tsx PUT API to batch PUT, fix all bg-neutral-900 contrast issues | M2, M3, M4 | PLANNED |

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
