/* ═══════════════════════════════════════════════════
         SHIPPING MANAGEMENT ENGINE — Enterprise Grade
      ═══════════════════════════════════════════════════ */

      // ── STATE ──────────────────────────────────────────
      let allZones = [];
      let allCouriers = [];
      let allPincodes = [];
      let editingZoneId = null;
      let editingCourierId = null;
      let pincodePage = 1;
      const PINCODE_PAGE_SIZE = 50;

      // ── AUTH ──────────────────────────────────────────
      document.addEventListener('DOMContentLoaded', async () => {
         const user = HeelsUpAuth.getUser();
         if (!user || user.role !== 'admin') {
            window.location = 'login.html?redirect=admin-shipping.html'; return;
         }
         const name = user.firstName || user.first_name || 'Admin';
         document.getElementById('s-avatar').textContent = name.charAt(0).toUpperCase();
         document.getElementById('s-name').textContent = name;

         init();
      });

      async function init() {
         await loadZones();
         await loadSummaryStats();
      }

      // ── UI HELPERS ────────────────────────────────────
      function toggleSidebar() {
         document.getElementById('sidebar').classList.toggle('open');
         document.getElementById('mobOverlay').style.display =
            document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
      }
      function closeSidebar() {
         document.getElementById('sidebar').classList.remove('open');
         document.getElementById('mobOverlay').style.display = 'none';
      }
      function doLogout() { HeelsUpAuth.clearSession(); window.location = 'login.html'; }

      function showToast(msg, type = 'success', dur = 4000) {
         const wrap = document.getElementById('toastWrap');
         const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
         const t = document.createElement('div');
         t.className = `toast ${type}`;
         t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${msg}</span>`;
         wrap.appendChild(t);
         setTimeout(() => {
            t.style.opacity = '0'; t.style.transform = 'translateX(30px)';
            setTimeout(() => t.remove(), 300);
         }, dur);
      }

      const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      // ── TABS ──────────────────────────────────────────
      function switchTab(name, btn) {
         document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
         document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
         document.getElementById('tab-' + name).classList.add('active');
         btn.classList.add('active');

         if (name === 'zones') loadZones();
         if (name === 'rates') loadRates();
         if (name === 'methods') loadMethods();
         if (name === 'couriers') loadCouriers();
         if (name === 'cod') loadCodSettings();
         if (name === 'pincodes') loadPincodes();
      }

      // ── SUMMARY STATS ─────────────────────────────────
      async function loadSummaryStats() {
         try {
            const [zonesRes, pincodesRes, methodsRes, couriersRes, codRes] = await Promise.all([
               HeelsUpAuth.api('/api/admin/shipping/zones').catch(() => ({ zones: [] })),
               HeelsUpAuth.api('/api/admin/shipping/pincodes?count=1').catch(() => ({ total: 0 })),
               HeelsUpAuth.api('/api/admin/shipping/methods').catch(() => ({ methods: [] })),
               HeelsUpAuth.api('/api/admin/shipping/couriers').catch(() => ({ couriers: [] })),
               HeelsUpAuth.api('/api/admin/shipping/cod').catch(() => ({ enabled: false }))
            ]);

            document.getElementById('ms-zones').textContent = (zonesRes.zones || []).length;
            document.getElementById('ms-pincodes').textContent = (pincodesRes.total || 0).toLocaleString('en-IN');
            document.getElementById('ms-methods').textContent = (methodsRes.methods || []).filter(m => m.is_active).length;
            document.getElementById('ms-couriers').textContent = (couriersRes.couriers || []).filter(c => c.is_active).length;
            document.getElementById('ms-cod').textContent = codRes.enabled ? 'ON' : 'OFF';
         } catch (e) {
            console.error('Stats load failed:', e);
         }
      }

      // ── ZONES ─────────────────────────────────────────
      async function loadZones() {
         document.getElementById('zonesContainer').innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner"></i>Loading zones...</div>';
         try {
            const res = await HeelsUpAuth.api('/api/admin/shipping/zones');
            allZones = res.zones || [];
            renderZones();
         } catch (e) {
            document.getElementById('zonesContainer').innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load zones.</p></div>';
         }
      }

      function renderZones() {
         const el = document.getElementById('zonesContainer');
         if (!allZones.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-map-location-dot"></i><p>No zones configured yet.</p><button class="btn btn-primary btn-sm" onclick="openZoneModal()" style="margin-top:10px"><i class="fa-solid fa-plus"></i> Create First Zone</button></div>';
            return;
         }

         el.innerHTML = `<div class="zone-grid">${allZones.map(z => `
                <div class="zone-card">
                    <div class="zone-header">
                        <div>
                            <div class="zone-name">${esc(z.name)}</div>
                            <div class="zone-meta">${z.delivery_days ? 'Delivery: ' + esc(z.delivery_days) + ' days' : ''}</div>
                        </div>
                        <span class="badge ${z.is_active ? 'badge-active' : 'badge-inactive'}">${z.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    ${z.states ? `<div class="zone-states">${z.states.split(',').map(s => `<span class="state-tag">${esc(s.trim())}</span>`).join('')}</div>` : ''}
                    <div class="zone-rates">
                        <div class="rate-item">
                            <div class="rate-label">Standard</div>
                            <div class="rate-value">${z.standard_rate != null ? '₹' + Number(z.standard_rate).toLocaleString('en-IN') : 'N/A'}</div>
                        </div>
                        <div class="rate-item">
                            <div class="rate-label">Express</div>
                            <div class="rate-value">${z.express_rate != null ? '₹' + Number(z.express_rate).toLocaleString('en-IN') : 'N/A'}</div>
                        </div>
                    </div>
                    <div class="zone-footer">
                        <label class="toggle" title="Toggle Status">
                            <input type="checkbox" ${z.is_active ? 'checked' : ''} onchange="toggleZoneStatus(${z.id},this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <div style="display:flex;gap:6px">
                            <button class="btn-icon btn-edit" onclick='editZone(${JSON.stringify(z).replace(/'/g, "&#39;")})' title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon btn-del" onclick="deleteZone(${z.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('')}</div>`;
      }

      function openZoneModal() {
         editingZoneId = null;
         document.getElementById('zoneForm').reset();
         document.getElementById('zoneModalTitle').textContent = 'Add Shipping Zone';
         document.getElementById('chkZoneActive').checked = true;
         document.getElementById('zoneModal').classList.add('show');
      }

      function editZone(z) {
         editingZoneId = z.id;
         document.getElementById('zoneModalTitle').textContent = 'Edit Zone';
         const f = document.getElementById('zoneForm');
         f.name.value = z.name || '';
         f.states.value = z.states || '';
         f.delivery_days.value = z.delivery_days || '';
         f.sort_order.value = z.sort_order || 0;
         document.getElementById('chkZoneActive').checked = !!z.is_active;
         document.getElementById('zoneModal').classList.add('show');
      }

      function closeZoneModal() {
         document.getElementById('zoneModal').classList.remove('show');
      }

      async function saveZone(e) {
         e.preventDefault();
         const f = e.target;
         const btn = document.getElementById('saveZoneBtn');
         btn.disabled = true;
         btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

         const data = {
            name: f.name.value.trim(),
            states: f.states.value.trim(),
            delivery_days: f.delivery_days.value.trim(),
            sort_order: Number(f.sort_order.value) || 0,
            is_active: f.is_active.checked ? 1 : 0
         };

         try {
            if (editingZoneId) {
               await HeelsUpAuth.api(`/api/admin/shipping/zones/${editingZoneId}`, { method: 'PUT', body: JSON.stringify(data) });
            } else {
               await HeelsUpAuth.api('/api/admin/shipping/zones', { method: 'POST', body: JSON.stringify(data) });
            }
            showToast('Zone saved successfully!');
            closeZoneModal();
            loadZones();
            loadSummaryStats();
         } catch (err) {
            showToast(err.message || 'Failed to save zone.', 'error');
         } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Zone';
         }
      }

      async function toggleZoneStatus(id, val) {
         try {
            await HeelsUpAuth.api(`/api/admin/shipping/zones/${id}`, {
               method: 'PATCH',
               body: JSON.stringify({ is_active: val ? 1 : 0 })
            });
            showToast(val ? 'Zone enabled.' : 'Zone disabled.');
            loadZones();
         } catch (e) {
            showToast('Failed to update status.', 'error');
         }
      }

      async function deleteZone(id) {
         if (!confirm('Delete this zone? This will also remove associated rates and pincodes.')) return;
         try {
            await HeelsUpAuth.api(`/api/admin/shipping/zones/${id}`, { method: 'DELETE' });
            showToast('Zone deleted successfully.');
            loadZones();
            loadSummaryStats();
         } catch (e) {
            showToast(e.message || 'Failed to delete zone.', 'error');
         }
      }

      // ── RATES ─────────────────────────────────────────
      async function loadRates() {
         document.getElementById('ratesTableBody').innerHTML = '<tr><td colspan="6"><div class="loading-state"><i class="fa-solid fa-spinner"></i>Loading rates...</div></td></tr>';
         try {
            const [zonesRes, settingsRes] = await Promise.all([
               HeelsUpAuth.api('/api/admin/shipping/zones'),
               HeelsUpAuth.api('/api/admin/shipping/settings').catch(() => ({}))
            ]);
            allZones = zonesRes.zones || [];
            if (settingsRes.free_shipping_threshold) {
               document.getElementById('freeShippingThreshold').value = settingsRes.free_shipping_threshold;
            }
            renderRates();
         } catch (e) {
            document.getElementById('ratesTableBody').innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load rates.</p></div></td></tr>';
         }
      }

      function renderRates() {
         const tbody = document.getElementById('ratesTableBody');
         if (!allZones.length) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-map-location-dot"></i><p>Create zones first to configure rates.</p></div></td></tr>';
            return;
         }

         tbody.innerHTML = allZones.map(z => `
                <tr id="rate-row-${z.id}">
                    <td>
                        <div class="tbl-name">${esc(z.name)}</div>
                        <div class="tbl-sub">${esc(z.states || '')}</div>
                    </td>
                    <td><div class="rate-editor"><span>₹</span><input type="number" class="rate-input" id="std-${z.id}" value="${z.standard_rate || ''}" placeholder="0"></div></td>
                    <td><div class="rate-editor"><span>₹</span><input type="number" class="rate-input" id="exp-${z.id}" value="${z.express_rate || ''}" placeholder="0"></div></td>
                    <td><div class="rate-editor"><span>₹</span><input type="number" class="rate-input" id="smd-${z.id}" value="${z.sameday_rate || ''}" placeholder="0"></div></td>
                    <td><div class="rate-editor"><span>₹</span><input type="number" class="rate-input" id="free-${z.id}" value="${z.free_above || ''}" placeholder="None"></div></td>
                    <td><button class="btn btn-sm btn-ghost" onclick="saveZoneRate(${z.id})"><i class="fa-solid fa-check"></i> Save</button></td>
                </tr>
            `).join('');
      }

      async function saveZoneRate(zoneId) {
         const data = {
            standard_rate: document.getElementById(`std-${zoneId}`).value || null,
            express_rate: document.getElementById(`exp-${zoneId}`).value || null,
            sameday_rate: document.getElementById(`smd-${zoneId}`).value || null,
            free_above: document.getElementById(`free-${zoneId}`).value || null
         };

         try {
            await HeelsUpAuth.api(`/api/admin/shipping/zones/${zoneId}/rates`, {
               method: 'PUT',
               body: JSON.stringify(data)
            });
            showToast('Rates updated successfully!');
            const row = document.getElementById(`rate-row-${zoneId}`);
            if (row) {
               row.style.background = '#f0fdf4';
               setTimeout(() => row.style.background = '', 1500);
            }
         } catch (e) {
            showToast(e.message || 'Failed to update rates.', 'error');
         }
      }

      async function saveFreeThreshold() {
         const val = document.getElementById('freeShippingThreshold').value;
         if (!val) return showToast('Enter a valid amount.', 'warning');

         try {
            await HeelsUpAuth.api('/api/admin/shipping/settings', {
               method: 'PATCH',
               body: JSON.stringify({ free_shipping_threshold: Number(val) })
            });
            showToast('Free shipping threshold saved!');
         } catch (e) {
            showToast('Failed to save threshold.', 'error');
         }
      }

      // ── METHODS ───────────────────────────────────────
      async function loadMethods() {
         document.getElementById('methodsContainer').innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner"></i>Loading methods...</div>';
         try {
            const res = await HeelsUpAuth.api('/api/admin/shipping/methods');
            renderMethods(res.methods || []);
         } catch (e) {
            document.getElementById('methodsContainer').innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load methods.</p></div>';
         }
      }

      function renderMethods(methods) {
         if (!methods.length) {
            document.getElementById('methodsContainer').innerHTML = '<div class="empty-state"><i class="fa-solid fa-truck-fast"></i><p>No delivery methods available.</p></div>';
            return;
         }

         const icons = { standard: 'fa-truck', express: 'fa-truck-fast', sameday: 'fa-bolt' };
         const colors = { standard: 'mi-blue', express: 'mi-orange', sameday: 'mi-green' };

         document.getElementById('methodsContainer').innerHTML = methods.map(m => `
                <div style="background:var(--surface-2);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:18px;margin-bottom:12px;display:flex;align-items:center;gap:16px">
                    <div class="mini-icon ${colors[m.slug] || 'mi-blue'}"><i class="fa-solid ${icons[m.slug] || 'fa-truck'}"></i></div>
                    <div style="flex:1">
                        <div style="font-weight:700;font-size:.9rem;color:var(--text)">${esc(m.name)}</div>
                        <div style="font-size:.75rem;color:var(--muted);margin-top:2px">${esc(m.description || '')}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:14px">
                        <div style="text-align:right">
                            <div style="font-size:.68rem;text-transform:uppercase;color:var(--muted-lt);font-weight:700">SLA</div>
                            <div style="font-weight:700;font-size:.85rem;color:var(--text)">${esc(m.delivery_days || 'N/A')}</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" ${m.is_active ? 'checked' : ''} onchange="toggleMethod(${m.id},this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            `).join('');
      }

      async function toggleMethod(id, val) {
         try {
            await HeelsUpAuth.api(`/api/admin/shipping/methods/${id}`, {
               method: 'PATCH',
               body: JSON.stringify({ is_active: val ? 1 : 0 })
            });
            showToast(val ? 'Method enabled.' : 'Method disabled.');
            loadSummaryStats();
         } catch (e) {
            showToast('Failed to update method.', 'error');
         }
      }

      // ── COURIERS ──────────────────────────────────────
      async function loadCouriers() {
         document.getElementById('couriersContainer').innerHTML = '<div class="loading-state" style="grid-column:1/-1"><i class="fa-solid fa-spinner"></i>Loading couriers...</div>';
         try {
            const res = await HeelsUpAuth.api('/api/admin/shipping/couriers');
            allCouriers = res.couriers || [];
            renderCouriers();
         } catch (e) {
            document.getElementById('couriersContainer').innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load couriers.</p></div>';
         }
      }

      function renderCouriers() {
         const el = document.getElementById('couriersContainer');
         if (!allCouriers.length) {
            el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-box-open"></i><p>No courier partners configured.</p><button class="btn btn-primary btn-sm" onclick="openCourierModal()" style="margin-top:10px"><i class="fa-solid fa-plus"></i> Add Courier</button></div>';
            return;
         }

         el.innerHTML = allCouriers.map(c => `
                <div class="courier-card">
                    <div class="courier-info">
                        <div class="courier-name"><i class="fa-solid fa-box-open" style="color:var(--primary);margin-right:6px"></i>${esc(c.name)}</div>
                        <div class="courier-sub">${c.awb_prefix ? 'AWB: ' + esc(c.awb_prefix) : 'No prefix'}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
                        <span class="badge ${c.is_active ? 'badge-active' : 'badge-inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span>
                        <div class="courier-actions">
                            <button class="btn-icon btn-edit" onclick='editCourier(${JSON.stringify(c).replace(/'/g, "&#39;")})' title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon btn-del" onclick="deleteCourier(${c.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('');
      }

      function openCourierModal() {
         editingCourierId = null;
         document.getElementById('courierForm').reset();
         document.getElementById('courierModalTitle').textContent = 'Add Courier Partner';
         document.getElementById('chkCourierActive').checked = true;
         document.getElementById('courierModal').classList.add('show');
      }

      function editCourier(c) {
         editingCourierId = c.id;
         document.getElementById('courierModalTitle').textContent = 'Edit Courier';
         const f = document.getElementById('courierForm');
         f.name.value = c.name || '';
         f.awb_prefix.value = c.awb_prefix || '';
         f.api_key.value = c.api_key || '';
         f.tracking_url.value = c.tracking_url || '';
         document.getElementById('chkCourierActive').checked = !!c.is_active;
         document.getElementById('courierModal').classList.add('show');
      }

      function closeCourierModal() {
         document.getElementById('courierModal').classList.remove('show');
      }

      async function saveCourier(e) {
         e.preventDefault();
         const f = e.target;
         const btn = document.getElementById('saveCourierBtn');
         btn.disabled = true;
         btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

         const data = {
            name: f.name.value.trim(),
            awb_prefix: f.awb_prefix.value.trim(),
            api_key: f.api_key.value.trim(),
            tracking_url: f.tracking_url.value.trim(),
            is_active: f.is_active.checked ? 1 : 0
         };

         try {
            if (editingCourierId) {
               await HeelsUpAuth.api(`/api/admin/shipping/couriers/${editingCourierId}`, {
                  method: 'PUT',
                  body: JSON.stringify(data)
               });
            } else {
               await HeelsUpAuth.api('/api/admin/shipping/couriers', {
                  method: 'POST',
                  body: JSON.stringify(data)
               });
            }
            showToast('Courier saved successfully!');
            closeCourierModal();
            loadCouriers();
            loadSummaryStats();
         } catch (err) {
            showToast(err.message || 'Failed to save courier.', 'error');
         } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Courier';
         }
      }

      async function deleteCourier(id) {
         if (!confirm('Delete this courier partner?')) return;
         try {
            await HeelsUpAuth.api(`/api/admin/shipping/couriers/${id}`, { method: 'DELETE' });
            showToast('Courier deleted successfully.');
            loadCouriers();
            loadSummaryStats();
         } catch (e) {
            showToast(e.message || 'Failed to delete courier.', 'error');
         }
      }

      // ── COD SETTINGS ──────────────────────────────────
      async function loadCodSettings() {
         document.getElementById('codContainer').innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner"></i>Loading COD settings...</div>';
         try {
            const res = await HeelsUpAuth.api('/api/admin/shipping/cod');
            renderCodSettings(res);
         } catch (e) {
            document.getElementById('codContainer').innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load COD settings.</p></div>';
         }
      }

      function renderCodSettings(s) {
         document.getElementById('codContainer').innerHTML = `
                <div class="settings-grid">
                    <div class="setting-block">
                        <div class="setting-label">Global COD</div>
                        <label class="toggle" style="transform:scale(1.2)">
                            <input type="checkbox" id="codGlobalToggle" ${s.enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <p style="font-size:.75rem;color:var(--muted);margin-top:10px">Enable Cash on Delivery across all zones</p>
                    </div>

                    <div class="setting-block">
                        <div class="setting-label">COD Fee</div>
                        <div class="rate-editor">
                            <span>₹</span>
                            <input type="number" class="rate-input" id="codCharge" value="${s.extra_charge || 0}" style="width:100px">
                        </div>
                        <p style="font-size:.75rem;color:var(--muted);margin-top:8px">Extra charge for COD orders</p>
                    </div>

                    <div class="setting-block">
                        <div class="setting-label">Max Order Value</div>
                        <div class="rate-editor">
                            <span>₹</span>
                            <input type="number" class="form-input" id="codMaxOrder" value="${s.max_order_amount || 10000}" style="max-width:140px">
                        </div>
                        <p style="font-size:.75rem;color:var(--muted);margin-top:8px">Maximum order value for COD</p>
                    </div>

                    <div class="setting-block">
                        <div class="setting-label">Min Order Value</div>
                        <div class="rate-editor">
                            <span>₹</span>
                            <input type="number" class="form-input" id="codMinOrder" value="${s.min_order_amount || 0}" style="max-width:140px">
                        </div>
                        <p style="font-size:.75rem;color:var(--muted);margin-top:8px">Minimum order value for COD</p>
                    </div>
                </div>

                <div style="margin-top:24px">
                    <div class="setting-label" style="margin-bottom:12px"><i class="fa-solid fa-map-pin" style="color:var(--primary)"></i> Zone Overrides</div>
                    <div id="codZoneSettings"><div class="loading-state"><i class="fa-solid fa-spinner"></i></div></div>
                </div>
            `;
         loadCodZoneSettings(s.zone_overrides || {});
      }

      async function loadCodZoneSettings(overrides) {
         if (!allZones.length) {
            try {
               const r = await HeelsUpAuth.api('/api/admin/shipping/zones');
               allZones = r.zones || [];
            } catch (e) { }
         }

         if (!allZones.length) {
            document.getElementById('codZoneSettings').innerHTML = '<div class="empty-state"><i class="fa-solid fa-map-location-dot"></i><p>Create zones first.</p></div>';
            return;
         }

         document.getElementById('codZoneSettings').innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">
                    ${allZones.map(z => `
                        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-md);padding:14px;display:flex;justify-content:space-between;align-items:center">
                            <div>
                                <div style="font-size:.85rem;font-weight:700;color:var(--text)">${esc(z.name)}</div>
                                <div style="font-size:.7rem;color:var(--muted);margin-top:2px">Zone Control</div>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="cod-zone-${z.id}" ${overrides[z.id] !== false ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    `).join('')}
                </div>
            `;
      }

      async function saveCodSettings() {
         const zone_overrides = {};
         allZones.forEach(z => {
            const el = document.getElementById(`cod-zone-${z.id}`);
            if (el) zone_overrides[z.id] = el.checked;
         });

         const data = {
            enabled: document.getElementById('codGlobalToggle')?.checked ? 1 : 0,
            extra_charge: Number(document.getElementById('codCharge')?.value || 0),
            max_order_amount: Number(document.getElementById('codMaxOrder')?.value || 10000),
            min_order_amount: Number(document.getElementById('codMinOrder')?.value || 0),
            zone_overrides
         };

         try {
            await HeelsUpAuth.api('/api/admin/shipping/cod', {
               method: 'PUT',
               body: JSON.stringify(data)
            });
            showToast('COD settings saved successfully!');
            loadSummaryStats();
         } catch (e) {
            showToast(e.message || 'Failed to save COD settings.', 'error');
         }
      }

      // ── PINCODES ──────────────────────────────────────
      async function loadPincodes() {
         document.getElementById('pincodesTableBody').innerHTML = '<tr><td colspan="6"><div class="loading-state"><i class="fa-solid fa-spinner"></i>Loading pincodes...</div></td></tr>';

         const zone = document.getElementById('pincodeZoneFilter').value;
         const q = document.getElementById('pincodeSearch')?.value || '';
         const offset = (pincodePage - 1) * PINCODE_PAGE_SIZE;

         try {
            const url = `/api/admin/shipping/pincodes?limit=${PINCODE_PAGE_SIZE}&offset=${offset}${zone ? '&zone_id=' + zone : ''}${q ? '&q=' + encodeURIComponent(q) : ''}`;
            const res = await HeelsUpAuth.api(url);
            allPincodes = res.pincodes || [];
            const total = res.total || 0;

            renderPincodeTable(allPincodes);

            document.getElementById('pincodeCount').textContent = `Showing ${offset + 1}-${Math.min(offset + PINCODE_PAGE_SIZE, total)} of ${total.toLocaleString('en-IN')}`;
            document.getElementById('prevPinBtn').disabled = pincodePage <= 1;
            document.getElementById('nextPinBtn').disabled = offset + PINCODE_PAGE_SIZE >= total;

            const filterEl = document.getElementById('pincodeZoneFilter');
            if (filterEl.options.length <= 1 && (res.zones || []).length) {
               res.zones.forEach(z => {
                  const o = document.createElement('option');
                  o.value = z.id;
                  o.textContent = z.name;
                  filterEl.appendChild(o);
               });
            }
         } catch (e) {
            document.getElementById('pincodesTableBody').innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load pincodes.</p></div></td></tr>';
         }
      }

      function renderPincodeTable(pincodes) {
         const tbody = document.getElementById('pincodesTableBody');
         if (!pincodes.length) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-location-pin"></i><p>No pincodes found.</p></div></td></tr>';
            return;
         }

         tbody.innerHTML = pincodes.map(p => `
                <tr>
                    <td><span class="tbl-mono">${esc(p.pincode)}</span></td>
                    <td><span class="badge badge-zone">${esc(p.zone_name || 'Unmapped')}</span></td>
                    <td class="tbl-name">${esc(p.city || '—')}</td>
                    <td>${esc(p.state || '—')}</td>
                    <td style="color:var(--muted);font-size:.75rem">${fmtDate(p.created_at)}</td>
                    <td>
                        <button class="btn-icon btn-del" onclick="deletePincode('${esc(p.pincode)}')" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
      }

      let searchTimeout;
      function filterPincodes() {
         clearTimeout(searchTimeout);
         searchTimeout = setTimeout(() => {
            pincodePage = 1;
            loadPincodes();
         }, 400);
      }

      async function checkPincode() {
         const pin = document.getElementById('pincodeCheck').value.trim();
         const el = document.getElementById('pincodeResult');

         if (pin.length !== 6) {
            showToast('Enter a valid 6-digit pincode.', 'warning');
            return;
         }

         el.style.display = 'block';
         el.className = 'pincode-result';
         el.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

         try {
            const res = await HeelsUpAuth.api(`/api/admin/shipping/pincodes/check?pincode=${pin}`);
            if (res.serviceable) {
               el.className = 'pincode-result serviceable';
               el.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>${pin}</strong> is serviceable via <strong>${esc(res.zone_name || '—')}</strong>. Estimated delivery: <strong>${esc(res.delivery_days || '—')} days</strong>.`;
            } else {
               el.className = 'pincode-result not-serviceable';
               el.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <strong>${pin}</strong> is not serviceable.`;
            }
         } catch (e) {
            el.style.display = 'none';
            showToast('Check failed.', 'error');
         }
      }

      async function deletePincode(pincode) {
         if (!confirm(`Delete pincode ${pincode}?`)) return;
         try {
            await HeelsUpAuth.api(`/api/admin/shipping/pincodes/${pincode}`, { method: 'DELETE' });
            showToast(`Pincode ${pincode} deleted.`);
            loadPincodes();
            loadSummaryStats();
         } catch (e) {
            showToast('Failed to delete pincode.', 'error');
         }
      }

      // ── BULK CSV UPLOAD ───────────────────────────────
      function handleDragOver(e) {
         e.preventDefault();
         document.getElementById('dropZone').classList.add('drag-over');
      }

      function handleDragLeave() {
         document.getElementById('dropZone').classList.remove('drag-over');
      }

      function handleDrop(e) {
         e.preventDefault();
         document.getElementById('dropZone').classList.remove('drag-over');
         const f = e.dataTransfer.files[0];
         if (f) processCSV(f);
      }

      function handleCsvUpload(e) {
         const f = e.target.files[0];
         if (f) processCSV(f);
      }

      async function processCSV(file) {
         if (!file.name.endsWith('.csv')) {
            showToast('Please upload a valid CSV file.', 'warning');
            return;
         }

         const resEl = document.getElementById('uploadResult');
         resEl.className = 'upload-result loading';
         resEl.style.display = 'flex';
         resEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing CSV...';

         try {
            const text = await file.text();
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const header = lines[0].toLowerCase();
            const start = header.includes('pincode') ? 1 : 0;

            const rows = [];
            for (let i = start; i < lines.length; i++) {
               const cols = lines[i].split(',');
               if (cols[0] && cols[0].trim().length === 6 && /^\d+$/.test(cols[0].trim())) {
                  rows.push({
                     pincode: cols[0].trim(),
                     zone_id: cols[1] ? Number(cols[1].trim()) : null,
                     city: cols[2] ? cols[2].trim() : '',
                     state: cols[3] ? cols[3].trim() : ''
                  });
               }
            }

            if (!rows.length) {
               resEl.className = 'upload-result error';
               resEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> No valid pincodes found in CSV.';
               return;
            }

            resEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${rows.length} pincodes...`;

            const res = await HeelsUpAuth.api('/api/admin/shipping/pincodes/bulk', {
               method: 'POST',
               body: JSON.stringify({ pincodes: rows })
            });

            resEl.className = 'upload-result success';
            resEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Successfully imported ${res.inserted || rows.length} pincodes!${res.skipped ? ` (${res.skipped} duplicates skipped)` : ''}`;

            showToast('CSV uploaded successfully!');
            pincodePage = 1;
            loadPincodes();
            loadSummaryStats();
         } catch (e) {
            resEl.className = 'upload-result error';
            resEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Upload failed: ${esc(e.message)}`;
            showToast('CSV upload failed.', 'error');
         }
      }

      function downloadSample() {
         const csv = 'pincode,zone_id,city,state\n302001,1,Jaipur,Rajasthan\n342001,1,Jodhpur,Rajasthan\n110001,2,New Delhi,Delhi\n400001,2,Mumbai,Maharashtra';
         const blob = new Blob([csv], { type: 'text/csv' });
         const a = document.createElement('a');
         a.href = URL.createObjectURL(blob);
         a.download = 'heelsup_pincode_sample.csv';
         a.click();
      }

      // Close modals on backdrop click
      ['zoneModal', 'courierModal'].forEach(id => {
         document.getElementById(id).addEventListener('click', function (e) {
            if (e.target === this) this.classList.remove('show');
         });
      });