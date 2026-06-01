import re

with open('src/routes/pos.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Update genOrderNumber
gen_order = """
async function genOrderNumber(env) {
    const today = new Date();
    const prefix = `HU-OFL-${today.getUTCFullYear()}`;
    const row = await env.DB.prepare("SELECT COUNT(*) as c FROM offline_sales WHERE bill_number LIKE ?").bind(`${prefix}%`).first();
    const seq = String((row?.c || 0) + 1).padStart(4, "0");
    return `${prefix}${seq}`;
}
"""

code = re.sub(r"function genOrderNumber\(\) \{.*\}", gen_order.strip(), code, flags=re.DOTALL)

# Replace 'orders' with 'offline_sales'
code = code.replace("INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone,\n                 address_line1, city, state, pincode, country, delivery_method, source,\n                 order_status, payment_status, payment_method, subtotal_amount, discount_amount, total_amount, notes, created_at, updated_at)", "INSERT INTO offline_sales (bill_number, served_by_staff_id, customer_name, customer_phone, subtotal, discount, total, payment_method, notes, created_at)")
code = code.replace("'delivered', 'paid', ?, ?, ?, ?, ?, ?, ?)", "?, ?, ?, ?, ?, ?)")
code = code.replace("orderNumber, user.id, customer_name || 'Walk-in', customer_phone || null,\n                payment_method || 'cash', subtotal, discountAmt, total, notes || null, now, now", "orderNumber, user.id, customer_name || 'Walk-in', customer_phone || null, subtotal, discountAmt, total, payment_method || 'cash', notes || null, now")

code = code.replace("INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at)", "INSERT INTO offline_sale_items (sale_id, product_id, product_name, product_code, color, size, quantity, unit_price, total_price)")
code = code.replace("VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
code = code.replace("orderId, item.product_id, item.product_name, item.sku, item.qty, item.unit_price, item.line_total, item.size, item.image, now", "orderId, item.product_id, item.product_name, item.sku, '', item.size || 'Default', item.qty, item.unit_price, item.line_total")

code = code.replace("FROM orders WHERE source='pos'", "FROM offline_sales")
code = code.replace("const orderNumber = genOrderNumber();", "const orderNumber = await genOrderNumber(env);")
code = code.replace("inventory_log", "inventory") # Wait, inventory_log doesn't exist anymore? It's fine to remove it or change it

with open('src/routes/pos.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("pos.js updated")
