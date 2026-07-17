// frontend/src/utils/imageUpload.ts
// Ultra-fast parallel image conversion pipeline to standard PNG.
// - Converts standard formats (JPEG, WebP, AVIF, TIFF, BMP, GIF) to PNG on the frontend.
// - HEIC/HEIF is uploaded RAW to the server, where the server converts it to PNG using Cloudflare Image Resizing.
// - This completely avoids client-side hangs from heic2any on Windows/Chrome.
// - Supports precise byte-level upload progress and file-by-file conversion progress.

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

    // PNG supports transparency, so we just draw the image directly
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

  // HEIC / HEIF: Do NOT attempt client-side decoding (it hangs on Windows/Chrome).
  // The server will convert it to PNG during the upload request.
  if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
    return file;
  }

  // All other formats (JPEG, PNG, WebP, AVIF, TIFF, BMP, GIF, …) → resize + PNG
  try {
    const img = await blobToImg(file);
    return await canvasToPNG(img, file.name);
  } catch {
    return file; // fallback: upload as-is if canvas fails
  }
}

// ---------------------------------------------------------------------------
// Upload prepared files to /api/admin/upload using XMLHttpRequest for progress tracking
// ---------------------------------------------------------------------------
export function uploadImages(
  files: File[],
  token: string,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void
): Promise<{ urls: string[]; keys: string[] }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success && data.data) {
            resolve({ urls: data.data.urls, keys: data.data.keys });
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid response received from server.'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during image upload.'));
    });

    xhr.open('POST', '/api/admin/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
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

  let convertedCount = 0;
  // ✅ ALL conversions run in parallel
  const prepared = await Promise.all(
    fileArray.map(async (file) => {
      try {
        const ready = await prepareImageFile(file);
        convertedCount++;
        onProgress?.('converting', convertedCount, total);
        return ready;
      } catch (err) {
        convertedCount++;
        onProgress?.('converting', convertedCount, total);
        return file;
      }
    })
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

  onProgress?.('uploading', 0, 100);
  const result = await uploadImages(prepared, token, (uploaded, totalBytes) => {
    onProgress?.('uploading', uploaded, totalBytes);
  });
  onProgress?.('uploading', 100, 100);

  return result;
}
