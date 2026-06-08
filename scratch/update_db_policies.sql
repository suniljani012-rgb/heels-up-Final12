-- Update Shipping Information
UPDATE pages 
SET content = '<h3>Fast & Secure Shipping</h3><p>We deliver all across India.</p><h3>Delivery Time</h3><p>Most orders are processed within 48-52 hours and delivered within 3-5 business days. Express shipping is available for select pincodes with 1-2 day delivery.</p><h3>Free Shipping</h3><p>We offer FREE standard shipping on all orders above ₹999. For orders below ₹999, a flat shipping charge of ₹60 is applicable.</p>'
WHERE slug = 'shipping-info';

-- Update Exchange & Returns Policy
UPDATE pages 
SET content = '<h3 style="color:#d4456b;">No Return Policy</h3><p><strong>Please note:</strong> HeelsUp has a strict <strong>No Return / No Refund Policy</strong>. Once an order is placed and delivered, it cannot be returned or refunded.</p><h3>7-Day Exchange Policy</h3><p>We offer a 7-day exchange window for size issues or damaged items under the following mandatory terms:</p><ul><li><strong>Packet Opening Video:</strong> A complete, unedited packet opening video showing the shipping label and the damage/item is mandatory to claim an exchange.</li><li><strong>Eligible Reasons:</strong> Exchange is strictly limited to <strong>damage/defects</strong> or <strong>size issues</strong>. No other exchange requests will be entertained.</li><li>Items must be unworn, unused, undamaged, and in their original packaging with all tags intact.</li></ul><h3>Exchange Process</h3><p>To request an exchange, go to your Profile -> Orders -> Request Exchange within 7 days of delivery, upload the packet opening video, or contact our support team.</p>'
WHERE slug = 'returns';

-- Update FAQs
UPDATE pages 
SET content = '<h3>Q: What is your return policy?</h3><p>HeelsUp operates on a strict <strong>No Return / No Refund Policy</strong>. We do not accept returns or offer refunds once an item is purchased. However, we do offer a 7-day exchange for size issues or damaged products, subject to providing a mandatory packet opening video.</p><h3>Q: What payment options do you support?</h3><p>We support all major payment options including UPI, Credit/Debit cards, Net Banking, and Wallet payments via Razorpay.</p><h3>Q: How can I track my order?</h3><p>Once your order is shipped, you will receive a tracking link via SMS/email. You can also track your order directly on our website using the "Track Order" link in the footer.</p><h3>Q: What is your size guide?</h3><p>Please refer to our Size Guide link in the footer for detailed measurements. We recommend buying your standard UK/India shoe size.</p>'
WHERE slug = 'faq';

-- Update free shipping thresholds in settings (supplying updated_at)
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('shipping_free_above', '999', datetime('now'));
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('free_shipping_above', '99900', datetime('now'));

-- Seed Deal of the Day variables (supplying updated_at)
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('offer_title', 'Deal of the Day', datetime('now'));
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('offer_description', 'Grab Jodhpur''s finest premium stilettos and flats at special markdown prices. Save up to 30% plus get Free Shipping!', datetime('now'));
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('offer_hours', '8', datetime('now'));
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('offer_minutes', '47', datetime('now'));
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('offer_seconds', '23', datetime('now'));
