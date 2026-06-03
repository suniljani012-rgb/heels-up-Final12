// â”€â”€ AUTH & SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let user = null;
        try {
            user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') { window.location = 'login.html?redirect=admin-blog.html'; }
        } catch (e) {
            // Mock user if auth fails for demo purposes
            user = { firstName: 'Admin', role: 'admin' };
        }

        const uname = (user?.firstName || user?.first_name || 'Admin');
        document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
        document.getElementById('s-name').textContent = uname;

        // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let allPosts = [];
        let filteredPosts = [];
        let editingPostId = null;
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

        // â”€â”€ UTILS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
        function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'â€”'; }

        // â”€â”€ DATA FETCHING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function loadPosts() {
            document.getElementById('postsTableBody').innerHTML = '<tr><td colspan="7"><div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Loading posts...</div></td></tr>';
            try {
                const response = await HeelsUpAuth.api('/api/admin/blogs');
                allPosts = response.blogs || response.posts || [];
                updateStats();
                filterPosts();
            } catch (e) {
                console.error('API Error:', e);
                showToast(e.message || 'Failed to load posts from database', 'error');
                document.getElementById('postsTableBody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444">Failed to load data. Please check your API connection.</td></tr>';
                allPosts = [];
                updateStats();
            }
        }

        // â”€â”€ STATS CALCULATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function updateStats() {
            const total = allPosts.length;
            const published = allPosts.filter(p => p.status === 'published').length;
            const drafts = allPosts.filter(p => p.status === 'draft').length;
            const views = allPosts.reduce((sum, p) => sum + (p.views || 0), 0);

            document.getElementById('statTotal').textContent = total;
            document.getElementById('statPublished').textContent = published;
            document.getElementById('statDrafts').textContent = drafts;
            document.getElementById('statViews').textContent = views.toLocaleString('en-IN');
        }

        // â”€â”€ FILTERING & RENDERING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function filterPosts() {
            const q = document.getElementById('postSearch').value.toLowerCase();
            const cat = document.getElementById('catFilter').value;
            const st = document.getElementById('statusFilter').value;

            filteredPosts = allPosts.filter(p => {
                const mq = !q || p.title.toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q);
                const mc = !cat || p.category === cat;
                const ms = !st || p.status === st;
                return mq && mc && ms;
            });

            currentPg = 1;
            renderPosts();
        }

        function renderPosts() {
            const start = (currentPg - 1) * PAGE;
            const page = filteredPosts.slice(start, start + PAGE);
            const tbody = document.getElementById('postsTableBody');

            if (!page.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8">No blog posts found. Write one!</td></tr>';
                renderPagination('postsPagination', filteredPosts.length, currentPg, p => { currentPg = p; renderPosts(); });
                return;
            }

            tbody.innerHTML = page.map(p => {
                const img = p.image_url
                    ? `<img src="${esc(p.image_url)}" class="blog-preview-img" onerror="this.style.display='none'">`
                    : `<div class="blog-preview-img" style="display:flex;align-items:center;justify-content:center;color:#94a3b8"><i class="fa-regular fa-image"></i></div>`;

                const tags = (p.tags || []).map(t => `<span class="tag-pill">${esc(t)}</span>`).join('');

                const avatarInitial = (p.author || 'A').charAt(0).toUpperCase();
                const authorColors = p.author === 'Admin' ? 'background:#e2e8f0;color:#475569' : 'background:rgba(59,130,246,.1);color:#3b82f6';

                const statusBadge = p.status === 'published'
                    ? `<span class="badge status-active">Published</span>`
                    : `<span class="badge status-draft">Draft</span>`;

                const opacity = p.status === 'draft' ? 'opacity: 0.7;' : '';

                return `<tr style="${opacity}">
                    <td>${img}</td>
                    <td>
                        <div class="tbl-name">${esc(p.title)}</div>
                        <div class="tbl-sub">${esc(p.slug || 'â€”')}</div>
                        <div style="margin-top:4px;">${tags}</div>
                    </td>
                    <td>
                        <div class="author-badge">
                            <div class="author-avatar" style="${authorColors}">${avatarInitial}</div>
                            <span class="tbl-name" style="font-size:.8rem">${esc(p.author || 'Admin')}</span>
                        </div>
                    </td>
                    <td><span class="badge badge-gold">${esc(p.category || 'Uncategorized')}</span></td>
                    <td>
                        <div class="tbl-name">${fmtDate(p.created_at || new Date())}</div>
                        <div class="tbl-sub">${p.views || 0} views</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="act-cell">
                            <button class="btn-icon btn-edit" onclick='editPost(${JSON.stringify(p).replace(/'/g, "&apos;")})' title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon btn-del" onclick="deletePost(${p.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            renderPagination('postsPagination', filteredPosts.length, currentPg, p => { currentPg = p; renderPosts(); });
        }

        // â”€â”€ MODAL LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function openPostModal() {
            editingPostId = null;
            document.getElementById('postForm').reset();
            document.getElementById('modalTitle').textContent = 'Write New Post';
            document.getElementById('postModal').classList.add('show');
        }

        function editPost(post) {
            editingPostId = post.id;
            document.getElementById('modalTitle').textContent = 'Edit Post';
            const f = document.getElementById('postForm');

            f.title.value = post.title || '';
            f.slug.value = post.slug || '';
            f.category.value = post.category || 'Style Guides';
            f.author.value = post.author || '';
            f.tags.value = (post.tags || []).join(', ');
            f.image_url.value = post.image_url || '';
            f.content.value = post.content || '';
            f.status.value = post.status || 'published';

            document.getElementById('postModal').classList.add('show');
        }

        function closePostModal() {
            document.getElementById('postModal').classList.remove('show');
            editingPostId = null;
        }

        // Close modal on backdrop click
        document.getElementById('postModal').addEventListener('click', function (e) {
            if (e.target === this) closePostModal();
        });

        // â”€â”€ CRUD OPERATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        async function savePost(e) {
            e.preventDefault();
            const f = e.target;
            const btn = document.getElementById('savePostBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const rawTags = f.tags.value.split(',').map(t => t.trim()).filter(Boolean);

            const payload = {
                title: f.title.value.trim(),
                slug: f.slug.value.trim() || '/blog/' + f.title.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                category: f.category.value,
                author: f.author.value.trim() || uname,
                tags: rawTags,
                image_url: f.image_url.value.trim(),
                content: f.content.value.trim(),
                status: f.status.value
            };

            try {
                // Strictly use the live API
                if (editingPostId) {
                    await HeelsUpAuth.api(`/api/admin/blogs/${editingPostId}`, { method: 'PUT', body: JSON.stringify(payload) });
                    showToast('Post updated successfully!');
                } else {
                    await HeelsUpAuth.api('/api/admin/blogs', { method: 'POST', body: JSON.stringify(payload) });
                    showToast('Post published successfully!');
                }

                closePostModal();
                loadPosts(); // Re-fetch from the database to ensure UI is in sync
            } catch (err) {
                showToast(err.message || 'Failed to save post', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Post';
            }
        }

        async function deletePost(id) {
            if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

            try {
                // Strictly use the live API
                await HeelsUpAuth.api(`/api/admin/blogs/${id}`, { method: 'DELETE' });

                showToast('Post deleted successfully.');
                loadPosts(); // Re-fetch from the database to ensure UI is in sync
            } catch (e) {
                showToast(e.message || 'Failed to delete post', 'error');
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
        document.addEventListener('DOMContentLoaded', loadPosts);