// worker/src/routes/upload.js
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { ok, error, serverError, notFound } from '../utils/response.js';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB raw input (client converts to WebP first; raw HEIC can be large)
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
            const isHeic = key.toLowerCase().endsWith('.heic') || key.toLowerCase().endsWith('.heif');

            // If the environment has R2_PUBLIC_URL and accepts modern formats (or the file is HEIC which must be converted to be renderable)
            if (env.R2_PUBLIC_URL && (supportsWebp || supportsAvif || isHeic)) {
                const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
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
                const isHeicExt = ['heic', 'heif'].includes(fileExt); // includes HEIF variant

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

                const contentType = isHeicExt ? `image/${ext}` : (file.type || `image/${ext}`);
                const finalKey = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

                await bucket.put(finalKey, buffer, {
                    httpMetadata: { contentType },
                });

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