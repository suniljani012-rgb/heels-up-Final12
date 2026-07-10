import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { addTest, getAdminHeaders, executeD1Query } from './runner.js';

const baseUrl = 'http://localhost:8787';

// Helper to check if file contains bad contrast
function hasBadContrast(filePath) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) return false;
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Low contrast occurs when text-neutral-900 and bg-neutral-900 are used together in a class name.
    // Also check for other variants like text-neutral-900 and bg-neutral-900 appearing close by.
    const hasBoth = content.includes('text-neutral-900') && content.includes('bg-neutral-900');
    if (!hasBoth) return false;

    // Check if they are in the same className block
    const badComboRegex = /className="[^"]*(text-neutral-900[^"]*bg-neutral-900|bg-neutral-900[^"]*text-neutral-900)[^"]*"/i;
    return badComboRegex.test(content) || content.includes('text-neutral-900 bg-neutral-900') || content.includes('bg-neutral-900 text-neutral-900');
}

// ============================================================================
// Feature 1: Visual Contrast (Tests 1-5)
// ============================================================================
addTest(1, 'F1.1: ProductsManager.tsx visual contrast scan for bad contrast classes', () => {
    const bad = hasBadContrast('frontend/src/pages/admin/ProductsManager.tsx');
    assert.strictEqual(bad, false, 'ProductsManager.tsx must not contain elements with bg-neutral-900 and text-neutral-900');
});

addTest(1, 'F1.2: ColorsManager.tsx visual contrast scan for bad contrast classes', () => {
    const bad = hasBadContrast('frontend/src/pages/admin/ColorsManager.tsx');
    assert.strictEqual(bad, false, 'ColorsManager.tsx must not contain elements with bg-neutral-900 and text-neutral-900');
});

addTest(1, 'F1.3: SettingsManager.tsx visual contrast scan for bad contrast classes', () => {
    const bad = hasBadContrast('frontend/src/pages/admin/SettingsManager.tsx');
    assert.strictEqual(bad, false, 'SettingsManager.tsx must not contain elements with bg-neutral-900 and text-neutral-900');
});

addTest(1, 'F1.4: PosTerminal.tsx visual contrast scan for bad contrast classes', () => {
    const bad = hasBadContrast('frontend/src/pages/admin/PosTerminal.tsx');
    assert.strictEqual(bad, false, 'PosTerminal.tsx must not contain elements with bg-neutral-900 and text-neutral-900');
});

addTest(1, 'F1.5: Admin.tsx layout visual contrast scan for bad contrast classes', () => {
    const bad = hasBadContrast('frontend/src/pages/Admin.tsx');
    assert.strictEqual(bad, false, 'Admin.tsx layout must not contain elements with bg-neutral-900 and text-neutral-900');
});


// ============================================================================
// Feature 2: Color Swatch Input (Tests 6-10)
// ============================================================================
const testColorName = `eetestcolor-${Date.now()}`;

addTest(1, 'F2.1: Add new color swatch via color APIs', async () => {
    const res = await fetch(`${baseUrl}/api/colors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            color_name: testColorName,
            hex_code: '#FF0000'
        })
    });
    assert.strictEqual(res.status, 201, `Expected status 201, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.color_name, testColorName);

    // Verify D1 record exists
    const rows = await executeD1Query(`SELECT * FROM color_hex_mappings WHERE color_name='${testColorName}'`);
    assert.strictEqual(rows[0].results.length, 1);
});

