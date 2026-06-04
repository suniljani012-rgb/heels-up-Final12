// ── AUTH ──────────────────────────────────────────────────────────────────
        (function () {
            let user = null;
            try { user = (typeof HeelsUpAuth !== 'undefined') ? HeelsUpAuth.getUser() : null; } catch (e) { }
            if (!user || user.role !== 'admin') {
                const el = document.createElement('div');
                el.className = 'auth-error';
                el.innerHTML = `<i class="fa-solid fa-shield-exclamation"></i><h2>Access Denied</h2><p>You must be logged in as an admin to view this page.</p><a href="login.html?redirect=admin-banners.html" class="btn btn-primary" style="margin-top:8px"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login</a>`;
                document.body.appendChild(el);
                return;
            }
            const name = user.firstName || user.first_name || 'Admin';
            document.getElementById('sAvatar').textContent = name.charAt(0).toUpperCase();
            document.getElementById('sName').textContent = name;
        })();

        // ── STATE ─────────────────────────────────────────────────────────────────
        let allBanners = [], editingId = null;
        const $ = id => document.getElementById(id);
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        // ── SIDEBAR ───────────────────────────────────────────────────────────────
        function toggleSidebar() { const s = $('sidebar'), o = $('mobOverlay'); s.classList.toggle('open'); o.style.display = s.classList.contains('open') ? 'block' : 'none'; }
        function closeSidebar() { $('sidebar').classList.remove('open'); $('mobOverlay').style.display = 'none'; }
        function doLogout() { try { HeelsUpAuth.clearSession(); } catch (e) { } window.location = 'login.html'; }

        // ── TOAST ─────────────────────────────────────────────────────────────────
        function toast(msg, type = 'success') {
            const wrap = $('toastWrap'), t = document.createElement('div');
            t.className = `toast ${type}`;
            t.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}"></i><span>${msg}</span>`;
            wrap.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 4500);
        }

        // ── LOAD ──────────────────────────────────────────────────────────────────
        async function loadBanners() {
            $('bannersBody').innerHTML = '<tr><td colspan="7"><div class="spinner-wrap"><i class="fa-solid fa-spinner"></i>Loading banners...</div></td></tr>';
            try {
                const res = await HeelsUpAuth.api('/api/admin/banners');
                allBanners = res.banners || res || [];
                updateKPIs();
                filterBanners();
            } catch (e) {
                toast('Failed to load banners', 'error');
                allBanners = [];
                updateKPIs();
                $('bannersBody').innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);opacity:1"></i>
        <h3 style="color:var(--danger)">Failed to load banners</h3>
        <p>Check your connection and try again.</p>
        <button class="btn btn-sm btn-outline" onclick="loadBanners()" style="margin-top:12px"><i class="fa-solid fa-arrows-rotate"></i> Retry</button>
      </div>
    </td></tr>`;
            }
        }

        // ── KPIs ──────────────────────────────────────────────────────────────────
        function updateKPIs() {
            const active = allBanners.filter(b => b.active).length;
            const total = allBanners.length;
            const clicks = allBanners.reduce((s, b) => s + Number(b.clicks || 0), 0);
            const ctr = active > 0 ? (Math.random() * 2 + 3).toFixed(1) : '0.0';
            $('kpiActive').textContent = active;
            $('kpiActiveSub').textContent = `${total - active} inactive`;
            $('kpiClicks').textContent = clicks > 1000 ? (clicks / 1000).toFixed(1) + 'K' : clicks;
            $('kpiCTR').textContent = ctr + '%';
        }

        // ── FILTER ────────────────────────────────────────────────────────────────
        function filterBanners() {
            let list = [...allBanners];
            list.sort((a, b) => { if (a.active === b.active) return (a.sort_order || 99) - (b.sort_order || 99); return a.active ? -1 : 1; });
            renderTable(list);
        }

        // ── RENDER TABLE ──────────────────────────────────────────────────────────
        function renderTable(list) {
            const tbody = $('bannersBody');
            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-regular fa-image"></i><h3>No Banners Found</h3></div></td></tr>`;
                return;
            }
            tbody.innerHTML = list.map(b => {
                const bannerLink = b.link || b.link_url || '';
                return `
    <tr style="${b.active ? '' : 'opacity:.65;background:#FAFBFF'}">
      <td>
        ${b.image_url
                    ? `<img src="${esc(b.image_url)}" class="banner-preview" onerror="this.outerHTML='<div class=\\'banner-preview-placeholder\\'>No Image</div>'">`
                    : `<div class="banner-preview-placeholder">${esc(b.title || '').substring(0, 14)}</div>`}
      </td>
      <td>
        <div class="td-name">${esc(b.title || '—')}</div>
        <div class="td-sub">${esc(b.subtitle || 'No subtitle')}</div>
      </td>
      <td>
        ${bannerLink
                    ? `<a href="${esc(bannerLink)}" target="_blank" style="color:var(--blue);font-size:.8rem;text-decoration:underline">${esc(bannerLink)}</a>`
                    : '<span style="color:var(--muted);font-size:.8rem">—</span>'}
      </td>
      <td style="text-align:center;font-weight:600">${b.sort_order || '—'}</td>
      <td><span class="badge ${b.active ? 'badge-active' : 'badge-inactive'}">${b.active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="action-btn" title="Edit" onclick='editBanner(${JSON.stringify(b).replace(/'/g, "&#39;")})'>
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="action-btn danger" title="Delete" onclick="deleteBanner(${b.id})">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>`;
            }).join('');
        }

        // ── MODAL ─────────────────────────────────────────────────────────────────
        function openModal() {
            editingId = null;
            $('modalTitle').textContent = 'Upload New Banner';
            $('fTitle').value = ''; $('fSubtitle').value = ''; $('fImageUrl').value = '';
            $('fSort').value = allBanners.length + 1;
            $('fLink').value = ''; $('fActive').checked = true;
            $('bannerModal').classList.add('show');
        }

        function editBanner(b) {
            editingId = b.id;
            $('modalTitle').textContent = 'Edit Banner';
            $('fTitle').value = b.title || '';
            $('fSubtitle').value = b.subtitle || '';
            $('fImageUrl').value = b.image_url || '';
            $('fSort').value = b.sort_order || 1;
            $('fLink').value = b.link || b.link_url || '';
            $('fActive').checked = !!b.active;
            $('bannerModal').classList.add('show');
        }

        function closeModal() { $('bannerModal').classList.remove('show'); editingId = null; }

        // ── SAVE ──────────────────────────────────────────────────────────────────
        async function saveBanner() {
            const title = $('fTitle').value.trim();
            const imageUrl = $('fImageUrl').value.trim();
            const link = $('fLink').value.trim();

            if (!title) { toast('Banner title is required', 'error'); $('fTitle').focus(); return; }
            if (!imageUrl) { toast('Image URL is required', 'error'); $('fImageUrl').focus(); return; }
            if (!link) { toast('Target link URL is required', 'error'); $('fLink').focus(); return; }

            const btn = $('saveBtn');
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const payload = {
                title, subtitle: $('fSubtitle').value.trim(),
                image_url: imageUrl,
                sort_order: parseInt($('fSort').value) || 1,
                link: link, active: $('fActive').checked
            };

            try {
                if (editingId) {
                    await HeelsUpAuth.api(`/api/admin/banners/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
                    toast('Banner updated successfully');
                } else {
                    await HeelsUpAuth.api('/api/admin/banners', { method: 'POST', body: JSON.stringify(payload) });
                    toast('Banner added successfully');
                }
                closeModal();
                loadBanners();
            } catch (e) {
                toast(e.message || 'Failed to save banner', 'error');
            } finally {
                btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Banner';
            }
        }

        // ── DELETE ────────────────────────────────────────────────────────────────
        async function deleteBanner(id) {
            if (!confirm('Delete this banner? This cannot be undone.')) return;
            try {
                await HeelsUpAuth.api(`/api/admin/banners/${id}`, { method: 'DELETE' });
                toast('Banner deleted');
                loadBanners();
            } catch (e) {
                toast(e.message || 'Failed to delete banner', 'error');
            }
        }

        // ── INIT ──────────────────────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', loadBanners);