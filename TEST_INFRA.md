# E2E Test Infra: HeelsUp Redesign

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|:---:|:---:|:---:|
| 1 | Visual Contrast | R1. Color & Contrast Alignment | 5 | 5 | ✓ |
| 2 | Color Swatch Input | R2. Text-Based Color Input | 5 | 5 | ✓ |
| 3 | Product Size Alignment | R2. Sizes and Stock | 5 | 5 | ✓ |
| 4 | Bulk CSV Upload & Template | R3. Bulk CSV Product Upload | 5 | 5 | ✓ |
| 5 | POS Sales Channels | R4. POS Terminal Redesign | 5 | 5 | ✓ |
| 6 | DB Console Removal | R5. Remove DB Console | 5 | 5 | ✓ |
| 7 | Settings Alignment | R5. Fix Settings | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Node.js test runner running custom tests located in `tests/e2e/`.
- **Command**: `npm run test:e2e` (verifies that all tests pass, exiting with code 0).
- **Test Case Format**: Each test case performs backend API requests or mock frontend context calls and asserts expected state, response code, and database schema updates.
- **Directory Layout**:
  - `tests/e2e/tier1_feature_coverage.test.js` - Tier 1 test cases
  - `tests/e2e/tier2_boundary_corner.test.js` - Tier 2 test cases
  - `tests/e2e/tier3_cross_feature.test.js` - Tier 3 test cases
  - `tests/e2e/tier4_real_world.test.js` - Tier 4 application scenarios

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|---|---|---|
| 1 | Complete Product Lifecycle | F2, F3, F4 (Bulk Upload -> Edit Size -> Check Stock) | High |
| 2 | POS Storefront Sale Checkout | F5, F3 (Storefront Checkout -> Stock reservation update) | Medium |
| 3 | Social Media Order Flow | F5 (WhatsApp/Instagram Checkout -> Sale Verification) | Medium |
| 4 | Full Administrative System Clean-Up | F6, F7, F1 (Settings update -> Console removal validation -> Contrast validation) | High |
| 5 | Inventory Refactor and Re-allocation | F2, F3, F4 (CSV Upload -> Edit Stock -> Stock levels check) | High |

## Coverage Thresholds
- Tier 1: ≥35 test cases (5 per feature)
- Tier 2: ≥35 test cases (5 per feature)
- Tier 3: ≥7 test cases (covering major interactions)
- Tier 4: ≥5 realistic application scenarios
- **Total Minimum: 82 test cases**
