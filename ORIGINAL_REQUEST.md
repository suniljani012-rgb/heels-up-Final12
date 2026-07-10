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

## Follow-up — 2026-07-10T17:50:53+05:30

Enhance and complete the HeelsUp Boutique E-commerce application (storefront and backend APIs) to include all missing core e-commerce capabilities. Perform a comprehensive analysis of the existing features and implement the identified gaps to build a perfect, fully featured, secure, and blazing-fast e-commerce website.

Working directory: C:\Users\Cyrix HealthCare\Documents\antigravity\fearless-meitner
Integrity mode: development

## Requirements

### R1. Complete Storefront Features
Analyze and implement missing e-commerce storefront features:
- **Global Search Bar**: Add a functional search input in the main navbar that redirects to the Shop page with query parameters and displays matched items.
- **Product Filtering & Sorting**: On the Shop page, enable advanced filtering by Size (e.g. UK 36, 37, 38, etc.), Color (based on database color map), Price Range (min/max), and sorting by Rating, Price (Ascending/Descending), and Newest arrivals.
- **Product Reviews & Ratings**: On the Product detail page, allow logged-in users to submit ratings (1-5 stars) and comments. Render reviews list and compute average ratings dynamically.
- **Visual Order Tracking**: On the Profile page, display a visual step-by-step progress tracker for all past orders showing status transitions (Placed -> Shipped -> Out for Delivery -> Delivered).

### R2. Backend APIs & Data Integrity
Ensure all backend API routes support the new features:
- **Reviews API**: Implement `POST /api/products/:id/reviews` to securely submit reviews and `GET /api/products/:id/reviews` to retrieve them.
- **Query & Order Security**: Sanitize all client-side inputs (prevent SQL injections) and validate stock levels accurately before generating orders.

### R3. Performance Optimizations
Align all data loading to feel preloaded (under 0.02ms for cached queries) by leveraging the `frame_ant.js` preloading caches for products list, shop filters, and profile logs.

## Acceptance Criteria

### Storefront Functionality
- [ ] Users can search, filter, and sort products seamlessly on the storefront.
- [ ] Product detail page displays rating stars, average ratings, and reviews from real database queries.
- [ ] Order details page shows a premium visual timeline/progress bar.

### Backend & API Security
- [ ] New APIs compile successfully and handle database read/writes securely.
- [ ] All page routes build with zero typescript compilation errors.
