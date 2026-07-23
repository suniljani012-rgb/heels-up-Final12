// frontend/src/utils/productCache.ts
// Ultra-fast instant pre-hydration and background pre-fetching engine

declare global {
  interface Window {
    __HU_PRODUCT_CACHE__?: Record<string, any>;
    __HU_PRODUCT_PREFETCHING__?: Record<string, boolean>;
  }
}

/**
 * Synchronously stores product data from product cards into memory and localStorage.
 */
export function cacheProductData(prod: any) {
  if (!prod || (!prod.id && prod.id !== 0)) return;
  const idStr = String(prod.id);
  const key = `heelsup_cached_product_${idStr}`;

  try {
    const existingRaw = localStorage.getItem(key);
    let existing: any = {};
    if (existingRaw) {
      try { existing = JSON.parse(existingRaw); } catch {}
    }

    const merged = {
      product: {
        ...(existing.product || {}),
        id: prod.id,
        name: prod.name || existing.product?.name || '',
        sku: prod.sku || existing.product?.sku || '',
        price: prod.price ?? existing.product?.price ?? 0,
        original_price: prod.original_price ?? prod.mrp ?? existing.product?.original_price ?? null,
        category: prod.category || existing.product?.category || '',
        rating: prod.rating ?? prod.avg_rating ?? existing.product?.rating ?? 4.5,
        review_count: prod.review_count ?? existing.product?.review_count ?? 0,
        sizes: prod.sizes?.length ? prod.sizes : (existing.product?.sizes || []),
        size_stock: prod.size_stock || existing.product?.size_stock || {},
        stock: prod.stock ?? existing.product?.stock ?? 10,
        images: prod.images?.length ? prod.images : (existing.product?.images || []),
        description: prod.description || existing.product?.description || '',
        colors: prod.colors || existing.product?.colors || ['Default'],
      },
      reviews: existing.reviews || [],
      images: prod.images?.length ? prod.images : (existing.images || []),
      related: existing.related || []
    };

    localStorage.setItem(key, JSON.stringify(merged));
    window.__HU_PRODUCT_CACHE__ = window.__HU_PRODUCT_CACHE__ || {};
    window.__HU_PRODUCT_CACHE__[idStr] = merged;
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Pre-fetches the full product details API in background and preloads gallery images.
 */
export async function prefetchProductApi(productId: string | number) {
  if (!productId) return;
  const idStr = String(productId);
  window.__HU_PRODUCT_PREFETCHING__ = window.__HU_PRODUCT_PREFETCHING__ || {};
  if (window.__HU_PRODUCT_PREFETCHING__[idStr]) return;
  window.__HU_PRODUCT_PREFETCHING__[idStr] = true;

  try {
    const res = await fetch(`/api/products/${idStr}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.data) {
      const payload = data.data;
      const cachedObj = {
        product: payload.product,
        reviews: payload.reviews || [],
        images: payload.images?.map((i: any) => typeof i === 'string' ? i : i.url) || payload.product?.images || [],
        related: payload.related || []
      };

      localStorage.setItem(`heelsup_cached_product_${idStr}`, JSON.stringify(cachedObj));
      window.__HU_PRODUCT_CACHE__ = window.__HU_PRODUCT_CACHE__ || {};
      window.__HU_PRODUCT_CACHE__[idStr] = cachedObj;

      // Preload images into browser cache
      const imgsToPreload = cachedObj.images.length > 0 ? cachedObj.images : (payload.product?.images || []);
      imgsToPreload.slice(0, 4).forEach((url: string) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    }
  } catch (e) {
    delete window.__HU_PRODUCT_PREFETCHING__[idStr];
  }
}

/**
 * Synchronously retrieves cached product data for 0ms instant rendering.
 */
export function getCachedProduct(productId: string | number) {
  if (!productId) return null;
  const idStr = String(productId);

  // 1. Check in-memory map (0.0001 ms)
  if (window.__HU_PRODUCT_CACHE__?.[idStr]) {
    return window.__HU_PRODUCT_CACHE__[idStr];
  }

  // 2. Check localStorage (0.01 ms)
  try {
    const raw = localStorage.getItem(`heelsup_cached_product_${idStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      window.__HU_PRODUCT_CACHE__ = window.__HU_PRODUCT_CACHE__ || {};
      window.__HU_PRODUCT_CACHE__[idStr] = parsed;
      return parsed;
    }
  } catch (e) {}

  return null;
}
