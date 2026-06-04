// ============================================================
// HeelsUp — Razorpay Utility Helpers
// Cloudflare Workers runtime (NO Node.js crypto — use WebCrypto)
// ============================================================

async function getRazorpayCredentials(env) {
  let keyId = (env.RAZORPAY_KEY_ID || "").trim();
  let keySecret = (env.RAZORPAY_KEY_SECRET || "").trim();
  try {
    const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('razorpay_key_id', 'razorpay_key_secret')").all();
    for (const row of (rows.results || [])) {
      if (row.key === 'razorpay_key_id' && row.value) keyId = row.value.trim();
      if (row.key === 'razorpay_key_secret' && row.value) keySecret = row.value.trim();
    }
  } catch {}
  return { keyId, keySecret };
}

export const razorpay = {

  // ── Create a Razorpay Order ─────────────────────────────────
  // Returns: { id, amount, currency, receipt, status }
  async createOrder(env, { amount, currency = 'INR', receipt, notes = {} }) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    const credentials = btoa(`${keyId}:${keySecret}`);

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ amount, currency, receipt, notes }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Razorpay createOrder failed:', errBody);
      return {};
    }

    return res.json();
  },

  // ── Verify Payment Signature (HMAC-SHA256) ──────────────────
  // Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
  async verifySignature(env, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const { keySecret } = await getRazorpayCredentials(env);
    return _hmacVerify(keySecret, message, razorpay_signature);
  },

  // ── Verify Webhook Signature ────────────────────────────────
  // Razorpay signs the raw request body with webhook secret
  async verifyWebhook(env, rawBody, signature) {
    let secret = (env.RAZORPAY_WEBHOOK_SECRET || "").trim();
    try {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'razorpay_webhook_secret'").first();
      if (row && row.value) secret = row.value.trim();
    } catch {}
    return _hmacVerify(secret, rawBody, signature);
  },

  // ── Fetch a Razorpay Order (for admin/debugging) ────────────
  async fetchOrder(env, razorpayOrderId) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    const credentials = btoa(`${keyId}:${keySecret}`);
    const res = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    return res.ok ? res.json() : null;
  },

  // ── Fetch a Razorpay Payment ────────────────────────────────
  async fetchPayment(env, razorpayPaymentId) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    const credentials = btoa(`${keyId}:${keySecret}`);
    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    return res.ok ? res.json() : null;
  },

  // ── Initiate Refund ─────────────────────────────────────────
  async createRefund(env, razorpayPaymentId, amount = null, notes = {}) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    const credentials = btoa(`${keyId}:${keySecret}`);
    const body = { notes };
    if (amount) body.amount = amount; // partial refund in paise

    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    return res.ok ? res.json() : null;
  },
};

// ── Internal: HMAC-SHA256 using WebCrypto (Workers compatible) ──
async function _hmacVerify(secret, message, expectedHex) {
  try {
    const enc     = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature  = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hexSig     = Array.from(new Uint8Array(signature))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('');

    return hexSig === expectedHex;
  } catch {
    return false;
  }
}
