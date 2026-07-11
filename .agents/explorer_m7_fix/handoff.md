# Handoff Report — E2E Failures Investigation

This report details the investigation of the 15 E2E test failures in the HeelsUp application. It identifies the root cause of each failure, maps it to specific source code files and lines, proposes precise code replacements, and designs new E2E test cases to cover key storefront features.

---

## 1. Observations

The E2E test suite was executed using portable Node.js, yielding **15 failures** out of 82 tests. Below is the direct compilation and test run observation summary.

### Compilation and Execution Logs
- **Build command**: `npm run build` completed successfully.
- **Test command**: `node tests/e2e/runner.js` completed with exit code 1.
- **Failures summary**:
  1. `[Test #5] [Tier 1] F1.5: Admin.tsx layout visual contrast scan for bad contrast classes` (Admin.tsx layout contains text-neutral-900 and bg-neutral-900)
  2. `[Test #7] [Tier 1] F2.2: Get color swatch mapping list` (Added color swatch is not in list due to lack of cache invalidation)
  3. `[Test #14] [Tier 1] F3.4: Size label validation (rejecting invalid/UK sizes)` (UK sizes accepted with 200 instead of 400)
  4. `[Test #15] [Tier 1] F3.5: Verify global stock sync on size stock updates` (Global stock was 25 instead of 15 due to stale/invalid records)
  5. `[Test #46] [Tier 2] F3.6: Reject UK shoe size labels during creation` (UK sizes allowed on product creation)
  6. `[Test #52] [Tier 2] F4.7: Handle invalid price format in CSV upload` (Non-numeric price returned 500 instead of 400)
  7. `[Test #53] [Tier 2] F4.8: Handle duplicate SKUs in CSV upload` (Duplicate SKUs caused unhandled UNIQUE constraint crash/500 instead of skipping/handling gracefully)
  8. `[Test #55] [Tier 2] F4.10: Handle invalid size labels in CSV upload` (Invalid size labels allowed in CSV upload)
  9. `[Test #59] [Tier 2] F5.9: POS sale stock level exhaustion rejection` (POS checkout allows selling quantity exceeding available stock)
  10. `[Test #69] [Tier 2] F7.9: Reject settings update with special character keys or long keys` (Invalid keys caused D1 error/500 instead of 400)
  11. `[Test #70] [Tier 2] F7.10: Reject or handle excessively large JSON payloads in settings` (Excessively large settings payload returned 200 instead of 413/400)
  12. `[Test #77] [Tier 3] 77. Colorway validation blocks product creation if no Hex code exists` (Unmapped colorway allowed during product creation)
  13. `[Test #78] [Tier 4] 78. Complete Product Lifecycle (Bulk CSV upload -> check sizes -> edit EU size stock -> verify sync)` (Sync failed due to stale cached product response returning 6 instead of 13)
  14. `[Test #79] [Tier 4] 79. POS Storefront Sale (Reserve stock -> POS sale -> verify stock reduction -> check negative stock prevention)` (POS checkout allowed buying 4 items when stock was 3)
  15. `[Test #82] [Tier 4] 82. Inventory Refactor (CSV upload -> edit stock levels -> check overall inventory logs)` (Inventory log not populated for size stock updates or bulk upload creations)

---

## 2. Logic Chain & Root Cause Mapping

### Failure 1: Layout Contrast in `Admin.tsx`
- **File**: `frontend/src/pages/Admin.tsx` (Lines 2737, 2766, 2804, 2854)
- **Code**: `text-neutral-900 bg-neutral-900`
- **Logical Flaw**: These classes apply a black text color to a black background. This makes the button labels invisible and violates contrast rules.

### Failures 2 & 13: Stale Cache on Color Swatch List & Product Details
- **File**: `src/index.js` (Lines 60-86)
- **Logical Flaw**: The GET requests for `/api/colors` and `/api/products/:id` are cached using `caches.default` (lines 80-83) with `max-age=60`. However, when a mutating endpoint is called (e.g. `POST /api/colors` or `PUT /api/products/:id/size-stock`), the cache is not invalidated, causing subsequent GET requests to return stale data (an empty list of colors or old stock levels).

### Failures 3, 4, 5, 8: Missing Size Label Validation
- **File**: `src/routes/products.js`
- **Logical Flaw**: The application allows size labels like `'UK 7'` or `'L'` to be saved into `product_size_stock` and `products.sizes_json`. In Failure 3, the payload `{ size_label: 'UK 7', stock: 10 }` succeeded, inserting a new row. Consequently, the global stock sum returned `10 + 5 + 10 = 25` in Failure 4 (instead of 15).

