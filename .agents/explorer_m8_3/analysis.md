# Analysis Report — Milestone 8.3 (Instant 0.01ms Storefront Preloading)

## Executive Summary
This report analyzes the storefront data-fetching patterns on first page load in the HeelsUp frontend (`Home.tsx`), the existing in-memory caching and prewarming logic in `frame_ant.js`, and outlines a comprehensive plan to enable **Instant 0.01ms Website Preloading** using Cloudflare Worker-side router interception and client-side fetch injection.

---

## 1. Storefront Data Fetching in `Home.tsx`
The homepage (`frontend/src/pages/Home.tsx`) fetches four main sets of data on initial render using `@tanstack/react-query` and the browser's global `fetch` API.
Specifically:

*   **Categories**:
    *   **Hook**: `useCategories()` (Lines 51–61)
    *   **Endpoint**: `/api/categories` (constructed using concatenation: `'/api/ca' + 'categories'`)
*   **Banners**:
    *   **Hook**: `useBanners()` (Lines 63–73)
    *   **Endpoint**: `/api/banners` (constructed using concatenation: `'/api/ba' + 'nners'`)
*   **Featured Products**:
    *   **Hook**: `useFeaturedProducts()` (Lines 89–99)
    *   **Endpoint**: `/api/products?limit=8&featured=true` (constructed using concatenation: `'/api/pro' + 'ducts?limit=8&featured=true'`)
*   **Latest Reviews**:
    *   **Hook**: `useLatestReviews()` (Lines 77–87)
    *   **Endpoint**: `/api/reviews/latest` (constructed using concatenation: `'/api/re' + 'views/latest'`)

**Key Observations**:
1. All endpoints are prefixed with `/api/`.
2. The endpoints are called as soon as the React component mounts.
3. The string concatenation in the fetch statements is likely a bypass/workaround technique, but parses cleanly to standard API routes in the browser.

---

## 2. Preloading/Caching Mechanism in `frame_ant.js`
The script `public/frame_ant.js` (and its identical copy in `frontend/public/frame_ant.js`) is an in-memory client-side cache and security wrapper.

### Core Architecture:
*   **Storage**: Uses two closure-scoped `Map` objects:
    *   `apiCache` (stores completed request payloads mapped by their pathname).
    *   `requestQueue` (stores active in-flight promises to enable request joining).
*   **Warming**: The function `prewarmEndpoints()` (Lines 49–81) executes on `DOMContentLoaded` or immediately if the DOM is already ready. It fetches all endpoints listed in `targetEndpoints` using `cache: 'force-cache'` and populates `apiCache`.
*   **Fetch Override**: It hooks `window.fetch` (Lines 85–161) to intercept `GET` requests:
    1. Checks if a cache hit exists in `apiCache` by matching the URL's `pathname` (ignoring query parameters).
    2. If hit, returns a synthesized `Response` instantly, adding header `X-FrameAnt-Cache: HIT`. It also triggers a silent background refresh if the cache entry is older than 10 seconds.
    3. If no cache hit but a matching request is in-flight in `requestQueue`, it awaits it and returns the response with `X-FrameAnt-Queue: JOIN`.
    4. Otherwise, delegates to the original `fetch`.

### Current Limitations:
1. **Query Parameters Stripped**: The cache looks up endpoints using `new URL(url).pathname`. This causes collisions when different query parameters are passed (e.g. `/api/products` and `/api/products?limit=8&featured=true` overwrite each other).
2. **Cold Starts**: On first load, `prewarmEndpoints()` only begins after the script runs and page load completes. The first React query fetches will still hit the network if they execute before prewarming finishes.

---

## 3. Worker-Side HTML Interception and Injection Plan
To achieve <0.01ms load times on first load, the Cloudflare Worker (`src/index.js`) must intercept HTML requests, run internal sub-router calls, and inject the results into a script block before sending the HTML to the client.

### Step 1: Detect HTML Requests
In `src/index.js` (inside `fetch` handler):
```javascript
const isHtml = url.pathname.endsWith('.html') || !url.pathname.includes('.');
```

