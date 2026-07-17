// frontend/src/utils/imageUpload.ts
// Ultra-fast parallel image conversion pipeline.
// - HEIC/HEIF → uploaded RAW as-is (Cloudflare Image Resizing converts at display time)
// - GIF → kept as-is (animations must be preserved)
// - All other raster formats (JPEG, PNG, TIFF, BMP, AVIF…) → canvas → WebP (max 1200px, Q0.82)
// - All conversions run in PARALLEL via Promise.all — not sequential

const WEBP_QUALITY = 0.82;
const MAX_WIDTH = 1200;        // cap at 1200px wide — enough for full-bleed e-commerce
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB raw-input limit (before conversion)

// ---------------------------------------------------------------------------
// Low-level: draw a loaded <img> onto a canvas and export as WebP File
// ---------------------------------------------------------------------------
function canvasToWebP(img: HTMLImageElement, originalName: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    let { width, height } = img;
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('No canvas context')); return; }

    // White fill for transparent images (PNG/AVIF with alpha)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const baseName = originalName.replace(/\.[^/.]+$/, '');
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
        } else {
          reject(new Error('canvas.toBlob returned null'));
        }
      },
      'image/webp',
      quality
    );
  });
}

// ---------------------------------------------------------------------------
// Low-level: load a Blob/File into an <img> element
// ---------------------------------------------------------------------------
function blobToImg(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image decode failed')); };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Convert ONE file → WebP File (parallel-safe, no shared state)
// ---------------------------------------------------------------------------
export async function prepareImageFile(file: File): Promise<File> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // GIF: keep as-is (animations must survive)
  if (ext === 'gif' || file.type === 'image/gif') return file;

  // HEIC / HEIF: upload raw — NO client-side conversion.
  // heic2any is a pure-JS decoder and takes 5+ min per file.
  // Cloudflare Image Resizing on GET /api/upload converts HEIC → WebP/JPEG
  // at display time using hardware acceleration (milliseconds).
  if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
    return file;
  }

  // All other raster formats (JPEG, PNG, WebP, AVIF, TIFF, BMP, …) → resize + WebP
  const img = await blobToImg(file);
  return canvasToWebP(img, file.name, WEBP_QUALITY);
}

// ---------------------------------------------------------------------------
// Upload prepared files to /api/admin/upload
// ---------------------------------------------------------------------------
export async function uploadImages(
  files: File[],
  token: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ urls: string[]; keys: string[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  onProgress?.(0, files.length);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Upload failed');
  }

  onProgress?.(files.length, files.length);
  return { urls: data.data.urls, keys: data.data.keys };
}

// ---------------------------------------------------------------------------
// Full pipeline: PARALLEL convert → upload
// ---------------------------------------------------------------------------
export async function prepareAndUpload(
  rawFiles: FileList | File[],
  token: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{ urls: string[]; keys: string[] }> {
  const fileArray = Array.from(rawFiles);
  const total = fileArray.length;

  onProgress?.('converting', 0, total);

  // ✅ ALL conversions run in parallel — not sequential
  const prepared = await Promise.all(
    fileArray.map((file) => prepareImageFile(file))
  );

  onProgress?.('converting', total, total);

  // Size guard: reject any file that is still > 10MB after conversion
  for (const f of prepared) {
    if (f.size > 10 * 1024 * 1024) {
      throw new Error(
        `"${f.name}" is ${(f.size / 1024 / 1024).toFixed(1)} MB after conversion. Please use a smaller image.`
      );
    }
  }

  onProgress?.('uploading', 0, total);
  const result = await uploadImages(prepared, token, (current, tot) =>
    onProgress?.('uploading', current, tot)
  );
  onProgress?.('uploading', total, total);

  return result;
}
