// ── AUTH ─────────────────────────────────────────────────────────────────
        (function () {
            let user = null;
            try { user = (typeof HeelsUpAuth !== 'undefined') ? HeelsUpAuth.getUser() : null; } catch (e) { }
            if (!user || user.role !== 'admin') {
                // Show auth error
                const el = document.createElement('div');
                el.className = 'auth-error';
                el.innerHTML = `
      <i class="fa-solid fa-shield-exclamation auth-error-icon"></i>
      <h2>Access Denied</h2>
      <p>You must be logged in as an admin to view this page.</p>
      <a href="login.html?redirect=admin-analytics.html" class="btn btn-primary" style="margin-top:8px">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> Login
      </a>`;
                document.body.appendChild(el);
                return;
            }
            const name = user.firstName || user.first_name || 'Admin';
            document.getElementById('sAvatar').textContent = name.charAt(0).toUpperCase();
            document.getElementById('sName').textContent = name;
        })();

        // ── STATE ─────────────────────────────────────────────────────────────────
        let period = 30, customStart = null, customEnd = null, dashData = null;
        const cache = {};

        // ── HELPERS ───────────────────────────────────────────────────────────────
        const $ = id => document.getElementById(id);
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const fmtRs = v => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
        const fmtNum = v => (Number(v) || 0).toLocaleString('en-IN');
        const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));

        function statusBadge(s) {
            const m = {
                placed: ['#DBEAFE', '#1D4ED8'],
                confirmed: ['#DCFCE7', '#15803D'],
                shipped: ['#F3E8FF', '#7E22CE'],
                delivered: ['#D1FAE5', '#065F46'],
                cancelled: ['#FEE2E2', '#B91C1C'],
                returned: ['#FEF3C7', '#92400E'],
                payment_pending: ['#FEF3C7', '#B45309'],
            };
            const [bg, cl] = (m[s] || ['#F1F5F9', '#64748B']);
            return `<span class="badge" style="background:${bg};color:${cl}">${esc(s || 'placed')}</span>`;
        }
        function payBadge(s) {
            return s === 'paid'
                ? '<span class="badge" style="background:#D1FAE5;color:#065F46">Paid</span>'
                : `<span class="badge" style="background:#FEF3C7;color:#B45309">${esc(s || 'pending')}</span>`;
        }

        // ── SIDEBAR ───────────────────────────────────────────────────────────────
        function toggleSidebar() {
            const s = $('sidebar'), o = $('mobOverlay');
            s.classList.toggle('open');
            o.style.display = s.classList.contains('open') ? 'block' : 'none';
        }
        function closeSidebar() { $('sidebar').classList.remove('open'); $('mobOverlay').style.display = 'none'; }
        function doLogout() {
            try { HeelsUpAuth.clearSession(); } catch (e) { }
            window.location = 'login.html';
        }

        // ── TOAST ─────────────────────────────────────────────────────────────────
        function toast(msg, type = 'success') {
            const wrap = $('toastWrap'), t = document.createElement('div');
            t.className = `toast ${type}`;
            const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';
            t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
            wrap.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 4500);
        }

        // ── PERIOD ────────────────────────────────────────────────────────────────
        function setPeriod(days, btn) {
            period = days; customStart = null; customEnd = null;
            document.querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $('heroPeriod').textContent = `Last ${days} days · updated just now`;
            loadAll();
        }
        function applyCustom() {
            const s = $('customStart').value, e = $('customEnd').value;
            if (!s || !e) { toast('Please select both start and end dates', 'error'); return; }
            if (new Date(s) > new Date(e)) { toast('Start date must be before end date', 'error'); return; }
            customStart = s; customEnd = e; period = 'custom';
            document.querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
            $('heroPeriod').textContent = `${s} → ${e} · updated just now`;
            loadAll();
        }

        // ── API ───────────────────────────────────────────────────────────────────
        async function apiFetch(url) {
            const cacheKey = url;
            // Cache for 30s
            if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < 30000) return cache[cacheKey].data;
            let apiFunc;
            try { apiFunc = HeelsUpAuth.api; } catch (e) { apiFunc = null; }
            if (!apiFunc) throw new Error('Not authenticated');
            const data = await apiFunc(url);
            cache[cacheKey] = { data, ts: Date.now() };
            return data;
        }

        // ── MAIN LOAD ─────────────────────────────────────────────────────────────
        async function loadAll() {
            const btn = $('refreshBtn');
            if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading'; btn.disabled = true; }

            try {
                let url = `/api/admin/analytics/dashboard?period=${period}`;
                if (period === 'custom' && customStart && customEnd) url += `&start=${customStart}&end=${customEnd}`;

                // Parallel fetch — fast
                const t0 = performance.now();
                const [dash, ordersRes] = await Promise.all([
                    apiFetch(url),
                    apiFetch('/api/admin/orders')
                ]);
                const ms = (performance.now() - t0).toFixed(1);

                dashData = dash;
                const s = dash.summary || {};

                // KPIs
                renderKPIs(s);
                // Order status tiles
                renderStatusTiles(dash.order_status_counts || {});
                // Charts
                renderRevenueChart(dash.daily_revenue || []);
                renderStatusDonut(dash.order_status_counts || {});
                renderTopProducts(dash.top_products || []);
                renderCategoryChart(dash.category_sales || []);
                renderFunnel(dash.funnel || {});
                renderPaymentMethods(dash.payment_methods || {});
                renderKeyMetrics(s);
                renderRecentOrders((ordersRes.orders || []).slice(0, 10));

                toast(`Data loaded in ${ms}ms ✓`, 'success');
                $('heroPeriod').textContent = ($('heroPeriod').textContent || '').replace(/·.*/, `· ${ms}ms load`);

            } catch (e) {
                toast('Failed to load analytics: ' + (e.message || 'Network error'), 'error');
                showEmptyAll();
            } finally {
                if (btn) { btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh'; btn.disabled = false; }
            }
        }

        function showEmptyAll() {
            ['revenueChartWrap', 'statusDonut', 'topProductsWrap', 'categoryWrap', 'funnelWrap', 'paymentWrap'].forEach(id => {
                const el = $(id);
                if (el) el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);opacity:1"></i><p style="color:var(--danger)">Failed to load data. Check your connection.</p></div>`;
            });
            ['kpiRev', 'kpiOrders', 'kpiCust', 'kpiAOV'].forEach(id => {
                const el = $(id); if (el) el.innerHTML = '<span style="font-size:1rem;color:var(--danger)">Error</span>';
            });
            // Fix recent orders table on error
            const tbody = $('recentOrdersTbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px">
    <div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px">
      <i class="fa-solid fa-circle-exclamation" style="font-size:1.6rem;color:var(--danger)"></i>
      <span style="color:var(--danger);font-size:.84rem;font-weight:600">Failed to load orders</span>
      <button class="btn btn-sm btn-outline" onclick="loadAll()" style="margin-top:4px"><i class="fa-solid fa-arrows-rotate"></i> Retry</button>
    </div>
  </td></tr>`;
            // Fix key metrics
            const km = $('keyMetricsWrap');
            if (km) km.innerHTML = `<div style="grid-column:1/-1" class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);opacity:1"></i><p style="color:var(--danger)">Failed to load metrics</p></div>`;
            // Fix status tiles
            ['os-placed', 'os-confirmed', 'os-shipped', 'os-delivered', 'os-cancelled', 'os-returned', 'os-pending'].forEach(id => {
                const el = $(id); if (el) { el.textContent = '—'; el.style.color = 'var(--danger)'; }
            });
            // Fix status tiles (order status tiles row)
            const stiles = $('statusTiles');
            if (stiles) stiles.innerHTML = '';
        }

        // ── KPIs ──────────────────────────────────────────────────────────────────
        function renderKPIs(s) {
            const aov = s.total_orders ? (s.total_revenue / s.total_orders) : 0;
            $('kpiRev').textContent = fmtRs(s.total_revenue || 0);
            $('kpiOrders').textContent = fmtNum(s.total_orders || 0);
            $('kpiCust').textContent = fmtNum(s.total_customers || 0);
            $('kpiAOV').textContent = fmtRs(aov);
            $('kpiRevSub').innerHTML = `<span class="tag-up"><i class="fa-solid fa-circle-check"></i> ${s.delivered_orders || 0} delivered</span>`;
            $('kpiOrdSub').innerHTML = `<span style="color:var(--warning)"><i class="fa-solid fa-clock"></i> ${s.pending_orders || 0} pending</span>`;
            $('kpiCustSub').innerHTML = `<span class="tag-up"><i class="fa-solid fa-user-plus"></i> ${s.new_customers || 0} new</span>`;
            $('kpiAOVSub').innerHTML = `<span style="color:var(--muted)">Across ${fmtNum(s.total_orders || 0)} orders</span>`;
        }

        // ── ORDER STATUS TILES ─────────────────────────────────────────────────────
        function renderStatusTiles(counts) {
            const keys = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'payment_pending'];
            keys.forEach(k => {
                const el = $(k === 'payment_pending' ? 'os-pending' : `os-${k}`);
                if (el) el.textContent = fmtNum(counts[k] || 0);
            });
        }

        // ── REVENUE CHART (SVG) ────────────────────────────────────────────────────
        function renderRevenueChart(data) {
            const wrap = $('revenueChartWrap');
            const labelsEl = $('revenueChartLabels');
            if (!data.length) { wrap.innerHTML = '<div class="empty-state"><i class="fa-solid fa-chart-line"></i><p>No revenue data for this period</p></div>'; return; }

            const W = 600, H = 170, PT = 16, PR = 16, PB = 10, PL = 16;
            const revenues = data.map(d => d.revenue || 0);
            const orders = data.map(d => d.orders || 0);
            const maxRev = Math.max(...revenues, 1);
            const maxOrd = Math.max(...orders, 1);

            const xP = i => PL + (i / (data.length - 1 || 1)) * (W - PL - PR);
            const yRevP = v => PT + (1 - (v / maxRev)) * (H - PT - PB);
            const yOrdP = v => PT + (1 - (v / maxOrd)) * (H - PT - PB) * 0.6 + H * 0.2; // secondary axis scaled

            const revPts = data.map((d, i) => `${xP(i)},${yRevP(d.revenue || 0)}`).join(' ');
            const ordPts = data.map((d, i) => `${xP(i)},${yOrdP(d.orders || 0)}`).join(' ');
            const revArea = `${PL},${H - PB} ${revPts} ${W - PR},${H - PB}`;

            // Labels
            const step = Math.max(1, Math.ceil(data.length / 7));
            labelsEl.innerHTML = data.filter((_, i) => i % step === 0 || i === data.length - 1)
                .map(d => `<span>${new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>`).join('');

            // Grid Y lines
            const gridLines = [0.25, 0.5, 0.75].map(f => {
                const y = PT + (1 - f) * (H - PT - PB);
                const val = maxRev * f;
                const lbl = val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}K` : `₹${val.toFixed(0)}`;
                return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#E4E8F0" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="${PL - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="#94A3B8">${lbl}</text>`;
            }).join('');

            wrap.innerHTML = `
  <svg id="revenueChartSvg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;overflow:visible;cursor:crosshair" onmousemove="chartHover(event,this)" onmouseleave="$('chartTooltip').style.display='none'">
    <defs>
      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#F29F67" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#F29F67" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${gridLines}
    <polygon points="${revArea}" fill="url(#revGrad)"/>
    <polyline points="${revPts}" fill="none" stroke="#F29F67" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${ordPts}" fill="none" stroke="#3B8FF3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 3" opacity="0.7"/>
    ${data.map((d, i) => `<circle cx="${xP(i)}" cy="${yRevP(d.revenue || 0)}" r="3.5" fill="#fff" stroke="#F29F67" stroke-width="2" data-rev="${d.revenue || 0}" data-ord="${d.orders || 0}" data-date="${d.date || ''}"/>`).join('')}
  </svg>`;
        }

        function chartHover(e, svg) {
            const rect = svg.getBoundingClientRect();
            const tip = $('chartTooltip');
            const circles = svg.querySelectorAll('circle');
            let closest = null, minDist = 999;
            circles.forEach(c => {
                const cx = parseFloat(c.getAttribute('cx'));
                const scaleX = (rect.width / 600);
                const px = cx * scaleX + rect.left;
                const dist = Math.abs(e.clientX - px);
                if (dist < minDist) { minDist = dist; closest = c; }
            });
            if (closest && minDist < 30) {
                tip.innerHTML = `<strong>${closest.dataset.date ? new Date(closest.dataset.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</strong><br>Revenue: ${fmtRs(closest.dataset.rev)}<br>Orders: ${fmtNum(closest.dataset.ord)}`;
                tip.style.display = 'block';
                tip.style.left = (e.clientX - rect.left + 10) + 'px';
                tip.style.top = (e.clientY - rect.top - 50) + 'px';
            } else { tip.style.display = 'none'; }
        }

        // ── STATUS DONUT ───────────────────────────────────────────────────────────
        function renderStatusDonut(counts) {
            const el = $('statusDonut'), tilesEl = $('statusTiles');
            const statuses = [
                { k: 'delivered', l: 'Delivered', c: '#34B1AA' },
                { k: 'shipped', l: 'Shipped', c: '#7C3AED' },
                { k: 'confirmed', l: 'Confirmed', c: '#3B8FF3' },
                { k: 'placed', l: 'Placed', c: '#F29F67' },
                { k: 'cancelled', l: 'Cancelled', c: '#EF4444' },
            ];
            const total = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0) || 1;
            let offset = 0;
            const segs = statuses.map(s => {
                const val = Number(counts[s.k] || 0);
                const pct = val / total;
                const seg = { ...s, val, pct, offset };
                offset += pct * 100;
                return seg;
            });
            const r = 15.9, circ = 2 * Math.PI * r;
            const svgSegs = segs.map(s => {
                const dash = s.pct * circ, gap = circ - dash;
                const rot = -90 + (s.offset / 100) * 360;
                return `<circle cx="18" cy="18" r="${r}" fill="none" stroke="${s.c}" stroke-width="4" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" transform="rotate(${rot} 18 18)"/>`;
            }).join('');

            el.innerHTML = `<div class="donut-flex">
    <div style="position:relative;width:120px;height:120px;flex-shrink:0">
      <svg viewBox="0 0 36 36" style="width:120px;height:120px" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="4"/>
        ${svgSegs}
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:1.3rem;font-weight:800;color:var(--text)">${fmtNum(total)}</div>
        <div style="font-size:.62rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Orders</div>
      </div>
    </div>
    <div class="donut-legend">
      ${segs.map(s => `<div class="donut-row"><div class="donut-dot" style="background:${s.c}"></div><div style="flex:1;font-size:.8rem">${s.l}</div><strong style="color:var(--text)">${fmtNum(s.val)}</strong><span style="color:var(--muted);font-size:.72rem;width:34px;text-align:right">${(s.pct * 100).toFixed(0)}%</span></div>`).join('')}
    </div>
  </div>`;

            tilesEl.innerHTML = segs.slice(0, 4).map(s => `<div class="m-tile"><div class="m-tile-val" style="color:${s.c}">${fmtNum(s.val)}</div><div class="m-tile-lbl">${s.l}</div></div>`).join('');
        }

        // ── TOP PRODUCTS ───────────────────────────────────────────────────────────
        function renderTopProducts(products) {
            const el = $('topProductsWrap');
            if (!products.length) { el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>No product data</p></div>'; return; }
            const maxRev = Math.max(...products.map(p => p.revenue || 0), 1);
            el.innerHTML = products.slice(0, 7).map((p, i) => `
    <div class="prod-row">
      <div class="rank ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n'}">${i + 1}</div>
      ${p.image_url ? `<img src="${esc(p.image_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'">` : ''}
      <div class="prod-bar-wrap" style="flex:1;min-width:0">
        <div class="prod-name">${esc(p.name || '—')}</div>
        <div class="prod-bar-bg"><div class="prod-bar-fill" style="width:${((p.revenue || 0) / maxRev * 100).toFixed(0)}%"></div></div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="prod-rev">${fmtRs(p.revenue || 0)}</div>
        <div class="prod-qty">${fmtNum(p.quantity || 0)} sold</div>
      </div>
    </div>`).join('');
        }

        // ── CATEGORY CHART ─────────────────────────────────────────────────────────
        function renderCategoryChart(data) {
            const el = $('categoryWrap');
            if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-layer-group"></i><p>No category data</p></div>'; return; }
            const colors = ['#F29F67', '#3B8FF3', '#34B1AA', '#E0B50F', '#7C3AED', '#EF4444', '#64748B'];
            const maxRev = Math.max(...data.map(d => d.revenue || 0), 1);
            el.innerHTML = data.map((d, i) => `
    <div class="hbar-row">
      <div class="hbar-label">${esc(d.category || 'Other')}</div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${((d.revenue || 0) / maxRev * 100).toFixed(0)}%;background:${colors[i % colors.length]}">
          ${((d.revenue || 0) / maxRev * 100) > 15 ? fmtRs(d.revenue || 0) : ''}
        </div>
      </div>
      <div class="hbar-val">${((d.revenue || 0) / maxRev * 100) <= 15 ? fmtRs(d.revenue || 0) : ''}</div>
    </div>`).join('');
        }

        // ── FUNNEL ─────────────────────────────────────────────────────────────────
        function renderFunnel(f) {
            const el = $('funnelWrap');
            const steps = [
                { l: 'Store Visits', k: 'visits', c: 'linear-gradient(90deg,#3B8FF3,#60A5FA)' },
                { l: 'Product Views', k: 'product_views', c: 'linear-gradient(90deg,#7C3AED,#A78BFA)' },
                { l: 'Add to Cart', k: 'add_to_cart', c: 'linear-gradient(90deg,#F29F67,#d4784a)' },
                { l: 'Checkout', k: 'checkout', c: 'linear-gradient(90deg,#E0B50F,#F59E0B)' },
                { l: 'Purchased', k: 'orders', c: 'linear-gradient(90deg,#34B1AA,#4ADE80)' },
            ];
            const hasData = steps.some(s => f[s.k]);
            if (!hasData) { el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-filter"></i><p>Funnel tracking not available.<br>Enable event tracking in your storefront.</p></div>'; return; }
            const base = Number(f[steps[0].k] || 1);
            el.innerHTML = steps.map(s => {
                const val = Number(f[s.k] || 0);
                const pct = base ? (val / base * 100).toFixed(0) : 0;
                return `<div class="funnel-row">
      <div class="funnel-label">${s.l}</div>
      <div class="funnel-track">
        <div class="funnel-fill" style="width:${pct}%;background:${s.c}">${pct > 10 ? fmtNum(val) : ''}</div>
      </div>
      <div class="funnel-pct" style="color:var(--text)">${pct}%</div>
    </div>`;
            }).join('') +
                `<div class="conv-highlight">
    <div style="font-size:.78rem;color:var(--muted)">Conversion Rate</div>
    <div class="conv-rate">${base ? ((Number(f.orders || 0) / base) * 100).toFixed(2) : 0}%</div>
  </div>`;
        }

        // ── PAYMENT METHODS ────────────────────────────────────────────────────────
        function renderPaymentMethods(data) {
            const el = $('paymentWrap');
            const methods = [
                { k: 'cod', l: 'Cash on Delivery', icon: 'fa-money-bill-wave', c: '#34B1AA' },
                { k: 'razorpay', l: 'Razorpay / UPI', icon: 'fa-credit-card', c: '#3B8FF3' },
                { k: 'card', l: 'Card', icon: 'fa-credit-card', c: '#7C3AED' },
                { k: 'upi', l: 'UPI Direct', icon: 'fa-mobile-screen', c: '#F29F67' },
            ];
            const total = Object.values(data).reduce((a, b) => a + Number(b || 0), 0) || 1;
            el.innerHTML = methods.map(m => {
                const val = Number(data[m.k] || 0);
                const pct = (val / total * 100).toFixed(0);
                return `<div class="pay-row">
      <div class="pay-top">
        <div class="pay-name"><i class="fa-solid ${m.icon}" style="color:${m.c};width:14px"></i> ${m.l}</div>
        <div class="pay-val">${fmtNum(val)} <span class="pay-pct">(${pct}%)</span></div>
      </div>
      <div class="pay-track"><div class="pay-fill" style="width:${pct}%;background:${m.c}"></div></div>
    </div>`;
            }).join('');
        }

        // ── KEY METRICS ────────────────────────────────────────────────────────────
        function renderKeyMetrics(s) {
            const el = $('keyMetricsWrap');
            const aov = s.total_orders ? (s.total_revenue / s.total_orders) : 0;
            const cancRate = s.total_orders ? ((s.cancelled_orders || 0) / s.total_orders * 100) : 0;
            const retRate = s.total_orders ? ((s.returned_orders || 0) / s.total_orders * 100) : 0;
            const delRate = s.total_orders ? ((s.delivered_orders || 0) / s.total_orders * 100) : 0;
            const tiles = [
                { v: fmtRs(aov), l: 'Avg Order Value' },
                { v: fmtNum(s.pending_orders || 0), l: 'Pending Orders' },
                { v: cancRate.toFixed(1) + '%', l: 'Cancellation Rate' },
                { v: retRate.toFixed(1) + '%', l: 'Return Rate' },
                { v: delRate.toFixed(1) + '%', l: 'Delivery Rate' },
                { v: fmtNum(s.new_customers || 0), l: 'New Customers' },
            ];
            el.innerHTML = tiles.map(t => `<div class="m-tile"><div class="m-tile-val">${t.v}</div><div class="m-tile-lbl">${t.l}</div></div>`).join('');
        }

        // ── RECENT ORDERS ──────────────────────────────────────────────────────────
        function renderRecentOrders(orders) {
            const tbody = $('recentOrdersTbody');
            if (!orders.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">No orders found</td></tr>'; return; }
            tbody.innerHTML = orders.map(o => `<tr>
    <td><div class="td-name">${esc(o.order_number || '—')}</div></td>
    <td><div class="td-name">${esc(o.customer_name || '—')}</div><div class="td-sub">${esc(o.customer_email || '')}</div></td>
    <td style="font-size:.8rem;color:var(--muted)">${fmtDate(o.created_at)}</td>
    <td><strong>${fmtRs(o.total_amount || 0)}</strong></td>
    <td>${payBadge(o.payment_status)}</td>
    <td>${statusBadge(o.order_status)}</td>
    <td><a href="admin-orders.html?id=${esc(o.id || o.order_id || '')}" class="btn btn-sm btn-outline" style="padding:4px 10px;font-size:.72rem"><i class="fa-solid fa-eye"></i></a></td>
  </tr>`).join('');
        }

        // ── EXPORT CSV ─────────────────────────────────────────────────────────────
        function exportCSV() {
            if (!dashData) { toast('No data to export', 'info'); return; }
            const s = dashData.summary || {};
            const rows = [
                ['Metric', 'Value'],
                ['Total Revenue', s.total_revenue || 0],
                ['Total Orders', s.total_orders || 0],
                ['Total Customers', s.total_customers || 0],
                ['Delivered Orders', s.delivered_orders || 0],
                ['Cancelled Orders', s.cancelled_orders || 0],
                ['Returned Orders', s.returned_orders || 0],
                ['Pending Orders', s.pending_orders || 0],
                ['New Customers', s.new_customers || 0],
                ['Avg Order Value', s.total_orders ? (s.total_revenue / s.total_orders).toFixed(2) : 0],
            ];
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `heelsup-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            toast('CSV exported successfully', 'success');
        }

        // ── INIT ───────────────────────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', () => {
            // Set today as default end date, 30 days ago as start
            const today = new Date();
            const ago = new Date(today); ago.setDate(today.getDate() - 30);
            $('customEnd').value = today.toISOString().slice(0, 10);
            $('customStart').value = ago.toISOString().slice(0, 10);
            loadAll();
        });