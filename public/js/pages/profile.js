'use strict';

        /* ── DOM Utils ── */
        const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const $ = id => document.getElementById(id);

        /* ── Auth Guard ── */
        (function () {
            try { if (!HeelsUpAuth.getToken()) window.location.href = '/login.html?redirect=profile'; } catch (e) { window.location.href = '/login.html'; }
        })();

        /* ── GLOBAL UI HANDLERS (Navbar, Mobile Menu, Search, Toasts) ── */
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

        const srchOverlay = $('search-overlay'), srchInp = $('search-inp'), srchRes = $('search-res');
        function openSearch() { srchOverlay.classList.add('open'); setTimeout(() => srchInp?.focus(), 60) }
        function closeSearch() { srchOverlay.classList.remove('open') }
        $('search-btn')?.addEventListener('click', openSearch);
        $('search-close-btn')?.addEventListener('click', closeSearch);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeSearch(); closeMob(); closeCart(); }
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
                    return `<a href="/product/${encodeURIComponent(p.slug || p.id)}" class="search-res-item" role="option">
            ${img ? `<img class="search-res-img" src="${img}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">` : '<div class="search-res-img"></div>'}
            <div style="flex:1;min-width:0"><div class="search-res-name">${esc(p.name)}</div><div class="search-res-cat">${esc(p.category || '')}</div></div>
            <div class="search-res-price">₹${(p.price || 0).toLocaleString('en-IN')}</div>
          </a>`;
                }).join('');
            } catch (e) { srchRes.innerHTML = '<p style="color:rgba(255,255,255,.28);font-size:13px;text-align:center;padding:20px">Search unavailable.</p>'; }
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
        window.showToast = toast;

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

        /* ── PROFILE & DASHBOARD LOGIC ── */

        /* Tab Switch */
        function switchTab(tab) {
            document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.querySelector('.sidebar-nav-item[data-tab="' + tab + '"]')?.classList.add('active');
            $('panel-' + tab)?.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        /* Alert Boxes */
        function showAlert(alertId, msgId, msg, type = 'error') {
            const box = $(alertId);
            $(msgId).textContent = msg;
            box.className = 'alert alert-' + type;
            box.style.display = 'flex';
            const icons = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warn: 'fa-triangle-exclamation' };
            const i = box.querySelector('i');
            if (i) i.className = `fa-solid ${icons[type] || 'fa-circle-info'}`;
        }
        function hideAlert(alertId) { $(alertId).style.display = 'none'; }

        /* Format Currency */
        function formatInr(n) {
            if (!n) return '₹0';
            if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
            if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
            return '₹' + Number(n).toLocaleString('en-IN');
        }

        /* Password field toggle (Using FontAwesome) */
        function togglePwField(inputId, iconId) {
            const inp = $(inputId);
            const isText = inp.type === 'text';
            inp.type = isText ? 'password' : 'text';
            $(iconId).className = isText ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
        }

        /* Password strength */
        function checkPwStrength(pw) {
            let score = 0;
            if (pw.length >= 8) score++;
            if (/[A-Z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^a-zA-Z0-9]/.test(pw)) score++;
            const cls = ['', 'w', 'w', 'm', 's'];
            const labels = ['Enter a new password', 'Weak', 'Weak', 'Fair', 'Strong'];
            const colors = ['var(--text-pale)', 'var(--red)', 'var(--red)', '#f59e0b', '#15803d'];
            ['ps0', 'ps1', 'ps2', 'ps3'].forEach((id, i) => {
                $(id).className = 'pw-seg' + (i < score ? ' ' + cls[score] : '');
            });
            const lbl = $('pwLbl');
            lbl.textContent = pw ? labels[score] : 'Enter a new password';
            lbl.style.color = pw ? colors[score] : 'var(--text-pale)';
        }

        /* Load Profile */
        async function loadProfile() {
            const prog = $('pageProgress');
            prog.style.transform = 'scaleX(.4)';
            try {
                const data = await HeelsUpAuth.api('/api/me');
                const user = data.user || {};
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer';
                const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || '?';

                /* sidebar */
                $('sidebarAvatar').textContent = initials;
                $('sidebarName').textContent = fullName;
                $('sidebarEmail').textContent = user.email || '';

                /* profile form */
                $('editFname').value = user.firstName || '';
                $('editLname').value = user.lastName || '';
                $('editEmail').value = user.email || '';
                $('editPhone').value = user.phone || '';

                /* address tab */
                $('addrName').textContent = fullName;
                $('addrDetail').textContent = (user.phone ? '📱 +91 ' + user.phone + '\n' : '') + '\n✉️ ' + (user.email || '—') + '\n\n📍 Jodhpur, Rajasthan';

                prog.style.transform = 'scaleX(.8)';
            } catch (err) {
                if (err?.status === 401 || err?.message?.includes('401')) {
                    HeelsUpAuth.clearSession();
                    window.location.href = '/login.html?redirect=profile';
                } else {
                    toast('Could not load profile. Please refresh.', 'error');
                }
            } finally {
                prog.classList.add('done');
            }
        }

        /* Load Orders */
        async function loadOrders() {
            try {
                const data = await HeelsUpAuth.api('/api/orders/my');
                const orders = data.orders || [];
                const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

                $('statOrders').textContent = orders.length;
                $('statSpent').textContent = formatInr(totalSpent);
                $('miniOrders').textContent = orders.length;
                $('miniSpent').textContent = formatInr(totalSpent);

                renderRecentOrders(orders);
                renderAllOrders(orders);
            } catch (e) {
                $('statOrders').textContent = '—';
                $('statSpent').textContent = '—';
                $('miniOrders').textContent = '—';
                $('miniSpent').textContent = '—';
                const errHtml = '<div style="text-align:center;padding:28px;color:var(--text-m);font-size:13.5px">Could not load orders.</div>';
                if ($('recentOrdersBody')) $('recentOrdersBody').innerHTML = errHtml;
                if ($('allOrdersBody')) $('allOrdersBody').innerHTML = errHtml;
            }
        }

        function renderRecentOrders(orders) {
            const body = $('recentOrdersBody');
            if (!orders || !orders.length) {
                body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open empty-icon"></i><div class="empty-title">No orders yet</div><div class="empty-sub">Your order history will appear here</div><a href="/shop.html" class="btn btn-primary"><div class="btn-inner">Start Shopping</div></a></div>`;
                return;
            }
            const statusMap = { placed: 'badge-placed', confirmed: 'badge-processing', processing: 'badge-processing', shipped: 'badge-shipped', delivered: 'badge-delivered', cancelled: 'badge-cancelled' };
            const fallback = 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=120&q=60&auto=format&fit=crop';
            body.innerHTML = orders.slice(0, 3).map(order => {
                const st = (order.orderStatus || 'placed').toLowerCase();
                const img = order.items?.[0]?.image || fallback;
                const name = order.items?.[0]?.name || 'Product';
                const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                const price = formatInr(order.totalAmount || 0);
                return `<div class="order-row">
          <div class="order-thumb"><img src="${img}" alt="${name}" loading="lazy" /></div>
          <div class="order-info">
            <div class="order-name">${name}</div>
            <div class="order-meta">Order #${order.orderNumber || order._id || order.id} &middot; ${date}</div>
            <div class="order-price">${price}</div>
            <div class="order-actions">
              <a href="/orders" class="order-track-btn">Track Order <i class="fa-solid fa-arrow-right-long" style="margin-left:4px"></i></a>
            </div>
          </div>
          <span class="badge ${statusMap[st] || 'badge-placed'}" style="text-transform:capitalize">${st}</span>
        </div>`;
            }).join('');
        }

        function renderAllOrders(orders) {
            const body = $('allOrdersBody');
            if (!orders || !orders.length) {
                body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open empty-icon"></i><div class="empty-title">No orders yet</div><div class="empty-sub">Start shopping to see your orders here</div><a href="/shop.html" class="btn btn-primary"><div class="btn-inner">Browse Products</div></a></div>`;
                return;
            }
            const statusMap = { placed: 'badge-placed', confirmed: 'badge-processing', processing: 'badge-processing', shipped: 'badge-shipped', delivered: 'badge-delivered', cancelled: 'badge-cancelled' };
            const fallback = 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=120&q=60&auto=format&fit=crop';
            body.innerHTML = orders.map(order => {
                const st = (order.orderStatus || 'placed').toLowerCase();
                const img = order.items?.[0]?.image || fallback;
                const name = order.items?.[0]?.name || 'Product';
                const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                const price = formatInr(order.totalAmount || 0);
                const itemCount = order.items?.length || 1;
                return `<div class="order-row">
          <div class="order-thumb"><img src="${img}" alt="${name}" loading="lazy" /></div>
          <div class="order-info">
            <div class="order-name">${name}${itemCount > 1 ? ` <span style="font-size:11.5px;font-weight:500;color:var(--text-m)">+${itemCount - 1} more</span>` : ''}</div>
            <div class="order-meta">Order #${order.orderNumber || order._id || order.id} &middot; ${date} &middot; ${itemCount} item${itemCount > 1 ? 's' : ''}</div>
            <div class="order-price">${price}</div>
            <div class="order-actions">
              <a href="/orders" class="order-track-btn">View Details <i class="fa-solid fa-arrow-right-long" style="margin-left:4px"></i></a>
              ${st === 'delivered' ? `<button onclick="toast('Return request coming soon!','info')" class="btn btn-outline" style="font-size:11px;padding:5px 12px;text-transform:none">Return</button>` : ''}
            </div>
          </div>
          <span class="badge ${statusMap[st] || 'badge-placed'}" style="text-transform:capitalize">${st}</span>
        </div>`;
            }).join('');
        }

        /* Render Wishlist */
        function renderWishlist() {
            const body = $('wishlistBody');
            const countEl = $('wishlistCount');
            try {
                const wl = JSON.parse(localStorage.getItem('heelsup_wishlist') || '[]');
                countEl.textContent = wl.length + ' item' + (wl.length !== 1 ? 's' : '');
                $('miniWishlist').textContent = wl.length;
                $('statWishlist').textContent = wl.length;
                if (!wl.length) {
                    body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-heart empty-icon"></i><div class="empty-title">Your wishlist is empty</div><div class="empty-sub">Save items you love for later</div><a href="/shop.html" class="btn btn-primary"><div class="btn-inner">Explore Products</div></a></div>`;
                    return;
                }
                body.innerHTML = `<div class="wishlist-grid">${wl.map((item, i) => `
          <div class="wishlist-item">
            <div class="wishlist-img">
              <a href="/product/${encodeURIComponent(item.slug || item.id)}">
                <img src="${item.image || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&q=70'}" alt="${item.name}" loading="lazy" />
              </a>
              <button class="wishlist-remove" onclick="removeFromWishlist(${i})" title="Remove">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="wishlist-info">
              <div class="wishlist-name">${item.name || 'Product'}</div>
              <div class="wishlist-price">${formatInr(item.price || 0)}</div>
            </div>
          </div>`).join('')}</div>`;
            } catch (e) {
                body.innerHTML = '<div class="empty-state"><div class="empty-sub">Could not load wishlist.</div></div>';
            }
        }

        function removeFromWishlist(index) {
            try {
                const wl = JSON.parse(localStorage.getItem('heelsup_wishlist') || '[]');
                wl.splice(index, 1);
                localStorage.setItem('heelsup_wishlist', JSON.stringify(wl));
                renderWishlist();
                toast('Removed from wishlist', 'info');
            } catch (e) { }
        }

        /* Save Profile */
        async function saveProfile() {
            const fname = $('editFname').value.trim();
            if (!fname) {
                $('errFname').classList.add('show');
                showAlert('profileAlert', 'profileAlertMsg', 'First name is required.');
                return;
            }
            $('errFname').classList.remove('show');
            hideAlert('profileAlert');

            const btn = $('saveProfileBtn');
            btn.disabled = true;
            btn.innerHTML = '<div class="btn-inner"><div class="spinner"></div> Saving…</div>';

            try {
                await HeelsUpAuth.api('/api/me', {
                    method: 'PUT',
                    body: JSON.stringify({
                        firstName: fname,
                        lastName: $('editLname').value.trim(),
                        phone: $('editPhone').value.trim()
                    })
                });
                showAlert('profileAlert', 'profileAlertMsg', 'Profile updated successfully!', 'success');
                $('profileAlert').style.display = 'flex';
                await loadProfile();
                toast('Profile saved successfully!', 'success');
            } catch (err) {
                showAlert('profileAlert', 'profileAlertMsg', err?.message || 'Update failed. Please try again.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<div class="btn-inner"><i class="fa-solid fa-floppy-disk"></i> Save Changes</div>';
            }
        }

        /* Update Password */
        async function updatePassword() {
            const curr = $('currPw').value;
            const nw = $('newPw').value;
            const conf = $('confPw').value;
            hideAlert('pwAlert');

            if (!curr) { showAlert('pwAlert', 'pwAlertMsg', 'Current password is required.'); return; }
            if (!nw || nw.length < 8) { showAlert('pwAlert', 'pwAlertMsg', 'New password must be at least 8 characters.'); return; }
            if (nw !== conf) { showAlert('pwAlert', 'pwAlertMsg', 'New passwords do not match.'); return; }
            if (nw === curr) { showAlert('pwAlert', 'pwAlertMsg', 'New password must differ from your current password.', 'warn'); return; }

            const btn = $('updatePwBtn');
            btn.disabled = true;
            btn.innerHTML = '<div class="btn-inner"><div class="spinner"></div> Updating…</div>';

            try {
                await HeelsUpAuth.api('/api/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword: curr, newPassword: nw }) });
                $('currPw').value = '';
                $('newPw').value = '';
                $('confPw').value = '';
                ['ps0', 'ps1', 'ps2', 'ps3'].forEach(id => { $(id).className = 'pw-seg'; });
                $('pwLbl').textContent = 'Enter a new password';
                $('pwLbl').style.color = 'var(--text-pale)';
                toast('Password updated successfully!', 'success');
            } catch (err) {
                showAlert('pwAlert', 'pwAlertMsg', err?.data?.error || err?.message || 'Incorrect current password.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<div class="btn-inner"><i class="fa-solid fa-key"></i> Update Password</div>';
            }
        }

        /* Logout Handling */
        $('logoutBtn')?.addEventListener('click', () => {
            HeelsUpAuth.clearSession();
            toast('Logged out. See you soon! 👋', 'info');
            setTimeout(() => window.location.href = '/index.html', 900);
        });
        $('mob-logout-btn')?.addEventListener('click', () => {
            HeelsUpAuth.clearSession();
            toast('Logged out.', 'info');
            setTimeout(() => window.location.href = '/index.html', 900);
        });

        /* Init */
        document.addEventListener('DOMContentLoaded', () => {
            updateCartBadge();
            loadProfile();
            loadOrders();
            renderWishlist();
        });