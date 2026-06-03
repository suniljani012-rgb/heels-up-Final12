if (!HeelsUpAuth.getToken()) {
            window.location.href = 'login.html';
        }
        window.addEventListener('scroll', () => document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60));

        function formatInr(n) {
            return '₹' + Number(n || 0).toLocaleString('en-IN');
        }

        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        function isExchangeEligible(order) {
            const status = (order.orderStatus || '').toLowerCase();
            if (status !== 'delivered') return false;
            
            // Deliver date check (max 7 days)
            const deliveredDateStr = order.deliveredAt || order.delivered_at;
            if (!deliveredDateStr) return true; // fallback if delivery date is not set yet but marked as delivered
            
            const delivered = new Date(deliveredDateStr);
            const daysPassed = (Date.now() - delivered.getTime()) / (1000 * 60 * 60 * 24);
            return daysPassed <= 7;
        }

        function renderOrders(orders) {
            const list = document.getElementById('orders-list');
            if (!Array.isArray(orders) || !orders.length) {
                list.innerHTML = `<div class="order-card"><div class="order-card-body" style="text-align:center;padding:40px"><div style="font-size:2rem;margin-bottom:8px">📦</div><div style="font-family:var(--fh);font-size:1.2rem">No orders yet</div><p style="margin-top:8px;color:var(--text-3)">Aapka first order place hote hi yahan show hoga.</p><a href="shop.html" class="btn btn" style="margin-top:12px">Shop Now</a></div></div>`;
                return;
            }

            list.innerHTML = orders.map(order => {
                const status = (order.orderStatus || 'placed').toLowerCase();
                
                let statusClass = 'status-processing';
                let displayStatus = status.replace(/_/g, ' ');
                
                if (status === 'delivered') {
                    statusClass = 'status-delivered';
                } else if (status === 'shipped') {
                    statusClass = 'status-shipped';
                } else if (status === 'cancelled') {
                    statusClass = 'status-cancelled';
                } else if (status.includes('exchange')) {
                    displayStatus = status === 'exchange_requested' ? 'Exchange Requested' : status === 'exchange_approved' ? 'Exchange Approved' : status === 'exchange_rejected' ? 'Exchange Rejected' : status;
                    statusClass = status.includes('approved') ? 'status-delivered' : status.includes('rejected') ? 'status-cancelled' : 'status-shipped';
                }

                const itemsHtml = (order.items || []).map(item => `
                    <div class="order-items-row" style="margin-bottom:12px">
                        <div class="order-item-img"><img src="${item.image || ''}" alt="${item.name || ''}" /></div>
                        <div class="order-item-info">
                            <div class="order-item-name">${item.name || 'Product'}</div>
                            <div class="order-item-meta">Qty: ${item.qty || 1}${item.size ? ` · Size: ${item.size}` : ''} · ${formatInr(item.lineTotal || (item.price || 0) * (item.qty || 1))}</div>
                        </div>
                    </div>
                `).join('');

                const exchangeDetails = (order.exchange_reason || order.exchangeReason) ? `
                    <div style="margin-top:12px;padding:12px;background:#f9f4ed;border:1px dashed var(--border);border-radius:8px;font-size:12px;color:var(--text-2)">
                        <strong>🔄 Exchange details:</strong> ${esc(order.exchange_product || order.exchangeProduct)} (Reason: ${esc(order.exchange_reason || order.exchangeReason)})
                    </div>
                ` : '';

                const eligible = isExchangeEligible(order);
                const exchangeBtn = eligible ? `<button class="order-filter-btn" style="border-color:var(--gold);color:var(--gold);background:var(--color-white);padding:6px 14px;border-radius:100px;font-size:12px;margin-left:auto;cursor:pointer;" onclick="openExchangeModal(${order.id}, '${order.orderNumber || order.id}')">Request Exchange</button>` : '';

                return `
                <div class="order-card" data-status="${status}">
                    <div class="order-card-head">
                        <div>
                            <div class="order-id">#${order.orderNumber || order.id}</div>
                            <div class="order-date">${new Date(order.createdAt).toLocaleDateString('en-IN')} · ${(order.items || []).length} items · ${formatInr(order.totalAmount)}</div>
                        </div>
                        <span class="order-status-badge ${statusClass}">${displayStatus}</span>
                    </div>
                    <div class="order-card-body">
                        ${itemsHtml}
                        ${exchangeDetails}
                    </div>
                    <div class="order-card-foot">
                        <div class="order-total">Total: ${formatInr(order.totalAmount)}</div>
                        <div class="order-actions" style="display:flex;align-items:center;width:100%;justify-content:space-between;margin-top:10px">
                            <span style="font-size:12px;color:var(--text-3)">Payment: ${order.paymentStatus}</span>
                            ${exchangeBtn}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        /* ── Exchange Modal Logic ── */
        let currentExchangeOrderId = null;

        function openExchangeModal(orderId, orderNum) {
            currentExchangeOrderId = orderId;
            document.getElementById('exchangeErr').style.display = 'none';
            document.getElementById('fExchangeReason').value = '';
            document.getElementById('fExchangeProduct').value = '';
            document.getElementById('exchange-backdrop').style.display = 'block';
            document.getElementById('exchangeModal').style.display = 'block';
        }

        function closeExchangeModal() {
            document.getElementById('exchange-backdrop').style.display = 'none';
            document.getElementById('exchangeModal').style.display = 'none';
            currentExchangeOrderId = null;
        }

        async function submitExchange() {
            const reason = document.getElementById('fExchangeReason').value;
            const exchangeProduct = document.getElementById('fExchangeProduct').value.trim();
            const errBox = document.getElementById('exchangeErr');
            errBox.style.display = 'none';

            if (!reason) {
                errBox.textContent = 'Please select a reason for exchange.';
                errBox.style.display = 'block';
                return;
            }
            if (!exchangeProduct) {
                errBox.textContent = 'Please specify the desired size or replacement product.';
                errBox.style.display = 'block';
                return;
            }

            const btn = document.getElementById('btnSubmitExchange');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                const res = await HeelsUpAuth.api(`/api/orders/${currentExchangeOrderId}/exchange`, {
                    method: 'POST',
                    body: JSON.stringify({ reason, exchange_product: exchangeProduct })
                });

                toast('🎉 Exchange request submitted successfully!');
                closeExchangeModal();
                loadOrders(); // Refresh order listing
            } catch (err) {
                errBox.textContent = err.message || 'Could not submit request. Please try again.';
                errBox.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Submit Request';
            }
        }

        /* ── Toast notifications ── */
        function toast(msg, type = 's') {
            if (window.HeelsUpUI && typeof HeelsUpUI.showToast === 'function') {
                HeelsUpUI.showToast(msg, type === 's' ? 'success' : 'error');
                return;
            }
            const wrap = document.getElementById('toast-container');
            if (!wrap) return;
            const t = document.createElement('div');
            t.className = 'toast ' + type;
            t.style.cssText = "background:#0d0d0d;color:#fff;padding:12px 20px;border-radius:100px;margin-top:8px;font-size:13px;display:flex;align-items:center;gap:8px;";
            t.textContent = msg;
            wrap.appendChild(t);
            setTimeout(() => t.remove(), 4000);
        }

        async function loadOrders() {
            try {
                const data = await HeelsUpAuth.api('/api/orders/my');
                const orders = data.data || data.orders || [];
                renderOrders(orders);
                document.getElementById('orders-count-text').textContent = `${orders.length} total orders`;
            } catch (err) {
                if (err.status === 401) {
                    HeelsUpAuth.clearSession();
                    window.location.href = 'login.html';
                    return;
                }
                document.getElementById('orders-count-text').textContent = 'Could not load orders';
            }
        }

        document.querySelectorAll('.order-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const f = btn.dataset.filter;
                document.querySelectorAll('.order-card').forEach(card => {
                    const status = card.dataset.status;
                    if (f === 'all') {
                        card.style.display = 'block';
                    } else if (f === 'processing') {
                        card.style.display = ['placed', 'confirmed', 'processing'].includes(status) ? 'block' : 'none';
                    } else {
                        card.style.display = (status === f) ? 'block' : 'none';
                    }
                });
            });
        });
        const cart = JSON.parse(localStorage.getItem('heelsup_cart') || '[]');
        document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.qty, 0);
        document.getElementById('cart-open-btn')?.addEventListener('click', () => { document.getElementById('cart-drawer').classList.add('open'); document.getElementById('cart-backdrop').classList.add('open'); });
        document.getElementById('cart-close-btn')?.addEventListener('click', () => { document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-backdrop').classList.remove('open'); });
        document.getElementById('cart-backdrop')?.addEventListener('click', () => { document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-backdrop').classList.remove('open'); });
        loadOrders();