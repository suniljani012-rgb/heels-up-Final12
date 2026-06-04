'use strict';

        /* ── HELPERS ── */
        const $ = id => document.getElementById(id);
        const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const fmtPrice = n => { const v = Number(n) || 0; return '₹' + v.toLocaleString('en-IN'); };
        const pad = n => String(n).padStart(2, '0');

        /* ── CATEGORY META ── */
        const CAT_META = {
            all: { title: 'Shop', em: 'All', sub: 'Explore our full collection — heels, sandals, flats, bags and more. Premium quality, unbeatable style.', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1600&q=80' },
            heels: { title: 'Shop', em: 'Heels', sub: 'Premium block heels, stilettos & cones for every occasion. Office to evening.', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1600&q=80' },
            sandals: { title: 'Shop', em: 'Sandals', sub: 'Strappy, flat & wedge sandals — made for the Indian summer.', img: 'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=1600&q=80' },
            flats: { title: 'Shop', em: 'Flats', sub: 'Juttis, mules, ballet flats & loafers — comfort meets style.', img: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1600&q=80' },
            wedges: { title: 'Shop', em: 'Wedges', sub: 'Espadrilles, platforms & cork wedges — height without the pain.', img: 'https://images.unsplash.com/photo-1470176215462-b4e00fdf3ba9?w=1600&q=80' },
            bags: { title: 'Shop', em: 'Bags', sub: 'Tote, sling, shoulder & hobo bags — complete your look.', img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1600&q=80' },
            clutches: { title: 'Shop', em: 'Clutches', sub: 'Evening & party clutches — glamour in the palm of your hand.', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1600&q=80' },
            new: { title: 'New', em: 'Arrivals', sub: 'Fresh drops every week — be the first to grab the latest styles.', img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80' },
            sale: { title: 'Big', em: 'Sale', sub: 'Up to 50% off — grab your favourites before they\'re gone!', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80' },
        };

        /* ── STATE ── */
        const params = new URLSearchParams(location.search);
        let activeCategory = params.get('cat') || 'all';
        let activeSort = 'featured';
        let priceMin = 0, priceMax = 5000;
        let filterSale = false, filterNew = false;
        let allProducts = [];
        let filteredProducts = [];
        let currentPage = 1;
        const PER_PAGE = 12;
        let currentView = 3; // 2, 3, 4, 'list'

        /* ── TOAST ── */
        function toast(msg, type = 's', dur = 4000) {
            const wrap = $('toast-wrap'), t = document.createElement('div');
            t.className = 'toast ' + type;
            const icon = type === 's'
                ? '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
                : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
            t.innerHTML = icon + esc(msg);
            wrap.appendChild(t);
            requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
            setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, dur);
        }
        window.showToast = toast;

        /* ── NAVBAR ── */
        window.addEventListener('scroll', () => {
            $('navbar').classList.toggle('scrolled', window.scrollY > 60);
            $('scroll-top').classList.toggle('show', window.scrollY > 400);
        }, { passive: true });

        /* ── MOBILE MENU ── */
        const mobMenu = $('mob-menu');
        $('hamburger').addEventListener('click', () => { $('hamburger').classList.toggle('open'); mobMenu.classList.toggle('open'); document.body.style.overflow = mobMenu.classList.contains('open') ? 'hidden' : ''; });
        $('mob-close').addEventListener('click', () => { mobMenu.classList.remove('open'); $('hamburger').classList.remove('open'); document.body.style.overflow = ''; });
        $('mob-bd').addEventListener('click', () => { mobMenu.classList.remove('open'); $('hamburger').classList.remove('open'); document.body.style.overflow = ''; });

        /* ── SEARCH ── */
        const srchEl = $('srch'), srchInp = $('srch-inp'), srchRes = $('srch-res');
        $('search-btn').addEventListener('click', () => { srchEl.classList.add('open'); setTimeout(() => srchInp.focus(), 50); });
        $('srch-close').addEventListener('click', () => srchEl.classList.remove('open'));
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { srchEl.classList.remove('open'); closeFilterDrawer(); }
            if (e.key === '/' && !srchEl.classList.contains('open') && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('search-btn').click(); }
        });

        let srchTimer = null;
        srchInp.addEventListener('input', () => {
            clearTimeout(srchTimer);
            const q = srchInp.value.trim();
            if (!q) { srchRes.innerHTML = ''; return; }
            srchTimer = setTimeout(() => doSearch(q), 320);
        });
        srchInp.addEventListener('keydown', e => { if (e.key === 'Enter' && srchInp.value.trim()) window.location.href = '/search.html?q=' + encodeURIComponent(srchInp.value.trim()); });

        async function doSearch(q) {
            srchRes.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">Searching…</p>';
            try {
                const data = await HeelsUpAuth.api('/api/products?q=' + encodeURIComponent(q) + '&limit=5');
                const prods = data.products || data.data || [];
                if (!prods.length) { srchRes.innerHTML = `<p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">No results for "${esc(q)}"</p>`; return; }
                srchRes.innerHTML = prods.map(p => {
                    const img = getImg(p);
                    return `<a href="/product.html?id=${p.id}" style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:10px;transition:background .2s;color:rgba(255,255,255,.8)" onmouseenter="this.style.background='rgba(255,255,255,.06)'" onmouseleave="this.style.background=''">
            ${img ? `<img src="${esc(img)}" style="width:44px;height:52px;object-fit:cover;border-radius:8px;background:rgba(255,255,255,.05)" onerror="this.style.display='none'">` : ''}
            <div style="flex:1"><div style="font-size:13.5px;font-weight:600">${esc(p.name)}</div><div style="font-size:12px;color:rgba(255,255,255,.4)">${esc(p.category || '')}</div></div>
            ${p.price ? `<div style="font-family:var(--fd);font-size:1.1rem;color:var(--gold-lt)">${fmtPrice(p.price)}</div>` : ''}
          </a>`;
                }).join('');
            } catch (e) { srchRes.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">Search unavailable.</p>'; }
        }

        /* ── CART ── */
        $('cart-btn').addEventListener('click', openCart);
        function openCart() { $('cart-drawer').classList.add('open'); $('cart-bd').classList.add('open'); document.body.style.overflow = 'hidden'; renderCartDrawer(); }
        window.closeCart = function () { $('cart-drawer').classList.remove('open'); $('cart-bd').classList.remove('open'); document.body.style.overflow = ''; };

        function updateCartBadge() {
            try {
                const cnt = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
                const b = $('cart-cnt'); if (b) { b.textContent = cnt; b.style.display = cnt ? 'flex' : 'none'; }
            } catch (e) { }
        }

        function renderCartDrawer() {
            const bodyEl = $('cart-body'), footEl = $('cart-foot'), cntEl = $('cart-drawer-cnt');
            let items = [], total = 0;
            try { items = HeelsUpCart.getCart(); total = HeelsUpCart.getSubtotal(); } catch (e) { }
            if (!items.length) {
                bodyEl.innerHTML = `<div class="cart-empty"><svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><p>Your bag is empty</p><button class="btn btn-sm" style="margin-top:16px" onclick="closeCart()">Start Shopping</button></div>`;
                footEl.style.display = 'none'; cntEl.textContent = ''; return;
            }
            cntEl.textContent = '(' + items.length + ')';
            bodyEl.innerHTML = items.map((it, i) => `
        <div class="cart-item">
          ${it.image ? `<img class="cart-item-img" src="${esc(it.image)}" alt="${esc(it.name)}" onerror="this.src=''">` : '<div class="cart-item-img"></div>'}
          <div>
            <div class="cart-item-name">${esc(it.name)}</div>
            <div class="cart-item-meta">${it.size ? 'Size: ' + esc(it.size) + ' · ' : ''}${fmtPrice(it.price)} each</div>
            <div class="qty-row">
              <button class="qty-btn" onclick="chgQty(${i},-1)"><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <span class="qty-val">${it.quantity || 1}</span>
              <button class="qty-btn" onclick="chgQty(${i},1)"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <button style="margin-left:auto;color:var(--text-3);font-size:12px;padding:4px 8px;border-radius:6px;transition:color .2s;cursor:pointer;background:none;border:none" onclick="rmItem(${i})" onmouseenter="this.style.color='var(--rose)'" onmouseleave="this.style.color='var(--text-3)'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
          <div class="cart-item-price">${fmtPrice(it.price * (it.quantity || 1))}</div>
        </div>`).join('');
            const freeAt = 799, left = freeAt - total;
            $('cart-subtotal').textContent = fmtPrice(total);
            $('cart-ship-msg').innerHTML = left > 0 ? `Add ${fmtPrice(left)} more for FREE shipping 🚚` : '✓ You qualify for FREE shipping!';
            footEl.style.display = 'block';
        }
        window.chgQty = (idx, d) => { try { HeelsUpCart.updateQty(idx, d); renderCartDrawer(); updateCartBadge(); } catch (e) { } };
        window.rmItem = (idx) => { try { HeelsUpCart.removeItem(idx); renderCartDrawer(); updateCartBadge(); toast('Item removed'); } catch (e) { } };

        /* ── PAGE META ── */
        function applyPageMeta(cat) {
            const m = CAT_META[cat] || CAT_META.all;
            // hero
            const titleEl = $('cat-hero-title');
            if (titleEl) titleEl.innerHTML = esc(m.title) + ' <em>' + esc(m.em) + '</em>';
            if ($('cat-title-em')) $('cat-title-em').textContent = m.em;
            if ($('cat-hero-sub')) $('cat-hero-sub').textContent = m.sub;
            if ($('breadcrumb-cur')) $('breadcrumb-cur').textContent = m.em;
            const heroImg = $('cat-hero-img');
            if (heroImg) { heroImg.src = m.img; heroImg.alt = m.em; }
            // document
            document.title = m.em + ' – HeelsUp | Ladies Footwear India';
            $('page-title').textContent = m.em + ' – HeelsUp | Ladies Footwear India';
            $('page-desc')?.setAttribute('content', m.sub);
            $('og-title')?.setAttribute('content', m.em + ' – HeelsUp');
            // url update
            const u = new URL(location.href);
            if (cat !== 'all') {
                u.searchParams.set('cat', cat);
            } else {
                u.searchParams.delete('cat');
            }
            history.replaceState({}, '', u);
        }

        /* ── CATEGORY SYNC ── */
        function syncCatUI(cat) {
            // hero pills
            document.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat || (cat === 'all' && p.dataset.cat === 'all')));
            // filters bar chips
            document.querySelectorAll('[data-tab-cat]').forEach(p => p.classList.toggle('active', p.dataset.tabCat === cat || (cat === 'all' && p.dataset.tabCat === 'all')));
            // sidebar
            document.querySelectorAll('.cat-fil-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
            // mobile drawer
            document.querySelectorAll('[data-mob-cat]').forEach(b => b.classList.toggle('active', b.dataset.mobCat === cat));
        }

        /* ── PRODUCT IMAGE HELPER ── */
        function getImg(p) {
            if (p.images) {
                try { const imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images; if (Array.isArray(imgs) && imgs.length) return imgs[0]; } catch (e) { }
            }
            return p.image_url || p.image || '';
        }

        /* ── PRODUCT CARD ── */
        const FALLBACK_IMG = 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70';
        function prodCard(p) {
            const img = getImg(p) || FALLBACK_IMG;
            const price = Number(p.price) || 0;
            const mrp = Number(p.mrp || p.original_price) || 0;
            const showMrp = p.show_mrp !== false && p.show_mrp !== 0;
            const disc = showMrp && mrp && price < mrp ? Math.round(100 - (price / mrp) * 100) : 0;
            const rating = Math.round(Number(p.rating || p.avg_rating || 4.5));
            const stars = '★'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(0, 5 - rating));
            const rc = p.review_count || p.reviews_count || 0;
            const isNew = p.is_new || (p.tags && p.tags.includes && p.tags.includes('new'));
            const isFeat = p.is_featured || p.featured;

            return `<div class="prod-card" data-id="${p.id}">
        <div class="prod-img-wrap">
          <a href="/product.html?id=${p.id}">
            <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='${FALLBACK_IMG}'"/>
          </a>
          <div class="prod-badges">
            ${isNew ? '<span class="pbadge pbadge-new">New</span>' : ''}
            ${disc > 0 ? `<span class="pbadge pbadge-sale">-${disc}%</span>` : ''}
            ${isFeat ? '<span class="pbadge pbadge-hot">Hot</span>' : ''}
          </div>
          <button class="prod-wish" onclick="toggleWish(${p.id},this)" aria-label="Wishlist">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
          <div class="prod-actions">
            <button class="prod-act primary" onclick="addToCartQuick(${p.id})">
              <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              Bag
            </button>
            <a href="/product.html?id=${p.id}" class="prod-act outline">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </a>
          </div>
        </div>
        <div class="prod-body">
          <div class="prod-cat">${esc(p.category_name || p.category || '')}</div>
          <div class="prod-name"><a href="/product.html?id=${p.id}">${esc(p.name)}</a></div>
          <div class="prod-rating"><span class="prod-stars">${stars}</span><span class="prod-rc">${rc ? '(' + rc + ')' : ''}</span></div>
          <div class="prod-price">
            <span class="price-now">${fmtPrice(price)}</span>
            ${mrp && showMrp && disc > 0 ? `<span class="price-was">${fmtPrice(mrp)}</span><span class="price-off">-${disc}%</span>` : ''}
          </div>
        </div>
      </div>`;
        }

        /* ── WISHLIST ── */
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

        /* ── FILTER / SORT PRODUCTS ── */
        function applyFilters() {
            let p = [...allProducts];

            if (activeCategory !== 'all') {
                if (activeCategory === 'new') p = p.filter(x => x.is_new);
                else if (activeCategory === 'sale') p = p.filter(x => Number(x.mrp || x.original_price) > Number(x.price));
                else p = p.filter(x => (x.category || '').toLowerCase() === activeCategory.toLowerCase());
            }

            p = p.filter(x => { const pr = Number(x.price) || 0; return pr >= priceMin && pr <= priceMax; });
            if (filterSale) p = p.filter(x => Number(x.mrp || x.original_price) > Number(x.price));
            if (filterNew) p = p.filter(x => x.is_new);

            if (activeSort === 'new') p.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
            else if (activeSort === 'price-low') p.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
            else if (activeSort === 'price-high') p.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
            else if (activeSort === 'rating') p.sort((a, b) => (Number(b.rating || b.avg_rating) || 0) - (Number(a.rating || a.avg_rating) || 0));
            else if (activeSort === 'discount') p.sort((a, b) => {
                const da = a.mrp && a.price ? Math.round(100 - (a.price / a.mrp) * 100) : 0;
                const db = b.mrp && b.price ? Math.round(100 - (b.price / b.mrp) * 100) : 0;
                return db - da;
            });

            filteredProducts = p; currentPage = 1;
            updateCountBadges();
            renderProducts();
        }

        /* ── COUNT BADGES ── */
        function updateCountBadges() {
            const cats = ['heels', 'sandals', 'flats', 'wedges', 'bags', 'clutches', 'new', 'sale'];
            cats.forEach(c => {
                const cnt = c === 'new' ? allProducts.filter(x => x.is_new).length
                    : c === 'sale' ? allProducts.filter(x => Number(x.mrp || x.original_price) > Number(x.price)).length
                        : allProducts.filter(x => (x.category || '').toLowerCase() === c).length;
                [$('fc-' + c), $('fc2-' + c)].forEach(el => { if (el) el.textContent = cnt || '—'; });
            });
            [$('fc2-all')].forEach(el => { if (el) el.textContent = allProducts.length || '—'; });
        }

        /* ── RENDER ── */
        function renderProducts() {
            const grid = $('prod-grid');
            const total = filteredProducts.length;
            const shown = Math.min(currentPage * PER_PAGE, total);
            const toShow = filteredProducts.slice(0, shown);

            [$('result-count'), $('result-count-2')].forEach(el => { if (el) el.textContent = total; });

            if (!total) {
                grid.innerHTML = `<div class="no-products"><div class="no-products-ico">👠</div><h3>No products found</h3><p>Try adjusting your filters or browse all products.</p><button class="btn" onclick="clearFilters()">Clear Filters</button></div>`;
                $('load-more-wrap').style.display = 'none'; return;
            }

            grid.className = 'prod-grid';
            if (currentView === 2) grid.classList.add('view-2');
            else if (currentView === 4) grid.classList.add('view-4');
            else if (currentView === 'list') grid.classList.add('view-list');

            grid.innerHTML = toShow.map(prodCard).join('');

            if (shown < total) {
                $('load-more-wrap').style.display = 'block';
                $('lm-fill').style.width = ((shown / total) * 100) + '%';
                $('lm-text').textContent = `Showing ${shown} of ${total} products`;
            } else {
                $('load-more-wrap').style.display = 'none';
            }
        }

        /* ── VIEW TOGGLE ── */
        window.setView = function (v) {
            currentView = v;
            ['view-2', 'view-3', 'view-list', 'view-4'].forEach(id => { const el = $(id); if (el) el.classList.remove('active'); });
            if (v === 2) { const el = $('view-2'); if (el) el.classList.add('active'); }
            else if (v === 3) { const el = $('view-3'); if (el) el.classList.add('active'); }
            else if (v === 'list') { const el = $('view-list'); if (el) el.classList.add('active'); }
            renderProducts();
        };

        /* ── LOAD MORE ── */
        $('load-more-btn')?.addEventListener('click', () => { currentPage++; renderProducts(); window.scrollBy({ top: -200, behavior: 'smooth' }); });

        /* ── PRICE RANGE ── */
        function initPriceRange() {
            const rMin = $('range-min'), rMax = $('range-max');
            function updatePrice() {
                let min = parseInt(rMin.value), max = parseInt(rMax.value);
                if (min > max) [min, max] = [max, min];
                priceMin = min; priceMax = max;
                $('price-min-lbl').textContent = '₹' + min.toLocaleString('en-IN');
                $('price-max-lbl').textContent = '₹' + max.toLocaleString('en-IN');
                const p1 = (min / 5000) * 100, p2 = (max / 5000) * 100;
                $('price-fill').style.left = p1 + '%';
                $('price-fill').style.width = (p2 - p1) + '%';
                applyFilters();
            }
            rMin?.addEventListener('input', updatePrice);
            rMax?.addEventListener('input', updatePrice);
            updatePrice();
        }

        /* ── FILTER INIT ── */
        function initFilters() {
            // sidebar cat buttons
            document.querySelectorAll('.cat-fil-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeCategory = btn.dataset.cat;
                    syncCatUI(activeCategory);
                    applyPageMeta(activeCategory);
                    applyFilters();
                });
            });
            // hero pills
            document.querySelectorAll('.cat-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeCategory = btn.dataset.cat;
                    syncCatUI(activeCategory);
                    applyPageMeta(activeCategory);
                    applyFilters();
                });
            });
            // sticky bar chips
            document.querySelectorAll('[data-tab-cat]').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeCategory = btn.dataset.tabCat;
                    syncCatUI(activeCategory);
                    applyPageMeta(activeCategory);
                    applyFilters();
                    $('prod-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });

            // checkboxes
            $('fil-sale')?.addEventListener('change', e => { filterSale = e.target.checked; applyFilters(); });
            $('fil-new')?.addEventListener('change', e => { filterNew = e.target.checked; applyFilters(); });
            $('mob-fil-sale')?.addEventListener('change', e => { filterSale = e.target.checked; });
            $('mob-fil-new')?.addEventListener('change', e => { filterNew = e.target.checked; });

            // sort
            $('sort-sel')?.addEventListener('change', e => { activeSort = e.target.value; applyFilters(); });

            // clear
            $('sidebar-clear')?.addEventListener('click', clearFilters);

            // price
            initPriceRange();

            // mobile filter drawer
            $('filter-toggle-btn')?.addEventListener('click', () => { $('filter-drawer').classList.add('open'); $('filter-drawer-bd').classList.add('open'); document.body.style.overflow = 'hidden'; buildMobCatFilters(); });
            $('filter-drawer-close')?.addEventListener('click', closeFilterDrawer);
            $('filter-drawer-bd')?.addEventListener('click', closeFilterDrawer);
            $('apply-mob-filters')?.addEventListener('click', () => { applyFilters(); closeFilterDrawer(); });
        }

        function closeFilterDrawer() {
            $('filter-drawer').classList.remove('open');
            $('filter-drawer-bd').classList.remove('open');
            document.body.style.overflow = '';
        }

        function buildMobCatFilters() {
            const el = $('mob-cat-filters');
            if (!el) return;
            const cats = ['all', 'heels', 'sandals', 'flats', 'wedges', 'bags', 'clutches', 'new', 'sale'];
            const labels = { all: '🛍️ All', heels: '👠 Heels', sandals: '👡 Sandals', flats: '🥿 Flats', wedges: '👢 Wedges', bags: '👜 Bags', clutches: '👝 Clutches', new: '✨ New Arrivals', sale: '🔥 Sale' };
            el.innerHTML = cats.map(c => `<button class="cat-fil-btn mob-cat-fil ${c === activeCategory ? 'active' : ''}" data-mob-cat="${c}">${labels[c]}</button>`).join('');
            el.querySelectorAll('[data-mob-cat]').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeCategory = btn.dataset.mobCat;
                    el.querySelectorAll('[data-mob-cat]').forEach(b => b.classList.toggle('active', b.dataset.mobCat === activeCategory));
                    syncCatUI(activeCategory);
                    applyPageMeta(activeCategory);
                });
            });
        }

        window.clearFilters = function () {
            activeCategory = 'all'; activeSort = 'featured'; priceMin = 0; priceMax = 5000; filterSale = false; filterNew = false;
            const rMin = $('range-min'), rMax = $('range-max');
            if (rMin) rMin.value = 0; if (rMax) rMax.value = 5000;
            if ($('fil-sale')) $('fil-sale').checked = false;
            if ($('fil-new')) $('fil-new').checked = false;
            if ($('sort-sel')) $('sort-sel').value = 'featured';
            const pf = $('price-fill');
            if (pf) { pf.style.left = '0%'; pf.style.width = '100%'; }
            if ($('price-min-lbl')) $('price-min-lbl').textContent = '₹0';
            if ($('price-max-lbl')) $('price-max-lbl').textContent = '₹5,000';
            syncCatUI('all'); applyPageMeta('all'); applyFilters();
        }

        /* ── LOAD PRODUCTS (MOCK OR API) ── */
        async function loadProducts() {
            try {
                // Mock Fetch for visual presentation if API fails
                const data = await HeelsUpAuth.api('/api/products?limit=200').catch(() => ({
                    products: Array.from({ length: 42 }).map((_, i) => ({
                        id: i + 1, name: `Premium Product ${i + 1}`, price: (1200 + (Math.random() * 2000)) * 100, original_price: Math.random() > 0.5 ? (3500 * 100) : null,
                        category: ['heels', 'sandals', 'bags', 'flats', 'wedges', 'clutches'][i % 6], is_new: Math.random() > 0.8, featured: Math.random() > 0.8,
                        rating: 4 + Math.random(), review_count: Math.floor(Math.random() * 200) + 10,
                        images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70']
                    }))
                }));
                allProducts = data.products || data.data || [];
            } catch (e) {
                allProducts = [];
                $('prod-grid').innerHTML = `<div class="err-state"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Unable to load products.</p><button class="retry-btn" onclick="loadProducts()">Retry</button></div>`;
                return;
            }

            // Set stats correctly from DB if available
            if (allProducts.length > 0) {
                $('cat-stat-products').innerText = allProducts.length + '+';
            }

            applyFilters();
        }

        /* ── AUTH ── */
        (function initAuth() {
            let user = null;
            try { user = HeelsUpAuth.getUser(); } catch (e) { }
            if (user) {
                const mobLogin = $('mob-login-btn');
                if (mobLogin) { mobLogin.textContent = 'My Account'; mobLogin.href = '/profile.html'; }
            }
            updateCartBadge();
        })();

        /* ── INIT ── */
        document.addEventListener('DOMContentLoaded', () => {
            syncCatUI(activeCategory);
            applyPageMeta(activeCategory);
            initFilters();
            loadProducts();
            updateCartBadge();
        });

        document.addEventListener('cart:updated', () => {
            updateCartBadge();
            if ($('cart-drawer').classList.contains('open')) renderCartDrawer();
        });