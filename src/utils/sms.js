// src/utils/sms.js

async function getSetting(env, key, fallback = '') {
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
        return row ? row.value : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Sends an SMS message using the Infobip API.
 * @param {object} env Cloudflare worker environment
 * @param {string} phone Recipient phone number (e.g. "7891470935" or "+917891470935")
 * @param {string} text Message content
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function sendInfobipSms(env, phone, text) {
    let apiBase = await getSetting(env, 'infobip_api_url', '');
    if (!apiBase && env.INFOBIP_API_BASE_URL) {
        apiBase = env.INFOBIP_API_BASE_URL;
    }
    if (!apiBase) {
        apiBase = 'eegg4r.api.infobip.com';
    }

    let apiKey = await getSetting(env, 'infobip_api_key', '');
    if (!apiKey && env.INFOBIP_API_KEY) {
        apiKey = env.INFOBIP_API_KEY;
    }

    if (!apiKey) {
        console.warn('[SMS] Infobip API Key is missing. SMS not sent:', text);
        return { ok: false, error: 'Infobip API Key not configured' };
    }

    let sender = await getSetting(env, 'infobip_sender', '');
    if (!sender && env.INFOBIP_SENDER) {
        sender = env.INFOBIP_SENDER;
    }
    if (!sender) {
        sender = 'HEELUP';
    }

    // Clean phone number: remove any non-digit characters
    let cleanedPhone = String(phone || '').replace(/\D/g, '');
    // If it's a 10-digit number, prepend India's country code 91
    if (cleanedPhone.length === 10) {
        cleanedPhone = '91' + cleanedPhone;
    }

    // Ensure API URL starts with protocol
    let apiUrl = apiBase.trim();
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = 'https://' + apiUrl;
    }
    // Append standard SMS advanced endpoint
    apiUrl = apiUrl.replace(/\/$/, '') + '/sms/2/text/advanced';

    try {
        console.log(`[SMS] Sending SMS to ${cleanedPhone} using Infobip API: "${text}"`);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `App ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        from: sender,
                        destinations: [
                            { to: cleanedPhone }
                        ],
                        text: text
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SMS] Infobip API returned error status:', response.status, errorText);
            return { ok: false, error: `Infobip API error: ${response.status} - ${errorText}` };
        }

        const data = await response.json();
        console.log('[SMS] Infobip SMS sent successfully. Response:', JSON.stringify(data));
        return { ok: true };
    } catch (e) {
        console.error('[SMS] Exception occurred during sending Infobip SMS:', e);
        return { ok: false, error: e.message };
    }
}
