'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
      initNavbar();
      initSearch();
      updateCartBadge();

      // Populate Date
      const dateEl = document.getElementById('order-date');
      const today = new Date();
      dateEl.textContent = today.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

      // Order Logic
      const params = new URLSearchParams(location.search);
      const num = params.get('num') || 'HU-' + Math.random().toString(36).substr(2, 8).toUpperCase() + '-2026';
      const id = params.get('id');

      document.getElementById('order-num').textContent = num;

      if (id) {
        try {
          const data = await HeelsUpAuth.api('/api/orders/my');
          const order = (data.orders || []).find(o => o.id == id);
          if (order) {
            document.getElementById('order-total').textContent = '₹' + Number(order.totalAmount || order.total_amount || 0).toLocaleString('en-IN');
            document.getElementById('order-status').innerHTML = '<i class="fa-solid fa-spinner"></i> ' + (order.orderStatus || order.status || 'Processing').charAt(0).toUpperCase() + (order.orderStatus || order.status || 'Processing').slice(1);
          }
        } catch (e) {
          console.warn("Could not fetch specific order data.", e);
        }
      } else {
        // Fallback simulate total from Cart for visual feedback if testing
        try {
          if (typeof HeelsUpCart !== 'undefined') {
            const total = HeelsUpCart.getSubtotal();
            if (total > 0) document.getElementById('order-total').textContent = '₹' + (total / 100).toLocaleString('en-IN');
          }
        } catch (e) { }
      }

      // Auth UI Sync
      const user = HeelsUpAuth.getUser();
      const mobLogin = document.getElementById('mob-login-btn');
      if (user) {
        document.getElementById('nav-account-btn')?.setAttribute('title', `Hi, ${user.firstName || 'User'}`);
        if (mobLogin) { mobLogin.textContent = 'My Account'; mobLogin.href = '/profile.html'; }
      }

      // Clear cart because order is successful
      if (typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.clearCart();
        updateCartBadge();
      }
    });

    /* ── UI Logic (Matches shop.html) ── */
    function initNavbar() {
      const navbar = document.getElementById('navbar');
      window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 50); }, { passive: true });

      const mobMenu = document.getElementById('mob-menu');
      const hamburger = document.getElementById('nav-hamburger');
      hamburger?.addEventListener('click', () => { hamburger.classList.toggle('open'); mobMenu.classList.add('open'); document.body.style.overflow = 'hidden'; });
      const closeMob = () => { mobMenu.classList.remove('open'); hamburger.classList.remove('open'); document.body.style.overflow = ''; };
      document.getElementById('mob-close')?.addEventListener('click', closeMob);
      document.getElementById('mob-backdrop')?.addEventListener('click', closeMob);
    }

    function initSearch() {
      const overlay = document.getElementById('search-overlay'), inp = document.getElementById('search-inp');
      document.getElementById('search-btn')?.addEventListener('click', () => { overlay.classList.add('open'); setTimeout(() => inp.focus(), 60); });
      document.getElementById('search-close-btn')?.addEventListener('click', () => overlay.classList.remove('open'));
      document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });
      inp?.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.value.trim()) window.location.href = '/search.html?q=' + encodeURIComponent(inp.value.trim()); });
    }

    function updateCartBadge() {
      try {
        const cnt = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
        const b = document.getElementById('cart-count');
        if (b) { b.textContent = cnt; b.style.display = cnt > 0 ? 'flex' : 'none'; }
      } catch (e) { }
    }