import React, { useState, useEffect } from 'react'

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: string;
}

// Global cache for converted HEIC image URLs
const heicCache = new Map<string, string>();

// Helper function to resolve/proxy R2 urls to same-origin to avoid CORS and domain issues
const getProxyUrl = (urlStr: string) => {
  if (!urlStr) return '';
  if (urlStr.startsWith('/') || urlStr.startsWith('data:') || urlStr.startsWith('blob:')) {
    return urlStr;
  }
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname.includes('r2.dev') || parsed.hostname.includes('heelsup.in')) {
      const key = parsed.pathname.substring(1); // Remove leading slash
      return `/api/upload?key=${encodeURIComponent(decodeURIComponent(key))}`;
    }
  } catch (e) {
    console.error('Failed to parse URL for proxy:', urlStr, e);
  }
  return urlStr;
};

export default function HeicImage({ src, fallback = 'assets/placeholder.jpg', className, ...props }: HeicImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(fallback);
      return;
    }

    // Support both HEIC and HEIF formats case-insensitively
    const isHeic = src.toLowerCase().includes('.heic') || src.toLowerCase().includes('.heif');
    if (!isHeic) {
      setDisplaySrc(src);
      return;
    }

    const proxyUrl = getProxyUrl(src);

    // Serve from cache if already converted
    if (heicCache.has(src)) {
      setDisplaySrc(heicCache.get(src)!);
      return;
    }

    let active = true;
    const convertHeic = async () => {
      setLoading(true);
      try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        const blob = await response.blob();
        
        // Dynamically load heic2any so it does not bloat initial bundle size
        const heic2anyModule = await import('heic2any');
        const heic2any = heic2anyModule.default;
        
        const conversionResult = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.8
        });

        const singleBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        const objectUrl = URL.createObjectURL(singleBlob);
        
        heicCache.set(src, objectUrl);
        if (active) {
          setDisplaySrc(objectUrl);
        }
      } catch (err) {
        console.error('HEIC conversion failed for:', src, err);
        if (active) {
          setDisplaySrc(fallback);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    convertHeic();

    return () => {
      active = false;
    };
  }, [src, fallback]);

  if (loading) {
    return (
      <div className={`relative bg-gray-50 flex items-center justify-center ${className}`}>
        {/* Sleek premium spinner */}
        <div className="w-5 h-5 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      className={className}
      {...props}
      onError={() => {
        if (displaySrc !== fallback) {
          setDisplaySrc(fallback);
        }
      }}
    />
  );
}
