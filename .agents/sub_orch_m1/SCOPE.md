# Scope: Milestone 1 - DbConsole Removal

## Requirements
1. Delete `frontend/src/pages/admin/DbConsole.tsx`.
2. Delete all references and occurrences of `DbConsole` in `frontend/src/pages/Admin.tsx` (imports, state variables, tab filtering, handlers, menu sections, and rendering block).
3. Delete the backend route `/api/admin/query` in `src/routes/admin.js` (under `if (path === '/api/admin/query' && request.method === 'POST')`).

## Verification Criteria
- Frontend must compile without typescript or layout errors (e.g. `cd frontend && npm run build` or `npx tsc`).
- Backend routing must not contain `/api/admin/query` and requests to it must return 404 or be ignored.
- Forensic Auditor must pass with CLEAN status (no backdoor or query execution paths left behind).
