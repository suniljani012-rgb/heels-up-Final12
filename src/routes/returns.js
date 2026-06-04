// ============================================================
// HeelsUp — Exchanges Admin & Customer Routes
// Under the hood, this replaces Returns with Exchanges
// ============================================================

import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { ok, list, created, error, notFound, serverError } from '../utils/response.js';

export async function returnsAdminRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin/returns', '') || '/';
    const method = request.method;

    const { user, error: authError } = await requireAdmin(request, env);
    if (authError) return authError;

    // ── GET /api/admin/returns — list all exchange requests ──────
    if (path === '/' && method === 'GET') {
        try {
            const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
            const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20'));
            const offset = (page - 1) * limit;
            const status = url.searchParams.get('status'); // pending|approved|rejected|completed

            let sql = `
                SELECT r.*,
                       o.order_number,
                       u.first_name || ' ' || COALESCE(u.last_name, '') as customer_name,
                       u.email as customer_email,
                       u.phone as customer_phone
                FROM exchanges r
                JOIN orders  o ON o.id = r.order_id
                JOIN users   u ON u.id = r.user_id
            `;
            const params = [];
            if (status) { sql += ' WHERE r.status = ?'; params.push(status); }
            sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const rows = await env.DB.prepare(sql).bind(...params).all();
            const countR = await env.DB.prepare(
                status
                    ? 'SELECT COUNT(*) as n FROM exchanges WHERE status = ?'
                    : 'SELECT COUNT(*) as n FROM exchanges'
            ).bind(...(status ? [status] : [])).first();

            return list(rows.results, { page, limit, total: countR?.n || 0 });
        } catch (e) {
            console.error('Fetch exchanges error:', e);
            return serverError('Failed to fetch exchanges');
        }
    }

    // ── GET /api/admin/returns/:id ─────────────────────────────
    if (path.match(/^\/\d+$/) && method === 'GET') {
        const id = path.slice(1);
        const ret = await env.DB.prepare(`
            SELECT r.*,
                   o.order_number, o.total_amount as order_total,
                   u.first_name || ' ' || COALESCE(u.last_name, '') as customer_name, u.email as customer_email
            FROM exchanges r
            JOIN orders o ON o.id = r.order_id
            JOIN users  u ON u.id = r.user_id
            WHERE r.id = ?
        `).bind(id).first();
        if (!ret) return notFound('Exchange request not found');

        // Fetch items
        const items = await env.DB.prepare(`
            SELECT ri.*, p.name as product_name, p.sku
            FROM exchange_items ri
            JOIN products p ON p.id = ri.product_id
            WHERE ri.exchange_id = ?
        `).bind(id).all();

        return ok({ ...ret, items: items.results });
    }

    // ── PATCH /api/admin/returns/:id/status — approve/reject ───
    if (path.match(/^\/\d+\/status$/) && method === 'PATCH') {
        const id = path.match(/(\d+)/)[1];
        try {
            const { status, admin_note } = await request.json();
            const allowed = ['pending', 'approved', 'rejected', 'completed'];
            if (!allowed.includes(status)) return error('Invalid status');

            const existing = await env.DB.prepare('SELECT id FROM exchanges WHERE id = ?').bind(id).first();
            if (!existing) return notFound('Exchange request not found');

            await env.DB.prepare(`
                UPDATE exchanges SET
                    status        = ?,
                    admin_notes   = COALESCE(?, admin_notes),
                    updated_at    = datetime('now')
                WHERE id = ?
            `).bind(
                status,
                admin_note || null,
                id
            ).run();

            return ok(null, `Exchange request ${status}`);
        } catch (e) {
            console.error('Update exchange status error:', e);
            return serverError('Failed to update exchange status');
        }
    }

    // ── GET /api/admin/returns/stats — quick stats ─────────────
    if (path === '/stats' && method === 'GET') {
        try {
            const stats = await env.DB.prepare(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status='approved'  THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status='rejected'  THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
                FROM exchanges
            `).first();
            return ok(stats);
        } catch (e) {
            return serverError('Failed to fetch stats');
        }
    }

    return error('Route not found', 404);
}

// ── Customer-facing exchange submission ─────────────────────────
export async function returnsCustomerRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/returns', '') || '/';
    const method = request.method;

    // POST /api/returns — submit exchange request
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAuth(request, env);
        if (authError) return authError;

        try {
            const { order_id, reason, description = '', items = [] } = await request.json();
            if (!order_id || !reason) return error('order_id and reason are required');

            // Verify order belongs to customer
            const order = await env.DB.prepare(
                "SELECT id FROM orders WHERE id = ? AND user_id = ? AND order_status = 'delivered'"
            ).bind(order_id, user.id).first();
            if (!order) return error('Order not eligible for exchange');

            // Check no existing active exchange for this order
            const existing = await env.DB.prepare(
                "SELECT id FROM exchanges WHERE order_id = ? AND status NOT IN ('rejected')"
            ).bind(order_id).first();
            if (existing) return error('An exchange request already exists for this order');

            const result = await env.DB.prepare(`
                INSERT INTO exchanges (order_id, user_id, reason, description, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
                RETURNING *
            `).bind(order_id, user.id, reason, description).first();

            // Save exchange items
            for (const item of items) {
                await env.DB.prepare(
                    'INSERT INTO exchange_items (exchange_id, product_id, size, color, qty, reason) VALUES (?, ?, ?, ?, ?, ?)'
                ).bind(result.id, item.product_id, item.size || null, item.color || null, item.qty || 1, item.reason || reason).run();
            }

            return created(result, 'Exchange request submitted');
        } catch (e) {
            console.error('Exchange submit error:', e);
            return serverError('Failed to submit exchange request');
        }
    }

    // GET /api/returns — customer's own exchanges
    if (path === '/' && method === 'GET') {
        const { user, error: authError } = await requireAuth(request, env);
        if (authError) return authError;

        const returns = await env.DB.prepare(`
            SELECT r.*, o.order_number FROM exchanges r
            JOIN orders o ON o.id = r.order_id
            WHERE r.user_id = ? ORDER BY r.created_at DESC
        `).bind(user.id).all();
        return list(returns.results);
    }

    return error('Route not found', 404);
}