// ============================================================
// HeelsUp — Tax Rules & Settings Admin Routes
// /api/admin/taxes/*
// ============================================================

import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, notFound, serverError } from '../utils/response.js';

export async function taxesAdminRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin/taxes', '') || '/';
    const method = request.method;

    const { user, error: authError } = await requireAdmin(request, env);
    if (authError) return authError;

    // ═══════════════════════════════════════════════════════════
    // TAX SETTINGS  — /api/admin/taxes/settings
    // ═══════════════════════════════════════════════════════════

    // ── GET /api/admin/taxes/settings ─────────────────────────
    if (path === '/settings' && method === 'GET') {
        try {
            const row = await env.DB.prepare(
                "SELECT value FROM settings WHERE key = 'tax_settings'"
            ).first();
            const defaults = {
                tax_inclusive: false,
                default_tax_class: 'standard',
                prices_include_tax: false,
                display_prices_in_shop: 'excl',
                display_prices_in_cart: 'incl',
                tax_round_at_subtotal: false,
                shipping_tax_class: 'standard',
            };
            const settings = row ? { ...defaults, ...JSON.parse(row.value) } : defaults;
            return ok(settings);
        } catch (e) { return serverError('Failed to fetch tax settings'); }
    }

    // ── PUT /api/admin/taxes/settings ─────────────────────────
    if (path === '/settings' && method === 'PUT') {
        try {
            const body = await request.json();
            const current = await env.DB.prepare(
                "SELECT value FROM settings WHERE key = 'tax_settings'"
            ).first();
            const merged = { ...(current ? JSON.parse(current.value) : {}), ...body };

            await env.DB.prepare(`
                INSERT INTO settings (key, value, updated_at)
                VALUES ('tax_settings', ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            `).bind(JSON.stringify(merged)).run();

            return ok(merged, 'Tax settings saved');
        } catch (e) { return serverError('Failed to save tax settings'); }
    }

    // ═══════════════════════════════════════════════════════════
    // TAX RULES  — /api/admin/taxes/rules/*
    // ═══════════════════════════════════════════════════════════

    // ── GET /api/admin/taxes/rules ─────────────────────────────
    if (path === '/rules' && method === 'GET') {
        try {
            const tax_class = url.searchParams.get('tax_class') || url.searchParams.get('category');
            let sql = 'SELECT * FROM tax_rules';
            const params = [];
            if (tax_class) { sql += ' WHERE category = ?'; params.push(tax_class); }
            sql += ' ORDER BY created_at DESC';

            const rows = await env.DB.prepare(sql).bind(...params).all();
            return list(rows.results);
        } catch (e) { return serverError('Failed to fetch tax rules'); }
    }

    // ── POST /api/admin/taxes/rules — create rule ──────────────
    if (path === '/rules' && method === 'POST') {
        try {
            const {
                tax_class,
                category,
                country = 'IN',
                state = '*',
                rate,           // e.g. 18.00 (percentage)
                name,           // e.g. "GST 18%"
                type = 'percentage',
                active = 1,
                hsn_code,
                condition_type,
                condition_amount,
                notes
            } = await request.json();

            if (!rate || !name) return error('Rate and name are required');
            if (rate < 0 || rate > 100) return error('Rate must be 0–100');

            const ruleCategory = category || tax_class || 'standard';

            const result = await env.DB.prepare(`
                INSERT INTO tax_rules
                    (name, type, rate, country, state, category, active, hsn_code, condition_type, condition_amount, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                RETURNING *
            `).bind(
                name, type, parseFloat(rate), country, state, ruleCategory,
                active !== undefined ? (active ? 1 : 0) : 1,
                hsn_code || null, condition_type || null,
                condition_amount !== undefined ? parseFloat(condition_amount) : null,
                notes || null
            ).first();

            return created(result, 'Tax rule created');
        } catch (e) {
            console.error('Tax rule create error:', e);
            return serverError('Failed to create tax rule');
        }
    }

    // ── PUT /api/admin/taxes/rules/:id — update ────────────────
    if (path.match(/^\/rules\/\d+$/) && method === 'PUT') {
        const id = path.match(/(\d+)/)[1];
        try {
            const existing = await env.DB.prepare('SELECT id FROM tax_rules WHERE id = ?').bind(id).first();
            if (!existing) return notFound('Tax rule not found');

            const {
                tax_class, category, country, state, rate, name, type, active,
                hsn_code, condition_type, condition_amount, notes
            } = await request.json();

            const ruleCategory = category || tax_class || null;
            let activeVal = null;
            if (active !== undefined) {
                activeVal = active ? 1 : 0;
            }

            await env.DB.prepare(`
                UPDATE tax_rules SET
                    name             = COALESCE(?, name),
                    type             = COALESCE(?, type),
                    rate             = COALESCE(?, rate),
                    country          = COALESCE(?, country),
                    state            = COALESCE(?, state),
                    category         = COALESCE(?, category),
                    active           = COALESCE(?, active),
                    hsn_code         = COALESCE(?, hsn_code),
                    condition_type   = COALESCE(?, condition_type),
                    condition_amount = COALESCE(?, condition_amount),
                    notes            = COALESCE(?, notes),
                    updated_at       = datetime('now')
                WHERE id = ?
            `).bind(
                name || null,
                type || null,
                rate !== undefined ? parseFloat(rate) : null,
                country || null,
                state || null,
                ruleCategory,
                activeVal,
                hsn_code || null,
                condition_type || null,
                condition_amount !== undefined ? parseFloat(condition_amount) : null,
                notes || null,
                id
            ).run();

            const updated = await env.DB.prepare('SELECT * FROM tax_rules WHERE id = ?').bind(id).first();
            return ok(updated, 'Tax rule updated');
        } catch (e) { return serverError('Failed to update tax rule'); }
    }

    // ── DELETE /api/admin/taxes/rules/:id ──────────────────────
    if (path.match(/^\/rules\/\d+$/) && method === 'DELETE') {
        const id = path.match(/(\d+)/)[1];
        const existing = await env.DB.prepare('SELECT id FROM tax_rules WHERE id = ?').bind(id).first();
        if (!existing) return notFound('Tax rule not found');
        await env.DB.prepare('DELETE FROM tax_rules WHERE id = ?').bind(id).run();
        return ok(null, 'Tax rule deleted');
    }

    // ── GET /api/admin/taxes/classes — list all tax classes ────
    if (path === '/classes' && method === 'GET') {
        // Standard GST classes for India
        const classes = [
            { id: 'zero', name: 'Zero Rate', rate: 0 },
            { id: 'standard', name: 'Standard GST', rate: 18 },
            { id: 'reduced', name: 'Reduced GST', rate: 5 },
            { id: 'luxury', name: 'Luxury GST', rate: 28 },
        ];
        return list(classes);
    }

    return error('Route not found', 404);
}