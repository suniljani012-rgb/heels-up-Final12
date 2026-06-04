const fs = require('fs');

let indexJs = fs.readFileSync('index.js', 'utf8');
indexJs = indexJs.replace(
    /const amountPaise = Math\.round\(Number\(created\.order\.total_amount\) \* 100\);\s*const basicAuth = btoa\(`\$\{rzpKeyId\}:\$\{rzpKeySecret\}`\);/,
    `const amountPaise = Math.round(Number(created.order.total_amount) * 100);
    
    if (amountPaise === 0) {
      await env.DB.prepare("UPDATE orders SET payment_status='paid', order_status='confirmed', paid_at=?, updated_at=? WHERE id=?").bind(nowIso(), nowIso(), created.order.id).run();
      if (couponCode) await env.DB.prepare("UPDATE coupons SET used_count=used_count+1 WHERE code=?").bind(couponCode).run();
      return json({ ok: true, key: "free_order", order: { id: created.order.id, orderNumber: created.order.order_number, amount: 0, discount: discountAmount } });
    }

    const basicAuth = btoa(\`\${rzpKeyId}:\${rzpKeySecret}\`);`
);

fs.writeFileSync('index.js', indexJs);
console.log('Fixed backend zero amount bypass');

let checkoutHtml = fs.readFileSync('../public/checkout.html', 'utf8');
checkoutHtml = checkoutHtml.replace(
    /if \(orderData\.razorpayOrder\) \{/,
    `if (orderData.key === "free_order") {
            toast('Order placed successfully! (Free Order)', 'success');
            if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.clear();
            localStorage.removeItem('heelsup_coupon');
            setTimeout(() => { window.location.href = '/orders'; }, 1500);
            return;
          }
          if (orderData.razorpayOrder) {`
);

fs.writeFileSync('../public/checkout.html', checkoutHtml);
console.log('Fixed checkout free order bypass');
