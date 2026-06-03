// worker/src/routes/banners.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

export async function bannersRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/banners', '') || '/';
    const method = request.method;

    // GET /api/banners
    if (path === '/' && method === 'GET') {
        try {
            const sql = 'SELECT * FROM banners WHERE active = 1 ORDER BY sort_order ASC, id DESC';
            const banners = await env.DB.prepare(sql).all();
            return list(banners.results);
        } catch (e) { return serverError('Failed to fetch banners'); }
    }

    // GET /api/banners/admin/all
    if (path === '/admin/all' && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const banners = await env.DB.prepare('SELECT * FROM banners ORDER BY sort_order ASC').all();
        return list(banners.results);
    }

    // POST /api/banners
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const { title, subtitle, image_url, link, link_url, sort_order, active } = await request.json();
            if (!image_url) return error('image_url required');
            const bannerLink = link !== undefined ? link : (link_url || '');
            const result = await env.DB.prepare(
                'INSERT INTO banners (title, subtitle, image_url, link, sort_order, active, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\')) RETURNING *'
            ).bind(title || '', subtitle || '', image_url, bannerLink, sort_order || 0, active !== undefined ? (active ? 1 : 0) : 1).first();
            return created(result, 'Banner created');
        } catch (e) { return serverError('Failed to create banner'); }
    }

    // PUT /api/banners/:id
    if (path.match(/^\/\d+$/) && method === 'PUT') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            const b = await request.json();
            const activeVal = b.active !== undefined ? b.active : b.is_active;
            const bannerLink = b.link !== undefined ? b.link : (b.link_url || '');
            await env.DB.prepare(
                'UPDATE banners SET title=?, subtitle=?, image_url=?, link=?, active=?, sort_order=? WHERE id=?'
            ).bind(b.title || '', b.subtitle || '', b.image_url, bannerLink, activeVal ? 1 : 0, b.sort_order || 0, id).run();
            return ok(null, 'Banner updated');
        } catch (e) { return serverError('Failed to update banner'); }
    }

    // DELETE /api/banners/:id
    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        await env.DB.prepare('DELETE FROM banners WHERE id = ?').bind(path.slice(1)).run();
        return ok(null, 'Banner deleted');
    }

    return error('Route not found', 404);
}