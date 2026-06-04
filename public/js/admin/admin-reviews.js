// State
        let allReviews = [];
        let filteredReviews = [];
        const PAGE = 15;
        let currentPg = 1;
        let editingReviewId = null;

        // Auth
        try {
            const user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') {
                window.location = 'login.html?redirect=admin-reviews.html';
            }
            const uname = (user?.firstName || user?.first_name || 'Admin');
            document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
            document.getElementById('s-name').textContent = uname;
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

        // Generate Stars HTML
        function getStarsHtml(rating) {
            let html = '';
            const r = Number(rating || 0);
            for (let i = 1; i <= 5; i++) {
                if (i <= r) html += '<i class="fa-solid fa-star"></i>';
                else if (i - 0.5 <= r) html += '<i class="fa-solid fa-star-half-stroke"></i>';
                else html += '<i class="fa-regular fa-star"></i>';
            }
            return html;
        }

        // Live API Fetching
        async function loadReviews() {
            document.getElementById('reviewsTableBody').innerHTML = '<tr><td colspan="6"><div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Fetching live reviews...</div></td></tr>';
            try {
                // Fetch all reviews
                // Adjusting API call format to match previous patterns
                const data = await HeelsUpAuth.api('/api/admin/reviews?status=all');
                allReviews = Array.isArray(data) ? data : (data.reviews || []);

                // Sort descending by date
                allReviews.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));

                calculateStats();
                filterReviews();
            } catch (e) {
                console.error('API Error:', e);
                showToast(e.message || 'Failed to load reviews', 'error');
                document.getElementById('reviewsTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--danger)">Failed to connect to the database.</td></tr>';
            }
        }

        function calculateStats() {
            let total = allReviews.length;
            let pending = 0;
            let replied = 0;
            let sumRating = 0;

            allReviews.forEach(r => {
                const stat = (r.status || 'pending').toLowerCase();
                if (stat === 'pending') pending++;
                if (r.reply && r.reply.trim() !== '') replied++;
                sumRating += Number(r.rating || 0);
            });

            const avgRating = total > 0 ? (sumRating / total).toFixed(1) : 0;
            const repliedPct = total > 0 ? Math.round((replied / total) * 100) : 0;

            document.getElementById('statAvgRating').innerHTML = `${avgRating} <i class="fa-solid fa-star" style="font-size:16px; color:var(--gold);"></i>`;
            document.getElementById('statTotalReviews').textContent = total.toLocaleString('en-IN');
            document.getElementById('statPending').textContent = pending.toLocaleString('en-IN');
            document.getElementById('statReplied').textContent = `${repliedPct}%`;
        }

        function clearFilters() {
            document.getElementById('reviewSearch').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('ratingFilter').value = '';
            filterReviews();
        }

        function filterReviews() {
            const q = document.getElementById('reviewSearch').value.toLowerCase();
            const statF = document.getElementById('statusFilter').value;
            const ratF = document.getElementById('ratingFilter').value;

            filteredReviews = allReviews.filter(r => {
                const prodName = (r.product_name || '').toLowerCase();
                const custFirst = (r.first_name || '').toLowerCase();
                const custLast = (r.last_name || '').toLowerCase();
                const custEmail = (r.email || '').toLowerCase();
                const revText = (r.review || '').toLowerCase();
                const status = (r.status || 'pending').toLowerCase();
                const rating = Number(r.rating || 0);

                // Search Match
                const matchesSearch = !q || prodName.includes(q) || custFirst.includes(q) || custLast.includes(q) || custEmail.includes(q) || revText.includes(q);

                // Status Match
                const matchesStat = !statF || status === statF;

                // Rating Match
                let matchesRat = true;
                if (ratF) {
                    if (ratF === '5' || ratF === '4' || ratF === '3') matchesRat = rating === Number(ratF);
                    else if (ratF === '2') matchesRat = rating <= 2;
                }

                return matchesSearch && matchesStat && matchesRat;
            });

            currentPg = 1;
            renderReviews();
        }

        function renderReviews() {
            const start = (currentPg - 1) * PAGE;
            const page = filteredReviews.slice(start, start + PAGE);
            const tbody = document.getElementById('reviewsTableBody');
            const info = document.getElementById('paginationInfo');

            if (!page.length) {
                tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-regular fa-comments"></i><h3>No Reviews Found</h3><p>Try adjusting your search or filters.</p></div></td></tr>';
                info.textContent = `Showing 0 reviews`;
                document.getElementById('reviewsPagination').innerHTML = '';
                return;
            }

            info.innerHTML = `Showing <strong>${start + 1}â€“${Math.min(start + PAGE, filteredReviews.length)}</strong> of <strong>${filteredReviews.length}</strong> reviews`;

            tbody.innerHTML = page.map(r => {
                const status = (r.status || 'pending').toLowerCase();

                let statusCls = 'status-draft'; // default pending
                let statusTxt = 'Pending';
                let trStyle = '';

                if (status === 'approved' || status === 'published') {
                    statusCls = 'status-active';
                    statusTxt = 'Published';
                } else if (status === 'rejected' || status === 'hidden') {
                    statusCls = 'status-rejected';
                    statusTxt = 'Hidden';
                } else {
                    // Pending highlight
                    trStyle = 'background:var(--warning-light); opacity: 0.98;';
                }

                const imgHtml = r.image_url
                    ? `<img src="${esc(r.image_url)}" class="review-prod-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\'><rect width=\\'44\\' height=\\'44\\' fill=\\'%23f1f5f9\\'/></svg>'">`
                    : `<div class="review-prod-img" style="display:flex;align-items:center;justify-content:center;color:#cbd5e1;"><i class="fa-solid fa-box"></i></div>`;

                const custName = `${esc(r.first_name || '')} ${esc(r.last_name || '')}`.trim() || 'Guest';
                const hasReply = r.reply && r.reply.trim() !== '';

                return `<tr style="${trStyle}">
                    <td>
                        <div style="display:flex;align-items:center;gap:10px">
                            ${imgHtml}
                            <div style="max-width: 150px;">
                                <div class="admin-table-name" style="font-size:12px; white-space:normal; line-height:1.2;">${esc(r.product_name || 'Unknown Product')}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="star-rating">${getStarsHtml(r.rating)}</div>
                        <div class="review-text">${esc(r.review || 'No review text provided.')}</div>
                        ${hasReply ? `<div style="font-size:11px; color:var(--info); margin-top:6px; font-weight:600;"><i class="fa-solid fa-reply"></i> Replied</div>` : ''}
                    </td>
                    <td>
                        <div class="admin-table-name">${custName} <span class="badge-verified" title="Verified Buyer"><i class="fa-solid fa-check"></i></span></div>
                        <div class="admin-table-sub">${esc(r.email || '')}</div>
                    </td>
                    <td>
                        <div class="admin-table-sub">${fmtDate(r.created_at || new Date())}</div>
                    </td>
                    <td><span class="status-badge ${statusCls}">${statusTxt}</span></td>
                    <td>
                        <div class="admin-table-actions" style="justify-content:flex-end;">
                            ${status === 'pending' ? `<button class="table-action-btn success" title="Quick Approve" onclick="updateReviewStatus(${r.id}, 'approved')"><i class="fa-solid fa-check"></i></button>` : ''}
                            <button class="table-action-btn" title="View / Reply" onclick='openReplyModal(${JSON.stringify(r).replace(/'/g, "&#39;")})'><i class="fa-solid fa-reply"></i></button>
                            ${status !== 'rejected' && status !== 'hidden' ? `<button class="table-action-btn danger" title="Hide/Reject" onclick="updateReviewStatus(${r.id}, 'rejected')"><i class="fa-solid fa-ban"></i></button>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('');

            renderPagination('reviewsPagination', filteredReviews.length, currentPg, p => { currentPg = p; renderReviews(); });
        }

        // Modal Logic
        function openReplyModal(r) {
            editingReviewId = r.id;

            const custName = `${esc(r.first_name || '')} ${esc(r.last_name || '')}`.trim() || 'Guest';
            document.getElementById('modCustName').textContent = custName;
            document.getElementById('modProdName').textContent = r.product_name || 'Unknown Product';
            document.getElementById('modStars').innerHTML = getStarsHtml(r.rating);
            document.getElementById('modReviewText').textContent = r.review || 'No text provided.';

            // Set form values
            document.getElementById('updateReviewId').value = r.id;

            let status = (r.status || 'pending').toLowerCase();
            if (status === 'published') status = 'approved';
            if (status === 'hidden') status = 'rejected';
            document.getElementById('updateReviewStatus').value = status;

            document.getElementById('updateReviewReply').value = r.reply || '';

            document.getElementById('replyModal').classList.add('show');
        }

        function closeReplyModal() {
            document.getElementById('replyModal').classList.remove('show');
            editingReviewId = null;
        }

        async function saveReply(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSaveReply');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const id = document.getElementById('updateReviewId').value;
            const status = document.getElementById('updateReviewStatus').value;
            const reply = document.getElementById('updateReviewReply').value.trim();

            try {
                await HeelsUpAuth.api(`/api/admin/reviews/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: status, reply: reply })
                });

                showToast('Review updated successfully');
                closeReplyModal();
                loadReviews(); // Reload live data to refresh UI and stats
            } catch (err) {
                showToast(err.message || 'Failed to update review', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Save & Update';
            }
        }

        // Quick action without opening modal
        async function updateReviewStatus(id, newStatus) {
            try {
                await HeelsUpAuth.api(`/api/admin/reviews/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                showToast(`Review ${newStatus === 'approved' ? 'published' : 'hidden'} successfully.`);
                loadReviews();
            } catch (err) {
                showToast(err.message || 'Failed to update review status', 'error');
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
        document.addEventListener('DOMContentLoaded', loadReviews);