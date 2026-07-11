# Storefront Exploration Findings Report

## 1. Observation

### Search Bar & Redirect
- **Header Navigation**: In `frontend/src/components/Header.tsx`, lines 163-170, the navbar search icon is a button that redirects to the Shop page:
  ```typescript
  {/* Search */}
  <button
    onClick={() => navigate('/shop')}
    className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors"
    title="Search"
  >
    <Search className="w-5 h-5" />
  </button>
  ```
- **Shop Page Query Parsing**: In `frontend/src/pages/Shop.tsx`, line 51, the search query is fetched from the URL parameter `q`:
  ```typescript
  const searchQ = searchParams.get('q') || ''
  ```

### Product Filtering & Sorting
- **Shop Page Params**: In `frontend/src/pages/Shop.tsx`, lines 48-53, parameter mapping contains:
  ```typescript
  const category = searchParams.get('cat') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'
  const searchQ = searchParams.get('q') || ''
  const priceMin = searchParams.get('min') || ''
  const priceMax = searchParams.get('max') || ''
  ```
- **Paise Conversion**: Lines 124-125 multiply the minimum/maximum price input values by 100 before making the fetch call:
  ```typescript
  if (priceMin) queryParams.set('min_price', String(Number(priceMin) * 100)) // to paise
  if (priceMax) queryParams.set('max_price', String(Number(priceMax) * 100)) // to paise
  ```
- **Size Filter Support (Backend)**: In `src/routes/products.js`, lines 294-297 show support for size-specific stock checks:
  ```javascript
  if (sizeFilter) {
      where.push(`EXISTS (SELECT 1 FROM product_size_stock pss WHERE pss.product_id = p.id AND pss.size_label = ? AND pss.stock > 0)`);
      binds.push(sizeFilter);
  }
  ```
- **Missing UI Controls**: The sidebar in `Shop.tsx` contains only Category and Price range inputs. There are no UI controls to filter by Size or Color. No color filter exists on the backend list endpoint.

### Product Reviews & Ratings
- **Database Schema**: The database uses the table `product_reviews`, created in `migrations/0003_enterprise.sql` (lines 51-63):
  ```sql
  CREATE TABLE IF NOT EXISTS product_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  ```
  - An additional column `merchant_reply` is added via `migrations/0015_add_review_merchant_reply.sql`:
    ```sql
    ALTER TABLE product_reviews ADD COLUMN merchant_reply TEXT;
    ```
- **Backend Routes**: Handled in `src/routes/reviews.js` (`GET /api/reviews`, `POST /api/reviews`, `GET /api/reviews/latest`, etc.). No backend endpoints match `/api/products/:id/reviews`. Instead, reviews are loaded inline during product details fetch (`GET /api/products/:id` in `src/routes/products.js`).
- **Frontend detail UI**: `frontend/src/pages/Product.tsx` displays review lists and rating averages (lines 332-344, 550-587) and includes a form to submit reviews via `POST /api/reviews` (lines 248-290).

### Profile Page & Order Tracking
- **Order Logs Layout**: purchase history in `frontend/src/pages/Profile.tsx`, lines 1080-1195 lists orders.
- **Visual Stepper Timeline**: Clicking on an order log card opens a modal (`orderDetailsModalOpen` lines 1362-1544) showing a visual 4-step stepper timeline tracking Placed, Confirmed, Shipped, and Delivered statuses (lines 1385-1441).
- **Timeline Placement Gaps**: Neither the individual cards on the Profile order list nor the standalone order tracking page (`frontend/src/pages/OrderTracking.tsx`) currently implement a visual timeline stepper.

### Order Generation Endpoints
- **Initiate Endpoint**: `POST /api/orders/initiate` in `src/routes/orders.js` validates size-specific stock availability from the `product_size_stock` table (line 304), sanitizes/normalizes inputs (line 347), calculates shipping and discounts, calls Razorpay orders API to register the intent, and caches the draft payload in Cloudflare KV under `pending_order:${rzpOrderId}`.
- **Verification Endpoint**: `POST /api/payment/verify` in `src/routes/payment.js` validates the payment signature, retrieves the draft payload from KV, calls `createOrderRecord` to insert into D1 DB `orders` and `order_items` tables, calls `deductSizeStock` to deduct size stock from `product_size_stock` and total stock from `products.stock`, logs the transaction to `inventory_log`, and increments coupon usage.

