// frontend/src/components/HeicImage.tsx
// Simple, reliable optimised image component.
// - Proxies R2/CDN URLs through /api/upload (CF Image Resizing handles HEIC → WebP).
// - Shows shimmer skeleton while loading.
// - Smooth fade-in on load.
import React, { useState, useRef, useEffect, useCallback } from 'react'

// Inject shimmer keyframe once into document head
let shimmerInjected = false;
function injectShimmer() {
  if (shimmerInjected || typeof document === 'undefined') return;
  shimmerInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes _img_shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    ._img_loading {
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%) !important;
      background-size: 200% 100% !important;
      animation: _img_shimmer 1.4s ease-in-out infinite !important;
    }
    ._img_loaded {
      background: transparent !important;
      animation: none !important;
      transition: opacity 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
}

// Proxy R2/CDN/workers.dev URLs through same-origin /api/upload endpoint.
// CF Image Resizing on the backend converts HEIC/HEIF → WebP/JPEG automatically.
function getProxyUrl(urlStr: string): string {
  if (!urlStr) return '';
  // Already relative or blob/data — use as-is
  if (urlStr.startsWith('/') || urlStr.startsWith('data:') || urlStr.startsWith('blob:')) {
    return urlStr;
  }
  try {
    const parsed = new URL(urlStr);

    // Already a proxied /api/upload URL — extract key and rebuild cleanly
    if (parsed.pathname.includes('/api/upload')) {
      const queryKey = parsed.searchParams.get('key');
      if (queryKey) return `/api/upload?key=${encodeURIComponent(queryKey)}`;
    }

    // R2, CDN, workers.dev — proxy through backend
    if (
      parsed.hostname.includes('r2.dev') ||
      parsed.hostname.includes('heelsup.in') ||
      parsed.hostname.includes('cloudflare') ||
      parsed.hostname.includes('workers.dev')
    ) {
      const key = decodeURIComponent(parsed.pathname.substring(1));
      return `/api/upload?key=${encodeURIComponent(key)}`;
    }
  } catch {
    // not a valid URL — use as-is
  }
  return urlStr;
}

export default function HeicImage({
  src,
  fallback = '',
  className = '',
  loading = 'lazy',
  fetchpriority,
  alt = '',
  style,
  ...props
}: HeicImageProps) {
  // Use a counter-key trick: when src changes, increment key to force img remount.
  // This guarantees onLoad fires fresh for every new src (even cached images).
  const [imgKey, setImgKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const prevSrcRef = useRef<string | undefined>(undefined);

  useEffect(() => { injectShimmer(); }, []);

  // When src changes → reset state and remount img
  if (src !== prevSrcRef.current) {
    prevSrcRef.current = src;
    // These are synchronous during render — safe in React for derived state
  }

  const handleSrcChange = useCallback(() => {
    setLoaded(false);
    setErrored(false);
    setImgKey(k => k + 1);
  }, []);

  // Trigger remount when src changes
  const srcRef = useRef(src);
  if (srcRef.current !== src) {
    srcRef.current = src;
    // Can't call setState during render — use layout effect instead
  }
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setImgKey(k => k + 1);
  }, [src]);

  const displaySrc = errored || !src ? (fallback || undefined) : getProxyUrl(src);

  return (
    <img
      key={imgKey}
      src={displaySrc}
      alt={alt}
      className={`${className} ${loaded ? '_img_loaded' : '_img_loading'}`}
      loading={loading}
      decoding="async"
      // @ts-ignore
      fetchpriority={fetchpriority}
      style={{
        opacity: loaded ? 1 : 0,
        ...style,
      }}
      onLoad={() => {
        setLoaded(true);
        setErrored(false);
      }}
      onError={() => {
        setErrored(true);
        setLoaded(true);
      }}
      {...props}
    />
  );
}
