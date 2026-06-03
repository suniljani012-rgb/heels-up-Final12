// ── AUTH ──────────────────────────────────────────────────────────────────
        (function () {
            let user = null;
            try { user = (typeof HeelsUpAuth !== 'undefined') ? HeelsUpAuth.getUser() : null; } catch (e) { }
            if (!user || user.role !== 'admin') {
                const el = document.createElement('div');
                el.className = 'auth-error';
                el.innerHTML = `<i class="fa-solid fa-shield-exclamation"></i><h2>Access Denied</h2><p>You must be logged in as an admin.</p><a href="login.html?redirect=admin-products.html" class="btn btn-primary" style="margin-top:8px"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login</a>`;
                document.body.appendChild(el);
                return;
            }
            const name = user.firstName || user.first_name || 'Admin';
            document.getElementById('sAvatar').textContent = name.charAt(0).toUpperCase();
            document.getElementById('sName').textContent = name;
        })();

        // ── STATE ─────────────────────────────────────────────────────────────────
        let allProducts = [], filtered = [], selectedIds = new Set(), editingId = null;
        let currentPage = 1, pageSize = 10;

        const $ = id => document.getElementById(id);
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const fmtRs = v => '₹' + (Number(v) || 0).toLocaleString('en-IN');
        const fmtNum = v => (Number(v) || 0).toLocaleString('en-IN');
        const isActive = p => p.is_active !== 0 && p.is_active !== false;

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
            setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 4000);
        }

        // ── LOAD ──────────────────────────────────────────────────────────────────
        async function loadProducts() {
            $('tableBody').innerHTML = '<tr><td colspan="8"><div class="spinner-wrap"><i class="fa-solid fa-spinner"></i>Loading products...</div></td></tr>';
            try {
                const t0 = performance.now();
                const res = await HeelsUpAuth.api('/api/admin/products');
                allProducts = Array.isArray(res) ? res : (res.products || []);
                allProducts.sort((a, b) => b.id - a.id);
                const ms = (performance.now() - t0).toFixed(1);
                $('heroSub').textContent = `${allProducts.length} products loaded in ${ms}ms · Manage pricing, variants & images`;
                populateCategoryFilter();
                updateKPIs();
                applyFilters();
            } catch (e) {
                toast('Failed to load products: ' + (e.message || 'Network error'), 'error');
                $('tableBody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);opacity:1"></i><h3 style="color:var(--danger)">Failed to load</h3><p>Check connection and retry.</p><button class="btn btn-sm btn-outline" onclick="loadProducts()" style="margin-top:12px"><i class="fa-solid fa-arrows-rotate"></i> Retry</button></div></td></tr>`;
            }
        }

        // ── KPIs ──────────────────────────────────────────────────────────────────
        function updateKPIs() {
            let active = 0, draft = 0, oos = 0;
            allProducts.forEach(p => {
                if (isActive(p)) active++; else draft++;
                if ((parseInt(p.stock) || 0) === 0) oos++;
            });
            $('kpiTotal').textContent = fmtNum(allProducts.length);
            $('kpiTotalSub').textContent = `${allProducts.filter(p => p.category).length} categorised`;
            $('kpiActive').textContent = fmtNum(active);
            $('kpiDraft').textContent = fmtNum(draft);
            $('kpiOos').textContent = fmtNum(oos);
        }

        // ── CATEGORY FILTER ───────────────────────────────────────────────────────
        function populateCategoryFilter() {
            const cats = [...new Set(allProducts.map(p => p.category || '').filter(Boolean))].sort();
            $('catFilter').innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
            // Also update modal
            const fCat = $('fCategory');
            if (fCat && cats.length) {
                fCat.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('') + '<option value="Other">Other</option>';
            }
        }

        // ── FILTERS ───────────────────────────────────────────────────────────────
        function applyFilters() {
            const q = ($('searchInput').value || '').toLowerCase();
            const cat = $('catFilter').value;
            const status = $('statusFilter').value;
            const stock = $('stockFilter').value;
            const sort = $('sortFilter').value;

            filtered = allProducts.filter(p => {
                const s = parseInt(p.stock) || 0;
                const act = isActive(p);
                const matchQ = !q || (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
                const matchCat = !cat || (p.category || '').trim() === cat;
                const matchStatus = !status || (status === 'active' ? act : !act);
                let matchStock = true;
                if (stock === 'instock') matchStock = s > 10;
                else if (stock === 'lowstock') matchStock = s > 0 && s <= 10;
                else if (stock === 'outstock') matchStock = s === 0;
                return matchQ && matchCat && matchStatus && matchStock;
            });

            // Sort
            if (sort === 'oldest') filtered.sort((a, b) => a.id - b.id);
            else if (sort === 'price_asc') filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
            else if (sort === 'price_desc') filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
            else if (sort === 'stock_asc') filtered.sort((a, b) => (parseInt(a.stock) || 0) - (parseInt(b.stock) || 0));
            else if (sort === 'name_az') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            currentPage = 1;
            $('filterInfo').textContent = `${filtered.length} of ${allProducts.length} products`;
            renderTable();
        }

        function clearFilters() {
            $('searchInput').value = ''; $('catFilter').value = ''; $('statusFilter').value = '';
            $('stockFilter').value = ''; $('sortFilter').value = 'newest';
            applyFilters();
        }

        // ── RENDER TABLE ──────────────────────────────────────────────────────────
        function renderTable() {
            const start = (currentPage - 1) * pageSize;
            const page = filtered.slice(start, start + pageSize);
            const tbody = $('tableBody');

            $('pgInfo').innerHTML = `Showing <strong>${page.length ? start + 1 : 0}–${Math.min(start + pageSize, filtered.length)}</strong> of <strong>${filtered.length}</strong> products`;

            if (!page.length) {
                tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-box-open"></i><h3>No products found</h3><p>Try adjusting your search or filters.</p></div></td></tr>`;
                renderPagination();
                return;
            }

            tbody.innerHTML = page.map(p => {
                const stock = parseInt(p.stock) || 0;
                const price = parseFloat(p.price) || 0;
                const mrp = parseFloat(p.mrp) || 0;
                const act = isActive(p);
                const selected = selectedIds.has(p.id);

                // Stock color
                let sColor = 'var(--teal)', sLabel = `${stock} units`;
                if (stock === 0) { sColor = 'var(--danger)'; sLabel = 'Out of stock'; }
                else if (stock <= 10) { sColor = 'var(--warning)'; sLabel = `${stock} (low)`; }

                // Discount
                const disc = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;

                const imgHtml = p.image_url
                    ? `<img src="${esc(p.image_url)}" class="prod-img" onerror="this.outerHTML='<div class=\\'prod-img-placeholder\\'><i class=\\'fa-regular fa-image\\'></i></div>'">`
                    : `<div class="prod-img-placeholder"><i class="fa-regular fa-image"></i></div>`;

                return `<tr style="${selected ? 'background:#FFF7F0;' : ''}" id="prow_${p.id}">
      <td><input type="checkbox" ${selected ? 'checked' : ''} onchange="toggleSelect(${p.id},this)" style="accent-color:var(--primary)"></td>
      <td>
        <div style="display:flex;align-items:center;gap:11px">
          ${imgHtml}
          <div>
            <div class="td-name ${!act ? '' : ''}${!act ? ' style="opacity:.6"' : ''}">${esc(p.name || '—')}</div>
            <div class="td-sub">
              <span class="td-mono">${esc(p.sku || 'N/A')}</span>
              ${p.is_featured ? '<span class="badge" style="background:rgba(224,181,15,.15);color:#92400E;margin-left:4px"><i class="fa-solid fa-star" style="font-size:.6rem"></i> Featured</span>' : ''}
            </div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-cat">${esc(p.category || '—')}</span></td>
      <td>
        <div style="font-weight:700">${fmtRs(price)}</div>
        ${mrp > price ? `<div class="td-sub" style="text-decoration:line-through">${fmtRs(mrp)}</div>
        <span class="discount-ribbon">-${disc}%</span>` : ''}
      </td>
      <td>
        <div class="stock-wrap">
          <span class="stock-dot" style="background:${sColor}"></span>
          <span class="stock-val" style="color:${sColor}">${sLabel}</span>
        </div>
        <div class="td-sub">${p.sizes?.length || 0} variants</div>
      </td>
      <td style="font-weight:600">${fmtNum(p.sales_count || p.sales || 0)}</td>
      <td>
        <span class="badge ${act ? 'badge-active' : 'badge-draft'}">
          ${act ? 'Active' : 'Draft'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="action-btn" title="Edit" onclick='openEditModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="action-btn success" title="${act ? 'Deactivate' : 'Activate'}" onclick="toggleProductStatus(${p.id},${act})">
            <i class="fa-solid ${act ? 'fa-eye-slash' : 'fa-eye'}"></i>
          </button>
          <a href="admin-inventory.html?id=${p.id}" class="action-btn" title="Manage Stock" style="text-decoration:none">
            <i class="fa-solid fa-warehouse"></i>
          </a>
          <button class="action-btn danger" title="Delete" onclick="deleteProduct(${p.id})">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>`;
            }).join('');

            renderPagination();
        }

        // ── PAGINATION ────────────────────────────────────────────────────────────
        function renderPagination() {
            const total = filtered.length, pages = Math.ceil(total / pageSize);
            const el = $('pgBtns');
            if (pages <= 1) { el.innerHTML = ''; return; }
            let html = `<button class="pg-btn" onclick="gotoPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left" style="font-size:.7rem"></i></button>`;
            let start = Math.max(1, currentPage - 2), end = Math.min(pages, currentPage + 2);
            if (start > 1) html += `<button class="pg-btn" onclick="gotoPage(1)">1</button>${start > 2 ? '<span style="color:var(--muted);padding:0 4px">…</span>' : ''}`;
            for (let i = start; i <= end; i++) html += `<button class="pg-btn ${i === currentPage ? 'active' : ''}" onclick="gotoPage(${i})">${i}</button>`;
            if (end < pages) html += `${end < pages - 1 ? '<span style="color:var(--muted);padding:0 4px">…</span>' : ''}<button class="pg-btn" onclick="gotoPage(${pages})">${pages}</button>`;
            html += `<button class="pg-btn" onclick="gotoPage(${currentPage + 1})" ${currentPage >= pages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right" style="font-size:.7rem"></i></button>`;
            el.innerHTML = html;
        }
        function gotoPage(p) { const pages = Math.ceil(filtered.length / pageSize); if (p < 1 || p > pages) return; currentPage = p; renderTable(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

        // ── SELECT ────────────────────────────────────────────────────────────────
        function toggleSelect(id, cb) {
            if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
            updateBulkBar();
        }
        function toggleSelectAll(cb) {
            const page = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
            page.forEach(p => { if (cb.checked) selectedIds.add(p.id); else selectedIds.delete(p.id); });
            renderTable();
            updateBulkBar();
        }
        function updateBulkBar() {
            const bar = $('bulkBar');
            if (selectedIds.size > 0) { bar.classList.add('show'); $('bulkCount').textContent = selectedIds.size + ' selected'; }
            else { bar.classList.remove('show'); }
        }
        function clearSelection() { selectedIds.clear(); renderTable(); updateBulkBar(); }

        // ── BULK ACTIONS ──────────────────────────────────────────────────────────
        async function bulkToggleActive(activate) {
            if (!selectedIds.size) { toast('No products selected', 'warning'); return; }
            let success = 0;
            for (const id of selectedIds) {
                try {
                    await HeelsUpAuth.api(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: activate ? 1 : 0 }) });
                    const p = allProducts.find(x => x.id === id);
                    if (p) p.is_active = activate ? 1 : 0;
                    success++;
                } catch (e) { }
            }
            toast(`${success} products ${activate ? 'activated' : 'deactivated'}`);
            clearSelection(); updateKPIs(); applyFilters();
        }
        async function bulkDelete() {
            if (!selectedIds.size) { toast('No products selected', 'warning'); return; }
            if (!confirm(`Delete ${selectedIds.size} products? This cannot be undone.`)) return;
            let success = 0;
            for (const id of selectedIds) {
                try { await HeelsUpAuth.api(`/api/admin/products/${id}`, { method: 'DELETE' }); success++; } catch (e) { }
            }
            allProducts = allProducts.filter(p => !selectedIds.has(p.id));
            toast(`${success} products deleted`);
            clearSelection(); updateKPIs(); applyFilters();
        }

        // ── MODAL ─────────────────────────────────────────────────────────────────
        function openModal() {
            editingId = null;
            $('modalTitle').textContent = 'Add New Product';
            ['fName', 'fSku', 'fPrice', 'fMrp', 'fGst', 'fVariants', 'fDesc', 'fImageUrl'].forEach(id => { if ($(id)) $(id).value = ''; });
            $('fStock').value = '0'; $('fCategory').value = 'Heels'; $('fActive').checked = true; $('fFeatured').checked = false;
            $('imgPreviewWrap').innerHTML = '';
            $('productModal').classList.add('show');
        }
        function openEditModal(p) {
            editingId = p.id;
            $('modalTitle').textContent = 'Edit Product';
            $('fName').value = p.name || ''; $('fSku').value = p.sku || '';
            $('fCategory').value = p.category || 'Heels'; $('fPrice').value = p.price || '';
            $('fMrp').value = p.mrp || ''; $('fGst').value = p.gst_percent || '';
            $('fStock').value = p.stock || 0; $('fVariants').value = (p.sizes || []).join(',') || p.variants || '';
            $('fDesc').value = p.description || ''; $('fImageUrl').value = p.image_url || '';
            $('fActive').checked = isActive(p); $('fFeatured').checked = !!p.is_featured;
            $('imgPreviewWrap').innerHTML = p.image_url ? `<img src="${esc(p.image_url)}" class="img-preview">` : '';
            $('productModal').classList.add('show');
        }
        function closeModal() { $('productModal').classList.remove('show'); editingId = null; }
        $('productModal').addEventListener('click', e => { if (e.target === $('productModal')) closeModal(); });

        // ── IMAGE PREVIEW ─────────────────────────────────────────────────────────
        function previewImages(input) {
            const wrap = $('imgPreviewWrap');
            wrap.innerHTML = '';
            if (!input.files.length) return;
            if (input.files.length > 5) { toast('Max 5 images allowed', 'warning'); input.value = ''; return; }
            Array.from(input.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = document.createElement('img');
                    img.src = e.target.result; img.className = 'img-preview';
                    wrap.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        }

        // ── SAVE PRODUCT ──────────────────────────────────────────────────────────
        async function saveProduct(publish = true) {
            const name = $('fName').value.trim();
            const price = parseFloat($('fPrice').value || 0);
            if (!name) { toast('Product name is required', 'warning'); $('fName').focus(); return; }
            if (!price) { toast('Price is required', 'warning'); $('fPrice').focus(); return; }

            const saveBtn = $('saveBtn'), draftBtn = $('saveDraftBtn');
            saveBtn.disabled = true; draftBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            try {
                // Handle image uploads
                let uploadedUrls = [];
                const fileInput = $('fImages');
                if (fileInput?.files?.length) {
                    const formData = new FormData();
                    for (let i = 0; i < fileInput.files.length; i++) formData.append('files[]', fileInput.files[i]);
                    formData.append('folder', 'products');
                    try {
                        const token = HeelsUpAuth.getToken();
                        const upRes = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                        const upData = await upRes.json();
                        if (upRes.ok) uploadedUrls = upData.results?.map(r => r.url) || [];
                    } catch (e) { console.warn('Upload error', e); }
                }

                const fallbackUrl = $('fImageUrl').value.trim();
                const allImages = [...uploadedUrls];
                if (fallbackUrl && !allImages.includes(fallbackUrl)) allImages.push(fallbackUrl);

                const catMap = { 'Heels': 1, 'Sandals': 2, 'Wedges': 3, 'Flats': 4, 'Bags': 5, 'Accessories': 6 };
                const payload = {
                    name, sku: $('fSku').value.trim(), category: $('fCategory').value,
                    category_id: catMap[$('fCategory').value] || null,
                    price, mrp: parseFloat($('fMrp').value) || null,
                    gst_percent: parseFloat($('fGst').value) || 0,
                    stock: parseInt($('fStock').value) || 0,
                    description: $('fDesc').value.trim(),
                    sizes: $('fVariants').value.split(',').map(s => s.trim()).filter(Boolean),
                    image_url: allImages[0] || '', images: allImages,
                    is_active: publish ? ($('fActive').checked ? 1 : 0) : 0,
                    is_featured: $('fFeatured').checked ? 1 : 0
                };

                let saved;
                if (editingId) {
                    await HeelsUpAuth.api(`/api/admin/products/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
                    saved = { id: editingId };
                } else {
                    saved = await HeelsUpAuth.api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
                }

                // Attach uploaded images
                if (saved?.id && uploadedUrls.length) {
                    for (let i = 0; i < uploadedUrls.length; i++) {
                        try { await HeelsUpAuth.api(`/api/admin/products/${saved.id}/images`, { method: 'POST', body: JSON.stringify({ url: uploadedUrls[i], sort_order: i, is_primary: i === 0 }) }); } catch (e) { }
                    }
                }

                toast(`Product ${editingId ? 'updated' : 'added'} successfully`);
                closeModal();
                await loadProducts();
            } catch (e) {
                toast(e.message || 'Failed to save product', 'error');
            } finally {
                saveBtn.disabled = false; draftBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Save & Publish';
            }
        }

        // ── TOGGLE STATUS ─────────────────────────────────────────────────────────
        async function toggleProductStatus(id, currentlyActive) {
            try {
                await HeelsUpAuth.api(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: currentlyActive ? 0 : 1 }) });
                const p = allProducts.find(x => x.id === id);
                if (p) p.is_active = currentlyActive ? 0 : 1;
                toast(`Product ${currentlyActive ? 'deactivated' : 'activated'}`);
                updateKPIs(); applyFilters();
            } catch (e) { toast(e.message || 'Failed', 'error'); }
        }

        // ── DELETE ────────────────────────────────────────────────────────────────
        async function deleteProduct(id) {
            if (!confirm('Delete this product? This cannot be undone.')) return;
            try {
                await HeelsUpAuth.api(`/api/admin/products/${id}`, { method: 'DELETE' });
                allProducts = allProducts.filter(p => p.id !== id);
                toast('Product deleted');
                updateKPIs(); applyFilters();
            } catch (e) { toast(e.message || 'Failed to delete', 'error'); }
        }

        // ── EXPORT CSV ────────────────────────────────────────────────────────────
        function exportProducts() {
            if (!filtered.length) { toast('No products to export', 'warning'); return; }
            const rows = [['ID', 'Name', 'SKU', 'Category', 'Price', 'MRP', 'GST%', 'Stock', 'Status', 'Featured', 'Sales']];
            filtered.forEach(p => {
                rows.push([p.id, `"${(p.name || '').replace(/"/g, '""')}"`, p.sku || '', p.category || '', p.price || 0, p.mrp || '', p.gst_percent || 0, p.stock || 0, isActive(p) ? 'Active' : 'Draft', p.is_featured ? 'Yes' : 'No', p.sales_count || 0]);
            });
            const csv = rows.map(r => r.join(',')).join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `heelsup-products-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            toast(`Exported ${filtered.length} products`);
        }

        // ── IMPORT CSV ────────────────────────────────────────────────────────────
        function handleCsvImport(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = async function (evt) {
                const text = evt.target.result;
                const rows = text.split('\n').map(r => r.trim()).filter(r => r);
                if (rows.length < 2) { toast('Invalid CSV', 'error'); return; }
                const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
                const products = [];
                for (let i = 1; i < rows.length; i++) {
                    const cols = []; let inQ = false, cur = '';
                    for (let c = 0; c < rows[i].length; c++) {
                        if (rows[i][c] === '"') inQ = !inQ;
                        else if (rows[i][c] === ',' && !inQ) { cols.push(cur); cur = ''; }
                        else cur += rows[i][c];
                    }
                    cols.push(cur);
                    const p = {};
                    headers.forEach((h, idx) => {
                        let v = (cols[idx] || '').trim().replace(/^"|"$/g, '');
                        if (h === 'name') p.name = v;
                        else if (h === 'sku') p.sku = v;
                        else if (h === 'category') p.category = v;
                        else if (h === 'price') p.price = Number(v);
                        else if (h === 'mrp' || h === 'original_price') p.mrp = Number(v);
                        else if (h === 'stock') p.stock = Number(v);
                        else if (h === 'status') p.is_active = v.toLowerCase() === 'active' ? 1 : 0;
                    });
                    if (p.name && p.price) products.push(p);
                }
                if (!products.length) { toast('No valid products in CSV', 'error'); return; }
                try {
                    const res = await HeelsUpAuth.api('/api/admin/products/bulk', { method: 'POST', body: JSON.stringify({ filename: file.name, products }) });
                    toast(`Imported: ${res.success} success, ${res.failed || 0} failed`);
                    loadProducts();
                } catch (err) { toast(err.message || 'Import failed', 'error'); }
                e.target.value = '';
            };
            reader.readAsText(file);
        }

        // ── INIT ──────────────────────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', loadProducts);