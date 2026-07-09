-- Migration: Add merchant_reply column to product_reviews table
-- Created At: 2026-07-09

ALTER TABLE product_reviews ADD COLUMN merchant_reply TEXT;
