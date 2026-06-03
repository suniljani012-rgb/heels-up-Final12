// ── AUTH ─────────────────────────────────────────────────────────────────────
        (function () {
            let user = null;
            try { user = (typeof HeelsUpAuth !== 'undefined') ? HeelsUpAuth.getUser() : null; } catch (e) { }
            if (!user || user.role !== 'admin') {
                const el = document.createElement('div');
                el.className = 'auth-error';
                el.innerHTML = `<i class="fa-solid fa-shield-exclamation" style="font-size:3rem;color:var(--danger)"></i>
      <h2 style="color:#fff;font-size:1.4rem;font-weight:700">Access Denied</h2>
      <p style="color:#64748B;font-size:.88rem">You must be logged in as an admin.</p>
      <a href="login.html?redirect=admin-orders.html" class="btn btn-primary" style="margin-top:8px"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login</a>`;
                document.body.appendChild(el);
                return;
            }
            const name = user.firstName || user.first_name || 'Admin';
            document.getElementById('sAvatar').textContent = name.charAt(0).toUpperCase();
            document.getElementById('sName').textContent = name;
        })();

        // ── STATE ─────────────────────────────────────────────────────────────────────
        let allOrders = [], filteredOrders = [], activeTab = 'all', currentPg = 1;
        let currentOrderData = null;
        const PAGE_SIZE = 20;
        const cache = {};

        // ── HELPERS ───────────────────────────────────────────────────────────────────
        const $ = id => document.getElementById(id);
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const fmtRs = v => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
        const fmtNum = v => (Number(v) || 0).toLocaleString('en-IN');
        const fmtDate = (d, short = false) => {
            if (!d) return '—';
            const opts = short ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(d).toLocaleDateString('en-IN', opts);
        };

        function isRazorpayOrder(o) {
            return !!(o.razorpay_payment_id || o.razorpay_order_id);
        }

        function statusBadge(s) {
            s = (s || 'placed').toLowerCase();
            const cls = `badge-${s.replace(/\s+/g, '_')}`;
            const labels = {
                placed: 'Placed', confirmed: 'Confirmed', processing: 'Processing',
                shipped: 'Shipped', out_for_delivery: 'Out for Delivery',
                delivered: 'Delivered', cancelled: 'Cancelled',
                exchange_requested: 'Exchange Requested', exchange_approved: 'Exchange Approved',
                exchange_rejected: 'Exchange Rejected', payment_pending: 'Pmt Pending'
            };
            return `<span class="badge ${cls}">${esc(labels[s] || s)}</span>`;
        }

        function payBadge(s, method) {
            s = (s || 'pending').toLowerCase();
            if (s === 'paid' || s === 'success') return `<span class="badge badge-paid"><i class="fa-solid fa-circle-check" style="font-size:.6rem"></i> Paid</span>`;
            if (s === 'failed') return `<span class="badge badge-failed"><i class="fa-solid fa-circle-xmark" style="font-size:.6rem"></i> Failed</span>`;
            if (s === 'refunded') return `<span class="badge badge-refunded"><i class="fa-solid fa-rotate-left" style="font-size:.6rem"></i> Refunded</span>`;
            return `<span class="badge badge-pending"><i class="fa-regular fa-clock" style="font-size:.6rem"></i> Pending</span>`;
        }

        function methodBadge(m) {
            if (!m) return '—';
            m = m.toLowerCase();
            if (m === 'razorpay' || m === 'upi' || m === 'card') return `<span class="badge badge-razorpay"><i class="fa-solid fa-lock" style="font-size:.6rem"></i> Razorpay</span>`;
            if (m === 'cod') return `<span class="badge badge-cod">COD</span>`;
            return `<span class="badge badge-locked">${esc(m)}</span>`;
        }

        // ── SIDEBAR ───────────────────────────────────────────────────────────────────
        function toggleSidebar() { const s = $('sidebar'), o = $('mobOverlay'); s.classList.toggle('open'); o.style.display = s.classList.contains('open') ? 'block' : 'none'; }
        function closeSidebar() { $('sidebar').classList.remove('open'); $('mobOverlay').style.display = 'none'; }
        function doLogout() { try { HeelsUpAuth.clearSession(); } catch (e) { } window.location = 'login.html'; }

        // ── TOAST ─────────────────────────────────────────────────────────────────────
        function toast(msg, type = 'success') {
            const wrap = $('toastWrap'), t = document.createElement('div');
            t.className = `toast ${type}`;
            const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check';
            t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
            wrap.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 4500);
        }

        // ── API ───────────────────────────────────────────────────────────────────────
        async function apiFetch(url, opts = {}) {
            const cacheKey = url + JSON.stringify(opts);
            if (!opts.method && cache[cacheKey] && Date.now() - cache[cacheKey].ts < 30000) return cache[cacheKey].data;
            let apiFunc;
            try { apiFunc = HeelsUpAuth.api; } catch (e) { apiFunc = null; }
            if (!apiFunc) throw new Error('Not authenticated');
            const data = await apiFunc(url, opts);
            if (!opts.method) cache[cacheKey] = { data, ts: Date.now() };
            return data;
        }

        // ── LOAD ORDERS ───────────────────────────────────────────────────────────────
        async function loadOrders() {
            const btn = $('refreshBtn');
            if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true; }
            $('heroSub').textContent = 'Fetching orders…';

            try {
                const t0 = performance.now();
                const res = await apiFetch('/api/admin/orders');
                const ms = (performance.now() - t0).toFixed(0);

                allOrders = Array.isArray(res) ? res : (res.orders || []);
                allOrders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

                updateKPIs();
                updateTabCounts();
                applyFilters();

                // Update badge
                const unfulfilled = allOrders.filter(o => {
                    const s = (o.order_status || '').toLowerCase();
                    return s === 'placed' || s === 'confirmed' || s === 'processing';
                }).length;
                if (unfulfilled > 0) { $('ordersBadge').textContent = unfulfilled; $('ordersBadge').style.display = ''; }

                $('heroSub').textContent = `${fmtNum(allOrders.length)} total orders · loaded in ${ms}ms`;
                toast(`${allOrders.length} orders loaded in ${ms}ms`, 'success');
            } catch (e) {
                toast('Failed to load orders: ' + (e.message || 'Network error'), 'error');
                $('ordersTbody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);opacity:1"></i><p style="color:var(--danger)">Failed to load. <button class="btn btn-sm btn-outline" onclick="loadOrders()" style="margin-left:8px"><i class="fa-solid fa-arrows-rotate"></i> Retry</button></p></div></td></tr>`;
            } finally {
                if (btn) { btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh'; btn.disabled = false; }
            }
        }

        function updateKPIs() {
            const total = allOrders.length;
            const delivered = allOrders.filter(o => o.order_status === 'delivered').length;
            const unfulfilled = allOrders.filter(o => ['placed', 'confirmed', 'processing'].includes((o.order_status || '').toLowerCase())).length;
            const cancelled = allOrders.filter(o => o.order_status === 'cancelled').length;
            const revenue = allOrders.filter(o => o.payment_status === 'paid' || o.payment_status === 'success').reduce((s, o) => s + Number(o.total_amount || 0), 0);
            $('kpiTotal').textContent = fmtNum(total);
            $('kpiDelivered').textContent = fmtNum(delivered);
            $('kpiUnfulfilled').textContent = fmtNum(unfulfilled);
            $('kpiCancelled').textContent = fmtNum(cancelled);
            $('kpiRevenue').textContent = fmtRs(revenue);
        }

        function updateTabCounts() {
            const counts = { all: 0, unfulfilled: 0, payment_pending: 0, placed: 0, confirmed: 0, shipped: 0, out_for_delivery: 0, delivered: 0, cancelled: 0, exchange: 0 };
            allOrders.forEach(o => {
                const s = (o.order_status || '').toLowerCase();
                const ps = (o.payment_status || '').toLowerCase();
                counts.all++;
                if (s === 'placed' || s === 'confirmed' || s === 'processing') counts.unfulfilled++;
                if (ps === 'pending' && s !== 'cancelled') counts.payment_pending++;
                if (counts[s] !== undefined) counts[s]++;
                if (s.includes('exchange')) counts.exchange++;
            });
            const map = { all: 'tcAll', unfulfilled: 'tcUnfulfilled', payment_pending: 'tcPending', placed: 'tcPlaced', confirmed: 'tcConfirmed', shipped: 'tcShipped', out_for_delivery: 'tcOfd', delivered: 'tcDelivered', cancelled: 'tcCancelled', exchange: 'tcExchange' };
            Object.entries(map).forEach(([k, id]) => { const el = $(id); if (el) el.textContent = fmtNum(counts[k] || 0); });
        }

        // ── TABS & FILTERS ────────────────────────────────────────────────────────────
        function setTab(tab, btn) {
            activeTab = tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPg = 1;
            applyFilters();
        }

        function applyFilters() {
            const q = ($('searchInput').value || '').toLowerCase();
            const payF = $('payFilter').value;
            const methodF = $('methodFilter').value;
            const sourceF = $('sourceFilter').value;
            const dateFrom = $('dateFrom').value ? new Date($('dateFrom').value) : null;
            const dateTo = $('dateTo').value ? new Date($('dateTo').value + 'T23:59:59') : null;

            filteredOrders = allOrders.filter(o => {
                const s = (o.order_status || 'placed').toLowerCase();
                const ps = (o.payment_status || 'pending').toLowerCase();
                const m = (o.payment_method || '').toLowerCase();
                const src = (o.source || 'online').toLowerCase();
                const created = o.created_at ? new Date(o.created_at) : null;

                // Tab
                let tabOk = true;
                if (activeTab === 'unfulfilled') tabOk = ['placed', 'confirmed', 'processing'].includes(s);
                else if (activeTab === 'payment_pending') tabOk = (ps === 'pending' && s !== 'cancelled');
                else if (activeTab === 'exchange') tabOk = s.includes('exchange');
                else if (activeTab !== 'all') tabOk = s === activeTab;

                // Search
                const matchQ = !q || [o.order_number, o.customer_name, o.customer_email, o.customer_phone, o.id + ''].some(v => (v || '').toLowerCase().includes(q));

                // Payment filter
                const matchPay = !payF || (payF === 'paid' ? (ps === 'paid' || ps === 'success') : (ps === payF));

                // Method
                const matchMethod = !methodF || m.includes(methodF);

                // Source
                const matchSource = !sourceF || src === sourceF;

                // Date
                const matchDate = (!dateFrom || !created || created >= dateFrom) && (!dateTo || !created || created <= dateTo);

                return tabOk && matchQ && matchPay && matchMethod && matchSource && matchDate;
            });

            currentPg = 1;
            renderTable();
        }

        function clearFilters() {
            $('searchInput').value = '';
            $('payFilter').value = '';
            $('methodFilter').value = '';
            $('sourceFilter').value = '';
            $('dateFrom').value = '';
            $('dateTo').value = '';
            setTab('all', document.querySelector('.tab-btn'));
        }

        // ── RENDER TABLE ──────────────────────────────────────────────────────────────
        function renderTable() {
            const tbody = $('ordersTbody'), pgInfo = $('pgInfo'), pgEl = $('pagination');
            const start = (currentPg - 1) * PAGE_SIZE;
            const page = filteredOrders.slice(start, start + PAGE_SIZE);

            if (!filteredOrders.length) {
                tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-bag-shopping"></i><p>No orders match your filters</p></div></td></tr>`;
                pgInfo.textContent = 'Showing 0 orders'; pgEl.innerHTML = ''; return;
            }

            pgInfo.innerHTML = `Showing <strong>${start + 1}–${Math.min(start + PAGE_SIZE, filteredOrders.length)}</strong> of <strong>${fmtNum(filteredOrders.length)}</strong> orders`;

            tbody.innerHTML = page.map(o => {
                const src = (o.source || 'online').toLowerCase();
                const srcBadge = src === 'pos' ? '<span class="source-badge source-pos">POS</span>' : '<span class="source-badge source-online">Online</span>';
                const razorLock = isRazorpayOrder(o) ? '<i class="fa-solid fa-lock" style="color:var(--purple);font-size:.65rem;margin-left:4px" title="Razorpay Verified"></i>' : '';
                return `<tr onclick="openOrderModal(${o.id})" title="View Order">
      <td>
        <div class="td-name" style="color:var(--blue)">${esc(o.order_number || '#' + o.id)}</div>
        ${razorLock ? `<div class="td-sub">${razorLock} Razorpay</div>` : ''}
      </td>
      <td>
        <div class="td-name">${fmtDate(o.created_at, true)}</div>
        <div class="td-sub">${o.created_at ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
      </td>
      <td>
        <div class="td-name"><span class="truncate" title="${esc(o.customer_name || 'Guest')}">${esc(o.customer_name || 'Guest')}</span></div>
        <div class="td-sub">${esc(o.customer_phone || o.customer_email || '')}</div>
      </td>
      <td>
        <div class="td-name">${fmtRs(o.total_amount || 0)}</div>
        ${o.discount_amount > 0 ? `<div class="td-sub" style="color:var(--teal)">-${fmtRs(o.discount_amount)}</div>` : ''}
      </td>
      <td>
        ${payBadge(o.payment_status, o.payment_method)}<br>
        <div class="td-sub" style="margin-top:3px">${methodBadge(o.payment_method)}</div>
      </td>
      <td>${srcBadge}</td>
      <td>${statusBadge(o.order_status)}</td>
      <td onclick="event.stopPropagation()">
        <button class="icon-btn" onclick="openOrderModal(${o.id})" title="View/Update"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="icon-btn" onclick="printOrderInvoice(${o.id})" title="Print Invoice" style="margin-left:3px"><i class="fa-solid fa-print"></i></button>
      </td>
    </tr>`;
            }).join('');

            renderPagination(filteredOrders.length);
        }

        function renderPagination(total) {
            const pages = Math.ceil(total / PAGE_SIZE), el = $('pagination');
            if (pages <= 1) { el.innerHTML = ''; return; }
            let html = `<button class="pg-btn" onclick="goPage(${currentPg - 1})" ${currentPg <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left" style="font-size:.7rem"></i></button>`;
            const start = Math.max(1, currentPg - 2), end = Math.min(pages, currentPg + 2);
            if (start > 1) { html += `<button class="pg-btn" onclick="goPage(1)">1</button>`; if (start > 2) html += `<span style="padding:0 4px;color:var(--muted)">…</span>`; }
            for (let i = start; i <= end; i++) html += `<button class="pg-btn ${i === currentPg ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
            if (end < pages) { if (end < pages - 1) html += `<span style="padding:0 4px;color:var(--muted)">…</span>`; html += `<button class="pg-btn" onclick="goPage(${pages})">${pages}</button>`; }
            html += `<button class="pg-btn" onclick="goPage(${currentPg + 1})" ${currentPg >= pages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right" style="font-size:.7rem"></i></button>`;
            el.innerHTML = html;
        }
        function goPage(p) { currentPg = p; renderTable(); window.scrollTo(0, 0); }

        // ── ORDER MODAL ───────────────────────────────────────────────────────────────
        function openOrderModal(id) {
            const o = allOrders.find(x => x.id === id);
            if (!o) return;
            currentOrderData = o;

            $('modalTitle').textContent = `Order: ${o.order_number || '#' + o.id}`;
            $('modalSubtitle').innerHTML = `${fmtDate(o.created_at)} &nbsp;·&nbsp; ${o.customer_name || 'Guest'} &nbsp;·&nbsp; ${fmtRs(o.total_amount || 0)}`;

            const isRazorpay = isRazorpayOrder(o);
            const razorpayLocked = isRazorpay;

            $('modalBody').innerHTML = buildModalBody(o, razorpayLocked);

            // Show/hide save button based on whether order is cancellable
            const isFinal = ['delivered', 'cancelled', 'exchange_approved', 'exchange_rejected'].includes((o.order_status || '').toLowerCase());
            $('btnSaveOrder').style.display = isFinal ? 'none' : '';

            $('orderModal').classList.add('show');
        }

        function buildModalBody(o, razorpayLocked) {
            const s = (o.order_status || 'placed').toLowerCase();
            const ps = (o.payment_status || 'pending').toLowerCase();
            const isPaid = ps === 'paid' || ps === 'success';

            // Build timeline
            const stages = buildTimeline(o);

            // Build items HTML
            const items = Array.isArray(o.items) || Array.isArray(o.order_items) ? (o.items || o.order_items) : [];

            let html = `
  <!-- TIMELINE + BASIC INFO -->
  <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:16px;margin-bottom:14px">
    <div class="detail-section">
      <div class="detail-section-title"><i class="fa-solid fa-route"></i> Order Timeline</div>
      <div class="timeline">${stages}</div>
    </div>
    <div>
      <!-- CUSTOMER INFO -->
      <div class="detail-section" style="margin-bottom:10px">
        <div class="detail-section-title"><i class="fa-solid fa-user"></i> Customer</div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-item-label">Name</div><div class="detail-item-val">${esc(o.customer_name || 'Guest')}</div></div>
          <div class="detail-item"><div class="detail-item-label">Phone</div><div class="detail-item-val">${esc(o.customer_phone || '—')}</div></div>
          <div class="detail-item" style="grid-column:1/-1"><div class="detail-item-label">Email</div><div class="detail-item-val">${esc(o.customer_email || '—')}</div></div>
        </div>
      </div>
      <!-- ADDRESS -->
      <div class="detail-section">
        <div class="detail-section-title"><i class="fa-solid fa-location-dot"></i> Shipping Address</div>
        <div style="font-size:.82rem;color:var(--text);line-height:1.6">
          ${esc(o.address_line1 || '')}${o.address_line2 ? ', ' + esc(o.address_line2) : ''}<br>
          ${[o.city, o.state, o.pincode].filter(Boolean).map(esc).join(', ')}<br>
          ${esc(o.country || 'India')}
        </div>
        ${o.delivery_method ? `<div style="margin-top:6px;font-size:.72rem;color:var(--muted)"><i class="fa-solid fa-truck"></i> ${esc(o.delivery_method)}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- PAYMENT INFO -->
  <div class="detail-section">
    <div class="detail-section-title"><i class="fa-solid fa-credit-card"></i> Payment Details ${razorpayLocked ? '<span class="razorpay-locked-notice"><i class="fa-solid fa-lock"></i> Razorpay Verified — Cannot Edit</span>' : ''}</div>
    <div class="detail-grid three">
      <div class="detail-item"><div class="detail-item-label">Method</div><div class="detail-item-val">${methodBadge(o.payment_method)}</div></div>
      <div class="detail-item"><div class="detail-item-label">Status</div><div class="detail-item-val">${payBadge(o.payment_status)}</div></div>
      <div class="detail-item"><div class="detail-item-label">Paid At</div><div class="detail-item-val">${fmtDate(o.paid_at, true)}</div></div>
      ${o.razorpay_order_id ? `<div class="detail-item"><div class="detail-item-label">Razorpay Order ID</div><div class="detail-item-val razorpay">${esc(o.razorpay_order_id)}</div></div>` : ''}
      ${o.razorpay_payment_id ? `<div class="detail-item"><div class="detail-item-label">Razorpay Payment ID</div><div class="detail-item-val razorpay">${esc(o.razorpay_payment_id)}</div></div>` : ''}
      ${o.razorpay_signature ? `<div class="detail-item"><div class="detail-item-label">Signature</div><div class="detail-item-val razorpay">${esc(o.razorpay_signature).substring(0, 20)}…</div></div>` : ''}
    </div>
  </div>

  <!-- ORDER ITEMS -->
  ${items.length ? `
  <div class="detail-section">
    <div class="detail-section-title"><i class="fa-solid fa-box"></i> Order Items (${items.length})</div>
    <table class="items-table">
      <thead><tr><th>Product</th><th>Size/Variant</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>
        ${items.map(it => `<tr>
          <td><div style="font-weight:600">${esc(it.product_name || it.name || 'Product')}</div>${it.sku ? `<div style="font-size:.7rem;color:var(--muted)">${esc(it.sku)}</div>` : ''}</td>
          <td>${esc(it.size || it.variant || '—')}</td>
          <td>${esc(it.quantity || 1)}</td>
          <td>${fmtRs(it.price || it.unit_price || 0)}</td>
          <td style="font-weight:700">${fmtRs((it.quantity || 1) * (it.price || it.unit_price || 0))}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`: ''}

  <!-- AMOUNTS -->
  <div class="detail-section">
    <div class="detail-section-title"><i class="fa-solid fa-indian-rupee-sign"></i> Amount Breakdown</div>
    <div class="amounts-grid">
      <div class="amount-row"><span>Subtotal</span><strong>${fmtRs(o.subtotal_amount || 0)}</strong></div>
      <div class="amount-row"><span>Shipping</span><strong>${fmtRs(o.shipping_amount || 0)}</strong></div>
      ${o.tax_amount ? `<div class="amount-row"><span>Tax (GST)</span><strong>${fmtRs(o.tax_amount)}</strong></div>` : ''}
      ${o.discount_amount > 0 ? `<div class="amount-row discount"><span>Discount ${o.coupon_code ? `<span class="badge badge-confirmed" style="margin-left:4px">${esc(o.coupon_code)}</span>` : ''}</span><strong>-${fmtRs(o.discount_amount)}</strong></div>` : ''}
      <div class="amount-row total" style="grid-column:1/-1"><span>Total</span><strong>${fmtRs(o.total_amount || 0)}</strong></div>
    </div>
  </div>

  <!-- UPDATE ORDER STATUS -->
  ${!['delivered', 'cancelled', 'exchange_approved', 'exchange_rejected'].includes(s) ? `
  <div class="divider-label"><i class="fa-solid fa-pen-to-square" style="color:var(--primary)"></i> Update Order</div>

  ${razorpayLocked ? `<div class="warning-box"><i class="fa-solid fa-lock" style="color:#6D28D9;margin-top:1px"></i><div>This order was paid via Razorpay. Payment status is <strong>locked and cannot be changed</strong> by admin to preserve payment integrity.</div></div>` : ''}

  <div class="form-row">
    <div class="form-field">
      <label class="form-label">Order Status</label>
      <select class="form-select" id="updateStatus">
        ${['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map(st =>
                `<option value="${st}" ${s === st ? 'selected' : ''}>${st.charAt(0).toUpperCase() + st.slice(1).replace(/_/g, ' ')}</option>`
            ).join('')}
      </select>
    </div>
    <div class="form-field">
      <label class="form-label">Payment Status ${razorpayLocked ? '<span class="razorpay-locked-notice"><i class="fa-solid fa-lock"></i> Locked</span>' : ''}</label>
      <input type="text" class="form-input ${razorpayLocked ? 'locked' : ''}" value="${esc(o.payment_status || 'pending')}" ${razorpayLocked ? 'readonly title="Cannot modify Razorpay payment status"' : ''} id="updatePayStatus">
    </div>
  </div>

  <div class="form-row">
    <div class="form-field">
      <label class="form-label">Tracking Number</label>
      <input type="text" class="form-input" id="updateTracking" value="${esc(o.tracking_number || '')}" placeholder="AWB / Tracking ID">
    </div>
    <div class="form-field">
      <label class="form-label">Tracking URL</label>
      <input type="text" class="form-input" id="updateTrackingUrl" value="${esc(o.tracking_url || '')}" placeholder="https://track.shiprocket.in/…">
    </div>
  </div>

  <div class="form-row single">
    <div class="form-field">
      <label class="form-label">Admin Note (internal)</label>
      <input type="text" class="form-input" id="updateNote" placeholder="e.g. called customer, package delayed…">
    </div>
  </div>
  ` : `<div class="detail-section" style="background:#F0FDF4;border-color:#BBF7D0"><div style="font-size:.82rem;color:#065F46;display:flex;align-items:center;gap:8px"><i class="fa-solid fa-circle-check"></i> This order is in <strong>${s}</strong> state — no further status updates possible.</div></div>`}

  <!-- EXCHANGE SECTION -->
  ${s === 'exchange_requested' ? `
  <div class="exchange-section">
    <div class="exchange-section-title"><i class="fa-solid fa-arrows-rotate"></i> Exchange Request</div>
    <div class="detail-grid" style="margin-bottom:12px">
      <div class="detail-item"><div class="detail-item-label">Requested Reason</div><div class="detail-item-val">${esc(o.exchange_reason || '—')}</div></div>
      <div class="detail-item"><div class="detail-item-label">Exchange For</div><div class="detail-item-val">${esc(o.exchange_product || '—')}</div></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm btn-teal" onclick="updateExchange(${o.id},'exchange_approved')"><i class="fa-solid fa-check"></i> Approve Exchange</button>
      <button class="btn btn-sm btn-danger" onclick="updateExchange(${o.id},'exchange_rejected')"><i class="fa-solid fa-xmark"></i> Reject Exchange</button>
    </div>
  </div>` : ''}
  `;

            return html;
        }

        function buildTimeline(o) {
            const s = (o.order_status || 'placed').toLowerCase();
            const stages = [
                { key: 'placed', icon: 'fa-bag-shopping', label: 'Order Placed', time: o.created_at, done: true },
                { key: 'confirmed', icon: 'fa-circle-check', label: 'Confirmed', time: o.confirmed_at || null, done: ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'].includes(s) },
                { key: 'shipped', icon: 'fa-truck', label: 'Shipped', time: o.shipped_at || null, done: ['shipped', 'out_for_delivery', 'delivered'].includes(s) },
                { key: 'out_for_delivery', icon: 'fa-motorcycle', label: 'Out for Delivery', time: null, done: ['out_for_delivery', 'delivered'].includes(s) },
                { key: 'delivered', icon: 'fa-house-circle-check', label: 'Delivered', time: o.delivered_at || null, done: s === 'delivered' },
            ];

            if (s === 'cancelled') return `<div class="tl-item"><div class="tl-dot error"><i class="fa-solid fa-ban"></i></div><div class="tl-content"><div class="tl-title">Order Cancelled</div><div class="tl-time">${fmtDate(o.cancelled_at, true)}</div></div></div>`;
            if (s.includes('exchange')) return `<div class="tl-item"><div class="tl-dot active"><i class="fa-solid fa-arrows-rotate"></i></div><div class="tl-content"><div class="tl-title">Exchange ${s.includes('approved') ? 'Approved' : s.includes('rejected') ? 'Rejected' : 'Requested'}</div></div></div>`;

            return stages.map((st, i) => {
                const isActive = st.key === s;
                const dotClass = st.done ? (isActive ? 'active' : 'done') : 'pending';
                return `<div class="tl-item">
      <div class="tl-dot ${dotClass}"><i class="fa-solid ${st.icon}"></i></div>
      <div class="tl-content">
        <div class="tl-title" style="${!st.done ? 'color:var(--muted)' : ''}">${st.label}</div>
        ${st.time ? `<div class="tl-time">${fmtDate(st.time)}</div>` : st.done ? '<div class="tl-time" style="color:var(--teal)">✓</div>' : ''}
      </div>
    </div>`;
            }).join('');
        }

        function closeModal() {
            $('orderModal').classList.remove('show');
            currentOrderData = null;
        }

        // Close modal on backdrop click
        $('orderModal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

        // ── SAVE ORDER UPDATE ─────────────────────────────────────────────────────────
        async function saveOrderUpdate() {
            if (!currentOrderData) return;
            const id = currentOrderData.id;
            const statusEl = $('updateStatus'), payEl = $('updatePayStatus'), trackEl = $('updateTracking'), trackUrlEl = $('updateTrackingUrl');
            if (!statusEl) return;

            const isRazorpay = isRazorpayOrder(currentOrderData);
            const btn = $('btnSaveOrder');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

            try {
                const payload = {
                    status: statusEl.value,
                    tracking_number: trackEl.value.trim() || null,
                    tracking_url: trackUrlEl.value.trim() || null,
                };
                // ONLY include payment_status if NOT a razorpay order
                if (!isRazorpay) {
                    payload.payment_status = payEl.value;
                }

                await apiFetch(`/api/admin/orders/${id}/status`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });

                // Update local state
                const idx = allOrders.findIndex(x => x.id === id);
                if (idx > -1) {
                    allOrders[idx].order_status = payload.status;
                    allOrders[idx].tracking_number = payload.tracking_number;
                    allOrders[idx].tracking_url = payload.tracking_url;
                    if (!isRazorpay) allOrders[idx].payment_status = payload.payment_status;
                }

                toast('Order updated successfully', 'success');
                closeModal();
                updateKPIs();
                updateTabCounts();
                applyFilters();
            } catch (e) {
                toast('Update failed: ' + (e.message || 'Server error'), 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
            }
        }

        // ── EXCHANGE ──────────────────────────────────────────────────────────────────
        async function updateExchange(id, newStatus) {
            try {
                await apiFetch(`/api/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
                const idx = allOrders.findIndex(x => x.id === id);
                if (idx > -1) allOrders[idx].order_status = newStatus;
                toast(`Exchange ${newStatus === 'exchange_approved' ? 'approved' : 'rejected'} successfully`, 'success');
                closeModal();
                updateKPIs(); updateTabCounts(); applyFilters();
            } catch (e) {
                toast('Failed: ' + e.message, 'error');
            }
        }

        // ── PRINT INVOICE ─────────────────────────────────────────────────────────────
        function openOrderModal_then_print(id) { openOrderModal(id); setTimeout(printInvoice, 300); }
        function printOrderInvoice(id) {
            const o = allOrders.find(x => x.id === id);
            if (!o) return;
            currentOrderData = o;
            printInvoice();
        }

        function printInvoice() {
            const o = currentOrderData;
            if (!o) { toast('No order selected', 'info'); return; }
            const items = o.items || o.order_items || [];

            const win = window.open('', '_blank', 'width=800,height=700');
            win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>Invoice — ${esc(o.order_number || '#' + o.id)}</title>
    
  </head><body>
    <div class="inv-header">
      <div>
        <div class="brand">HeelsUp<small>Ladies Footwear & Bags · Jodhpur, Rajasthan</small></div>
        <div style="font-size:.75rem;color:#64748B;margin-top:8px">GSTIN: 08XXXXX0000X1Z5</div>
      </div>
      <div class="inv-meta">
        <h2>TAX INVOICE</h2>
        <p><strong>${esc(o.order_number || '#' + o.id)}</strong></p>
        <p>Date: ${fmtDate(o.created_at, true)}</p>
        <p style="margin-top:6px"><span class="status-chip status-${(o.order_status || 'placed').toLowerCase()}">${(o.order_status || 'Placed').toUpperCase()}</span></p>
      </div>
    </div>

    <div class="inv-body">
      <div class="inv-section">
        <h3>Bill To</h3>
        <p><strong>${esc(o.customer_name || 'Customer')}</strong><br>
        ${esc(o.customer_email || '')}<br>
        ${esc(o.customer_phone || '')}</p>
      </div>
      <div class="inv-section">
        <h3>Ship To</h3>
        <p>${esc(o.address_line1 || '')}${o.address_line2 ? ', ' + esc(o.address_line2) : ''}<br>
        ${[o.city, o.state, o.pincode].filter(Boolean).map(esc).join(', ')}<br>
        ${esc(o.country || 'India')}</p>
      </div>
      <div class="inv-section">
        <h3>Payment</h3>
        <p>Method: ${esc((o.payment_method || 'online').toUpperCase())}<br>
        Status: <strong>${esc((o.payment_status || 'pending').toUpperCase())}</strong><br>
        ${o.paid_at ? 'Paid: ' + fmtDate(o.paid_at, true) : ''}</p>
        ${o.razorpay_payment_id ? `<div class="razorpay-id">RZP: ${esc(o.razorpay_payment_id)}</div>` : ''}
      </div>
      <div class="inv-section">
        <h3>Delivery</h3>
        <p>Method: ${esc(o.delivery_method || 'Standard')}<br>
        ${o.tracking_number ? 'Tracking: ' + esc(o.tracking_number) : ''}</p>
      </div>
    </div>

    <table>
      <thead><tr><th>#</th><th>Product</th><th>Size</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
        ${items.length ? items.map((it, i) => `<tr>
          <td>${i + 1}</td>
          <td>${esc(it.product_name || it.name || 'Product')}${it.sku ? `<br><small style="color:#94A3B8">${esc(it.sku)}</small>` : ''}</td>
          <td>${esc(it.size || it.variant || '—')}</td>
          <td>${it.quantity || 1}</td>
          <td>₹${Number(it.price || it.unit_price || 0).toLocaleString('en-IN')}</td>
          <td><strong>₹${((it.quantity || 1) * (it.price || it.unit_price || 0)).toLocaleString('en-IN')}</strong></td>
        </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:20px">No item details available</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>₹${Number(o.subtotal_amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Shipping</span><span>₹${Number(o.shipping_amount || 0).toLocaleString('en-IN')}</span></div>
      ${o.tax_amount ? `<div class="total-row"><span>GST</span><span>₹${Number(o.tax_amount).toLocaleString('en-IN')}</span></div>` : ''}
      ${o.discount_amount > 0 ? `<div class="total-row" style="color:#34B1AA"><span>Discount ${o.coupon_code ? '(' + esc(o.coupon_code) + ')' : ''}</span><span>-₹${Number(o.discount_amount).toLocaleString('en-IN')}</span></div>` : ''}
      <div class="total-row grand"><span>TOTAL</span><span>₹${Number(o.total_amount || 0).toLocaleString('en-IN')}</span></div>
    </div>

    <div class="footer">
      Thank you for shopping with HeelsUp · heelsup.in · Jodhpur, Rajasthan, India<br>
      For queries: support@heelsup.in | This is a computer-generated invoice.
    </div>
    <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
            win.document.close();
        }

        // ── EXPORT CSV ────────────────────────────────────────────────────────────────
        function exportCSV() {
            if (!filteredOrders.length) { toast('No orders to export', 'info'); return; }
            const headers = ['Order#', 'Date', 'Customer', 'Email', 'Phone', 'City', 'State', 'Pincode', 'Subtotal', 'Shipping', 'Discount', 'Tax', 'Total', 'Payment Method', 'Payment Status', 'Order Status', 'Razorpay Order ID', 'Razorpay Payment ID', 'Tracking#', 'Source', 'Coupon'];
            const rows = filteredOrders.map(o => [
                o.order_number || o.id, fmtDate(o.created_at, true), o.customer_name || '', o.customer_email || '', o.customer_phone || '',
                o.city || '', o.state || '', o.pincode || '',
                o.subtotal_amount || 0, o.shipping_amount || 0, o.discount_amount || 0, o.tax_amount || 0, o.total_amount || 0,
                o.payment_method || '', o.payment_status || '', o.order_status || '',
                o.razorpay_order_id || '', o.razorpay_payment_id || '', o.tracking_number || '',
                o.source || 'online', o.coupon_code || ''
            ].map(v => `"${String(v).replace(/"/g, '""')}"`));

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `heelsup-orders-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            toast(`Exported ${filteredOrders.length} orders`, 'success');
        }

        // ── INIT ──────────────────────────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            const orderId = params.get('id');
            const tabParam = params.get('tab');
            loadOrders().then(() => {
                if (tabParam) {
                    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${tabParam}'`));
                    if (btn) setTab(tabParam, btn);
                }
                if (orderId) openOrderModal(parseInt(orderId));
            });
        });