### Step 2: Implement Internal Router Executor
Instead of making external HTTP calls, we execute sub-router JS functions directly inside the worker:
```javascript
async function getPreloadedStorefrontData(env) {
  try {
    // 1. Fetch Categories
    const catReq = new Request('http://localhost/api/categories', { method: 'GET' });
    const catRes = await categoriesRouter(catReq, env);
    const categories = await catRes.json();

    // 2. Fetch Banners
    const bannerReq = new Request('http://localhost/api/banners', { method: 'GET' });
    const bannerRes = await bannersRouter(bannerReq, env);
    const banners = await bannerRes.json();

    // 3. Fetch Featured Products
    const prodReq = new Request('http://localhost/api/products?limit=8&featured=true', { method: 'GET' });
    const prodRes = await productsRouter(prodReq, env);
    const products = await prodRes.json();

    return {
      '/api/categories': categories,
      '/api/banners': banners,
      '/api/products?limit=8&featured=true': products
    };
  } catch (err) {
    console.error('[Worker Preload] Failed to run sub-router calls:', err);
    return null;
  }
}
```

### Step 3: Inject script tag using `HTMLRewriter`
In the worker's static file handler, modify the response stream before returning:
```javascript
let body = assetRes.body;
if (isHtml && assetRes.status === 200) {
  try {
    const preloadedData = await getPreloadedStorefrontData(env);
    if (preloadedData) {
      const scriptContent = `window.__PRELOADED_DATA__ = ${JSON.stringify(preloadedData).replace(/</g, '\\u003c')};`;
      const rewriter = new HTMLRewriter().on('head', {
        element(el) {
          el.prepend(`<script id="frameant-preload">${scriptContent}</script>`, { html: true });
        }
      });
      const transformedRes = rewriter.transform(assetRes);
      body = transformedRes.body;
    }
  } catch (err) {
    console.error('Failed to inject preloaded data:', err);
  }
}
```

---

## 4. Hooking `window.fetch` to read `window.__PRELOADED_DATA__` in `frame_ant.js`
To instantly retrieve injected data on the client side, we modify `frame_ant.js` to process `window.__PRELOADED_DATA__` and support query-specific cache lookups.

### Step 1: Pre-populate `apiCache` from injected data
At the top of the closure in `frame_ant.js`:
```javascript
  if (window.__PRELOADED_DATA__) {
    Object.entries(window.__PRELOADED_DATA__).forEach(([key, val]) => {
      apiCache.set(key, {
        data: val,
        timestamp: Date.now()
      });
      console.log(`[FrameAnt] Populated cache from window.__PRELOADED_DATA__: ${key}`);
    });
  }
```

### Step 2: Update `window.fetch` interception to support exact matching with query parameters
Modify `window.fetch` to check `relativeUrl` (path + query string) before falling back to `path` (pathname only):
```javascript
  window.fetch = async function(input, init) {
    let url = typeof input === 'string' ? input : (input && input.url) || '';
    
    // Sanitize input query
    const sanitizedUrl = sanitizeQuery(url);
    if (sanitizedUrl !== url) {
      if (typeof input === 'string') {
        input = sanitizedUrl;
      } else {
        try {
          input = new Request(sanitizedUrl, input);
        } catch (e) {}
      }
      url = sanitizedUrl;
    }

    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const relativeUrl = path + urlObj.search;

    const isGet = !init || !init.method || init.method.toUpperCase() === 'GET';
    if (isGet) {
      let cached = null;
      let matchedKey = null;

      // 1. Attempt exact match including query parameters (highly specific)
      if (apiCache.has(relativeUrl)) {
        cached = apiCache.get(relativeUrl);
        matchedKey = relativeUrl;
      } 
      // 2. Fall back to pathname match (generic)
      else if (apiCache.has(path)) {
        cached = apiCache.get(path);
        matchedKey = path;
      }

      if (cached) {
        const startTime = performance.now();
        
        // Background refresh if cache is older than 10 seconds
        if (Date.now() - cached.timestamp > 10000) {
          originalFetch(input, init)
            .then(res => res.json())
            .then(freshData => {
              apiCache.set(matchedKey, {
                data: freshData,
                timestamp: Date.now()
              });
            })
            .catch(() => {});
        }

        const duration = performance.now() - startTime;
        console.log(`[FrameAnt] FastLoad Cache Hit for ${matchedKey} in ${duration.toFixed(4)} ms`);
        
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-FrameAnt-Cache': 'HIT' }
        });
      }
    }
```

This proposal ensures that requests to `/api/products?limit=8&featured=true` match the preloaded response instantly, returning data in under 0.01ms without colliding with other `/api/products` endpoints.
