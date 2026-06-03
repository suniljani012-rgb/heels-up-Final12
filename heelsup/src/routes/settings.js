// worker/src/routes/settings.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, error, serverError } from '../utils/response.js';

// Keys that are safe to expose publicly (non-sensitive)
const PUBLIC_SETTING_KEYS = new Set([
    'store_name', 'site_name', 'store_phone', 'store_address', 'store_email',
    'store_city', 'store_state', 'store_country',
    'currency', 'currency_symbol',
    'free_delivery_threshold', 'delivery_charge_free_above', 'delivery_charge',
    'min_order_value',
    'return_policy', 'exchange_window_days',
    'social_instagram', 'social_facebook', 'social_pinterest',
    'footer_tagline', 'store_logo',
    'cod_enabled', 'online_payment_only',
    'gst_registered', 'gst_number',
    'invoice_prefix',
    'google_client_id',   // public OAuth client ID is fine to expose
]);

export async function settingsRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/settings', '') || '/';
    const method = request.method;

    // GET /api/settings/public — filtered public settings (no auth required)
    if (path === '/public' && method === 'GET') {
        try {
            const rows = await env.DB.prepare('SELECT key, value FROM settings').all();
            const settings = {};
            for (const row of (rows.results || [])) {
                if (PUBLIC_SETTING_KEYS.has(row.key)) {
                    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
                }
            }
            return ok(settings);
        } catch (e) { return serverError('Failed to fetch public settings'); }
    }

    // GET /api/settings — admin only: ALL settings
    if (path === '/' && method === 'GET') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const rows = await env.DB.prepare('SELECT key, value FROM settings').all();
            const settings = {};
            for (const row of (rows.results || [])) {
                try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
            }
            return ok(settings);
        } catch (e) { return serverError('Failed to fetch settings'); }
    }

    // PUT /api/settings — admin update (partial merge)
    if (path === '/' && method === 'PUT') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            // Save each key individually using upsert
            const updates = Object.entries(body || {});
            if (!updates.length) return error('No settings provided', 400);

            for (const [key, value] of updates) {
                let serializedValue;
                if (typeof value === 'object' && value !== null) {
                    serializedValue = JSON.stringify(value);
                } else {
                    serializedValue = String(value);
                }
                await env.DB.prepare(
                    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
                ).bind(key, serializedValue).run();
            }
            return ok(null, 'Settings updated');
        } catch (e) { return serverError('Failed to update settings'); }
    }

    return error('Route not found', 404);
}