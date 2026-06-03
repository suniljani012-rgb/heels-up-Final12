// â”€â”€ AUTH & SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let user = null;
        try {
            user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') { window.location = 'login.html?redirect=admin-collections.html'; }
        } catch (e) {
            user = { firstName: 'Admin', role: 'admin' };
        }

        const uname = (user?.firstName || user?.first_name || 'Admin');
        document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
        document.getElementById('s-name').textContent = uname;

        // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let allCollections = [];
        let filteredCollections = [];
        let editingCollectionId = null;
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

        // â”€â”€ DATA FETCHING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function loadCollections() {
            document.getElementById('collectionsTableBody').innerHTML = '<tr><td colspan="6"><div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Loading collections...</div></td></tr>';
            try {
                // Fetch live data from backend API
                const response = await HeelsUpAuth.api('/api/admin/collections');
                allCollections = response.collections || response || [];
                filterCollections();
            } catch (e) {
                console.error('API Error:', e);
                showToast(e.message || 'Failed to load collections', 'error');
                document.getElementById('collectionsTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444">Failed to load data. Please check your API connection.</td></tr>';
                allCollections = [];
            }
        }

        // â”€â”€ FILTERING & RENDERING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function filterCollections() {
            const q = document.getElementById('collSearch').value.toLowerCase();
            const typeFilter = document.getElementById('typeFilter').value;
            const statusFilter = document.getElementById('statusFilter').value;

            filteredCollections = allCollections.filter(c => {
                const mq = !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);

                const cType = (c.collection_type || 'manual').toLowerCase();
                const mType = typeFilter === '' || cType === typeFilter;

                let isActive = c.active !== false && c.active !== 0;
                const mStatus = statusFilter === '' || String(isActive ? 1 : 0) === statusFilter;

                return mq && mType && mStatus;
            });

            currentPg = 1;
            renderCollections();
        }

        function renderCollections() {
            const start = (currentPg - 1) * PAGE;
            const page = filteredCollections.slice(start, start + PAGE);
            const tbody = document.getElementById('collectionsTableBody');

            if (!page.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8">No collections found.</td></tr>';
                renderPagination('collectionsPagination', filteredCollections.length, currentPg, p => { currentPg = p; renderCollections(); });
                return;
            }

            tbody.innerHTML = page.map(c => {
                const img = c.image_url
                    ? `<img src="${esc(c.image_url)}" class="coll-preview-img" onerror="this.style.display='none'">`
                    : `<div class="coll-preview-img" style="display:flex;align-items:center;justify-content:center;color:#94a3b8"><i class="fa-regular fa-image"></i></div>`;

                const isActive = c.active !== false && c.active !== 0;
                const statusBadge = isActive
                    ? `<span class="badge status-active">Active</span>`
                    : `<span class="badge status-draft">Draft</span>`;

                const cType = (c.collection_type || 'manual').toLowerCase();
                const typeBadge = cType === 'automated'
                    ? `<span class="badge badge-gold"><i class="fa-solid fa-robot"></i> Automated</span>`
                    : `<span class="badge badge-blue"><i class="fa-solid fa-hand-pointer"></i> Manual</span>`;

                const productCount = c.product_count !== undefined ? c.product_count : 0;

                return `<tr>
                    <td>${img}</td>
                    <td>
                        <div class="tbl-name">${esc(c.name)}</div>
                        <div class="tbl-sub" title="${esc(c.slug)}">${esc(c.slug ? '/collections/' + c.slug : 'â€”')}</div>
                    </td>
                    <td>${typeBadge}</td>
                    <td><div style="font-weight:600; color:var(--text)">${productCount}</div></td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="act-cell">
                            <button class="btn-icon btn-edit" onclick='editCollection(${JSON.stringify(c).replace(/'/g, "&apos;")})' title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon btn-del" onclick="deleteCollection(${c.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            renderPagination('collectionsPagination', filteredCollections.length, currentPg, p => { currentPg = p; renderCollections(); });
        }

        // â”€â”€ MODAL LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function openCollectionModal() {
            editingCollectionId = null;
            document.getElementById('collectionForm').reset();
            document.getElementById('chkActive').checked = true;
            document.getElementById('modalTitle').textContent = 'Create Collection';
            document.getElementById('collectionModal').classList.add('show');
        }

        function editCollection(coll) {
            editingCollectionId = coll.id;
            document.getElementById('modalTitle').textContent = 'Edit Collection';
            const f = document.getElementById('collectionForm');

            f.name.value = coll.name || '';
            f.slug.value = coll.slug || '';
            f.collection_type.value = coll.collection_type || 'manual';
            f.description.value = coll.description || '';
            f.image_url.value = coll.image_url || '';
            f.active.checked = coll.active !== false && coll.active !== 0;

            document.getElementById('collectionModal').classList.add('show');
        }

        function closeCollectionModal() {
            document.getElementById('collectionModal').classList.remove('show');
            editingCollectionId = null;
        }

        document.getElementById('collectionModal').addEventListener('click', function (e) {
            if (e.target === this) closeCollectionModal();
        });

        // â”€â”€ CRUD OPERATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function saveCollection(e) {
            e.preventDefault();
            const f = e.target;
            const btn = document.getElementById('saveCollectionBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const nameVal = f.name.value.trim();
            const payload = {
                name: nameVal,
                slug: f.slug.value.trim() || nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                collection_type: f.collection_type.value,
                description: f.description.value.trim(),
                image_url: f.image_url.value.trim(),
                active: f.active.checked
            };

            try {
                if (editingCollectionId) {
                    await HeelsUpAuth.api(`/api/admin/collections/${editingCollectionId}`, { method: 'PUT', body: JSON.stringify(payload) });
                    showToast('Collection updated successfully!');
                } else {
                    await HeelsUpAuth.api('/api/admin/collections', { method: 'POST', body: JSON.stringify(payload) });
                    showToast('Collection created successfully!');
                }

                closeCollectionModal();
                loadCollections();
            } catch (err) {
                showToast(err.message || 'Failed to save collection', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Collection';
            }
        }

        async function deleteCollection(id) {
            if (!confirm('Are you sure you want to delete this collection?')) return;

            try {
                await HeelsUpAuth.api(`/api/admin/collections/${id}`, { method: 'DELETE' });
                showToast('Collection deleted successfully.');
                loadCollections();
            } catch (e) {
                showToast(e.message || 'Failed to delete collection', 'error');
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
        document.addEventListener('DOMContentLoaded', loadCollections);