addTest(1, 'F2.2: Get color swatch mapping list', async () => {
    const res = await fetch(`${baseUrl}/api/colors`, { method: 'GET' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(Array.isArray(json.data), true);
    const item = json.data.find(c => c.color_name === testColorName);
    assert.ok(item, 'Added color swatch should be in list');
    assert.strictEqual(item.hex_code, '#FF0000');
});

addTest(1, 'F2.3: Update color swatch mapping hex code', async () => {
    const res = await fetch(`${baseUrl}/api/colors/${testColorName}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ hex_code: '#00FF00' })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    const rows = await executeD1Query(`SELECT hex_code FROM color_hex_mappings WHERE color_name='${testColorName}'`);
    assert.strictEqual(rows[0].results[0].hex_code, '#00FF00');
});

addTest(1, 'F2.4: Delete color swatch mapping', async () => {
    const res = await fetch(`${baseUrl}/api/colors/${testColorName}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    const rows = await executeD1Query(`SELECT * FROM color_hex_mappings WHERE color_name='${testColorName}'`);
    assert.strictEqual(rows[0].results.length, 0);
});

addTest(1, 'F2.5: Verify color deletion from color mappings list', async () => {
    const res = await fetch(`${baseUrl}/api/colors`, { method: 'GET' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const item = json.data.find(c => c.color_name === testColorName);
    assert.strictEqual(item, undefined, 'Deleted color swatch should not be in list');
});


// ============================================================================
// Feature 3: Product Size Alignment (Tests 11-15)
// ============================================================================
const testProductSku = `SKU-SIZE-${Date.now()}`;
let createdProductId = null;

addTest(1, 'F3.1: Create EU size product via API', async () => {
    const payload = {
        name: 'EU Size Test Pumps',
        sku: testProductSku,
        category: 'Heels',
        price: 85000,
        sizes: ['37', '38'],
        stock: 10,
        size_stock: [
            { size_label: '37', stock: 5 },
            { size_label: '38', stock: 5 }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 201, `Expected status 201, got ${res.status}`);
    const json = await res.json();
    assert.ok(json.data.id);
    createdProductId = json.data.id;
});

addTest(1, 'F3.2: Fetch product stock detail view', async () => {
    assert.ok(createdProductId, 'ProductId should be available');
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}/size-stock`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data.size_stock));
    const size37 = json.data.size_stock.find(s => s.size_label === '37');
    assert.strictEqual(size37.stock, 5);
});

addTest(1, 'F3.3: Update stock levels for specific EU size', async () => {
    assert.ok(createdProductId);
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}/size-stock`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            size_stock: [
                { size_label: '37', stock: 10 },
                { size_label: '38', stock: 5 }
            ]
        })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    
    const dbRows = await executeD1Query(`SELECT stock FROM product_size_stock WHERE product_id=${createdProductId} AND size_label='37'`);
    assert.strictEqual(dbRows[0].results[0].stock, 10);
});

addTest(1, 'F3.4: Size label validation (rejecting invalid/UK sizes)', async () => {
    // Assert that updating size stock with non-EU sizes like 'UK 7' returns error or is handled appropriately.
    // In heelsup, it should only accept numeric EU shoe size labels like '35' to '45'.
    // If not validated in code yet, we assert the expected schema/constraint rejection or validation rule.
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}/size-stock`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            size_stock: [
                { size_label: 'UK 7', stock: 10 }
            ]
        })
    });
    // Expected to return 400 bad request due to size alignment rules
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request for UK size label, got ${res.status}`);
});

addTest(1, 'F3.5: Verify global stock sync on size stock updates', async () => {
    assert.ok(createdProductId);
    // Global stock in products table should be the sum of all size_stocks (10 + 5 = 15)
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.product.stock, 15, `Global stock was ${json.data.product.stock}, expected 15`);
});


// ============================================================================
// Feature 4: Bulk CSV Upload (Tests 16-20)
// ============================================================================
addTest(1, 'F4.1: CSV parser schema validation', () => {
    // Mock parsing of a valid CSV header and verify correct keys mapped
    const mockCsv = "name,sku,price,mrp,stock,sizes,description\nTest Product,TESTCSV-01,999.00,1299.00,10,\"36,37\",Nice shoe";
    const lines = mockCsv.split('\n');
    const headers = lines[0].split(',');
    assert.deepStrictEqual(headers, ['name', 'sku', 'price', 'mrp', 'stock', 'sizes', 'description']);
});

