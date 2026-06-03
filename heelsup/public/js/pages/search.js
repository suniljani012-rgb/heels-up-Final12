'use strict';

    /* ── DOM & UTILS ── */
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');
    const encPath = s => encodeURIComponent(String(s ?? '')).replace(/%2F/g, '/');

    /* ── MOCK PRODUCTS DATABASE (Client-side Search Simulation) ── */
    const PRODUCTS = [
      { id: 1, name: 'Stiletto Block Heel Pumps', category: 'Heels', price: 1899, original_price: 2499, images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80&auto=format&fit=crop'], is_trending: true, rating: 4.8, review_count: 124 },
      { id: 2, name: 'Rose Gold Strappy Sandals', category: 'Sandals', price: 1249, original_price: 1999, images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80&auto=format&fit=crop'], rating: 4.7, review_count: 89 },
      { id: 3, name: 'Classic Tote Bag – Tan', category: 'Bags', price: 2299, original_price: 3499, images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80&auto=format&fit=crop'], is_new: true, rating: 4.9, review_count: 203 },
      { id: 4, name: 'Embroidered Juttis (Flats)', category: 'Flats', price: 949, original_price: 1449, images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614c3a?w=500&q=80&auto=format&fit=crop'], rating: 4.6, review_count: 67 },
      { id: 5, name: 'Wedge Ankle Strap Heels', category: 'Heels', price: 1799, original_price: 2299, images: ['https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=500&q=80&auto=format&fit=crop'], is_trending: true, rating: 4.5, review_count: 56 },
      { id: 6, name: 'Mini Sling Crossbody Bag', category: 'Bags', price: 1499, original_price: 2199, images: ['https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80&auto=format&fit=crop'], is_new: true, is_trending: true, rating: 4.8, review_count: 91 },
      { id: 7, name: 'Platform Mule Heels', category: 'Heels', price: 1649, original_price: 2199, images: ['https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=500&q=80&auto=format&fit=crop'], is_trending: true, rating: 4.7, review_count: 78 },
      { id: 8, name: 'Kolhapuri Flats', category: 'Flats', price: 899, original_price: 1299, images: ['https://images.unsplash.com/photo-1575005886915-d4193d56b006?w=500&q=80&fit=crop&crop=top'], rating: 4.9, review_count: 145 },
    ];

    /* ── GLOBAL UI HANDLERS (Navbar, Ann Bar, Toast, Mobile Menu) ── */
    $('ann-close')?.addEventListener('click', () => {
      const bar = $('ann-bar');
      if (bar) { bar.style.height = bar.offsetHeight + 'px'; bar.style.transition = 'height .3s ease'; setTimeout(() => bar.style.height = '0', 10); setTimeout(() => bar.remove(), 320) }
    });

    window.addEventListener('scroll', () => {
      const s = window.scrollY;
      $('navbar').classList.toggle('scrolled', s > 50);
      $('scroll-top-btn').classList.toggle('show', s > 380);
    }, { passive: true });
    $('scroll-top-btn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const mobMenu = $('mob-menu'), hamburger = $('nav-hamburger');
    function openMob() { mobMenu.classList.add('open'); hamburger.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeMob() { mobMenu.classList.remove('open'); hamburger.classList.remove('open'); document.body.style.overflow = ''; }
    hamburger?.addEventListener('click', openMob);
    $('mob-close')?.addEventListener('click', closeMob);
    $('mob-backdrop')?.addEventListener('click', closeMob);

    function toast(msg, type = 'success', dur = 4200) {
      const wrap = $('toast-wrap');
      if (!wrap) return;
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
      el.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}" aria-hidden="true"></i><span>${esc(msg)}</span>`;
      wrap.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 420) }, dur);
    }
    window.showToast = toast;

    /* ── NAV OVERLAY SEARCH (Global Search) ── */
    const srchOverlay = $('search-overlay'), navSrchInp = $('nav-search-inp'), navSrchRes = $('nav-search-res');
    function openSearch() { srchOverlay.classList.add('open'); setTimeout(() => navSrchInp?.focus(), 60) }
    function closeSearch() { srchOverlay.classList.remove('open') }
    $('search-btn')?.addEventListener('click', openSearch);
    $('search-close-btn')?.addEventListener('click', closeSearch);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeSearch(); closeMob(); closeCart(); }
      if (e.key === '/' && !srchOverlay.classList.contains('open') && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); openSearch(); }
    });

    let navSrchTimer = null;
    navSrchInp?.addEventListener('input', () => {
      clearTimeout(navSrchTimer);
      const q = navSrchInp.value.trim();
      if (q.length < 2) { navSrchRes.innerHTML = ''; return }
      navSrchTimer = setTimeout(() => doNavSearch(q), 320);
    });
    navSrchInp?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && navSrchInp.value.trim()) window.location.href = '/search.html?q=' + encodeURIComponent(navSrchInp.value.trim());
    });

    // Quick Nav Search Simulation (Reuses PRODUCTS for mockup if API fails)
    async function doNavSearch(q) {
      if (!q || q.length < 2) return;
      navSrchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">Searching…</p>';
      try {
        let prods = [];
        if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
          const data = await HeelsUpAuth.api('/api/products?q=' + encodeURIComponent(q) + '&limit=6');
          prods = (data.products || data.data || []).slice(0, 6);
        } else {
          prods = PRODUCTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
        }

        if (!prods.length) { navSrchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">No results for "' + esc(q) + '"</p>'; return; }
        navSrchRes.innerHTML = prods.map(p => {
          const imgs = Array.isArray(p.images) ? p.images : [p.image_url];
          const img = esc(imgs[0] || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70');
          return `<a href="/product/${encodeURIComponent(p.slug || p.id)}" class="search-res-item" role="option">
            <img class="search-res-img" src="${img}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">
            <div style="flex:1;min-width:0"><div class="search-res-name">${esc(p.name)}</div><div class="search-res-cat">${esc(p.category || '')}</div></div>
            <div class="search-res-price">₹${(p.price || 0).toLocaleString('en-IN')}</div>
          </a>`;
        }).join('');
      } catch (e) { navSrchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">Search unavailable.</p>'; }
    }

    /* ── CART SYSTEM ── */
    function updateCartBadge() {
      try {
        const cnt = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
        const badge = $('cart-count');
        if (badge) { badge.textContent = cnt; badge.style.display = cnt ? 'flex' : 'none' }
      } catch (e) { }
    }
    const cartDrawer = $('cart-drawer'), cartBd = $('cart-bd');
    function openCart() { cartDrawer.classList.add('open'); cartBd.classList.add('open'); document.body.style.overflow = 'hidden'; renderCart(); }
    function closeCart() { cartDrawer.classList.remove('open'); cartBd.classList.remove('open'); document.body.style.overflow = ''; }
    $('cart-open-btn')?.addEventListener('click', openCart);
    cartBd?.addEventListener('click', closeCart);
    $('cart-cls-btn')?.addEventListener('click', closeCart);
    $('cart-cont-btn')?.addEventListener('click', closeCart);

    function renderCart() {
      const bodyEl = $('cart-body-el'), footEl = $('cart-foot-el'), cntEl = $('cart-head-cnt');
      let items = [], total = 0;
      try { items = HeelsUpCart.getCart(); total = HeelsUpCart.getSubtotal() } catch (e) { }
      if (!items.length) {
        bodyEl.innerHTML = `<div class="cart-empty-state"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><p>Your bag is empty</p><button class="btn btn-primary btn-sm btn-pill" onclick="closeCart()">Start Shopping</button></div>`;
        if (footEl) footEl.style.display = 'none';
        if (cntEl) cntEl.textContent = '';
        return;
      }
      if (cntEl) cntEl.textContent = '(' + items.length + ')';
      bodyEl.innerHTML = items.map((it, i) => {
        const img = esc(it.image || '');
        return `<div class="cart-item">
          ${img ? `<img class="cart-item-img" src="${img}" alt="${esc(it.name)}" loading="lazy" onerror="this.src=''">` : '<div class="cart-item-img"></div>'}
          <div>
            <div class="ci-name">${esc(it.name)}</div>
            <div class="ci-meta">${it.size ? 'Size: ' + esc(it.size) + ' · ' : ''} ₹${(it.price || 0).toLocaleString('en-IN')} each</div>
            <div class="ci-qty">
              <button class="qty-btn" onclick="cartQty(${i},-1)"><i class="fa-solid fa-minus" style="font-size:.65rem"></i></button>
              <span class="qty-val">${it.quantity || 1}</span>
              <button class="qty-btn" onclick="cartQty(${i},1)"><i class="fa-solid fa-plus" style="font-size:.65rem"></i></button>
              <button class="ci-remove" onclick="cartRemove(${i})" aria-label="Remove Item"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          <div class="ci-price">₹${((it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}</div>
        </div>`;
      }).join('');
      if ($('cart-subtotal-val')) $('cart-subtotal-val').textContent = '₹' + total.toLocaleString('en-IN');
      const freeAt = 799, left = freeAt - total;
      const shipNote = $('cart-ship-note');
      if (shipNote) {
        shipNote.innerHTML = left > 0 ? `Add ₹${left.toLocaleString('en-IN')} more for <strong>FREE shipping</strong> 🚚` : '<i class="fa-solid fa-circle-check"></i> You qualify for FREE shipping!';
      }
      if (footEl) footEl.style.display = 'block';
    }
    window.cartQty = function (i, d) { try { HeelsUpCart.updateQty(i, d); renderCart(); updateCartBadge() } catch (e) { } };
    window.cartRemove = function (i) { try { HeelsUpCart.removeItem(i); renderCart(); updateCartBadge(); toast('Item removed from bag', 'info') } catch (e) { } };
    document.addEventListener('cart:updated', () => { updateCartBadge(); if (cartDrawer?.classList.contains('open')) renderCart(); });

    /* ── AUTH STATE ── */
    function updateNavUser() {
      try {
        const user = typeof HeelsUpAuth !== 'undefined' ? HeelsUpAuth.getUser() : null;
        const btn = $('nav-account-btn');
        const mobBtn = $('mob-login-btn');
        if (user) {
          if (btn) btn.title = `Hi, ${user.firstName || user.name || 'User'}`;
          if (mobBtn) { mobBtn.textContent = 'My Account'; mobBtn.href = '/profile'; }
        }
      } catch (e) { }
    }

    /* ── MAIN PAGE SEARCH ENGINE (Matches product.html styles) ── */

    // Generates the exact .prod-card HTML used in product.html & index.html
    function makeCard(p) {
      const imgs = Array.isArray(p.images) ? p.images : [p.image_url];
      const img = esc(imgs[0] || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70');
      const showMrp = p.show_mrp !== false && p.show_mrp !== 0;
      const disc = showMrp && p.original_price && p.price < p.original_price ? Math.round(100 - (p.price / p.original_price) * 100) : 0;
      const rating = Math.round(Number(p.rating) || 4.5);
      const rc = Number(p.review_count || p.reviews || 0);
      const slug = encPath(p.slug || p.id);
      const name = esc(p.name || '');
      const cat = esc(p.category || '');
      const id = Number(p.id) || 0;

      let stars = '';
      for (let i = 1; i <= 5; i++) {
        if (rating >= i) stars += `<i class="fa-solid fa-star"></i>`;
        else if (rating >= i - 0.5) stars += `<i class="fa-solid fa-star-half-stroke"></i>`;
        else stars += `<i class="fa-regular fa-star"></i>`;
      }

      return `
        <article class="prod-card" aria-label="${name}">
          <div class="prod-img-wrap">
            <a href="/product.html?id=${id}">
              <img src="${img}" alt="${name}" loading="lazy">
            </a>
            <div class="prod-card-badges">
              ${p.is_new ? '<span class="prod-badge badge-new">New</span>' : ''}
              ${disc > 0 ? `<span class="prod-badge badge-sale">-${disc}%</span>` : ''}
              ${p.featured && !p.is_new ? '<span class="prod-badge badge-hot">Hot</span>' : ''}
            </div>
            <button class="prod-wish-btn" onclick="toggleWish(${id},this)" aria-label="Wishlist">
              <i class="fa-regular fa-heart"></i>
            </button>
            <div class="prod-hover-actions">
              <button onclick="quickAdd(${id})" class="prod-action-btn pab-primary"><i class="fa-solid fa-bag-shopping"></i> Add</button>
              <a href="/product.html?id=${id}" class="prod-action-btn pab-outline"><i class="fa-solid fa-eye"></i> View</a>
            </div>
          </div>
          <div class="prod-body">
            <div class="prod-cat">${cat}</div>
            <h3 class="prod-name"><a href="/product.html?id=${id}">${name}</a></h3>
            <div class="prod-rating"><span class="prod-stars">${stars}</span> <span class="prod-rc">(${rc})</span></div>
            <div class="prod-price">
              <span class="price-now">${fmt(p.price)}</span>
              ${p.original_price && showMrp ? `<span class="price-was">${fmt(p.original_price)}</span> <span class="price-off">-${disc}%</span>` : ''}
            </div>
          </div>
        </article>`;
    }

    window.quickAdd = function (id) {
      toast('👠 Open product to select size', 'info');
      setTimeout(() => location.href = `/product/${id}`, 1200);
    };

    window.toggleWish = function (id, btn) {
            btn.classList.toggle('wishlisted');
            const isWish = btn.classList.contains('wishlisted');
            if (isWish) {
                btn.innerHTML = '<i class="fa-solid fa-heart" aria-hidden="true"></i>';
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.innerHTML = '<i class="fa-regular fa-heart" aria-hidden="true"></i>';
                btn.setAttribute('aria-pressed', 'false');
            }
            if (typeof HeelsUpWishlistSystem !== 'undefined') {
                if (isWish) HeelsUpWishlistSystem.add(id);
                else HeelsUpWishlistSystem.remove(id);
                // System shows toast on its own? Actually no, add() doesn't show toast, toggle does.
                // We'll show toast manually here.
                toast(isWish ? 'Added to Wishlist' : 'Removed from Wishlist', isWish ? 'success' : 'info');
            } else {
                toast(isWish ? 'Added to Wishlist' : 'Removed from Wishlist', isWish ? 'success' : 'info');
            }
        };

    // Client Side Search Logic
    window.doMainSearch = async function () {
      const q = $('main-search').value.trim().toLowerCase();
      if (!q) return;

      const defState = $('default-state');
      const noRes = $('no-results');
      const resSec = $('search-results-section');

      defState.style.display = 'none';
      noRes.style.display = 'none';
      resSec.style.display = 'none';

      // Simulate API call or use local mock data if no API
      let results = [];
      try {
        if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
          const data = await HeelsUpAuth.api('/api/products?q=' + encodeURIComponent(q) + '&limit=20');
          results = data.products || data.data || [];
        } else {
          // Fallback to local mock data filtering
          results = PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        }
      } catch (e) {
        results = PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
      }

      if (!results.length) {
        noRes.style.display = 'block';
        return;
      }

      $('results-meta').innerHTML = `Found <strong>${results.length} results</strong> for "${esc(q)}"`;
      $('results-grid').innerHTML = results.map(makeCard).join('');
      resSec.style.display = 'block';

      // Update URL
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?q=' + encodeURIComponent(q);
      window.history.pushState({ path: newUrl }, '', newUrl);
    }

    window.setSearch = function (q) {
      $('main-search').value = q;
      doMainSearch();
    }

    $('main-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doMainSearch();
    });

    /* ── INIT ── */
    document.addEventListener('DOMContentLoaded', () => {
      updateCartBadge();
      updateNavUser();

      // Check URL params
      const params = new URLSearchParams(location.search);
      const q = params.get('q');
      if (q) {
        $('main-search').value = q;
        doMainSearch();
      } else {
        // Render trending default
        $('trending-default').innerHTML = PRODUCTS.filter(p => p.is_trending).map(makeCard).join('');
      }
    });