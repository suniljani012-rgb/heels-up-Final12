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

  // blob: or data: — use as-is
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // Handle path-based relative proxy URLs (e.g. /api/upload/products/file.png or /api/admin/upload/products/file.png)
  if (src.startsWith('/api/upload/') || src.startsWith('/api/admin/upload/')) {
    const rawKey = src.startsWith('/api/admin/upload/')
      ? src.slice('/api/admin/upload/'.length)
      : src.slice('/api/upload/'.length);
    const cleanKey = rawKey.split('?')[0].split('#')[0];
    if (cleanKey) {
      return `/api/upload?key=${encodeURIComponent(cleanKey)}`;
    }
  }

  // Relative static asset URLs (e.g. /assets/logo.png) — use as-is
  if (src.startsWith('/')) {
    return src;
  }

  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const isStaging = typeof window !== 'undefined' && 
    (window.location.hostname.endsWith('.workers.dev') || window.location.hostname.endsWith('.pages.dev'));

  if (isLocalhost || isStaging) {
    try {
      const parsed = new URL(src);
      const host = parsed.hostname;

      // Handle path-based proxy URLs with hostname (e.g. https://domain/api/upload/products/file.png)
      if (parsed.pathname.includes('/api/admin/upload/') || parsed.pathname.includes('/api/upload/')) {
        const queryKey = parsed.searchParams.get('key');
        if (queryKey) return `/api/upload?key=${encodeURIComponent(queryKey)}`;

        let rawKey = parsed.pathname;
        if (rawKey.includes('/api/admin/upload/')) {
          rawKey = rawKey.split('/api/admin/upload/')[1];
        } else if (rawKey.includes('/api/upload/')) {
          rawKey = rawKey.split('/api/upload/')[1];
        }
        if (rawKey) {
          return `/api/upload?key=${encodeURIComponent(decodeURIComponent(rawKey))}`;
        }
      }

      // Already a proxied /api/upload URL with query parameter
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
        let key = parsed.pathname.substring(1);
        if (key.startsWith('api/admin/upload/')) {
          key = key.slice('api/admin/upload/'.length);
        } else if (key.startsWith('api/upload/')) {
          key = key.slice('api/upload/'.length);
        }
        key = decodeURIComponent(key);
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
