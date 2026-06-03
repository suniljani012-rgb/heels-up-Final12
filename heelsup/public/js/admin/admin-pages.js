// State
        let allPages = [];
        let filteredPages = [];
        const PAGE = 15;
        let currentPg = 1;

        // Auth
        let currentUser = 'Admin User';
        try {
            const user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') {
                window.location = 'login.html?redirect=admin-pages.html';
            }
            currentUser = (user?.firstName || user?.first_name || 'Admin');
            document.getElementById('s-avatar').textContent = currentUser.charAt(0).toUpperCase();
            document.getElementById('s-name').textContent = currentUser;
        } catch (e) {
            console.error("Auth initialization failed", e);
        }

        // Sidebar logic
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

        function showToast(msg, type = 'success') {
            const c = document.getElementById('toastWrap');
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            const icon = type === 'error' ? 'fa-circle-xmark' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check');
            t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
            c.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0'; t.style.transition = 'opacity .3s';
                setTimeout(() => t.remove(), 300);
            }, 4000);
        }

        function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
        function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'â€”'; }

        // Live API Fetching
        async function loadPages() {
            document.getElementById('pagesTableBody').innerHTML = '<tr><td colspan="5"><div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Fetching live pages...</div></td></tr>';
            try {
                const data = await HeelsUpAuth.api('/api/admin/pages');
                allPages = Array.isArray(data) ? data : (data.pages || []);

                // Sort descending by updated date
                allPages.sort((a, b) => new Date(b.updated_at || Date.now()) - new Date(a.updated_at || Date.now()));

                filterPages();
            } catch (e) {
                console.error('API Error:', e);
                showToast(e.message || 'Failed to load pages', 'error');
                document.getElementById('pagesTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--danger)">Failed to connect to the database.</td></tr>';
            }
        }

        function filterPages() {
            const q = document.getElementById('pageSearch').value.toLowerCase();
            const statF = document.getElementById('statusFilter').value;
            const tempF = document.getElementById('templateFilter').value;

            filteredPages = allPages.filter(p => {
                const titleStr = (p.title || '').toLowerCase();
                const slugStr = (p.slug || '').toLowerCase();
                const status = (p.status || 'published').toLowerCase();
                const template = p.template || 'Default Page';

                // Search Match
                const matchesSearch = !q || titleStr.includes(q) || slugStr.includes(q);

                // Dropdown Match
                const matchesStat = !statF || status === statF;
                const matchesTemp = !tempF || template === tempF;

                return matchesSearch && matchesStat && matchesTemp;
            });

            document.getElementById('totalCountDisplay').textContent = `All Pages (${filteredPages.length})`;

            currentPg = 1;
            renderPages();
        }

        function renderPages() {
            const start = (currentPg - 1) * PAGE;
            const page = filteredPages.slice(start, start + PAGE);
            const tbody = document.getElementById('pagesTableBody');
            const info = document.getElementById('paginationInfo');

            if (!page.length) {
                tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fa-regular fa-file-lines"></i><h3>No Pages Found</h3><p>Try adjusting your search or filters.</p></div></td></tr>';
                info.textContent = `Showing 0 pages`;
                document.getElementById('pagesPagination').innerHTML = '';
                return;
            }

            info.innerHTML = `Showing <strong>${start + 1}â€“${Math.min(start + PAGE, filteredPages.length)}</strong> of <strong>${filteredPages.length}</strong> pages`;

            tbody.innerHTML = page.map(p => {
                const isPublished = (p.status || 'published').toLowerCase() === 'published';
                const statusCls = isPublished ? 'status-published' : 'status-draft';
                const statusTxt = isPublished ? 'Published' : 'Draft';
                const trStyle = isPublished ? '' : 'style="background:var(--color-light);"';
                const titleCls = isPublished ? '' : 'text-muted';

                return `<tr ${trStyle}>
                    <td>
                        <div class="admin-table-name ${titleCls}">${esc(p.title || 'Untitled')}</div>
                        <div class="url-slug">/pages/${esc(p.slug || '')}</div>
                    </td>
                    <td><span class="badge-gold">${esc(p.template || 'Default Page')}</span></td>
                    <td>
                        <div class="admin-table-name ${titleCls}">${fmtDate(p.updated_at || p.created_at)}</div>
                        <div class="admin-table-sub">${esc(p.author || 'System')}</div>
                    </td>
                    <td><span class="status-badge ${statusCls}">${statusTxt}</span></td>
                    <td>
                        <div class="admin-table-actions" style="justify-content:flex-end;">
                            <button class="table-action-btn" title="Edit Page" onclick='openPageModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'><i class="fa-regular fa-pen-to-square"></i></button>
                            <button class="table-action-btn" title="View Live"><i class="fa-regular fa-eye"></i></button>
                            <button class="table-action-btn danger" title="Delete Page" onclick="deletePage(${p.id})"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            renderPagination('pagesPagination', filteredPages.length, currentPg, p => { currentPg = p; renderPages(); });
        }

        // Auto-generate slug from title
        document.getElementById('pageTitle').addEventListener('input', function (e) {
            if (!document.getElementById('updatePageId').value) { // Only auto-fill for new pages
                let slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                document.getElementById('pageSlug').value = slug;
            }
        });

        // Modal Logic
        function openPageModal(p = null) {
            document.getElementById('pageUpdateForm').reset();

            if (p) {
                document.getElementById('pageModalTitle').textContent = `Edit Page: ${p.title}`;
                document.getElementById('updatePageId').value = p.id;
                document.getElementById('pageTitle').value = p.title || '';
                document.getElementById('pageSlug').value = p.slug || '';
                document.getElementById('pageStatus').value = p.status || 'published';
                document.getElementById('pageTemplate').value = p.template || 'Default Page';
                document.getElementById('pageContent').value = p.content || '';
            } else {
                document.getElementById('pageModalTitle').textContent = `Create New Page`;
                document.getElementById('updatePageId').value = '';
                document.getElementById('pageStatus').value = 'published';
                document.getElementById('pageTemplate').value = 'Default Page';
            }

            document.getElementById('pageModal').classList.add('show');
        }

        function closePageModal() {
            document.getElementById('pageModal').classList.remove('show');
        }

        async function savePage(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSavePage');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const id = document.getElementById('updatePageId').value;
            const payload = {
                title: document.getElementById('pageTitle').value.trim(),
                slug: document.getElementById('pageSlug').value.trim(),
                status: document.getElementById('pageStatus').value,
                template: document.getElementById('pageTemplate').value,
                content: document.getElementById('pageContent').value,
                author: currentUser
            };

            try {
                if (id) {
                    await HeelsUpAuth.api(`/api/admin/pages/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                    showToast('Page updated successfully');
                } else {
                    await HeelsUpAuth.api(`/api/admin/pages`, {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    showToast('Page created successfully');
                }

                closePageModal();
                loadPages(); // Reload live data
            } catch (err) {
                showToast(err.message || 'Failed to save page', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Page';
            }
        }

        async function deletePage(id) {
            if (!confirm("Are you sure you want to delete this page? This cannot be undone.")) return;

            try {
                await HeelsUpAuth.api(`/api/admin/pages/${id}`, { method: 'DELETE' });
                showToast('Page deleted successfully');
                loadPages(); // Reload live data
            } catch (err) {
                showToast(err.message || 'Failed to delete page', 'error');
            }
        }

        function renderPagination(elId, total, page, onPageCallback) {
            const pages = Math.ceil(total / PAGE);
            const el = document.getElementById(elId);

            if (pages <= 1) { el.innerHTML = ''; return; }

            let html = `<button class="page-btn" onclick="(${onPageCallback.toString()})(${page - 1})" ${page <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left" style="font-size:10px"></i></button>`;

            let startP = Math.max(1, page - 2);
            let endP = Math.min(pages, page + 2);

            if (startP > 1) {
                html += `<button class="page-btn" onclick="(${onPageCallback.toString()})(1)">1</button>`;
                if (startP > 2) html += `<span class="page-ellipsis" style="color:var(--muted); font-size:10px; padding: 0 4px;">...</span>`;
            }

            for (let i = startP; i <= endP; i++) {
                html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="(${onPageCallback.toString()})(${i})">${i}</button>`;
            }

            if (endP < pages) {
                if (endP < pages - 1) html += `<span class="page-ellipsis" style="color:var(--muted); font-size:10px; padding: 0 4px;">...</span>`;
                html += `<button class="page-btn" onclick="(${onPageCallback.toString()})(${pages})">${pages}</button>`;
            }

            html += `<button class="page-btn" onclick="(${onPageCallback.toString()})(${page + 1})" ${page >= pages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right" style="font-size:10px"></i></button>`;
            el.innerHTML = html;
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', loadPages);