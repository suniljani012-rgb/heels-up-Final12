'use strict';

    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const $ = id => document.getElementById(id);

    /* ── TOAST ── */
    function toast(msg, type = 'success', dur = 4200) {
      const wrap = $('toast-wrap'); if (!wrap) return;
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark' };
      el.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-check'}"></i><span>${esc(msg)}</span>`;
      wrap.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 420) }, dur);
    }

    /* ── ANN BAR ── */
    $('ann-close')?.addEventListener('click', () => {
      const bar = $('ann-bar');
      if (bar) { bar.style.height = bar.offsetHeight + 'px'; bar.style.overflow = 'hidden'; bar.style.transition = 'height .3s ease'; setTimeout(() => bar.style.height = '0', 10); setTimeout(() => bar.remove(), 320) }
    });

    /* ── NAVBAR ── */
    window.addEventListener('scroll', () => {
      $('navbar').classList.toggle('scrolled', window.scrollY > 50);
      $('scroll-top-btn').classList.toggle('show', window.scrollY > 380);
    }, { passive: true });
    $('scroll-top-btn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ── MOBILE MENU ── */
    const mobMenu = $('mob-menu'), hamburger = $('nav-hamburger');
    function openMob() { mobMenu.classList.add('open'); hamburger.classList.add('open'); document.body.style.overflow = 'hidden' }
    function closeMob() { mobMenu.classList.remove('open'); hamburger.classList.remove('open'); document.body.style.overflow = '' }
    hamburger?.addEventListener('click', openMob);
    $('mob-close')?.addEventListener('click', closeMob);
    $('mob-backdrop')?.addEventListener('click', closeMob);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMob() });

    /* ── CART BADGE ── */
    function updateCartBadge() {
      try {
        const cnt = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
        const badge = $('cart-count');
        if (badge) { badge.textContent = cnt; badge.style.display = cnt ? 'flex' : 'none' }
      } catch (e) { }
    }

    /* ── CART DRAWER ── */
    const cartDrawer = $('cart-drawer'), cartBd = $('cart-bd');
    function openCart() { cartDrawer.classList.add('open'); cartBd.classList.add('open'); document.body.style.overflow = 'hidden' }
    function closeCart() { cartDrawer.classList.remove('open'); cartBd.classList.remove('open'); document.body.style.overflow = '' }
    $('cart-open-btn')?.addEventListener('click', openCart);
    cartBd?.addEventListener('click', closeCart);
    $('cart-cls-btn')?.addEventListener('click', closeCart);
    $('cart-cont-btn')?.addEventListener('click', closeCart);

    /* ── FAQ ACCORDION ── */
    window.toggleFaq = function (item) {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    };

    /* ── PINCODE CHECKER ── */
    window.fillPin = function (pin) {
      const inp = $('pin-input');
      if (inp) { inp.value = pin; checkPincode() }
    };

    window.checkPincode = function () {
      const inp = $('pin-input');
      const res = $('pin-result');
      if (!inp || !res) return;
      const pin = inp.value.trim();
      if (!/^\d{6}$/.test(pin)) {
        res.className = 'pin-result na';
        res.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Please enter a valid 6-digit pincode.';
        return;
      }
      res.className = 'pin-result';
      res.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking availability…';
      // Simulate API check with realistic data
      setTimeout(() => {
        const jodhpur = pin.startsWith('342');
        const rajasthan = ['302', '313', '324', '334', '335', '341', '344', '345'].some(p => pin.startsWith(p));
        const remote = ['737', '790', '793', '795', '799', '744'].some(p => pin.startsWith(p));
        if (jodhpur) {
          res.className = 'pin-result ok';
          res.innerHTML = '<i class="fa-solid fa-circle-check"></i> <div><strong>Delivery Available!</strong> Estimated: <strong>1-2 days</strong> (Same-day available before 12 PM) · <strong>COD: Coming Soon</strong> · Free on ₹799+</div>';
        } else if (remote) {
          res.className = 'pin-result na';
          res.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <div>Delivery available in <strong>7-12 days</strong>. COD not available in this area. Shipping: ₹49 flat.</div>';
        } else if (rajasthan) {
          res.className = 'pin-result ok';
          res.innerHTML = '<i class="fa-solid fa-circle-check"></i> <div><strong>Delivery Available!</strong> Estimated: <strong>2-3 days</strong> · <strong>COD: Coming Soon</strong> · Free on ₹799+</div>';
        } else {
          res.className = 'pin-result ok';
          res.innerHTML = '<i class="fa-solid fa-circle-check"></i> <div><strong>Delivery Available!</strong> Estimated: <strong>4-6 days</strong> · <strong>COD: Coming Soon</strong> · Free on ₹799+</div>';
        }
      }, 900);
    };

    // Enter key on pincode
    $('pin-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') checkPincode() });

    /* ── TRACK ORDER ── */
    window.goTrack = function () {
      const val = $('track-input')?.value.trim();
      if (!val) { toast('Please enter Order ID or AWB number', 'error'); return }
      window.location.href = '/order-tracking.html?id=' + encodeURIComponent(val);
    };
    $('track-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') goTrack() });

    /* ── INIT ── */
    document.addEventListener('DOMContentLoaded', () => {
      updateCartBadge();
    });
    document.addEventListener('cart:updated', () => updateCartBadge());