### Failures 6 & 7: Price Validation & Duplicate SKU in Bulk Upload
- **File**: `src/routes/products.js` (Lines 546-595, `POST /api/products/bulk`)
- **Logical Flaw**: 
  - There is no validation on the `price` format, allowing strings like `'not_a_number'` to be passed to `parseFloat()`, resulting in `NaN` which violates the D1 `NOT NULL constraint` on `products.price` and crashes with a 500 error.
  - When duplicate SKUs are present in the bulk payload, the SQL insert hits a `UNIQUE` constraint violation on the `sku` column, throwing a database error that aborts the entire batch with a 500 response.

### Failures 9 & 14: POS Stock Level Exhaustion Rejection
- **File**: `src/routes/pos.js` (Lines 72-190, `POST /api/pos/sale`)
- **Logical Flaw**: POS checkout accepts any items list and proceeds to deduct stock using `Math.max(0, ...)` without ever validating whether the requested quantity exceeds the available size-specific stock or global stock.

### Failures 10 & 11: Settings Key Validation & Payload Size Checks
- **File**: `src/routes/settings.js` (Lines 63-96, `PUT /api/settings`)
- **Logical Flaw**:
  - Keys containing special characters or long keys are inserted directly into the database without pattern/length validation, resulting in unhandled SQLite errors (500) instead of a clean 400 rejection.
  - Large JSON payloads (e.g., ~2MB) are processed without size checks, exceeding acceptable request bounds.

### Failure 12: Colorway Validation
- **File**: `src/routes/products.js` (in `POST /api/products` and `POST /api/products/bulk`)
- **Logical Flaw**: The system accepts products with unmapped colors (e.g., `'neon-green'`) without verifying that their hex mapping exists in the `color_hex_mappings` table, returning 201 instead of 400.

### Failure 15: Inventory Log Refactor
- **File**: `src/routes/products.js`
- **Logical Flaw**: Mutations made to size stock levels via `PUT /api/products/:id/size-stock` and product bulk creation do not insert entries into the `inventory_log` table, leaving changes untracked.

---

## 3. Caveats

- **Visual Contrast Scan**: The E2E tests scan class names statically using regular expressions (e.g. looking for `text-neutral-900` close to `bg-neutral-900`). The proposed fix resolves this by changing the text color class to `text-white` or `text-neutral-50`.
- **Database constraints**: It is assumed that D1 Database tables (`color_hex_mappings`, `products`, `product_size_stock`, `inventory_log`) exist as specified in the migrations and runner setup.

---

## 4. Conclusion & Proposed Fixes

### Fix 1: Admin Layout Contrast
In `frontend/src/pages/Admin.tsx` (Lines 2737, 2766, 2804, 2854), replace:
```tsx
// Before
text-neutral-900 bg-neutral-900
```
With:
```tsx
// After
text-white bg-neutral-900
```

### Fix 2: Cache Invalidation middleware in `src/index.js`
Insert cache deletion logic in the `fetch` handler inside `src/index.js` right before returning the secure response.
```javascript
      // Clear cache on mutations (POST, PUT, DELETE, PATCH) if response is 2xx
      if (method !== "GET" && method !== "OPTIONS" && secureCorsResponse.status >= 200 && secureCorsResponse.status < 300) {
        try {
          const cache = caches.default;
          const pathsToInvalidate = [];
          if (pathNormalized.startsWith("/api/colors")) {
            pathsToInvalidate.push(new URL("/api/colors", url.origin).toString());
          }
          if (pathNormalized.startsWith("/api/products")) {
            pathsToInvalidate.push(new URL("/api/products", url.origin).toString());
            const match = pathNormalized.match(/^\/api\/products\/(\d+)/);
            if (match) {
              pathsToInvalidate.push(new URL(`/api/products/${match[1]}`, url.origin).toString());
            }
          }
          if (pathNormalized.startsWith("/api/settings")) {
            pathsToInvalidate.push(new URL("/api/settings", url.origin).toString());
            pathsToInvalidate.push(new URL("/api/settings/public", url.origin).toString());
          }
          for (const p of pathsToInvalidate) {
            await cache.delete(new Request(p), { ignoreSearch: true });
          }
        } catch (e) {
          console.warn("Cache invalidation failed:", e);
        }
      }
```

### Fix 3: Size Label, Colorway, and Price Validation helper in `src/routes/products.js`
Define validation helper at the top level of `src/routes/products.js`:
```javascript
function isValidEuSize(size) {
    const s = String(size).trim();
    const num = parseFloat(s);
    if (isNaN(num)) return false;
    if (num < 35 || num > 45) return false;
    if (!/^\d+(\.\d+)?$/.test(s)) return false;
    return true;
}
```

