// public/js/print.js
// Depends on: js/core/api-client.js (HeelsUpAuth) being loaded first

/**
 * Authenticated fetch helper — wraps HeelsUpAuth.api when available,
 * falls back to a direct Bearer-token fetch.
 */
async function _printFetch(endpoint) {
    if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
        return HeelsUpAuth.api(endpoint);
    }
    // Fallback: manual fetch with token
    const token = localStorage.getItem('heelsup_token') || '';
    const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function fetchOrder(id, isOffline = false) {
    const endpoint = isOffline ? `/api/pos/sales/${id}` : `/api/orders/admin/${id}`;
    try {
        const res = await _printFetch(endpoint);
        return res;
    } catch (e) {
        alert("Error fetching order details: " + e.message);
        return null;
    }
}


function renderItems(items) {
    return items.map(item => `
        <tr>
            <td>${item.product_name} <br><small>Size: ${item.size || 'Default'} | SKU: ${item.sku || 'N/A'}</small></td>
            <td>${item.qty || item.quantity}</td>
            <td>₹${item.price || item.unit_price}</td>
            <td>₹${item.total_price || item.line_total || (item.price * item.quantity)}</td>
        </tr>
    `).join('');
}

// ─── TEMPLATE A: A4 Online Invoice ─────────────────────────
window.printOnlineInvoice = async function(orderId) {
    const order = await fetchOrder(orderId);
    if (!order) return;

    let address = "No Address Provided";
    try {
        if (order.delivery_address) {
            const addr = typeof order.delivery_address === 'string' ? JSON.parse(order.delivery_address) : order.delivery_address;
            address = `${addr.line1}<br>${addr.line2 ? addr.line2 + '<br>' : ''}${addr.city}, ${addr.state} - ${addr.pincode}<br>${addr.country}`;
        }
    } catch (e) { }

    const html = `
    <div class="template-a4">
        <div class="header">
            <img src="/logo.png" alt="HeelsUp Logo">
            <h1>TAX INVOICE</h1>
            <p>Order No: <strong>${order.order_number}</strong> | Date: ${new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <div class="details">
            <div>
                <h3>Sold By:</h3>
                <p><strong>HeelsUp</strong><br>Online Store</p>
            </div>
            <div>
                <h3>Billing & Shipping Address:</h3>
                <p><strong>${order.customer_name}</strong><br>
                ${address}<br>
                Phone: ${order.customer_phone}<br>
                Email: ${order.customer_email}</p>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${renderItems(order.items || [])}
            </tbody>
        </table>
        <div class="totals">
            <p>Subtotal: ₹${order.subtotal_amount}</p>
            ${order.discount_amount > 0 ? `<p>Discount: -₹${order.discount_amount}</p>` : ''}
            <p>Shipping: ₹${order.shipping_amount}</p>
            <p><strong>Grand Total: ₹${order.total_amount}</strong></p>
        </div>
        <div class="footer">
            <p>Thank you for shopping with HeelsUp!</p>
            <p>Return Policy: Exchange only within 7 days. No Returns.</p>
            <p>This is a computer generated invoice and does not require a signature.</p>
        </div>
    </div>
    `;
    
    document.getElementById('print-container').innerHTML = html;
    window.print();
};

