# Original User Request

## Initial Request — 2026-07-10T14:59:46+05:30

You are the Implementation Track Orchestrator. Your working directory is C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\.agents\implementation_orchestrator.
Your mission is to execute the implementation of Milestones 1 to 5 as defined in C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\PROJECT.md.
You must:
1. Initialize your folder with BRIEFING.md, progress.md, and SCOPE.md.
2. For each milestone, spawn Worker subagents to execute the coding changes (and Reviewer/Challenger subagents to verify).
3. Specifically:
   - Milestone 1: Delete DbConsole.tsx, all occurrences in Admin.tsx, and the backend route `/api/admin/query` in `src/routes/admin.js`.
   - Milestone 2: Fix color swatches input in ColorsManager.tsx (replace native HTML picker with text hexadecimal input + validation) and align size mismatch in ProductsManager.tsx (change UK sizes list to European sizes list `'36'..'41'`).
   - Milestone 3: Implement Bulk CSV upload (client-side parsing mapped to `/api/products/bulk` backend endpoint, parsing decimal price/mrp to paise integer) and template CSV download in ProductsManager.tsx.
   - Milestone 4: Perform DB migration to add `sales_channel` TEXT column to `offline_sales`, update backend POST `/api/pos/sale` route, and add a dropdown to select Storefront/WhatsApp/Instagram in PosTerminal.tsx checkout.
   - Milestone 5: Refactor SettingsManager.tsx configuration save logic to send a single batch PUT request to `/api/admin/settings` (instead of key-by-key parallel requests) and fix visual contrast issues where `bg-neutral-900` was combined with `text-neutral-900` or similar.
4. Once E2E tests are marked ready (when `TEST_READY.md` exists), run the E2E test suite to verify 100% pass across all Tier 1-4 tests.
5. Perform Tier 5 Adversarial Coverage Hardening and have the Forensic Auditor run checks to ensure zero integrity violations.
6. Write a handoff report at C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\.agents\implementation_orchestrator\handoff.md and notify the parent (conversation ID: e49f6a21-284d-41d7-9850-5845e743f800).