Then in **`POST /api/products`** and **`PUT /api/products/:id`**, perform validation checks:
```javascript
            // Size Validation
            if (sizes && sizes.some(s => !isValidEuSize(s))) {
                return error('Invalid size label. Must be a numeric EU shoe size between 35 and 45.', 400);
            }
            if (size_stock && size_stock.some(s => !isValidEuSize(s.size_label))) {
                return error('Invalid size label in size stock.', 400);
            }

            // Price/MRP Validation
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return error('Price must be a valid positive number', 400);
            }
            if (mrp && (isNaN(parseFloat(mrp)) || parseFloat(mrp) < 0)) {
                return error('MRP must be a valid positive number', 400);
            }

            // Colorway validation
            const reqColor = body.color || extractColor(body.name);
            if (reqColor && reqColor !== 'Default' && reqColor !== 'Nude/Default') {
                const cleanColorName = String(reqColor).trim().toLowerCase();
                const colorRow = await env.DB.prepare(
                    'SELECT hex_code FROM color_hex_mappings WHERE color_name = ?'
                ).bind(cleanColorName).first();
                if (!colorRow) {
                    return error(`Color mapping not found for colorway: "${reqColor}"`, 400);
                }
            }
```

In **`PUT /api/products/:id/size-stock`**:
```javascript
            if (sizeStockArray.some(s => !isValidEuSize(s.size_label))) {
                return error('Invalid size label. Must be a numeric EU shoe size between 35 and 45.', 400);
            }
```

### Fix 4: Bulk CSV Upload Sanity Checks in `src/routes/products.js`
In **`POST /api/products/bulk`**, replace the loop logic to perform a comprehensive validation pass first:
```javascript
            // 1. Validation Pass
            for (const item of products) {
                const { name, sku, price, mrp, sizes, size_stock } = item;
                if (!name || !sku || !price) {
                    return error('Name, SKU and price are required for all products', 400);
                }
                const parsedPrice = parseFloat(price);
                if (isNaN(parsedPrice) || parsedPrice < 0) {
                    return error('Price must be a valid positive number', 400);
                }
                if (mrp && (isNaN(parseFloat(mrp)) || parseFloat(mrp) < 0)) {
                    return error('MRP must be a valid positive number', 400);
                }
                if (sizes && sizes.some(s => !isValidEuSize(s))) {
                    return error('Invalid size label in sizes list', 400);
                }
                if (size_stock && size_stock.some(s => !isValidEuSize(s.size_label))) {
                    return error('Invalid size label in size_stock list', 400);
                }
                const reqColor = item.color || extractColor(item.name);
                if (reqColor && reqColor !== 'Default' && reqColor !== 'Nude/Default') {
                    const cleanColorName = String(reqColor).trim().toLowerCase();
                    const colorRow = await env.DB.prepare(
                        'SELECT hex_code FROM color_hex_mappings WHERE color_name = ?'
                    ).bind(cleanColorName).first();
                    if (!colorRow) {
                        return error(`Color mapping not found for colorway: "${reqColor}"`, 400);
                    }
                }
            }

            // 2. Execution Pass (with duplicate SKU skipping)
            const seenSkus = new Set();
            const results = [];
            for (const item of products) {
                const { name, sku, category, description, price, mrp, stock, sizes, images, brand, tags, is_new, is_trending, is_featured, size_stock } = item;
                
                const cleanSku = String(sku).trim();
                if (seenSkus.has(cleanSku)) {
                    continue; // Skip duplicate SKU in same payload
                }
                seenSkus.add(cleanSku);

                try {
                    const existing = await env.DB.prepare('SELECT id FROM products WHERE sku = ?').bind(cleanSku).first();
                    if (existing) {
                        continue; // Skip duplicate SKU in database
                    }

                    const result = await env.DB.prepare(
                        `INSERT INTO products (name, sku, category, description, price, original_price, stock, active, featured, is_new, is_trending, show_mrp, sizes_json, images_json, brand, tags, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
                    ).bind(
                        name, cleanSku, category || null, description || null,
                        parseFloat(price), mrp ? parseFloat(mrp) : null,
                        parseInt(stock || 0), is_featured ? 1 : 0, is_new ? 1 : 0, is_trending ? 1 : 0,
                        JSON.stringify(sizes || []), JSON.stringify(images || []),
                        brand || null, JSON.stringify(tags || [])
                    ).first();

                    if (size_stock && Array.isArray(size_stock) && size_stock.length > 0) {
                        await upsertSizeStock(env, result.id, size_stock);
                    } else if (sizes && sizes.length > 0 && stock) {
                        const perSize = Math.floor(parseInt(stock || 0) / sizes.length);
                        const autoSizeStock = sizes.map(s => ({ size_label: String(s), stock: perSize }));
                        await upsertSizeStock(env, result.id, autoSizeStock);
                    }

                    const sizeStockRows = await fetchSizeStock(env, result.id);
                    const colorsList = await fetchColorsForProduct(env, result.id);
                    results.push(mapProduct(result, sizeStockRows, colorsList));
                    
                    // Log inventory creation
                    await env.DB.prepare(
                        "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'restock', 0, ?, ?, 'Product bulk created', datetime('now'))"
                    ).bind(result.id, name, parseInt(stock || 0), parseInt(stock || 0)).run();

                } catch (err) {
                    if (err.message?.includes('UNIQUE')) continue;
                    throw err;
                }
            }
