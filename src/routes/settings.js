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
    'support_phone', 'site_email', 'shipping_free_above', 'shipping_standard_charge',
    'offer_title', 'offer_description', 'offer_hours', 'offer_minutes', 'offer_seconds'
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
            const rows = await env.DB.prepare('SELECT key, value, description FROM settings').all();
            const listData = (rows.results || []).map(row => {
                let parsedVal;
                try { parsedVal = JSON.parse(row.value); } catch { parsedVal = row.value; }
                return {
                    key: row.key,
                    value: parsedVal,
                    description: row.description || row.key
                };
            });
            return ok(listData);
        } catch (e) { return serverError('Failed to fetch settings'); }
    }

    // PUT /api/settings — admin update (partial merge or list update)
    if (path === '/' && method === 'PUT') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            let updates = [];
            
            if (body && Array.isArray(body.settings)) {
                updates = body.settings;
            } else if (body && Array.isArray(body)) {
                updates = body;
            } else if (body) {
                updates = Object.entries(body).map(([key, value]) => ({ key, value }));
            }

            if (!updates.length) return error('No settings provided', 400);

            for (const item of updates) {
                if (!item || !item.key) continue;
                const key = item.key;
                const value = item.value;
                let serializedValue;
                if (typeof value === 'object' && value !== null) {
                    serializedValue = JSON.stringify(value);
                } else {
                    serializedValue = String(value);
                }
                await env.DB.run(
                    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    key, serializedValue
                );
            }
            return ok(null, 'Settings updated');
        } catch (e) { return serverError('Failed to update settings'); }
    }

    // POST /api/settings/test/otp
    if (path === '/test/otp' && method === 'POST') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            const url = body?.otp_script_url;
            if (!url) return error('Script URL is required', 400);

            const siteName = 'HeelsUp Test';
            const testEmail = 'support@heelsup.in';
            const otp = '123456';

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: testEmail,
                    subject: `Test OTP from ${siteName}`,
                    message: `This is a test OTP: ${otp}`,
                    html: `<h3>Test Mail</h3><p>Your test OTP code is <b>${otp}</b></p>`
                })
            });

            if (!res.ok) {
                return error(`Apps Script returned status ${res.status}`, 400);
            }
            return ok(null, 'Test OTP sent successfully');
        } catch (e) {
            return error(e.message || 'Mailer test failed', 500);
        }
    }

    // POST /api/settings/test/razorpay
    if (path === '/test/razorpay' && method === 'POST') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            const keyId = body?.razorpay_key_id;
            const secret = body?.razorpay_key_secret;
            if (!keyId || !secret) return error('Key ID and Secret are required', 400);

            const authString = btoa(`${keyId}:${secret}`);
            const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
                headers: {
                    'Authorization': `Basic ${authString}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                return error(errorData?.error?.description || `Razorpay returned status ${res.status}`, 400);
            }
            return ok(null, 'Razorpay credentials verified');
        } catch (e) {
            return error(e.message || 'Razorpay connection test failed', 500);
        }
    }

    return error('Route not found', 404);
}