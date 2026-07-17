// frontend/src/components/HeicImage.tsx
// Optimised image component.
// - No client-side HEIC conversion (server converts all uploads to WebP/AVIF already).
// - Proxies R2/CDN URLs through /api/upload for CORS-safe delivery.
// - Supports loading="lazy"|"eager", decoding="async", fetchpriority="high"|"low".
// - Shows shimmer skeleton while loading (no blank/invisible flash).
// - Smooth fade-in on load.
import React, { useState, useEffect, useRef } from 'react'

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
    img._img_loading {
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: _img_shimmer 1.4s ease-in-out infinite;
    }
    img._img_loaded {
      background: transparent !important;
      animation: none !important;
      transition: opacity 0.25s ease;
    }
  `;
  document.head.appendChild(style);
}

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: string;
  /** "eager" + fetchpriority="high" for above-fold / LCP images */
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
}

// Proxy R2/CDN URLs through the same-origin /api/upload endpoint
// to avoid CORS issues and to let Cloudflare Image Resizing serve WebP/AVIF.
const getProxyUrl = (urlStr: string): string => {
  if (!urlStr) return '';
  if (urlStr.startsWith('/') || urlStr.startsWith('data:') || urlStr.startsWith('blob:')) {
    return urlStr;
  }
  try {
    const parsed = new URL(urlStr);
    
    // If it is already an /api/upload URL, extract the actual key parameter directly
    if (parsed.pathname.includes('/api/upload')) {
      const queryKey = parsed.searchParams.get('key');
      if (queryKey) {
        return `/api/upload?key=${encodeURIComponent(queryKey)}`;
      }
    }
    
    if (
      parsed.hostname.includes('r2.dev') ||
      parsed.hostname.includes('heelsup.in') ||
      parsed.hostname.includes('cloudflare')
    ) {
      const key = parsed.pathname.substring(1);
      return `/api/upload?key=${encodeURIComponent(decodeURIComponent(key))}`;
    }
  } catch {
    // not a valid absolute URL — return as-is
  }
  return urlStr;
};

export default function HeicImage({
  src,
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
  className = '',
  loading = 'eager',
  fetchpriority = 'high',
  alt = '',
  style,
  ...props
}: HeicImageProps) {
  const [renderedSrc, setRenderedSrc] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Inject shimmer CSS once
  useEffect(() => { injectShimmer(); }, []);

  // If the image is already cached by the browser (complete before React mounts),
  // skip the shimmer immediately so there's no flash on navigation.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadAndProcess = async () => {
      if (!src) {
        setRenderedSrc(fallback);
        return;
      }
      const proxyUrl = getProxyUrl(src);
      // Check if this is a HEIC/HEIF image key or URL
      const isHeic = proxyUrl.toLowerCase().includes('.heic') || proxyUrl.toLowerCase().includes('.heif') || (proxyUrl.toLowerCase().includes('key=') && (proxyUrl.toLowerCase().endsWith('%2fheic') || proxyUrl.toLowerCase().endsWith('%2fheif') || proxyUrl.toLowerCase().includes('.heic') || proxyUrl.toLowerCase().includes('.heif')));

      if (isHeic) {
        try {
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error('Fetch failed');
          const blob = await res.blob();

          if (!active) return;

          const heic2anyModule = await import('heic2any');
          const heic2any = heic2anyModule.default;

          const converted = await heic2any({ blob, toType: 'image/jpeg', quality: 0.95 });
          const jpegBlob = Array.isArray(converted) ? converted[0] : converted;

          if (!active) return;

          const localUrl = URL.createObjectURL(jpegBlob);

          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          objectUrlRef.current = localUrl;
          setRenderedSrc(localUrl);
          setLoaded(true);
        } catch (err) {
          console.error('[HeicImage] Client-side HEIC conversion failed:', err);
          if (active) {
            setRenderedSrc(fallback);
            setErrored(true);
          }
        }
      } else {
        setRenderedSrc(proxyUrl);
        // Reset loaded state for new standard sources to trigger load check correctly
        setErrored(false);
      }
    };

    loadAndProcess();

    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [src, fallback]);

  const displaySrc = errored || !src ? fallback : renderedSrc;

  return (
    <img
      ref={imgRef}
      src={displaySrc}
      alt={alt}
      className={`${className} ${loaded ? '_img_loaded' : '_img_loading'}`}
      loading={loading}
      decoding="async"
      // @ts-ignore — fetchpriority is valid HTML but TS lib types lag behind
      fetchpriority={fetchpriority}
      style={{
        opacity: loaded ? 1 : 0.01, // near-zero keeps layout intact; shimmer shows via bg
        ...style,
      }}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setErrored(true);
        setLoaded(true); // show fallback instantly, no retry loop
      }}
      {...props}
    />
  );
}
