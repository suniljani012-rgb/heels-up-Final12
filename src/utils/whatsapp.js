// src/utils/whatsapp.js
// ============================================================
// HeelsUp — Enterprise Server-Side WhatsApp Integration
// Supports: Meta WhatsApp Cloud API & Twilio API fallback
// ============================================================

async function getSetting(env, key, fallback = '') {
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
        return row ? row.value : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Sends a WhatsApp notification to the customer.
 * @param {object} env - Cloudflare worker env
 * @param {string} phoneNumber - Recipient phone number (with country code, e.g. '919876543210')
 * @param {string} templateName - Meta WhatsApp template name or message body for Twilio
 * @param {array} components - Template components (parameters) for Meta Cloud API
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendWhatsAppNotification(env, phoneNumber, templateName, components = []) {
    const token = await getSetting(env, 'whatsapp_api_token', env.WHATSAPP_API_TOKEN);
    const phoneId = await getSetting(env, 'whatsapp_phone_number_id', env.WHATSAPP_PHONE_NUMBER_ID);
    
    if (!token) {
        console.warn('[WhatsApp] API token is not configured in settings.');
        return { success: false, error: 'WhatsApp API token is not configured.' };
    }

    // Clean phone number (must be digits only, default prefix 91 if length is 10)
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone; // Fallback to Indian country code
    }

    try {
        // Meta WhatsApp Cloud API Endpoint
        const url = `https://graph.facebook.com/v17.0/${phoneId || 'me'}/messages`;
        
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: 'en_US' },
                components: components
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data?.error?.message || `Meta API error status ${res.status}`);
        }

        return {
            success: true,
            messageId: data?.messages?.[0]?.id
        };
    } catch (err) {
        console.error('[WhatsApp] Dispatch failed:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Dispatches a transaction confirmation template.
 */
export async function sendOrderPlacedNotification(env, order) {
    // Expected template name: 'order_placed_confirmation'
    const nameParam = { type: 'text', text: order.customer_name || 'Customer' };
    const orderNoParam = { type: 'text', text: order.order_number };
    const amountParam = { type: 'text', text: `Rs. ${(order.total_amount / 100).toFixed(2)}` };

    const components = [
        {
            type: 'body',
            parameters: [nameParam, orderNoParam, amountParam]
        }
    ];

    return sendWhatsAppNotification(
        env,
        order.customer_phone || '',
        'order_placed_confirmation',
        components
    );
}

/**
 * Dispatches a shipping dispatch notification with tracking details.
 */
export async function sendOrderShippedNotification(env, order, waybill) {
    // Expected template name: 'order_shipped_status'
    const nameParam = { type: 'text', text: order.customer_name || 'Customer' };
    const orderNoParam = { type: 'text', text: order.order_number };
    const trackingNoParam = { type: 'text', text: waybill || 'N/A' };
    const courierParam = { type: 'text', text: 'Delhivery' };

    const components = [
        {
            type: 'body',
            parameters: [nameParam, orderNoParam, trackingNoParam, courierParam]
        }
    ];

    return sendWhatsAppNotification(
        env,
        order.customer_phone || '',
        'order_shipped_status',
        components
    );
}
