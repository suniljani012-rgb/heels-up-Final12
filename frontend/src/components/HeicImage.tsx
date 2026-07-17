// frontend/src/components/HeicImage.tsx
// Simple, reliable image component.
// - In production: serves original URLs directly from database (no proxy, 100% original quality).
// - In local dev (localhost): proxies R2 URLs to /api/upload to load from the local miniflare R2 bucket.
// - If src is undefined/null/empty → renders nothing
import React from 'react'

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
}

/**
 * Returns the URL to actually load in the <img> tag.
 * - Production: always returns original URL directly (no proxy).
 * - Localhost: proxies R2/Worker URLs so miniflare can serve local files.
 */
function getDisplayUrl(src: string | undefined): string | undefined {
  if (!src || !src.trim()) return undefined;

  // Relative, blob: or data: — use as-is
  if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalhost) {
    try {
      const parsed = new URL(src);
      const host = parsed.hostname;

      // Already a proxied /api/upload URL — rebuild cleanly
      if (parsed.pathname.includes('/api/upload')) {
        const queryKey = parsed.searchParams.get('key');
        if (queryKey) return `/api/upload?key=${encodeURIComponent(queryKey)}`;
      }

      // Only proxy our own R2 / Worker / CDN URLs in local development
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
  }

  // All other cases / Production: use original URL directly
  return src;
}

export default function HeicImage({
  src,
  className = '',
  loading = 'eager',
  fetchpriority = 'high',
  alt = '',
  style,
  ...props
}: HeicImageProps) {
  const displaySrc = getDisplayUrl(src);

  // No image in database → render nothing
  if (!displaySrc) return null;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding="sync"
      // @ts-ignore — fetchpriority is valid HTML but TS lib types lag behind
      fetchpriority={fetchpriority}
      {...props}
    />
  );
}
