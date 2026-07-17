// frontend/src/components/HeicImage.tsx
// Simple, reliable image component.
// - R2 / workers.dev URLs: proxied through /api/upload (CF Image Resizing handles HEIC → WebP)
// - External URLs (Unsplash, CDN, etc.): used directly
// - No opacity/shimmer tricks that can cause blank images
import React from 'react'

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
}

/**
 * Decide whether a URL needs to be proxied through /api/upload.
 * Only proxy R2 / workers.dev / heelsup.in URLs so that:
 *  - HEIC files get converted by Cloudflare Image Resizing
 *  - CORS headers are added
 * External URLs (Unsplash, other CDNs) are used as-is.
 */
function getDisplayUrl(urlStr: string | undefined): string | undefined {
  if (!urlStr) return undefined;

  // Relative URLs, blob: and data: — use as-is
  if (urlStr.startsWith('/') || urlStr.startsWith('data:') || urlStr.startsWith('blob:')) {
    return urlStr;
  }

  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname;

    // Already a same-origin /api/upload proxy URL — rebuild cleanly
    if (parsed.pathname.includes('/api/upload')) {
      const queryKey = parsed.searchParams.get('key');
      if (queryKey) return `/api/upload?key=${encodeURIComponent(queryKey)}`;
    }

    // Only proxy our own R2 / worker URLs
    const isOurUrl =
      host.includes('heelsup.in') ||
      host.includes('workers.dev') ||
      host.includes('r2.dev');

    if (isOurUrl) {
      const key = decodeURIComponent(parsed.pathname.substring(1));
      return `/api/upload?key=${encodeURIComponent(key)}`;
    }

    // All other URLs (Unsplash, CDN, etc.) — use directly
    return urlStr;
  } catch {
    return urlStr;
  }
}

export default function HeicImage({
  src,
  fallback,
  className = '',
  loading = 'lazy',
  fetchpriority,
  alt = '',
  style,
  onError,
  ...props
}: HeicImageProps) {
  const displaySrc = getDisplayUrl(src) ?? getDisplayUrl(fallback);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    // If main src fails and we have a fallback, switch to it
    if (fallback && (e.target as HTMLImageElement).src !== getDisplayUrl(fallback)) {
      (e.target as HTMLImageElement).src = getDisplayUrl(fallback) ?? '';
    }
    onError?.(e);
  };

  if (!displaySrc) return null;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding="async"
      // @ts-ignore — fetchpriority is valid HTML but TS lib types lag behind
      fetchpriority={fetchpriority}
      onError={handleError}
      {...props}
    />
  );
}
