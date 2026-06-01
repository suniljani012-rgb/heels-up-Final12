import json
import os

schema_sql = """PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ─────────────────────────────────────────────
-- TABLE 1: ONLINE CUSTOMERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS online_customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  password_hash TEXT NOT NULL,
  is_active   INTEGER DEFAULT 1,
  is_blocked  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  last_login  TEXT
);
CREATE INDEX idx_online_customers_email ON online_customers(email);
CREATE INDEX idx_online_customers_phone ON online_customers(phone);

-- ─────────────────────────────────────────────
-- TABLE 2: OFFLINE CUSTOMERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT UNIQUE NOT NULL,
  name        TEXT,
  phone       TEXT,
  total_visits INTEGER DEFAULT 1,
  total_spent  INTEGER DEFAULT 0,
  notes        TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_offline_customers_phone ON offline_customers(phone);

-- ─────────────────────────────────────────────
-- TABLE 3: STAFF
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id     TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  phone        TEXT,
  password_hash TEXT NOT NULL,
  role         TEXT DEFAULT 'staff',
  permissions  TEXT DEFAULT '[]',
  is_active    INTEGER DEFAULT 1,
  created_by   INTEGER,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  last_login   TEXT
);

-- ─────────────────────────────────────────────
-- TABLE 4: ADMINS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id     TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role         TEXT DEFAULT 'admin',
  is_active    INTEGER DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  last_login   TEXT
);

-- ─────────────────────────────────────────────
-- PRODUCT & INVENTORY TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  product_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  product_code TEXT UNIQUE,
  category TEXT,
  price INTEGER NOT NULL, -- paise
  original_price INTEGER, -- paise
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, 
  url TEXT NOT NULL, 
  sort_order INTEGER DEFAULT 0, 
  is_primary INTEGER DEFAULT 0, 
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER,
  color TEXT,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, color, size)
);

-- ─────────────────────────────────────────────
-- ONLINE CART & ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id     INTEGER NOT NULL REFERENCES cart(id),
  product_id  INTEGER NOT NULL,
  variant_id  INTEGER,
  color       TEXT,
  size        TEXT NOT NULL,
  quantity    INTEGER DEFAULT 1,
  unit_price  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS online_orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number    TEXT UNIQUE NOT NULL,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  delivery_address TEXT NOT NULL,
  subtotal        INTEGER NOT NULL,
  delivery_charge INTEGER DEFAULT 0,
  discount        INTEGER DEFAULT 0,
  total           INTEGER NOT NULL,
  payment_method  TEXT DEFAULT 'razorpay',
  payment_status  TEXT DEFAULT 'pending',
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  status          TEXT DEFAULT 'pending',
  tracking_number TEXT,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_online_orders_customer ON online_orders(online_customer_id);
CREATE INDEX idx_online_orders_status ON online_orders(status, created_at);
CREATE INDEX idx_online_orders_payment ON online_orders(payment_status);

CREATE TABLE IF NOT EXISTS online_order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES online_orders(id),
  product_id      INTEGER NOT NULL,
  product_code    TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  color           TEXT,
  size            TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  unit_price      INTEGER NOT NULL,
  total_price     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS online_order_status_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES online_orders(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  note       TEXT,
  changed_by TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- OFFLINE SALES TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_sales (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number         TEXT UNIQUE NOT NULL,
  offline_customer_id INTEGER REFERENCES offline_customers(id),
  customer_name       TEXT,
  customer_phone      TEXT,
  subtotal            INTEGER NOT NULL,
  discount            INTEGER DEFAULT 0,
  total               INTEGER NOT NULL,
  payment_method      TEXT NOT NULL,
  payment_reference   TEXT,
  served_by_staff_id  INTEGER REFERENCES staff(id),
  notes               TEXT,
  is_exchange         INTEGER DEFAULT 0,
  original_bill_number TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_offline_sales_date ON offline_sales(created_at);
CREATE INDEX idx_offline_sales_customer ON offline_sales(offline_customer_id);

CREATE TABLE IF NOT EXISTS offline_sale_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id         INTEGER NOT NULL REFERENCES offline_sales(id),
  product_id      INTEGER NOT NULL,
  product_code    TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  color           TEXT,
  size            TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  unit_price      INTEGER NOT NULL,
  total_price     INTEGER NOT NULL
);

-- ─────────────────────────────────────────────
-- EXCHANGES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchanges (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_number     TEXT UNIQUE NOT NULL,
  source_type         TEXT NOT NULL,
  source_order_id     INTEGER,
  source_sale_id      INTEGER,
  customer_type       TEXT NOT NULL,
  online_customer_id  INTEGER,
  offline_customer_id INTEGER,
  reason              TEXT,
  status              TEXT DEFAULT 'requested',
  new_product_id      INTEGER,
  new_color           TEXT,
  new_size            TEXT,
  new_bill_number     TEXT,
  handled_by_staff_id INTEGER REFERENCES staff(id),
  notes               TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- OTHER TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS online_customer_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  label TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  min_order INTEGER DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  online_customer_id INTEGER REFERENCES online_customers(id),
  order_id INTEGER REFERENCES online_orders(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  online_customer_id INTEGER REFERENCES online_customers(id),
  rating INTEGER,
  comment TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER REFERENCES reviews(id),
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT,
  title TEXT,
  link TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  staff_id INTEGER,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT,
  reference_id TEXT,
  printed_by_staff_id INTEGER,
  printed_by_admin_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_daily_snapshot (
  date TEXT PRIMARY KEY,
  total_online_sales INTEGER DEFAULT 0,
  total_offline_sales INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0
);

-- Misc tables missing from prompt but likely needed based on prior logic
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE otp_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ─────────────────────────────────────────────
-- INSERT SETTINGS
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value) VALUES
('free_delivery_threshold', '799'),
('return_policy', 'exchange_only'),
('exchange_window_days', '7'),
('cod_enabled', 'false'),
('online_payment_only', 'true'),
('currency', 'INR'),
('currency_symbol', '₹'),
('gst_registered', 'false'),
('gst_number', ''),
('store_name', 'HeelsUp'),
('store_phone', ''),
('store_address', ''),
('store_logo', '/assets/logo.png'),
('invoice_prefix', 'HU'),
('offline_bill_prefix', 'HU-OFL'),
('min_order_value', '0'),
('delivery_charge', '60'),
('delivery_charge_free_above', '799');

-- ─────────────────────────────────────────────
-- PRODUCT SEEDING
-- ─────────────────────────────────────────────
"""

