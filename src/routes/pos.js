// worker/src/routes/pos.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

async function genOrderNumber(env) {
    const today = new Date();
    const prefix = `HU-OFL-${today.getUTCFullYear()}`;
    const row = await env.DB.prepare("SELECT COUNT(*) as c FROM offline_sales WHERE sale_number LIKE ?").bind(`${prefix}%`).first();
    const seq = String((row?.c || 0) + 1).padStart(4, "0");
    return `${prefix}${seq}`;
}

export async function posRouter(request, env) {
    const url = new URL(request.url);
    // Support both /api/admin/pos and /api/pos namespaces
    const path = url.pathname.replace('/api/admin/pos', '').replace('/api/pos', '') || '/';
    const method = request.method;

    // POST /api/pos/sale — create POS/offline sale
    if (path === '/sale' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const { customer_name, customer_phone, items, payment_method, discount, notes, created_at } = await request.json();
            if (!items || items.length === 0) return error('No items in sale');

            // Find staff entry mapping to logged-in user (admin/staff/manager)
            let servedByStaffId = null;
            const staffRow = await env.DB.prepare("SELECT id FROM staff WHERE user_id = ?").bind(user.id).first();
            if (staffRow) {
                servedByStaffId = staffRow.id;
            }

            let subtotal = 0;
            const processedItems = [];

            for (const item of items) {
                const product = await env.DB.prepare(
                    'SELECT id, name, sku, price, stock FROM products WHERE id = ? AND active = 1'
                ).bind(item.product_id).first();
                if (!product) return error(`Product ${item.product_id} not found`);

                const unitPrice = item.unit_price || product.price; // in Rupees/Paise (as stored)
                const qty = item.quantity || item.qty || 1;
                const totalPrice = unitPrice * qty;
                subtotal += totalPrice;

                processedItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    product_code: product.sku || '',
                    color: item.color || '',
                    size: item.size || 'Default',
                    quantity: qty,
                    unit_price: unitPrice,
                    total_price: totalPrice
                });
            }

            const discountAmt = discount || 0;
            const total = subtotal - discountAmt;
            const saleNumber = await genOrderNumber(env);
            const itemsJson = JSON.stringify(processedItems);

            // Format timestamp matching SQLite datetime
            const rawDate = created_at || new Date().toISOString();
            const finalCreatedAt = rawDate.replace('T', ' ').substring(0, 19);

            // Insert offline_sales matching remote schema
            const saleRes = await env.DB.prepare(`
                INSERT INTO offline_sales (
                    sale_number, customer_name, customer_phone, items_json,
                    subtotal, discount, total, payment_method, notes,
                    created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                saleNumber, customer_name || 'Walk-in', customer_phone || null, itemsJson,
                subtotal, discountAmt, total, payment_method || 'Cash', notes || null,
                user.id, finalCreatedAt
            ).run();

            const saleId = saleRes.meta?.last_row_id;

            // Insert items and adjust stock
            for (const item of processedItems) {
                await env.DB.prepare(`
                    INSERT INTO offline_sale_items (
                        sale_id, product_id, product_code, product_name, color, size, quantity, unit_price, total_price
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    saleId, item.product_id, item.product_code, item.product_name,
                    item.color, item.size, item.quantity, item.unit_price, item.total_price
                ).run();

                // Deduct size-specific stock if available
                if (item.size) {
                    const row = await env.DB.prepare(
                        "SELECT stock FROM product_size_stock WHERE product_id=? AND size_label=?"
                    ).bind(item.product_id, item.size).first();
                    if (row) {
                        const newStock = Math.max(0, (row.stock || 0) - item.quantity);
                        await env.DB.prepare(
                            "UPDATE product_size_stock SET stock=?, updated_at=datetime('now') WHERE product_id=? AND size_label=?"
                        ).bind(newStock, item.product_id, item.size).run();
                    }
                }

                // Deduct global stock
                const prod = await env.DB.prepare("SELECT stock, name FROM products WHERE id=?").bind(item.product_id).first();
                const beforeStock = prod ? prod.stock : 0;
                const afterStock = Math.max(0, beforeStock - item.quantity);

                await env.DB.prepare(
                    "UPDATE products SET stock=?, sold_count=COALESCE(sold_count,0)+?, updated_at=datetime('now') WHERE id=?"
                ).bind(afterStock, item.quantity, item.product_id).run();

                // Log inventory change
                try {
                    await env.DB.prepare(
                        "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'sale', ?, ?, ?, ?, datetime('now'))"
                    ).bind(item.product_id, prod ? prod.name : 'Unknown Product', beforeStock, -item.quantity, afterStock, `POS sale: Bill ${saleNumber}`).run();
                } catch (_) { /* log non-critical */ }
            }

            return created({ bill_number: saleNumber, sale_id: saleId, total }, 'POS sale recorded');
        } catch (e) {
            console.error('POS sale error:', e);
            return serverError('Failed to record sale');
        }
    }

    // GET /api/pos/sales — recent POS sales
    if (path === '/sales' && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const all = url.searchParams.get('all') === 'true';
            const limit = all ? 1000 : parseInt(url.searchParams.get('limit') || '100');
            const sales = await env.DB.prepare(
                `SELECT * FROM offline_sales ORDER BY id DESC LIMIT ${limit}`
            ).all();
            return list(sales.results || []);
        } catch (e) {
            console.error('Fetch POS sales error:', e);
            return serverError('Failed to fetch sales');
        }
    }

    // GET /api/pos/:id — get specific offline sale details with items
    if (path.match(/^\/\d+$/) && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            const sale = await env.DB.prepare('SELECT * FROM offline_sales WHERE id = ?').bind(id).first();
            if (!sale) return error('Sale not found', 404);
            const items = await env.DB.prepare('SELECT * FROM offline_sale_items WHERE sale_id = ?').bind(id).all();
            sale.items = items.results || [];
            return ok(sale);
        } catch (e) {
            console.error('Fetch POS sale details error:', e);
            return serverError('Failed to fetch sale details');
        }
    }

    return error('Route not found', 404);
}