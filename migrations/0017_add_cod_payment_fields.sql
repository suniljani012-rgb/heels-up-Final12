-- migrations/0017_add_cod_payment_fields.sql
-- Add columns to track COD advance payments and outstanding collectable amounts
ALTER TABLE orders ADD COLUMN cod_advance_paid INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN cod_outstanding_amount INTEGER DEFAULT 0;
