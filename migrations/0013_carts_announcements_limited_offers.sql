-- ============================================================
-- HeelsUp Migration 0013 — Carts, Announcements & Flash Sales
-- ============================================================

-- 1. CARTS TABLE
CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  size TEXT,
  color TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id, size, color),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cart_user ON carts(user_id);

-- 2. OFFLINE SALE ITEMS TABLE (For POS Relational Integrity)
CREATE TABLE IF NOT EXISTS offline_sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_code TEXT,
  product_name TEXT,
  color TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sale_id) REFERENCES offline_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offline_sale_item_sale ON offline_sale_items(sale_id);

-- 3. ANNOUNCEMENTS TABLE (For header banner settings)
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed Default Announcements
INSERT INTO announcements (text, active, sort_order) VALUES ('🎉 NEW ARRIVALS — Summer Collection is Live!', 1, 0);
INSERT INTO announcements (text, active, sort_order) VALUES ('🚚 FREE Shipping on orders above ₹999', 1, 1);
INSERT INTO announcements (text, active, sort_order) VALUES ('🏷️ Use code HEELS10 for 10% off on first order', 1, 2);

-- 4. LIMITED TIME OFFERS TABLE (For flash sale timers)
CREATE TABLE IF NOT EXISTS limited_time_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  hours INTEGER NOT NULL DEFAULT 24,
  minutes INTEGER NOT NULL DEFAULT 0,
  seconds INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed Default Flash Sale Offer
INSERT INTO limited_time_offers (title, description, hours, minutes, seconds, active) VALUES (
  'Limited Time Flash Sale!',
  'Grab Jodhpur''s finest premium stilettos and flats at special markdown prices. Save up to 30% plus get Free Shipping!',
  24,
  0,
  0,
  1
);
