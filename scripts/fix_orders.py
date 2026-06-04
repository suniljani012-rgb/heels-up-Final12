import re

with open('src/routes/orders.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update genOrderNumber
gen_order = """
async function generateOrderNumber(env) {
    const today = new Date();
    const prefix = `HU-${today.getUTCFullYear()}`;
    const row = await env.DB.prepare("SELECT COUNT(*) as c FROM online_orders WHERE order_number LIKE ?").bind(`${prefix}%`).first();
    const seq = String((row?.c || 0) + 1).padStart(4, "0");
    return `${prefix}${seq}`;
}
"""
code = re.sub(r"async function generateOrderNumber\([^\}]+\}", gen_order.strip(), code, flags=re.DOTALL)

# 2. Update table names for orders
code = code.replace("INSERT INTO order_items", "INSERT INTO online_order_items")
code = code.replace("FROM order_items", "FROM online_order_items")

# 3. Update createOrderRecord insert
old_insert_sql = "INSERT INTO online_orders (order_number, user_id, customer_name, customer_email, customer_phone,\n         address_line1, address_line2, city, state, pincode, country, delivery_method, coupon_code,\n         payment_method, payment_status, order_status, subtotal_amount, shipping_amount, discount_amount,\n         total_amount, notes, source, created_at, updated_at)"
new_insert_sql = "INSERT INTO online_orders (order_number, online_customer_id, delivery_address, subtotal, delivery_charge, discount, total, payment_method, payment_status, status, notes, created_at, updated_at)"

code = code.replace(old_insert_sql, new_insert_sql)

old_values = "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
new_values = "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
code = code.replace(old_values, new_values)

old_binds = """orderNumber, input.userId, customerName, customerEmail, customerPhone,
        finalAddressLine1, addressLine2, finalCity, finalState, finalPincode, country,
        String(input.deliveryMethod || "standard"), input.couponCode || null,
        input.paymentMethod, input.paymentStatus, input.orderStatus,
        subtotalAmount, shippingAmount, discountAmount,
        totalAmount, String(input.notes || "").trim(), source, createdAt, createdAt"""
new_binds = """orderNumber, input.userId, JSON.stringify({line1: finalAddressLine1, line2: addressLine2, city: finalCity, state: finalState, pincode: finalPincode, country: country}),
        subtotalAmount * 100, shippingAmount * 100, discountAmount * 100, totalAmount * 100, input.paymentMethod, input.paymentStatus, input.orderStatus, String(input.notes || "").trim(), createdAt, createdAt"""
code = code.replace(old_binds, new_binds)

old_item_sql = "INSERT INTO online_order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
new_item_sql = "INSERT INTO online_order_items (order_id, product_id, product_code, product_name, color, size, quantity, unit_price, total_price) VALUES (?,?,?,?,?,?,?,?,?)"
code = code.replace(old_item_sql, new_item_sql)

old_item_binds = "orderId, item.productId, item.name, item.sku, item.qty, item.unitPrice, item.lineTotal, item.size, item.image, createdAt"
new_item_binds = "orderId, item.productId, item.sku, item.name, '', item.size || 'Default', item.qty, Math.round(item.unitPrice * 100), Math.round(item.lineTotal * 100)"
code = code.replace(old_item_binds, new_item_binds)

# Update order mapping inside formatOrder
code = code.replace("id: o.id,", "id: o.id,")
code = code.replace("user_id = ?", "online_customer_id = ?")

with open('src/routes/orders.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("orders.js updated")
