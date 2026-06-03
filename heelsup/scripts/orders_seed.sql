-- ============================================================
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

-- Customer 10: Amit Sharma
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, is_blocked, created_at, updated_at, total_orders, total_spent)
VALUES (10, 'Amit', 'Sharma', 'amit.sharma@gmail.com', '+919876543210', 'pbkdf2:100000:06a5381a3243b9385a7fa3e82c9e3309:771ae7f69402f653cc833cd857391453eb7c1efd2ce54db4ceec1b19b2f5848e', 'customer', 1, 0, datetime('now'), datetime('now'), 2, 2500.0);

-- Insert address with correct columns (label, line1, line2)
INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, country, is_default, created_at)
VALUES (10, 'Home', 'Amit Sharma', '+919876543210', 'Flat 402, Royal Palms, Sector 56', '', 'Gurugram', 'Haryana', '122011', 'India', 1, datetime('now'));

-- Customer 11: Priya Patel
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, is_blocked, created_at, updated_at, total_orders, total_spent)
VALUES (11, 'Priya', 'Patel', 'priya.patel@gmail.com', '+919988776655', 'pbkdf2:100000:06a5381a3243b9385a7fa3e82c9e3309:771ae7f69402f653cc833cd857391453eb7c1efd2ce54db4ceec1b19b2f5848e', 'customer', 1, 0, datetime('now'), datetime('now'), 2, 2500.0);

-- Insert address with correct columns (label, line1, line2)
INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, country, is_default, created_at)
VALUES (11, 'Home', 'Priya Patel', '+919988776655', '12-B, Shanti Kunj, Near Railway Station', '', 'Ahmedabad', 'Gujarat', '380009', 'India', 1, datetime('now'));

-- Customer 12: Rahul Verma
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, is_blocked, created_at, updated_at, total_orders, total_spent)
VALUES (12, 'Rahul', 'Verma', 'rahul.verma@gmail.com', '+919812345678', 'pbkdf2:100000:06a5381a3243b9385a7fa3e82c9e3309:771ae7f69402f653cc833cd857391453eb7c1efd2ce54db4ceec1b19b2f5848e', 'customer', 1, 0, datetime('now'), datetime('now'), 2, 2500.0);

-- Insert address with correct columns (label, line1, line2)
INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, country, is_default, created_at)
VALUES (12, 'Home', 'Rahul Verma', '+919812345678', 'C-55, Lajpat Nagar II', '', 'New Delhi', 'Delhi', '110024', 'India', 1, datetime('now'));

-- Customer 13: Sneha Nair
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, is_blocked, created_at, updated_at, total_orders, total_spent)
VALUES (13, 'Sneha', 'Nair', 'sneha.nair@gmail.com', '+919000111222', 'pbkdf2:100000:06a5381a3243b9385a7fa3e82c9e3309:771ae7f69402f653cc833cd857391453eb7c1efd2ce54db4ceec1b19b2f5848e', 'customer', 1, 0, datetime('now'), datetime('now'), 2, 2500.0);

-- Insert address with correct columns (label, line1, line2)
INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, country, is_default, created_at)
VALUES (13, 'Home', 'Sneha Nair', '+919000111222', 'Building 4, Palm Meadows, Whitefield', '', 'Bengaluru', 'Karnataka', '560066', 'India', 1, datetime('now'));

-- Customer 14: Vikram Singh
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, is_blocked, created_at, updated_at, total_orders, total_spent)
VALUES (14, 'Vikram', 'Singh', 'vikram.singh@gmail.com', '+919444555666', 'pbkdf2:100000:06a5381a3243b9385a7fa3e82c9e3309:771ae7f69402f653cc833cd857391453eb7c1efd2ce54db4ceec1b19b2f5848e', 'customer', 1, 0, datetime('now'), datetime('now'), 2, 2500.0);

