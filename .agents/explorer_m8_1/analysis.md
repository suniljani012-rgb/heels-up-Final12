# Codebase Analysis & Recommendations — Milestone 8.1

This report outlines the analysis of standard file upload failures, broken image previews on production, and the design for path-based keys support in GET `/api/upload`.

---

## 1. ReferenceError ("ext is not defined") in `upload.js`

### Observation & Findings
* **Location**: `src/routes/upload.js` (Line 140)
* **Code snippet**:
  ```javascript
  const isHeic = isHeicExt || ext === 'heic' || ext === 'heif';
  ```
* **Root Cause**:
  The variable `ext` is not defined anywhere in the scope of the mapping function. The file extension is actually computed and stored in the variable `fileExt` on line 123:
  ```javascript
  const fileExt = fileName.split('.').pop().toLowerCase();
  ```
  And `isHeicExt` is defined on line 124 as:
  ```javascript
  const isHeicExt = ['heic', 'heif'].includes(fileExt);
  ```
  Consequently, evaluating `ext === 'heic'` throws a `ReferenceError: ext is not defined`.
* **Impact**:
  Because this mapping runs for every file uploaded in the `Promise.all` chain on line 121, this `ReferenceError` crashes **every standard (non-HEIC) upload request** as well as HEIC uploads, preventing the upload logic from ever reaching completion.

### Recommendation
Simplify line 140 to use `isHeicExt` directly, which already covers both `.heic` and `.heif` extensions:
```javascript
const isHeic = isHeicExt;
```

---

## 2. Broken Gallery Image Previews on Production

There are two distinct root causes that contribute to broken image icons on production:

### Cause A: Header Mismatch during Cloudflare Image Resizing Proxy
* **Observation**:
  In `src/routes/upload.js`, when a client requests an image that supports modern formats (WebP/Avif) and `env.R2_PUBLIC_URL` is defined, the worker routes it through Cloudflare Image Resizing via:
  ```javascript
  const optimizedRes = await fetch(publicUrl, resizeOptions);
  ```
  If this fetch succeeds, the code constructs a new `Response` by copying **all** headers of the resized response:
  ```javascript
  const headers = new Headers(optimizedRes.headers);
  ...
  return new Response(optimizedRes.body, {
      status: optimizedRes.status,
      headers
  });
  ```
* **Root Cause**:
  By cloning all headers, server-specific headers like `Content-Encoding` (e.g. `gzip` or `br`) and `Content-Length` are preserved. However, when the Worker runtime returns `optimizedRes.body`, it is decompressed automatically. The mismatch between the header (`Content-Encoding: gzip`) and the actual decompressed body causes the browser's image decoder to fail and display a broken image icon.
* **Recommendation**:
  Avoid cloning the entire headers set from `optimizedRes`. Only copy the `Content-Type`, `Last-Modified`, and `ETag` headers, then append the required CORS and Cache-Control headers manually.

### Cause B: Incorrect URL Proxy Reconstruction in `HeicImage.tsx`
* **Observation**:
  In `frontend/src/components/HeicImage.tsx`, the `getDisplayUrl` function parses URL strings to proxy them through `/api/upload`.
  If a URL already contains `/api/upload` (such as a path-based key `/api/upload/products/filename.png`), the code does:
  ```typescript
  if (parsed.pathname.includes('/api/upload')) {
    const queryKey = parsed.searchParams.get('key');
    if (queryKey) return `/api/upload?key=${encodeURIComponent(queryKey)}`;
  }
  ```
  If there is no query param `key`, it falls back to the generic host check:
  ```typescript
  if (host.includes('heelsup.in') || ...) {
    const key = decodeURIComponent(parsed.pathname.substring(1));
    return `/api/upload?key=${encodeURIComponent(key)}`;
  }
  ```
* **Root Cause**:
  For a path-based URL like `https://heelsup.in/api/upload/products/filename.png`, `parsed.pathname` is `/api/upload/products/filename.png`. The `queryKey` is null, so it falls to the host check where `key` is evaluated as `api/upload/products/filename.png`. The returned proxy URL is:
  `/api/upload?key=api%2Fupload%2Fproducts%2Ffilename.png`
  This points to a non-existent key in the R2 bucket, yielding a 404 broken image.
