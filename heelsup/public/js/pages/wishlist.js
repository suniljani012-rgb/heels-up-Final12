/*!
         * HeelsUp Wishlist Page Engine v3.0
         * Production-grade | Live API | Security-first
         */
        'use strict';

        /* ── SECURITY UTILS (mirrors index.html) ── */
        const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const encPath = s => encodeURIComponent(String(s ?? '')).replace(/%2F/g, '/');
        const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');
        const $ = id => document.getElementById(id);

        /* ── STATE ── */
        let allProducts = [];   // all fetched products (for recommend)
        let wishItems = [];   // current wishlist product objects
        let currentCat = 'all';
        let currentView = 'grid';
        let currentSort = 'added';

        /* ── TOAST (mirrors index.html) ── */
        function toast(msg, type = 'success', dur = 4200) {
            const wrap = $('toast-wrap'); if (!wrap) return;
            const el = document.createElement('div');
            el.className = 'toast ' + type;
            const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
            el.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i><span>${esc(msg)}</span>`;
            wrap.appendChild(el);
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
            setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 420) }, dur);
        }
        window.showToast = toast;

        /* ── ANN BAR ── */
        $('ann-close')?.addEventListener('click', () => {
            const bar = $('ann-bar');
            if (bar) {
                bar.style.height = bar.offsetHeight + 'px';
                bar.style.overflow = 'hidden';
                bar.style.transition = 'height .3s ease';
                setTimeout(() => bar.style.height = '0', 10);
                setTimeout(() => bar.remove(), 320);
            }
        });

        /* ── NAVBAR SCROLL ── */
        const navbar = $('navbar');
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
            $('scroll-top-btn').classList.toggle('show', window.scrollY > 380);
        }, { passive: true });
        $('scroll-top-btn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        /* ── MOBILE MENU ── */
        const mobMenu = $('mob-menu'), hamburger = $('nav-hamburger');
        function openMob() { mobMenu.classList.add('open'); hamburger.classList.add('open'); hamburger.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden' }
        function closeMob() { mobMenu.classList.remove('open'); hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '' }
        hamburger?.addEventListener('click', openMob);
        $('mob-close')?.addEventListener('click', closeMob);
        $('mob-backdrop')?.addEventListener('click', closeMob);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMob(); closeCart() } });

        /* ── AUTH STATE ── */
        (function initAuth() {
            let user = null;
            try { user = HeelsUpAuth.getUser() } catch (e) { }
            const accBtn = $('nav-account-btn');
            const mobLoginBtn = $('mob-login-btn');
            if (user) {
                const name = user.firstName || user.first_name || user.name || '';
                if (accBtn) accBtn.setAttribute('aria-label', 'My Account — ' + name);
                if (mobLoginBtn) { mobLoginBtn.textContent = 'My Account'; mobLoginBtn.href = '/profile.html' }
            } else {
                if (accBtn) accBtn.href = '/login.html';
            }
        })();

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
        function openCart() {
            cartDrawer.classList.add('open'); cartBd.classList.add('open');
            cartBd.setAttribute('aria-hidden', 'false');
            $('cart-open-btn')?.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            renderCartDrawer();
        }
        function closeCart() {
            cartDrawer.classList.remove('open'); cartBd.classList.remove('open');
            cartBd.setAttribute('aria-hidden', 'true');
            $('cart-open-btn')?.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
        $('cart-open-btn')?.addEventListener('click', openCart);
        cartBd?.addEventListener('click', closeCart);
        $('cart-cls-btn')?.addEventListener('click', closeCart);
        $('cart-cont-btn')?.addEventListener('click', closeCart);

        function renderCartDrawer() {
            const bodyEl = $('cart-body-el'), footEl = $('cart-foot-el'), cntEl = $('cart-head-cnt');
            let items = [], total = 0;
            try { items = HeelsUpCart.getCart(); total = HeelsUpCart.getSubtotal() } catch (e) { }
            if (!items.length) {
                bodyEl.innerHTML = `<div class="cart-empty-state"><i class="fa-solid fa-bag-shopping"></i><p>Your bag is empty</p><a href="/shop.html" class="btn btn-primary btn-sm btn-pill">Start Shopping</a></div>`;
                if (footEl) footEl.style.display = 'none';
                if (cntEl) cntEl.textContent = '';
                return;
            }
            if (cntEl) cntEl.textContent = '(' + items.length + ')';
            bodyEl.innerHTML = items.map((it, i) => {
                const img = esc(it.image || '');
                return `<div class="cart-item">
          ${img ? `<img class="cart-item-img" src="${img}" alt="${esc(it.name)}" loading="lazy">` : '<div class="cart-item-img"></div>'}
          <div>
            <div class="ci-name">${esc(it.name)}</div>
            <div class="ci-meta">${it.size ? 'Size: ' + esc(it.size) + ' · ' : ''}${fmt(it.price)} each</div>
            <div class="ci-qty">
              <button class="qty-btn" onclick="cartQty(${i},-1)"><i class="fa-solid fa-minus" style="font-size:.65rem"></i></button>
              <span class="qty-val">${it.quantity || 1}</span>
              <button class="qty-btn" onclick="cartQty(${i},1)"><i class="fa-solid fa-plus" style="font-size:.65rem"></i></button>
              <button class="ci-remove" onclick="cartRemove(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          <div class="ci-price">${fmt(it.price * (it.quantity || 1))}</div>
        </div>`;
            }).join('');
            if ($('cart-subtotal-val')) $('cart-subtotal-val').textContent = fmt(total);
            const freeAt = 799, left = freeAt - total;
            const shipNote = $('cart-ship-note');
            if (shipNote) shipNote.innerHTML = left > 0
                ? `Add ${fmt(left)} more for <strong>FREE shipping</strong> 🚚`
                : '<i class="fa-solid fa-circle-check"></i> You qualify for FREE shipping!';
            if (footEl) footEl.style.display = 'block';
        }
        window.cartQty = function (i, d) { try { HeelsUpCart.updateQty(i, d); renderCartDrawer(); updateCartBadge() } catch (e) { } };
        window.cartRemove = function (i) { try { HeelsUpCart.removeItem(i); renderCartDrawer(); updateCartBadge(); toast('Item removed from bag', 'info') } catch (e) { } };

        /* ── ADD SINGLE ITEM TO CART ── */
        window.addToCartQuick = async function (productId, btn) {
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding…' }
            try {
                const data = await HeelsUpAuth.api('/api/products/' + encodeURIComponent(productId));
                const p = data.product || data;
                if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.addItem(p, 1, '');
                updateCartBadge();
                toast('"' + esc(p.name) + '" added to your bag ✓', 'success');
                openCart();
            } catch (e) {
                toast('Could not add to bag. Please try again.', 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-bag-shopping"></i> Add to Bag' }
            }
        };

        /* ── ADD ALL TO CART ── */
        window.addAllToCart = function () {
            const visible = getFilteredSorted();
            if (!visible.length) { toast('No items to add', 'info'); return }
            try {
                visible.forEach(p => { if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.addItem(p, 1, '') });
                updateCartBadge();
                toast(visible.length + ' items added to your bag 🛍️', 'success');
                openCart();
            } catch (e) {
                toast('Could not add all items. Try again.', 'error');
            }
        };

        /* ── WISHLIST STORAGE ── */
        function getWishlistIds() {
            if (typeof HeelsUpWishlistSystem !== 'undefined') return HeelsUpWishlistSystem.items || [];
            try { return JSON.parse(localStorage.getItem('heelsup_wishlist') || '[]') } catch (e) { return [] }
        }
        function saveWishlistIds(ids) {
            try { localStorage.setItem('heelsup_wishlist', JSON.stringify(ids)) } catch (e) { }
        }

        /* ── REMOVE FROM WISHLIST ── */
        window.removeFromWishlist = function (productId) {
            const card = document.getElementById('wcard-' + productId);
            if (card) {
                card.classList.add('card-removing');
                setTimeout(() => card.remove(), 290);
            }
            // Remove from system
            if (typeof HeelsUpWishlistSystem !== 'undefined') {
                try { HeelsUpWishlistSystem.remove(productId) } catch (e) { }
            }
            const ids = getWishlistIds().filter(id => id !== productId && id !== String(productId));
            saveWishlistIds(ids);

            // Update wishItems
            wishItems = wishItems.filter(p => p.id !== productId && String(p.id) !== String(productId));
            setTimeout(() => {
                updateWishlistMeta();
                if (!wishItems.length) renderEmpty();
            }, 320);
            toast('Removed from wishlist', 'info');
        };

        /* ── CLEAR WISHLIST ── */
        window.clearWishlist = function () {
            if (!wishItems.length) return;
            if (!confirm('Remove all ' + wishItems.length + ' items from your wishlist?')) return;
            wishItems = [];
            saveWishlistIds([]);
            if (typeof HeelsUpWishlistSystem !== 'undefined') {
                try { HeelsUpWishlistSystem.items = [] } catch (e) { }
            }
            updateWishlistMeta();
            renderEmpty();
            toast('Wishlist cleared', 'info');
        };

        /* ── TOGGLE WISHLIST (from heart icon on card) ── */
        window.toggleWish = function (id, btn) {
            const ids = getWishlistIds();
            const strId = String(id);
            const isIn = ids.some(x => String(x) === strId);
            if (isIn) {
                removeFromWishlist(id);
            } else {
                btn.classList.add('wishlisted');
                btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
                const newIds = [...ids, id];
                saveWishlistIds(newIds);
                if (typeof HeelsUpWishlistSystem !== 'undefined') {
                    try { HeelsUpWishlistSystem.add(id) } catch (e) { }
                }
                toast('Added to wishlist ❤️', 'success');
            }
        };

        /* ── FILTER & SORT ── */
        window.filterWishlist = function (cat, btn) {
            currentCat = cat;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            renderWishlistGrid();
        };

        window.sortAndRender = function () {
            currentSort = $('sort-sel')?.value || 'added';
            renderWishlistGrid();
        };

        function getFilteredSorted() {
            let items = currentCat === 'all'
                ? [...wishItems]
                : wishItems.filter(p => (p.category || '').toLowerCase() === currentCat.toLowerCase());

            if (currentSort === 'price-asc') items.sort((a, b) => a.price - b.price);
            else if (currentSort === 'price-desc') items.sort((a, b) => b.price - a.price);
            else if (currentSort === 'discount') {
                items.sort((a, b) => {
                    const da = a.original_price ? Math.round(100 - (a.price / a.original_price) * 100) : 0;
                    const db = b.original_price ? Math.round(100 - (b.price / b.original_price) * 100) : 0;
                    return db - da;
                });
            }
            return items;
        }

        /* ── VIEW TOGGLE ── */
        window.setView = function (v) {
            currentView = v;
            $('view-grid-btn')?.classList.toggle('active', v === 'grid');
            $('view-list-btn')?.classList.toggle('active', v === 'list');
            const grid = $('wishlist-grid');
            if (grid) grid.classList.toggle('list-view', v === 'list');
        };

        /* ── PRODUCT CARD (mirrors index.html prodCard perfectly) ── */
        function prodCard(p, isWishlisted = true) {
            const images = Array.isArray(p.images) ? p.images : [];
            const img = esc(images[0] || p.image_url || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70&auto=format&fit=crop');
            const disc = p.original_price && p.price < p.original_price ? Math.round(100 - (p.price / p.original_price) * 100) : 0;
            const rating = Math.round(Number(p.rating) || 4.5);
            const stars = '★'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(5 - rating, 0));
            const rc = Number(p.review_count || p.reviews || 0) || Math.floor(Math.random() * 80) + 18;
            const name = esc(p.name || '');
            const cat = esc(p.category || '');
            const id = Number(p.id) || 0;
            const wishIcon = isWishlisted ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            const wishClass = isWishlisted ? 'wishlisted' : '';
            const cardId = isWishlisted ? `id="wcard-${id}"` : '';

            return `<article class="prod-card" ${cardId} aria-label="${name}">
        <div class="prod-img-wrap">
          <a href="/product.html?id=${id}" aria-label="View ${name}">
            <img src="${img}" alt="${name}" loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70'"/>
          </a>
          <div class="prod-card-badges">
            ${p.is_new ? '<span class="prod-badge badge-new">New</span>' : ''}
            ${disc > 0 ? `<span class="prod-badge badge-sale">-${disc}%</span>` : ''}
            ${p.featured && !p.is_new ? '<span class="prod-badge badge-hot">Hot</span>' : ''}
          </div>
          <button class="prod-wish-btn ${wishClass}" onclick="${isWishlisted ? 'removeFromWishlist(' + id + ')' : 'toggleWish(' + id + ',this)'}"
                  aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}"
                  aria-pressed="${isWishlisted}">
            <i class="${wishIcon}"></i>
          </button>
          <div class="prod-hover-actions" aria-hidden="true">
            <button class="prod-action-btn pab-primary" id="atc-${id}" onclick="addToCartQuick(${id},this)">
              <i class="fa-solid fa-bag-shopping"></i> Add to Bag
            </button>
            <a href="/product.html?id=${id}" class="prod-action-btn pab-outline">
              <i class="fa-regular fa-eye"></i> View
            </a>
          </div>
        </div>
        <div class="prod-body">
          <div class="prod-cat">${cat}</div>
          <h3 class="prod-name"><a href="/product.html?id=${id}">${name}</a></h3>
          <div class="prod-rating">
            <span class="prod-stars" aria-label="${rating} out of 5 stars">${stars}</span>
            <span class="prod-rc">(${rc})</span>
          </div>
          <div class="prod-price">
            <span class="price-now">${fmt(p.price)}</span>
            ${p.original_price ? `<span class="price-was">${fmt(p.original_price)}</span><span class="price-off">-${disc}%</span>` : ''}
          </div>
        </div>
      </article>`;
        }

        /* ── UPDATE META (counts, summary bar) ── */
        function updateWishlistMeta() {
            const total = wishItems.length;
            const countText = total + ' item' + (total !== 1 ? 's' : '');

            if ($('wl-count-text')) $('wl-count-text').textContent = countText;
            if ($('sum-count')) $('sum-count').textContent = countText;

            // Total value
            const totalVal = wishItems.reduce((s, p) => s + (p.price || 0), 0);
            if ($('sum-total')) $('sum-total').textContent = fmt(totalVal);

            // Hero subtitle
            if ($('wl-hero-sub')) {
                $('wl-hero-sub').textContent = total
                    ? `${total} product${total > 1 ? 's' : ''} saved — add to bag whenever you're ready`
                    : 'No items saved yet — explore our collection';
            }

            // Add-all btn
            const addAllBtn = $('add-all-btn');
            if (addAllBtn) addAllBtn.style.display = total ? 'inline-flex' : 'none';

            // Filter bar
            const fb = $('filter-bar');
            if (fb) fb.style.display = total > 0 ? 'block' : 'none';

            // Summary bar
            const sb = $('summary-bar');
            if (sb) sb.classList.toggle('visible', total > 0);

            // Avatars (mini product images)
            const sumAv = $('sum-avatars');
            if (sumAv) {
                sumAv.innerHTML = wishItems.slice(0, 4).map(p => {
                    const img = esc((Array.isArray(p.images) ? p.images[0] : null) || p.image_url || '');
                    return img
                        ? `<div class="sum-av"><img src="${img}" alt="${esc(p.name)}" loading="lazy"></div>`
                        : `<div class="sum-av">${esc((p.name || '?').charAt(0).toUpperCase())}</div>`;
                }).join('');
            }
        }

        /* ── RENDER WISHLIST GRID ── */
        function renderWishlistGrid() {
            const grid = $('wishlist-grid'); if (!grid) return;
            const items = getFilteredSorted();

            if (!items.length && currentCat !== 'all') {
                grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:56px 20px">
          <p style="font-size:15px;color:var(--text-m);margin-bottom:18px">No ${esc(currentCat)} items in your wishlist</p>
          <button class="btn btn-outline btn-pill btn-sm" onclick="filterWishlist('all',document.querySelector('[data-cat=all]'))">
            <i class="fa-solid fa-border-all"></i> View All Items
          </button>
        </div>`;
                return;
            }

            grid.classList.toggle('list-view', currentView === 'list');
            grid.innerHTML = items.map(p => prodCard(p, true)).join('');
            updateWishlistMeta();
        }

        /* ── RENDER EMPTY STATE ── */
        function renderEmpty() {
            const grid = $('wishlist-grid'); if (!grid) return;
            const fb = $('filter-bar');
            if (fb) fb.style.display = 'none';
            const sb = $('summary-bar');
            if (sb) sb.classList.remove('visible');
            if ($('add-all-btn')) $('add-all-btn').style.display = 'none';
            if ($('wl-count-text')) $('wl-count-text').textContent = '0 items';
            if ($('wl-hero-sub')) $('wl-hero-sub').textContent = 'No items saved yet — explore our collection';

            grid.innerHTML = `<div style="grid-column:1/-1">
        <div class="empty-state">
          <div class="empty-icon-ring">❤️</div>
          <h2 class="empty-title">Your Wishlist is Empty</h2>
          <p class="empty-sub">Save products you love by clicking the heart icon. They'll all be right here waiting for you!</p>
          <div class="empty-actions">
            <a href="/shop.html" class="btn btn-primary btn-pill">
              <i class="fa-solid fa-bag-shopping"></i> Shop Now
            </a>
            <a href="/shop.html?col=trending" class="btn btn-outline btn-pill">
              <i class="fa-solid fa-fire"></i> See Trending
            </a>
          </div>
        </div>
      </div>`;
        }

        /* ── RENDER RECOMMENDATIONS ── */
        function renderRecommendations() {
            const wishIds = new Set(wishItems.map(p => String(p.id)));
            const others = allProducts.filter(p => !wishIds.has(String(p.id))).slice(0, 4);
            const sec = $('recommend-sec'), grid = $('recommend-grid');
            if (!others.length || !sec || !grid) { if (sec) sec.style.display = 'none'; return; }
            sec.style.display = 'block';
            grid.innerHTML = others.map(p => prodCard(p, false)).join('');
        }

        /* ── MAIN INIT ── */
        async function initWishlist() {
            try {
                // Fetch all products in parallel
                const [productsData] = await Promise.allSettled([
                    HeelsUpAuth.api('/api/products?limit=100')
                ]);
                allProducts = (productsData.status === 'fulfilled')
                    ? (productsData.value.products || productsData.value.data || [])
                    : [];
            } catch (e) {
                allProducts = [];
            }

            // Get wishlist IDs
            const ids = getWishlistIds();

            // Also try live API for wishlist if authenticated
            let liveWishIds = [];
            try {
                const wlData = await HeelsUpAuth.api('/api/wishlist');
                liveWishIds = (wlData.items || wlData.data || []).map(i => i.product_id || i.id);
                if (liveWishIds.length) saveWishlistIds(liveWishIds);
            } catch (e) {
                liveWishIds = ids;
            }

            const finalIds = liveWishIds.length ? liveWishIds : ids;

            // Match IDs to product objects
            wishItems = finalIds
                .map(id => allProducts.find(p => String(p.id) === String(id)))
                .filter(Boolean);

            // Render
            if (!wishItems.length) {
                renderEmpty();
                // Still show recommendations even on empty wishlist
                renderRecommendations();
            } else {
                renderWishlistGrid();
                renderRecommendations();
            }
        }

        /* ── DOCUMENT READY ── */
        document.addEventListener('DOMContentLoaded', () => {
            updateCartBadge();
            initWishlist();
        });

        /* ── CART EVENT BUS ── */
        document.addEventListener('cart:updated', () => {
            updateCartBadge();
            if (cartDrawer?.classList.contains('open')) renderCartDrawer();
        });

        /* ── WISHLIST EVENT BUS ── */
        document.addEventListener('wishlist:updated', () => {
            // Re-init if wishlist system fires update
            initWishlist();
        });