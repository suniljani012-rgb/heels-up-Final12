# Scope: E2E Testing Track

## Architecture
- **Opaque-Box E2E Testing**: The tests run against the Cloudflare Workers API backend or mock frontend components and verify compliance with requirements without dependencies on code internals.
- **Node-based Runner**: Uses Node's built-in testing capabilities or simple scripts to trigger and evaluate the test files under `tests/e2e/`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Test Infra Setup | Establish `tests/e2e` folder and common test utilities (helpers to make fetch requests, parse inputs, etc.) | None | PLANNED |
| 2 | Tier 1: Feature Coverage | Implement at least 35 test cases (5 per feature for 7 features) in `tests/e2e/tier1_feature_coverage.test.js` | M1 | PLANNED |
| 3 | Tier 2: Boundary & Corner Cases | Implement at least 35 test cases (5 per feature for 7 features) in `tests/e2e/tier2_boundary_corner.test.js` | M1 | PLANNED |
| 4 | Tier 3: Cross-Feature | Implement at least 7 test cases covering interactions in `tests/e2e/tier3_cross_feature.test.js` | M1 | PLANNED |
| 5 | Tier 4: Real-World Scenarios | Implement 5 realistic application-level workflows in `tests/e2e/tier4_real_world.test.js` | M1 | PLANNED |
| 6 | Integration & Verification | Update package.json, run and verify the test runner works (fails gracefully or runs successfully), create `TEST_READY.md` | M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### E2E Test Suite ↔ Application Backend API
- All API requests are standard REST requests to the worker endpoints (e.g. `POST /api/pos/sale`, `PUT /api/admin/settings`, `POST /api/products/bulk`).
- The test suite handles response validation (asserting status code, success flags, database changes).
