# HeelsUp Image Upload & Preloading Optimization Plan

## Objective
Fix the admin product gallery broken image previews, implement robust HEIC to PNG image conversion at the edge, and optimize storefront loading speed to make data appear preloaded instantly (0.01ms) using edge-injected preloading.

## Milestones

### Milestone 1: Fix Admin Product Gallery Previews and Upload Route (Backend & Frontend)
- **Problem**: Image uploads fail due to a ReferenceError (`ext is not defined`) in `src/routes/upload.js` when uploading non-HEIC images, leading to broken previews. Additionally, path-based URL serving is not supported.
- **Fix**:
  - Fix the ReferenceError in `src/routes/upload.js` by replacing `ext` with `fileExt`.
  - Add support for path-based keys in GET `/api/upload` (e.g. `/api/upload/products/filename.png`) in addition to `?key=...`.
  - Ensure that custom domains like `media.heelsup.in` are correctly supported.

### Milestone 2: Convert HEIC Images to PNG
- **Problem**: HEIC images are uploaded raw and must be converted to PNG at the edge so that all browsers can render them.
- **Fix**:
  - Ensure the HEIC conversion block in `src/routes/upload.js` correctly uses Cloudflare Image Resizing via a path-based proxy URL (which is more reliable than query strings).
  - Add a robust fallback for environments without Cloudflare Image Resizing (like local development).

### Milestone 3: Instant 0.01ms Website Preloading
- **Problem**: Storefront data has latency on initial load due to React Query roundtrips.
- **Fix**:
  - In `src/index.js`, intercept requests for `index.html` (including root `/` and SPA route fallbacks).
  - Fetch categories, banners, and featured products at the edge and inject them as a script tag defining `window.__PRELOADED_DATA__`.
  - Update `public/frame_ant.js` and `frontend/public/frame_ant.js` to immediately return preloaded JSON from `window.__PRELOADED_DATA__` for matching GET fetch requests.

### Milestone 4: Verification & Forensic Audit
- **Verify**: Add E2E tests for image uploads (including HEIC to PNG conversion) and preloading cache hits.
- **Run**: Execute `npm run test:e2e` to ensure all tests pass.
- **Audit**: Run the Forensic Auditor to verify integrity.
