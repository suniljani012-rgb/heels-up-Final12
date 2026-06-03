// ── AUTH ──────────────────────────────────────────────────────────────────
        (function () {
            let user = null;
            try { user = (typeof HeelsUpAuth !== 'undefined') ? HeelsUpAuth.getUser() : null; } catch (e) { }
            if (!user || user.role !== 'admin') {
                const el = document.createElement('div');
                el.className = 'auth-error';
                el.innerHTML = `<i class="fa-solid fa-shield-exclamation"></i><h2>Access Denied</h2><p>You must be logged in as an admin to view this page.</p><a href="login.html?redirect=admin-inventory.html" class="btn btn-primary" style="margin-top:8px"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login</a>`;
                document.body.appendChild(el);
                return;
            }
            const name = user.firstName || user.first_name || 'Admin';
            document.getElementById('sAvatar').textContent = name.charAt(0).toUpperCase();
            document.getElementById('sName').textContent = name;
        })();

        // ── STATE ─────────────────────────────────────────────────────────────────
        let allInventory = [], filtered = [], selectedIds = new Set();
        let currentPage = 1, pageSize = 10, currentView = 'all';
        let adjustmentHistory = [];

        const $ = id => document.getElementById(id);
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const fmtRs = v => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
        const fmtNum = v => (Number(v) || 0).toLocaleString('en-IN');

        // ── SIDEBAR ───────────────────────────────────────────────────────────────
        function toggleSidebar() { const s = $('sidebar'), o = $('mobOverlay'); s.classList.toggle('open'); o.style.display = s.classList.contains('open') ? 'block' : 'none'; }
        function closeSidebar() { $('sidebar').classList.remove('open'); $('mobOverlay').style.display = 'none'; }
        function doLogout() { try { HeelsUpAuth.clearSession(); } catch (e) { } window.location = 'login.html'; }

        // ── TOAST ─────────────────────────────────────────────────────────────────
        function toast(msg, type = 'success') {
            const wrap = $('toastWrap'), t = document.createElement('div');
            t.className = `toast ${type}`;
            const icon = type === 'error' ? 'fa-circle-xmark' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check';
            t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
            wrap.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 4500);
        }

        // ── LOAD ──────────────────────────────────────────────────────────────────
        async function loadInventory() {
            $('invTableBody').innerHTML = '<tr><td colspan="10"><div class="spinner-wrap"><i class="fa-solid fa-spinner"></i>Loading live inventory...</div></td></tr>';
            try {
                const t0 = performance.now();
                const data = await HeelsUpAuth.api('/api/admin/products');
                allInventory = Array.isArray(data) ? data : (data.products || []);
                const ms = (performance.now() - t0).toFixed(1);
                $('heroSub').textContent = `${allInventory.length} SKUs loaded in ${ms}ms · Track stock, manage quantities & valuation`;
                populateCategoryFilter();
                populateProductDropdown();
                updateKPIs();
                applyFilters();
                renderLowStockReport();
            } catch (e) {
                toast('Failed to load inventory: ' + (e.message || 'Network error'), 'error');
                $('invTableBody').innerHTML = `<tr><td colspan="10">
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);opacity:1"></i>
        <h3 style="color:var(--danger)">Failed to load inventory</h3>
        <p>Check your connection and try again.</p>
        <button class="btn btn-sm btn-outline" onclick="loadInventory()" style="margin-top:12px"><i class="fa-solid fa-arrows-rotate"></i> Retry</button>
      </div>
    </td></tr>`;
            }
        }

        // ── KPIs ──────────────────────────────────────────────────────────────────
        function updateKPIs() {
            let units = 0, value = 0, outCnt = 0, lowCnt = 0;
            allInventory.forEach(p => {
                const s = parseInt(p.stock) || 0;
                const pr = parseFloat(p.price) || 0;
                units += s;
                value += s * pr;
                if (s === 0) outCnt++;
                else if (s <= 10) lowCnt++;
            });
            $('kpiUnits').textContent = fmtNum(units);
            $('kpiValue').textContent = value >= 100000 ? '₹' + (value / 100000).toFixed(1) + 'L' : fmtRs(value);
            $('kpiOut').textContent = outCnt;
            $('kpiLow').textContent = lowCnt;
            $('kpiSkus').textContent = allInventory.length;
            $('kpiSkuSub').textContent = `${allInventory.filter(p => p.active !== false).length} active`;

            // Alert banner
            const urgentCount = outCnt + lowCnt;
            if (urgentCount > 0) {
                $('lowStockAlert').style.display = 'flex';
                $('lowStockAlertText').textContent = `${urgentCount} item${urgentCount > 1 ? 's' : ''}`;
            } else {
                $('lowStockAlert').style.display = 'none';
            }
        }

        // ── CATEGORY FILTER ───────────────────────────────────────────────────────
        function populateCategoryFilter() {
            const cats = [...new Set(allInventory.map(p => p.category || '').filter(Boolean))].sort();
            $('catFilter').innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        }

        function populateProductDropdown() {
            const sel = $('addStockProduct');
            sel.innerHTML = '<option value="">-- Select product --</option>' + allInventory.map(p => `<option value="${p.id}">${esc(p.name || 'Product #' + p.id)} (Stock: ${p.stock || 0})</option>`).join('');
        }

        // ── VIEW TABS ─────────────────────────────────────────────────────────────
        function setView(view, btn) {
            currentView = view;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPage = 1;
            applyFilters();
        }

        function filterByLow() {
            setView('lowstock', document.querySelectorAll('.tab-btn')[2]);
        }

        // ── FILTERS ───────────────────────────────────────────────────────────────
        function applyFilters() {
            const q = ($('searchInput').value || '').toLowerCase();
            const cat = $('catFilter').value;
            const sort = $('sortFilter').value;

            filtered = allInventory.filter(p => {
                const s = parseInt(p.stock) || 0;
                const matchQ = !q || (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
                const matchCat = !cat || (p.category || '').trim() === cat;
                let matchView = true;
                if (currentView === 'instock') matchView = s > 10;
                else if (currentView === 'lowstock') matchView = s > 0 && s <= 10;
                else if (currentView === 'outstock') matchView = s === 0;
                return matchQ && matchCat && matchView;
            });

            // Sort
            if (sort === 'stock_asc') filtered.sort((a, b) => (parseInt(a.stock) || 0) - (parseInt(b.stock) || 0));
            else if (sort === 'stock_desc') filtered.sort((a, b) => (parseInt(b.stock) || 0) - (parseInt(a.stock) || 0));
            else if (sort === 'value_desc') filtered.sort((a, b) => ((parseInt(b.stock) || 0) * (parseFloat(b.price) || 0)) - ((parseInt(a.stock) || 0) * (parseFloat(a.price) || 0)));
            else if (sort === 'name_asc') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            currentPage = 1;
            renderTable();
        }

        // ── RENDER TABLE ──────────────────────────────────────────────────────────
        function renderTable() {
            const start = (currentPage - 1) * pageSize;
            const page = filtered.slice(start, start + pageSize);
            const tbody = $('invTableBody');

            $('resultCount').textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;

            if (!page.length) {
                tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fa-solid fa-box-open"></i><h3>No items found</h3><p>Try adjusting your filters or search term.</p></div></td></tr>`;
                $('pagination').innerHTML = '';
                return;
            }

            tbody.innerHTML = page.map(p => {
                const stock = parseInt(p.stock) || 0;
                const price = parseFloat(p.price) || 0;
                const rowVal = stock * price;
                const maxStock = Math.max(...allInventory.map(x => parseInt(x.stock) || 0), 1);

                let stockClass = 'stock-in', dotColor = 'var(--teal)', rowStyle = '';
                if (stock === 0) { stockClass = 'stock-out'; dotColor = 'var(--danger)'; rowStyle = 'opacity:.75;'; }
                else if (stock <= 10) { stockClass = 'stock-low'; dotColor = 'var(--warning)'; }

                const isSelected = selectedIds.has(p.id);
                const imgHtml = p.image_url
                    ? `<img src="${esc(p.image_url)}" class="prod-img" onerror="this.outerHTML='<div class=\\'prod-img-placeholder\\'><i class=\\'fa-solid fa-box\\'></i></div>'">`
                    : `<div class="prod-img-placeholder"><i class="fa-solid fa-box"></i></div>`;

                return `<tr style="${rowStyle}${isSelected ? 'background:#FFF7F0;' : ''}" id="row_${p.id}">
      <td><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelect(${p.id},this)" style="accent-color:var(--primary)"></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${imgHtml}
          <div>
            <div class="td-name">${esc(p.name || '—')}</div>
            <div class="td-sub">ID: #${p.id}${p.active === false ? ' · <span style="color:var(--muted)">Hidden</span>' : ''}</div>
          </div>
        </div>
      </td>
      <td><span class="td-mono">${esc(p.sku || 'N/A')}</span></td>
      <td style="font-size:.82rem">${esc(p.category || 'Uncategorized')}</td>
      <td class="td-r" style="font-weight:700">${fmtRs(price)}</td>
      <td class="td-r">
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
          <div style="display:flex;align-items:center;gap:5px">
            <span class="stock-dot" style="background:${dotColor}"></span>
            <span class="stock-qty" style="color:${dotColor}">${fmtNum(stock)}</span>
          </div>
          <div class="mini-progress"><div class="mini-fill" style="width:${Math.min(100, (stock / Math.max(maxStock, 1)) * 100).toFixed(0)}%;background:${dotColor}"></div></div>
        </div>
      </td>
      <td class="td-r" style="font-size:.82rem;font-weight:600">${fmtRs(rowVal)}</td>
      <td class="td-c"><span class="badge ${stockClass === 'stock-in' ? 'badge-active' : stockClass === 'stock-out' ? '' : ''}
        " style="${stockClass === 'stock-low' ? 'background:#FEF3C7;color:#92400E' : ''}">
        ${stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'In Stock'}</span></td>
      <td class="td-r">
        <div class="qty-group">
          <input type="number" class="qty-input" id="qi_${p.id}" value="${stock}" min="0">
          <button class="qty-save-btn" id="qb_${p.id}" onclick="quickSave(${p.id})">Save</button>
        </div>
      </td>
      <td class="td-c">
        <div style="display:flex;gap:4px;justify-content:center">
          <button class="action-btn" title="Adjust Stock" onclick="openAdjustModal(${p.id})"><i class="fa-solid fa-sliders"></i></button>
          <button class="action-btn" title="Size Stock" onclick="openSizeStockModal(${p.id})" style="color:var(--blue)"><i class="fa-solid fa-ruler-vertical"></i></button>
          <button class="action-btn" title="Edit Product" onclick="window.location='admin-products.html?edit=${p.id}'"><i class="fa-regular fa-pen-to-square"></i></button>
        </div>
      </td>
    </tr>`;
            }).join('');

            renderPagination();
        }

        // ── QUICK SAVE (inline) ───────────────────────────────────────────────────
        async function quickSave(id) {
            const inputEl = $('qi_' + id), btnEl = $('qb_' + id);
            const newStock = parseInt(inputEl.value, 10);
            if (isNaN(newStock) || newStock < 0) { toast('Invalid quantity', 'warning'); return; }
            const item = allInventory.find(p => p.id === id);
            if (!item) { return; }
            const oldStock = parseInt(item.stock) || 0;
            if (oldStock === newStock) { toast('No change detected', 'warning'); return; }

            btnEl.disabled = true; btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                await HeelsUpAuth.api(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ stock: newStock }) });
                addHistory(item.name || 'Product #' + id, oldStock, newStock, 'Quick adjust');
                item.stock = newStock;
                updateKPIs();
                applyFilters();
                renderLowStockReport();
                toast(`Stock updated to ${newStock}`);
            } catch (e) {
                toast(e.message || 'Failed to update stock', 'error');
                inputEl.value = oldStock;
            } finally {
                if ($('qb_' + id)) { $('qb_' + id).disabled = false; $('qb_' + id).innerHTML = 'Save'; }
            }
        }

        // ── SELECT / CHECKBOX ─────────────────────────────────────────────────────
        function toggleSelect(id, cb) { if (cb.checked) selectedIds.add(id); else selectedIds.delete(id); $('bulkSelCount').textContent = selectedIds.size; }
        function toggleSelectAll(cb) {
            const page = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
            page.forEach(p => { if (cb.checked) selectedIds.add(p.id); else selectedIds.delete(p.id); });
            renderTable();
            $('bulkSelCount').textContent = selectedIds.size;
        }

        // ── LOW STOCK REPORT ──────────────────────────────────────────────────────
        function renderLowStockReport() {
            const lowItems = allInventory.filter(p => (parseInt(p.stock) || 0) <= 10).sort((a, b) => (parseInt(a.stock) || 0) - (parseInt(b.stock) || 0)).slice(0, 8);
            $('lowStockCount').textContent = lowItems.length + ' items';
            if (!lowItems.length) {
                $('lowStockList').innerHTML = '<div style="text-align:center;padding:24px;color:var(--teal);font-size:.83rem"><i class="fa-solid fa-circle-check fa-lg" style="display:block;margin-bottom:8px"></i>All products are well-stocked!</div>';
                return;
            }
            $('lowStockList').innerHTML = lowItems.map(p => {
                const s = parseInt(p.stock) || 0;
                const color = s === 0 ? 'var(--danger)' : 'var(--warning)';
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #F5F7FA">
      <div style="display:flex;align-items:center;gap:9px">
        ${p.image_url ? `<img src="${esc(p.image_url)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover" onerror="this.style.display='none'">` : ''}
        <div><div style="font-size:.82rem;font-weight:600">${esc(p.name || '—')}</div><div style="font-size:.7rem;color:var(--muted)">${esc(p.sku || 'N/A')}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:1rem;font-weight:800;color:${color}">${s}</span>
        <button class="btn btn-sm" style="background:rgba(242,159,103,.12);color:var(--primary-dark);font-size:.7rem;padding:4px 9px" onclick="openAdjustModal(${p.id})"><i class="fa-solid fa-plus"></i> Restock</button>
      </div>
    </div>`;
            }).join('');
        }

        // ── HISTORY ───────────────────────────────────────────────────────────────
        function addHistory(name, oldStock, newStock, reason) {
            const diff = newStock - oldStock;
            adjustmentHistory.unshift({ name, oldStock, newStock, diff, reason, time: new Date() });
            adjustmentHistory = adjustmentHistory.slice(0, 20);
            renderHistory();
        }
        function renderHistory() {
            if (!adjustmentHistory.length) { $('historyList').innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted);font-size:.83rem"><i class="fa-solid fa-inbox" style="display:block;margin-bottom:8px;font-size:1.5rem;opacity:.3"></i>No adjustments yet</div>'; return; }
            $('historyList').innerHTML = adjustmentHistory.map(h => {
                const iconClass = h.diff > 0 ? 'history-add' : h.diff < 0 ? 'history-remove' : 'history-adjust';
                const icon = h.diff > 0 ? 'fa-arrow-up' : h.diff < 0 ? 'fa-arrow-down' : 'fa-equals';
                const diffText = h.diff > 0 ? `+${h.diff}` : String(h.diff);
                const diffColor = h.diff > 0 ? 'var(--teal)' : h.diff < 0 ? 'var(--danger)' : 'var(--blue)';
                const time = h.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                return `<div class="history-item">
      <div class="history-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(h.name)}</div>
        <div style="font-size:.72rem;color:var(--muted)">${h.oldStock} → ${h.newStock} · ${esc(h.reason || 'Manual')} · ${time}</div>
      </div>
      <span style="font-weight:800;font-size:.85rem;color:${diffColor};flex-shrink:0">${diffText}</span>
    </div>`;
            }).join('');
        }
        function clearHistory() { adjustmentHistory = []; renderHistory(); toast('History cleared', 'success'); }

        // ── PAGINATION ────────────────────────────────────────────────────────────
        function renderPagination() {
            const total = filtered.length, pages = Math.ceil(total / pageSize);
            const el = $('pagination');
            if (pages <= 1) { el.innerHTML = ''; return; }
            let html = `<button class="pg-btn" onclick="gotoPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            let start = Math.max(1, currentPage - 2), end = Math.min(pages, currentPage + 2);
            if (start > 1) html += `<button class="pg-btn" onclick="gotoPage(1)">1</button>${start > 2 ? '<span class="pg-info">…</span>' : ''}`;
            for (let i = start; i <= end; i++) html += `<button class="pg-btn ${i === currentPage ? 'active' : ''}" onclick="gotoPage(${i})">${i}</button>`;
            if (end < pages) html += `${end < pages - 1 ? '<span class="pg-info">…</span>' : ''}<button class="pg-btn" onclick="gotoPage(${pages})">${pages}</button>`;
            html += `<button class="pg-btn" onclick="gotoPage(${currentPage + 1})" ${currentPage >= pages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            html += `<span class="pg-info">${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} of ${total}</span>`;
            el.innerHTML = html;
        }
        function gotoPage(p) { const pages = Math.ceil(filtered.length / pageSize); if (p < 1 || p > pages) return; currentPage = p; renderTable(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

        // ── ADJUST MODAL ──────────────────────────────────────────────────────────
        function openAdjustModal(id) {
            const item = allInventory.find(p => p.id === id);
            if (!item) return;
            $('addStockTitle').textContent = `Adjust: ${item.name || 'Product'}`;
            $('addStockProduct').value = id;
            $('addStockQty').value = '';
            $('addStockNote').value = '';
            $('addStockPreview').style.display = 'none';
            $('addStockModal').classList.add('show');
        }
        function openAddStockModal() { $('addStockTitle').textContent = 'Add / Adjust Stock'; $('addStockProduct').value = ''; $('addStockQty').value = ''; $('addStockNote').value = ''; $('addStockPreview').style.display = 'none'; $('addStockModal').classList.add('show'); }
        function closeAddStockModal() { $('addStockModal').classList.remove('show'); }

        // Live preview
        ['addStockProduct', 'addStockType', 'addStockQty'].forEach(id => {
            const el = $(id); if (el) el.addEventListener('change', updateStockPreview);
        });
        function updateStockPreview() {
            const pid = parseInt($('addStockProduct').value || 0);
            const item = allInventory.find(p => p.id === pid);
            const type = $('addStockType').value;
            const qty = parseInt($('addStockQty').value || 0);
            if (!item || !qty) { $('addStockPreview').style.display = 'none'; return; }
            const cur = parseInt(item.stock) || 0;
            let newVal = type === 'add' ? cur + qty : type === 'subtract' ? Math.max(0, cur - qty) : qty;
            $('addStockPreviewText').innerHTML = `Current: <strong>${cur}</strong> → New: <strong style="color:var(--primary)">${newVal}</strong>`;
            $('addStockPreview').style.display = 'block';
        }

        async function saveStockAdjustment() {
            const pid = parseInt($('addStockProduct').value || 0);
            const type = $('addStockType').value;
            const qty = parseInt($('addStockQty').value || 0);
            const note = $('addStockNote').value.trim();
            if (!pid) { toast('Select a product', 'warning'); return; }
            if (!qty || qty < 0) { toast('Enter a valid quantity', 'warning'); return; }
            const item = allInventory.find(p => p.id === pid);
            if (!item) return;
            const oldStock = parseInt(item.stock) || 0;
            let newStock = type === 'add' ? oldStock + qty : type === 'subtract' ? Math.max(0, oldStock - qty) : qty;

            try {
                await HeelsUpAuth.api(`/api/admin/products/${pid}`, { method: 'PATCH', body: JSON.stringify({ stock: newStock }) });
                addHistory(item.name || 'Product #' + pid, oldStock, newStock, note || 'Manual adjustment');
                item.stock = newStock;
                updateKPIs();
                applyFilters();
                renderLowStockReport();
                closeAddStockModal();
                toast(`Stock updated: ${oldStock} → ${newStock}`);
            } catch (e) {
                toast(e.message || 'Failed to update stock', 'error');
            }
        }

        // ── BULK MODAL ────────────────────────────────────────────────────────────
        function openBulkModal() { $('bulkSelCount').textContent = selectedIds.size; $('bulkModal').classList.add('show'); }
        function closeBulkModal() { $('bulkModal').classList.remove('show'); }

        async function applyBulkUpdate() {
            const action = $('bulkAction').value;
            const qty = parseInt($('bulkQty').value || 0);
            const target = $('bulkTarget').value;
            const note = $('bulkNote').value.trim() || 'Bulk update';
            if (!qty || qty < 0) { toast('Enter a valid quantity', 'warning'); return; }

            let targets = [];
            if (target === 'selected') targets = allInventory.filter(p => selectedIds.has(p.id));
            else if (target === 'lowstock') targets = allInventory.filter(p => { const s = parseInt(p.stock) || 0; return s > 0 && s <= 10; });
            else if (target === 'outstock') targets = allInventory.filter(p => (parseInt(p.stock) || 0) === 0);
            else targets = [...allInventory];

            if (!targets.length) { toast('No items match target selection', 'warning'); return; }

            let success = 0, fail = 0;
            for (const item of targets) {
                const oldStock = parseInt(item.stock) || 0;
                let newStock = action === 'add' ? oldStock + qty : action === 'subtract' ? Math.max(0, oldStock - qty) : qty;
                try {
                    await HeelsUpAuth.api(`/api/admin/products/${item.id}`, { method: 'PATCH', body: JSON.stringify({ stock: newStock }) });
                    addHistory(item.name || 'Product', oldStock, newStock, note);
                    item.stock = newStock;
                    success++;
                } catch (e) { fail++; }
            }
            updateKPIs(); applyFilters(); renderLowStockReport();
            closeBulkModal(); selectedIds.clear();
            toast(`Bulk update: ${success} updated${fail ? `, ${fail} failed` : ''}`);
        }

        // ── EXPORT CSV ────────────────────────────────────────────────────────────
        function exportCSV() {
            if (!allInventory.length) { toast('No data to export', 'warning'); return; }
            const rows = [['ID', 'Name', 'SKU', 'Category', 'Price', 'Stock', 'Value', 'Status']];
            allInventory.forEach(p => {
                const s = parseInt(p.stock) || 0, pr = parseFloat(p.price) || 0;
                const status = s === 0 ? 'Out of Stock' : s <= 10 ? 'Low Stock' : 'In Stock';
                rows.push([p.id, p.name || '', p.sku || '', p.category || '', pr, s, (s * pr).toFixed(2), status]);
            });
            const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `heelsup-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            toast('Inventory exported as CSV');
        }

        // ── INIT ──────────────────────────────────────────────────────────────────

        // Size Stock Modal Logic
        let _sizeStockProductId = null;
        let _sizeStockData = {};

        async function openSizeStockModal(id) {
            const item = allInventory.find(p => p.id === id);
            if (!item) return;
            _sizeStockProductId = id;
            _sizeStockData = {};
            $('sizeStockProductName').textContent = item.name || 'Product #' + id;
            $('sizeStockBody').innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted)"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Loading size stock...</div>';
            $('sizeStockModal').classList.add('show');
            try {
                const data = await HeelsUpAuth.api(`/api/products/${id}/size-stock`);
                const sizeStock = data.size_stock || data.data || [];
                sizeStock.forEach(row => { _sizeStockData[String(row.size_label)] = row.stock; });
                const sizeList = (item.sizes || []).map(String);
                renderSizeStockForm(sizeList.length > 0 ? sizeList : ['36','37','38','39','40','41']);
            } catch (e) {
                const sizeList = (item.sizes || []).map(String);
                renderSizeStockForm(sizeList.length > 0 ? sizeList : ['36','37','38','39','40','41']);
            }
        }

        function renderSizeStockForm(sizeList) {
            const rows = sizeList.map(sz => {
                const cur = _sizeStockData[sz] !== undefined ? _sizeStockData[sz] : '';
                return `<div style="display:flex;flex-direction:column;gap:5px;align-items:center;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:8px;padding:10px"><label style="font-size:.82rem;font-weight:700">${sz}</label><input type="number" class="form-input" id="ss_${sz}" value="${cur}" min="0" placeholder="0" style="width:72px;text-align:center;font-size:1.1rem;font-weight:700"></div>`;
            }).join('');
            $('sizeStockBody').innerHTML = `<p style="font-size:.8rem;color:var(--muted);margin-bottom:14px">Set stock per size. 0 = out of stock for that size.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px">${rows}</div>`;
        }

        function closeSizeStockModal() {
            $('sizeStockModal').classList.remove('show');
            _sizeStockProductId = null;
        }

        async function saveSizeStock() {
            if (!_sizeStockProductId) return;
            const item = allInventory.find(p => p.id === _sizeStockProductId);
            if (!item) return;
            const sizeList = (item.sizes || []).map(String);
            const defaultSizes = sizeList.length > 0 ? sizeList : ['36','37','38','39','40','41'];
            const stockMap = {};
            let totalStock = 0;
            for (const sz of defaultSizes) {
                const el = $('ss_' + sz);
                if (!el) continue;
                const val = Math.max(0, parseInt(el.value) || 0);
                stockMap[sz] = val;
                totalStock += val;
            }
            const saveBtn = $('saveSizeStockBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            try {
                await HeelsUpAuth.api(`/api/products/${_sizeStockProductId}/size-stock`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ size_stock: stockMap })
                });
                const oldStock = parseInt(item.stock) || 0;
                item.stock = totalStock;
                addHistory(item.name || 'Product', oldStock, totalStock, 'Size stock update');
                updateKPIs(); applyFilters(); renderLowStockReport();
                closeSizeStockModal();
                toast(`Size stock saved - Total: ${totalStock} units`);
            } catch (e) {
                toast(e.message || 'Failed to save size stock', 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Size Stock';
            }
        }

        document.addEventListener('DOMContentLoaded', loadInventory);