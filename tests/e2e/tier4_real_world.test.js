import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { addTest, getAdminHeaders, executeD1Query } from './runner.js';

const baseUrl = 'http://localhost:8787';

// ============================================================================
// Tier 4: Real-World Application Workflows (Tests 78-82)
// ============================================================================

addTest(4, '78. Complete Product Lifecycle (Bulk CSV upload -> check sizes -> edit EU size stock -> verify sync)', async () => {
    // 1. Bulk CSV upload of a product
    const sku = `SKU-LIFE-${Date.now()}`;
    const uploadRes = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            products: [
                {
                    name: 'Lifecycle Shoe',
                    sku,
                    category: 'Heels',
                    price: 95000,
                    stock: 6,
                    sizes: ['37', '38'],
                    size_stock: [
                        { size_label: '37', stock: 3 },
                        { size_label: '38', stock: 3 }
                    ]
                }
            ]
        })
    });
    assert.strictEqual(uploadRes.status, 200);
    const uploadJson = await uploadRes.json();
    const pid = uploadJson.data[0].id;

    // 2. Check size list is correct
    const checkRes = await fetch(`${baseUrl}/api/products/${pid}`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    const checkJson = await checkRes.json();
    assert.deepStrictEqual(checkJson.data.product.sizes, ['37', '38']);

    // 3. Edit EU size stock (change size 38 from 3 to 10)
    const editRes = await fetch(`${baseUrl}/api/products/${pid}/size-stock`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            size_stock: [
                { size_label: '37', stock: 3 },
                { size_label: '38', stock: 10 }
            ]
        })
    });
    assert.strictEqual(editRes.status, 200);

    // 4. Verify sync (global stock should be 13)
    const finalRes = await fetch(`${baseUrl}/api/products/${pid}`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    const finalJson = await finalRes.json();
    assert.strictEqual(finalJson.data.product.stock, 13);
});

addTest(4, '79. POS Storefront Sale (Reserve stock -> POS sale -> verify stock reduction -> check negative stock prevention)', async () => {
    // 1. Create product with stock 5
    const sku = `SKU-POSSALE-${Date.now()}`;
    const pRes = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            name: 'POS Storefront Pump',
            sku,
            category: 'Heels',
            price: 75000,
            sizes: ['37'],
            stock: 5,
            size_stock: [{ size_label: '37', stock: 5 }]
        })
    });
    const pJson = await pRes.json();
    const pid = pJson.data.id;

    // 2. Perform POS sale of 2 items
    const saleRes = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            customer_name: 'Storefront Client',
            items: [{ product_id: pid, size: '37', quantity: 2 }],
            sales_channel: 'POS'
        })
    });
    assert.strictEqual(saleRes.status, 201);

    // 3. Verify stock reduction (size stock 3, global stock 3)
    const stockRes = await fetch(`${baseUrl}/api/products/${pid}/size-stock`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    const stockJson = await stockRes.json();
    const size37 = stockJson.data.size_stock.find(s => s.size_label === '37');
    assert.strictEqual(size37.stock, 3);

    // 4. Prevent negative stock (try to sell 4 when only 3 are in stock)
    const badSaleRes = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            customer_name: 'Storefront Overdraft Client',
            items: [{ product_id: pid, size: '37', quantity: 4 }],
            sales_channel: 'POS'
        })
    });
    assert.strictEqual(badSaleRes.status, 400, 'Exceeded stock sale must be blocked with 400');
});

addTest(4, '80. Social Media Order (WhatsApp sale checkout -> Instagram checkout -> verify bill numbering and channels)', async () => {
    // 1. WhatsApp sale checkout
    const waRes = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            customer_name: 'WhatsApp Buyer',
            items: [{ product_id: 1, size: 'Default', quantity: 1 }],
            sales_channel: 'WhatsApp'
        })
    });
    assert.strictEqual(waRes.status, 201);
    const waJson = await waRes.json();
    const waBill = waJson.data.bill_number;
    const waId = waJson.data.sale_id;

    // 2. Instagram sale checkout
    const igRes = await fetch(`${baseUrl}/api/pos/sale`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            customer_name: 'Instagram Buyer',
            items: [{ product_id: 1, size: 'Default', quantity: 1 }],
            sales_channel: 'Instagram'
        })
    });
    assert.strictEqual(igRes.status, 201);
    const igJson = await igRes.json();
    const igBill = igJson.data.bill_number;
    const igId = igJson.data.sale_id;

    // 3. Verify bill numbering uniqueness and channel validation
    assert.notStrictEqual(waBill, igBill);

    const waDb = await executeD1Query(`SELECT sales_channel FROM offline_sales WHERE id=${waId}`);
    assert.strictEqual(waDb[0].results[0].sales_channel, 'WhatsApp');

    const igDb = await executeD1Query(`SELECT sales_channel FROM offline_sales WHERE id=${igId}`);
    assert.strictEqual(igDb[0].results[0].sales_channel, 'Instagram');
});

addTest(4, '81. Admin System Clean-Up (settings update -> query endpoint blocked -> verify files clean of console)', async () => {
    // 1. Settings update works
    const resSettings = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ store_email: 'support@heelsup.in' })
    });
    assert.strictEqual(resSettings.status, 200);

    // 2. Query endpoint blocked (404)
    const resQuery = await fetch(`${baseUrl}/api/admin/query`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ sql: 'SELECT 1;' })
    });
    assert.strictEqual(resQuery.status, 404);

    // 3. DbConsole file does not exist
    const dbConsolePath = path.resolve('frontend/src/pages/admin/DbConsole.tsx');
    assert.strictEqual(fs.existsSync(dbConsolePath), false, 'DbConsole.tsx file must not exist');

    // 4. Admin.tsx is clean of DbConsole references
    const adminContent = fs.readFileSync(path.resolve('frontend/src/pages/Admin.tsx'), 'utf8');
    const hasConsoleRef = adminContent.includes('DbConsole') || adminContent.includes('Database Console') || adminContent.includes('Query Console');
    assert.strictEqual(hasConsoleRef, false, 'Admin.tsx must be clean of DbConsole references');
});

addTest(4, '82. Inventory Refactor (CSV upload -> edit stock levels -> check overall inventory logs)', async () => {
    // 1. Bulk CSV upload of product
    const sku = `SKU-REFACT-${Date.now()}`;
    const uploadRes = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            products: [
                {
                    name: 'Inventory Log Refactor Product',
                    sku,
                    category: 'Heels',
                    price: 49900,
                    stock: 5,
                    sizes: ['37']
                }
            ]
        })
    });
    assert.strictEqual(uploadRes.status, 200);
    const uploadJson = await uploadRes.json();
    const pid = uploadJson.data[0].id;

    // 2. Edit stock levels
    const editRes = await fetch(`${baseUrl}/api/products/${pid}/size-stock`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
            size_stock: [{ size_label: '37', stock: 12 }]
        })
    });
    assert.strictEqual(editRes.status, 200);

    // 3. Check overall inventory logs in database
    const logs = await executeD1Query(`SELECT * FROM inventory_log WHERE product_id=${pid} ORDER BY id DESC`);
    const results = logs[0].results;
    assert.ok(results.length > 0, 'Inventory changes must be recorded in inventory_log');
});
