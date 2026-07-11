## 2026-07-10T18:09:05Z

You are a specialized developer. Your task is to implement Milestones 3, 4, 5, and 6 to complete all storefront features, backend reviews API, security validations, and performance optimizations.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:

### 1. Milestone 3 & 5: Backend Reviews API & Input Sanitization
- File: `src/routes/products.js`
- Import `requireAuth` from `../middleware/auth.js` at the top.
- Inside `productsRouter`, implement the following sub-routes matching `/api/products/:id/reviews`:
  - **GET /api/products/:id/reviews**:
    - Match path `/^\/\d+\/reviews$/` and method `GET`.
    - Extract the product ID from path, e.g. `const id = parseInt(path.split('/')[1]);`.
    - Query approved reviews from `product_reviews` D1 table:
      ```sql
      SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name 
      FROM product_reviews r 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.product_id = ? AND r.status = 'approved' 
      ORDER BY r.created_at DESC
      ```
    - Return list response (`ok(reviews.results || [])`).
  - **POST /api/products/:id/reviews**:
    - Match path `/^\/\d+\/reviews$/` and method `POST`.
    - Authenticate using `requireAuth(request, env)`.
    - Extract the product ID from path.
    - Parse request JSON body for `rating`, `title`, `body`, `order_id`.
    - Perform input type-checks and length-sanitization (prevent SQL injections and overflow):
      - Validate `rating` is an integer between 1 and 5. Return a 400 error if invalid.
      - String-sanitize and trim `title` (slice to max 100 chars) and `body` (slice to max 1000 chars) if provided.
    - Insert into `product_reviews` with status `'pending'` (using parameterized query):
      ```sql
      INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, body, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      ```
    - Return `created` response (`created(null, 'Review submitted — pending approval')`).

### 2. Milestone 3: Frontend Reviews UI
- File: `frontend/src/pages/Product.tsx`
- Inside `fetchDetails` (around lines 128-161):
  - Add a fetch call to `/api/products/${productId}/reviews` to fetch reviews and update the state `setReviews(reviewsData.data || [])`.
- Inside `handleReviewSubmit` (around lines 248-285):
  - Modify the POST fetch endpoint to `/api/products/${product.id}/reviews` instead of `/api/reviews`.

### 3. Milestone 4: Visual Order Tracking Timeline
- File: `frontend/src/pages/OrderTracking.tsx`
  - Extend the `TrackResult` interface definition to include optional: `shipped_at?: string | null; out_for_delivery_at?: string | null; delivered_at?: string | null;`.
  - Inside the `result && (...)` layout (around line 69), add a visual stepper timeline component tracking the status transitions:
    - **Steps**: `Placed` -> `Shipped` -> `Out for Delivery` -> `Delivered` (statuses: `'placed'`, `'shipped'`, `'out_for_delivery'`, `'delivered'`).
    - The connection line's width percentage should be:
      - `100%` if status is `'delivered'`.
      - `66%` if status is `'out_for_delivery'`.
      - `33%` if status is `'shipped'`.
      - `0%` otherwise.
    - Color active steps in emerald (`bg-emerald-500` / `border-emerald-500` / white text) and draw checkmarks for active steps. Show step dates if present in `TrackResult`.
- File: `frontend/src/pages/Profile.tsx`
  - Inside the `orderDetailsModalOpen` modal stepper timeline (around lines 1399-1433):
    - Update the steps array to use the transitions: `Placed` (status `'placed'`, date `created_at`), `Shipped` (status `'shipped'`, date `shipped_at`), `Out for Delivery` (status `'out_for_delivery'`, date `out_for_delivery_at`), and `Delivered` (status `'delivered'`, date `delivered_at`).
    - Update the connection line width percentage to:
      - `100%` if status is `'delivered'`.
      - `66%` if status is `'out_for_delivery'`.
      - `33%` if status is `'shipped'`.
      - `0%` otherwise.
    - Ensure status checks match these 4 transitions correctly (indexes `'placed'`, `'shipped'`, `'out_for_delivery'`, `'delivered'`).

### 4. Milestone 6: Performance Optimization via frame_ant.js
- File: `frontend/public/frame_ant.js`
  - Add the following endpoints to the `targetEndpoints` array:
    - `'/api/orders/my'`
    - `'/api/addresses'`
    - `'/api/colors'`
    - `'/api/auth/profile'`
  - Update the fetch interceptor (`window.fetch = async function(input, init)`) so that when a successful GET request (status 200) is made to any endpoint in `targetEndpoints`, its JSON response is cloned and stored in `apiCache` under its pathname. This ensures that user-visited profile pages and filters are cached dynamically and load under 0.02ms on subsequent hits.

### 5. Verification
- Verify that the frontend compiles cleanly (`npm run build` inside `frontend/`).
- Run the E2E test suite `npm run test:e2e` to verify correctness.

Write your report to C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\.agents\worker_storefront\handoff.md.
