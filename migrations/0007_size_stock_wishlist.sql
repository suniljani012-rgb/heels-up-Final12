-- ============================================================
-- HeelsUp Migration 0007 — Size-Wise Stock & Wishlist
-- Run: npx wrangler d1 execute heelsup-live --file=migrations/0007_size_stock_wishlist.sql
-- ============================================================

-- ============================================================
-- PRODUCT SIZE STOCK (Per-size inventory tracking)
-- ============================================================
-- Each product + size combination gets its own stock record.
-- sizes_json on the products table holds the list of size labels.
-- This table tracks stock per (product_id, size_label).
CREATE TABLE IF NOT EXISTS product_size_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  size_label TEXT NOT NULL,     -- e.g. "36", "37", "38", "39", "40", "41"
  stock INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0, -- stock held for in-flight orders
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, size_label),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_size_stock_product ON product_size_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_size_stock_product_size ON product_size_stock(product_id, size_label);

-- ============================================================
-- WISHLIST (User saved items)
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlists(product_id);
