// frontend/src/components/HeicImage.tsx
// Simple, reliable image component.
// RULE: Only shows the image that is in the database. No fallbacks. No placeholders. No proxy images.
// - R2 / heelsup.in / workers.dev URLs: proxied through /api/upload for CORS + HEIC conversion
// - All other URLs (direct CDN, Unsplash, etc.): used directly as-is
// - If src is undefined/null/empty → renders nothing
import React from 'react'

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
}

/**
 * Returns the URL to actually load in the <img> tag.
 * R2/our-domain URLs are proxied through /api/upload so:
 *   1. CORS headers are added
 *   2. HEIC files get converted by Cloudflare Image Resizing → WebP/JPEG
 * Everything else is used as-is.
 */
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
  } catch {
    // not a valid URL — return as-is
  }

  // All other URLs (Unsplash, other CDNs, etc.) — direct
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
