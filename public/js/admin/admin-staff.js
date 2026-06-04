// â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const currentUser = HeelsUpAuth.getUser();
        if (!currentUser || currentUser.role !== 'admin') {
            window.location = 'login.html?redirect=admin-staff.html';
        }
        const cName = (currentUser?.firstName || currentUser?.first_name || 'Admin');
        document.getElementById('s-avatar').textContent = cName.charAt(0).toUpperCase();
        document.getElementById('s-name').textContent = cName;

        // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let allStaff = [];
        let filteredStaff = [];
        let editingStaffId = null;
        let editingPermsId = null;
        let confirmCallback = null;
        let currentPage = 1;
        const PAGE_SIZE = 15;

        // â”€â”€ UI HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        function doLogout() { HeelsUpAuth.clearSession(); window.location = 'login.html'; }

        function showToast(msg, type = 'success') {
            const c = document.getElementById('toastWrap');
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
            t.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i><span>${msg}</span>`;
            c.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0'; t.style.transform = 'translateX(20px)';
                t.style.transition = 'all .3s ease';
                setTimeout(() => t.remove(), 300);
            }, 4000);
        }

        function esc(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function fmtDate(d) {
            if (!d) return 'â€”';
            const date = new Date(d);
            const now = new Date();
            const diff = now - date;
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
            if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
            if (diff < 172800000) return 'Yesterday';
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function loadAll() {
            await loadStaff();
            loadOrdersBadge();
        }

        async function loadOrdersBadge() {
            try {
                const r = await HeelsUpAuth.api('/api/admin/orders');
                const pend = (r.orders || []).filter(o => o.order_status === 'placed').length;
                if (pend > 0) {
                    const b = document.getElementById('ordersBadge');
                    b.textContent = pend; b.style.display = 'inline-block';
                }
            } catch (e) { }
        }

        // â”€â”€ LOAD STAFF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function loadStaff() {
            document.getElementById('staffTableBody').innerHTML = '<tr><td colspan="6"><div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Loading team...</div></td></tr>';

            try {
                const res = await HeelsUpAuth.api('/api/admin/staff');
                allStaff = res.staff || res || [];
                updateStats();
                filterStaff();
            } catch (e) {
                document.getElementById('staffTableBody').innerHTML = `
         <tr><td colspan="6">
            <div class="empty-state" style="background:#fff8f8; border-radius:8px;">
               <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i>
               <p style="color:var(--danger)">Failed to fetch staff data. Check API connection.</p>
               <button class="btn btn-sm btn-outline" style="margin-top:12px" onclick="loadStaff()"><i class="fa-solid fa-rotate-right"></i> Retry</button>
            </div>
         </td></tr>`;
                showToast('Failed to load staff data.', 'error');
            }
        }

        // â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function updateStats() {
            const total = allStaff.length;
            const active = allStaff.filter(s => s.status === 'active' || s.is_active === 1 || s.is_active === true).length;
            const invite = allStaff.filter(s => s.status === 'invite_sent').length;
            const susp = allStaff.filter(s => s.status === 'suspended').length;

            document.getElementById('statTotal').textContent = total;
            document.getElementById('statActive').textContent = active;
            document.getElementById('statInvite').textContent = invite;
            document.getElementById('statSuspended').textContent = susp;
        }

        // â”€â”€ FILTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function filterStaff() {
            const q = document.getElementById('searchInput').value.toLowerCase();
            const role = document.getElementById('roleFilter').value;
            const status = document.getElementById('statusFilter').value;

            filteredStaff = allStaff.filter(s => {
                const name = ((s.first_name || '') + ' ' + (s.last_name || '') + ' ' + (s.email || '')).toLowerCase();
                if (q && !name.includes(q)) return false;
                if (role && s.role !== role) return false;
                if (status) {
                    const st = getStatus(s);
                    if (st !== status) return false;
                }
                return true;
            });

            currentPage = 1;
            renderTable();
        }

        function getStatus(s) {
            if (s.status) return s.status;
            if (s.invite_pending || s.invite_sent) return 'invite_sent';
            if (s.is_active === 0 || s.is_active === false || s.suspended) return 'suspended';
            return 'active';
        }

        // â”€â”€ RENDER TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function renderTable() {
            const tbody = document.getElementById('staffTableBody');
            const total = filteredStaff.length;
            const start = (currentPage - 1) * PAGE_SIZE;
            const end = Math.min(start + PAGE_SIZE, total);
            const pageData = filteredStaff.slice(start, end);

            document.getElementById('paginationInfo').textContent = total
                ? `Showing ${start + 1}â€“${end} of ${total} members`
                : 'No members found';
            document.getElementById('staffCountLabel').textContent = `${total} member${total !== 1 ? 's' : ''}`;
            document.getElementById('prevBtn').disabled = currentPage <= 1;
            document.getElementById('nextBtn').disabled = end >= total;

            if (!pageData.length) {
                tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-users-slash"></i><p>No staff members match your filter.</p></div></td></tr>`;
                return;
            }

            tbody.innerHTML = pageData.map(s => {
                const fullName = [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unnamed';
                const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                const status = getStatus(s);
                const isCurrentUser = s.email === currentUser?.email;
                const roleSafe = (s.role || 'editor').replace(/_/g, '-');

                // Role badge config
                const roleConfig = {
                    super_admin: { cls: 'role-super-admin', icon: 'fa-shield-halved', label: 'Super Admin' },
                    admin: { cls: 'role-admin', icon: 'fa-user-shield', label: 'Admin' },
                    editor: { cls: 'role-editor', icon: 'fa-pen-nib', label: 'Editor' },
                    support: { cls: 'role-support', icon: 'fa-headset', label: 'Support' },
                    inventory: { cls: 'role-inventory', icon: 'fa-warehouse', label: 'Inventory' },
                };
                const rc = roleConfig[s.role] || { cls: 'role-editor', icon: 'fa-user', label: s.role || 'Staff' };

                // Status badge
                const statusBadges = {
                    active: '<span class="badge badge-active"><i class="fa-solid fa-circle" style="font-size:.4rem"></i> Active</span>',
                    invite_sent: '<span class="badge badge-invite"><i class="fa-solid fa-envelope"></i> Invite Sent</span>',
                    suspended: '<span class="badge badge-suspended"><i class="fa-solid fa-ban"></i> Suspended</span>',
                };
                const statusBadge = statusBadges[status] || statusBadges.active;

                // TFA badge
                const tfaBadge = s.tfa_enabled
                    ? '<span class="badge badge-tfa-on"><i class="fa-solid fa-shield-check"></i> Enabled</span>'
                    : '<span class="badge badge-tfa-off"><i class="fa-solid fa-shield"></i> Disabled</span>';

                // Avatar role class
                const avatarClass = { super_admin: 'admin-role', admin: 'admin-role', editor: 'editor-role', support: 'support-role', inventory: 'inventory-role' }[s.role] || '';
                const inviteClass = status === 'invite_sent' ? 'invite' : avatarClass;

                // Actions
                let actions = `<button class="btn-icon btn-edit" onclick='editStaff(${JSON.stringify(s)})' title="Edit"><i class="fa-solid fa-pen"></i></button>`;
                actions += `<button class="btn-icon" style="background:#f3e8ff;color:#7c3aed;" onclick='viewPermissions(${JSON.stringify(s)})' title="Permissions"><i class="fa-solid fa-shield-halved"></i></button>`;

                if (!isCurrentUser) {
                    if (status === 'active') {
                        actions += `<button class="btn-icon btn-warn" onclick="confirmSuspend(${s.id},'${esc(fullName)}')" title="Suspend Access"><i class="fa-solid fa-ban"></i></button>`;
                    } else if (status === 'suspended') {
                        actions += `<button class="btn-icon btn-edit" onclick="confirmReactivate(${s.id},'${esc(fullName)}')" title="Reactivate"><i class="fa-solid fa-circle-play"></i></button>`;
                    } else if (status === 'invite_sent') {
                        actions += `<button class="btn-icon btn-edit" onclick="resendInvite(${s.id},'${esc(s.email)}')" title="Resend Invite"><i class="fa-solid fa-paper-plane"></i></button>`;
                    }
                    actions += `<button class="btn-icon btn-del" onclick="confirmDelete(${s.id},'${esc(fullName)}')" title="Remove Member"><i class="fa-solid fa-trash"></i></button>`;
                }

                return `
         <tr>
            <td>
               <div style="display:flex;align-items:center;gap:12px">
                  <div class="staff-avatar ${inviteClass}" style="${status === 'invite_sent' ? '' : ''}">
                     ${status === 'invite_sent' ? '<i class="fa-regular fa-envelope"></i>' : initials}
                  </div>
                  <div>
                     <div class="tbl-name">${esc(fullName)}${isCurrentUser ? ' <span style="font-size:.68rem;background:rgba(201,169,110,.15);color:var(--gold-dark);padding:2px 6px;border-radius:4px;font-weight:700;">YOU</span>' : ''}</div>
                     <div class="tbl-sub">${esc(s.email || 'â€”')}</div>
                  </div>
               </div>
            </td>
            <td><span class="role-badge ${rc.cls}"><i class="fa-solid ${rc.icon}"></i> ${rc.label}</span></td>
            <td>${tfaBadge}</td>
            <td>
               <div class="tbl-name">${fmtDate(s.last_login_at || s.last_login)}</div>
               ${s.last_login_ip ? `<div class="tbl-sub">${esc(s.last_login_ip)}</div>` : ''}
            </td>
            <td>${statusBadge}</td>
            <td><div class="act-cell">${actions}</div></td>
         </tr>
      `;
            }).join('');
        }

        function changePage(dir) {
            currentPage += dir;
            renderTable();
        }

        // â”€â”€ ADD / EDIT STAFF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function openAddModal() {
            editingStaffId = null;
            document.getElementById('staffForm').reset();
            document.getElementById('staffModalTitle').innerHTML = '<i class="fa-solid fa-user-plus" style="color:var(--gold)"></i> Add Staff Member';
            document.getElementById('chkStaffActive').checked = true;
            document.getElementById('saveStaffBtn').innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Invite';
            clearPermChecks();
            document.getElementById('staffModal').classList.add('show');
        }

        function editStaff(s) {
            editingStaffId = s.id;
            document.getElementById('staffModalTitle').innerHTML = '<i class="fa-solid fa-user-pen" style="color:var(--gold)"></i> Edit Staff Member';
            document.getElementById('saveStaffBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';

            const f = document.getElementById('staffForm');
            f.first_name.value = s.first_name || '';
            f.last_name.value = s.last_name || '';
            f.email.value = s.email || '';
            f.role.value = s.role || '';
            f.notes.value = s.notes || '';
            document.getElementById('chkStaffActive').checked = s.is_active !== 0 && s.is_active !== false;

            // Load permissions
            const perms = s.permissions || [];
            clearPermChecks();
            document.querySelectorAll('#permsGrid input[type=checkbox]').forEach(cb => {
                if (perms.includes(cb.value)) { cb.checked = true; cb.closest('.perm-item').classList.add('checked'); }
            });

            document.getElementById('staffModal').classList.add('show');
        }

        function closeStaffModal() { document.getElementById('staffModal').classList.remove('show'); }

        function clearPermChecks() {
            document.querySelectorAll('#permsGrid input[type=checkbox]').forEach(cb => {
                cb.checked = false; cb.closest('.perm-item').classList.remove('checked');
            });
        }

        function togglePerm(el) {
            // Called on click of perm-item; toggle checked class
            setTimeout(() => {
                const cb = el.querySelector('input[type=checkbox]');
                if (cb && cb.checked) el.classList.add('checked');
                else el.classList.remove('checked');
            }, 0);
        }

        function updatePermissionsFromRole(role) {
            const presets = {
                admin: ['orders', 'products', 'customers', 'marketing', 'content', 'reports', 'shipping', 'settings'],
                editor: ['products', 'content', 'marketing'],
                support: ['orders', 'customers'],
                inventory: ['products'],
            };
            const perms = presets[role] || [];
            document.querySelectorAll('#permsGrid input[type=checkbox]').forEach(cb => {
                cb.checked = perms.includes(cb.value);
                if (cb.checked) cb.closest('.perm-item').classList.add('checked');
                else cb.closest('.perm-item').classList.remove('checked');
            });
        }

        async function saveStaff(e) {
            e.preventDefault();
            const f = e.target;
            const btn = document.getElementById('saveStaffBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            // Collect permissions
            const permissions = [];
            f.querySelectorAll('#permsGrid input[type=checkbox]:checked').forEach(cb => permissions.push(cb.value));

            const data = {
                first_name: f.first_name.value.trim(),
                last_name: f.last_name.value.trim(),
                email: f.email.value.trim(),
                role: f.role.value,
                notes: f.notes.value.trim(),
                is_active: f.is_active.checked ? 1 : 0,
                permissions
            };

            try {
                if (editingStaffId) {
                    await HeelsUpAuth.api(`/api/admin/staff/${editingStaffId}`, { method: 'PUT', body: JSON.stringify(data) });
                    showToast('Staff member updated successfully.');
                } else {
                    await HeelsUpAuth.api('/api/admin/staff', { method: 'POST', body: JSON.stringify(data) });
                    showToast('Invitation sent! Member will receive an email shortly.', 'info');
                }
                closeStaffModal();
                loadStaff();
            } catch (err) {
                showToast(err.message || 'Failed to save. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = editingStaffId
                    ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes'
                    : '<i class="fa-solid fa-paper-plane"></i> Send Invite';
            }
        }

        // â”€â”€ PERMISSIONS MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function viewPermissions(s) {
            editingPermsId = s.id;
            const fullName = [s.first_name, s.last_name].filter(Boolean).join(' ');
            document.getElementById('permsModalTitle').innerHTML = `<i class="fa-solid fa-shield-halved" style="color:var(--gold)"></i> ${esc(fullName)}'s Permissions`;

            const allPerms = [
                { key: 'orders', label: 'Orders & Returns', icon: 'fa-bag-shopping' },
                { key: 'products', label: 'Products & Inventory', icon: 'fa-box' },
                { key: 'customers', label: 'Customers', icon: 'fa-users' },
                { key: 'marketing', label: 'Coupons & Banners', icon: 'fa-bullhorn' },
                { key: 'content', label: 'Blog & Pages', icon: 'fa-newspaper' },
                { key: 'reports', label: 'Reports & Analytics', icon: 'fa-chart-bar' },
                { key: 'shipping', label: 'Shipping & Taxes', icon: 'fa-truck-fast' },
                { key: 'settings', label: 'Settings & Staff', icon: 'fa-gear' },
            ];
            const currentPerms = s.permissions || [];

            document.getElementById('permsModalBody').innerHTML = allPerms.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border:1.5px solid var(--border);border-radius:9px;">
         <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:8px;background:rgba(201,169,110,.12);color:var(--gold-dark);display:flex;align-items:center;justify-content:center;font-size:.85rem;">
               <i class="fa-solid ${p.icon}"></i>
            </div>
            <span style="font-size:.87rem;font-weight:600;color:var(--text)">${p.label}</span>
         </div>
         <label class="toggle">
            <input type="checkbox" id="perm-modal-${p.key}" ${currentPerms.includes(p.key) ? 'checked' : ''}>
            <span class="toggle-slider"></span>
         </label>
      </div>
   `).join('');

            document.getElementById('permsModal').classList.add('show');
        }

        function closePermsModal() { document.getElementById('permsModal').classList.remove('show'); }

        async function savePermissions() {
            const btn = document.getElementById('savePermsBtn');
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const permissions = [];
            ['orders', 'products', 'customers', 'marketing', 'content', 'reports', 'shipping', 'settings'].forEach(k => {
                const el = document.getElementById(`perm-modal-${k}`);
                if (el && el.checked) permissions.push(k);
            });

            try {
                await HeelsUpAuth.api(`/api/admin/staff/${editingPermsId}/permissions`, {
                    method: 'PUT',
                    body: JSON.stringify({ permissions })
                });
                showToast('Permissions updated successfully.');
                closePermsModal();
                loadStaff();
            } catch (e) {
                showToast(e.message || 'Failed to update permissions.', 'error');
            } finally {
                btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Permissions';
            }
        }

        // â”€â”€ STAFF ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function resendInvite(id, email) {
            try {
                await HeelsUpAuth.api(`/api/admin/staff/${id}/resend-invite`, { method: 'POST' });
                showToast(`Invitation resent to ${email}.`, 'info');
            } catch (e) {
                showToast('Failed to resend invitation.', 'error');
            }
        }

        function confirmSuspend(id, name) {
            showConfirmModal(
                'danger',
                'Suspend Access?',
                `This will immediately revoke ${name}'s login access. They will be unable to log into the admin panel until reactivated.`,
                'Suspend Account',
                async () => {
                    try {
                        await HeelsUpAuth.api(`/api/admin/staff/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ status: 'suspended' }) });
                        showToast(`${name}'s access has been suspended.`, 'warning');
                        loadStaff();
                    } catch (e) { showToast('Action failed.', 'error'); }
                }
            );
        }

        function confirmReactivate(id, name) {
            showConfirmModal(
                'info',
                'Reactivate Account?',
                `This will restore ${name}'s access to the admin panel with their existing role and permissions.`,
                'Yes, Reactivate',
                async () => {
                    try {
                        await HeelsUpAuth.api(`/api/admin/staff/${id}/activate`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
                        showToast(`${name}'s account reactivated successfully.`, 'success');
                        loadStaff();
                    } catch (e) { showToast('Action failed.', 'error'); }
                }
            );
        }

        function confirmDelete(id, name) {
            showConfirmModal(
                'danger',
                'Remove Staff Member?',
                `DANGER: This permanently removes ${name} from the team. All their audit logs will be retained, but the account will be deleted. This cannot be undone.`,
                'Delete Member',
                async () => {
                    try {
                        await HeelsUpAuth.api(`/api/admin/staff/${id}`, { method: 'DELETE' });
                        showToast(`${name} has been removed from the team.`, 'warning');
                        loadStaff();
                    } catch (e) { showToast('Deletion failed.', 'error'); }
                }
            );
        }

        // â”€â”€ CONFIRM MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function showConfirmModal(type, title, msg, btnLabel, callback) {
            confirmCallback = callback;
            const iconEl = document.getElementById('confirmIcon');
            const btnEl = document.getElementById('confirmActionBtn');

            iconEl.innerHTML = type === 'danger'
                ? '<i class="fa-solid fa-triangle-exclamation"></i>'
                : '<i class="fa-solid fa-circle-question"></i>';
            iconEl.className = `confirm-icon ${type}`;

            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMsg').textContent = msg;

            btnEl.textContent = btnLabel;
            btnEl.className = type === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

            document.getElementById('confirmModal').classList.add('show');
        }

        function closeConfirmModal() {
            document.getElementById('confirmModal').classList.remove('show');
            confirmCallback = null;
        }

        function executeConfirmAction() {
            closeConfirmModal();
            if (confirmCallback) confirmCallback();
        }

        // Close modals on backdrop click
        ['staffModal', 'confirmModal', 'permsModal'].forEach(id => {
            document.getElementById(id).addEventListener('click', function (e) {
                if (e.target === this) this.classList.remove('show');
            });
        });

        // â”€â”€ BOOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.addEventListener('DOMContentLoaded', loadAll);