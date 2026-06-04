// â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const user = HeelsUpAuth.getUser();
      if (!user || user.role !== 'admin') { window.location = 'login.html?redirect=admin-taxes.html'; }
      const uname = (user?.firstName || user?.first_name || 'Admin');
      document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
      document.getElementById('s-name').textContent = uname;

      // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      let taxRules = [];
      let editingRuleId = null;

      // DEFAULT RULES â€” used as fallback if API returns empty
      const DEFAULT_RULES = [
         { id: 1, category: 'heels', category_label: 'Heels', hsn_code: '6402', tax_rate: 5, condition_type: 'lte', condition_amount: 1000, notes: 'GST Council â€” footwear â‰¤ â‚¹1,000', is_active: 1 },
         { id: 2, category: 'heels', category_label: 'Heels', hsn_code: '6402', tax_rate: 18, condition_type: 'gt', condition_amount: 1000, notes: 'GST Council â€” footwear > â‚¹1,000', is_active: 1 },
         { id: 3, category: 'flats', category_label: 'Flats', hsn_code: '6402', tax_rate: 5, condition_type: 'lte', condition_amount: 1000, notes: 'Footwear â‰¤ â‚¹1,000', is_active: 1 },
         { id: 4, category: 'flats', category_label: 'Flats', hsn_code: '6402', tax_rate: 18, condition_type: 'gt', condition_amount: 1000, notes: 'Footwear > â‚¹1,000', is_active: 1 },
         { id: 5, category: 'sandals', category_label: 'Sandals', hsn_code: '6402', tax_rate: 5, condition_type: 'lte', condition_amount: 1000, notes: 'Footwear â‰¤ â‚¹1,000', is_active: 1 },
         { id: 6, category: 'sandals', category_label: 'Sandals', hsn_code: '6402', tax_rate: 18, condition_type: 'gt', condition_amount: 1000, notes: 'Footwear > â‚¹1,000', is_active: 1 },
         { id: 7, category: 'wedges', category_label: 'Wedges', hsn_code: '6402', tax_rate: 5, condition_type: 'lte', condition_amount: 1000, notes: 'Footwear â‰¤ â‚¹1,000', is_active: 1 },
         { id: 8, category: 'wedges', category_label: 'Wedges', hsn_code: '6402', tax_rate: 18, condition_type: 'gt', condition_amount: 1000, notes: 'Footwear > â‚¹1,000', is_active: 1 },
         { id: 9, category: 'bags', category_label: 'Bags', hsn_code: '4202', tax_rate: 18, condition_type: 'none', condition_amount: null, notes: 'Bags & travel accessories', is_active: 1 },
         { id: 10, category: 'clutches', category_label: 'Clutches', hsn_code: '4202', tax_rate: 18, condition_type: 'none', condition_amount: null, notes: 'Handbags & clutches', is_active: 1 },
      ];

      // â”€â”€ UI HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      function toggleSidebar() {
         const s = document.getElementById('sidebar'), o = document.getElementById('mobOverlay');
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
         t.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${msg}</span>`;
         c.appendChild(t);
         setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, 4000);
      }

      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

      function onGstToggle() {
         const on = document.getElementById('gstRegistered').checked;
         document.getElementById('gstStatusBadge').textContent = on ? 'Registered' : 'Not Registered';
         document.getElementById('gstStatusBadge').className = `badge ${on ? 'badge-active' : 'badge badge-inactive'}`;
         document.getElementById('gstFields').style.opacity = on ? '1' : '0.4';
         document.getElementById('gstFields').style.pointerEvents = on ? 'auto' : 'none';
      }
      // Badge styles for not-registered
      const style = document.createElement('style');
      style.textContent = '.badge-inactive{background:#f1f5f9;color:#64748b;}';
      document.head.appendChild(style);

      // â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      async function loadTaxSettings() {
         document.getElementById('loadingState').style.display = 'block';
         document.getElementById('mainContent').style.opacity = '0.5';
         document.getElementById('mainContent').style.pointerEvents = 'none';

         try {
            const [settingsRes, rulesRes] = await Promise.all([
               HeelsUpAuth.api('/api/admin/taxes/settings').catch(() => null),
               HeelsUpAuth.api('/api/admin/taxes/rules').catch(() => null)
            ]);

            // Populate GST settings
            const s = settingsRes || {};
            document.getElementById('gstRegistered').checked = s.gst_registered !== false;
            document.getElementById('gstInclusive').checked = !!s.gst_inclusive;
            document.getElementById('autoFootwearSlab').checked = s.auto_footwear_slab !== false;
            document.getElementById('gstinNumber').value = s.gstin_number || '';
            document.getElementById('businessName').value = s.business_name || '';
            document.getElementById('gstState').value = s.gst_state || 'RJ';
            document.getElementById('defaultTaxRate').value = s.default_tax_rate ?? '18';
            document.getElementById('invoicePrefix').value = s.invoice_prefix || 'HU-INV';
            document.getElementById('fyStart').value = s.fy_start || 'april';
            document.getElementById('invoiceNote').value = s.invoice_note || '';
            document.getElementById('showGstBreakup').checked = s.show_gst_breakup !== false;
            document.getElementById('showHsnCode').checked = !!s.show_hsn_code;
            document.getElementById('autoInvoicePdf').checked = !!s.auto_invoice_pdf;

            onGstToggle();

            // Populate rules â€” use API data or defaults if empty
            const apiRules = rulesRes?.rules || rulesRes || [];
            taxRules = apiRules.length ? apiRules : DEFAULT_RULES;
            renderRulesTable();

            // Load orders badge
            loadOrdersBadge();

         } catch (e) {
            showToast('Could not load tax settings.', 'error');
            // Still show defaults
            taxRules = DEFAULT_RULES;
            renderRulesTable();
         } finally {
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('mainContent').style.opacity = '1';
            document.getElementById('mainContent').style.pointerEvents = 'auto';
         }
      }

      async function loadOrdersBadge() {
         try {
            const r = await HeelsUpAuth.api('/api/admin/orders');
            const pend = (r.orders || []).filter(o => o.order_status === 'placed').length;
            if (pend > 0) { const b = document.getElementById('ordersBadge'); b.textContent = pend; b.style.display = 'inline-block'; }
         } catch (e) { }
      }

      // â”€â”€ RENDER RULES TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      function renderRulesTable() {
         const tbody = document.getElementById('taxRulesBody');
         if (!taxRules.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No tax rules configured. Click "Add Rule" to get started.</td></tr>`;
            return;
         }

         const catLabels = { heels: 'Heels', flats: 'Flats', sandals: 'Sandals', wedges: 'Wedges', bags: 'Bags', clutches: 'Clutches', accessories: 'Accessories', all: 'All Categories' };
         const catIcons = { heels: 'fa-shoe-prints', flats: 'fa-person-walking', sandals: 'fa-person-walking', wedges: 'fa-shoe-prints', bags: 'fa-bag-shopping', clutches: 'fa-bag-shopping', accessories: 'fa-gem', all: 'fa-layer-group' };

         tbody.innerHTML = taxRules.map(r => {
            const catLabel = r.category_label || catLabels[r.category] || r.category;
            const icon = catIcons[r.category] || 'fa-tag';
            const rate = Number(r.tax_rate);
            const rateColor = rate === 0 ? '#64748b' : rate <= 5 ? '#15803d' : rate <= 12 ? '#0284c7' : '#d97706';

            let condition = 'â€”';
            if (r.condition_type === 'lte' && r.condition_amount) condition = `Price â‰¤ â‚¹${Number(r.condition_amount).toLocaleString('en-IN')}`;
            if (r.condition_type === 'gt' && r.condition_amount) condition = `Price > â‚¹${Number(r.condition_amount).toLocaleString('en-IN')}`;

            return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:8px;background:rgba(201,169,110,.1);color:var(--gold-dark);display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0;">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div>
              <div class="tbl-name">${esc(catLabel)}</div>
              ${r.notes ? `<div class="tbl-sub">${esc(r.notes)}</div>` : ''}
            </div>
          </div>
        </td>
        <td><code style="background:#f8fafc;padding:3px 8px;border-radius:5px;font-size:.82rem;color:var(--text);border:1px solid var(--border);">${esc(r.hsn_code || 'â€”')}</code></td>
        <td>
          <span style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:${rateColor};">${rate}%</span>
          <div style="font-size:.68rem;color:var(--muted);margin-top:2px;">
            ${rate === 0 ? 'Nil / Exempt' : rate === 5 ? 'CGST 2.5% + SGST 2.5%' : rate === 12 ? 'CGST 6% + SGST 6%' : rate === 18 ? 'CGST 9% + SGST 9%' : 'CGST 14% + SGST 14%'}
          </div>
        </td>
        <td style="color:var(--muted);font-size:.82rem;">${condition}</td>
        <td>
          <label class="toggle" style="transform:scale(0.9);">
            <input type="checkbox" ${r.is_active ? 'checked' : ''} onchange="toggleRule(${r.id}, this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <div class="act-cell">
            <button class="btn-icon btn-edit" onclick='editRule(${JSON.stringify(r)})' title="Edit Rule"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon btn-del" onclick="deleteRule(${r.id})" title="Delete Rule"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
         }).join('');
      }

      // â”€â”€ RULE MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      function openRuleModal() {
         editingRuleId = null;
         document.getElementById('ruleForm').reset();
         document.getElementById('chkRuleActive').checked = true;
         document.getElementById('ruleModalTitle').innerHTML = '<i class="fa-solid fa-plus" style="color:var(--gold)"></i> Add Tax Rule';
         document.getElementById('saveRuleBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Rule';
         document.getElementById('ruleModal').classList.add('show');
      }

      function editRule(r) {
         editingRuleId = r.id;
         const f = document.getElementById('ruleForm');
         f.category.value = r.category || '';
         f.hsn_code.value = r.hsn_code || '';
         f.tax_rate.value = String(r.tax_rate);
         f.condition_type.value = r.condition_type || 'none';
         f.condition_amount.value = r.condition_amount || '';
         f.notes.value = r.notes || '';
         document.getElementById('chkRuleActive').checked = !!r.is_active;
         document.getElementById('ruleModalTitle').innerHTML = '<i class="fa-solid fa-pen" style="color:var(--gold)"></i> Edit Tax Rule';
         document.getElementById('saveRuleBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Rule';
         document.getElementById('ruleModal').classList.add('show');
      }

      function closeRuleModal() { document.getElementById('ruleModal').classList.remove('show'); }

      async function saveRule(e) {
         e.preventDefault();
         const f = e.target;
         const btn = document.getElementById('saveRuleBtn');
         btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

         const catLabels = { heels: 'Heels', flats: 'Flats', sandals: 'Sandals', wedges: 'Wedges', bags: 'Bags', clutches: 'Clutches', accessories: 'Accessories', all: 'All Categories' };

         const data = {
            category: f.category.value,
            category_label: catLabels[f.category.value] || f.category.value,
            hsn_code: f.hsn_code.value.trim(),
            tax_rate: Number(f.tax_rate.value),
            rate: Number(f.tax_rate.value),
            name: `GST ${f.tax_rate.value}% (${catLabels[f.category.value] || f.category.value})`,
            active: f.is_active.checked ? 1 : 0,
            is_active: f.is_active.checked ? 1 : 0,
            condition_type: f.condition_type.value,
            condition_amount: f.condition_amount.value ? Number(f.condition_amount.value) : null,
            notes: f.notes.value.trim()
         };

         try {
            if (editingRuleId) {
               await HeelsUpAuth.api(`/api/admin/taxes/rules/${editingRuleId}`, { method: 'PUT', body: JSON.stringify(data) });
               const idx = taxRules.findIndex(r => r.id === editingRuleId);
               if (idx !== -1) taxRules[idx] = { ...taxRules[idx], ...data };
               showToast('Tax rule updated.');
            } else {
               const res = await HeelsUpAuth.api('/api/admin/taxes/rules', { method: 'POST', body: JSON.stringify(data) });
               taxRules.push({ id: res.id || Date.now(), ...data });
               showToast('Tax rule added.', 'success');
            }
            closeRuleModal();
            renderRulesTable();
         } catch (err) {
            showToast(err.message || 'Failed to save rule.', 'error');
         } finally {
            btn.disabled = false;
            btn.innerHTML = editingRuleId ? '<i class="fa-solid fa-floppy-disk"></i> Update Rule' : '<i class="fa-solid fa-floppy-disk"></i> Save Rule';
         }
      }

      async function toggleRule(id, val) {
         try {
            await HeelsUpAuth.api(`/api/admin/taxes/rules/${id}`, { method: 'PUT', body: JSON.stringify({ active: val ? 1 : 0 }) });
            const r = taxRules.find(x => x.id === id);
            if (r) r.is_active = val ? 1 : 0;
            showToast(val ? 'Rule enabled.' : 'Rule disabled.');
         } catch (e) { showToast('Failed to update rule.', 'error'); }
      }

      async function deleteRule(id) {
         if (!confirm('Delete this tax rule? This may affect checkout tax calculations.')) return;
         try {
            await HeelsUpAuth.api(`/api/admin/taxes/rules/${id}`, { method: 'DELETE' });
            taxRules = taxRules.filter(r => r.id !== id);
            renderRulesTable();
            showToast('Rule deleted.', 'warning');
         } catch (e) { showToast('Deletion failed.', 'error'); }
      }

      // â”€â”€ SAVE ALL SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      async function saveAllSettings() {
         const btn = document.getElementById('saveAllBtn');
         btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

         // Validate GSTIN if registered
         const gstin = document.getElementById('gstinNumber').value.trim().toUpperCase();
         if (document.getElementById('gstRegistered').checked && gstin && gstin.length !== 15) {
            showToast('GSTIN must be exactly 15 characters.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save All Settings';
            return;
         }

         const payload = {
            gst_registered: document.getElementById('gstRegistered').checked,
            gst_inclusive: document.getElementById('gstInclusive').checked,
            auto_footwear_slab: document.getElementById('autoFootwearSlab').checked,
            gstin_number: gstin,
            business_name: document.getElementById('businessName').value.trim(),
            gst_state: document.getElementById('gstState').value,
            default_tax_rate: Number(document.getElementById('defaultTaxRate').value),
            invoice_prefix: document.getElementById('invoicePrefix').value.trim() || 'HU-INV',
            fy_start: document.getElementById('fyStart').value,
            invoice_note: document.getElementById('invoiceNote').value.trim(),
            show_gst_breakup: document.getElementById('showGstBreakup').checked,
            show_hsn_code: document.getElementById('showHsnCode').checked,
            auto_invoice_pdf: document.getElementById('autoInvoicePdf').checked,
         };

         try {
            await HeelsUpAuth.api('/api/admin/taxes/settings', { method: 'PUT', body: JSON.stringify(payload) });
            showToast('Tax settings saved successfully.', 'success');
         } catch (err) {
            showToast(err.message || 'Failed to save settings.', 'error');
         } finally {
            btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save All Settings';
         }
      }

      // Close modals on backdrop click
      document.getElementById('ruleModal').addEventListener('click', function (e) {
         if (e.target === this) this.classList.remove('show');
      });

      // â”€â”€ BOOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      document.addEventListener('DOMContentLoaded', loadTaxSettings);