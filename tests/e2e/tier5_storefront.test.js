import assert from 'node:assert';
import { addTest, getAdminHeaders, executeD1Query, signTestToken } from './runner.js';

const baseUrl = 'http://localhost:8787';

// Test 83: Storefront Search
addTest(5, '83. Storefront Search (Search query matching name/description)', async () => {
    // 1. Fetch products with search query 'stiletto'
    const res = await fetch(`${baseUrl}/api/products?search=stiletto`, { method: 'GET' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
    
    // 2. Validate that returned products match the search term
    for (const prod of json.data) {
        const matchesName = prod.name.toLowerCase().includes('stiletto');
        const matchesDesc = prod.description.toLowerCase().includes('stiletto');
        assert.ok(matchesName || matchesDesc, `Product "${prod.name}" should match search term`);
    }
});

// Test 84: Storefront Filtering and Sorting
addTest(5, '84. Storefront Filtering and Sorting (Category filter, price boundary, price_low sorting)', async () => {
    // Heels category, price between 500 and 250000, sorted by price ascending (price_low)
    const url = `${baseUrl}/api/products?category=Heels&min_price=500&max_price=250000&sort=price_low`;
    const res = await fetch(url, { method: 'GET' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const products = json.data;
    assert.ok(Array.isArray(products));
    
    let lastPrice = 0;
    for (const prod of products) {
        // Category check
        assert.strictEqual(prod.category.toLowerCase(), 'heels');
        // Price boundary check
        assert.ok(prod.price >= 500 && prod.price <= 250000, `Price ${prod.price} must be within bounds [500, 250000]`);
        // Sorting check (ascending)
        assert.ok(prod.price >= lastPrice, `Products must be sorted in ascending order of price: ${prod.price} vs ${lastPrice}`);
        lastPrice = prod.price;
    }
});

// Test 85: Storefront Product Reviews Approval Flow
addTest(5, '85. Storefront Product Reviews (Submit review -> Check pending -> Approve review -> Verify public visibility)', async () => {
    // Seed user with ID 99 to prevent foreign key violation
    await executeD1Query(
        `INSERT OR IGNORE INTO users (id, first_name, email, password_hash, role, email_verified, created_at, updated_at) 
         VALUES (99, 'Reviewer', 'reviewer@heelsup.in', 'dummyhash', 'customer', 1, datetime('now'), datetime('now'))`
    );

    const userToken = signTestToken({ id: 99, role: 'customer', email: 'reviewer@heelsup.in' });
    
    // Step 1: Submit review
    const resSubmit = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            product_id: 1,
            rating: 5,
            title: 'Fantastic Fit',
            body: 'Extremely comfortable and stylish.',
            order_id: 123
        })
    });
    assert.strictEqual(resSubmit.status, 201);
    
    // Step 2: Retrieve admin reviews list to find the review ID
    const resAdminList = await fetch(`${baseUrl}/api/reviews/admin/all`, {
        method: 'GET',
        headers: getAdminHeaders()
    });
    assert.strictEqual(resAdminList.status, 200);
    const adminListJson = await resAdminList.json();
    const pendingReview = adminListJson.data.find(r => r.user_id === 99 && r.status === 'pending');
    assert.ok(pendingReview, 'Submitted review should be pending in admin panel');
    
    // Step 3: Approve review
    const resApprove = await fetch(`${baseUrl}/api/reviews/${pendingReview.id}/approve`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: 'approved' })
    });
    assert.strictEqual(resApprove.status, 200);
    
    // Step 4: Verify public visibility under product reviews list
    const resPublic = await fetch(`${baseUrl}/api/reviews?product_id=1`, { method: 'GET' });
    assert.strictEqual(resPublic.status, 200);
    const publicJson = await resPublic.json();
    const isVisible = publicJson.data.some(r => r.id === pendingReview.id);
    assert.ok(isVisible, 'Approved review must be visible on the public product page');
});

// Test 86: Storefront Order Tracking Stepper
addTest(5, '86. Storefront Order Tracking Stepper (Verify statuses mapping to progress steps)', async () => {
    // Generate dummy orders with different tracking statuses
    const trackingNum1 = `HU-TRACK-STEP-${Date.now()}-1`;
    const trackingNum2 = `HU-TRACK-STEP-${Date.now()}-2`;

    // Seed orders using executeD1Query with all NOT NULL columns populated
    await executeD1Query(`
        INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone,
            address_line1, city, state, pincode, payment_method,
            subtotal_amount, total_amount, order_status, payment_status, created_at, updated_at
        ) VALUES (
            '${trackingNum1}', 1, 'Test Customer', 'test@heelsup.in', '1234567890',
            'Street 1', 'City', 'State', '123456', 'Cash',
            1000, 1000, 'shipped', 'paid', datetime('now'), datetime('now')
        )
    `);
    
    await executeD1Query(`
        INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone,
            address_line1, city, state, pincode, payment_method,
            subtotal_amount, total_amount, order_status, payment_status, created_at, updated_at
        ) VALUES (
            '${trackingNum2}', 1, 'Test Customer', 'test@heelsup.in', '1234567890',
            'Street 1', 'City', 'State', '123456', 'Cash',
            1000, 1000, 'delivered', 'paid', datetime('now'), datetime('now')
        )
    `);

    // Fetch tracking details for order 1
    const res1 = await fetch(`${baseUrl}/api/orders/track/${trackingNum1}`, { method: 'GET' });
    assert.strictEqual(res1.status, 200);
    const json1 = await res1.json();
    assert.strictEqual(json1.data.order_status, 'shipped');

    // Fetch tracking details for order 2
    const res2 = await fetch(`${baseUrl}/api/orders/track/${trackingNum2}`, { method: 'GET' });
    assert.strictEqual(res2.status, 200);
    const json2 = await res2.json();
    assert.strictEqual(json2.data.order_status, 'delivered');
});
