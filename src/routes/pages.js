// ============================================================
// HeelsUp — Static Pages Admin Routes
// /api/admin/pages/*
// Custom pages like About, FAQ, Terms, Privacy etc.
// ============================================================

import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, notFound, serverError } from '../utils/response.js';

function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function pagesAdminRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin/pages', '') || '/';
    const method = request.method;

    const { user, error: authError } = await requireAdmin(request, env);
    if (authError) return authError;

    // ── GET /api/admin/pages — list all pages ──────────────────
    if (path === '/' && method === 'GET') {
        try {
            const pages = await env.DB.prepare(
                'SELECT id, title, slug, active, updated_at FROM pages ORDER BY title ASC'
            ).all();
            return list(pages.results);
        } catch (e) { return serverError('Failed to fetch pages'); }
    }

    // ── GET /api/admin/pages/:id ───────────────────────────────
    if (path.match(/^\/\d+$/) && method === 'GET') {
        const id = path.slice(1);
        const page = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first();
        if (!page) return notFound('Page not found');
        return ok(page);
    }

    // ── POST /api/admin/pages — create page ───────────────────
    if (path === '/' && method === 'POST') {
        try {
            const body = await request.json();
            const {
                title, content, slug: customSlug,
                active = 1, status,
                meta_title, meta_desc, meta_description
            } = body;

            if (!title || !content) return error('Title and content are required');
            const slug = customSlug ? slugify(customSlug) : slugify(title);

            // Check slug uniqueness
            const exists = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(slug).first();
            if (exists) return error('A page with this title already exists');

            const activeVal = active !== undefined ? (active ? 1 : 0) : (status === 'draft' ? 0 : 1);
            const metaDescriptionVal = meta_description !== undefined ? meta_description : (meta_desc || null);

            const result = await env.DB.prepare(`
                INSERT INTO pages
                    (title, slug, content,
                     meta_title, meta_description, active,
                     created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                RETURNING *
            `).bind(
                title, slug, content,
                meta_title || title, metaDescriptionVal, activeVal
            ).first();

            return created(result, 'Page created');
        } catch (e) {
            console.error('Page create error:', e);
            return serverError('Failed to create page');
        }
    }

    // ── PUT /api/admin/pages/:id — update page ─────────────────
    if (path.match(/^\/\d+$/) && method === 'PUT') {
        const id = path.slice(1);
        try {
            const existing = await env.DB.prepare('SELECT id FROM pages WHERE id = ?').bind(id).first();
            if (!existing) return notFound('Page not found');

            const {
                title, content, active, status,
                meta_title, meta_desc, meta_description
            } = await request.json();

            let activeVal = null;
            if (active !== undefined) {
                activeVal = active ? 1 : 0;
            } else if (status !== undefined) {
                activeVal = status === 'published' ? 1 : 0;
            }

            const metaDescriptionVal = meta_description !== undefined ? meta_description : (meta_desc !== undefined ? meta_desc : null);

            await env.DB.prepare(`
                UPDATE pages SET
                    title            = COALESCE(?, title),
                    content          = COALESCE(?, content),
                    meta_title       = COALESCE(?, meta_title),
                    meta_description = COALESCE(?, meta_description),
                    active           = COALESCE(?, active),
                    updated_at       = datetime('now')
                WHERE id = ?
            `).bind(
                title || null, content || null,
                meta_title || null, metaDescriptionVal, activeVal,
                id
            ).run();

            const updated = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first();
            return ok(updated, 'Page updated');
        } catch (e) { return serverError('Failed to update page'); }
    }

    // ── PATCH /api/admin/pages/:id/status ─────────────────────
    if (path.match(/^\/\d+\/status$/) && method === 'PATCH') {
        const id = path.match(/(\d+)/)[1];
        const { status, active } = await request.json();
        let activeVal = 1;
        if (active !== undefined) {
            activeVal = active ? 1 : 0;
        } else if (status !== undefined) {
            activeVal = status === 'published' ? 1 : 0;
        }
        await env.DB.prepare(
            "UPDATE pages SET active = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(activeVal, id).run();
        return ok(null, 'Page status updated');
    }

    // ── DELETE /api/admin/pages/:id ────────────────────────────
    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const id = path.slice(1);
        const existing = await env.DB.prepare('SELECT id FROM pages WHERE id = ?').bind(id).first();
        if (!existing) return notFound('Page not found');
        await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(id).run();
        return ok(null, 'Page deleted');
    }

    return error('Route not found', 404);
}

// ── Public pages route ────────────────────────────────────────
export async function pagesPublicRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/pages', '') || '/';
    const method = request.method;

    if (path === '/' && method === 'GET') {
        const pages = await env.DB.prepare(
            "SELECT id, title, slug FROM pages WHERE active = 1"
        ).all();
        return list(pages.results);
    }

    if (path.match(/^\/[a-z0-9-]+$/) && method === 'GET') {
        const slug = path.slice(1);
        const page = await env.DB.prepare(
            "SELECT * FROM pages WHERE slug = ? AND active = 1"
        ).bind(slug).first();
        if (!page) return error('Page not found', 404);
        return ok(page);
    }

    return error('Route not found', 404);
}