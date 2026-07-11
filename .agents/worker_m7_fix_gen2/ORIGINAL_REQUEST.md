## 2026-07-11T03:33:31Z
You are the Worker - E2E Fixer & Storefront Tester.
Your working directory is C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\.agents\worker_m7_fix_gen2\.
Your task is to implement all 15 test fixes and add the new storefront E2E tests.

Please follow these steps:
1. Read the explorer findings and recommended code replacements in C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\.agents\explorer_m7_fix\handoff.md.
2. Edit the following files to implement the fixes:
   - frontend/src/pages/Admin.tsx: Change text-neutral-900 bg-neutral-900 contrast issues.
   - src/index.js: Insert cache invalidation logic for mutations (POST, PUT, DELETE, PATCH) targeting colors, products, and settings.
   - src/routes/products.js:
     - Implement EU size validation helper (valid numeric EU shoe size between 35 and 45).
     - Add size validation, price validation, colorway validation to POST/PUT/size-stock routes.
     - Add inventory logging to POST /api/products and PUT /api/products/:id/size-stock.
     - In POST /api/products/bulk: implement validation pass, SKU duplication checks/skipping, and inventory logging.
   - src/routes/pos.js: Add stock availability validation checking size-stock / product-stock before letting checkout succeed.
   - src/routes/settings.js: Add settings key validation (length, regex) and payload size limit checks.
3. Create tests/e2e/tier5_storefront.test.js with E2E test cases covering search, filters/sorting, reviews, and visual tracking stepper.
4. Edit tests/e2e/runner.js to load tests/e2e/tier5_storefront.test.js.
5. Compile the frontend and run the E2E tests:
   - Compile: npm run build (using Node portable at C:\Users\Cyrix HealthCare\AppData\Local\node-portable\node-v22.16.0-win-x64)
   - Run tests: node tests/e2e/runner.js (using Node portable)
6. Ensure that all 82 existing tests + the new storefront tests pass successfully.
7. Write a detailed completion report to C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\.agents\worker_m7_fix_gen2\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Report back when done and write your handoff.md.
