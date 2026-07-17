// worker/src/routes/upload.js
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { ok, error, serverError, notFound } from '../utils/response.js';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB raw input cap (client converts all images to WebP before upload)
const ALLOWED_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg',
    'tiff', 'tif', 'bmp', 'jfif', 'avif', 'ico', 'apng', 'raw'
];

export async function uploadRouter(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path.startsWith('/api/admin/upload')) {
        path = path.replace('/api/admin/upload', '') || '/';
    } else {
        path = path.replace('/api/upload', '') || '/';
    }
    const method = request.method;

    // GET /api/upload — serve file from R2
    if ((path === '/' || path === '') && method === 'GET') {
        try {
            const key = url.searchParams.get('key');
            if (!key) return error('key required');
            const bucket = env.MEDIA || env.BUCKET;
            if (!bucket) return error('R2 bucket binding not found', 500);

            // Determine browser format support and whether file is HEIC
            const accept = request.headers.get('accept') || '';
            const supportsWebp = accept.includes('image/webp');
            const supportsAvif = accept.includes('image/avif');
            const isHeic = key.toLowerCase().endsWith('.heic') || key.toLowerCase().endsWith('.heif');

            // HEIC ALWAYS needs conversion — browsers cannot render raw HEIC.
            // All other formats: only use CF Resizing if browser supports modern formats.
            const needsCfResizing = isHeic || supportsWebp || supportsAvif;

            if (env.R2_PUBLIC_URL && needsCfResizing) {
                const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
                // For HEIC: force jpeg as safe fallback if browser doesn't support webp/avif
                const targetFormat = supportsAvif ? 'avif' : (supportsWebp ? 'webp' : 'jpeg');
                const resizeOptions = {
                    cf: {
                        image: {
                            format: targetFormat,
                            quality: 85,
                        }
                    }
                };

                try {
                    const optimizedRes = await fetch(publicUrl, resizeOptions);
                    if (optimizedRes.ok) {
                        const headers = new Headers(optimizedRes.headers);
                        const origin = request.headers.get('Origin') || '';
                        const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
                        headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
                        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
                        return new Response(optimizedRes.body, {
                            status: optimizedRes.status,
                            headers
                        });
                    }
                } catch (fetchErr) {
                    console.warn('Cloudflare Image Resizing fetch failed, falling back to direct R2 get:', fetchErr);
                }
            }

            // Fallback: direct serve from R2
            // For HEIC files in local dev (no CF), serve with image/jpeg header
            // so the browser at least attempts to decode it.
            const object = await bucket.get(key);
            if (!object) return notFound('File not found');

            const headers = new Headers();
            object.writeHttpMetadata(headers);

            // Override content-type for HEIC so browsers don't show blank
            if (isHeic) {
                headers.set('Content-Type', 'image/jpeg');
            }

            const origin = request.headers.get('Origin') || '';
            const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
            headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');

            return new Response(object.body, { headers });
        } catch (e) {
            console.error('Serve error:', e);
            return serverError('Failed to serve file');
        }
    }


    // POST /api/upload — upload image to R2
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const formData = await request.formData();
            let files = formData.getAll('files').filter(f => f && typeof f !== 'string');
            if (!files || files.length === 0) {
                const singleFile = formData.get('file');
                if (singleFile && typeof singleFile !== 'string') {
                    files = [singleFile];
                }
            }

            if (!files || files.length === 0) {
                return error('No files provided', 400);
            }

            const bucket = env.MEDIA || env.BUCKET;
            if (!bucket) return error('R2 bucket binding (MEDIA) not found', 500);

            const results = await Promise.all(files.map(async (file) => {
                const fileName = file.name || '';
                const fileExt = fileName.split('.').pop().toLowerCase();
                const isHeicExt = ['heic', 'heif'].includes(fileExt); // includes HEIF variant

                const isImageMime = file.type && file.type.startsWith('image/');
                const isOctetStream = file.type === 'application/octet-stream';
                const isAllowed = isImageMime || ALLOWED_EXTENSIONS.includes(fileExt) || isOctetStream;

                if (!isAllowed) {
                    throw new Error('Only image files are allowed');
                }

                let buffer = await file.arrayBuffer();
                if (buffer.byteLength > MAX_SIZE) {
                    throw new Error('File too large. Max 50MB');
                }

                // If it is HEIC, convert to PNG. Otherwise keep original or convert
                const isHeic = isHeicExt || ext === 'heic' || ext === 'heif';
                const finalExt = isHeic ? 'png' : (ALLOWED_EXTENSIONS.includes(fileExt) ? fileExt : 'png');
                const contentType = isHeic ? 'image/png' : (file.type || 'image/png');
                const finalKey = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${finalExt}`;

                if (isHeic && env.R2_PUBLIC_URL) {
                    // 1. Put raw HEIC temporarily
                    const tempKey = `temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                    await bucket.put(tempKey, buffer, {
                        httpMetadata: { contentType: `image/${fileExt}` }
                    });

                    // 2. Fetch PNG from Cloudflare Image Resizing
                    const publicTempUrl = `${env.R2_PUBLIC_URL}/${tempKey}`;
                    try {
                        const convertRes = await fetch(publicTempUrl, {
                            cf: {
                                image: {
                                    format: 'png',
                                    quality: 90
                                }
                            }
                        });
                        if (convertRes.ok) {
                            const convertedBuffer = await convertRes.arrayBuffer();
                            // 3. Save converted PNG
                            await bucket.put(finalKey, convertedBuffer, {
                                httpMetadata: { contentType: 'image/png' }
                            });
                            // 4. Delete temp file in background
                            ctx.waitUntil(bucket.delete(tempKey));
                            buffer = convertedBuffer;
                        } else {
                            // Fallback if CF Resizing fails: save raw HEIC as .heic
                            const fallbackKey = finalKey.replace('.png', `.${fileExt}`);
                            await bucket.put(fallbackKey, buffer, {
                                httpMetadata: { contentType: `image/${fileExt}` }
                            });
                            ctx.waitUntil(bucket.delete(tempKey));
                            return { url: `${env.R2_PUBLIC_URL}/${fallbackKey}`, key: fallbackKey };
                        }
                    } catch (fetchErr) {
                        console.error('Server HEIC to PNG conversion error:', fetchErr);
                        const fallbackKey = finalKey.replace('.png', `.${fileExt}`);
                        await bucket.put(fallbackKey, buffer, {
                            httpMetadata: { contentType: `image/${fileExt}` }
                        });
                        ctx.waitUntil(bucket.delete(tempKey));
                        return { url: `${env.R2_PUBLIC_URL}/${fallbackKey}`, key: fallbackKey };
                    }
                } else {
                    // Regular uploads
                    await bucket.put(finalKey, buffer, {
                        httpMetadata: { contentType },
                    });
                }

                const publicUrl = `${env.R2_PUBLIC_URL}/${finalKey}`;
                return { url: publicUrl, key: finalKey };
            }));

            return ok({
                url: results[0].url,
                key: results[0].key,
                urls: results.map(r => r.url),
                keys: results.map(r => r.key)
            }, 'File(s) uploaded');
        } catch (e) {
            console.error('Upload error:', e);
            return error(e.message || 'Upload failed', 400);
        }
    }

    // DELETE /api/upload — delete from R2
    if (path === '/' && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const { key } = await request.json();
            if (!key) return error('key required');
            const bucket = env.MEDIA || env.BUCKET;
            if (!bucket) return error('R2 bucket binding (MEDIA) not found', 500);
            await bucket.delete(key);
            return ok(null, 'File deleted');
        } catch (e) {
            return serverError('Delete failed');
        }
    }

    return error('Route not found', 404);
}