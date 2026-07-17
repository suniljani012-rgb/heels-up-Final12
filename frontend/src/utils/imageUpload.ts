// frontend/src/utils/imageUpload.ts
// Shared image upload utility — converts ANY image format to WebP before upload.
// HEIC/HEIF → heic2any (JPEG) → canvas → WebP
// All other raster formats → canvas → WebP
// GIF/WebP/AVIF → uploaded as-is (no re-encode needed)

const WEBP_QUALITY = 0.85;
const MAX_WIDTH = 1200;   // cap product images at 1200px wide — more than enough for web
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB hard limit

/**
 * Resize + convert a raster file to WebP via canvas.
 * Preserves aspect ratio. If image is smaller than MAX_WIDTH, no scaling is done.
 */
export function convertToWebP(file: File, quality = WEBP_QUALITY): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate dimensions with max-width cap
        let { width, height } = img;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // White background for transparency (e.g., PNG with alpha)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Prepare a single image file for upload:
 * - HEIC/HEIF → heic2any (JPEG blob) → canvas → WebP
 * - GIF → kept as-is (animation must be preserved)
 * - WebP/AVIF → kept as-is (already optimal)
 * - Everything else (JPG, PNG, TIFF, BMP, RAW, etc.) → canvas → WebP
 */
export async function prepareImageFile(file: File): Promise<File> {
  const name = file.name.toLowerCase();
  const mime = file.type;

  // HEIC or HEIF — must use heic2any first (canvas can't decode HEIC natively)
  const isHeic =
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    mime === 'image/heic' ||
    mime === 'image/heif';

  if (isHeic) {
    try {
      const heic2anyModule = await import('heic2any');
      const heic2any = heic2anyModule.default;
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
      const jpegFile = new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg',
      });
      // Now convert that JPEG → WebP
      return convertToWebP(jpegFile);
    } catch (err) {
      console.warn('[imageUpload] heic2any failed, uploading original:', err);
      return file; // fallback: upload original
    }
  }

  // GIF — preserve animation
  if (name.endsWith('.gif') || mime === 'image/gif') {
    return file;
  }

  // Already optimal formats
  if (
    name.endsWith('.webp') ||
    name.endsWith('.avif') ||
    mime === 'image/webp' ||
    mime === 'image/avif'
  ) {
    return file;
  }

  // Everything else → WebP via canvas
  return convertToWebP(file);
}

/**
 * Upload multiple prepared image files to the server.
 * Calls /api/admin/upload with Authorization header.
 * Returns array of public URLs.
 */
export async function uploadImages(
  files: File[],
  token: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ urls: string[]; keys: string[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

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

  return { urls: data.data.urls, keys: data.data.keys };
}

/**
 * Full pipeline: prepare (convert to WebP) + upload.
 * Shows progress via onProgress callback.
 */
export async function prepareAndUpload(
  rawFiles: FileList | File[],
  token: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{ urls: string[]; keys: string[] }> {
  const fileArray = Array.from(rawFiles);
  const total = fileArray.length;

  onProgress?.('converting', 0, total);

  // Convert files sequentially (canvas is synchronous per file)
  const prepared: File[] = [];
  for (let i = 0; i < fileArray.length; i++) {
    onProgress?.('converting', i, total);
    const ready = await prepareImageFile(fileArray[i]);
    prepared.push(ready);
  }
  onProgress?.('converting', total, total);

  // Size guard: reject any file that is still > 5MB after conversion
  for (const f of prepared) {
    if (f.size > MAX_FILE_BYTES) {
      throw new Error(
        `"${f.name}" is ${(f.size / 1024 / 1024).toFixed(1)} MB after conversion. Maximum allowed size is 5 MB. Please use a smaller image.`
      );
    }
  }

  onProgress?.('uploading', total, total);

  return uploadImages(prepared, token, onProgress);
}
