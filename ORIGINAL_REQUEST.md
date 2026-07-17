# Original User Request

## Initial Request — 2026-07-17T17:57:58+05:30

Fix the admin product gallery broken image previews, convert HEIC images to PNG on upload, and optimize storefront loading speed to make data appear preloaded instantly.

Working directory: C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner
Integrity mode: development

## Requirements

### R1. Fix Admin Product Gallery Previews
Identify and fix why images uploaded to the product gallery show broken icons in the admin drawer preview on production.

### R2. Convert HEIC Images to PNG
Ensure HEIC uploads are correctly converted and saved as standard PNG files in R2 storage at the edge.

### R3. Instant 0.01ms Website Preloading
Optimize the storefront (products, categories, banners) so that all data loads instantly as if preloaded.

## Acceptance Criteria

### Gallery Previews
- [ ] Uploaded product gallery images display correctly without broken links.

### HEIC to PNG
- [ ] HEIC uploads are stored in R2 with `.png` extension and rendered correctly in all browsers.

### Preloading Speed
- [ ] Storefront data displays instantly upon page load.
