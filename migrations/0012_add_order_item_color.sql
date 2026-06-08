-- HeelsUp Migration 0012 — Add color column to order_items
ALTER TABLE order_items ADD COLUMN color TEXT;
