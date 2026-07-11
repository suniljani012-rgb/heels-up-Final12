## 2026-07-10T12:33:19Z

You are a specialized developer. Your task is to implement Milestone 2: Global Search, Filtering, and Sorting on storefront and backend.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. **Global Search in Navbar**:
   - Edit `frontend/src/components/Header.tsx` to replace the static search button (lines 164-170) with a functional search input form.
   - When the user types a query and hits enter or submits, it must redirect to the shop page with a query parameter: `/shop?q=<query>`.
   - Maintain a clean visual look that fits HeelsUp branding.

2. **Frontend Shop Filtering & Sorting**:
   - Edit `frontend/src/pages/Shop.tsx`.
   - Parse search params: `size` and `color`.
   - In the API `fetch` call inside the `useEffect` (lines 111-155), set the query parameters:
     - `size` if present.
     - `color` if present.
     - Add them to the dependency array.
   - In the sidebar filters (line 252 onwards), add UI sections for:
     - **Filter by Size**: A grid of buttons for standard UK sizes: `36`, `37`, `38`, `39`, `40`, `41`. Clicking a size toggles the filter.
     - **Filter by Color**: A list of color swatches representing colors fetched from `globalColorMap`. Clicking a color toggles the filter.
   - Add a "Customer Rating" option to the `sortOptions` array: `{ value: 'rating', label: 'Customer Rating' }`.

3. **Backend Filtering & Sorting**:
   - Edit `src/routes/products.js`.
   - On the product listing route (`GET /api/products`), parse the `color` query parameter from `params`.
   - If `color` is provided, append a condition to the `where` array to filter by color case-insensitively:
     - `LOWER(p.name) LIKE ?` with bind value `% - ${color.toLowerCase()}` (matching the suffix pattern ` - ColorName` in names).
   - In the `sortMap` mapping (lines 299-305), add the `rating` sort key to map to:
     - `'avg_rating DESC'` (using the subquery alias computed in the SELECT list).

4. **Verification**:
   - Build/compile the frontend and backend to verify zero compilation errors.
   - Run tests `npm run test:e2e` to ensure no regressions.

Write your report to C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\.agents\worker_m2\handoff.md.