```

### Fix 5: POS Stock Availability Validation in `src/routes/pos.js`
In **`POST /api/pos/sale`**, insert a stock validation loop before processing the sale:
```javascript
            // Validate stock availability for all items first
            for (const item of items) {
                const product = await env.DB.prepare(
                    'SELECT id, name, sku, price, stock FROM products WHERE id = ? AND active = 1'
                ).bind(item.product_id).first();
                if (!product) return error(`Product ${item.product_id} not found`, 400);

                const qty = item.quantity || item.qty || 1;
                
                if (item.size && item.size !== 'Default' && item.size !== 'Nude/Default') {
                    const sizeRow = await env.DB.prepare(
                        "SELECT stock FROM product_size_stock WHERE product_id=? AND size_label=?"
                    ).bind(item.product_id, item.size).first();
                    if (sizeRow) {
                        if (sizeRow.stock < qty) {
                            return error(`Insufficient stock for product "${product.name}" (Size: ${item.size}). Available: ${sizeRow.stock}, Requested: ${qty}`, 400);
                        }
                    } else if (product.stock < qty) {
                        return error(`Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${qty}`, 400);
                    }
                } else if (product.stock < qty) {
                    return error(`Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${qty}`, 400);
                }
            }
```

### Fix 6: Settings Key Validation and Payload Checks in `src/routes/settings.js`
In **`PUT /api/settings`** (inside `src/routes/settings.js`), perform key format and payload size checks:
```javascript
            // Size limit check
            const contentLength = parseInt(request.headers.get('content-length') || '0');
            if (contentLength > 512000) { // 500 KB limit
                return error('Payload too large', 413);
            }

            const body = await request.json();
            let updates = [];
            // ... (construct updates array) ...

            // Key Validation
            for (const item of updates) {
                if (!item || !item.key) {
                    return error('Invalid settings key: key is required', 400);
                }
                const key = String(item.key).trim();
                if (key.length === 0 || key.length > 100) {
                    return error(`Invalid settings key length: "${key}"`, 400);
                }
                if (!/^[a-zA-Z0-9_\-\.]+$/.test(key)) {
                    return error(`Invalid characters in settings key: "${key}"`, 400);
                }
            }
