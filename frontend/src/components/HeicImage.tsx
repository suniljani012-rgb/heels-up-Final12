// frontend/src/components/HeicImage.tsx
// On-the-fly image compression via Cloudflare Image Resizing.
// - ALL images (PNG/JPG/WebP) are served through /api/upload?key=...&w=400&q=75
// - Worker uses CF Image Resizing to compress: 400px thumb ~20-50KB, 900px full ~80-150KB
// - Result cached immutably — second load is instant from browser cache
// - HEIC/HEIF: also converted to WebP automatically
// - If src is undefined/null/empty → renders nothing
import React from 'react'

/** Thumbnail (product grid): 400px wide, quality 75 — fast, small (~20-50KB) */
const THUMB = { w: 400, q: 75 } as const;
/** Full size (product detail page, zoomed view): 900px wide, quality 85 (~80-150KB) */
const FULL  = { w: 900, q: 85 } as const;

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
  /** 'thumb' (default) = 400px/q75  |  'full' = 900px/q85 */
  size?: 'thumb' | 'full';
  /** Index in product grid (0-based). First 4 get eager+high priority, rest lazy+low */
  index?: number;
}

const R2_CDN = 'https://media.heelsup.in';

/**
 * Extracts the R2 key from any of our image URL formats:
 *   https://media.heelsup.in/products/xxx.jpg  → products/xxx.jpg
 *   /api/upload?key=products/xxx.jpg            → products/xxx.jpg
 *   /api/upload/products/xxx.jpg                → products/xxx.jpg
 *   https://x.workers.dev/api/upload?key=xxx    → xxx
 */
function extractKey(src: string): string | null {
  try {
    // /api/upload?key= or full URL with ?key=
    const parsed = new URL(src, 'https://x.invalid');
    const key = parsed.searchParams.get('key');
    if (key) return decodeURIComponent(key);

    const pathname = parsed.pathname;

    // /api/admin/upload/products/xxx or /api/upload/products/xxx
    for (const prefix of ['/api/admin/upload/', '/api/upload/']) {
      if (pathname.startsWith(prefix)) {
        const k = pathname.slice(prefix.length);
        if (k) return decodeURIComponent(k);
      }
    }

    // https://media.heelsup.in/products/xxx.jpg
    if (parsed.hostname === 'media.heelsup.in' || src.startsWith(R2_CDN)) {
      const k = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      if (k) return decodeURIComponent(k);
    }
  } catch {}
  return null;
}

/**
 * Builds the URL to pass to <img src>.
 * - If key can be extracted → route through Worker with resize params
 * - data:/blob: → as-is
 * - Relative static path (e.g. /assets/logo.png) → as-is
 * - Unknown external URL → as-is (no resize)
 */
function buildImageUrl(src: string | undefined, size: 'thumb' | 'full'): string | undefined {
  if (!src || !src.trim()) return undefined;

  // data: or blob: — never proxy
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  // Static relative path (logo, banner, etc.) — never proxy
  if (src.startsWith('/') && !src.startsWith('/api/')) return src;

  // Try to extract R2 key
  const key = extractKey(src);
  if (key) {
    const { w, q } = size === 'full' ? FULL : THUMB;
    return `/api/upload?key=${encodeURIComponent(key)}&w=${w}&q=${q}`;
  }

  // Unknown URL (external CDN, etc.) — return as-is
  return src;
}

export default function HeicImage({
  src,
  className = '',
  loading,
  fetchpriority,
  alt = '',
  style,
  size = 'thumb',
  index,
  ...props
}: HeicImageProps) {
  const displaySrc = buildImageUrl(src, size);

  // No image → render nothing
  if (!displaySrc) return null;

  // Auto-determine priority from position in grid
  // First 4 images (above the fold on mobile) → eager + high priority (LCP)
  // Rest → lazy + low (saves bandwidth, speeds up initial page render)
  const aboveFold = index !== undefined ? index < 4 : (size === 'full');
  const resolvedLoading   = loading   ?? (aboveFold ? 'eager' : 'lazy');
  const resolvedPriority  = fetchpriority ?? (aboveFold ? 'high' : 'low');

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={{
        backgroundColor: '#f0ede8', // warm placeholder — prevents layout shift before image loads
        ...style,
      }}
      loading={resolvedLoading}
      decoding={aboveFold ? 'sync' : 'async'}
      // @ts-ignore — fetchpriority is valid HTML but TS lib types lag behind
      fetchpriority={resolvedPriority}
      {...props}
    />
  );
}
