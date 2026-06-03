/*!
     * HeelsUp Product Detail Engine
     * Fully Unified with Global Standards
     */
    'use strict';

    /* ── DOM & SECURITY UTILS ── */
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');
    const encPath = s => encodeURIComponent(String(s ?? '')).replace(/%2F/g, '/');

    /* ── STATE ── */
    let currentProduct = null;
    let selectedSize = '';
    let quantity = 1;
    let reviewRating = 0;

    const FALLBACK_IMAGES = [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80&auto=format&fit=crop'
    ];

    /* ── INIT ── */
    document.addEventListener('DOMContentLoaded', () => {
      initGlobalComponents();
      loadProduct();
      initAccordions();
      initModal();
      updateNavUser();
    });

    /* ── GLOBAL UI HANDLERS (Navbar, Search, Cart, Toasts) ── */
    function initGlobalComponents() {
      // Ann Bar
      $('ann-close')?.addEventListener('click', () => {
        const bar = $('ann-bar');
        if (bar) { bar.style.height = bar.offsetHeight + 'px'; bar.style.transition = 'height .3s ease'; setTimeout(() => bar.style.height = '0', 10); setTimeout(() => bar.remove(), 320) }
      });

      // Scroll changes
      window.addEventListener('scroll', () => {
        const s = window.scrollY;
        $('navbar').classList.toggle('scrolled', s > 50);
        $('scroll-top-btn').classList.toggle('show', s > 380);
      }, { passive: true });
      $('scroll-top-btn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

      // Mobile Menu
      const mobMenu = $('mob-menu'), hamburger = $('nav-hamburger');
      function openMob() { mobMenu.classList.add('open'); hamburger.classList.add('open'); document.body.style.overflow = 'hidden'; }
      function closeMob() { mobMenu.classList.remove('open'); hamburger.classList.remove('open'); document.body.style.overflow = ''; }
      hamburger?.addEventListener('click', openMob);
      $('mob-close')?.addEventListener('click', closeMob);
      $('mob-backdrop')?.addEventListener('click', closeMob);

      // Search
      const srchOverlay = $('search-overlay'), srchInp = $('search-inp'), srchRes = $('search-res');
      function openSearch() { srchOverlay.classList.add('open'); setTimeout(() => srchInp?.focus(), 60) }
      function closeSearch() { srchOverlay.classList.remove('open') }
      $('search-btn')?.addEventListener('click', openSearch);
      $('search-close-btn')?.addEventListener('click', closeSearch);

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeSearch(); closeMob(); closeCart(); closeModal(); }
        if (e.key === '/' && !srchOverlay.classList.contains('open') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); openSearch(); }
      });

      let srchTimer = null;
      srchInp?.addEventListener('input', () => {
        clearTimeout(srchTimer);
        const q = srchInp.value.trim();
        if (q.length < 2) { srchRes.innerHTML = ''; return }
        srchTimer = setTimeout(() => doSearch(q), 320);
      });
      srchInp?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && srchInp.value.trim()) window.location.href = '/search.html?q=' + encodeURIComponent(srchInp.value.trim());
      });

      async function doSearch(q) {
        if (!q || q.length < 2) return;
        srchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">Searching…</p>';
        try {
          const data = await HeelsUpAuth.api('/api/products?q=' + encodeURIComponent(q) + '&limit=6');
          const prods = (data.products || data.data || []).slice(0, 6);
          if (!prods.length) { srchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">No results for "' + esc(q) + '"</p>'; return; }
          srchRes.innerHTML = prods.map(p => {
            const img = esc((p.images && p.images[0]) || p.image_url || '');
            return `<a href="/product/${encodeURIComponent(p.slug || p.id)}" class="search-res-item" role="option" style="text-decoration:none">
              ${img ? `<img class="search-res-img" src="${img}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">` : '<div class="search-res-img"></div>'}
              <div style="flex:1;min-width:0"><div class="search-res-name">${esc(p.name)}</div><div class="search-res-cat">${esc(p.category || '')}</div></div>
              <div class="search-res-price">₹${(p.price || 0).toLocaleString('en-IN')}</div>
            </a>`;
          }).join('');
        } catch (e) { srchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">Search unavailable.</p>'; }
      }

      // Cart
      const cartDrawer = $('cart-drawer'), cartBd = $('cart-bd');
      function openCart() { cartDrawer.classList.add('open'); cartBd.classList.add('open'); document.body.style.overflow = 'hidden'; renderCart(); }
      function closeCart() { cartDrawer.classList.remove('open'); cartBd.classList.remove('open'); document.body.style.overflow = ''; }
      $('cart-open-btn')?.addEventListener('click', openCart);
      cartBd?.addEventListener('click', closeCart);
      $('cart-cls-btn')?.addEventListener('click', closeCart);
      $('cart-cont-btn')?.addEventListener('click', closeCart);

      window.openCartDrawer = openCart; // Expose globally for quick add

      updateCartBadge();
    }

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
    window.showToast = toast; // Alias to match older implementations

    function updateCartBadge() {
      try {
        const cnt = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
        const badge = $('cart-count');
        if (badge) { badge.textContent = cnt; badge.style.display = cnt ? 'flex' : 'none' }
      } catch (e) { }
    }

    function renderCart() {
      const bodyEl = $('cart-body-el'), footEl = $('cart-foot-el'), cntEl = $('cart-head-cnt');
      let items = [], total = 0;
      try { items = HeelsUpCart.getCart(); total = HeelsUpCart.getSubtotal() } catch (e) { }
      if (!items.length) {
        bodyEl.innerHTML = `<div class="cart-empty-state"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><p>Your bag is empty</p><a href="/shop.html" class="btn btn-primary btn-sm btn-pill" style="display:inline-flex" onclick="window.closeCart?.()">Start Shopping</a></div>`;
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
    document.addEventListener('cart:updated', () => { updateCartBadge(); if ($('cart-drawer')?.classList.contains('open')) renderCart(); });

    /* ── NAV USER STATE ── */
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

    /* ── PRODUCT LOGIC ── */
    async function loadProduct() {
      // Simulate ID fetching for vanilla JS environment
      const params = new URLSearchParams(location.search);
      const id = params.get('id');

      // Allow loading even without ID for preview/demo purposes if needed. 
      // In production, uncomment the immediate return block.
      /*
      if (!id) {
        $('product-loading').style.display = 'none';
        $('product-error').style.display = 'block';
        return;
      }
      */

      try {
        // Fallback for visual demonstration when run locally
        let product;
        if (id && typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
          const data = await HeelsUpAuth.api(`/api/products/${id}`);
          product = data.product || data.data || data;
        } else {
          // Mock Data
          product = {
            id: id || '123',
            name: 'Classic Black Stiletto',
            category: 'Heels',
            price: 1899,
            original_price: 2499,
            rating: 4.8,
            review_count: 124,
            stock: 15,
            is_new: true,
            description: 'Elevate your evening look with our Classic Black Stilettos. Featuring a sleek pointed toe, comfortable padded insole, and a sturdy 3.5-inch heel. Perfect for parties, dinners, or making a powerful statement at work.',
            material: 'Premium Vegan Leather',
            images: [
              'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80',
              'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=800&q=80',
              'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800&q=80',
              'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80'
            ]
          };
          // artificial delay for skeleton
          await new Promise(r => setTimeout(r, 600));
        }

        if (!product) throw new Error('Product not found');
        currentProduct = product;

        renderProduct(product);
        loadRelated(product.category, product.id);
      } catch (err) {
        $('product-loading').style.display = 'none';
        $('product-error').style.display = 'block';
      }
    }

    function renderProduct(p) {
      document.title = `${p.name} – HeelsUp`;
      const pt = $('page-title'); if (pt) pt.textContent = `${p.name} – HeelsUp`;

      // Update meta description dynamically for search engines
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `Buy ${p.name} online at HeelsUp. Premium ladies footwear in India. ${p.description ? p.description.substring(0, 120) : ''}... Free shipping on orders above ₹799.`);
      }

      // Inject JSON-LD Schema
      const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p.name,
        "image": p.images || [p.image_url],
        "description": p.description || `Buy premium ${p.name} from HeelsUp.`,
        "sku": `HU-${p.id}`,
        "mpn": `HU-${p.id}`,
        "brand": {
          "@type": "Brand",
          "name": "HeelsUp"
        },
        "offers": {
          "@type": "Offer",
          "url": window.location.href,
          "priceCurrency": "INR",
          "price": p.price,
          "priceValidUntil": "2027-12-31",
          "itemCondition": "https://schema.org/NewCondition",
          "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
      };
      let script = document.getElementById('product-schema');
      if (!script) {
        script = document.createElement('script');
        script.id = 'product-schema';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(schema);

      // Breadcrumb
      const catLink = $('breadcrumb-cat-link');
      if (catLink) {
        catLink.textContent = p.category || 'Shop';
        catLink.href = `/shop?cat=${(p.category || '').toLowerCase()}`;
      }
      const bname = $('breadcrumb-name'); if (bname) bname.textContent = p.name;

      // Text Elements
      const icat = $('info-cat'); if (icat) icat.textContent = p.category || '';
      const iname = $('info-name'); if (iname) iname.textContent = p.name;

      // Rating
      const rating = parseFloat(p.rating) || 4.5;
      const reviewCount = p.review_count || 0;
      $('info-rating-val').textContent = rating.toFixed(1);
      $('info-rating-count').textContent = `${reviewCount} Review${reviewCount !== 1 ? 's' : ''}`;
      $('info-stars').innerHTML = buildStarsHTML(rating);

      // Price
      $('info-price').textContent = fmt(p.price);
      if (p.original_price && p.original_price > p.price) {
        $('info-orig-price').textContent = fmt(p.original_price);
        $('info-orig-price').style.display = '';
        const disc = Math.round((1 - p.price / p.original_price) * 100);
        $('info-discount-badge').textContent = `${disc}% OFF`;
        $('info-discount-badge').style.display = '';
      } else {
        $('info-orig-price').style.display = 'none';
        $('info-discount-badge').style.display = 'none';
      }

      // Description
      $('info-desc').textContent = p.description || 'Premium quality footwear crafted with care, designed for the modern Indian woman.';

      // Accordion Details Injection
      if (p.material || p.heel_height) {
        const details = $('acc-details');
        if (details && p.material) {
          details.querySelector('ul').insertAdjacentHTML('afterbegin', `<li>Material: ${p.material}</li>`);
        }
      }

      // Gallery
      const images = getImages(p);
      renderGallery(images, p.stock === 0, p.is_new, p.original_price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0);

      // OOS Check
      if (p.stock === 0) {
        const btnCart = $('btn-add-cart');
        const btnBuy = $('btn-buy-now');
        if (btnCart) {
          btnCart.disabled = true;
          btnCart.innerHTML = '<i class="fa-solid fa-ban"></i> Out of Stock';
        }
        if (btnBuy) btnBuy.disabled = true;
      }

      // Reviews
      renderReviews(rating, reviewCount);
      loadReviews(p.id);

      // Sizes — dynamic with per-size stock
      renderSizes(p.sizes || [], p.size_stock || {});

      // Wishlist state
      checkWishlistState(p.id);

      // Share Link
      const waLink = $('share-wa');
      if (waLink) waLink.href = `https://wa.me/?text=Check%20out%20${encodeURIComponent(p.name)}%20at%20HeelsUp!%20${encodeURIComponent(location.href)}`;

      // Swap UI
      $('product-loading').style.display = 'none';
      $('product-content').style.display = 'grid';
      $('reviews-section').style.display = 'block';
      $('related-section').style.display = 'block';
    }

    /* ── SIZE RENDERING WITH STOCK ── */
    function renderSizes(sizes, sizeStock) {
      const grid = $('size-grid');
      if (!grid) return;
      const sizeList = (sizes && sizes.length > 0) ? sizes : ['36', '37', '38', '39', '40', '41'];
      grid.innerHTML = sizeList.map(sz => {
        const szStr = String(sz);
        const stockCount = sizeStock && sizeStock[szStr] !== undefined ? Number(sizeStock[szStr]) : null;
        const isOos = stockCount !== null && stockCount === 0;
        const isLow = stockCount !== null && stockCount > 0 && stockCount <= 3;
        let cls = 'size-btn';
        if (isOos) cls += ' oos';
        if (isLow) cls += ' low';
        let title = '';
        if (isOos) title = 'Out of stock';
        else if (isLow) title = `Only ${stockCount} left!`;
        return `<button class="${cls}" data-size="${esc(szStr)}" ${isOos ? 'disabled' : ''} title="${title}" aria-label="Size ${szStr}${isOos ? ' — Out of Stock' : ''}">${esc(szStr)}${isOos ? '<span class="size-oos-line"></span>' : ''}${isLow ? '<span class="size-low-dot"></span>' : ''}</button>`;
      }).join('');
    }

    /* ── WISHLIST ── */
    let _wishlisted = false;

    async function checkWishlistState(productId) {
      const btn = $('btn-wishlist');
      if (!btn) return;
      try {
        const user = typeof HeelsUpAuth !== 'undefined' ? HeelsUpAuth.getUser() : null;
        if (!user) return;
        if (typeof HeelsUpWishlist !== 'undefined' && HeelsUpWishlist.has) {
          _wishlisted = HeelsUpWishlist.has(productId);
          updateWishlistBtn(_wishlisted);
          return;
        }
        const data = await HeelsUpAuth.api('/api/wishlist/ids').catch(() => null);
        if (data && Array.isArray(data.ids)) {
          _wishlisted = data.ids.includes(productId);
          updateWishlistBtn(_wishlisted);
        }
      } catch { /* silent fail */ }
    }

    function updateWishlistBtn(wishlisted) {
      const btn = $('btn-wishlist');
      const icon = $('wishlist-icon');
      if (!btn || !icon) return;
      _wishlisted = !!wishlisted;
      if (wishlisted) {
        icon.className = 'fa-solid fa-heart';
        icon.style.color = 'var(--red)';
        btn.classList.add('wishlisted');
        btn.title = 'Remove from Wishlist';
      } else {
        icon.className = 'fa-regular fa-heart';
        icon.style.color = '';
        btn.classList.remove('wishlisted');
        btn.title = 'Add to Wishlist';
      }
    }

    $('btn-wishlist')?.addEventListener('click', async () => {
      if (!currentProduct) return;
      const user = typeof HeelsUpAuth !== 'undefined' ? HeelsUpAuth.getUser() : null;
      if (!user) {
        toast('Please log in to save items to your wishlist', 'info');
        setTimeout(() => window.location.href = '/login.html?redirect=' + encodeURIComponent(location.href), 1800);
        return;
      }
      const btn = $('btn-wishlist');
      btn.disabled = true;
      try {
        if (typeof HeelsUpWishlist !== 'undefined' && HeelsUpWishlist.toggle) {
          const result = await HeelsUpWishlist.toggle(currentProduct.id);
          updateWishlistBtn(result);
          toast(result ? '❤️ Added to wishlist!' : 'Removed from wishlist', result ? 'success' : 'info');
        } else {
          const result = await HeelsUpAuth.api('/api/wishlist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: currentProduct.id })
          });
          updateWishlistBtn(result.wishlisted);
          toast(result.wishlisted ? '❤️ Added to wishlist!' : 'Removed from wishlist', result.wishlisted ? 'success' : 'info');
        }
      } catch (e) {
        toast('Failed to update wishlist', 'error');
      } finally {
        btn.disabled = false;
      }
    });

    function getImages(p) {
      let imgs = [];
      if (Array.isArray(p.images) && p.images.length) imgs = p.images;
      else if (p.image_url) imgs = [p.image_url];
      if (imgs.length === 0) imgs = [FALLBACK_IMAGES[0]];
      while (imgs.length < 4) imgs.push(FALLBACK_IMAGES[imgs.length % FALLBACK_IMAGES.length]);
      return imgs.slice(0, 4);
    }

    function renderGallery(images, oos, isNew, discPct) {
      const mainImg = $('gallery-main-img');
      mainImg.src = images[0];
      mainImg.alt = currentProduct?.name || 'Product';

      if (oos) $('oos-overlay').style.display = 'flex';

      // Badges
      let badgeHTML = '';
      if (isNew) badgeHTML += `<span class="badge badge-new">New</span>`;
      if (discPct > 0) badgeHTML += `<span class="badge badge-sale">-${discPct}%</span>`;
      $('gallery-badges').innerHTML = badgeHTML;

      // Thumbnails
      const thumbsWrap = $('gallery-thumbs');
      thumbsWrap.innerHTML = images.map((src, i) => `
        <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}" onclick="switchImage(${i})">
          <img src="${src}" alt="Product view ${i + 1}" loading="lazy" />
        </div>
      `).join('');
    }

    window.switchImage = function (idx) {
      const images = getImages(currentProduct);
      $('gallery-main-img').src = images[idx];
      document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
    };

    /* ── STARS HELPER ── */
    function buildStarsHTML(rating) {
      let html = '';
      for (let i = 1; i <= 5; i++) {
        if (rating >= i) html += `<i class="fa-solid fa-star"></i>`;
        else if (rating >= i - 0.5) html += `<i class="fa-solid fa-star-half-stroke"></i>`;
        else html += `<i class="fa-regular fa-star empty"></i>`;
      }
      return html;
    }

    /* ── INTERACTIONS ── */
    // Size Selection
    $('size-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.size-btn');
      if (!btn || btn.classList.contains('oos')) return;
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSize = btn.dataset.size;
    });

    // Quantity
    $('qty-minus')?.addEventListener('click', () => {
      if (quantity > 1) { quantity--; $('qty-num').textContent = quantity; }
    });
    $('qty-plus')?.addEventListener('click', () => {
      if (quantity < 10) { quantity++; $('qty-num').textContent = quantity; }
    });

    // Add to Cart
    $('btn-add-cart')?.addEventListener('click', () => {
      if (!currentProduct) return;
      if (!selectedSize) {
        toast('⚠️ Please select a size first', 'error');
        const sg = $('size-grid');
        if (sg) {
          sg.style.animation = 'none';
          sg.offsetHeight; // trigger reflow
          sg.style.boxShadow = '0 0 0 2px var(--red)';
          sg.style.borderRadius = '10px';
          setTimeout(() => { sg.style.boxShadow = ''; }, 2000);
        }
        return;
      }
      if (typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.addItem(currentProduct, quantity, selectedSize);
        toast('✓ Added to bag!', 'success');
        openCartDrawer();
      } else {
        toast('Cart system unavailable', 'error');
      }
    });

    // Buy Now
    $('btn-buy-now')?.addEventListener('click', () => {
      if (!currentProduct) return;
      if (!selectedSize) {
        toast('⚠️ Please select a size first', 'error');
        return;
      }
      if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.addItem(currentProduct, quantity, selectedSize);
      location.href = '/checkout';
    });

    // Copy Link
    $('copy-link-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(location.href).then(() => {
        toast('🔗 Link copied!', 'success');
      }).catch(() => {
        toast('Could not copy link', 'error');
      });
    });

    /* ── RELATED PRODUCTS ── */
    async function loadRelated(category, excludeId) {
      if (!category) return;
      const grid = $('related-grid');
      grid.innerHTML = `<div class="skel" style="aspect-ratio:3/4;border-radius:14px"></div>`.repeat(4);

      try {
        let products = [];
        if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
          const data = await HeelsUpAuth.api(`/api/products?category=${encodeURIComponent(category)}&limit=8`);
          products = (data.products || data || []).filter(p => p.id != excludeId).slice(0, 4);
        } else {
          // Mock data
          products = Array.from({ length: 4 }).map((_, i) => ({
            id: i + 100, name: `Related Product ${i + 1}`, category: category, price: 1599 + (i * 100), rating: 4.5, review_count: 24, images: [FALLBACK_IMAGES[i % 4]]
          }));
        }

        if (products.length === 0) {
          grid.innerHTML = '<p style="color:var(--text-m);grid-column:1/-1;text-align:center">No related products found.</p>';
          return;
        }

        grid.innerHTML = products.map(p => buildProductCard(p)).join('');
      } catch (e) {
        grid.innerHTML = '<p style="color:var(--text-m);grid-column:1/-1;text-align:center">Failed to load related products.</p>';
      }
    }

    function buildProductCard(p) {
      const imgs = Array.isArray(p.images) ? p.images : [p.image_url || FALLBACK_IMAGES[0]];
      const img = esc(imgs[0] || FALLBACK_IMAGES[0]);
      const disc = p.original_price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
      const slug = encPath(p.slug || p.id);

      return `
        <article class="prod-card" aria-label="${esc(p.name)}">
          <div class="prod-img-wrap">
            <a href="/product.html?id=">
              <img src="${img}" alt="${esc(p.name)}" loading="lazy">
            </a>
            <div class="prod-card-badges">
              ${p.is_new ? '<span class="prod-badge badge-new">New</span>' : ''}
              ${disc > 0 ? `<span class="prod-badge badge-sale">-${disc}%</span>` : ''}
            </div>
            <button class="prod-wish-btn" onclick="toggleWish(${p.id},this)" aria-label="Wishlist">
              <i class="fa-regular fa-heart"></i>
            </button>
            <div class="prod-hover-actions">
              <button onclick="quickAdd(${p.id})" class="prod-action-btn pab-primary"><i class="fa-solid fa-bag-shopping"></i> Add</button>
              <a href="/product.html?id=" class="prod-action-btn pab-outline"><i class="fa-solid fa-eye"></i> View</a>
            </div>
          </div>
          <div class="prod-body">
            <div class="prod-cat">${esc(p.category || '')}</div>
            <h3 class="prod-name"><a href="/product.html?id=">${esc(p.name)}</a></h3>
            <div class="prod-rating"><span class="prod-stars">${buildStarsHTML(p.rating || 4.5)}</span> <span class="prod-rc">(${p.review_count || 0})</span></div>
            <div class="prod-price">
              <span class="price-now">${fmt(p.price)}</span>
              ${p.original_price ? `<span class="price-was">${fmt(p.original_price)}</span>` : ''}
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

    /* ── REVIEWS ── */
    let realReviews = [];
    async function loadReviews(productId) {
      try {
        if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
          const data = await HeelsUpAuth.api('/api/products/' + productId + '/reviews');
          realReviews = data.reviews || [];
        } else {
          // Mock reviews
          realReviews = [
            { first_name: "Anita", last_name: "R.", rating: 5, body: "Absolutely love these! Very comfortable and exactly as shown.", created_at: new Date().toISOString(), title: "Perfect fit" }
          ];
        }

        const ratingValEl = $('info-rating-val');
        const rating = ratingValEl ? parseFloat(ratingValEl.innerText) : 4.5;
        renderReviews(rating, realReviews.length || 1);
      } catch (e) { console.error('Failed to load reviews', e); }
    }

    function renderReviews(rating, count) {
      // Big rating
      $('rev-rating-big').textContent = rating.toFixed(1);
      $('rev-stars-big').innerHTML = buildStarsHTML(rating);
      $('rev-count-text').textContent = `Based on ${count} review${count !== 1 ? 's' : ''}`;

      // Rating bars 
      const total = Math.max(count, 1);
      const dist = {
        5: Math.round(total * 0.68),
        4: Math.round(total * 0.22),
        3: Math.round(total * 0.06),
        2: Math.round(total * 0.03),
        1: Math.round(total * 0.01)
      };

      let barsHTML = '';
      for (let s = 5; s >= 1; s--) {
        const pct = total > 0 ? (dist[s] / total) * 100 : 0;
        barsHTML += `
          <div class="rating-bar-row">
            <span class="rating-bar-label">${s}★</span>
            <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
            <span class="rating-bar-num">${dist[s]}</span>
          </div>`;
      }
      $('rev-bars').innerHTML = barsHTML;

      // Cards
      const rContainer = $('review-cards');
      const reviewsToRender = realReviews.length ? realReviews : [];
      if (!reviewsToRender.length) {
        rContainer.innerHTML = "<p style=\"color:var(--text-m); text-align:center; padding: 20px 0;\">Be the first to review this product!</p>";
        return;
      }

      const cardsHTML = reviewsToRender.map(r => `
        <div class="review-card">
          <div class="review-header">
            <div class="reviewer-info">
              <div class="reviewer-avatar">${esc((r.first_name || r.name || "C").charAt(0).toUpperCase())}</div>
              <div>
                <div class="reviewer-name">${esc(r.first_name || r.name || "Customer")} <span style="font-size:11px;color:var(--text-m);font-weight:400">• India</span></div>
                <div class="reviewer-date">${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</div>
                <div class="review-verified"><i class="fa-solid fa-circle-check"></i> Verified Purchase</div>
              </div>
            </div>
            <div class="review-stars">${buildStarsHTML(r.rating || 5)}</div>
          </div>
          ${r.title ? `<div style="font-weight:700;font-family:var(--font-head);font-size:14px;margin-bottom:8px;color:var(--text-h)">${esc(r.title)}</div>` : ''}
          <p class="review-text">${esc(r.body || '')}</p>
        </div>`).join('');
      rContainer.innerHTML = cardsHTML;
    }

    /* ── ACCORDIONS ── */
    function initAccordions() {
      document.querySelectorAll('.accordion-header').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.accordion-item');
          const isOpen = item.classList.contains('open');
          document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
          if (!isOpen) item.classList.add('open');
        });
      });
    }

    /* ── REVIEW MODAL ── */
    function initModal() {
      $('write-review-btn')?.addEventListener('click', () => {
        const user = typeof HeelsUpAuth !== 'undefined' ? HeelsUpAuth.getUser() : null;
        if (!user && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          toast('Please login to write a review', 'error');
          setTimeout(() => location.href = '/login.html?redirect=' + encodeURIComponent(location.href), 1500);
          return;
        }
        $('review-modal').classList.add('open');
        document.body.style.overflow = 'hidden';
      });

      $('modal-close-btn')?.addEventListener('click', closeModal);
      $('review-modal')?.addEventListener('click', (e) => {
        if (e.target === $('review-modal')) closeModal();
      });

      // Star picking
      const starEls = document.querySelectorAll('#modal-stars .star');
      starEls.forEach(s => {
        s.addEventListener('click', () => {
          reviewRating = parseInt(s.dataset.val);
          starEls.forEach((st, i) => st.classList.toggle('sel', i < reviewRating));
        });
        s.addEventListener('mouseenter', () => {
          const v = parseInt(s.dataset.val);
          starEls.forEach((st, i) => st.classList.toggle('sel', i < v));
        });
        s.addEventListener('mouseleave', () => {
          starEls.forEach((st, i) => st.classList.toggle('sel', i < reviewRating));
        });
      });

      $('submit-review-btn')?.addEventListener('click', async () => {
        if (!reviewRating) { toast('Please select a star rating', 'error'); return; }
        const title = $('review-title').value.trim();
        const body = $('review-body').value.trim();
        if (!body) { toast('Please write your review', 'error'); return; }

        const submitBtn = $('submit-review-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
          const params = new URLSearchParams(location.search);
          const productId = params.get('id');
          if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
            await HeelsUpAuth.api('/api/products/' + productId + '/reviews', {
              method: 'POST',
              body: JSON.stringify({ rating: reviewRating, title, body: body })
            });
          }
          closeModal();
          toast('🎉 Review submitted for moderation!', 'success');
          loadReviews(productId);
        } catch (e) {
          toast(e.message || 'Failed to submit review', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Review';
          $('review-title').value = '';
          $('review-body').value = '';
          reviewRating = 0;
          starEls.forEach(st => st.classList.remove('sel'));
        }
      });
    }

    function closeModal() {
      $('review-modal')?.classList.remove('open');
      document.body.style.overflow = '';
    }