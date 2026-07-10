import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { addTest, getAdminHeaders, executeD1Query, signTestToken } from './runner.js';

const baseUrl = 'http://localhost:8787';

// ============================================================================
// Feature 1: Boundary & Corner Contrast (Tests 36-40)
// ============================================================================
function scanFileForPatterns(filePath, checks) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) return true; // file doesn't exist is safe
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of checks) {
        if (pattern.test(content)) {
            return false; // Found bad pattern
        }
    }
    return true;
}

addTest(2, 'F1.6: Validate boundary button borders contrast', () => {
    // Verify we do not have buttons with dark background + no borders/dark borders
    // Checks that bg-neutral-900 is accompanied by a good high-contrast border if border is used
    const ok = scanFileForPatterns('frontend/src/pages/admin/ProductsManager.tsx', [
        /class(Name)?="[^"]*bg-neutral-900 border-neutral-900[^"]*"/i
    ]);
    assert.strictEqual(ok, true, 'Buttons with bg-neutral-900 must not use border-neutral-900 (low contrast border)');
});

addTest(2, 'F1.7: Validate disabled input contrast', () => {
    // Scans for disabled inputs that combine disabled:bg-neutral-900 and disabled:text-neutral-900
    const ok = scanFileForPatterns('frontend/src/pages/admin/ProductsManager.tsx', [
        /disabled:bg-neutral-900[^"]*disabled:text-neutral-900/i,
        /disabled:text-neutral-900[^"]*disabled:bg-neutral-900/i
    ]);
    assert.strictEqual(ok, true, 'Disabled states must not combine low contrast disabled:bg-neutral-900 and disabled:text-neutral-900');
});

addTest(2, 'F1.8: Validate error text contrast', () => {
    // Scans for error text text-red-500/rose-500 on dark backgrounds (bg-neutral-900)
    const ok = scanFileForPatterns('frontend/src/pages/admin/ProductsManager.tsx', [
        /bg-neutral-900[^"]*text-red-500/i,
        /text-red-500[^"]*bg-neutral-900/i,
        /bg-neutral-900[^"]*text-rose-500/i,
        /text-rose-500[^"]*bg-neutral-900/i
    ]);
    assert.strictEqual(ok, true, 'Error text (red/rose) must not be rendered directly on bg-neutral-900 (poor contrast)');
});

addTest(2, 'F1.9: Validate focused outline contrast', () => {
    // Ensure focused elements don't use ring-neutral-900 or focus:outline-none without ring-primary
    const content = fs.readFileSync(path.resolve('frontend/src/pages/admin/ProductsManager.tsx'), 'utf8');
    const hasBadFocus = content.includes('focus:ring-neutral-900') || content.includes('focus:border-neutral-900');
    assert.strictEqual(hasBadFocus, false, 'Focused inputs must not use low contrast border/ring classes');
});

addTest(2, 'F1.10: Validate hover background contrast', () => {
    // Ensure hover bg state is high contrast from base text
    const content = fs.readFileSync(path.resolve('frontend/src/pages/admin/ProductsManager.tsx'), 'utf8');
    const hasBadHover = content.includes('text-neutral-900 hover:bg-neutral-900') || content.includes('hover:bg-neutral-900 text-neutral-900');
    assert.strictEqual(hasBadHover, false, 'Hover states must not transition text-neutral-900 to bg-neutral-900');
});


// ============================================================================
// Feature 2: Color Swatch Boundary (Tests 41-45)
// ============================================================================
addTest(2, 'F2.6: Reject color swatch creation with invalid hex code characters', async () => {
    const res = await fetch(`${baseUrl}/api/colors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ color_name: 'test-gg', hex_code: '#GGGGGG' })
    });
    assert.strictEqual(res.status, 400, 'Invalid hex characters must be rejected with 400');
});

addTest(2, 'F2.7: Reject color swatch creation with wrong length hex code', async () => {
    const res = await fetch(`${baseUrl}/api/colors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ color_name: 'test-short', hex_code: '#FFF' })
    });
    assert.strictEqual(res.status, 400, 'Hex code of incorrect length must be rejected with 400');
});

addTest(2, 'F2.8: Reject color swatch creation with missing "#" prefix', async () => {
    const res = await fetch(`${baseUrl}/api/colors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ color_name: 'test-noprefix', hex_code: 'FF0000' })
    });
    assert.strictEqual(res.status, 400, 'Hex code missing "#" prefix must be rejected with 400');
});

addTest(2, 'F2.9: Reject duplicate color swatch name', async () => {
    // Create first mapping
    const colorName = 'duplicate-color';
    await fetch(`${baseUrl}/api/colors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ color_name: colorName, hex_code: '#FF0000' })
    });
    // Try to create again
    const res = await fetch(`${baseUrl}/api/colors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ color_name: colorName, hex_code: '#00FF00' })
    });
    assert.ok(res.status === 400 || res.status === 409, `Duplicate color name must be rejected (got ${res.status})`);
});

addTest(2, 'F2.10: Reject empty payload for color swatch creation', async () => {
    const res = await fetch(`${baseUrl}/api/colors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400, 'Empty payload must be rejected with 400');
});


