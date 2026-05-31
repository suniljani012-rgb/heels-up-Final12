// worker/src/routes/pos.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

async function genOrderNumber(env) {
    const today = new Date();
    const prefix = `HU-OFL-${today.getUTCFullYear()}`;
    const row = await env.DB.prepare("SELECT COUNT(*) as c FROM offline_sales WHERE bill_number LIKE ?").bind(`${prefix}%`).first();
    const seq = String((row?.c || 0) + 1).padStart(4, "0");
    return `${prefix}${seq}`;
}