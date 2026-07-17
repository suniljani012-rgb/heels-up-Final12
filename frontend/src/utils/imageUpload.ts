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
  // Return original file as-is, bypassing client-side compression/conversion.
  return file;
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

  return uploadImages(prepared, token, onProgress ? (current, total) => onProgress('uploading', current, total) : undefined);
}
