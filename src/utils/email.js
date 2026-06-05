// src/utils/email.js

async function getSetting(env, key, fallback = '') {
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
        return row ? row.value : fallback;
    } catch {
        return fallback;
    }
}

function formatCurrency(amountPaise) {
    return '₹' + ((amountPaise || 0) / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Sends an email notification to the customer when their order status changes.
 * @param {object} env Cloudflare worker environment
 * @param {number} orderId Database ID of the order
 * @param {string} status The new status
 */
export async function sendOrderStatusEmail(env, orderId, status) {
    try {
        console.log(`[Email] Preparing order status email for Order ID: ${orderId}, Status: ${status}`);
        
        // 1. Fetch order details from database
        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (!order) {
            console.error(`[Email] Order not found for ID: ${orderId}`);
            return { ok: false, error: 'Order not found' };
        }

        if (!order.customer_email) {
            console.log(`[Email] Order #${order.order_number} has no email address. Skipping email.`);
            return { ok: true, message: 'No email address provided' };
        }

        // 2. Fetch order items
        const itemsRes = await env.DB.prepare(
            'SELECT product_name, product_sku, quantity, unit_price, line_total, size_label FROM order_items WHERE order_id = ?'
        ).bind(orderId).all();
        const items = itemsRes.results || [];

        // 3. Load configurations from settings
        let resendApiKey = await getSetting(env, 'resend_api_key', '');
        if (!resendApiKey && env.RESEND_API_KEY) {
            resendApiKey = env.RESEND_API_KEY;
        }

        const siteName = await getSetting(env, 'site_name', 'HeelsUp');
        const fromAddress = await getSetting(env, 'email_from_address', 'support@heelsup.in');
        const scriptUrl = await getSetting(env, 'otp_script_url', 'https://script.google.com/macros/s/AKfycbzXkeCVB258ETOqj2i0FQPc-tYOLdsfHUqpE8fAqM8Q268f03bv4mt4GxMHyNQ_mDsV7A/exec');

        // 4. Determine Subject and Message content based on status
        let subject = '';
        let statusTitle = '';
        let statusMessage = '';
        let showTracking = false;

        const orderNum = order.order_number;
        const cName = order.customer_name || 'Customer';

        switch (status) {
            case 'placed':
            case 'confirmed':
                subject = `Order Confirmed! #${orderNum} - ${siteName}`;
                statusTitle = 'Your Order Has Been Confirmed';
                statusMessage = `Thank you for shopping with us, ${cName}! We have received your payment and are packing your premium styles for dispatch. Below is your order summary.`;
                break;
            case 'shipped':
                subject = `Your Order Has Shipped! #${orderNum} - ${siteName}`;
                statusTitle = 'Your Order is on the Way!';
                const courier = order.courier_name || 'our shipping provider';
                statusMessage = `Great news, ${cName}! Your HeelsUp order #${orderNum} has been shipped via ${courier}. It will arrive at your address soon!`;
                showTracking = true;
                break;
            case 'out_for_delivery':
                subject = `Your Order is Out for Delivery Today! #${orderNum} - ${siteName}`;
                statusTitle = 'Out for Delivery Today';
                statusMessage = `Get ready, ${cName}! Our delivery agent is bringing your HeelsUp packages today. Please ensure someone is available at your address to receive it.`;
                showTracking = true;
                break;
            case 'delivered':
                subject = `Order Delivered! #${orderNum} - ${siteName}`;
                statusTitle = 'Successfully Delivered!';
                statusMessage = `Your order #${orderNum} was successfully delivered to your address. We hope you love stepping into your new HeelsUp styles!`;
                break;
            case 'cancelled':
                subject = `Order Cancelled #${orderNum} - ${siteName}`;
                statusTitle = 'Order Cancelled';
                statusMessage = `Dear ${cName}, your order #${orderNum} has been cancelled. If you already made a payment, a full refund will be processed to your source payment method within 3 to 5 business days.`;
                break;
            case 'exchange_requested':
                subject = `Exchange Requested #${orderNum} - ${siteName}`;
                statusTitle = 'Exchange Request Received';
                statusMessage = `We have received your exchange request for order #${orderNum}. Our quality control managers are reviewing your request. We will update you shortly.`;
                break;
            case 'exchange_approved':
                subject = `Exchange Request Approved! #${orderNum} - ${siteName}`;
                statusTitle = 'Exchange Request Approved';
                statusMessage = `Congratulations, your exchange request for order #${orderNum} has been approved. Our shipping agents will arrange a pick-up of the original pair soon.`;
                break;
            case 'exchange_rejected':
                subject = `Exchange Request Update #${orderNum} - ${siteName}`;
                statusTitle = 'Exchange Update';
                statusMessage = `We would like to update you that your exchange request for order #${orderNum} could not be approved because it did not meet our standard exchange criteria. Contact support for details.`;
                break;
            default:
                subject = `Order Update #${orderNum} - ${siteName}`;
                statusTitle = `Order Status: ${status.replace('_', ' ').toUpperCase()}`;
                statusMessage = `Your order status has been updated to ${status.replace('_', ' ').toUpperCase()}.`;
                break;
        }

        // 5. Build HTML content
        const html = buildOrderEmailHtml(siteName, order, items, statusTitle, statusMessage, showTracking);

        // 6. Dispatch Email
        if (resendApiKey) {
            console.log(`[Email] Sending via Resend API to: ${order.customer_email}`);
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: `${siteName} <${fromAddress}>`,
                    to: [order.customer_email],
                    subject: subject,
                    html: html
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('[Email] Resend API Error Response:', errorData);
                return { ok: false, error: errorData.message || 'Failed to send email via Resend' };
            }

            console.log(`[Email] Email sent successfully via Resend for Order: #${orderNum}`);
            return { ok: true };
        } else if (scriptUrl) {
            console.log(`[Email] Sending via Google Apps Script fallback to: ${order.customer_email}`);
            const res = await fetch(scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: order.customer_email,
                    subject: subject,
                    message: `${statusTitle}\n\n${statusMessage}\n\nOrder Details:\nOrder Number: ${orderNum}\nTotal: ${formatCurrency(order.total_amount)}`,
                    html: html
                })
            });

            if (!res.ok) {
                console.error('[Email] Google Apps Script returned error status:', res.status);
                return { ok: false, error: `Apps Script returned status ${res.status}` };
            }

            console.log(`[Email] Email sent successfully via Apps Script for Order: #${orderNum}`);
            return { ok: true };
        } else {
            console.warn('[Email] Neither Resend API key nor Google Apps Script URL is configured.');
            return { ok: false, error: 'Email sender not configured' };
        }

    } catch (err) {
        console.error('[Email] Exception inside sendOrderStatusEmail:', err);
        return { ok: false, error: err.message };
    }
}

