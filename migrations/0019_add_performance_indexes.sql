-- Migration: 0019_add_performance_indexes.sql
-- Description: High-performance D1 SQLite indexes matching exact schema columns for fast catalog searches, SKU lookups, order tracking, and POS analytics

-- 1. Product catalog & SKU search indexes
CREATE INDEX IF NOT EXISTS idx_products_cat_active ON products(category, active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active_created ON products(active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured_active ON products(featured, active);

-- 2. Order history & tracking indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 3. Customer reviews index
CREATE INDEX IF NOT EXISTS idx_prod_reviews_prod_status ON product_reviews(product_id, status);