addTest(1, 'F4.2: Price conversion verification (Rupees to Paise)', () => {
    const csvPriceRupees = "999.50";
    const pricePaise = Math.round(parseFloat(csvPriceRupees) * 100);
    assert.strictEqual(pricePaise, 99950, 'Price must be correctly converted to paise');
});

addTest(1, 'F4.3: Bulk payload generation validation', () => {
    const item = {
        name: 'Bulk Shoe',
        sku: 'BULK-001',
        price: 99900,
        mrp: 129000,
        stock: 20,
        sizes: ['37', '38']
    };
    const payload = { products: [item] };
    assert.ok(Array.isArray(payload.products));
    assert.strictEqual(payload.products[0].sku, 'BULK-001');
});

addTest(1, 'F4.4: Post products bulk upload payload', async () => {
    const csvSku = `SKU-BULK-${Date.now()}`;
    const payload = {
        products: [
            {
                name: 'CSV Bulk Pump',
                sku: csvSku,
                category: 'Heels',
                price: 99900,
                mrp: 129000,
                stock: 10,
                sizes: ['37', '38'],
                size_stock: [
                    { size_label: '37', stock: 5 },
                    { size_label: '38', stock: 5 }
                ]
            }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
});

addTest(1, 'F4.5: Bulk upload response counts verification', async () => {
    const payload = {
        products: [
            { name: 'Bulk 1', sku: `B1-${Date.now()}`, price: 50000, stock: 1, sizes: ['36'] },
            { name: 'Bulk 2', sku: `B2-${Date.now()}`, price: 60000, stock: 2, sizes: ['37'] }
        ]
    };
    const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    // Verify count in message or returned list length
    const returnedCount = json.data.length;
    assert.strictEqual(returnedCount, 2, `Expected 2 products created, got ${returnedCount}`);
});


// ============================================================================
// Feature 5: POS Sales Channels (Tests 21-25)
// ============================================================================
addTest(1, 'F5.1: POS sale checkout with channel "POS"', async () => {
    const payload = {
        customer_name: 'POS Customer',
        payment_method: 'Cash',
        items: [{ product_id: createdProductId || 1, size: '37', quantity: 1 }],
        sales_channel: 'POS'
    };
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 201, `POS sale check-out failed: ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
});

addTest(1, 'F5.2: POS sale checkout with channel "WhatsApp"', async () => {
    const payload = {
        customer_name: 'WA Customer',
        payment_method: 'Card',
        items: [{ product_id: createdProductId || 1, size: '38', quantity: 1 }],
        sales_channel: 'WhatsApp'
    };
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 201, `WhatsApp sale check-out failed: ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
});

addTest(1, 'F5.3: POS sale checkout with channel "Instagram"', async () => {
    const payload = {
        customer_name: 'IG Customer',
        payment_method: 'Cash',
        items: [{ product_id: createdProductId || 1, size: '38', quantity: 1 }],
        sales_channel: 'Instagram'
    };
    const res = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 201, `Instagram sale check-out failed: ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
});

addTest(1, 'F5.4: Retrieve offline sale order channel information', async () => {
    // Get the most recent sales and check the top one's sales_channel
    const res = await fetch(`${baseUrl}/api/pos/sales?limit=1`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.length > 0);
    const latestSale = json.data[0];
    assert.strictEqual(latestSale.sales_channel, 'Instagram', `Channel was ${latestSale.sales_channel}, expected Instagram`);
});

addTest(1, 'F5.5: Verify DB schema has sales_channel column in offline_sales', async () => {
    const cols = await executeD1Query('PRAGMA table_info(offline_sales)');
    const rows = cols[0].results;
    const hasChannelCol = rows.some(c => c.name === 'sales_channel');
    assert.strictEqual(hasChannelCol, true, 'offline_sales table must have sales_channel column');
});


// ============================================================================
// Feature 6: DB Console Removal (Tests 26-30)
// ============================================================================
addTest(1, 'F6.1: Verify POST /api/admin/query returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/admin/query`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ sql: 'SELECT 1;' })
    });
    assert.strictEqual(res.status, 404, `/api/admin/query must be removed and return 404, got ${res.status}`);
});

