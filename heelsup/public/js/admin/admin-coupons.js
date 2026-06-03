// â”€â”€ AUTH & SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let user = null;
        try {
            user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') { window.location = 'login.html?redirect=admin-coupons.html'; }
        } catch (e) {
            user = { firstName: 'Admin', role: 'admin' };
        }

        const uname = (user?.firstName || user?.first_name || 'Admin');
        document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
        document.getElementById('s-name').textContent = uname;

        // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let allCoupons = [];
        let filteredCoupons = [];
        let editingCouponId = null;
        const PAGE = 10;
        let currentPg = 1;

        // â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function toggleSidebar() {
            const s = document.getElementById('sidebar');
            const o = document.getElementById('mobOverlay');
            s.classList.toggle('open');
            o.style.display = s.classList.contains('open') ? 'block' : 'none';
        }
        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('mobOverlay').style.display = 'none';
        }
        function doLogout() {
            try { HeelsUpAuth.clearSession(); } catch (e) { }
            window.location = 'login.html';
        }

        // â”€â”€ TOAST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function showToast(msg, type = 'success') {
            const c = document.getElementById('toastWrap');
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            const icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
            t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
            c.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0';
                t.style.transition = 'opacity .3s';
                setTimeout(() => t.remove(), 300);
            }, 4000);
        }

        function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

        function fmtDate(d) {
            if (!d) return 'â€”';
            return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        function copyCode(code) {
            navigator.clipboard.writeText(code).then(() => {
                showToast(`Code ${code} copied!`);
            });
        }

        // â”€â”€ DATA FETCHING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function loadCoupons() {
            document.getElementById('couponsTableBody').innerHTML = '<tr><td colspan="7"><div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Loading coupons...</div></td></tr>';
            try {
                const response = await HeelsUpAuth.api('/api/admin/coupons');
                allCoupons = response.coupons || response || [];
                updateStats();
                filterCoupons();
            } catch (e) {
                console.error('API Error:', e);
                showToast(e.message || 'Failed to load coupons', 'error');
                document.getElementById('couponsTableBody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444">Failed to load data. Please check your API connection.</td></tr>';
                allCoupons = [];
                updateStats();
            }
        }

        // â”€â”€ STATS CALCULATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function updateStats() {
            const now = new Date();
            let activeCount = 0;
            let totalUses = 0;
            let expiringCount = 0;

            allCoupons.forEach(c => {
                const isActive = c.active !== false && c.active !== 0;

                // Calculate Expiry
                let isExpired = false;
                let daysToExpiry = null;
                if (c.expires_at) {
                    const expDate = new Date(c.expires_at);
                    if (expDate < now) isExpired = true;
                    daysToExpiry = (expDate - now) / (1000 * 60 * 60 * 24);
                }

                if (isActive && !isExpired) {
                    activeCount++;
                    if (daysToExpiry !== null && daysToExpiry <= 7) {
                        expiringCount++;
                    }
                }

                totalUses += (c.used_count || 0);
            });

            document.getElementById('statActive').textContent = activeCount;
            document.getElementById('statUses').textContent = totalUses.toLocaleString('en-IN');
            document.getElementById('statTotal').textContent = allCoupons.length; // Or compute discount amount if backend provides it
            document.getElementById('statExpiring').textContent = expiringCount;
        }

        // â”€â”€ FILTERING & RENDERING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function filterCoupons() {
            const q = document.getElementById('couponSearch').value.toLowerCase();
            const typeFilter = document.getElementById('typeFilter').value;
            const statusFilter = document.getElementById('statusFilter').value;

            filteredCoupons = allCoupons.filter(c => {
                const mq = !q || c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);

                const cType = (c.type || 'percent').toLowerCase();
                const mType = typeFilter === '' || cType === typeFilter;

                let isActive = c.active !== false && c.active !== 0;
                const mStatus = statusFilter === '' || String(isActive ? 1 : 0) === statusFilter;

                return mq && mType && mStatus;
            });

            currentPg = 1;
            renderCoupons();
        }

        function renderCoupons() {
            const start = (currentPg - 1) * PAGE;
            const page = filteredCoupons.slice(start, start + PAGE);
            const tbody = document.getElementById('couponsTableBody');
            const now = new Date();

            if (!page.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8">No coupons found.</td></tr>';
                renderPagination('couponsPagination', filteredCoupons.length, currentPg, p => { currentPg = p; renderCoupons(); });
                return;
            }

            tbody.innerHTML = page.map(c => {
                // Code formatting
                const codeHtml = `<div class="coupon-code-badge" title="Copy code" onclick="copyCode('${esc(c.code)}')">${esc(c.code)} <i class="fa-regular fa-copy" style="cursor:pointer; opacity:0.6; margin-left:4px;"></i></div>`;

                // Value & Type
                const isPct = c.type === 'percent';
                const valHtml = isPct ? `${c.value}% OFF` : `â‚¹${c.value} OFF`;
                const typeStr = isPct ? 'Percentage' : 'Fixed Amount';

                // Conditions
                const minOrdStr = c.min_order > 0 ? `Min. order â‚¹${c.min_order}` : 'No Minimum';
                const descStr = c.description ? c.description : 'All Products';

                // Usage & Progress Bar
                const used = c.used_count || 0;
                const max = c.max_uses || null;
                const usageStr = max ? `${used} / ${max}` : `${used} / âˆž`;
                const usagePct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
                const barColor = usagePct >= 90 ? 'var(--danger)' : 'var(--success)';
                const barHtml = max ? `<div class="usage-bar-wrap"><div class="usage-bar-fill" style="width:${usagePct}%; background:${barColor};"></div></div>` : '';

                // Expiry Logic
                let isExpired = false;
                let isExpiringSoon = false;
                let expLabel = 'Never';
                if (c.expires_at) {
                    const expDate = new Date(c.expires_at);
                    expLabel = fmtDate(c.expires_at);
                    if (expDate < now) {
                        isExpired = true;
                    } else if ((expDate - now) / (1000 * 60 * 60 * 24) <= 7) {
                        isExpiringSoon = true;
                    }
                }

                const expHtml = `<div class="admin-table-name">${expLabel}</div>` +
                    (isExpiringSoon ? `<div class="tbl-sub text-warning" style="color:var(--warning)">Expiring Soon</div>` : '');

                // Status Badge
                let isActive = c.active !== false && c.active !== 0;
                let statusBadge = '';
                if (isExpired) {
                    statusBadge = `<span class="badge status-expired">Expired</span>`;
                } else if (isActive) {
                    statusBadge = `<span class="badge status-active">Active</span>`;
                } else {
                    statusBadge = `<span class="badge status-inactive">Inactive</span>`;
                }

                // Opacity style if inactive/expired
                const rowStyle = (!isActive || isExpired) ? 'opacity: 0.75; background: #f8fafc;' : '';

                return `<tr style="${rowStyle}">
                    <td>${codeHtml}</td>
                    <td>
                        <div class="coupon-value">${valHtml}</div>
                        <div class="coupon-type">${typeStr}</div>
                    </td>
                    <td>
                        <div class="tbl-name" style="font-size:.8rem">${minOrdStr}</div>
                        <div class="tbl-sub" style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(descStr)}">${esc(descStr)}</div>
                    </td>
                    <td>
                        <div class="tbl-name" style="font-size:.8rem">${usageStr}</div>
                        ${barHtml}
                    </td>
                    <td>${expHtml}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="act-cell">
                            <button class="btn-icon btn-edit" onclick='editCoupon(${JSON.stringify(c).replace(/'/g, "&apos;")})' title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon btn-del" onclick="deleteCoupon(${c.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            renderPagination('couponsPagination', filteredCoupons.length, currentPg, p => { currentPg = p; renderCoupons(); });
        }

        // â”€â”€ MODAL LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function openCouponModal() {
            editingCouponId = null;
            document.getElementById('couponForm').reset();
            document.getElementById('chkActive').checked = true;
            document.getElementById('modalTitle').textContent = 'Create Coupon';
            document.getElementById('couponModal').classList.add('show');
        }

        function editCoupon(c) {
            editingCouponId = c.id;
            document.getElementById('modalTitle').textContent = 'Edit Coupon';
            const f = document.getElementById('couponForm');

            f.code.value = c.code || '';
            f.type.value = c.type || 'percent';
            f.value.value = c.value || '';
            f.min_order.value = c.min_order || 0;
            f.max_discount.value = c.max_discount || '';
            f.max_uses.value = c.max_uses || '';
            f.description.value = c.description || '';
            f.active.checked = c.active !== false && c.active !== 0;

            if (c.expires_at) {
                // Convert ISO string to format accepted by datetime-local input
                const date = new Date(c.expires_at);
                const offset = date.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
                f.expires_at.value = localISOTime;
            } else {
                f.expires_at.value = '';
            }

            document.getElementById('couponModal').classList.add('show');
        }

        function closeCouponModal() {
            document.getElementById('couponModal').classList.remove('show');
            editingCouponId = null;
        }

        document.getElementById('couponModal').addEventListener('click', function (e) {
            if (e.target === this) closeCouponModal();
        });

        // â”€â”€ CRUD OPERATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function saveCoupon(e) {
            e.preventDefault();
            const f = e.target;
            const btn = document.getElementById('saveCouponBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const payload = {
                code: f.code.value.trim().toUpperCase(),
                type: f.type.value,
                value: Number(f.value.value),
                min_order: Number(f.min_order.value) || 0,
                max_discount: f.max_discount.value ? Number(f.max_discount.value) : null,
                max_uses: f.max_uses.value ? Number(f.max_uses.value) : null,
                expires_at: f.expires_at.value ? new Date(f.expires_at.value).toISOString() : null,
                description: f.description.value.trim(),
                active: f.active.checked
            };

            try {
                if (editingCouponId) {
                    await HeelsUpAuth.api(`/api/admin/coupons/${editingCouponId}`, { method: 'PUT', body: JSON.stringify(payload) });
                    showToast('Coupon updated successfully!');
                } else {
                    await HeelsUpAuth.api('/api/admin/coupons', { method: 'POST', body: JSON.stringify(payload) });
                    showToast('Coupon created successfully!');
                }

                closeCouponModal();
                loadCoupons();
            } catch (err) {
                showToast(err.message || 'Failed to save coupon', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Coupon';
            }
        }

        async function deleteCoupon(id) {
            if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) return;

            try {
                await HeelsUpAuth.api(`/api/admin/coupons/${id}`, { method: 'DELETE' });
                showToast('Coupon deleted successfully.');
                loadCoupons();
            } catch (e) {
                showToast(e.message || 'Failed to delete coupon', 'error');
            }
        }

        // â”€â”€ PAGINATION HELPER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function renderPagination(elId, total, page, onPageCallback) {
            const pages = Math.ceil(total / PAGE);
            const el = document.getElementById(elId);
            if (pages <= 1) { el.innerHTML = ''; return; }

            el.innerHTML = `
                <button class="pg-btn" onclick="(${onPageCallback.toString()})(${page - 1})" ${page <= 1 ? 'disabled' : ''}>â€¹ Prev</button>
                <span class="pg-info">Page <strong>${page}</strong> of <strong>${pages}</strong></span>
                <button class="pg-btn" onclick="(${onPageCallback.toString()})(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next â€º</button>
            `;
        }

        // â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.addEventListener('DOMContentLoaded', loadCoupons);