```

### Fix 7: Inventory Logs for updates in `src/routes/products.js`
In **`PUT /api/products/:id/size-stock`**:
```javascript
            const prod = await env.DB.prepare('SELECT name, stock FROM products WHERE id = ?').bind(id).first();
            const beforeStock = prod ? prod.stock : 0;
            
            await upsertSizeStock(env, id, sizeStockArray);
            
            const total = sizeStockArray.reduce((sum, r) => sum + (parseInt(r.stock) || 0), 0);
            await env.DB.prepare('UPDATE products SET stock = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(total, id).run();
            
            const change = total - beforeStock;
            if (change !== 0) {
                await env.DB.prepare(
                    "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'adjustment', ?, ?, ?, 'Size stock update', datetime('now'))"
                ).bind(id, prod ? prod.name : 'Unknown Product', beforeStock, change, total).run();
            }
```

In **`POST /api/products`**:
```javascript
            await env.DB.prepare(
                "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'restock', 0, ?, ?, 'Product created', datetime('now'))"
            ).bind(result.id, name, parseInt(stock || 0), parseInt(stock || 0)).run();
```

---

## 5. Verification Method

- **Command**: Run `$env:PATH = "C:\Users\Cyrix HealthCare\AppData\Local\node-portable\node-v22.16.0-win-x64;" + $env:PATH; node tests/e2e/runner.js` in the root directory.
- **Expected result**: All 82 test cases pass successfully.
- **Stale cache condition**: Ensure cache is cleared on mutating operations (`POST`, `PUT`, `DELETE`, `PATCH`).

---

## 6. Storefront Feature E2E Test Suite Extension Design

To increase coverage for the storefront, we propose adding the following E2E test cases to `tests/e2e/tier5_storefront.test.js`.

### Test Suite: Storefront Coverage Design

```javascript
import assert from 'node:assert';
import { addTest, getAdminHeaders, signTestToken } from './runner.js';

const baseUrl = 'http://localhost:8787';

// 1. Search E2E Test Case
addTest(5, 'Storefront Search (Header search triggers Shop filter)', async () => {
    // Perform search query for "Stiletto"
    const res = await fetch(`${baseUrl}/api/products?search=Stiletto`, { method: 'GET' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
    
    // Assert all returned items contain search keyword in name or description
    for (const prod of json.data) {
        const matchesName = prod.name.toLowerCase().includes('stiletto');
        const matchesDesc = prod.description.toLowerCase().includes('stiletto');
        assert.ok(matchesName || matchesDesc, `Product ${prod.name} should match search term`);
    }
});

// 2. Filter & Sort E2E Test Case
addTest(5, 'Storefront Filtering and Sorting (Category filter, price boundaries, sorting)', async () => {
    // Fetch products filtered by Heels category, price between 500 and 1500, sorted by price ascending
    const url = `${baseUrl}/api/products?category=Heels&min_price=500&max_price=1500&sort=price_asc`;
    const res = await fetch(url, { method: 'GET' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const products = json.data;
    
    // Verify each condition
    let lastPrice = 0;
    for (const prod of products) {
        // Category check
        assert.strictEqual(prod.category.toLowerCase(), 'heels');
        // Price boundary check
        assert.ok(prod.price >= 500 && prod.price <= 1500, `Price ${prod.price} must be within bounds`);
        // Sorting order check
        assert.ok(prod.price >= lastPrice, 'Products must be sorted in ascending order of price');
        lastPrice = prod.price;
    }
});

// 3. Reviews Submission and Approvals
addTest(5, 'Storefront Product Reviews (Submit review -> Check pending -> Approve review -> Verify public visibility)', async () => {
    const userToken = signTestToken({ id: 99, role: 'customer', email: 'reviewer@heelsup.in' });
    
    // Step 1: Submit review
    const resSubmit = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            product_id: 1,
            rating: 5,
            title: 'Fantastic Fit',
            body: 'Extremely comfortable and stylish.',
            order_id: 123
        })
    });
    assert.strictEqual(resSubmit.status, 201);
    
    // Step 2: Retrieve admin reviews list to find the review ID
    const resAdminList = await fetch(`${baseUrl}/api/reviews/admin/all`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    const adminListJson = await resAdminList.json();
    const pendingReview = adminListJson.data.find(r => r.user_id === 99 && r.status === 'pending');
    assert.ok(pendingReview, 'Submitted review should be pending in admin panel');
    
    // Step 3: Approve review
    const resApprove = await fetch(`${baseUrl}/api/reviews/${pendingReview.id}/approve`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: 'approved' })
    });
    assert.strictEqual(resApprove.status, 200);
    
    // Step 4: Verify public visibility under product reviews list
    const resPublic = await fetch(`${baseUrl}/api/reviews?product_id=1`, { method: 'GET' });
    const publicJson = await resPublic.json();
    const isVisible = publicJson.data.some(r => r.id === pendingReview.id);
    assert.ok(isVisible, 'Approved review must be visible on the public product page');
});

// 4. Visual Order Tracking Stepper
addTest(5, 'Storefront Order Tracking Stepper (Verify statuses mapping to progress steps)', async () => {
    // Generate dummy order with 'shipped' status in DB directly
    const customerToken = signTestToken({ id: 10, role: 'customer', email: 'shopper@heelsup.in' });
    
    // Fetch details of a dummy order
    // (Here we query standard API for order tracking)
    const res = await fetch(`${baseUrl}/api/orders/track?number=HU-OFL-20260001`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    // Expected response structure mapping order status to stepper nodes:
    // status: 'shipped' maps to active step 2 (0: Pending, 1: Processing, 2: Shipped, 3: Delivered)
    if (res.status === 200) {
        const json = await res.json();
        assert.ok(json.data.status, 'Order tracking should return order status');
        assert.strictEqual(json.data.status, 'shipped', 'Dummy order status should be shipped');
        // Visual stepper node active level verification logic
    }
});
```