function buildOrderEmailHtml(siteName, order, items, statusTitle, statusMessage, showTracking) {
    const isPos = order.delivery_method === 'pos' || order.delivery_method === 'store' || order.source === 'pos';
    const addressLine = [
        order.address_line1,
        order.address_line2,
        order.city,
        order.state,
        order.pincode,
        order.country
    ].filter(Boolean).join(', ');

    // Compile items list
    let itemsHtml = '';
    for (const item of items) {
        const imageSrc = item.image_url || 'https://heelsup.in/assets/placeholder.jpg';
        itemsHtml += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f2eade; vertical-align: middle;">
                    <img src="${imageSrc}" alt="${item.product_name}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid #f2eade; background-color: #ffffff;" />
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #f2eade; vertical-align: middle;">
                    <span style="font-weight: bold; font-size: 13px; color: #1a1816; display: block;">${item.product_name}</span>
                    <span style="font-size: 10px; color: #888888; font-family: monospace;">SKU: ${item.product_sku || 'N/A'} &middot; Size: ${item.size_label || 'Default'}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #f2eade; text-align: center; vertical-align: middle; font-size: 12px; color: #555555;">
                    ${item.quantity}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #f2eade; text-align: right; vertical-align: middle; font-weight: bold; font-size: 13px; color: #1a1816; font-family: monospace;">
                    ${formatCurrency(item.unit_price)}
                </td>
            </tr>
        `;
    }

    // Courier details
    let trackingHtml = '';
    if (showTracking && (order.tracking_number || order.tracking_url)) {
        const cName = order.courier_name || 'Delivery partner';
        const tNum = order.tracking_number || '';
        const tUrl = order.tracking_url || '#';
        trackingHtml = `
            <div style="background-color: #faf8f4; border: 1px dashed #C9A96E; border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center;">
                <span style="font-size: 11px; font-weight: bold; uppercase; letter-spacing: 1px; color: #c9a96e; display: block; margin-bottom: 6px;">📦 Shipping Partner: ${cName}</span>
                ${tNum ? `<span style="font-size: 13px; font-weight: bold; color: #1a1816; display: block; margin-bottom: 12px; font-family: monospace;">Tracking Number: ${tNum}</span>` : ''}
                <a href="${tUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #1a1816; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; transition: background-color 0.2s;">Track Shipment</a>
            </div>
        `;
    }

    // Shipping Address Block
    let addressBlock = '';
    if (!isPos && addressLine) {
        addressBlock = `
            <div style="background-color: #faf8f4; border: 1px solid #ead2ae; border-radius: 12px; padding: 20px; margin-top: 24px;">
                <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; text-transform: uppercase; tracking-wider; color: #888888; letter-spacing: 0.5px;">📍 Delivery Destination</h4>
                <p style="margin: 0; font-size: 13px; color: #333333; line-height: 1.4;">${addressLine}</p>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #888888;">Customer Phone: ${order.customer_phone}</p>
            </div>
        `;
    } else if (isPos) {
        addressBlock = `
            <div style="background-color: #faf8f4; border: 1px solid #ead2ae; border-radius: 12px; padding: 20px; margin-top: 24px;">
                <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; text-transform: uppercase; tracking-wider; color: #888888; letter-spacing: 0.5px;">🏪 Fulfillment Mode</h4>
                <p style="margin: 0; font-size: 13px; color: #333333; line-height: 1.4;">In-Store Counter Purchase / Walk-in pickup</p>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #888888;">Phone logged: ${order.customer_phone || 'N/A'}</p>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #fcfbf9; color: #1a1816; margin: 0; padding: 20px; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #ead2ae; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        
        <!-- Header -->
        <div style="background-color: #1a1816; padding: 24px 30px; text-align: center; border-bottom: 3px solid #C9A96E;">
            <h1 style="color: #C9A96E; font-size: 24px; font-weight: normal; font-family: 'Playfair Display', Georgia, serif; letter-spacing: 3px; text-transform: uppercase; margin: 0; font-style: italic;">
                Heels<span style="font-weight: bold;">Up</span>
            </h1>
            <span style="color: #888888; font-size: 8px; letter-spacing: 2px; text-transform: uppercase; display: block; margin-top: 4px; font-family: monospace;">Premium Ladies Footwear</span>
        </div>

        <!-- Content -->
        <div style="padding: 30px 40px;">
            <span style="display: inline-block; padding: 6px 14px; background-color: #faf8f4; border: 1px solid #C9A96E; color: #b17e3f; font-weight: bold; font-size: 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px;">
                Order Status Update
            </span>
            
            <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: normal; font-style: italic; color: #1a1816; margin: 0 0 12px 0;">
                ${statusTitle}
            </h2>
            
            <p style="font-size: 13px; color: #555555; line-height: 1.6; margin: 0 0 24px 0;">
                ${statusMessage}
            </p>

            <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #888888; border-bottom: 1px solid #f2eade; padding-bottom: 8px; margin: 24px 0 12px 0;">
                📋 Order ID: #${orderNum}
            </h3>

            <!-- Order Items -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                    <tr style="text-align: left;">
                        <th style="padding: 10px 12px; border-bottom: 2px solid #f2eade; color: #888888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; width: 12%;">Photo</th>
                        <th style="padding: 10px 12px; border-bottom: 2px solid #f2eade; color: #888888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; width: 55%;">Product Specification</th>
                        <th style="padding: 10px 12px; border-bottom: 2px solid #f2eade; color: #888888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; width: 13%;">Qty</th>
                        <th style="padding: 10px 12px; border-bottom: 2px solid #f2eade; color: #888888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: right; width: 20%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <!-- Totals billing calculations -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr style="font-size: 12px; color: #555555;">
                    <td style="padding: 4px 12px; text-align: right; width: 70%;">Items Subtotal:</td>
                    <td style="padding: 4px 12px; text-align: right; width: 30%; font-family: monospace;">${formatCurrency(order.subtotal_amount)}</td>
                </tr>
                ${order.discount_amount > 0 ? `
                <tr style="font-size: 12px; color: #d4456b;">
                    <td style="padding: 4px 12px; text-align: right;">Coupon Discount:</td>
                    <td style="padding: 4px 12px; text-align: right; font-family: monospace;">-${formatCurrency(order.discount_amount)}</td>
                </tr>` : ''}
                <tr style="font-size: 12px; color: #555555;">
                    <td style="padding: 4px 12px; text-align: right;">Standard Shipping:</td>
                    <td style="padding: 4px 12px; text-align: right; font-family: monospace;">${order.shipping_amount > 0 ? formatCurrency(order.shipping_amount) : 'FREE'}</td>
                </tr>
                <tr style="font-size: 13px; font-weight: bold; color: #1a1816;">
                    <td style="padding: 12px 12px 4px 12px; text-align: right; border-top: 1px dashed #ead2ae;">Grand Total Amount:</td>
                    <td style="padding: 12px 12px 4px 12px; text-align: right; border-top: 1px dashed #ead2ae; font-family: monospace; font-size: 14px; color: #b17e3f;">${formatCurrency(order.total_amount)}</td>
                </tr>
                <tr style="font-size: 9px; color: #888888;">
                    <td style="padding: 0 12px; text-align: right;" colspan="2">(Includes CGST + SGST tax charges)</td>
                </tr>
            </table>

            <!-- Address and Fulfillment block -->
            ${addressBlock}

            <!-- Tracking partner details -->
            ${trackingHtml}

            <!-- Support help details -->
            <p style="font-size: 11px; color: #888888; text-align: center; margin-top: 32px; line-height: 1.5;">
                If you have any queries regarding your shipment, payments, or size exchange, feel free to reply to this email or chat with our Support Executive on WhatsApp at <strong>+91 7891470935</strong>.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #faf8f4; padding: 20px 40px; text-align: center; border-top: 1px solid #f2eade; font-size: 11px; color: #888888;">
            <p style="margin: 0 0 6px 0;">&copy; 2026 ${siteName} Boutique. All rights reserved.</p>
            <p style="margin: 0; font-size: 10px; color: #aaaaaa;">3rd Road Sardarpura, Jodhpur, Rajasthan (342003)</p>
            <div style="margin-top: 12px;">
                <a href="https://heelsup.in" target="_blank" style="color: #b17e3f; text-decoration: none; margin: 0 8px;">Storefront</a> &middot;
                <a href="https://heelsup.in/returns" target="_blank" style="color: #b17e3f; text-decoration: none; margin: 0 8px;">Exchange Policy</a> &middot;
                <a href="https://heelsup.in/order-tracking" target="_blank" style="color: #b17e3f; text-decoration: none; margin: 0 8px;">Track Order</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}
