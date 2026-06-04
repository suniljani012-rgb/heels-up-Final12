-- ============================================================
-- HeelsUp Migration 0009 — MRP Visibility Per Product
-- Run: npx wrangler d1 execute heelsup-live --file=migrations/0009_mrp_visibility.sql
-- ============================================================

-- Add show_mrp column to products (default 1 = show MRP to customers)
ALTER TABLE products ADD COLUMN show_mrp INTEGER NOT NULL DEFAULT 1;

-- Add session_timeout_hours setting (8 hours for admin/staff)
INSERT OR IGNORE INTO settings (key, value) VALUES ('session_timeout_hours', '8');

-- Add social link settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('social_instagram', 'https://www.instagram.com/heel_s_up/');
INSERT OR IGNORE INTO settings (key, value) VALUES ('social_facebook', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('social_pinterest', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_email', 'support@heelsup.in');

-- Add footer content settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('footer_tagline', 'Premium luxury women''s footwear and handbags. Give Value To Your Feet.');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_city', 'Jodhpur');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_state', 'Rajasthan');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_country', 'India');