-- Insert address with correct columns (label, line1, line2)
INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, country, is_default, created_at)
VALUES (14, 'Home', 'Vikram Singh', '+919444555666', 'H.No 148, Sector 15-A', '', 'Chandigarh', 'Punjab', '160015', 'India', 1, datetime('now'));

-- Order 1: HU-20260001 (User 10)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  1, 'HU-20260001', 10, 'Amit Sharma', 'amit.sharma@gmail.com', '+919876543210', 
  'Flat 402, Royal Palms, Sector 56', '', 'Gurugram', 'Haryana', '122011', 'India', 'Standard', 
  '{"name":"Amit Sharma","phone":"+919876543210","line1":"Flat 402, Royal Palms, Sector 56","city":"Gurugram","state":"Haryana","pincode":"122011","country":"India"}', 'online', 'placed', 'pending', 'cod', 
  NULL, NULL, NULL, 
  216400, 0, 0, 216400, 
  NULL, NULL, 
  NULL, 
  NULL, 
  NULL, 
  NULL, 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (1, 2, 'Classic Velvet Pump', 'HS-FL-002', 2, 108200, 216400, '38', 'https://images.unsplash.com/photo-1596702990281-134911ac0730?w=600&auto=format&fit=crop&q=80', datetime('now'));

-- Order 2: HU-20260002 (User 11)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  2, 'HU-20260002', 11, 'Priya Patel', 'priya.patel@gmail.com', '+919988776655', 
  '12-B, Shanti Kunj, Near Railway Station', '', 'Ahmedabad', 'Gujarat', '380009', 'India', 'Standard', 
  '{"name":"Priya Patel","phone":"+919988776655","line1":"12-B, Shanti Kunj, Near Railway Station","city":"Ahmedabad","state":"Gujarat","pincode":"380009","country":"India"}', 'online', 'confirmed', 'paid', 'razorpay', 
  'order_28816232', 'pay_32498718', 'sig_hash_mock_sha256', 
  237200, 0, 0, 237200, 
  NULL, NULL, 
  datetime('now'), 
  datetime('now'), 
  NULL, 
  NULL, 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (2, 3, 'Leather Chunky Ankle Boot', 'HS-SA-003', 2, 118600, 237200, '38', 'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=600&auto=format&fit=crop&q=80', datetime('now'));
INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, currency, status, raw_payload, created_at) VALUES (2, 'razorpay', 'order_28816232', 'pay_32498718', 2372.0, 'INR', 'captured', '{"status":"captured","method":"card"}', datetime('now'));

-- Order 3: HU-20260003 (User 12)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  3, 'HU-20260003', 12, 'Rahul Verma', 'rahul.verma@gmail.com', '+919812345678', 
  'C-55, Lajpat Nagar II', '', 'New Delhi', 'Delhi', '110024', 'India', 'Standard', 
  '{"name":"Rahul Verma","phone":"+919812345678","line1":"C-55, Lajpat Nagar II","city":"New Delhi","state":"Delhi","pincode":"110024","country":"India"}', 'online', 'shipped', 'paid', 'cod', 
  NULL, NULL, NULL, 
  147500, 10000, 0, 137500, 
  'TRK253879546', 'https://track.shiprocket.in/tracking/TRK253879546', 
  datetime('now'), 
  datetime('now'), 
  datetime('now'), 
  NULL, 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (3, 4, 'Patent Leather Slingback', 'HS-BO-004', 1, 147500, 147500, '38', 'https://images.unsplash.com/photo-1603808033192-082d6f74b30d?w=600&auto=format&fit=crop&q=80', datetime('now'));

