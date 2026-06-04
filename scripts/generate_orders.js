// Scripts to generate mock orders, payments, and customers for HeelsUp
import fs from 'fs';

const CUSTOMERS = [
    { first_name: 'Amit', last_name: 'Sharma', email: 'amit.sharma@gmail.com', phone: '+919876543210', address: 'Flat 402, Royal Palms, Sector 56', city: 'Gurugram', state: 'Haryana', pincode: '122011' },
    { first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@gmail.com', phone: '+919988776655', address: '12-B, Shanti Kunj, Near Railway Station', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009' },
    { first_name: 'Rahul', last_name: 'Verma', email: 'rahul.verma@gmail.com', phone: '+919812345678', address: 'C-55, Lajpat Nagar II', city: 'New Delhi', state: 'Delhi', pincode: '110024' },
    { first_name: 'Sneha', last_name: 'Nair', email: 'sneha.nair@gmail.com', phone: '+919000111222', address: 'Building 4, Palm Meadows, Whitefield', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' },
    { first_name: 'Vikram', last_name: 'Singh', email: 'vikram.singh@gmail.com', phone: '+919444555666', address: 'H.No 148, Sector 15-A', city: 'Chandigarh', state: 'Punjab', pincode: '160015' }
];

const ORDER_STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_METHODS = ['razorpay', 'cod'];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function main() {
    let sql = `-- ============================================================
-- HeelsUp Seeding Script: Customers, Orders & Payments
-- ============================================================

-- Disable foreign key checks temporarily to allow clean drops
PRAGMA foreign_keys = OFF;

-- Recreate addresses table to match backend code (replaces mismatch columns)
DROP TABLE IF EXISTS addresses;
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Cleanup existing mock data
DELETE FROM order_items;
DELETE FROM payments;
DELETE FROM returns;
DELETE FROM orders;
DELETE FROM users WHERE role = 'customer';

PRAGMA foreign_keys = ON;
`;

    // 1. Insert Customers (Users starting from ID 10 to avoid conflicting with admin/staff)
    // Password is Sunil@123 (hashed)
    CUSTOMERS.forEach((c, idx) => {
        const userId = 10 + idx;
        sql += `
-- Customer ${userId}: ${c.first_name} ${c.last_name}
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, is_blocked, created_at, updated_at, total_orders, total_spent)
VALUES (${userId}, '${c.first_name}', '${c.last_name}', '${c.email}', '${c.phone}', 'pbkdf2:100000:06a5381a3243b9385a7fa3e82c9e3309:771ae7f69402f653cc833cd857391453eb7c1efd2ce54db4ceec1b19b2f5848e', 'customer', 1, 0, datetime('now'), datetime('now'), 2, 2500.0);

-- Insert address with correct columns (label, line1, line2)
INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, country, is_default, created_at)
VALUES (${userId}, 'Home', '${c.first_name} ${c.last_name}', '${c.phone}', '${c.address}', '', '${c.city}', '${c.state}', '${c.pincode}', 'India', 1, datetime('now'));
`;
    });

    // 2. Insert Orders
    // We will generate 10 mock orders spanning the 5 customers
    let productsMock = [];
    if (fs.existsSync('scripts/products.json')) {
        try {
            let content = fs.readFileSync('scripts/products.json', 'utf8');
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }
            const rawData = JSON.parse(content);
            productsMock = rawData[0].results;
        } catch (e) {
            console.error('Failed to parse products.json:', e);
        }
    }
    
    // Fallback if products.json is empty or failed to parse
    if (!productsMock || productsMock.length === 0) {
        productsMock = [
            { id: 1, name: 'Stiletto Pointed-Toe Heel', price: 99900, sku: 'HS-HE-001', image_url1: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600' },
            { id: 2, name: 'Classic Velvet Pump', price: 129900, sku: 'HS-PU-002', image_url1: 'https://images.unsplash.com/photo-1596702990281-134911ac0730?w=600' },
            { id: 3, name: 'Leather Chunky Ankle Boot', price: 149900, sku: 'HS-BO-003', image_url1: 'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=600' },
            { id: 4, name: 'Patent Leather Slingback', price: 89900, sku: 'HS-SL-004', image_url1: 'https://images.unsplash.com/photo-1603808033192-082d6f74b30d?w=600' },
            { id: 5, name: 'Elegant Suede Wedge', price: 119900, sku: 'HS-WE-005', image_url1: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600' }
        ];
    }

    for (let i = 1; i <= 10; i++) {
        const orderId = i;
        const orderNum = `HU-${20260000 + i}`;
        const custIdx = (i - 1) % CUSTOMERS.length;
        const userId = 10 + custIdx;
        const customer = CUSTOMERS[custIdx];
        
        const status = ORDER_STATUSES[(i - 1) % ORDER_STATUSES.length];
        const payMethod = PAYMENT_METHODS[i % 2];
        const isPaid = (status === 'delivered' || status === 'shipped' || status === 'confirmed' || (status === 'placed' && payMethod === 'razorpay'));
        const payStatus = isPaid ? 'paid' : (status === 'cancelled' ? 'refunded' : 'pending');
        
        // Items count (1 or 2 items)
        const itemsCount = getRandomInt(1, 2);
        let subtotal = 0;
        const items = [];
        
        for (let j = 0; j < itemsCount; j++) {
            const p = productsMock[(i + j) % productsMock.length];
            const qty = getRandomInt(1, 2);
            const lineTotal = p.price * qty;
            subtotal += lineTotal;
            items.push({
                product_id: p.id,
                name: p.name,
                sku: p.sku,
                qty,
                price: p.price,
                total: lineTotal,
                img: p.image_url1 || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'
            });
        }
        
        const shipping = subtotal >= 99900 ? 0 : 4900; // Free shipping above Rs 999
        const discount = i % 3 === 0 ? 10000 : 0; // Rs 100 discount occasionally
        const total = subtotal + shipping - discount;
        
        const trackingNum = status === 'shipped' || status === 'delivered' ? `TRK${getRandomInt(100000000, 999999999)}` : null;
        const trackingUrl = trackingNum ? `https://track.shiprocket.in/tracking/${trackingNum}` : null;
        
        const rzpOrderId = payMethod === 'razorpay' ? `order_${String(getRandomInt(10000000, 99999999))}` : null;
        const rzpPayId = isPaid && payMethod === 'razorpay' ? `pay_${String(getRandomInt(10000000, 99999999))}` : null;
        const rzpSig = rzpPayId ? 'sig_hash_mock_sha256' : null;
        
        const addrSnapshot = JSON.stringify({
            name: `${customer.first_name} ${customer.last_name}`,
            phone: customer.phone,
            line1: customer.address,
            city: customer.city,
            state: customer.state,
            pincode: customer.pincode,
            country: 'India'
        });

        // Insert Order
        sql += `
-- Order ${orderId}: ${orderNum} (User ${userId})
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  ${orderId}, '${orderNum}', ${userId}, '${customer.first_name} ${customer.last_name}', '${customer.email}', '${customer.phone}', 
  '${customer.address}', '', '${customer.city}', '${customer.state}', '${customer.pincode}', 'India', 'Standard', 
  '${addrSnapshot}', 'online', '${status}', '${payStatus}', '${payMethod}', 
  ${rzpOrderId ? `'${rzpOrderId}'` : 'NULL'}, ${rzpPayId ? `'${rzpPayId}'` : 'NULL'}, ${rzpSig ? `'${rzpSig}'` : 'NULL'}, 
  ${subtotal}, ${discount}, ${shipping}, ${total}, 
  ${trackingNum ? `'${trackingNum}'` : 'NULL'}, ${trackingUrl ? `'${trackingUrl}'` : 'NULL'}, 
  ${isPaid ? "datetime('now')" : 'NULL'}, 
  ${status !== 'placed' && status !== 'cancelled' ? "datetime('now')" : 'NULL'}, 
  ${status === 'shipped' || status === 'delivered' ? "datetime('now')" : 'NULL'}, 
  ${status === 'delivered' ? "datetime('now')" : 'NULL'}, 
  ${status === 'cancelled' ? "datetime('now')" : 'NULL'}, 
  datetime('now'), datetime('now')
);
`;

        // Insert Order Items
        items.forEach(item => {
            sql += `INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (${orderId}, ${item.product_id}, '${item.name}', '${item.sku}', ${item.qty}, ${item.price}, ${item.total}, '38', '${item.img}', datetime('now'));\n`;
        });

        // Insert Payment Record
        if (isPaid && payMethod === 'razorpay') {
            sql += `INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, currency, status, raw_payload, created_at) VALUES (${orderId}, 'razorpay', '${rzpOrderId}', '${rzpPayId}', ${total / 100}.0, 'INR', 'captured', '{"status":"captured","method":"card"}', datetime('now'));\n`;
        }
    }

    fs.writeFileSync('scripts/orders_seed.sql', sql);
    console.log('Successfully generated scripts/orders_seed.sql');
}

main();
