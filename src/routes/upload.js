// worker/src/routes/upload.js
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { ok, error, serverError, notFound } from '../utils/response.js';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
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

            // Determine if we should optimize format based on client browser support
            const accept = request.headers.get('accept') || '';
            const supportsWebp = accept.includes('image/webp');
            const supportsAvif = accept.includes('image/avif');

            // If the environment has R2_PUBLIC_URL and accepts modern formats, we can use Cloudflare Image Resizing via fetch
            if (env.R2_PUBLIC_URL && (supportsWebp || supportsAvif)) {
                const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
                const resizeOptions = {
                    cf: {
                        image: {
                            format: supportsAvif ? 'avif' : 'webp',
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
                        headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);
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

            // Fallback: direct serve from R2 (not optimized, but 100% reliable)
            const object = await bucket.get(key);
            if (!object) return notFound('File not found');

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            const origin = request.headers.get('Origin') || '';
            const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
            headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);
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
                const isHeicExt = ['heic', 'heif'].includes(fileExt);

                const isImageMime = file.type && file.type.startsWith('image/');
                const isOctetStream = file.type === 'application/octet-stream';
                const isAllowed = isImageMime || ALLOWED_EXTENSIONS.includes(fileExt) || isOctetStream;

                if (!isAllowed) {
                    throw new Error('Only image files are allowed');
                }

                const buffer = await file.arrayBuffer();
                if (buffer.byteLength > MAX_SIZE) {
                    throw new Error('File too large. Max 10MB');
                }

                let ext = 'jpeg';
                if (ALLOWED_EXTENSIONS.includes(fileExt)) {
                    ext = fileExt;
                } else if (file.type && file.type.startsWith('image/')) {
                    const parts = file.type.split('/');
                    const sub = parts[1] || '';
                    ext = sub.split('+')[0] || 'jpeg';
                } else if (isHeicExt) {
                    ext = fileExt;
                }

                // Temporary key to upload the raw file
                const tempKey = `temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const contentType = isHeicExt ? `image/${ext}` : (file.type || `image/${ext}`);

                await bucket.put(tempKey, buffer, {
                    httpMetadata: { contentType },
                });

                let finalBuffer = buffer;
                let finalExt = ext;
                let finalContentType = contentType;
                let converted = false;

                const baseUrl = new URL(request.url).origin;
                const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('::1');

                // Try to convert to AVIF using Cloudflare Image Resizing in production
                if (!isLocal && env.R2_PUBLIC_URL) {
                    try {
                        const tempUrl = `${env.R2_PUBLIC_URL}/${tempKey}`;
                        const resizeOptions = {
                            cf: {
                                image: {
                                    format: 'avif',
                                    quality: 85,
                                }
                            }
                        };
                        const optimizedRes = await fetch(tempUrl, resizeOptions);
                        if (optimizedRes.ok) {
                            finalBuffer = await optimizedRes.arrayBuffer();
                            finalExt = 'avif';
                            finalContentType = 'image/avif';
                            converted = true;
                        }
                    } catch (resizeErr) {
                        console.warn('Cloudflare Resizing during upload failed, falling back to original:', resizeErr);
                    }
                }

                const finalKey = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${finalExt}`;
                await bucket.put(finalKey, finalBuffer, {
                    httpMetadata: { contentType: finalContentType },
                });

                // Asynchronously delete the temporary file from R2
                if (ctx && typeof ctx.waitUntil === 'function') {
                    ctx.waitUntil(bucket.delete(tempKey).catch(err => console.error('Delete temp file failed:', err)));
                } else {
                    await bucket.delete(tempKey);
                }

                const publicUrl = `${env.R2_PUBLIC_URL}/${finalKey}`;

                // Pre-warm the Cloudflare edge cache for WebP and AVIF formats asynchronously (only in production)
                if (!isLocal && ctx && typeof ctx.waitUntil === 'function') {
                    ctx.waitUntil((async () => {
                        try {
                            const proxyUrl = `${baseUrl}/api/upload?key=${encodeURIComponent(finalKey)}`;
                            
                            // Send request asserting WebP support
                            await fetch(proxyUrl, {
                                headers: { 'Accept': 'image/webp', 'User-Agent': 'Cloudflare-Cache-Warmer' }
                            });
                            
                            // Send request asserting AVIF support
                            await fetch(proxyUrl, {
                                headers: { 'Accept': 'image/avif', 'User-Agent': 'Cloudflare-Cache-Warmer' }
                            });
                        } catch (warmerErr) {
                            console.warn('Cache pre-warming failed:', warmerErr);
                        }
                    })());
                }

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