# Handoff Report — Milestone 8.1

This handoff report summarizes the codebase investigation findings and proposed fixes for standard file uploads, broken image previews on production, path-based GET requests, and component-level URL parsing for Milestone 8.1.

---

## 1. Observation

Direct observations made in the codebase:

### ReferenceError in `upload.js`
* **File**: `C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\src\routes\upload.js`
* **Line 140**:
  ```javascript
  const isHeic = isHeicExt || ext === 'heic' || ext === 'heif';
  ```
  However, `ext` is never declared or imported in `upload.js`.
* **Line 123**:
  ```javascript
  const fileExt = fileName.split('.').pop().toLowerCase();
  ```
  `fileExt` is defined but not used on line 140.

### Broken Gallery Image Previews on Production — Headers Mismatch
* **File**: `C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\src\routes\upload.js`
* **Lines 57-67**:
  ```javascript
  if (optimizedRes.ok) {
      const headers = new Headers(optimizedRes.headers);
      const origin = request.headers.get('Origin') || '';
      const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
      headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(optimizedRes.body, {
          status: optimizedRes.status,
          headers
      });
  }
  ```
  The code clones the entire header collection of the response obtained from `fetch(publicUrl, resizeOptions)`.

### Broken Gallery Image Previews on Production — URL Reconstruction
* **File**: `C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\frontend\src\components\HeicImage.tsx`
* **Lines 35-48**:
  ```typescript
  if (parsed.pathname.includes('/api/upload')) {
    const queryKey = parsed.searchParams.get('key');
    if (queryKey) return `/api/upload?key=${encodeURIComponent(queryKey)}`;
  }

  // Only proxy our own R2 / Worker / CDN URLs
  if (
    host.includes('heelsup.in') ||
    host.includes('workers.dev') ||
    host.includes('r2.dev')
  ) {
    const key = decodeURIComponent(parsed.pathname.substring(1));
    return `/api/upload?key=${encodeURIComponent(key)}`;
  }
  ```
  When the database stores a path-based proxied URL like `https://heelsup.in/api/upload/products/filename.png`, `parsed.pathname.includes('/api/upload')` is true, but `queryKey` is null. It falls to the host check, where `key` is extracted via `parsed.pathname.substring(1)` resulting in `api/upload/products/filename.png` instead of `products/filename.png`.

### GET `/api/upload` Routing and Keys
* **File**: `C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner\src\routes\upload.js`
* **Lines 13-18**:
  ```javascript
  let path = url.pathname;
  if (path.startsWith('/api/admin/upload')) {
      path = path.replace('/api/admin/upload', '') || '/';
  } else {
      path = path.replace('/api/upload', '') || '/';
  }
  ```
* **Line 22**:
  ```javascript
  if ((path === '/' || path === '') && method === 'GET') {
  ```
  The router only matches GET requests targeting the root path `/` (after replacing `/api/upload`), and only accepts `key` from query parameters:
  ```javascript
  const key = url.searchParams.get('key');
  ```

---

## 2. Logic Chain

1. **Upload ReferenceError**:
   * Line 140 attempts to reference `ext` in order to identify if the file is HEIC.
   * Because `ext` is not defined anywhere, standard image uploads (e.g. `.png`, `.jpg`) throw a `ReferenceError` on line 140 and immediately abort the upload process.
   * Therefore, standard file uploads fail globally.

2. **Broken Image Previews — Cause A (Headers Mismatch)**:
   * Cloning all headers from Cloudflare's Image Resizing response includes `Content-Encoding` (e.g. `gzip` or `br`) and `Content-Length`.
   * When proxying the stream to the client via `new Response(optimizedRes.body, ...)`, the worker runtime decompresses the stream automatically.
   * The browser receives the uncompressed body but tries to parse it as compressed due to the `Content-Encoding: gzip` header. This mismatch results in a decoding error and shows a broken icon.

3. **Broken Image Previews — Cause B (URL Reconstruction)**:
   * When `HeicImage` parses a path-based URL (`https://heelsup.in/api/upload/products/filename.png`), the query parameter `key` does not exist.
   * `HeicImage` falls back to the hostname check and treats the entire pathname (minus the leading slash) as the R2 key: `api/upload/products/filename.png`.
   * This is sent to the backend as `/api/upload?key=api%2Fupload%2Fproducts%2Ffilename.png`.
   * R2 returns `404 Not Found` because the prefix `api/upload/` is not part of the R2 bucket key (which is only `products/filename.png`).

4. **Path-Based Keys and Router Logic**:
   * When requesting `/api/upload/products/filename.png`, `path` evaluates to `/products/filename.png`.
   * Since `/products/filename.png` is neither `/` nor empty, the router fails to enter the GET block (`path === '/' || path === ''`) and falls back to a 404 Route Not Found.
   * Restructuring the GET route matches to be general (any GET on `/api/upload/*`) and parsing `key` from the remaining path if the query param is absent resolves both paths.

---

## 3. Caveats

* **Cloudflare Image Resizing Limits**:
  Cloudflare Image Resizing is only fully functional on custom domains on zones where the feature is enabled/paid. In local testing or on default `.workers.dev` subdomains, the resize feature is ignored or throws, and the code falls back to direct R2 get.
* **CORS Settings**:
  CORS configurations assume allowed origins of `https://heelsup.in`, `https://www.heelsup.in`, and `https://heelsupnew.heelsup.workers.dev`. If testing is done on other custom domains, the CORS headers may reject request access unless origin validation is updated or wildcard `*` fallback behaves correctly.

---

## 4. Conclusion

* **Standard uploads fail** due to a `ReferenceError: ext is not defined` at `upload.js` line 140.
* **Broken image icons on production** occur due to:
  1. Header leakage (copying `Content-Encoding` and `Content-Length` headers from Cloudflare Image Resizing to a decompressed body).
  2. Malformed R2 keys generated by `HeicImage.tsx`'s `getDisplayUrl` when stripping the path-based query-less proxy URLs.
* **GET `/api/upload` path-based keys** can be supported by stripping `/api/upload` or `/api/admin/upload` and reading the remainder of the path as the R2 key when the query param is missing.
* **`HeicImage.tsx` needs modifications** to correctly extract the key when parsing path-based proxied URLs.

---

## 5. Verification Method

### Test Scripts
Since there are no existing test cases for image uploads in `tests/e2e/`, the following verification script can be run using wrangler locally to assert correctness:

1. **Verify GET with Path-Based Key**:
   Run a `curl` request to fetch a known object via path-based URL:
   ```bash
   curl -I "http://localhost:8787/api/upload/products/test-image.png"
   ```
   Assert that the response is `200 OK` (or `404 Not Found` if file is missing, but NOT `404 Route Not Found` API route error).

2. **Verify GET with Query Param**:
   ```bash
   curl -I "http://localhost:8787/api/upload?key=products/test-image.png"
   ```
   Assert that the response is `200 OK` (or standard `404 Not Found` if missing, matching the path-based result).

3. **Verify Standard Upload Execution**:
   Perform a POST request with a sample image form-data payload using an admin JWT token:
   ```bash
   curl -X POST "http://localhost:8787/api/admin/upload" \
     -H "Authorization: Bearer <ADMIN_TOKEN>" \
     -F "files=@test.png"
   ```
   Assert that the server returns a `200 OK` with JSON containing the new URL and R2 key, rather than a `500 ReferenceError` or crash.
