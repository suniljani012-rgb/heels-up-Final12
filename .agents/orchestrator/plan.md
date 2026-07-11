# HeelsUp Boutique Storefront & API Enhancements Plan

## Objective
Implement missing storefront features, backend reviews API, security mitigations, and performance optimizations. Ensure all E2E tests pass.

## Strategy
Use the **Project Pattern**:
1. **Explore**: Identify codebase files and structure (Completed by Explorer).
2. **Decompose & Implement**: Split the work into 7 milestones and dispatch to specialized Workers.
3. **Verification**: Run E2E tests and Forensic Auditor to ensure correctness and zero integrity issues.

## Milestones
- **Milestone 1: Database Migration & Settings Constraint Fix**
  - Add missing columns `brand`, `sales_channel`, and `out_for_delivery_at`.
  - Fix settings table `updated_at` NOT NULL constraint failure in backend settings API.
  - Verify baseline tests pass.
- **Milestone 2: Global Search, Filtering, and Sorting**
  - Implement navbar search bar in `Header.tsx` and redirection.
  - Enable filters (Size, Color, Price) and sort (Rating, Price, Newest) on Shop page UI and backend `products.js`.
- **Milestone 3: Product Reviews API & Detail Page UI**
  - Implement GET/POST `/api/products/:id/reviews` backend endpoints.
  - Add reviews list, stars, and submission form to Product detail page using new endpoints.
- **Milestone 4: Visual Order Tracking Timeline**
  - Implement step-by-step timeline stepper (Placed -> Shipped -> Out for Delivery -> Delivered) on `OrderTracking.tsx` and `Profile.tsx` views.
- **Milestone 5: Input Sanitization & Stock Validation**
  - Sanitize all client-side parameters to prevent SQL injection.
  - Ensure strict stock level validations during checkout.
- **Milestone 6: Performance Optimization via frame_ant.js**
  - Leverage `frame_ant.js` preloading caches for products, shop filters, and profile logs to ensure preloaded sub-0.02ms cache hit loads.
- **Milestone 7: Integration, Verification & Forensic Audit**
  - Run full E2E test suite (100% pass).
  - Verify clean status via Forensic Auditor.