// ─── TEMPLATE B: Thermal Offline Receipt ─────────────────────
window.printOfflineBill = async function(orderId) {
    // Assuming we fetch it or it's passed as an object.
    const order = await fetchOrder(orderId, false); // Change to true if offline endpoints are built.
    if (!order) return;

    const html = `
    <div class="template-thermal">
        <div class="header">
            <img src="/logo.png" alt="HeelsUp Logo">
            <h1>HeelsUp</h1>
            <p>Retail Store</p>
            <p>Receipt No: ${order.order_number}</p>
            <p>Date: ${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div class="details">
            <p>Customer: ${order.customer_name || 'Walk-in'}</p>
            <p>Phone: ${order.customer_phone || 'N/A'}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Amt</th>
                </tr>
            </thead>
            <tbody>
                ${(order.items || []).map(item => `
                    <tr>
                        <td>${item.product_name}<br><small>Sz:${item.size}</small></td>
                        <td>${item.qty || item.quantity}</td>
                        <td>₹${item.total_price || item.line_total || (item.price * item.quantity)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="totals" style="text-align: right; border-top: 1px solid #000; padding-top: 5px;">
            <p>Subtotal: ₹${order.subtotal_amount}</p>
            ${order.discount_amount > 0 ? `<p>Discount: -₹${order.discount_amount}</p>` : ''}
            <p><strong>Total: ₹${order.total_amount}</strong></p>
            <p>Paid via: ${order.payment_method}</p>
        </div>
        <div class="footer">
            <p>Thank you!</p>
            <p>Exchange within 7 days.<br>No Refunds.</p>
        </div>
    </div>
    `;
    
    document.getElementById('print-container').innerHTML = html;
    window.print();
};

// ─── TEMPLATE C: Packing Slip ────────────────────────────────
window.printPackingSlip = async function(orderId) {
    const order = await fetchOrder(orderId);
    if (!order) return;

    const html = `
    <div class="template-4x6">
        <div class="header">
            <h2>PACKING SLIP</h2>
            <p>Order: <strong>${order.order_number}</strong></p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="details" style="flex-direction: column;">
            <p><strong>Ship To:</strong> ${order.customer_name}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Size</th>
                    <th>Qty</th>
                </tr>
            </thead>
            <tbody>
                ${(order.items || []).map(item => `
                    <tr>
                        <td>${item.sku || '-'}</td>
                        <td>${item.product_name}</td>
                        <td>${item.size || 'D'}</td>
                        <td>${item.qty || item.quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="footer">
            <p>Include this slip inside the package.</p>
        </div>
    </div>
    `;
    
    document.getElementById('print-container').innerHTML = html;
    window.print();
};

// ─── TEMPLATE D: Shipping Label ──────────────────────────────
window.printShippingLabel = async function(orderId) {
    const order = await fetchOrder(orderId);
    if (!order) return;

    let address = "No Address Provided";
    try {
        if (order.delivery_address) {
            const addr = typeof order.delivery_address === 'string' ? JSON.parse(order.delivery_address) : order.delivery_address;
            address = `${addr.line1}<br>${addr.line2 ? addr.line2 + '<br>' : ''}${addr.city}, ${addr.state} - <strong>${addr.pincode}</strong><br>${addr.country}`;
        }
    } catch (e) { }

    const html = `
    <div class="template-label">
        <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
            <h1 style="margin:0; font-family: 'Playfair Display', serif;">HeelsUp</h1>
            <p style="margin:0; font-size:12px;">Pre-Paid Shipment</p>
        </div>
        
        <div style="font-size: 16px; margin-bottom: 20px;">
            <strong>TO:</strong><br>
            <span style="font-size: 20px; font-weight: 600;">${order.customer_name}</span><br>
            ${address}<br><br>
            <strong>Phone:</strong> ${order.customer_phone}
        </div>
        
        <div style="border-top: 2px solid #000; padding-top: 10px; font-size: 12px;">
            <strong>Order No:</strong> ${order.order_number}<br>
            <strong>Routing:</strong> STANDARD DELIVERY
        </div>
    </div>
    `;
    
    document.getElementById('print-container').innerHTML = html;
    window.print();
};

// Wrappers for UI buttons
window.previewInvoice = () => { const id = document.getElementById('orderId').value; if(id) window.printOnlineInvoice(id); };
window.previewOffline = () => { const id = document.getElementById('orderId').value; if(id) window.printOfflineBill(id); };
window.previewPackingSlip = () => { const id = document.getElementById('orderId').value; if(id) window.printPackingSlip(id); };
window.previewShippingLabel = () => { const id = document.getElementById('orderId').value; if(id) window.printShippingLabel(id); };
