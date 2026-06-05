// worker/src/routes/upload.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, error, serverError } from '../utils/response.js';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'application/octet-stream'
];

export async function uploadRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/upload', '') || '/';
    const method = request.method;

    // POST /api/upload — upload image to R2
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const formData = await request.formData();
            const file = formData.get('file');
            if (!file) return error('No file provided');

            const fileName = file.name || '';
            const fileExt = fileName.split('.').pop().toLowerCase();
            const isHeicExt = ['heic', 'heif'].includes(fileExt);

            let isAllowed = ALLOWED_TYPES.includes(file.type);
            if (file.type === 'application/octet-stream' && !isHeicExt) {
                isAllowed = false;
            }

            if (!isAllowed && !isHeicExt) {
                return error('Only JPEG, PNG, WebP, GIF, HEIC, HEIF allowed');
            }

            const buffer = await file.arrayBuffer();
            if (buffer.byteLength > MAX_SIZE) return error('File too large. Max 10MB');

            const ext = isHeicExt ? fileExt : (file.type.split('/')[1] || 'jpeg');
            const key = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const bucket = env.MEDIA || env.BUCKET;
            if (!bucket) return error('R2 bucket binding (MEDIA) not found', 500);

            // Map content type for HEIC correctly
            const contentType = isHeicExt ? `image/${ext}` : file.type;

            await bucket.put(key, buffer, {
                httpMetadata: { contentType },
            });
            const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
            return ok({ url: publicUrl, key }, 'File uploaded');
        } catch (e) {
            console.error('Upload error:', e);
            return serverError('Upload failed');
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