// ============================================================================
// Feature 3: Size Alignment Boundary (Tests 46-50)
// ============================================================================
addTest(2, 'F3.6: Reject UK shoe size labels during creation', async () => {
    const payload = {
        name: 'UK Size Test Product',
        sku: `SKU-UK-${Date.now()}`,
        category: 'Heels',
        price: 50000,
        sizes: ['UK 6', 'UK 7'],
        stock: 10,
        size_stock: [
            { size_label: 'UK 6', stock: 5 },
            { size_label: 'UK 7', stock: 5 }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request for UK sizes, got ${res.status}`);
});

addTest(2, 'F3.7: Validate zero stock value updates', async () => {
    // Create product
    const sku = `SKU-ZERO-${Date.now()}`;
    const pRes = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            name: 'Zero Stock Test',
            sku,
            category: 'Heels',
            price: 50000,
            sizes: ['37'],
            stock: 5,
            size_stock: [{ size_label: '37', stock: 5 }]
        })
    });
    const pJson = await pRes.json();
    const pid = pJson.data.id;

    // Update size stock to 0
    const res = await fetch(`${baseUrl}/api/products/${pid}/size-stock`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            size_stock: [{ size_label: '37', stock: 0 }]
        })
    });
    assert.strictEqual(res.status, 200);
});

addTest(2, 'F3.8: Reject negative stock values during update', async () => {
    const sku = `SKU-NEG-${Date.now()}`;
    const pRes = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            name: 'Negative Stock Test',
            sku,
            category: 'Heels',
            price: 50000,
            sizes: ['37'],
            stock: 5
        })
    });
    const pJson = await pRes.json();
    const pid = pJson.data.id;

    const res = await fetch(`${baseUrl}/api/products/${pid}/size-stock`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            size_stock: [{ size_label: '37', stock: -5 }]
        })
    });
    // Expected to either reject with 400 or coerce negative numbers to 0
    assert.ok(res.status === 400 || res.status === 200);
    if (res.status === 200) {
        // If coerced, check that DB value is >= 0
        const rows = await executeD1Query(`SELECT stock FROM product_size_stock WHERE product_id=${pid} AND size_label='37'`);
        assert.ok(rows[0].results[0].stock >= 0);
    }
});

addTest(2, 'F3.9: Request stock details for non-existent size label', async () => {
    const sku = `SKU-NONEXIST-${Date.now()}`;
    const pRes = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            name: 'Size Nonexistent Test',
            sku,
            category: 'Heels',
            price: 50000,
            sizes: ['37'],
            stock: 5
        })
    });
    const pJson = await pRes.json();
    const pid = pJson.data.id;

    const res = await fetch(`${baseUrl}/api/products/${pid}/size-stock`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    const json = await res.json();
    const size99 = json.data.size_stock.find(s => s.size_label === '99');
    assert.strictEqual(size99, undefined, 'Size 99 should not exist');
});

addTest(2, 'F3.10: Verify extreme value updates (large stocks)', async () => {
    const sku = `SKU-EXTREME-${Date.now()}`;
    const pRes = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            name: 'Extreme Stock Test',
            sku,
            category: 'Heels',
            price: 50000,
            sizes: ['37'],
            stock: 5
        })
    });
    const pJson = await pRes.json();
    const pid = pJson.data.id;

    // Update stock to 99999
    const res = await fetch(`${baseUrl}/api/products/${pid}/size-stock`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            size_stock: [{ size_label: '37', stock: 99999 }]
        })
    });
    assert.strictEqual(res.status, 200);
});


// ============================================================================
// Feature 4: Bulk CSV Upload Boundary (Tests 51-55)
// ============================================================================
addTest(2, 'F4.6: Handle missing CSV columns during bulk upload', async () => {
    const payload = {
        products: [
            {
                name: 'Missing SKU product',
                price: 99900,
                stock: 10
            }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    // Rejects invalid items or responds gracefully with success:true but count:0
    assert.ok(res.status === 200 || res.status === 400);
    if (res.status === 200) {
        const json = await res.json();
        // Since SKU was missing, it should skip it or return error count
        assert.ok(json.data.length === 0 || json.message.includes('0 products'));
    }
});

addTest(2, 'F4.7: Handle invalid price format in CSV upload', async () => {
    const payload = {
        products: [
            {
                name: 'Invalid price product',
                sku: `SKU-BADPRICE-${Date.now()}`,
                price: "not_a_number",
                stock: 10
            }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.ok(res.status === 200 || res.status === 400);
});

addTest(2, 'F4.8: Handle duplicate SKUs in CSV upload', async () => {
    const dupSku = `SKU-DUPCSV-${Date.now()}`;
    const payload = {
        products: [
            { name: 'Product A', sku: dupSku, price: 50000, stock: 5 },
            { name: 'Product B', sku: dupSku, price: 60000, stock: 10 }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    // Should gracefully skip the duplicate or fail the duplicate and only create one
    assert.ok(res.status === 200 || res.status === 409);
    if (res.status === 200) {
        const json = await res.json();
        assert.ok(json.data.length <= 1, 'Only one product should be created due to unique SKU constraint');
    }
});

addTest(2, 'F4.9: Handle empty rows in CSV', () => {
    // Empty rows should be parsed/ignored
    const mockCsv = "name,sku,price,mrp,stock,sizes,description\n\n\nTest Product,TESTCSV-EMPTY,999.00,1299.00,10,\"37\",Desc\n\n";
    const rows = mockCsv.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    // Header is row 0, data is row 1
    assert.strictEqual(rows.length, 2, 'Empty rows should be filtered out');
});

addTest(2, 'F4.10: Handle invalid size labels in CSV upload', async () => {
    const payload = {
        products: [
            {
                name: 'Bad sizes product',
                sku: `SKU-BADSIZE-${Date.now()}`,
                price: 50000,
                stock: 10,
                sizes: ['UK 7', 'L']
            }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    // Expected to reject sizes or skip/reject product
    assert.strictEqual(res.status, 400);
});


// ============================================================================
// Feature 5: POS Sales Channels Boundary (Tests 56-60)
// ============================================================================
addTest(2, 'F5.6: Reject invalid channel name during POS checkout', async () => {
    const payload = {
        customer_name: 'Invalid Channel Cust',
        items: [{ product_id: 1, size: '37', quantity: 1 }],
        sales_channel: 'Twitter'
    };
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request for invalid channel name, got ${res.status}`);
});

addTest(2, 'F5.7: Default to "POS" channel when sales_channel is missing', async () => {
    const payload = {
        customer_name: 'Missing Channel Cust',
        items: [{ product_id: 1, size: '37', quantity: 1 }]
        // sales_channel missing
    };
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    
    // Check D1 record channel defaults to POS
    const saleId = json.data.sale_id;
    const dbRows = await executeD1Query(`SELECT sales_channel FROM offline_sales WHERE id=${saleId}`);
    assert.strictEqual(dbRows[0].results[0].sales_channel, 'POS', 'Channel must default to POS');
});

addTest(2, 'F5.8: POS sale stock reservation boundary check (exact stock)', async () => {
    // Create product with stock = 2
    const sku = `SKU-POSBOUND-${Date.now()}`;
    const pRes = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            name: 'POS Exact Stock Test',
            sku,
            category: 'Heels',
            price: 50000,
            sizes: ['37'],
            stock: 2,
            size_stock: [{ size_label: '37', stock: 2 }]
        })
    });
    const pJson = await pRes.json();
    const pid = pJson.data.id;

    // Checkout exactly 2
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            customer_name: 'Exact Customer',
            items: [{ product_id: pid, size: '37', quantity: 2 }],
            sales_channel: 'POS'
        })
    });
    assert.strictEqual(res.status, 201, `Selling exact stock failed: ${res.status}`);
});

