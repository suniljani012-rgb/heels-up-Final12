# Original User Request

## Initial Request — 2026-07-10T14:50:26+05:30

Redesign the HeelsUp Admin Panel and POS terminal with new product upload workflows, bulk CSV uploads, social media sales tracking, settings alignment, DB console removal, and color readability fixes.

Working directory: C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner
Integrity mode: development

## Requirements

### R1. Color & Contrast Alignment
Ensure high visual contrast across the entire admin panel. Fix any pages where text is invisible or low-contrast (e.g. white text on white backdrops). Use deep charcoal/black text (`text-neutral-900`, `text-neutral-700`) on white or light gray backgrounds, and clear border delimiters.

### R2. Text-Based Color Input & Upload Logic
Remove the custom color palette swatches and selection modals from the product creation/editing forms. Replace it with a text typing input for color names (e.g., "Red", "Olive"). Ensure sizes and corresponding stock allocations can be entered and modified clearly.

### R3. Bulk CSV Product Upload & Template Download
Provide a "Bulk Upload" option in the Products Manager. Users must be able to upload a CSV containing product attributes and download a template CSV with the correct headers (such as name, SKU, price, original_price, category, colors, sizes, stock, etc.).

### R4. Product Manager & POS Terminal Redesign
Completely redesign the Products Manager and POS Terminal layouts. The POS Terminal must allow recording sales originating from **WhatsApp** and **Instagram** in addition to regular point-of-sale checkouts.

### R5. Remove DB Console & Fix Settings
Remove the SQL executor `DbConsole.tsx` completely from the workspace, sidebar navigation, and main routing. Align the Settings panel forms and controls with the existing backend configuration APIs.

## Acceptance Criteria

### Visual Design & Contrast
- [ ] No white-on-white or low-contrast invisible text blocks exist in any view.
- [ ] Admin shell sidebar, headers, panels, charts, and tables display with clean high-contrast labels and border rules.

### Product & Stock Logic
- [ ] Color selection palette is removed; color inputs are standard text typing fields.
- [ ] Bulk upload button accepts a CSV file and creates products correctly.
- [ ] "Download CSV Template" triggers download of a valid formatted template CSV.

### POS & Sales Channels
- [ ] POS terminal layout allows choosing checkout channel: "Storefront", "WhatsApp", or "Instagram".
- [ ] DB Console is completely removed from the project and sidebar links are gone.
