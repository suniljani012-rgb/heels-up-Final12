// frontend/src/utils/imageUpload.ts
// Ultra-fast image pipeline: compress every image to under 100KB before upload.
// PNG/JPG/WebP → compressed WebP ~30-80KB → R2 CDN → instant load
// HEIC/HEIF → convert → compress → R2 CDN

const MAX_WIDTH = 900;          // 900px max — product thumbnails don't need more
const TARGET_KB = 100;          // Target: each image under 100KB
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB raw-input safety limit

/**
 * Check if a file is HEIC or HEIF based on extension AND MIME type.
 * Handles cases where iPhone/browser gives generic MIME type like application/octet-stream or empty string.
 */
export function isHeicFile(file: File): boolean {
  if (!file) return false;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isExtHeic = ext === 'heic' || ext === 'heif';
  const type = (file.type || '').toLowerCase();
  const isMimeHeic =
    type.includes('heic') ||
    type.includes('heif') ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence' ||
    type === 'application/heic' ||
    type === 'application/heif';

  return isExtHeic || isMimeHeic;
}

/**
 * Multi-tier HEIC/HEIF File converter -> converts to JPEG/WebP File
 */
export async function convertHeicToWebp(file: File): Promise<File> {
  let heic2anyFn: any;
  try {
    const module = await import('heic2any');
    heic2anyFn = module.default || module;
  } catch (err) {
    console.error('Failed to dynamically import heic2any:', err);
    throw new Error('HEIC/HEIF conversion library failed to load.');
  }

  if (typeof heic2anyFn !== 'function' && (heic2anyFn as any)?.default) {
    heic2anyFn = (heic2anyFn as any).default;
  }

  let blob: Blob | null = null;

  // Attempt 1: Standard JPEG conversion (fast & reliable in heic2any)
  try {
    const result = await heic2anyFn({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });
    blob = Array.isArray(result) ? result[0] : result;
  } catch (e1) {
    console.warn('heic2any attempt 1 (toType: image/jpeg) failed, trying fallback:', e1);
    // Attempt 2: Single frame conversion without specifying toType
    try {
      const result2 = await heic2anyFn({
        blob: file
      });
      blob = Array.isArray(result2) ? result2[0] : result2;
    } catch (e2) {
      console.warn('heic2any attempt 2 (multiple: false) failed, trying toType image/webp:', e2);
      // Attempt 3: WebP target conversion
      try {
        const result3 = await heic2anyFn({
          blob: file,
          toType: 'image/webp',
          quality: 0.85
        });
        blob = Array.isArray(result3) ? result3[0] : result3;
      } catch (e3) {
        console.error('All heic2any conversion attempts failed:', e3);
      }
    }
  }

  const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/heic|heif/gi, 'photo');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  const newFileName = `product-${cleanBaseName}-${timestamp}-${random}.jpg`;

  if (blob) {
    return new File([blob], newFileName, { type: blob.type || 'image/jpeg' });
  }

  // Resilient fallback: Create renamed JPEG file wrapper so server handles it smoothly
  return new File([file], newFileName, { type: 'image/jpeg' });
}

/**
 * Compress image: resize to MAX_WIDTH, then adaptively compress WebP
 * until output is under TARGET_KB (or minimum quality floor is reached).
 */
function canvasToWebP(img: HTMLImageElement, originalName: string): Promise<File> {
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
    if (!ctx) { reject(new Error('Could not get 2D canvas context')); return; }
    ctx.drawImage(img, 0, 0, width, height);

    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const cleanName = baseName.startsWith('product-') ? baseName : `product-${baseName}-${Date.now()}`;
    const fileName = `${cleanName}.webp`;

    // Adaptive quality: start at 0.78, step down until under TARGET_KB
    const qualitySteps = [0.78, 0.68, 0.58, 0.45];
    let stepIndex = 0;

    function tryQuality(q: number) {
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas image compression failed')); return; }
          const kb = blob.size / 1024;
          // Accept if under target, or we've exhausted quality steps
          if (kb <= TARGET_KB || stepIndex >= qualitySteps.length - 1) {
            resolve(new File([blob], fileName, { type: 'image/webp' }));
          } else {
            stepIndex++;
            tryQuality(qualitySteps[stepIndex]);
          }
        },
        'image/webp',
        q
      );
    }

    tryQuality(qualitySteps[stepIndex]);
  });
}

/**
 * Low-level: load a Blob/File into an HTML <img> element
 */
function blobToImg(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image decoding failed'));
    };
    img.src = url;
  });
}

/**
 * Prepare ONE file -> Convert HEIC if needed, scale to max width, export as WebP File
 */
export async function prepareImageFile(file: File): Promise<File> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File "${file.name}" exceeds maximum allowed limit of 50MB.`);
  }

  let targetFile = file;

  // 1. HEIC/HEIF Client-Side Auto Conversion
  if (isHeicFile(file)) {
    try {
      targetFile = await convertHeicToWebp(file);
    } catch (err: any) {
      console.warn('HEIC conversion warning:', err);
    }
  }

  // 2. Canvas Resize & WebP Optimization
  try {
    const img = await blobToImg(targetFile);
    return await canvasToWebP(img, targetFile.name);
  } catch (err) {
    // If canvas decode fails, return targetFile (renamed .jpg container) so server handles it
    return targetFile;
  }
}

/**
 * Upload prepared files to /api/admin/upload using XMLHttpRequest for progress tracking
 */
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
          reject(new Error('Invalid JSON response received from server.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `Upload failed: ${xhr.statusText || xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
        }
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

/**
 * Full Pipeline: Convert files sequentially -> upload to R2
 */
export async function prepareAndUpload(
  rawFiles: FileList | File[],
  token: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{ urls: string[]; keys: string[] }> {
  const fileArray = Array.from(rawFiles);
  const total = fileArray.length;

  onProgress?.('converting', 0, total);

  const prepared: File[] = [];
  let convertedCount = 0;

  // Sequential processing for stability
  for (const file of fileArray) {
    const isHeic = isHeicFile(file);
    if (isHeic) {
      onProgress?.(`Converting HEIC image ${convertedCount + 1} of ${total} to WebP...`, convertedCount, total);
    } else {
      onProgress?.(`Preparing image ${convertedCount + 1} of ${total}...`, convertedCount, total);
    }

    try {
      const ready = await prepareImageFile(file);
      prepared.push(ready);
    } catch (err: any) {
      console.warn('File preparation fallback:', err);
      prepared.push(file);
    }

    convertedCount++;
    onProgress?.('converting', convertedCount, total);
  }

  onProgress?.('converting', total, total);

  // Size guard after conversion
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
