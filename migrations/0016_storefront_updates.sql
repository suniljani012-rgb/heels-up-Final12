ALTER TABLE products ADD COLUMN brand TEXT DEFAULT '';
ALTER TABLE offline_sales ADD COLUMN sales_channel TEXT DEFAULT 'POS';
ALTER TABLE orders ADD COLUMN out_for_delivery_at TEXT;
