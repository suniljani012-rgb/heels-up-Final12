/**
 * HeelsUp — Shared UI Components Library v5.0 (Enterprise Edition)
 * Provides: Lucide Icons, Logo, Toast, Loader, Cart Badge, Auth helpers,
 *           Admin Topbar Notifications, Performance Cache, Email API
 */
(function () {
  'use strict';

  const API_BASE = (window.HEELSUP_CONFIG && window.HEELSUP_CONFIG.API_BASE) || 'https://heelsup-api.heelsup.workers.dev';

  // ══════════════════════════════════════════════════════════════
  // ── PERFORMANCE CACHE (In-memory + localStorage)
  // ══════════════════════════════════════════════════════════════
  const _cache = {};
  const _cacheExpiry = {};
  const CACHE_TTL = 30000; // 30 seconds

  function cacheGet(key) {
    if (_cacheExpiry[key] && Date.now() > _cacheExpiry[key]) {
      delete _cache[key];
      delete _cacheExpiry[key];
      return null;
    }
    return _cache[key] !== undefined ? _cache[key] : null;
  }

  function cacheSet(key, value, ttl = CACHE_TTL) {
    _cache[key] = value;
    _cacheExpiry[key] = Date.now() + ttl;
  }

  function cacheClear(pattern = null) {
    if (!pattern) {
      Object.keys(_cache).forEach(k => { delete _cache[k]; delete _cacheExpiry[k]; });
      return;
    }
    Object.keys(_cache).forEach(k => {
      if (k.includes(pattern)) { delete _cache[k]; delete _cacheExpiry[k]; }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ── TOAST SYSTEM (Premium, accessible)
  // ══════════════════════════════════════════════════════════════
  function ensureToastContainer() {
    let c = document.getElementById('hu-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'hu-toast-container';
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:360px;width:calc(100vw - 48px)';
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(...args) {
    let msg = '', type = 'success', duration = 4000;
    const knownTypes = ['success', 'error', 'warning', 'info'];
    if (knownTypes.includes(args[0]) && args.length >= 2) {
      type = args[0];
      msg = args.length === 3 ? `<strong>${args[1]}</strong>: ${args[2]}` : args[1];
    } else {
      msg = args[0] || '';
      if (args[1]) type = args[1];
      if (args[2]) duration = args[2];
    }

    const c = ensureToastContainer();
    const t = document.createElement('div');
    const configs = {
      success: { bg: 'linear-gradient(135deg,#166534,#15803d)', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`, border: '#22c55e' },
      error:   { bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`, border: '#ef4444' },
      warning: { bg: 'linear-gradient(135deg,#78350f,#b45309)', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, border: '#f59e0b' },
      info:    { bg: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`, border: '#3b82f6' }
    };
    const cfg = configs[type] || configs.info;

    t.style.cssText = `background:${cfg.bg};color:#fff;padding:14px 18px;border-radius:14px;display:flex;align-items:flex-start;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3),0 0 0 1px ${cfg.border}40;pointer-events:all;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;transform:translateX(110%);opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);border-left:3px solid ${cfg.border};backdrop-filter:blur(12px);`;
    t.innerHTML = `<span style="flex-shrink:0;margin-top:1px;opacity:0.9">${cfg.icon}</span><span style="flex:1;line-height:1.5">${msg}</span><button onclick="this.parentNode.remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;padding:0;font-size:20px;line-height:1;margin-left:4px;pointer-events:all;flex-shrink:0;transition:color 0.2s" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">×</button>`;

    c.appendChild(t);
    requestAnimationFrame(() => { t.style.transform = 'translateX(0)'; t.style.opacity = '1'; });
    const timer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(110%)';
      setTimeout(() => t.remove(), 400);
    }, duration);
    t.querySelector('button').addEventListener('click', () => clearTimeout(timer));
  }

  // ══════════════════════════════════════════════════════════════
  // ── FULL-SCREEN LOADER (PhonePe / Myntra style)
  // ══════════════════════════════════════════════════════════════
  let _loaderTimeout = null;

  function showLoader(msg = 'Loading...') {
    let el = document.getElementById('hu-full-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hu-full-loader';
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:24px">
          <div style="position:relative;width:80px;height:80px">
            <div style="position:absolute;inset:0;border-radius:50%;border:3px solid rgba(201,169,110,0.15);"></div>
            <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#c9a96e;border-right-color:#c9a96e;animation:hu-spin 1s linear infinite;"></div>
            <div style="position:absolute;inset:8px;border-radius:50%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;">
              <img src="logo.png" alt="" style="width:36px;height:36px;object-fit:contain;animation:hu-pulse 1.8s ease-in-out infinite;filter:brightness(0) invert(1);" onerror="this.style.display='none'">
            </div>
          </div>
          <div id="hu-loader-msg" style="font-family:'DM Sans',sans-serif;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:0.08em;font-weight:500"></div>
          <div style="display:flex;gap:6px">
            <span style="width:6px;height:6px;border-radius:50%;background:#c9a96e;animation:hu-dot 1.4s ease-in-out infinite 0s"></span>
            <span style="width:6px;height:6px;border-radius:50%;background:#c9a96e;animation:hu-dot 1.4s ease-in-out infinite 0.2s"></span>
            <span style="width:6px;height:6px;border-radius:50%;background:#c9a96e;animation:hu-dot 1.4s ease-in-out infinite 0.4s"></span>
          </div>
        </div>
        <style>
          @keyframes hu-spin { to { transform: rotate(360deg); } }
          @keyframes hu-pulse { 0%,100%{transform:scale(0.85);opacity:0.7} 50%{transform:scale(1);opacity:1} }
          @keyframes hu-dot { 0%,80%,100%{transform:scale(0);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        </style>`;
      el.style.cssText = 'position:fixed;inset:0;background:rgba(13,13,13,0.95);backdrop-filter:blur(8px);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.3s';
      document.body.appendChild(el);
    }
    const msgEl = document.getElementById('hu-loader-msg');
    if (msgEl) msgEl.textContent = msg;
    el.style.display = 'flex';
    el.style.opacity = '1';

    // Auto-hide after 15s to prevent infinite lock
    clearTimeout(_loaderTimeout);
    _loaderTimeout = setTimeout(() => hideLoader(), 15000);
  }

  function hideLoader() {
    clearTimeout(_loaderTimeout);
    const el = document.getElementById('hu-full-loader');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 300);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ── SKELETON LOADER
  // ══════════════════════════════════════════════════════════════
  function skeleton(count = 4, type = 'product') {
    const styles = `<style>.hu-skel{background:linear-gradient(90deg,#f0ede8 25%,#e4dfd8 50%,#f0ede8 75%);background-size:200% 100%;animation:hu-shimmer 1.5s infinite}.hu-skel-card{background:#fff;border-radius:12px;padding:16px;border:1px solid #ede8df;overflow:hidden}.hu-skel-img{height:220px;margin-bottom:12px;border-radius:8px}.hu-skel-line{height:13px;margin-bottom:8px;border-radius:6px}.hu-skel-line.short{width:60%}.hu-skel-line.price{height:18px;width:40%;margin-top:12px}@keyframes hu-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>`;
    if (type === 'product') {
      return styles + Array(count).fill(0).map(() => `<div class="hu-skel-card"><div class="hu-skel hu-skel-img"></div><div class="hu-skel hu-skel-line"></div><div class="hu-skel hu-skel-line short"></div><div class="hu-skel hu-skel-line price"></div></div>`).join('');
    }
    if (type === 'row') {
      return styles + Array(count).fill(0).map(() => `<div class="hu-skel" style="height:52px;margin-bottom:8px;border-radius:10px"></div>`).join('');
    }
    return styles + Array(count).fill(0).map(() => `<div class="hu-skel" style="height:50px;margin-bottom:8px;border-radius:8px"></div>`).join('');
  }

  // ══════════════════════════════════════════════════════════════
  // ── CART & WISHLIST BADGES
  // ══════════════════════════════════════════════════════════════
  function updateCartBadge() {
    try {
      const cart = JSON.parse(localStorage.getItem('heelsup_cart') || '[]');
      const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = count || '';
        el.style.display = count ? 'flex' : 'none';
      });
    } catch(e) {}
  }

  function updateWishlistBadge() {
    try {
      const wl = JSON.parse(localStorage.getItem('heelsup_wishlist') || '[]');
      document.querySelectorAll('[data-wishlist-count]').forEach(el => {
        el.textContent = wl.length || '';
        el.style.display = wl.length ? 'flex' : 'none';
      });
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════
  // ── MOBILE BOTTOM NAV
  // ══════════════════════════════════════════════════════════════
  function renderMobileNav(active = '') {
    const navItems = [
      { key: 'home',     href: 'index.html',    label: 'Home',    icon: 'home' },
      { key: 'shop',     href: 'shop.html',     label: 'Shop',    icon: 'shopping-bag' },
      { key: 'wishlist', href: 'wishlist.html', label: 'Wishlist',icon: 'heart' },
      { key: 'cart',     href: 'cart.html',     label: 'Cart',    icon: 'shopping-cart', badge: true },
      { key: 'profile',  href: 'profile.html',  label: 'Account', icon: 'user' },
    ];
    const nav = document.createElement('nav');
    nav.id = 'hu-mobile-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Mobile navigation');
    nav.innerHTML = navItems.map(item => `
      <a href="${item.href}" aria-label="${item.label}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 4px;text-decoration:none;color:${item.key===active?'#c9a96e':'#8c8580'};position:relative;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:${item.key===active?'700':'400'}">
        <span style="position:relative;display:inline-flex">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="${item.icon}"></svg>
          ${item.badge ? `<span data-cart-count style="position:absolute;top:-6px;right:-8px;background:#d4456b;color:#fff;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;display:none;align-items:center;justify-content:center;border:1.5px solid #fff"></span>` : ''}
        </span>
        <span>${item.label}</span>
      </a>`).join('');

    const style = document.createElement('style');
    style.textContent = `#hu-mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);border-top:1px solid #ede8df;z-index:999;padding:6px 0 calc(6px + env(safe-area-inset-bottom));box-shadow:0 -4px 20px rgba(0,0,0,0.08)}@media(max-width:768px){#hu-mobile-nav{display:flex!important}body{padding-bottom:70px}}`;
    document.head.appendChild(style);
    document.body.appendChild(nav);
    updateCartBadge();
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
  }

  // ══════════════════════════════════════════════════════════════
  // ── ANNOUNCEMENT BAR
  // ══════════════════════════════════════════════════════════════
  function renderAnnouncementBar(messages = []) {
    const defaults = ['🎉 Free Shipping on orders above ₹499', '✨ New Arrivals Every Week — Shop Now', '🔒 100% Secure Payments via Razorpay'];
    const msgs = messages.length ? messages : defaults;
    const bar = document.createElement('div');
    bar.style.cssText = 'background:#0d0d0d;color:rgba(255,255,255,0.85);font-size:12px;font-weight:500;letter-spacing:0.04em;padding:9px 0;text-align:center;position:relative;z-index:201;overflow:hidden;';
    let i = 0;
    bar.innerHTML = `<div id="hu-ann-text" style="transition:opacity 0.4s">${msgs[0]}</div>`;
    document.body.insertAdjacentElement('afterbegin', bar);
    if (msgs.length > 1) {
      setInterval(() => {
        i = (i + 1) % msgs.length;
        const t = bar.querySelector('#hu-ann-text');
        if (!t) return;
        t.style.opacity = '0';
        setTimeout(() => { t.textContent = msgs[i]; t.style.opacity = '1'; }, 400);
      }, 3500);
    }
    return bar;
  }

  // ══════════════════════════════════════════════════════════════
  // ── CORS-SAFE API FETCH (with cache & retry)
  // ══════════════════════════════════════════════════════════════
  async function apiFetch(path, opts = {}, useCache = false) {
    if (useCache && opts.method === undefined) {
      const cached = cacheGet('api:' + path);
      if (cached !== null) return cached;
    }

    const token = localStorage.getItem('heelsup_token');
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    let lastError;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, { ...opts, headers });
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
        if (!res.ok) {
          const err = new Error((data && (data.error || data.message)) || `Request failed: ${res.status}`);
          err.status = res.status;
          if (res.status === 401) { /* Don't retry auth errors */ throw err; }
          throw err;
        }
        if (useCache && !opts.method) cacheSet('api:' + path, data);
        return data;
      } catch(err) {
        lastError = err;
        if (err.status === 401 || attempt === 2) throw err;
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  // ══════════════════════════════════════════════════════════════
  // ── FORMAT HELPERS
  // ══════════════════════════════════════════════════════════════
  function formatPrice(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatDate(d, short = false) {
    if (!d) return '—';
    const opts = short
      ? { day: '2-digit', month: 'short' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(d).toLocaleDateString('en-IN', opts);
  }

  function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString('en-IN');
  }

  function statusBadge(s) {
    const map = {
      placed:     ['#dbeafe','#1d4ed8'], confirmed:  ['#dcfce7','#15803d'],
      shipped:    ['#f3e8ff','#7e22ce'], delivered:  ['#d1fae5','#065f46'],
      cancelled:  ['#fee2e2','#b91c1c'], returned:   ['#fef3c7','#92400e'],
      paid:       ['#dcfce7','#15803d'], pending:    ['#fef3c7','#b45309'],
      failed:     ['#fee2e2','#b91c1c'], processing: ['#e0e7ff','#3730a3'],
      active:     ['#dcfce7','#15803d'], inactive:   ['#f1f5f9','#64748b'],
      approved:   ['#dcfce7','#15803d'], rejected:   ['#fee2e2','#b91c1c'],
      draft:      ['#f1f5f9','#64748b'], published:  ['#dcfce7','#15803d'],
    };
    const [bg, color] = map[(s||'').toLowerCase()] || ['#f1f5f9','#64748b'];
    return `<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.04em;background:${bg};color:${color};text-transform:uppercase;white-space:nowrap;">${s||'unknown'}</span>`;
  }

  // ══════════════════════════════════════════════════════════════
  // ── SCROLL REVEAL ANIMATION
  // ══════════════════════════════════════════════════════════════
  function initScrollReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.style.cssText += ';opacity:0;transform:translateY(24px);transition:opacity 0.6s ease,transform 0.6s ease';
      obs.observe(el);
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ── BACK TO TOP BUTTON
  // ══════════════════════════════════════════════════════════════
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;
    btn.style.cssText = 'position:fixed;bottom:90px;right:20px;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#c9a96e,#8b6914);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(201,169,110,0.4);display:none;align-items:center;justify-content:center;z-index:998;transition:all 0.3s;';
    btn.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(btn);
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
      btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
    }, { passive: true });
  }

  // ══════════════════════════════════════════════════════════════
  // ── LOGO MANAGEMENT (high-contrast outline filter on all backgrounds)
  // ══════════════════════════════════════════════════════════════
  function replaceLogoInHeaders() {
    if (!document.getElementById('hu-logo-styles')) {
      const style = document.createElement('style');
      style.id = 'hu-logo-styles';
      style.textContent = `
        img.hu-logo-light { filter: brightness(0) invert(1) !important; }
        img.hu-logo-dark  { filter: none !important; }
        img[src*="logo.png"]:not(.hu-logo-light):not(.hu-logo-dark) {
          filter: drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 3px rgba(201,169,110,0.5)) !important;
        }
        .admin-sidebar img[src*="logo.png"] {
          filter: brightness(0) invert(1) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Replace text brand instances in specific containers
    const brandContainers = document.querySelectorAll('.sidebar-brand, .admin-sidebar-logo, .navbar-brand, .footer-logo');
    brandContainers.forEach(container => {
      if (/Heels\s*Up/i.test(container.textContent) && !container.querySelector('img[src*="logo.png"]')) {
        container.innerHTML = `<img src="/logo.png" alt="HeelsUp Logo" style="height:32px;object-fit:contain;display:inline-block;vertical-align:middle;" onerror="this.outerHTML='<span style=\'font-weight:700\'>HeelsUp</span>'">`;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ── LUCIDE ICON ENGINE (auto-translates fa- classes → lucide)
  // ══════════════════════════════════════════════════════════════
  const FA_TO_LUCIDE = {
    'gauge': 'layout-dashboard', 'grid-2': 'layout-grid', 'grid': 'layout-grid',
    'chart-line': 'trending-up', 'chart-bar': 'bar-chart-2', 'chart-pie': 'pie-chart',
    'box': 'package', 'boxes': 'package', 'boxes-stacked': 'package-2', 'cube': 'package',
    'shoe-prints': 'footprints', 'layer-group': 'layers',
    'bag-shopping': 'shopping-bag', 'shopping-cart': 'shopping-cart', 'cart-shopping': 'shopping-bag',
    'users': 'users', 'user': 'user', 'user-gear': 'user-cog',
    'ticket': 'ticket', 'tags': 'tag', 'tag': 'tag',
    'star': 'star', 'rotate-left': 'rotate-ccw',
    'image': 'image', 'images': 'images', 'file-text': 'file-text',
    'layout': 'layout', 'gear': 'settings', 'cog': 'settings',
    'truck': 'truck', 'percent': 'percent',
    'shield': 'shield-check', 'shield-halved': 'shield',
    'cash-register': 'monitor', 'monitor': 'monitor',
    'external-link': 'external-link', 'store': 'store',
    'search': 'search', 'magnifying-glass': 'search',
    'heart': 'heart', 'trash': 'trash-2', 'trash-alt': 'trash-2',
    'plus': 'plus', 'minus': 'minus', 'times': 'x', 'xmark': 'x',
    'chevron-right': 'chevron-right', 'chevron-left': 'chevron-left',
    'chevron-down': 'chevron-down', 'chevron-up': 'chevron-up',
    'bars': 'menu', 'menu': 'menu',
    'sign-out-alt': 'log-out', 'sign-out': 'log-out',
    'arrow-right-from-bracket': 'log-out', 'right-from-bracket': 'log-out',
    'bell': 'bell', 'bell-slash': 'bell-off',
    'credit-card': 'credit-card', 'receipt': 'receipt',
    'lock': 'lock', 'unlock': 'unlock',
    'envelope': 'mail', 'phone': 'phone',
    'map-marker-alt': 'map-pin', 'map-marker': 'map-pin', 'location-dot': 'map-pin',
    'facebook': 'facebook', 'instagram': 'instagram', 'twitter': 'twitter',
    'print': 'printer', 'filter': 'filter', 'sliders': 'sliders-horizontal',
    'check': 'check', 'check-circle': 'check-circle', 'circle-check': 'check-circle',
    'info-circle': 'info', 'circle-info': 'info',
    'exclamation-circle': 'alert-circle', 'circle-exclamation': 'alert-circle',
    'exclamation-triangle': 'alert-triangle', 'triangle-exclamation': 'alert-triangle',
    'home': 'home', 'eye': 'eye', 'eye-slash': 'eye-off',
    'edit': 'edit-2', 'pen': 'edit-2', 'pen-to-square': 'edit-2',
    'save': 'save', 'download': 'download', 'upload': 'upload',
    'share': 'share-2', 'copy': 'copy', 'question-circle': 'help-circle',
    'history': 'history', 'key': 'key', 'power-off': 'power', 'sync': 'refresh-cw',
    'calendar': 'calendar', 'calendar-days': 'calendar',
    'wallet': 'wallet', 'barcode': 'barcode', 'ban': 'ban',
    'rotate-right': 'rotate-cw', 'rotate-left': 'rotate-ccw',
    'file-import': 'file-input', 'file-export': 'file-output',
    'file-csv': 'file-spreadsheet', 'table-list': 'table',
    'indian-rupee-sign': 'indian-rupee', 'clock': 'clock',
    'spinner': 'loader-2', 'circle-xmark': 'x-circle', 'circle-notch': 'loader',
    'arrow-up': 'arrow-up', 'arrow-down': 'arrow-down',
    'arrow-left': 'arrow-left', 'arrow-right': 'arrow-right',
    'star-half-stroke': 'star-half', 'whatsapp': 'message-circle',
  };

  function translateFaToLucide(root = document) {
    if (!window.lucide) return;
    const elements = root.querySelectorAll('i[class*="fa-"], span[class*="fa-"]');
    elements.forEach(el => {
      let faName = '';
      el.classList.forEach(cls => {
        if (cls.startsWith('fa-') && !['fa-solid','fa-regular','fa-brands','fa-light','fa-thin','fa-duotone','fa-spin','fa-pulse'].includes(cls)) {
          faName = cls;
        }
      });
      if (faName) {
        const cleanName = faName.replace(/^fa-/, '');
        const lucideName = FA_TO_LUCIDE[cleanName] || cleanName;
        const hasSpin = el.classList.contains('fa-spin') || el.classList.contains('fa-pulse');
        el.setAttribute('data-lucide', lucideName);
        el.className = Array.from(el.classList).filter(c => !c.startsWith('fa-')).join(' ');
        el.classList.add('hu-icon');
        if (hasSpin) el.style.animation = 'hu-spin 1s linear infinite';
      }
    });
    window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
  }

  function initLucideIcons() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes hu-spin { to { transform: rotate(360deg); } }
      .hu-icon { display:inline-block;vertical-align:middle;width:1.15em;height:1.15em; }
      [data-lucide] { display:inline-block;vertical-align:middle; }
    `;
    document.head.appendChild(style);

    if (window.lucide) {
      window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
      translateFaToLucide();
      observeNewIcons();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
    script.onload = () => {
      window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
      translateFaToLucide();
      observeNewIcons();
    };
    document.head.appendChild(script);
  }

  function observeNewIcons() {
    if (!window.lucide) return;
    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.querySelector('[data-lucide]') || node.matches('[data-lucide]') ||
                node.querySelector('i[class*="fa-"]') || node.matches('i[class*="fa-"]')) {
              needsUpdate = true;
            }
          }
        });
      });
      if (needsUpdate) {
        requestAnimationFrame(() => {
          if (window.lucide) {
            translateFaToLucide();
            window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ══════════════════════════════════════════════════════════════
  // ── ADMIN NOTIFICATIONS BADGE (live fetch)
  // ══════════════════════════════════════════════════════════════
  async function updateAdminNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    try {
      const data = await apiFetch('/api/admin/stats', {}, false);
      // Show pending orders count as the badge
      const count = (data.pendingOrders || 0) + (data.pendingReturns || 0);
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════
  // ── EXPORT
  // ══════════════════════════════════════════════════════════════
  window.HeelsUpUI = {
    API_BASE,
    // Cache
    cacheGet, cacheSet, cacheClear,
    // UI
    showToast, showLoader, hideLoader, skeleton,
    // Data
    updateCartBadge, updateWishlistBadge,
    renderMobileNav, renderAnnouncementBar,
    // API
    apiFetch,
    // Formatters
    formatPrice, formatDate, formatDateTime, formatNumber, statusBadge,
    // Utils
    initScrollReveal, initBackToTop,
    // Icons & Logo
    replaceLogoInHeaders, initLucideIcons, translateFaToLucide,
    // Admin
    updateAdminNotifBadge,
  };

  // ── Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    updateWishlistBadge();
    initScrollReveal();
    initBackToTop();
    initLucideIcons();
    replaceLogoInHeaders();

    // If on admin page, update notification badge periodically
    if (document.querySelector('.admin-layout, .admin-sidebar')) {
      updateAdminNotifBadge();
      setInterval(updateAdminNotifBadge, 60000); // Poll every 60s
    }
  });
})();
