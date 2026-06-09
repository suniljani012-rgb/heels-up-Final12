-- Migration: exchange_images_and_details
-- Add columns to exchanges and exchange_items to support detailed exchange choices and customer product images

ALTER TABLE exchanges ADD COLUMN images TEXT; -- JSON array of 3 image URLs
ALTER TABLE exchange_items ADD COLUMN exchange_to_product_id INTEGER;
ALTER TABLE exchange_items ADD COLUMN exchange_to_size TEXT;
ALTER TABLE exchange_items ADD COLUMN exchange_to_color TEXT;
