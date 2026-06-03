# HeelsUp — Security Guide

## Authentication

- JWT tokens stored in `localStorage` as `heelsup_token`
- Tokens expire after 30 days (configurable via `JWT_EXPIRES_DAYS`)
- Admin routes require `role = 'admin'` in JWT payload
- Staff routes require `role = 'admin' || 'staff'`

## Secrets Management

NEVER commit secrets to Git. All sensitive values are managed via:

```bash
# Set Cloudflare Worker secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put ADMIN_BOOTSTRAP_EMAIL
npx wrangler secret put ADMIN_BOOTSTRAP_PASSWORD
```

## Security Headers

Applied via `public/_headers` (Cloudflare Pages):
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS (1 year)
- `Content-Security-Policy` — restricts script/style/image sources
- `Permissions-Policy` — restricts camera, mic, geolocation
- `Referrer-Policy: strict-origin-when-cross-origin`

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 10 req | 15 min |
| `/api/payment/*` | 5 req | 1 min |
| `/api/admin/*` | 200 req | 1 min |
| All other API | 60 req | 1 min |

## CORS

Configured in `src/middleware/cors.js`. Production origin: `https://heelsup.in`.

## Admin Access

- Admin panel at `/admin.html` — protected by client-side auth check AND JWT verification on every API call
- Bootstrap admin created via `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` env vars
- All admin API calls go through `/api/admin/*` which runs `adminAuth` middleware

## Known Issues / TODO

- [ ] PWA icons in `/img/` still need to be generated
- [ ] `logo.png` is 462KB — convert to WebP for performance
- [ ] Consider adding CSP nonces for inline scripts
- [ ] Enable HSTS preloading after ensuring HTTPS everywhere
