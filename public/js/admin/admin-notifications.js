// State
        let allNotifications = [];
        let filteredNotifications = [];
        let currentFilter = 'all';

        // Auth
        try {
            const user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') {
                window.location = 'login.html?redirect=admin-notifications.html';
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

        // Formatting utilities
        function timeAgo(dateParam) {
            if (!dateParam) return '';
            const date = new Date(dateParam);
            const seconds = Math.floor((new Date() - date) / 1000);
            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + " years ago";
            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + " months ago";
            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + " days ago";
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + " hours ago";
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + " minutes ago";
            return Math.floor(seconds) + " seconds ago";
        }

        function getDateGroup(dateParam) {
            const date = new Date(dateParam);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) return 'Today';
            if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        // Live API Fetching
        async function loadNotifications() {
            const container = document.getElementById('notificationsContainer');
            container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner"></i>Fetching live notifications...</div>';

            try {
                // Try fetching live notifications
                const data = await HeelsUpAuth.api('/api/admin/notifications');
                allNotifications = Array.isArray(data) ? data : (data.notifications || []);

                // Sort newest first
                allNotifications.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));

                updateUnreadBadge();
                applyFilter();
            } catch (e) {
                console.error('API Error:', e);
                // No dummy data. Show empty/error state.
                allNotifications = [];
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-regular fa-bell-slash"></i>
                        <h3>No Notifications</h3>
                        <p>You're all caught up. No new alerts to display.</p>
                    </div>`;
                updateUnreadBadge();
            }
        }

        function updateUnreadBadge() {
            const unreadCount = allNotifications.filter(n => !n.is_read).length;
            const badge = document.getElementById('unreadBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        function setFilter(filterType, element) {
            currentFilter = filterType;
            // Update active tab UI
            const tabs = document.querySelectorAll('.notif-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            element.classList.add('active');

            applyFilter();
        }

        function applyFilter() {
            if (currentFilter === 'all') {
                filteredNotifications = allNotifications;
            } else if (currentFilter === 'unread') {
                filteredNotifications = allNotifications.filter(n => !n.is_read);
            } else {
                // filtering by specific type (order, alert, system, etc)
                filteredNotifications = allNotifications.filter(n => (n.type || '').toLowerCase() === currentFilter);
            }
            renderNotifications();
        }

        function renderNotifications() {
            const container = document.getElementById('notificationsContainer');

            if (filteredNotifications.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-regular fa-bell-slash"></i>
                        <h3>No Notifications Found</h3>
                        <p>There are no notifications matching this filter.</p>
                    </div>`;
                return;
            }

            let html = '';
            let currentGroup = '';

            const iconMap = {
                order: { cls: 'icon-order', icon: 'fa-bag-shopping' },
                alert: { cls: 'icon-alert', icon: 'fa-triangle-exclamation' },
                review: { cls: 'icon-success', icon: 'fa-star' },
                system: { cls: 'icon-system', icon: 'fa-cloud-arrow-down' },
                return: { cls: 'icon-order', icon: 'fa-rotate-left' },
                security: { cls: 'icon-system', icon: 'fa-shield-halved' }
            };

            filteredNotifications.forEach(notif => {
                const group = getDateGroup(notif.created_at || new Date());
                if (group !== currentGroup) {
                    html += `<div class="date-divider">${group}</div>`;
                    currentGroup = group;
                }

                const typeKey = (notif.type || 'system').toLowerCase();
                const iconDef = iconMap[typeKey] || iconMap.system;
                const unreadClass = notif.is_read ? '' : 'unread';

                // Determine action text/link
                let actionBtn = '';
                if (notif.action_link) {
                    actionBtn = `<a href="${esc(notif.action_link)}" class="notif-action-btn">View Details</a>`;
                }

                // Mark read button (if unread)
                let markReadBtn = '';
                if (!notif.is_read) {
                    markReadBtn = `<button class="notif-action-btn" onclick="markAsRead(${notif.id})" title="Mark as Read"><i class="fa-solid fa-check"></i></button>`;
                }

                html += `
                <div class="notif-list-item ${unreadClass}">
                    <div class="notif-icon-lg ${iconDef.cls}"><i class="fa-solid ${iconDef.icon}"></i></div>
                    <div class="notif-content">
                        <div class="notif-title">${esc(notif.title || 'Notification')}</div>
                        <div class="notif-desc">${esc(notif.message || '')}</div>
                        <div class="notif-meta">
                            <span><i class="fa-regular fa-clock"></i> ${timeAgo(notif.created_at || new Date())}</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${actionBtn}
                        ${markReadBtn}
                    </div>
                </div>`;
            });

            container.innerHTML = html;
        }

        async function markAsRead(id) {
            try {
                // Live API call
                await HeelsUpAuth.api(`/api/admin/notifications/${id}/read`, { method: 'PUT' });

                // Update local state instantly for snappy UI
                const notif = allNotifications.find(n => n.id === id);
                if (notif) notif.is_read = true;

                updateUnreadBadge();
                applyFilter();
            } catch (e) {
                showToast(e.message || 'Failed to mark as read', 'error');
            }
        }

        async function markAllRead() {
            const unreadExist = allNotifications.some(n => !n.is_read);
            if (!unreadExist) {
                showToast('All notifications are already read.', 'info');
                return;
            }

            try {
                // Live API call
                await HeelsUpAuth.api('/api/admin/notifications/read-all', { method: 'PUT' });

                // Update local state
                allNotifications.forEach(n => n.is_read = true);

                showToast('All notifications marked as read.');
                updateUnreadBadge();
                applyFilter();
            } catch (e) {
                showToast(e.message || 'Failed to update notifications', 'error');
            }
        }

        // Initialize App
        document.addEventListener('DOMContentLoaded', loadNotifications);