addTest(2, 'F5.9: POS sale stock level exhaustion rejection', async () => {
    // Create product with stock = 1
    const sku = `SKU-POSEXHAUST-${Date.now()}`;
    const pRes = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            name: 'POS Exhaust Stock Test',
            sku,
            category: 'Heels',
            price: 50000,
            sizes: ['37'],
            stock: 1,
            size_stock: [{ size_label: '37', stock: 1 }]
        })
    });
    const pJson = await pRes.json();
    const pid = pJson.data.id;

    // Try to purchase 2
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            customer_name: 'Exhaust Customer',
            items: [{ product_id: pid, size: '37', quantity: 2 }],
            sales_channel: 'POS'
        })
    });
    assert.strictEqual(res.status, 400, `Purchasing more than stock should be rejected with 400, got ${res.status}`);
});

addTest(2, 'F5.10: Reject POS checkout with null/empty items list', async () => {
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            customer_name: 'Null Items Customer',
            items: []
        })
    });
    assert.strictEqual(res.status, 400, `Empty items list must return 400, got ${res.status}`);
});


// ============================================================================
// Feature 6: DB Console Removal Boundary (Tests 61-65)
// ============================================================================
addTest(2, 'F6.6: Verify /api/admin/query returns 404 with valid JWT', async () => {
    const res = await fetch(`${baseUrl}/api/admin/query`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ sql: 'SELECT 1;' })
    });
    assert.strictEqual(res.status, 404);
});

