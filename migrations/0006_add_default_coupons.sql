-- Add default coupons for HeelsUp
-- These correspond to the coupon hints shown on checkout page

INSERT OR IGNORE INTO coupons (code, type, value, min_order, max_discount, max_uses, active, description, expires_at, created_at)
VALUES 
  ('HEELS10', 'percent', 10, 0, 500, NULL, 1, '10% off on all products', '2027-12-31T23:59:59Z', datetime('now')),
  ('WELCOME20', 'percent', 20, 0, 1000, NULL, 1, '20% off - Welcome offer for new customers', '2027-12-31T23:59:59Z', datetime('now')),
  ('FLAT100', 'fixed', 100, 500, NULL, NULL, 1, 'Flat ₹100 off on orders above ₹500', '2027-12-31T23:59:59Z', datetime('now'));
