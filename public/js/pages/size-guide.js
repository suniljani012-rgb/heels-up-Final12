'use strict';

    // Initialize Lucide Icons
    lucide.createIcons();

    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const $ = id => document.getElementById(id);

    /* ── TOAST ── */
    function toast(msg, type = 'success', dur = 4200) {
      const wrap = $('toast-wrap'); if (!wrap) return;
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const icons = { success: 'check-circle', error: 'x-circle' };
      el.innerHTML = `<i data-lucide="${icons[type] || 'check-circle'}" class="w-5 h-5"></i><span>${esc(msg)}</span>`;
      wrap.appendChild(el);
      lucide.createIcons({ root: el });
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

    /* ── INIT ── */
    document.addEventListener('DOMContentLoaded', () => {
      updateCartBadge();
    });
    document.addEventListener('cart:updated', () => updateCartBadge());