'use strict';

    /* ── GLOBALS & CONFIG ── */
    const FREE_SHIP_THRESHOLD = 799;
    const STANDARD_SHIP_CHARGE = 49;
    let couponDiscountAmount = 0;
    let appliedCouponCode = '';
    let savedUserAddresses = [];

    /* ── DOM UTILS ── */
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    /* ── TOAST NOTIFICATION ── */
    function toast(msg, type = 'success', dur = 4200) {
      const wrap = $('toast-wrap');
      if (!wrap) return;
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
      el.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-info'}" aria-hidden="true"></i><span>${esc(msg)}</span>`;
      wrap.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 420) }, dur);
    }

    /* ── AUTHENTICATION GUARD ── */
    let currentUser = null;
    try {
      if (typeof HeelsUpAuth !== 'undefined') {
        currentUser = HeelsUpAuth.getUser();
        if (!currentUser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          window.location.href = '/login?redirect=checkout';
        }
      }
    } catch (e) {
      console.warn("Auth check bypassed for local dev");
    }

    /* ── INITIALIZATION ── */
    document.addEventListener('DOMContentLoaded', async () => {
      let cart = [];
      try { if (typeof HeelsUpCart !== 'undefined') cart = HeelsUpCart.getCart(); } catch (e) { }

      if (!cart || !cart.length) {
        $('checkout-main').style.display = 'none';
        $('empty-state').style.display = 'block';
        return;
      }

      // Fetch user data if we have a token
      if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.getToken()) {
        try {
          const res = await HeelsUpAuth.api('/api/me');
          if (res && res.user) {
            if (typeof HeelsUpAuth.setSession === 'function') HeelsUpAuth.setSession(HeelsUpAuth.getToken(), res.user);
            currentUser = res.user;
          }
        } catch (e) { console.warn("Failed to fetch user:", e); }
      }

      // Pre-fill user data if available
      if (currentUser) {
        if ($('c-name')) $('c-name').value = `${currentUser.firstName || currentUser.first_name || ''} ${currentUser.lastName || currentUser.last_name || ''}`.trim();
        if ($('c-email')) $('c-email').value = currentUser.email || '';
        if (currentUser.phone && $('c-phone')) $('c-phone').value = currentUser.phone;
      }
      
      const savedCoupon = localStorage.getItem('heelsup_coupon');
      if (savedCoupon) {
        setTimeout(() => window.applyCouponCode(savedCoupon), 100);
      }

      renderCheckoutCart(cart);
      calculateAndRenderSummary();
      await fetchSavedAddresses();
    });

    /* ── CART RENDERING ── */
    function renderCheckoutCart(cartItems) {
      const listEl = $('cart-items-list');
      listEl.innerHTML = cartItems.map(item => {
        const imgSrc = esc(item.image || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=150&q=70');
        return `
      <div class="cart-item-mini">
        <img class="cart-item-img" src="${imgSrc}" alt="${esc(item.name)}" onerror="this.style.display='none'">
        <div class="cart-item-info">
          <div class="cart-item-name">${esc(item.name)}</div>
          <div class="cart-item-meta">${item.size ? 'Size: ' + esc(item.size) + ' &middot; ' : ''}Qty: ${item.quantity || item.qty || 1}</div>
        </div>
        <div class="cart-item-price">₹${((item.price || 0) * (item.quantity || item.qty || 1)).toLocaleString('en-IN')}</div>
      </div>
    `}).join('');
    }

    /* ── SUMMARY CALCULATION ── */
    function calculateAndRenderSummary() {
      let subtotal = 0;
      try { if (typeof HeelsUpCart !== 'undefined') subtotal = HeelsUpCart.getSubtotal(); } catch (e) { }

      // Prevent negative subtotal
      subtotal = Math.max(0, subtotal);

      const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : STANDARD_SHIP_CHARGE;
      const finalTotal = Math.max(0, subtotal - couponDiscountAmount + shipping);

      $('s-subtotal').textContent = '₹' + subtotal.toLocaleString('en-IN');
      $('s-shipping').textContent = shipping === 0 ? 'FREE' : '+₹' + shipping;
      $('s-total').textContent = '₹' + finalTotal.toLocaleString('en-IN');

      const payBtn = $('btn-pay');
      if (payBtn) payBtn.innerHTML = `<i class="fa-solid fa-lock" aria-hidden="true"></i> Pay ₹${finalTotal.toLocaleString('en-IN')}`;

      // Update Progress Bar
      const progressPct = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);
      $('shipping-bar-fill').style.width = progressPct + '%';

      const shipTextEl = $('shipping-bar-text');
      if (subtotal >= FREE_SHIP_THRESHOLD) {
        shipTextEl.innerHTML = '🚚 <strong>Free Shipping Unlocked!</strong>';
        $('shipping-bar-fill').style.background = '#22c55e'; // Green
      } else {
        const remaining = FREE_SHIP_THRESHOLD - subtotal;
        shipTextEl.innerHTML = `Add <strong>₹${remaining.toLocaleString('en-IN')}</strong> more for Free Shipping`;
        $('shipping-bar-fill').style.background = 'var(--primary)'; // Red
      }

      // Toggle Discount Row
      const discRow = $('discount-row');
      if (couponDiscountAmount > 0) {
        discRow.style.display = 'flex';
        $('s-discount').textContent = '-₹' + couponDiscountAmount.toLocaleString('en-IN');
      } else {
        discRow.style.display = 'none';
      }
    }

    /* ── ADDRESS MANAGEMENT ── */
    async function fetchSavedAddresses() {
      if (!currentUser || typeof HeelsUpAuth === 'undefined' || !HeelsUpAuth.api) return;
      try {
        const data = await HeelsUpAuth.api('/api/me/addresses');
        savedUserAddresses = data.addresses || [];
        if (savedUserAddresses.length > 0) {
          const group = $('saved-address-group');
          const select = $('saved-addresses');
          group.style.display = 'block';

          savedUserAddresses.forEach(addr => {
            const opt = document.createElement('option');
            opt.value = addr.id;
            opt.textContent = `${addr.name || 'Saved'} — ${addr.address_line1 || addr.addressLine1}, ${addr.city}`;
            select.appendChild(opt);
          });

          // Auto-fill default address
          const defAddr = savedUserAddresses.find(a => a.is_default || a.isDefault) || savedUserAddresses[0];
          if (defAddr) {
            select.value = defAddr.id;
            fillSavedAddress(defAddr.id);
          }
        }
      } catch (e) { console.warn('Could not fetch addresses', e); }
    }

    window.fillSavedAddress = function (id) {
      if (!id) return;
      const addr = savedUserAddresses.find(a => a.id == id);
      if (!addr) return;

      if (addr.name) $('c-name').value = addr.name;
      if (addr.phone) $('c-phone').value = addr.phone;
      $('c-line1').value = addr.address_line1 || addr.addressLine1 || '';
      $('c-line2').value = addr.address_line2 || addr.addressLine2 || '';
      $('c-city').value = addr.city || '';
      $('c-pincode').value = addr.pincode || '';

      const stateVal = addr.state || '';
      const stateSel = $('c-state');
      for (let i = 0; i < stateSel.options.length; i++) {
        if (stateSel.options[i].value.toLowerCase() === stateVal.toLowerCase()) {
          stateSel.selectedIndex = i;
          break;
        }
      }
    };

    /* ── COUPON ENGINE ── */
    window.applyCouponCode = function (code) {
      $('coupon-input').value = code;
      applyCoupon();
    };

    window.applyCoupon = async function () {
      const codeInp = $('coupon-input');
      const code = codeInp.value.trim().toUpperCase();

      if (!code) {
        toast('Please enter a coupon code', 'warning');
        codeInp.focus();
        return;
      }

      const applyBtn = document.querySelector('.btn-apply');
      const ogText = applyBtn.textContent;
      applyBtn.textContent = '...';
      applyBtn.disabled = true;

      try {
        let subtotal = 0;
        if (typeof HeelsUpCart !== 'undefined') subtotal = HeelsUpCart.getSubtotal();

        let discount = 0;

        // Mock API or actual API call depending on environment
        if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api && window.location.hostname !== 'localhost') {
          const res = await HeelsUpAuth.api('/api/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code, subtotal })
          });
          discount = res.discount || 0;
        } else {
          // Fallback local logic for demo/preview
          if (code === 'HEELS10') discount = Math.round(subtotal * 0.1);
          else if (code === 'WELCOME20') discount = Math.round(subtotal * 0.2);
          else if (code === 'FLAT100' && subtotal > 500) discount = 100;
          else throw new Error('Invalid or expired coupon code');
        }

        couponDiscountAmount = discount;
        appliedCouponCode = code;

        $('coupon-success').style.display = 'flex';
        $('coupon-msg').innerHTML = `<strong>${esc(code)}</strong> applied! You saved ₹${discount.toLocaleString('en-IN')}`;

        calculateAndRenderSummary();
        localStorage.setItem('heelsup_coupon', code);
        toast(`Awesome! You saved ₹${discount.toLocaleString('en-IN')}`, 'success');

      } catch (err) {
        toast(err.message || 'Invalid coupon code', 'error');
        removeCoupon();
      } finally {
        applyBtn.textContent = ogText;
        applyBtn.disabled = false;
      }
    };

    window.removeCoupon = function () {
      localStorage.removeItem('heelsup_coupon');
      couponDiscountAmount = 0;
      appliedCouponCode = '';
      $('coupon-success').style.display = 'none';
      $('coupon-input').value = '';
      calculateAndRenderSummary();
      toast('Coupon removed', 'info');
    };

    /* ── PAYMENT INTEGRATION (RAZORPAY) ── */
    window.initiatePayment = async function () {
      // 1. Validate Form
      const name = $('c-name').value.trim();
      const email = $('c-email').value.trim();
      const phone = $('c-phone').value.trim();
      const line1 = $('c-line1').value.trim();
      const line2 = $('c-line2').value.trim();
      const city = $('c-city').value.trim();
      const state = $('c-state').value.trim();
      const pin = $('c-pincode').value.trim();

      if (!name || !email || !phone || !line1 || !city || !state || !pin) {
        toast('Please fill all required fields marked with *', 'error');
        return;
      }
      if (!/^\d{10}$/.test(phone)) {
        toast('Please enter a valid 10-digit mobile number', 'error');
        $('c-phone').focus(); return;
      }
      if (!/^\d{6}$/.test(pin)) {
        toast('Please enter a valid 6-digit pincode', 'error');
        $('c-pincode').focus(); return;
      }

      // 2. Prepare Data
      const btn = $('btn-pay');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing Securely...';

      try {
        // Opt-in address saving
        if ($('save-address').checked && typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
          HeelsUpAuth.api('/api/me/addresses', {
            method: 'POST',
            body: JSON.stringify({
              name, phone, addressLine1: line1, addressLine2: line2, city, state, pincode: pin, isDefault: savedUserAddresses.length === 0
            })
          }).catch(e => console.warn('Failed to save address implicitly', e));
        }

        let cart = [];
        if (typeof HeelsUpCart !== 'undefined') cart = HeelsUpCart.getCart();

        const orderItems = cart.map(item => ({
          productId: item.id,
          name: item.name,
          sku: item.sku || '',
          qty: item.quantity || item.qty || 1,
          price: item.price,
          size: item.size || '',
          image: item.image || ''
        }));

        const payload = {
          customer: { name, email, phone, addressLine1: line1, addressLine2: line2, city, state, pincode: pin },
          items: orderItems,
          deliveryMethod: 'standard',
          couponCode: appliedCouponCode || null
        };

        // 3. Initiate Order Backend Call
        let orderData;
        if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api && window.location.hostname !== 'localhost') {
          orderData = await HeelsUpAuth.api('/api/orders/initiate', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        } else {
          // Simulation for development
          await new Promise(r => setTimeout(r, 1200));
          toast('Simulating payment for development. Redirecting...', 'info');
          if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.clearCart();
          localStorage.removeItem('heelsup_coupon');
          setTimeout(() => { window.location.href = '/orders'; }, 1500);
          return;
        }

        if (orderData.key === 'free_order') {
           toast('Order confirmed successfully (Free Order)!', 'success');
           if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.clearCart();
           localStorage.removeItem('heelsup_coupon');
           setTimeout(() => { window.location.href = '/orders'; }, 1500);
           return;
        }

        // 4. Load Razorpay Script Dynamically
        await injectScript('https://checkout.razorpay.com/v1/checkout.js');

        // 5. Configure Razorpay
        const options = {
          key: orderData.key,
          amount: orderData.razorpayOrder.amount, // in paise
          currency: 'INR',
          name: 'HeelsUp',
          description: `Order ${orderData.order.order_number}`,
          image: '/logo.png', // Or absolute URL
          order_id: orderData.razorpayOrder.id,
          theme: { color: '#C0392B' }, // Match Primary Red
          prefill: { name: name, email: email, contact: phone },
          handler: async function (response) {
            btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verifying...';
            try {
              // 6. Verify Payment Backend Call
              const verifyRes = await HeelsUpAuth.api('/api/payments/razorpay/verify', {
                method: 'POST',
                body: JSON.stringify({
                  orderId: orderData.order.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              // 7. Success
              if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.clearCart();
              window.location.href = `/order-confirmation?id=${verifyRes.orderId}&num=${verifyRes.orderNumber}`;
            } catch (e) {
              toast('Verification failed. Please contact support with Order #' + orderData.order.order_number, 'error', 8000);
              resetPayBtn(btn, ogHtml);
            }
          },
          modal: {
            ondismiss: function () {
              toast('Payment cancelled', 'warning');
              resetPayBtn(btn, ogHtml);
              HeelsUpAuth.api('/api/payments/razorpay/fail', { method: 'POST', body: JSON.stringify({ orderId: orderData.order.id, razorpay_order_id: orderData.razorpayOrder.id }) }).catch(() => { });
            }
          }
        };

        // 8. Open Razorpay
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          toast('Payment Failed: ' + (resp.error?.description || 'Unknown error'), 'error', 6000);
          resetPayBtn(btn, ogHtml);
          HeelsUpAuth.api('/api/payments/razorpay/fail', { method: 'POST', body: JSON.stringify({ orderId: orderData.order.id, razorpay_order_id: orderData.razorpayOrder.id }) }).catch(() => { });
        });
        rzp.open();

      } catch (err) {
        console.error(err);
        if (err.status === 401 || String(err.message).includes('401')) {
          window.location.href = '/login?redirect=checkout';
          return;
        }
        toast(err.message || 'An error occurred while preparing your order. Please try again.', 'error');
        resetPayBtn(btn, ogHtml);
      }
    };

    /* ── UTILS ── */
    function resetPayBtn(btn, originalHTML) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      calculateAndRenderSummary(); // Refresh total in case it changed
    }

    function injectScript(src) {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }