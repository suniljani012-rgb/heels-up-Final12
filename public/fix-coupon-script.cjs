const fs = require('fs');

let cartHtml = fs.readFileSync('cart.html', 'utf8');

cartHtml = cartHtml.replace(/window\.applyCoupon = function \(\) \{[\s\S]*?\}\s*else\s*\{\s*successEl\.style\.display = 'none';\s*couponDiscount = 0;\s*updateSummary\(\);\s*toast\('Invalid coupon code', 'error'\);\s*\}\s*\};/g, 
`window.applyCoupon = async function () {
    const code = $('coupon-input').value.trim().toUpperCase();
    const successEl = $('coupon-success');
    const msgEl = $('coupon-msg');

    if (!code) {
        toast('Please enter a coupon code', 'warning');
        return;
    }

    try {
        const subtotal = cart.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);
        
        if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
            const res = await HeelsUpAuth.api('/api/coupons/validate', {
                method: 'POST',
                body: JSON.stringify({ code, subtotal })
            });
            couponDiscount = res.discount || 0;
            successEl.style.display = 'flex';
            msgEl.textContent = \`Coupon "\${code}" applied!\`;
            updateSummary();
            toast('Coupon applied successfully!', 'success');
        } else {
            // Fallback logic
            if (code === 'HEELS10') {
                couponDiscount = Math.round(subtotal * 0.1);
                successEl.style.display = 'flex';
                msgEl.textContent = \`Coupon "\${code}" applied! 10% discount\`;
                updateSummary();
                toast('Coupon applied successfully!', 'success');
            } else {
                throw new Error('Invalid coupon code');
            }
        }
    } catch(e) {
        successEl.style.display = 'none';
        couponDiscount = 0;
        updateSummary();
        toast(e.message || 'Invalid coupon code', 'error');
    }
};`);

fs.writeFileSync('cart.html', cartHtml);
console.log('Fixed applyCoupon in cart.html');