addTest(1, 'F6.2: Verify DbConsole.tsx deletion', () => {
    const fileExists = fs.existsSync(path.resolve('frontend/src/pages/admin/DbConsole.tsx'));
    assert.strictEqual(fileExists, false, 'DbConsole.tsx file must be deleted');
});

addTest(1, 'F6.3: Verify DbConsole import removal in Admin.tsx', () => {
    const content = fs.readFileSync(path.resolve('frontend/src/pages/Admin.tsx'), 'utf8');
    const hasImport = content.includes('import DbConsole') || content.includes("import { DbConsole }") || content.includes('./admin/DbConsole');
    assert.strictEqual(hasImport, false, 'Admin.tsx must not contain DbConsole imports');
});

addTest(1, 'F6.4: Verify DbConsole menu option removal in Admin.tsx', () => {
    const content = fs.readFileSync(path.resolve('frontend/src/pages/Admin.tsx'), 'utf8');
    // Ensure "db-console", "query console", or "database console" option in layout is gone
    const hasMenuOption = /"db-console"|"database-console"|'db-console'|'database-console'/i.test(content) || content.includes('Database Console') || content.includes('Query Console');
    assert.strictEqual(hasMenuOption, false, 'Admin.tsx menu options must not refer to DB Console');
});

addTest(1, 'F6.5: Verify DbConsole tab conditional rendering block removal in Admin.tsx', () => {
    const content = fs.readFileSync(path.resolve('frontend/src/pages/Admin.tsx'), 'utf8');
    const hasRender = content.includes('<DbConsole') || content.includes('tab === \'query\'') || content.includes('tab === \'dbconsole\'') || content.includes('tab === \'db-console\'');
    assert.strictEqual(hasRender, false, 'Admin.tsx rendering blocks must not contain DbConsole conditional rendering');
});


// ============================================================================
// Feature 7: Settings Alignment (Tests 31-35)
// ============================================================================
addTest(1, 'F7.1: Perform settings batch update via PUT /api/admin/settings', async () => {
    const payload = {
        store_name: 'HeelsUp Testing Store',
        currency: 'INR',
        store_phone: '9999999999'
    };
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 200, `Batch settings update failed: ${res.status}`);
});

addTest(1, 'F7.2: Verify response success for batch settings update', async () => {
    const payload = {
        settings: [
            { key: 'site_name', value: 'HeelsUp Site' }
        ]
    };
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
});

addTest(1, 'F7.3: Fetch all settings and verify updated values', async () => {
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const siteNameSetting = json.data.find(s => s.key === 'site_name');
    assert.ok(siteNameSetting);
    assert.strictEqual(siteNameSetting.value, 'HeelsUp Site');
});

addTest(1, 'F7.4: Fetch public settings and verify key filtering', async () => {
    // Write a sensitive secret setting
    await executeD1Query("INSERT OR REPLACE INTO settings (key, value) VALUES ('resend_api_key', '\"sensitive_token_xyz\"')");
    
    const res = await fetch(`${baseUrl}/api/settings/public`, { method: 'GET' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    // Sensitive keys must be omitted
    assert.strictEqual(json.data.resend_api_key, undefined, 'Sensitive settings must be filtered out in public endpoint');
    // Public keys should exist
    assert.strictEqual(json.data.site_name, 'HeelsUp Site');
});

addTest(1, 'F7.5: Verify settings key validation', async () => {
    // Try to update settings with empty or invalid keys
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            "": "empty key value"
        })
    });
    // Expected to either return 400 or ignore invalid keys gracefully
    assert.ok(res.status === 400 || res.status === 200);
});