### frame_ant.js Location & Caching
- **Location**: `frontend/public/frame_ant.js`
- **Interface**: Overrides global `window.fetch`. Exposes global `window.FrameAnt` utility object:
  ```javascript
  window.FrameAnt = {
    clearCache: () => apiCache.clear(),
    getCacheSize: () => apiCache.size,
    prewarm: prewarmEndpoints,
    getStats: () => Array.from(apiCache.keys())
  };
  ```
- **Caching Mechanism**: Uses `apiCache = new Map()` for caching responses (`{ data, timestamp }`) and `requestQueue = new Map()` to queue and join in-flight requests. Performs silent background refreshes on cache hits older than 10 seconds.

### Test Suite Execution
- **Command Run**: `& "C:\Users\Cyrix HealthCare\AppData\Local\node-portable\node-v22.16.0-win-x64\node.exe" tests/e2e/runner.js`
- **Result Output**:
  - Total test cases: 82
  - Passed: 43
  - Failed: 39
- **Verbatim Failures**:
  - `Error: table products has no column named brand: SQLITE_ERROR`
  - `Error: D1 query failed: no such column: sales_channel`
  - `Error: D1 query failed: NOT NULL constraint failed: settings.updated_at`

---

## 2. Logic Chain

1. **Search & Redirect**: Since `Header.tsx` only has an `onClick` callback that triggers `navigate('/shop')`, there is no local search processing in the navbar; the search term is processed solely on the `/shop` route matching query parameter `q` which triggers `Shop.tsx` to search.
2. **Filtering**: Since size/color parameters are absent in the `Shop.tsx` sidebar filter components but present in the database schemas (`product_size_stock`, `inventory`), the size and color filters are fully supported database-wise but unimplemented in the frontend user interface.
3. **Reviews Routing**: Since `productsRouter` does not catch `/api/products/:id/reviews` paths but fetches product reviews on `GET /api/products/:id`, the frontend leverages the single product detail API call to get reviews, and calls the separate `POST /api/reviews` endpoint for submission.
4. **Order Tracking**: Since a visual stepper is only visible inside `orderDetailsModalOpen` in `Profile.tsx`, the standalone `OrderTracking.tsx` page (which currently presents text-based details) is the primary location needing the addition of a visual stepper tracking timeline.
5. **Order Generation**: The draft state is split because the Razorpay checkout is asynchronous; storing the sanitized payload in KV before payment verification guarantees database consistency and prevents stock reservation attacks.
6. **frame_ant.js Caching**: Because the caching mechanism checks cache-age on hit and updates the cache in the background, pages can load instantly (HIT) while fetching updated data asynchronously.
7. **Test Failures**: D1 migrations have schema drift from local table structures, resulting in SQLite column errors (e.g. `brand` and `sales_channel`) when mock endpoints attempt to query or insert data.

---

## 3. Caveats

- Checked only the active codebase routes. Any dead/unused routes in other misc files were ignored.
- Assumed standard SQLite database behavior.
- We did not attempt to fix database schema mismatches in migrations as this is a read-only investigation.

---

## 4. Conclusion

- **Global Search**: Search button redirects to `/shop`. Shop page parses query param `q`.
- **Filtering & Sorting**: Sidebar supports Category and Price (converted to paise). Size and color filter UIs are currently missing.
- **Reviews**: Handled via D1 table `product_reviews`. Submission uses `POST /api/reviews`. Loading uses `GET /api/products/:id`.
- **Order Stepper**: Currently inside Profile order details modal. Missing in list logs and `OrderTracking.tsx`.
- **Checkout Flow**: Initiate writes draft payload to KV. Verify reads KV, inserts order into D1, and deducts size stock.
- **frame_ant.js**: Exposes `clearCache`, `getCacheSize`, `prewarm`, and `getStats` on `window.FrameAnt`. Intercepts GET fetches.
- **Test suite**: 39 out of 82 tests failed, primarily due to SQLite column missing errors (`brand`, `sales_channel`).

---

## 5. Verification Method

To verify these findings, run:
```powershell
& "C:\Users\Cyrix HealthCare\AppData\Local\node-portable\node-v22.16.0-win-x64\node.exe" tests/e2e/runner.js
```
And view files:
- `C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\frontend\public\frame_ant.js`
- `C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\frontend\src\pages\Profile.tsx`
- `C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\frontend\src\pages\Shop.tsx`
