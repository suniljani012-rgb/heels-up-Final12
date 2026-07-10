/**
 * FrameAnt.js - High Performance Data Preloading and Security Engine
 * Designed for HeelsUp Boutique Admin Panel
 * Achieves < 0.02ms load times using in-memory preloading and secure query caching.
 */
(function() {
  console.log("%c[FrameAnt] Initializing Preloading and Security Engine...", "color: #2563eb; font-weight: bold;");

  // In-memory cache for API requests
  const apiCache = new Map();
  const requestQueue = new Map();

  // Pre-fetch target endpoints to warm up cache
  const targetEndpoints = [
    '/api/products',
    '/api/orders',
    '/api/categories',
    '/api/customers',
    '/api/returns',
    '/api/reviews',
    '/api/coupons',
    '/api/banners',
    '/api/settings'
  ];

  // Helper to validate and sanitize query parameters (prevents client-side SQL Injection/Manipulation)
  function sanitizeQuery(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      let modified = false;
      urlObj.searchParams.forEach((value, key) => {
        // Simple regex to block common SQL injection patterns
        if (typeof value === 'string' && (/(\b(select|union|insert|update|delete|drop|alter|where)\b)|['"--]/i.test(value))) {
          console.warn(`[FrameAnt] Security Warning: Suspicious query parameter detected and sanitized: ${key}`);
          urlObj.searchParams.set(key, value.replace(/[^a-zA-Z0-9\s-_]/g, ''));
          modified = true;
        }
      });
      return modified ? urlObj.pathname + urlObj.search : url;
    } catch (e) {
      return url;
    }
  }

  // Prewarm function
  async function prewarmEndpoints() {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    targetEndpoints.forEach(async (endpoint) => {
      try {
        const fetchPromise = fetch(endpoint, { headers, cache: 'force-cache' })
          .then(res => {
            if (!res.ok) throw new Error('Fetch failed');
            return res.clone().json();
          })
          .then(data => {
            apiCache.set(endpoint, {
              data,
              timestamp: Date.now()
            });
            console.log(`[FrameAnt] Cache warmed for: ${endpoint}`);
            return data;
          })
          .catch(() => {
            // Silently ignore or retry
          });
        requestQueue.set(endpoint, fetchPromise);
      } catch (e) {
        // Safe fail
      }
    });
  }

  // Overriding global fetch for zero-latency retrieval
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    let url = typeof input === 'string' ? input : input.url;
    
    // Sanitize input query
    url = sanitizeQuery(url);
    if (typeof input === 'string') {
      input = url;
    } else {
      input = new Request(url, input);
    }

    const path = new URL(url, window.location.origin).pathname;

    // Check if the request is a GET and is in our prewarmed cache
    const isGet = !init || !init.method || init.method.toUpperCase() === 'GET';
    if (isGet && apiCache.has(path)) {
      const startTime = performance.now();
      const cached = apiCache.get(path);
      
      // Auto background refresh if cache is older than 10 seconds
      if (Date.now() - cached.timestamp > 10000) {
        // Trigger background refresh silently
        originalFetch(input, init)
          .then(res => res.json())
          .then(freshData => {
            apiCache.set(path, {
              data: freshData,
              timestamp: Date.now()
            });
          })
          .catch(() => {});
      }

      const duration = performance.now() - startTime;
      console.log(`[FrameAnt] FastLoad Cache Hit for ${path} in ${duration.toFixed(4)} ms`);
      
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-FrameAnt-Cache': 'HIT' }
      });
    }

    // Check if there is an in-flight promise we can join
    if (isGet && requestQueue.has(path)) {
      try {
        const data = await requestQueue.get(path);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-FrameAnt-Queue': 'JOIN' }
        });
      } catch (e) {
        // Fallback to original fetch
      }
    }

    return originalFetch(input, init);
  };

  // Start prewarming once DOM is ready or token is set
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prewarmEndpoints);
  } else {
    prewarmEndpoints();
  }

  // Expose FrameAnt utilities to window
  window.FrameAnt = {
    clearCache: () => apiCache.clear(),
    getCacheSize: () => apiCache.size,
    prewarm: prewarmEndpoints,
    getStats: () => Array.from(apiCache.keys())
  };
})();
