'use strict';

    /* ── DOM UTILS ── */
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');

    /* ── STATE ── */
    let cart = [];
    let couponDiscount = 0;

    /* ── INIT ── */
    document.addEventListener('DOMContentLoaded', () => {
      initGlobalUI();
      loadCart();
    });

    /* ── GLOBAL UI ── */
    function initGlobalUI() {
      // Ann Bar Close
      $('ann-close')?.addEventListener('click', () => {
        const bar = $('ann-bar');
        if (bar) {
          bar.style.height = bar.offsetHeight + 'px';
          bar.style.transition = 'height .3s ease';
          setTimeout(() => bar.style.height = '0', 10);
          setTimeout(() => bar.remove(), 320);
        }
      });

      // Scroll Effects
      window.addEventListener('scroll', () => {
        const s = window.scrollY;
        $('navbar').classList.toggle('scrolled', s > 50);
        $('scroll-top-btn').classList.toggle('show', s > 380);
      }, { passive: true });
    }

    /* ── TOAST ── */
    function toast(msg, type = 'success', dur = 4200) {
      const wrap = $('toast-wrap');
      if (!wrap) return;
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info'
      };
      el.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i><span>${esc(msg)}</span>`;
      wrap.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 420);
      }, dur);
    }

    /* ── LOAD CART ── */
    function loadCart() {
      $('cart-loading').style.display = 'block';

      try {
        cart = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCart() : [];
      } catch (e) {
        cart = [];
      }

      setTimeout(() => {
        $('cart-loading').style.display = 'none';

        if (!cart || cart.length === 0) {
          $('cart-empty').style.display = 'block';
          $('cart-header').style.display = 'none';
          $('cart-layout').style.display = 'none';
        } else {
          $('cart-empty').style.display = 'none';
          $('cart-header').style.display = 'flex';
          $('cart-layout').style.display = 'grid';
          renderCart();
          
          const savedCoupon = localStorage.getItem('heelsup_coupon');
          if (savedCoupon && !couponDiscount) {
              $('coupon-input').value = savedCoupon;
              window.applyCoupon();
          }
        }
      }, 600);
    }

    /* ── RENDER CART ── */
    function renderCart() {
      const itemsWrap = $('cart-items-wrap');
      const count = cart.reduce((s, i) => s + (i.qty || 1), 0);

      $('cart-subtitle').textContent = `${count} item${count > 1 ? 's' : ''} in your bag`;

      itemsWrap.innerHTML = cart.map((item, i) => {
        const img = esc(item.image || item.image_url || '');
        const price = item.price || 0;
        const qty = item.qty || 1;
        const total = price * qty;

        return `
          <div class="cart-item">
            ${img ? `<img class="cart-item-img" src="${img}" alt="${esc(item.name)}" loading="lazy" onerror="this.src=''">` : '<div class="cart-item-img"></div>'}
            <div class="cart-item-info">
              <h3>${esc(item.name)}</h3>
              <div class="cart-item-meta">${item.size ? 'Size: ' + esc(item.size) + ' · ' : ''}${item.category || ''}</div>
              <div class="cart-item-qty">
                <span class="qty-label">Qty</span>
                <div class="qty-control">
                  <button class="qty-btn" onclick="updateQty('${item.key}', ${item.qty - 1})"><i class="fa-solid fa-minus" style="font-size:.65rem"></i></button>
                  <span class="qty-num">${item.qty}</span>
                  <button class="qty-btn" onclick="updateQty('${item.key}', ${item.qty + 1})"><i class="fa-solid fa-plus" style="font-size:.65rem"></i></button>
                </div>
              </div>
              <button class="cart-item-remove" onclick="removeItem('${item.key}')">
                <i class="fa-solid fa-trash"></i> Remove
              </button>
            </div>
            <div class="cart-item-price">
              <span class="item-price">${fmt(total)}</span>
              ${item.original_price && item.original_price > price ? `<span class="item-price-orig">${fmt(item.original_price * qty)}</span>` : ''}
            </div>
          </div>`;
      }).join('');

      updateSummary();
    }

    /* ── UPDATE SUMMARY ── */
    function updateSummary() {
      const subtotal = cart.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);
      const freeShipThresh = 799; // ₹799.00
      const shipping = subtotal >= freeShipThresh ? 0 : 49; // ₹60
      const total = subtotal - couponDiscount + shipping;

      $('summary-subtotal').textContent = fmt(subtotal);
      $('summary-discount').textContent = couponDiscount ? '-' + fmt(couponDiscount) : '-₹0';
      $('summary-shipping').textContent = shipping === 0 ? 'Free' : fmt(shipping);
      $('summary-total').textContent = fmt(Math.max(0, total));

      const remaining = freeShipThresh - subtotal;
      const shipMsg = $('shipping-msg');
      if (remaining > 0) {
        shipMsg.innerHTML = `Add <strong>${fmt(remaining)}</strong> more for FREE shipping!`;
      } else {
        shipMsg.innerHTML = '<strong>🎉 You qualify for FREE shipping!</strong>';
      }
    }

    /* ── UPDATE QTY ── */
    window.updateQty = function (key, newQty) {
    if (typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.updateQty(key, newQty);
        cart = HeelsUpCart.getCart();
    }
    renderCart();
};

    /* ── REMOVE ITEM ── */
    window.removeItem = function (key) {
    if (typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.removeItem(key);
        cart = HeelsUpCart.getCart();
    }
    if (cart.length === 0) {
        location.reload();
    } else {
        renderCart();
        toast('Item removed from bag', 'info');
    }
};

    /* ── APPLY COUPON ── */
    window.applyCoupon = async function () {
    const code = $('coupon-input').value.trim().toUpperCase();
    const successEl = $('coupon-success');
    const msgEl = $('coupon-msg');

      if (!code) {
          localStorage.removeItem('heelsup_coupon');
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
              msgEl.textContent = `Coupon "${code}" applied!`;
              localStorage.setItem('heelsup_coupon', code);
              updateSummary();
              toast('Coupon applied successfully!', 'success');
        } else {
            // Fallback logic
              if (code === 'HEELS10') {
                  couponDiscount = Math.round(subtotal * 0.1);
                  successEl.style.display = 'flex';
                  msgEl.textContent = `Coupon "${code}" applied! 10% discount`;
                  localStorage.setItem('heelsup_coupon', code);
                  updateSummary();
                  toast('Coupon applied successfully!', 'success');
            } else {
                throw new Error('Invalid coupon code');
            }
        }
      } catch(e) {
          successEl.style.display = 'none';
          couponDiscount = 0;
          localStorage.removeItem('heelsup_coupon');
          updateSummary();
          toast(e.message || 'Invalid coupon code', 'error');
      }
};

    /* ── CART UPDATES ── */
    document.addEventListener('cart:updated', () => {
      if (typeof HeelsUpCart !== 'undefined') {
        cart = HeelsUpCart.getCart();
        renderCart();
      }
    });