products = [
    {"code": "00110", "price": 1150, "variants": [
        {"color": "Black", "sizes": ["37", "38", "39", "40"]},
        {"color": "Cream", "sizes": ["37", "38", "40", "41"]}
    ]},
    {"code": "0087", "price": 899, "variants": [
        {"color": "Nude/Default", "sizes": ["38", "40", "41"]}
    ]},
    {"code": "0068", "price": 650, "variants": [
        {"color": "White", "sizes": ["38", "39", "40", "41"]},
        {"color": "Cherry", "sizes": ["38", "41"]}
    ]},
    {"code": "0080", "price": 799, "variants": [
        {"color": "Black", "sizes": ["36", "37", "38", "41"]},
        {"color": "Brown", "sizes": ["36", "38", "40"]}
    ]},
    {"code": "0084-A", "price": 850, "variants": [
        {"color": "Cherry", "sizes": ["36", "37", "40", "41"]},
        {"color": "Brown", "sizes": ["36", "37", "41"]}
    ]},
    {"code": "00110-B", "price": 1099, "variants": [
        {"color": "White", "sizes": ["36", "37", "39", "41"]},
        {"color": "Brown", "sizes": ["36", "41"]}
    ]},
    {"code": "0078-A", "price": 750, "variants": [
        {"color": "Nude/Default", "sizes": ["37", "38", "39", "40"]}
    ]},
    {"code": "0058-A", "price": 650, "variants": [
        {"color": "Nude/Default", "sizes": ["38", "39", "40"]}
    ]},
    {"code": "0056-A", "price": 549, "variants": [
        {"color": "Black", "sizes": ["36", "37", "38", "39"]},
        {"color": "Cream", "sizes": ["36", "38", "39", "41"]}
    ]},
    {"code": "0084-B", "price": 749, "variants": [
        {"color": "Cream", "sizes": ["37", "38", "39"]},
        {"color": "Brown", "sizes": ["37", "39", "40", "41"]}
    ]},
    {"code": "0056-B", "price": 499, "variants": [
        {"color": "Black", "sizes": ["38", "39"]},
        {"color": "White", "sizes": ["39"]}
    ]},
    {"code": "0067-A", "price": 650, "variants": [
        {"color": "Black", "sizes": ["36", "37", "38", "39", "40", "41"]},
        {"color": "Cherry", "sizes": ["36", "37", "38"]}
    ]},
    {"code": "0084-C", "price": 850, "variants": [
        {"color": "Black", "sizes": ["36", "37", "38", "39", "40"]},
        {"color": "Brown", "sizes": ["36", "37", "40"]}
    ]},
    {"code": "0064-A", "price": 699, "variants": [
        {"color": "Nude/Default", "sizes": ["37", "38", "39"]}
    ]},
    {"code": "0058-B", "price": 549, "variants": [
        {"color": "Nude/Default", "sizes": ["37", "39", "41"]}
    ]},
    {"code": "0084-D", "price": 850, "variants": [
        {"color": "Nude/Default", "sizes": ["38", "39", "40", "41"]}
    ]},
    {"code": "0078-B", "price": 749, "variants": [
        {"color": "White", "sizes": ["40", "41"]},
        {"color": "Cream", "sizes": ["38", "40", "41"]}
    ]},
    {"code": "0078-C", "price": 799, "variants": [
        {"color": "Nude/Default", "sizes": ["37", "40", "41"]}
    ]},
    {"code": "0095", "price": 1099, "variants": [
        {"color": "Nude/Default", "sizes": ["38", "39", "40", "41"]}
    ]},
    {"code": "0094-A", "price": 995, "variants": [
        {"color": "Nude/Default", "sizes": ["38", "39", "40", "41"]}
    ]},
    {"code": "0094-B", "price": 995, "variants": [
        {"color": "Nude/Default", "sizes": ["36", "37", "38", "39", "40", "41"]}
    ]},
    {"code": "0064-B", "price": 699, "variants": [
        {"color": "Nude/Default", "sizes": ["36", "37", "38", "39", "40", "41"]}
    ]},
    {"code": "0097-A", "price": 995, "variants": [
        {"color": "Nude/Default", "sizes": ["36", "37", "38", "39", "40", "41"]}
    ]},
    {"code": "0084-E", "price": 799, "variants": [
        {"color": "Nude/Default", "sizes": ["37", "38", "39", "40", "41"]}
    ]},
    {"code": "0067-B", "price": 699, "variants": [
        {"color": "Nude/Default", "sizes": ["36", "37", "38", "39", "40", "41"]}
    ]},
    {"code": "0092", "price": 899, "variants": [
        {"color": "Nude/Default", "sizes": ["36", "37", "38", "39", "40", "41"]}
    ]},
    {"code": "0097-B", "price": 995, "variants": [
        {"color": "Nude/Default", "sizes": ["36", "37", "38", "39", "40"]}
    ]},
    {"code": "0093", "price": 995, "variants": [
        {"color": "Nude/Default", "sizes": ["36", "37", "38", "39", "40", "41"]}
    ]}
]

def get_product_name(price):
    if price < 699:
        return "Everyday Comfort Flat"
    elif price < 899:
        return "Casual Block Heel"
    else:
        return "Premium Party Heel"

for i, prod in enumerate(products):
    product_id = i + 1
    name = get_product_name(prod["price"])
    price_paise = prod["price"] * 100
    schema_sql += f"INSERT INTO products (id, name, product_code, price, active) VALUES ({product_id}, '{name}', '{prod['code']}', {price_paise}, 1);\n"
    
    for variant in prod["variants"]:
        color = variant["color"]
        for size in variant["sizes"]:
            schema_sql += f"INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES ({product_id}, '{color}', '{size}', 10, 0);\n"

with open('schema/schema.sql', 'w', encoding='utf-8') as f:
    f.write(schema_sql)

print("Generated schema.sql perfectly.")
