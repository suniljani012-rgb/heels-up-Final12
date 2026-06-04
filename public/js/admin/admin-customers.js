// â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let allCustomers = [];
        let filteredCustomers = [];
        const PAGE = 12;
        let currentPg = 1;

        // â”€â”€ AUTH & SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        try {
            const user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') {
                window.location = 'login.html?redirect=admin-customers.html';
            }
            const uname = (user?.firstName || user?.first_name || 'Admin');
            document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
            document.getElementById('s-name').textContent = uname;
        } catch (e) {
            console.error("Auth initialization failed", e);
        }

        // â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function toggleSidebar() {
            const s = document.getElementById('sidebar');
            s.classList.toggle('open');
            document.getElementById('mobOverlay').style.display = s.classList.contains('open') ? 'block' : 'none';
        }

        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('mobOverlay').style.display = 'none';
        }

        function doLogout() {
            try { HeelsUpAuth.clearSession(); } catch (e) { }
            window.location = 'login.html';
        }

        // â”€â”€ UTILITIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        function esc(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function fmtDate(d) {
            if (!d) return 'â€”';
            return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // â”€â”€ DATA FETCHING & FILTERING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function loadCustomers() {
            document.getElementById('customersTableBody').innerHTML = '<tr><td colspan="5"><div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Loading customers...</div></td></tr>';
            try {
                const data = await HeelsUpAuth.api('/api/admin/customers');
                const rawUsers = data.customers || data || [];
                // User requirement: staff should not show in customer list
                allCustomers = rawUsers.filter(u => u.role !== 'admin');
                
                filterCustomers();
            } catch (e) {
                console.error('API Error:', e);
                showToast(e.message || 'Failed to load customers', 'error');
                document.getElementById('customersTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#ef4444">Failed to load data. Please check your connection.</td></tr>';
            }
        }

        function filterCustomers() {
            const q = document.getElementById('custSearch').value.toLowerCase();
            const role = document.getElementById('roleFilter').value;

            filteredCustomers = allCustomers.filter(c => {
                const nameStr = ((c.first_name || '') + ' ' + (c.last_name || '')).toLowerCase();
                const emailStr = (c.email || '').toLowerCase();
                const phoneStr = (c.phone || '').toLowerCase();

                const matchesSearch = !q || nameStr.includes(q) || emailStr.includes(q) || phoneStr.includes(q);
                const matchesRole = !role || c.role === role;

                return matchesSearch && matchesRole;
            });

            currentPg = 1;
            renderCustomers();
        }

        // â”€â”€ RENDERING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function renderCustomers() {
            const start = (currentPg - 1) * PAGE;
            const page = filteredCustomers.slice(start, start + PAGE);
            const tbody = document.getElementById('customersTableBody');

            if (!page.length) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8">No customers found.</td></tr>';
                renderPagination('customersPagination', filteredCustomers.length, currentPg, p => { currentPg = p; renderCustomers(); });
                return;
            }

            tbody.innerHTML = page.map(c => {
                const fullName = (c.first_name || '') + ' ' + (c.last_name || '');
                const displayRole = c.role || 'customer';
                const roleBadgeClass = displayRole === 'admin' ? 'badge-admin' : 'badge-customer';

                // Toggle admin actions based on current role
                let roleToggleBtn = '';
                if (displayRole !== 'admin') {
                    roleToggleBtn = `<button class="btn-icon btn-edit" onclick="updateCustomerRole(${c.id}, 'admin')" title="Make Admin"><i class="fa-solid fa-shield-halved"></i></button>`;
                } else {
                    roleToggleBtn = `<button class="btn-icon btn-outline" onclick="updateCustomerRole(${c.id}, 'customer')" title="Remove Admin Privilege"><i class="fa-solid fa-user-shield"></i></button>`;
                }

                const blockBtnColor = c.is_blocked ? 'var(--success)' : 'var(--warning)';
                const blockBtnIcon = c.is_blocked ? 'fa-unlock' : 'fa-ban';
                const blockBtnTitle = c.is_blocked ? 'Unblock Customer' : 'Block Customer';

                return `<tr>
                    <td>
                        <div class="tbl-name">${esc(fullName.trim() || 'Unknown User')}</div>
                        <div class="tbl-sub">ID: #${c.id || 'â€”'}</div>
                    </td>
                    <td>
                        <div style="font-size: .83rem; color: var(--text);">${esc(c.email || 'â€”')}</div>
                        <div class="tbl-sub">${esc(c.phone || 'â€”')}</div>
                    </td>
                    <td>
                        <div style="font-size: .83rem; color: var(--text);">${fmtDate(c.created_at)}</div>
                    </td>
                    <td>
                        <span class="badge ${roleBadgeClass}">${esc(displayRole)}</span>
                        ${c.is_blocked ? '<span class="badge" style="background:#fef2f2;color:#dc2626">Blocked</span>' : ''}
                    </td>
                    <td>
                        <div class="act-cell">
                            ${roleToggleBtn}
                            <button class="btn-icon btn-outline" style="color:${blockBtnColor}" onclick="toggleBlockCustomer(${c.id}, ${c.is_blocked ? 'false' : 'true'})" title="${blockBtnTitle}"><i class="fa-solid ${blockBtnIcon}"></i></button>
                            <button class="btn-icon btn-del" onclick="deleteCustomer(${c.id})" title="Delete Customer"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            renderPagination('customersPagination', filteredCustomers.length, currentPg, p => { currentPg = p; renderCustomers(); });
        }

        // â”€â”€ ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function updateCustomerRole(id, newRole) {
            if (!confirm(`Set this user as ${newRole}?`)) return;
            try {
                await HeelsUpAuth.api(`/api/admin/customers/${id}/role`, {
                    method: 'PUT',
                    body: JSON.stringify({ role: newRole })
                });
                showToast(`Role updated to ${newRole}!`);
                allCustomers = []; // force reload
                loadCustomers(); // refresh
            } catch (e) {
                showToast(e.message || 'Failed', 'error');
            }
        }

        async function deleteCustomer(id) {
            if (!confirm('Warning: Are you sure you want to permanently delete this customer account? This action cannot be undone.')) return;

            try {
                await HeelsUpAuth.api(`/api/admin/customers/${id}`, { method: 'DELETE' });
                showToast('Customer deleted successfully!');

                // Update local array & re-render
                allCustomers = allCustomers.filter(c => c.id !== id);
                filterCustomers();
            } catch (e) {
                showToast(e.message || 'Error deleting customer', 'error');
            }
        }

        async function toggleBlockCustomer(id, block) {
            const actionStr = block ? 'block' : 'unblock';
            if (!confirm(`Are you sure you want to ${actionStr} this customer?`)) return;
            try {
                await HeelsUpAuth.api(`/api/admin/customers/${id}/block`, {
                    method: 'PUT',
                    body: JSON.stringify({ blocked: block })
                });
                showToast(`Customer ${actionStr}ed successfully!`);
                allCustomers = [];
                loadCustomers();
            } catch(e) {
                showToast(e.message || `Error ${actionStr}ing customer`, 'error');
            }
        }

        // â”€â”€ PAGINATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function renderPagination(elId, total, page, onPageCallback) {
            const pages = Math.ceil(total / PAGE);
            const el = document.getElementById(elId);

            if (pages <= 1) {
                el.innerHTML = '';
                return;
            }

            el.innerHTML = `
                <button class="pg-btn" onclick="(${onPageCallback.toString()})(${page - 1})" ${page <= 1 ? 'disabled' : ''}>â€¹ Prev</button>
                <span class="pg-info">Page <strong>${page}</strong> of <strong>${pages}</strong></span>
                <button class="pg-btn" onclick="(${onPageCallback.toString()})(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next â€º</button>
            `;
        }

        // â”€â”€ OFFER MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function openOfferModal() {
            document.getElementById('offerTitle').value = '';
            document.getElementById('offerMessage').value = '';
            document.getElementById('offerCode').value = '';
            document.getElementById('offerModal').style.display = 'block';
        }

        function closeOfferModal() {
            document.getElementById('offerModal').style.display = 'none';
        }

        async function submitOffer() {
            const title = document.getElementById('offerTitle').value.trim();
            const message = document.getElementById('offerMessage').value.trim();
            const code = document.getElementById('offerCode').value.trim();

            if (!title || !message) {
                showToast('Please enter an offer title and message', 'error');
                return;
            }

            const btn = document.getElementById('submitOfferBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/admin/send-offer', {
                    method: 'POST',
                    headers: HeelsUpAuth.headers(),
                    body: JSON.stringify({ title, message, discount_code: code || null })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || 'Offer broadcast initiated!', 'success');
                    closeOfferModal();
                } else {
                    throw new Error(data.error || 'Failed to send offer');
                }
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        // â”€â”€ INITIALIZATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.addEventListener('DOMContentLoaded', loadCustomers);