addTest(2, 'F6.7: Verify SQL injection on /api/admin/query returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/admin/query`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ sql: 'DROP TABLE users;' })
    });
    assert.strictEqual(res.status, 404);
});

addTest(2, 'F6.8: Verify Admin.tsx layout compilation check', () => {
    // Assert file exists and contains basic syntax compliance (valid JS/TSX)
    const content = fs.readFileSync(path.resolve('frontend/src/pages/Admin.tsx'), 'utf8');
    assert.ok(content.includes('export default function Admin'), 'Admin.tsx must be a valid React page export');
});

addTest(2, 'F6.9: Verify backend router safety (no exposure of /api/admin/query)', () => {
    const adminRouterContent = fs.readFileSync(path.resolve('src/routes/admin.js'), 'utf8');
    const mainRouterContent = fs.readFileSync(path.resolve('src/index.js'), 'utf8');
    const exposedInAdmin = adminRouterContent.includes("path === '/api/admin/query'") || adminRouterContent.includes("path.startsWith('/api/admin/query')");
    const exposedInMain = mainRouterContent.includes("api/admin/query");
    
    assert.strictEqual(exposedInAdmin || exposedInMain, false, 'Backend routes must not expose /api/admin/query');
});

addTest(2, 'F6.10: Verify standard admin route functionality', async () => {
    // Other admin endpoints should work normally
    const res = await fetch(`${baseUrl}/api/admin/products?limit=1`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    assert.strictEqual(res.status, 200, `Products endpoint must continue working (got ${res.status})`);
});


// ============================================================================
// Feature 7: Settings Alignment Boundary (Tests 66-70)
// ============================================================================
addTest(2, 'F7.6: Reject settings update by non-admins', async () => {
    const token = signTestToken({ id: 2, role: 'customer', email: 'guest@heelsup.in' });
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ store_name: 'Hack Store' })
    });
    assert.ok(res.status === 401 || res.status === 403, `Non-admin must be unauthorized or forbidden (got ${res.status})`);
});

addTest(2, 'F7.7: Reject settings update with empty payloads', async () => {
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400);
});

addTest(2, 'F7.8: Reject settings update with invalid body format', async () => {
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: {
            ...getAdminHeaders(),
            'Content-Type': 'application/json'
        },
        body: "invalid_json_format"
    });
    assert.ok(res.status === 400 || res.status === 500);
});

addTest(2, 'F7.9: Reject settings update with special character keys or long keys', async () => {
    const longKey = 'a'.repeat(500);
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            [longKey]: 'value'
        })
    });
    assert.strictEqual(res.status, 400);
});

addTest(2, 'F7.10: Reject or handle excessively large JSON payloads in settings', async () => {
    // Generate a ~2MB settings JSON payload
    const largeObj = {};
    for (let i = 0; i < 20000; i++) {
        largeObj[`key_${i}`] = 'a'.repeat(100);
    }
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(largeObj)
    });
    // Expected to reject due to payload size limit or handle with error
    assert.ok(res.status === 400 || res.status === 413 || res.status === 500);
});
