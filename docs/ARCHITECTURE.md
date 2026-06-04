# HeelsUp — Architecture Overview

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Pure HTML, CSS, JavaScript (no framework) |
| Backend | Cloudflare Workers (ES Modules) |
| Database | Cloudflare D1 (SQLite at the edge) |
| Storage | Cloudflare R2 (product images, media) |
| Cache | Cloudflare KV (session data, rate limiting) |
| Payments | Razorpay (Indian payment gateway) |
| Deployment | GitHub Actions → Wrangler deploy |

## Project Structure

```
heelsup/
├── src/                    ← Cloudflare Worker backend
│   ├── index.js            ← Worker entry point (router)
│   ├── middleware/         ← Auth, CORS, rate limiting
│   │   ├── auth.js
│   │   ├── adminAuth.js
│   │   ├── cors.js
│   │   └── ratelimit.js
│   ├── routes/             ← API route handlers (30+ routes)
│   └── utils/              ← DB helpers, JWT, password, R2, Razorpay
│
├── public/                 ← Static frontend (served as Cloudflare Assets)
│   ├── index.html          ← Home page
│   ├── [other pages].html  ← E-commerce pages
│   ├── js/
│   │   ├── core/           ← Core shared modules
│   │   │   ├── config.js       ← window.HEELSUP_CONFIG
│   │   │   └── api-client.js   ← window.HeelsUpAuth (API + auth)
│   │   ├── admin/          ← Admin panel JS
│   │   │   ├── dashboard.js    ← Admin dashboard (85KB engine)
│   │   │   └── enterprise.js   ← Enterprise features
│   │   ├── cart.js         ← window.HeelsUpCart
│   │   ├── wishlist.js     ← window.HeelsUpWishlist
│   │   ├── razorpay.js     ← window.HeelsUpPay
│   │   ├── print.js        ← Print templates
│   │   ├── api.js          ← window.API (convenience wrapper)
│   │   ├── auth.js         ← window.Auth (user session helpers)
│   │   └── ui.js           ← window.showToast, showLoader, etc.
│   ├── css/                ← Stylesheets
│   │   └── (style.css is global — 161KB)
│   ├── img/                ← PWA icons (see img/README.md)
│   ├── policy/             ← Legal pages
│   ├── _headers            ← Cloudflare Pages security headers
│   ├── _redirects          ← Cloudflare Pages URL redirects
│   ├── robots.txt          ← SEO crawl rules
│   ├── sitemap.xml         ← SEO sitemap
│   ├── manifest.json       ← PWA manifest
│   └── sw.js               ← Service Worker
│
├── migrations/             ← Numbered D1 migrations (applied by Wrangler)
│   ├── 0001_init.sql
│   ├── 0002_seed.sql
│   └── ...
│
├── schema/
│   ├── schema.sql          ← Master schema (reference)
│   └── seeds/              ← Dev seed data
│
├── scripts/                ← Development tools (not deployed)
│
├── wrangler.toml           ← Cloudflare configuration
└── package.json            ← NPM scripts
```

## Request Flow

```
Browser → Cloudflare Edge
              │
              ├─ /api/*   → Cloudflare Worker (src/index.js)
              │                │
              │                ├─ Rate limit check (KV)
              │                ├─ Auth middleware (JWT)
              │                └─ Route handler → D1/R2/Razorpay
              │
              └─ /*       → Cloudflare Assets (public/)
                               │
                               └─ HTML/CSS/JS served from edge cache
```

## API Naming

- Public: `/api/products`, `/api/categories`, `/api/cart`, `/api/wishlist`
- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- Orders: `/api/orders`
- Payment: `/api/payment/create-order`, `/api/payment/verify`
- Admin: `/api/admin/*` (requires admin JWT)

## Frontend JavaScript Globals

| Global | Source File | Purpose |
|--------|-------------|----------|
| `window.HEELSUP_CONFIG` | `js/core/config.js` | Runtime config (API_BASE) |
| `window.HeelsUpAuth` | `js/core/api-client.js` | API client with auth, cache, retry |
| `window.HeelsUpCart` | `js/cart.js` | Cart (localStorage) |
| `window.HeelsUpWishlist` | `js/wishlist.js` | Wishlist (localStorage + API sync) |
| `window.HeelsUpPay` | `js/razorpay.js` | Razorpay checkout |
| `window.HeelsUpUI` | `app-common.js` | Shared UI: toast, loader, skeleton |
| `window.API` | `js/api.js` | REST API shorthand |
| `window.Auth` | `js/auth.js` | User session helpers |

## Load Order (per page)

```html
<!-- 1. Config first -->
<script src="js/core/config.js"></script>
<!-- 2. API client (depends on config) -->
<script src="js/core/api-client.js"></script>
<!-- 3. Cart + Wishlist utilities -->
<script src="js/cart.js"></script>
<script src="js/wishlist.js"></script>
<!-- 4. Page-specific JS (inline or external) -->
```

## Cloudflare Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 Database | All application data |
| `MEDIA` | R2 Bucket | Product images |
| `KV` | KV Namespace | Rate limiting, session data |
| `ASSETS` | Static Assets | Frontend files from public/ |