-- Order 4: HU-20260004 (User 13)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  4, 'HU-20260004', 13, 'Sneha Nair', 'sneha.nair@gmail.com', '+919000111222', 
  'Building 4, Palm Meadows, Whitefield', '', 'Bengaluru', 'Karnataka', '560066', 'India', 'Standard', 
  '{"name":"Sneha Nair","phone":"+919000111222","line1":"Building 4, Palm Meadows, Whitefield","city":"Bengaluru","state":"Karnataka","pincode":"560066","country":"India"}', 'online', 'delivered', 'paid', 'razorpay', 
  'order_16014447', 'pay_65854608', 'sig_hash_mock_sha256', 
  116700, 0, 0, 116700, 
  'TRK424439161', 'https://track.shiprocket.in/tracking/TRK424439161', 
  datetime('now'), 
  datetime('now'), 
  datetime('now'), 
  datetime('now'), 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (4, 5, 'Elegant Suede Wedge', 'HS-SN-005', 1, 116700, 116700, '38', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80', datetime('now'));
INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, currency, status, raw_payload, created_at) VALUES (4, 'razorpay', 'order_16014447', 'pay_65854608', 1167.0, 'INR', 'captured', '{"status":"captured","method":"card"}', datetime('now'));

-- Order 5: HU-20260005 (User 14)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  5, 'HU-20260005', 14, 'Vikram Singh', 'vikram.singh@gmail.com', '+919444555666', 
  'H.No 148, Sector 15-A', '', 'Chandigarh', 'Punjab', '160015', 'India', 'Standard', 
  '{"name":"Vikram Singh","phone":"+919444555666","line1":"H.No 148, Sector 15-A","city":"Chandigarh","state":"Punjab","pincode":"160015","country":"India"}', 'online', 'cancelled', 'refunded', 'cod', 
  NULL, NULL, NULL, 
  322900, 0, 0, 322900, 
  NULL, NULL, 
  NULL, 
  NULL, 
  NULL, 
  NULL, 
  datetime('now'), 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (5, 6, 'Everyday Leather Loafer', 'HS-FL-006', 2, 86500, 173000, '38', 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&auto=format&fit=crop&q=80', datetime('now'));
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (5, 7, 'Comfort Strappy Sandal', 'HS-BO-007', 1, 149900, 149900, '38', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80', datetime('now'));

-- Order 6: HU-20260006 (User 10)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  6, 'HU-20260006', 10, 'Amit Sharma', 'amit.sharma@gmail.com', '+919876543210', 
  'Flat 402, Royal Palms, Sector 56', '', 'Gurugram', 'Haryana', '122011', 'India', 'Standard', 
  '{"name":"Amit Sharma","phone":"+919876543210","line1":"Flat 402, Royal Palms, Sector 56","city":"Gurugram","state":"Haryana","pincode":"122011","country":"India"}', 'online', 'placed', 'paid', 'razorpay', 
  'order_24097805', 'pay_56444299', 'sig_hash_mock_sha256', 
  299800, 10000, 0, 289800, 
  NULL, NULL, 
  datetime('now'), 
  NULL, 
  NULL, 
  NULL, 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (6, 7, 'Comfort Strappy Sandal', 'HS-BO-007', 2, 149900, 299800, '38', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80', datetime('now'));
INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, currency, status, raw_payload, created_at) VALUES (6, 'razorpay', 'order_24097805', 'pay_56444299', 2898.0, 'INR', 'captured', '{"status":"captured","method":"card"}', datetime('now'));

-- Order 7: HU-20260007 (User 11)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  7, 'HU-20260007', 11, 'Priya Patel', 'priya.patel@gmail.com', '+919988776655', 
  '12-B, Shanti Kunj, Near Railway Station', '', 'Ahmedabad', 'Gujarat', '380009', 'India', 'Standard', 
  '{"name":"Priya Patel","phone":"+919988776655","line1":"12-B, Shanti Kunj, Near Railway Station","city":"Ahmedabad","state":"Gujarat","pincode":"380009","country":"India"}', 'online', 'confirmed', 'paid', 'cod', 
  NULL, NULL, NULL, 
  255900, 0, 0, 255900, 
  NULL, NULL, 
  datetime('now'), 
  datetime('now'), 
  NULL, 
  NULL, 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (7, 8, 'Gladiator Lace-up Heel', 'HS-SA-008', 1, 146900, 146900, '38', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80', datetime('now'));
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (7, 9, 'Luxury Metallic Stiletto', 'HS-BO-009', 1, 109000, 109000, '38', 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=600&auto=format&fit=crop&q=80', datetime('now'));

-- Order 8: HU-20260008 (User 12)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  8, 'HU-20260008', 12, 'Rahul Verma', 'rahul.verma@gmail.com', '+919812345678', 
  'C-55, Lajpat Nagar II', '', 'New Delhi', 'Delhi', '110024', 'India', 'Standard', 
  '{"name":"Rahul Verma","phone":"+919812345678","line1":"C-55, Lajpat Nagar II","city":"New Delhi","state":"Delhi","pincode":"110024","country":"India"}', 'online', 'shipped', 'paid', 'razorpay', 
  'order_56578676', 'pay_27824664', 'sig_hash_mock_sha256', 
  109000, 0, 0, 109000, 
  'TRK574318713', 'https://track.shiprocket.in/tracking/TRK574318713', 
  datetime('now'), 
  datetime('now'), 
  datetime('now'), 
  NULL, 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (8, 9, 'Luxury Metallic Stiletto', 'HS-BO-009', 1, 109000, 109000, '38', 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=600&auto=format&fit=crop&q=80', datetime('now'));
INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, currency, status, raw_payload, created_at) VALUES (8, 'razorpay', 'order_56578676', 'pay_27824664', 1090.0, 'INR', 'captured', '{"status":"captured","method":"card"}', datetime('now'));

-- Order 9: HU-20260009 (User 13)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  9, 'HU-20260009', 13, 'Sneha Nair', 'sneha.nair@gmail.com', '+919000111222', 
  'Building 4, Palm Meadows, Whitefield', '', 'Bengaluru', 'Karnataka', '560066', 'India', 'Standard', 
  '{"name":"Sneha Nair","phone":"+919000111222","line1":"Building 4, Palm Meadows, Whitefield","city":"Bengaluru","state":"Karnataka","pincode":"560066","country":"India"}', 'online', 'delivered', 'paid', 'cod', 
  NULL, NULL, NULL, 
  323600, 10000, 0, 313600, 
  'TRK592890638', 'https://track.shiprocket.in/tracking/TRK592890638', 
  datetime('now'), 
  datetime('now'), 
  datetime('now'), 
  datetime('now'), 
  NULL, 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (9, 10, 'Sporty Mesh Sneaker', 'HS-SN-010', 2, 73700, 147400, '38', 'https://images.unsplash.com/photo-1512374382149-433853003064?w=600&auto=format&fit=crop&q=80', datetime('now'));
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (9, 11, 'Casual Canvas Slip-On', 'HS-SA-011', 2, 88100, 176200, '38', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', datetime('now'));

-- Order 10: HU-20260010 (User 14)
INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, country, delivery_method, address_snapshot, source, order_status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, subtotal_amount, discount_amount, shipping_amount, total_amount, tracking_number, tracking_url, paid_at, confirmed_at, shipped_at, delivered_at, cancelled_at, created_at, updated_at)
VALUES (
  10, 'HU-20260010', 14, 'Vikram Singh', 'vikram.singh@gmail.com', '+919444555666', 
  'H.No 148, Sector 15-A', '', 'Chandigarh', 'Punjab', '160015', 'India', 'Standard', 
  '{"name":"Vikram Singh","phone":"+919444555666","line1":"H.No 148, Sector 15-A","city":"Chandigarh","state":"Punjab","pincode":"160015","country":"India"}', 'online', 'cancelled', 'refunded', 'razorpay', 
  'order_75767586', NULL, NULL, 
  176200, 0, 0, 176200, 
  NULL, NULL, 
  NULL, 
  NULL, 
  NULL, 
  NULL, 
  datetime('now'), 
  datetime('now'), datetime('now')
);
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, image_url, created_at) VALUES (10, 11, 'Casual Canvas Slip-On', 'HS-SA-011', 2, 88100, 176200, '38', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', datetime('now'));
