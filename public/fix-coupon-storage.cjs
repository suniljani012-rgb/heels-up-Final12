const fs = require('fs');

// 1. Fix cart.html
let cartHtml = fs.readFileSync('cart.html', 'utf8');

cartHtml = cartHtml.replace(
    /msgEl\.textContent = `Coupon "\$\{code\}" applied!`;\s*updateSummary\(\);\s*toast\('Coupon applied successfully!', 'success'\);/g,
    "msgEl.textContent = `Coupon \"${code}\" applied!`;\n            localStorage.setItem('heelsup_coupon', code);\n            updateSummary();\n            toast('Coupon applied successfully!', 'success');"
);

cartHtml = cartHtml.replace(
    /msgEl\.textContent = `Coupon "\$\{code\}" applied! 10% discount`;\s*updateSummary\(\);\s*toast\('Coupon applied successfully!', 'success'\);/g,
    "msgEl.textContent = `Coupon \"${code}\" applied! 10% discount`;\n                localStorage.setItem('heelsup_coupon', code);\n                updateSummary();\n                toast('Coupon applied successfully!', 'success');"
);

cartHtml = cartHtml.replace(
    /toast\('Please enter a coupon code', 'warning'\);/g,
    "localStorage.removeItem('heelsup_coupon');\n        toast('Please enter a coupon code', 'warning');"
);

cartHtml = cartHtml.replace(
    /successEl\.style\.display = 'none';\s*couponDiscount = 0;\s*updateSummary\(\);\s*toast\('Invalid coupon code', 'error'\);/g,
    "successEl.style.display = 'none';\n        couponDiscount = 0;\n        localStorage.removeItem('heelsup_coupon');\n        updateSummary();\n        toast('Invalid coupon code', 'error');"
);

cartHtml = cartHtml.replace(
    /toast\(e\.message \|\| 'Invalid coupon code', 'error'\);/g,
    "localStorage.removeItem('heelsup_coupon');\n        toast(e.message || 'Invalid coupon code', 'error');"
);

// add the auto-apply on load in cart.html inside loadCart()
cartHtml = cartHtml.replace(
    /function loadCart\(\) \{[\s\S]*?updateSummary\(\);\s*\}/,
    `$&
      const savedCoupon = localStorage.getItem('heelsup_coupon');
      if (savedCoupon && !couponDiscount) {
          $('coupon-input').value = savedCoupon;
          window.applyCoupon();
      }`
);

fs.writeFileSync('cart.html', cartHtml);

// 2. Fix checkout.html
let checkoutHtml = fs.readFileSync('checkout.html', 'utf8');

checkoutHtml = checkoutHtml.replace(
    /discount = res\.discount \|\| 0;\s*\}/,
    "discount = res.discount || 0;\n        } else {\n          discount = 0;\n          throw new Error(res.error || 'Invalid coupon code');\n        }"
);
checkoutHtml = checkoutHtml.replace(
    /const res = await HeelsUpAuth\.api\('\/api\/coupons\/validate', \{[\s\S]*?body: JSON\.stringify\(\{ code, subtotal \}\)\s*\}\);/g,
    "const res = await HeelsUpAuth.api('/api/coupons/validate', { method: 'POST', body: JSON.stringify({ code, subtotal }) });\n          if (!res.ok && res.error) throw new Error(res.error);"
);

checkoutHtml = checkoutHtml.replace(
    /toast\('Coupon applied successfully!', 'success'\);/g,
    "localStorage.setItem('heelsup_coupon', code);\n        toast('Coupon applied successfully!', 'success');"
);

checkoutHtml = checkoutHtml.replace(
    /function removeCoupon\(\) \{/g,
    "function removeCoupon() {\n      localStorage.removeItem('heelsup_coupon');"
);

checkoutHtml = checkoutHtml.replace(
    /function loadOrderSummary\(\) \{[\s\S]*?\}\s*document\.addEventListener\('DOMContentLoaded'/g,
    `$&`
);

checkoutHtml = checkoutHtml.replace(
    /HeelsUpAuth\.check\(\)\.then\(\(user\) => \{/g,
    `HeelsUpAuth.check().then((user) => {
      const savedCoupon = localStorage.getItem('heelsup_coupon');
      if(savedCoupon && !couponCode) {
         window.applyCouponCode(savedCoupon);
      }`
);

fs.writeFileSync('checkout.html', checkoutHtml);
console.log('Fixed coupon localStorage passing');