* **Recommendation**:
  Add explicit path-based key parsing to `HeicImage.tsx` to strip out the `/api/upload/` or `/api/admin/upload/` prefix correctly.

---

## 3. Path-Based Key Support in GET `/api/upload`

To support URLs like `GET /api/upload/products/filename.png` in addition to `GET /api/upload?key=products/filename.png`:

### Design & Router Changes in `upload.js`
1. Compute the sub-path by stripping the API prefixes (`/api/upload` or `/api/admin/upload`).
2. If `url.searchParams.get('key')` is not present, extract the key from the remainder of the path:
   ```javascript
   let key = url.searchParams.get('key');
   if (!key && path && path !== '/') {
       key = decodeURIComponent(path.startsWith('/') ? path.substring(1) : path);
   }
   ```
3. Update the GET conditional check in `upload.js` to match when either the root path is requested (with query param) or a sub-path is requested:
   ```javascript
   if (method === 'GET') {
       // GET route logic
   }
   ```
   Since GET is only used for serving files, any GET request to this router can be treated as a file retrieval attempt.

---

## 4. Proposed Changes

### Proposed Diff for `src/routes/upload.js`

```javascript
// 1. In GET /api/upload handler (around Line 22)
// Replace:
// if ((path === '/' || path === '') && method === 'GET') {
//     try {
//         const key = url.searchParams.get('key');
//         if (!key) return error('key required');

// With:
if (method === 'GET') {
    try {
        let key = url.searchParams.get('key');
        if (!key && path && path !== '/') {
            key = decodeURIComponent(path.startsWith('/') ? path.substring(1) : path);
        }
        if (!key) return error('key required');

// 2. In Cloudflare Image Resizing Response generation (around Line 58)
// Replace:
// const headers = new Headers(optimizedRes.headers);
// const origin = request.headers.get('Origin') || '';
// const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
// headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
// headers.set('Cache-Control', 'public, max-age=31536000, immutable');
// return new Response(optimizedRes.body, {
//     status: optimizedRes.status,
//     headers
// });

// With:
const headers = new Headers();
const contentType = optimizedRes.headers.get('Content-Type');
if (contentType) headers.set('Content-Type', contentType);

const lastModified = optimizedRes.headers.get('Last-Modified');
if (lastModified) headers.set('Last-Modified', lastModified);

const etag = optimizedRes.headers.get('ETag');
if (etag) headers.set('ETag', etag);

const origin = request.headers.get('Origin') || '';
const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
headers.set('Cache-Control', 'public, max-age=31536000, immutable');

return new Response(optimizedRes.body, {
    status: optimizedRes.status,
    headers
});

// 3. Fix ReferenceError (around Line 140)
// Replace:
// const isHeic = isHeicExt || ext === 'heic' || ext === 'heif';
// With:
const isHeic = isHeicExt;
```

### Proposed Diff for `frontend/src/components/HeicImage.tsx`

```typescript
// Replace getDisplayUrl implementation with:
function getDisplayUrl(src: string | undefined): string | undefined {
  if (!src || !src.trim()) return undefined;

  // Relative, blob: or data: — use as-is
  if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  try {
    const parsed = new URL(src);
    const host = parsed.hostname;

    // Already a proxied /api/upload URL — rebuild cleanly
    if (parsed.pathname.includes('/api/upload') || parsed.pathname.includes('/api/admin/upload')) {
      const queryKey = parsed.searchParams.get('key');
      if (queryKey) return `/api/upload?key=${encodeURIComponent(queryKey)}`;
      
      let pathKey = parsed.pathname;
      if (pathKey.startsWith('/api/admin/upload/')) {
        pathKey = pathKey.substring('/api/admin/upload/'.length);
      } else if (pathKey.startsWith('/api/upload/')) {
        pathKey = pathKey.substring('/api/upload/'.length);
      }
      
      if (pathKey && pathKey !== '/' && pathKey !== parsed.pathname) {
        return `/api/upload?key=${encodeURIComponent(decodeURIComponent(pathKey))}`;
      }
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
  } catch {
    // not a valid URL — return as-is
  }

  // All other URLs (Unsplash, other CDNs, etc.) — direct
  return src;
}
```
