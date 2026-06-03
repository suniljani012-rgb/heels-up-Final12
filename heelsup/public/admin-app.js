/**
 * HeelsUp — Admin Live App Controller
 * Connects admin HTML templates to Cloudflare Worker APIs
 */
(function () {
    'use strict';

    // Ensure we are in the admin area
    if (!document.querySelector('.admin-layout, .admin-sidebar')) return;

    // Detect current page
    const pathname = window.location.pathname;
    const page = pathname.split('/').pop().replace('.html', '') || 'admin';
    const params = new URLSearchParams(window.location.search);

    const UI = window.HeelsUpUI;
    if (!UI) {
        console.error("HeelsUpUI not loaded. Cannot run admin app.");
        return;
    }

    // Helper: Show skeleton in table
    function showTableSkeleton(cols = 5) {
        const tbody = document.querySelector('.admin-table tbody');
        if (!tbody) return;
        tbody.innerHTML = Array(5).fill(0).map(() => `
            <tr>
                ${Array(cols).fill(0).map(() => `<td><div class="hu-skel" style="height:24px;border-radius:4px;width:${Math.random() * 40 + 40}%"></div></td>`).join('')}
            </tr>
        `).join('');
    }

    // --- Modules --- //

    async function initProducts() {
        showTableSkeleton(8);
        try {
            const data = await UI.apiFetch('/api/products?limit=50');
            const tbody = document.querySelector('.admin-table tbody');
            if (!data || !data.data || data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No products found. <button class="btn btn-primary btn-sm" style="margin-left:12px"><i data-lucide="plus"></i> Add Product</button></td></tr>`;
                if(window.lucide) window.lucide.createIcons();
                return;
            }

            // Render stats
            const statsCards = document.querySelectorAll('.stat-value');
            if (statsCards.length >= 4) {
                statsCards[0].textContent = data.total || 0; // Total
                statsCards[1].textContent = data.data.filter(p => p.is_active).length; // Active
                statsCards[2].textContent = data.data.filter(p => !p.is_active).length; // Draft
                // Out of stock could be calculated from inventory
            }

            tbody.innerHTML = data.data.map(p => {
                const stockTotal = p.total_stock || 0;
                const stockDot = stockTotal > 10 ? 'var(--color-success)' : (stockTotal > 0 ? 'var(--color-warning)' : 'var(--color-error)');
                const stockText = stockTotal > 0 ? `${stockTotal} in stock` : 'Out of stock';
                const stockClass = stockTotal > 10 ? 'text-success' : (stockTotal > 0 ? 'text-warning' : 'text-error');
                const img = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100x100?text=No+Image';

                return `
                <tr>
                    <td><input type="checkbox" class="table-checkbox" value="${p.id}" /></td>
                    <td>
                        <div style="display:flex;align-items:center;gap:12px">
                            <img src="${img}" class="admin-table-img" style="object-fit:cover;border-radius:8px" alt="" onerror="this.src='https://placehold.co/100x100?text=Error'" />
                            <div>
                                <div class="admin-table-name" style="${!p.is_active ? 'color:var(--text-muted)' : ''}">${p.name}</div>
                                <div class="admin-table-sub">SKU: ${p.sku || 'N/A'}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-gold">${p.category_name || 'Uncategorized'}</span></td>
                    <td>
                        <div class="admin-table-name">${UI.formatPrice(p.price / 100)}</div>
                        ${p.mrp ? `<div style="font-size:10px; text-decoration:line-through; color:var(--text-muted)">${UI.formatPrice(p.mrp / 100)}</div>` : ''}
                    </td>
                    <td>
                        <div class="stock-indicator"><span class="stock-dot" style="background:${stockDot}"></span><span class="stock-qty ${stockClass}">${stockText}</span></div>
                    </td>
                    <td><div class="admin-table-name">${p.review_count || 0} reviews</div></td>
                    <td><span class="status-badge status-${p.is_active ? 'active' : 'draft'}">${p.is_active ? 'Active' : 'Draft'}</span></td>
                    <td>
                        <div class="admin-table-actions">
                            <button class="table-action-btn edit-product-btn" data-id="${p.id}" title="Edit"><i data-lucide="edit-2"></i></button>
                            <button class="table-action-btn" title="View in store" onclick="window.open('product.html?slug=${p.slug}', '_blank')"><i data-lucide="eye"></i></button>
                            <button class="table-action-btn toggle-product-btn ${p.is_active ? 'danger' : ''}" data-id="${p.id}" title="${p.is_active ? 'Deactivate' : 'Activate'}"><i data-lucide="${p.is_active ? 'eye-off' : 'check'}"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            if(window.lucide) window.lucide.createIcons();

            // Setup toggles
            document.querySelectorAll('.toggle-product-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    try {
                        UI.showLoader('Updating status...');
                        await UI.apiFetch(`/api/products/${id}/toggle`, { method: 'PATCH' });
                        UI.showToast('success', 'Product status updated');
                        initProducts(); // reload
                    } catch(err) {
                        UI.showToast('error', err.message);
                    } finally {
                        UI.hideLoader();
                    }
                });
            });

            // Set up pagination info
            const pageInfo = document.querySelector('.table-page-info');
            if (pageInfo) pageInfo.innerHTML = `Showing <strong>1–${data.data.length}</strong> of <strong>${data.total}</strong> products`;

        } catch (e) {
            UI.showToast('error', 'Failed to load products: ' + e.message);
            const tbody = document.querySelector('.admin-table tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-error" style="text-align:center;padding:20px">Error loading data.</td></tr>`;
        }
    }

    async function initOrders() {
        showTableSkeleton(8);
        try {
            const data = await UI.apiFetch('/api/orders?limit=50');
            const tbody = document.querySelector('.admin-table tbody');
            if (!data || !data.data || data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No orders found.</td></tr>`;
                return;
            }

            // Render stats
            const statsCards = document.querySelectorAll('.stat-value');
            if (statsCards.length >= 4) {
                statsCards[0].textContent = data.total || 0; // Total
                statsCards[1].textContent = data.data.filter(o => o.status === 'pending' || o.status === 'processing').length;
                statsCards[2].textContent = data.data.filter(o => o.status === 'shipped').length;
                statsCards[3].textContent = data.data.filter(o => o.status === 'delivered').length;
            }

            tbody.innerHTML = data.data.map(o => {
                return `
                <tr>
                    <td><input type="checkbox" class="table-checkbox" value="${o.id}" /></td>
                    <td>
                        <div class="admin-table-name" style="color:var(--color-primary)">${o.order_number}</div>
                        <div class="admin-table-sub">${UI.formatDate(o.created_at, true)}</div>
                    </td>
                    <td>
                        <div class="admin-table-name">${o.user_name || 'Guest'}</div>
                        <div class="admin-table-sub" style="text-transform:lowercase">${o.user_email || '—'}</div>
                    </td>
                    <td><div class="admin-table-name">${UI.formatPrice(o.total_amount / 100)}</div></td>
                    <td>
                        <div style="font-size:12px;font-weight:500">${o.item_count || 1} items</div>
                    </td>
                    <td>${UI.statusBadge(o.payment_status)}</td>
                    <td>${UI.statusBadge(o.status)}</td>
                    <td>
                        <div class="admin-table-actions">
                            <button class="table-action-btn view-order-btn" data-id="${o.id}" title="View Order"><i data-lucide="eye"></i></button>
                            <button class="table-action-btn" title="Update Status"><i data-lucide="edit-2"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            if(window.lucide) window.lucide.createIcons();
            const pageInfo = document.querySelector('.table-page-info');
            if (pageInfo) pageInfo.innerHTML = `Showing <strong>1–${data.data.length}</strong> of <strong>${data.total}</strong> orders`;

        } catch (e) {
            UI.showToast('error', 'Failed to load orders: ' + e.message);
        }
    }

    async function initCustomers() {
        showTableSkeleton(7);
        try {
            const data = await UI.apiFetch('/api/customers?limit=50');
            const tbody = document.querySelector('.admin-table tbody');
            if (!data || !data.data || data.data.length === 0) {
                if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No customers found.</td></tr>`;
                return;
            }

            // Render stats
            const statsCards = document.querySelectorAll('.stat-value');
            if (statsCards.length >= 4) {
                statsCards[0].textContent = data.total || 0; // Total
                statsCards[1].textContent = data.data.filter(c => c.is_active).length;
            }

            tbody.innerHTML = data.data.map(c => {
                const initials = (c.name || 'G').charAt(0).toUpperCase();
                return `
                <tr>
                    <td><input type="checkbox" class="table-checkbox" value="${c.id}" /></td>
                    <td>
                        <div style="display:flex;align-items:center;gap:12px">
                            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-primary-dark));display:flex;align-items:center;justify-content:center;color:var(--color-dark);font-weight:700;font-family:var(--font-display)">${initials}</div>
                            <div>
                                <div class="admin-table-name">${c.name || 'Unknown'}</div>
                                <div class="admin-table-sub" style="text-transform:lowercase">${c.email}</div>
                            </div>
                        </div>
                    </td>
                    <td><div class="admin-table-name" style="font-weight:400">${c.phone || '—'}</div></td>
                    <td>
                        <div class="admin-table-name">${c.order_count || 0}</div>
                    </td>
                    <td>
                        <div class="admin-table-name">${UI.formatPrice((c.total_spent || 0) / 100)}</div>
                    </td>
                    <td>${UI.statusBadge(c.is_active ? 'active' : 'inactive')}</td>
                    <td>
                        <div class="admin-table-actions">
                            <button class="table-action-btn view-customer-btn" data-id="${c.id}" title="View Details"><i data-lucide="eye"></i></button>
                            <button class="table-action-btn toggle-customer-btn ${c.is_active ? 'danger' : ''}" data-id="${c.id}" title="${c.is_active ? 'Block' : 'Unblock'}"><i data-lucide="${c.is_active ? 'ban' : 'check'}"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            if(window.lucide) window.lucide.createIcons();

            // Setup toggles
            document.querySelectorAll('.toggle-customer-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    try {
                        UI.showLoader('Updating status...');
                        await UI.apiFetch(`/api/customers/${id}/toggle`, { method: 'PATCH' });
                        UI.showToast('success', 'Customer status updated');
                        initCustomers(); // reload
                    } catch(err) {
                        UI.showToast('error', err.message);
                    } finally {
                        UI.hideLoader();
                    }
                });
            });

            const pageInfo = document.querySelector('.table-page-info');
            if (pageInfo) pageInfo.innerHTML = `Showing <strong>1–${data.data.length}</strong> of <strong>${data.total}</strong> customers`;
        } catch (e) {
            UI.showToast('error', 'Failed to load customers: ' + e.message);
        }
    }

    async function initCategories() {
        showTableSkeleton(5);
        try {
            const data = await UI.apiFetch('/api/categories');
            const tbody = document.querySelector('.admin-table tbody');
            if (!data || !data.data || data.data.length === 0) {
                if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">No categories found.</td></tr>`;
                return;
            }

            const statsCards = document.querySelectorAll('.stat-value');
            if (statsCards.length >= 2) {
                statsCards[0].textContent = data.data.length; // Total
                statsCards[1].textContent = data.data.filter(c => c.is_active).length;
            }

            tbody.innerHTML = data.data.map(c => {
                return `
                <tr>
                    <td><input type="checkbox" class="table-checkbox" value="${c.id}" /></td>
                    <td>
                        <div style="display:flex;align-items:center;gap:12px">
                            ${c.image ? `<img src="${c.image}" class="admin-table-img" style="border-radius:8px;width:48px;height:48px;object-fit:cover" alt=""/>` : `<div class="admin-table-img" style="background:var(--color-light-3);display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:8px"><i data-lucide="image" style="opacity:0.3"></i></div>`}
                            <div>
                                <div class="admin-table-name">${c.name}</div>
                                <div class="admin-table-sub">/${c.slug}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${c.parent_id ? 'badge-grey' : 'badge-gold'}">${c.parent_id ? 'Sub-category' : 'Main Category'}</span></td>
                    <td>${UI.statusBadge(c.is_active ? 'active' : 'inactive')}</td>
                    <td>
                        <div class="admin-table-actions">
                            <button class="table-action-btn edit-category-btn" data-id="${c.id}" title="Edit"><i data-lucide="edit-2"></i></button>
                            <button class="table-action-btn toggle-category-btn ${c.is_active ? 'danger' : ''}" data-id="${c.id}" title="${c.is_active ? 'Hide' : 'Show'}"><i data-lucide="${c.is_active ? 'eye-off' : 'eye'}"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            if(window.lucide) window.lucide.createIcons();
            const pageInfo = document.querySelector('.table-page-info');
            if (pageInfo) pageInfo.innerHTML = `Showing <strong>1–${data.data.length}</strong> of <strong>${data.data.length}</strong> categories`;

        } catch (e) {
            UI.showToast('error', 'Failed to load categories: ' + e.message);
        }
    }
    
    async function initDashboard() {
        // Analytics
        try {
            const data = await UI.apiFetch('/api/analytics/dashboard');
            if(data && data.data) {
                const stats = data.data;
                const statValues = document.querySelectorAll('.stat-value');
                if(statValues.length >= 4) {
                    statValues[0].textContent = UI.formatPrice((stats.revenue || 0) / 100);
                    statValues[1].textContent = UI.formatNumber(stats.orders || 0);
                    statValues[2].textContent = UI.formatNumber(stats.customers || 0);
                    statValues[3].textContent = UI.formatNumber(stats.products || 0);
                }
            }
        } catch(e) {
            console.error("Dashboard stats error", e);
        }
    }

    // --- Router --- //
    document.addEventListener('DOMContentLoaded', () => {
        // Check auth first
        if (!localStorage.getItem('heelsup_token') || !localStorage.getItem('heelsup_user')) {
            // Optional: redirect to login if not logged in
            // window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            console.warn("No auth token found. Backend API calls may fail.");
        }

        switch (page) {
            case 'admin-products':
                initProducts();
                break;
            case 'admin-orders':
                initOrders();
                break;
            case 'admin-customers':
                initCustomers();
                break;
            case 'admin-categories':
                initCategories();
                break;
            case 'admin':
            case 'admin-analytics':
                initDashboard();
                break;
            default:
                console.log("No specific admin controller for:", page);
                break;
        }
    });

})();
