-- migrations/0018_add_mime_type_to_product_images.sql
-- Add mime_type and format metadata columns to product_images table
ALTER TABLE product_images ADD COLUMN mime_type TEXT DEFAULT 'image/webp';
ALTER TABLE product_images ADD COLUMN format TEXT DEFAULT 'webp';
