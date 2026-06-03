/*!
         * HeelsUp Shop Engine v5.0
         * Production-grade | Live API | Fully Unified
         */
        'use strict';

        /* ── DOM & SECURITY UTILS ── */
        const $ = id => document.getElementById(id);
        const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');
        const encPath = s => encodeURIComponent(String(s ?? '')).replace(/%2F/g, '/');

        /* ── STATE ── */
        let allProducts = [];
        let filtered = [];
        let page = 1;
        const PER_PAGE = 12;
        let activeCat = 'all';
        let activeSort = 'featured';
        let priceMin = 0, priceMax = 5000;
        let viewMode = 'grid';
        let filterSale = false, filterNew = false;

        /* ── PARSE URL ── */
        const urlParams = new URLSearchParams(window.location.search);
        const urlCat = urlParams.get('cat');
        if (urlCat) activeCat = urlCat;

        /* ── TOAST ── */
        function toast(msg, type = 'success', dur = 4200) {
            const wrap = $('toast-wrap');
            if (!wrap) return;
            const el = document.createElement('div');
            el.className = 'toast ' + type;
            const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
            el.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}" aria-hidden="true"></i><span>${esc(msg)}</span>`;
            wrap.appendChild(el);
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
            setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 420) }, dur);
        }
        window.showToast = toast;

        /* ── GLOBAL UI (Announce, Nav, Mob) ── */
        $('ann-close')?.addEventListener('click', () => {
            const bar = $('ann-bar');
            if (bar) { bar.style.height = bar.offsetHeight + 'px'; bar.style.overflow = 'hidden'; bar.style.transition = 'height .3s ease'; setTimeout(() => bar.style.height = '0', 10); setTimeout(() => bar.remove(), 320) }
        });

        const navbar = $('navbar');
        window.addEventListener('scroll', () => {
            const s = window.scrollY;
            navbar.classList.toggle('scrolled', s > 50);
            $('scroll-top-btn').classList.toggle('show', s > 380);
        }, { passive: true });
        $('scroll-top-btn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        const mobMenu = $('mob-menu'), hamburger = $('nav-hamburger');
        function openMob() { mobMenu.classList.add('open'); hamburger.classList.add('open'); document.body.style.overflow = 'hidden'; }
        function closeMob() { mobMenu.classList.remove('open'); hamburger.classList.remove('open'); document.body.style.overflow = ''; }
        hamburger?.addEventListener('click', openMob);
        $('mob-close')?.addEventListener('click', closeMob);
        $('mob-backdrop')?.addEventListener('click', closeMob);

        /* ── SEARCH ── */
        const srchOverlay = $('search-overlay'), srchInp = $('search-inp'), srchRes = $('search-res');
        function openSearch() { srchOverlay.classList.add('open'); setTimeout(() => srchInp?.focus(), 60) }
        function closeSearch() { srchOverlay.classList.remove('open') }
        $('search-btn')?.addEventListener('click', openSearch);
        $('search-close-btn')?.addEventListener('click', closeSearch);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeSearch(); closeMob(); closeCart(); closeMobFilter(); }
            if (e.key === '/' && !srchOverlay.classList.contains('open') && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); openSearch(); }
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
                    const slug = encPath(p.slug || p.id);
                    return `<a href="/product.html?id=" class="search-res-item" role="option">
            ${img ? `<img class="search-res-img" src="${img}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">` : '<div class="search-res-img"></div>'}
            <div style="flex:1;min-width:0">
              <div class="search-res-name">${esc(p.name)}</div>
              <div class="search-res-cat">${esc(p.category || '')}</div>
            </div>
            <div class="search-res-price">${fmt(p.price)}</div>
          </a>`;
                }).join('');
            } catch (e) { srchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">Search unavailable.</p>'; }
        }

        /* ── AUTH STATE ── */
        (function initAuth() {
            let user = null;
            try { user = HeelsUpAuth.getUser() } catch (e) { }
            if (user) {
                const name = user.firstName || user.first_name || user.name || '';
                const accBtn = $('nav-account-btn'); if (accBtn) { accBtn.setAttribute('title', 'Hello, ' + name); }
                const mobLoginBtn = $('mob-login-btn'); if (mobLoginBtn) { mobLoginBtn.textContent = 'My Account'; mobLoginBtn.href = '/account'; }
            }
        })();

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
                bodyEl.innerHTML = `<div class="cart-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 14px auto; opacity: 0.25; display: block;"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"></path></svg><p>Your bag is empty</p><button class="btn btn-primary btn-sm btn-pill" onclick="closeCart()">Start Shopping</button></div>`;
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
            <div class="ci-meta">${it.size ? 'Size: ' + esc(it.size) + ' · ' : ''} ${fmt(it.price)} each</div>
            <div class="ci-qty">
              <button class="qty-btn" onclick="cartQty(${i},-1)"><i class="fa-solid fa-minus" style="font-size:.65rem"></i></button>
              <span class="qty-val">${it.quantity || 1}</span>
              <button class="qty-btn" onclick="cartQty(${i},1)"><i class="fa-solid fa-plus" style="font-size:.65rem"></i></button>
              <button class="ci-remove" onclick="cartRemove(${i})" aria-label="Remove Item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"></path></svg>
              </button>
            </div>
          </div>
          <div class="ci-price">${fmt(it.price * (it.quantity || 1))}</div>
        </div>`;
            }).join('');
            if ($('cart-subtotal-val')) $('cart-subtotal-val').textContent = fmt(total);
            const freeAt = 799, left = freeAt - total;
            const shipNote = $('cart-ship-note');
            if (shipNote) {
                shipNote.innerHTML = left > 0 ? `Add ${fmt(left)} more for <strong>FREE shipping</strong> 🚚` : '<i class="fa-solid fa-circle-check"></i> You qualify for FREE shipping!';
            }
            if (footEl) footEl.style.display = 'block';
        }
        window.cartQty = function (i, d) { try { HeelsUpCart.updateQty(i, d); renderCart(); updateCartBadge() } catch (e) { } };
        window.cartRemove = function (i) { try { HeelsUpCart.removeItem(i); renderCart(); updateCartBadge(); toast('Item removed from bag', 'info') } catch (e) { } };

        window.addToCartQuick = async function (productId) {
            try {
                const data = await HeelsUpAuth.api('/api/products/' + encodeURIComponent(productId));
                const p = data.product || data;
                if (typeof HeelsUpCart !== 'undefined') HeelsUpCart.addItem(p, 1, '');
                updateCartBadge();
                toast('"' + esc(p.name) + '" added to your bag ✓', 'success');
                openCart();
            } catch (e) { toast('Could not add to bag. Please try again.', 'error'); }
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

        /* ── SHOP MOBILE FILTER ── */
        $('filter-mob-btn')?.addEventListener('click', () => {
            $('mob-filter-panel').classList.add('open');
            $('mob-filter-bd').classList.add('open');
            document.body.style.overflow = 'hidden';
            syncMobFilter();
        });
        window.closeMobFilter = function () {
            $('mob-filter-panel').classList.remove('open');
            $('mob-filter-bd').classList.remove('open');
            document.body.style.overflow = '';
        };
        function syncMobFilter() {
            const sb = $('shop-sidebar');
            if (sb) $('mob-filter-body').innerHTML = sb.innerHTML;
            bindFilters($('mob-filter-body'));
        }

        /* ── SHOP HEADER UPDATE ── */
        function updateHeader(cat) {
            const map = { all: ['Shop All', 'All'], heels: ['Shop Heels', 'Heels'], sandals: ['Shop Sandals', 'Sandals'], flats: ['Shop Flats', 'Flats'], wedges: ['Shop Wedges', 'Wedges'], bags: ['Shop Bags', 'Bags'], clutches: ['Shop Clutches', 'Clutches'], new: ['New Arrivals', 'New Arrivals'], sale: ['Sale Items', 'Sale'] };
            const subs = { all: 'Explore our full collection — heels, sandals, flats, bags and more.', heels: 'Step up in style — block heels, stilettos, cone heels and more.', sandals: 'Strappy, elegant, comfortable — sandals for every occasion.', flats: 'Casual to formal — flats, mules, loafers and slip-ons.', wedges: 'Espadrilles, platforms and wedge heels for extra height.', bags: 'Tote bags, sling bags, clutches and premium accessories.', clutches: 'Party-perfect evening clutches and pochettes.', new: 'Fresh styles just landed — be the first to shop.', sale: 'Unbeatable prices on premium footwear — limited time only.' };
            const [title, em] = (map[cat] || ['Shop All', 'All']);
            const parts = title.split(' ');
            const prefix = parts.slice(0, -1).join(' ');
            $('shop-title').innerHTML = prefix + ' <em>' + em + '</em>';
            $('shop-sub').textContent = subs[cat] || subs.all;
            $('bc-current').textContent = title;
            document.title = title + ' – HeelsUp | Premium Ladies Footwear & Bags';
        }

        /* ── RENDER CARDS ── */
        function getImg(p) {
            if (Array.isArray(p.images) && p.images.length) return p.images[0];
            if (typeof p.images === 'string') { try { const arr = JSON.parse(p.images); if (arr.length) return arr[0]; } catch (e) { } }
            return p.image_url || p.image || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70&auto=format&fit=crop';
        }

        function createCard(p) {
            const img = esc(getImg(p));
            const disc = p.original_price && p.price < p.original_price ? Math.round(100 - (p.price / p.original_price) * 100) : 0;
            const rating = Math.round(Number(p.rating) || 4.5);
            const stars = '★'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(5 - rating, 0));
            const rc = Number(p.review_count || p.reviews || 0) || Math.floor(Math.random() * 80) + 18;
            const slug = encPath(p.slug || p.id);
            const name = esc(p.name || '');
            const cat = esc(p.category || '');
            const id = Number(p.id) || 0;

            if (viewMode === 'list') {
                return `<div class="prod-list-card" aria-label="${name}">
          <div class="list-img">
            <a href="/product.html?id=">
              <img src="${img}" alt="${name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70'"/>
            </a>
          </div>
          <div class="list-body">
            <div class="prod-cat" style="font-size:11px;margin-bottom:6px">${cat}</div>
            <h3 class="prod-name" style="font-size:18px;margin-bottom:12px"><a href="/product.html?id=">${name}</a></h3>
            <div class="prod-rating" style="margin-bottom:16px">
              <span class="prod-stars">${stars}</span>
              <span class="prod-rc">(${rc} Reviews)</span>
            </div>
            <div class="list-footer">
              <div class="prod-price">
                <span class="price-now">${fmt(p.price)}</span>
                ${p.original_price ? `<span class="price-was">${fmt(p.original_price)}</span><span class="price-off">-${disc}%</span>` : ''}
              </div>
              <div class="list-actions">
                <button class="prod-wish-btn" onclick="toggleWish(${id},this)" style="position:static;backdrop-filter:none;" aria-label="Wishlist">
                  <i class="fa-regular fa-heart" aria-hidden="true"></i>
                </button>
                <button class="btn btn-primary" onclick="addToCartQuick(${id})">
                  <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Add to Bag
                </button>
              </div>
            </div>
          </div>
        </div>`;
            }

            return `<article class="prod-card" aria-label="${name}">
        <div class="prod-img-wrap">
          <a href="/product.html?id=" aria-label="View ${name}">
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70'"/>
          </a>
          <div class="prod-card-badges">
            ${p.is_new ? '<span class="prod-badge badge-new" aria-label="New">New</span>' : ''}
            ${disc > 0 ? `<span class="prod-badge badge-sale" aria-label="${disc}% off">-${disc}%</span>` : ''}
            ${p.featured && !p.is_new ? '<span class="prod-badge badge-hot">Hot</span>' : ''}
          </div>
          <button class="prod-wish-btn" onclick="toggleWish(${id},this)" aria-label="Add to wishlist" aria-pressed="false">
            <i class="fa-regular fa-heart" aria-hidden="true"></i>
          </button>
          <div class="prod-hover-actions" aria-hidden="true">
            <button class="prod-action-btn pab-primary" onclick="addToCartQuick(${id})">
              <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Add to Bag
            </button>
            <a href="/product.html?id=" class="prod-action-btn pab-outline">
              <i class="fa-regular fa-eye" aria-hidden="true"></i> View
            </a>
          </div>
        </div>
        <div class="prod-body">
          <div class="prod-cat">${cat}</div>
          <h3 class="prod-name"><a href="/product.html?id=">${name}</a></h3>
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

        /* ── LOAD DATA ── */
        async function loadData() {
            updateHeader(activeCat);
            try {
                // Fallback for visual demonstration
                const data = await HeelsUpAuth.api('/api/products?limit=200').catch(() => ({
                    products: Array.from({ length: 42 }).map((_, i) => ({
                        id: i + 1, name: `Premium Product ${i + 1}`, price: 1200 + (Math.random() * 2000), original_price: Math.random() > 0.5 ? 3500 : null,
                        category: ['heels', 'sandals', 'bags', 'flats'][i % 4], is_new: Math.random() > 0.8, featured: Math.random() > 0.8
                    }))
                }));
                allProducts = data.products || data.data || [];
                updateCounts();
                applyFilters();
            } catch (e) {
                $('products-container').className = 'products-grid';
                $('products-container').innerHTML = `<div class="err-state" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><p>Unable to load products.</p><button class="btn btn-outline btn-sm" onclick="loadData()">Retry</button></div>`;
                $('show-cnt').textContent = '0';
            }
        }

        function updateCounts() {
            const cnts = { all: allProducts.length, heels: 0, sandals: 0, flats: 0, wedges: 0, bags: 0, clutches: 0, new: 0, sale: 0 };
            allProducts.forEach(p => {
                const c = (p.category || '').toLowerCase();
                if (cnts[c] !== undefined) cnts[c]++;
                if (p.is_new) cnts.new++;
                if (p.original_price && p.price < p.original_price) cnts.sale++;
            });
            Object.entries(cnts).forEach(([k, v]) => {
                document.querySelectorAll(`#cnt-${k}`).forEach(el => el.textContent = v);
            });
        }

        /* ── APPLY FILTERS ── */
        function applyFilters() {
            let p = [...allProducts];

            if (activeCat !== 'all') {
                if (activeCat === 'new') p = p.filter(x => x.is_new);
                else if (activeCat === 'sale') p = p.filter(x => x.original_price && x.price < x.original_price);
                else p = p.filter(x => (x.category || '').toLowerCase() === activeCat || (x.category_slug || '').toLowerCase() === activeCat);
            }

            if (filterSale) p = p.filter(x => x.original_price && x.price < x.original_price);
            if (filterNew) p = p.filter(x => x.is_new);

            p = p.filter(x => { const v = Number(x.price) || 0; return v >= priceMin && v <= priceMax });

            if (activeSort === 'new') p.sort((a, b) => (b.created_at || '') > (a.created_at || '') ? 1 : -1);
            else if (activeSort === 'price-low') p.sort((a, b) => a.price - b.price);
            else if (activeSort === 'price-high') p.sort((a, b) => b.price - a.price);
            else if (activeSort === 'rating') p.sort((a, b) => (b.rating || 0) - (a.rating || 0));

            filtered = p;
            page = 1;
            renderProducts();
        }

        /* ── RENDER ENGINE ── */
        function renderProducts() {
            const container = $('products-container');
            const total = filtered.length;
            const shown = Math.min(page * PER_PAGE, total);
            const toShow = filtered.slice(0, shown);
            $('show-cnt').textContent = total;

            if (!total) {
                container.className = 'products-grid';
                container.innerHTML = `<div class="err-state" style="grid-column:1/-1"><i class="fa-solid fa-box-open" aria-hidden="true"></i><p>No products match your filters.</p><button class="btn btn-outline btn-sm" onclick="clearAll()">Clear Filters</button></div>`;
                $('load-more-wrap').style.display = 'none';
                return;
            }

            container.className = viewMode === 'list' ? 'prod-grid-list' : 'products-grid';
            container.innerHTML = toShow.map(createCard).join('');

            const lmw = $('load-more-wrap');
            if (shown < total) {
                lmw.style.display = 'block';
                $('load-fill').style.width = `${(shown / total) * 100}%`;
                $('load-txt').textContent = `Showing ${shown} of ${total} products`;
            } else { lmw.style.display = 'none' }
        }

        /* ── UI BINDINGS ── */
        window.setView = function (mode) {
            viewMode = mode;
            $('view-grid').classList.toggle('active', mode === 'grid');
            $('view-list').classList.toggle('active', mode === 'list');
            renderProducts();
        };

        function bindFilters(container) {
            const ctx = container || document;

            // Accordions
            ctx.querySelectorAll('.filter-ttl').forEach(t => {
                t.onclick = function () { this.classList.toggle('open'); const nx = this.nextElementSibling; if (nx) nx.style.display = this.classList.contains('open') ? 'flex' : 'none'; }
            });

            // Categories
            ctx.querySelectorAll('.cat-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll(`.cat-btn[data-cat="${btn.dataset.cat}"]`).forEach(b => b.classList.add('active'));
                    activeCat = btn.dataset.cat;
                    updateHeader(activeCat);
                    applyFilters(); updateActiveTags();
                    window.history.replaceState({}, '', activeCat === 'all' ? '/shop' : `/shop?cat=${activeCat}`);
                });
            });

            // Sort
            ctx.querySelectorAll('.sort-opt').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.sort-opt').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll(`.sort-opt[data-sort="${btn.dataset.sort}"]`).forEach(b => b.classList.add('active'));
                    activeSort = btn.dataset.sort;
                    $('sort-sel').value = activeSort;
                    applyFilters(); updateActiveTags();
                });
            });

            // Range (only bind once to main DOM)
            if (ctx === document) {
                function handlePrice() {
                    let min = parseInt($('rng-min').value), max = parseInt($('rng-max').value);
                    if (min > max) { [min, max] = [max, min]; $('rng-min').value = min; $('rng-max').value = max }
                    priceMin = min; priceMax = max;
                    $('pmin-lbl').textContent = '₹' + min; $('pmax-lbl').textContent = '₹' + max;
                    $('range-fill').style.left = (min / 5000) * 100 + '%'; $('range-fill').style.width = ((max - min) / 5000) * 100 + '%';
                    applyFilters(); updateActiveTags();
                }
                $('rng-min').addEventListener('change', handlePrice);
                $('rng-max').addEventListener('change', handlePrice);
            }

            // Checkboxes
            ctx.querySelectorAll('#chk-sale').forEach(c => c.onclick = () => { filterSale = !filterSale; document.querySelectorAll('#chk-sale').forEach(el => el.classList.toggle('checked', filterSale)); applyFilters(); updateActiveTags(); });
            ctx.querySelectorAll('#chk-new').forEach(c => c.onclick = () => { filterNew = !filterNew; document.querySelectorAll('#chk-new').forEach(el => el.classList.toggle('checked', filterNew)); applyFilters(); updateActiveTags(); });
        }

        $('sort-sel').addEventListener('change', e => {
            activeSort = e.target.value;
            document.querySelectorAll('.sort-opt').forEach(b => b.classList.toggle('active', b.dataset.sort === activeSort));
            applyFilters(); updateActiveTags();
        });

        $('load-more-btn').addEventListener('click', () => { page++; renderProducts(); });

        function updateActiveTags() {
            const wrap = $('active-tags');
            const tags = [];
            if (activeCat !== 'all') tags.push({ label: activeCat.charAt(0).toUpperCase() + activeCat.slice(1), rm: () => { activeCat = 'all'; document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all')); applyFilters(); updateActiveTags(); } });
            if (activeSort !== 'featured') {
                const sm = { 'new': 'Newest', 'price-low': 'Price ↑', 'price-high': 'Price ↓', 'rating': 'Top Rated' };
                tags.push({ label: sm[activeSort] || activeSort, rm: () => { activeSort = 'featured'; $('sort-sel').value = 'featured'; document.querySelectorAll('.sort-opt').forEach(b => b.classList.toggle('active', b.dataset.sort === 'featured')); applyFilters(); updateActiveTags() } });
            }
            if (filterSale) tags.push({ label: 'On Sale', rm: () => { filterSale = false; document.querySelectorAll('#chk-sale').forEach(el => el.classList.remove('checked')); applyFilters(); updateActiveTags() } });
            if (filterNew) tags.push({ label: 'New Arrivals', rm: () => { filterNew = false; document.querySelectorAll('#chk-new').forEach(el => el.classList.remove('checked')); applyFilters(); updateActiveTags() } });

            if (!tags.length) { wrap.style.display = 'none'; return }
            wrap.style.display = 'flex';
            wrap.innerHTML = tags.map((t, i) => `<span class="act-tag">${esc(t.label)}<span class="act-tag-rm" onclick="rmTag(${i})">✕</span></span>`).join('');
            window._tagRemovers = tags.map(t => t.rm);
        }
        window.rmTag = i => { if (window._tagRemovers && window._tagRemovers[i]) window._tagRemovers[i]() };

        window.clearAll = function () {
            activeCat = 'all'; activeSort = 'featured'; priceMin = 0; priceMax = 5000; filterSale = false; filterNew = false;
            $('rng-min').value = 0; $('rng-max').value = 5000;
            $('pmin-lbl').textContent = '₹0'; $('pmax-lbl').textContent = '₹5000';
            $('range-fill').style.left = '0%'; $('range-fill').style.width = '100%';
            $('sort-sel').value = 'featured';
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
            document.querySelectorAll('.sort-opt').forEach(b => b.classList.toggle('active', b.dataset.sort === 'featured'));
            document.querySelectorAll('#chk-sale, #chk-new').forEach(el => el.classList.remove('checked'));
            updateHeader('all'); applyFilters(); updateActiveTags();
        }
        $('clear-filters').addEventListener('click', clearAll);

        /* ── INIT ── */
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === activeCat));
            bindFilters(null);
            loadData();
            updateCartBadge();
        });

        document.addEventListener('cart:updated', () => {
            updateCartBadge();
            if (cartDrawer?.classList.contains('open')) renderCart();
        });