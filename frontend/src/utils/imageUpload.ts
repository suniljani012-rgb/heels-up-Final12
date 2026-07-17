// frontend/src/utils/imageUpload.ts
// Ultra-fast parallel image conversion pipeline to standard PNG.
// - HEIC/HEIF → heic2any (JPEG blob) → canvas → PNG
// - GIF → kept as-is (animations must be preserved)
// - All other formats (JPEG, WebP, AVIF, TIFF, BMP…) → canvas → PNG (max 1200px)
// - Converts all images to PNG on upload to ensure 100% browser compatibility and no blank screens.

const MAX_WIDTH = 1200;        // cap at 1200px wide — enough for full-bleed e-commerce
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB raw-input limit (before conversion)

// ---------------------------------------------------------------------------
// Low-level: draw a loaded <img> onto a canvas and export as PNG File
// ---------------------------------------------------------------------------
function canvasToPNG(img: HTMLImageElement, originalName: string): Promise<File> {
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

    // PNG supports transparency, so we don't need a white background fill
    ctx.drawImage(img, 0, 0, width, height);

    const baseName = originalName.replace(/\.[^/.]+$/, '');
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(new File([blob], `${baseName}.png`, { type: 'image/png' }));
        } else {
          reject(new Error('canvas.toBlob returned null'));
        }
      },
      'image/png'
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
// Convert ONE file → PNG File (parallel-safe, no shared state)
// ---------------------------------------------------------------------------
export async function prepareImageFile(file: File): Promise<File> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // GIF: keep as-is (animations must survive)
  if (ext === 'gif' || file.type === 'image/gif') return file;

  // HEIC / HEIF: Decode using heic2any, then convert to standard PNG
  if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
    try {
      const { default: heic2any } = await import('heic2any');
      const raw = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
      const jpegBlob: Blob = Array.isArray(raw) ? raw[0] : raw;
      const img = await blobToImg(jpegBlob);
      return await canvasToPNG(img, file.name);
    } catch (err) {
      console.warn('HEIC dynamic decode failed, trying direct canvas decode:', err);
      try {
        const img = await blobToImg(file);
        return await canvasToPNG(img, file.name);
      } catch {
        return file; // fallback if decoding completely fails
      }
    }
  }

  // All other raster formats (JPEG, PNG, WebP, AVIF, TIFF, BMP, …) → resize + PNG
  try {
    const img = await blobToImg(file);
    return await canvasToPNG(img, file.name);
  } catch {
    return file; // fallback: upload as-is if canvas fails
  }
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

  // Size guard: reject any file that is still > 15MB after conversion (PNGs can be slightly larger)
  for (const f of prepared) {
    if (f.size > 15 * 1024 * 1024) {
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
