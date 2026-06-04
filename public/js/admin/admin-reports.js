// UI Helpers
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
        function doLogout() { HeelsUpAuth.clearSession(); window.location = 'login.html'; }

        // Chart instances
        let revenueChartInstance = null;
        let paymentChartInstance = null;

        // Init
        document.addEventListener('DOMContentLoaded', () => {
            try {
                const user = HeelsUpAuth.getUser();
                if (!user || user.role !== 'admin') {
                    window.location = 'login.html?redirect=admin-reports.html';
                }
                const uname = (user?.firstName || user?.first_name || 'Admin');
                document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
                document.getElementById('s-name').textContent = uname;

                // Set Header Date
                const now = new Date();
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 30);

                const fmtDate = (d) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
                document.getElementById('repDateRange').textContent = `Reporting Period: All Time`;

                // Chart.js defaults
                Chart.defaults.font.family = "'Inter', sans-serif";
                Chart.defaults.color = '#64748b';
                Chart.defaults.scale.grid.color = '#f1f5f9';

                // Fetch Data
                loadAdvancedReports();
            } catch (e) {
                console.error("Initialization failed", e);
            }
        });

        async function loadAdvancedReports() {
            try {
                // Fetch all data concurrently
                const [ordersRes, productsData, customersRes, returnsRes] = await Promise.all([
                    HeelsUpAuth.api('/api/admin/orders').catch(() => ({ orders: [] })),
                    HeelsUpAuth.api('/api/admin/products').catch(() => ([])),
                    HeelsUpAuth.api('/api/admin/customers').catch(() => ({ customers: [] })),
                    HeelsUpAuth.api('/api/admin/returns').catch(() => ({ returns: [] }))
                ]);

                const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes.orders || []);
                const products = Array.isArray(productsData) ? productsData : (productsData.products || []);
                const customers = Array.isArray(customersRes) ? customersRes : (customersRes.customers || []);
                const returns = Array.isArray(returnsRes) ? returnsRes : (returnsRes.returns || []);

                // Filter valid completed orders for revenue
                const validOrders = orders.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned');

                // 1. Calculate Core KPIs
                let totalRevenue = 0;
                validOrders.forEach(o => totalRevenue += parseFloat(o.total_amount || 0));

                const aov = validOrders.length > 0 ? (totalRevenue / validOrders.length) : 0;

                // Format Currency efficiently
                const fmtCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

                // Update DOM KPIs
                document.getElementById('hero-rev').textContent = fmtCurrency(totalRevenue);
                document.getElementById('kpi-orders').textContent = orders.length.toLocaleString('en-IN');
                document.getElementById('kpi-customers').textContent = customers.length.toLocaleString('en-IN');
                document.getElementById('kpi-aov').textContent = fmtCurrency(aov);
                document.getElementById('kpi-products').textContent = products.filter(p => p.active !== false && p.active !== 0).length.toLocaleString('en-IN');

                // 2. Render Charts
                renderRevenueChart(validOrders);
                renderPaymentChart(validOrders);

                // 3. Render Data Grids
                renderTopProducts(products, validOrders);
                renderGeoData(validOrders);
                renderFunnel(orders);
                renderReturnsSummary(returns, orders.length, totalRevenue);

            } catch (err) {
                console.error("Error generating reports:", err);
                const errHtml = '<div class="error-state"><i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:10px"></i><br>Failed to process report data. Please check database connection.</div>';
                document.getElementById('lineChartContainer').innerHTML = errHtml;
                document.getElementById('topProductsBody').innerHTML = `<tr><td colspan="3">${errHtml}</td></tr>`;
            }
        }

        function renderRevenueChart(orders) {
            document.getElementById('lineChartLoader').style.display = 'none';
            const canvas = document.getElementById('revenueChart');
            canvas.style.display = 'block';

            if (orders.length === 0) {
                canvas.parentElement.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">No order data available for timeline.</div>';
                return;
            }

            // Group by Date 
            const dailyData = {};
            orders.forEach(o => {
                let d = new Date();
                if (o.created_at) d = new Date(o.created_at);
                const dateStr = d.toISOString().split('T')[0];
                const amt = parseFloat(o.total_amount || 0);
                dailyData[dateStr] = (dailyData[dateStr] || 0) + amt;
            });

            // Sort dates
            const sortedDates = Object.keys(dailyData).sort();

            let labels = [];
            let dataPoints = [];

            // True live data parsing (No synthetic backfill)
            sortedDates.forEach(dateStr => {
                const d = new Date(dateStr);
                labels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
                dataPoints.push(dailyData[dateStr]);
            });

            const ctx = canvas.getContext('2d');

            // Create Gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(201, 169, 110, 0.4)');
            gradient.addColorStop(1, 'rgba(201, 169, 110, 0.0)');

            if (revenueChartInstance) revenueChartInstance.destroy();

            revenueChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Revenue (â‚¹)',
                        data: dataPoints,
                        borderColor: '#c9a96e',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#c9a96e',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.2 // Smooth curves
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleFont: { size: 13, family: 'Inter' },
                            bodyFont: { size: 14, weight: 'bold', family: 'Inter' },
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                label: function (context) {
                                    return 'â‚¹' + context.parsed.y.toLocaleString('en-IN');
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            border: { display: false },
                            ticks: {
                                callback: function (value) {
                                    if (value >= 100000) return 'â‚¹' + (value / 100000).toFixed(1) + 'L';
                                    if (value >= 1000) return 'â‚¹' + (value / 1000).toFixed(0) + 'K';
                                    return 'â‚¹' + value;
                                }
                            }
                        },
                        x: {
                            grid: { display: false },
                            border: { display: false }
                        }
                    },
                    interaction: { mode: 'index', intersect: false }
                }
            });
        }

        function renderPaymentChart(orders) {
            document.getElementById('doughnutChartLoader').style.display = 'none';
            const canvas = document.getElementById('paymentChart');
            const legendWrap = document.getElementById('paymentLegend');

            if (orders.length === 0) {
                canvas.style.display = 'none';
                legendWrap.innerHTML = '<div style="text-align:center;color:#94a3b8">No payment data.</div>';
                return;
            }

            canvas.style.display = 'block';

            // Group by payment method
            const pMap = {};
            orders.forEach(o => {
                const method = o.payment_method || 'Online Payment';
                pMap[method] = (pMap[method] || 0) + parseFloat(o.total_amount || 0);
            });

            const labels = Object.keys(pMap).map(k => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
            const data = Object.values(pMap);
            const total = data.reduce((a, b) => a + b, 0);

            // HeelsUp Brand Palette for Chart
            const bgColors = ['#c9a96e', '#0f172a', '#3b82f6', '#10b981', '#f59e0b'];

            const ctx = canvas.getContext('2d');
            if (paymentChartInstance) paymentChartInstance.destroy();

            paymentChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: bgColors,
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const val = context.parsed;
                                    const pct = Math.round((val / total) * 100);
                                    return ` â‚¹${val.toLocaleString('en-IN')} (${pct}%)`;
                                }
                            }
                        }
                    }
                },
                plugins: [{
                    id: 'custom_center_text',
                    beforeDraw: function (chart) {
                        const width = chart.width, height = chart.height, ctx = chart.ctx;
                        ctx.restore();
                        const fontSize = (height / 114).toFixed(2);
                        ctx.font = "bold " + fontSize + "em Inter";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = "#0f172a";
                        const text = labels.length + " Types",
                            textX = Math.round((width - ctx.measureText(text).width) / 2),
                            textY = height / 2;
                        ctx.fillText(text, textX, textY);
                        ctx.save();
                    }
                }]
            });

            // Custom HTML Legend
            let legendHtml = '';
            labels.forEach((lbl, i) => {
                const color = bgColors[i % bgColors.length];
                const val = data[i];
                const pct = Math.round((val / total) * 100);

                let fmtVal = 'â‚¹' + val.toLocaleString('en-IN');
                if (val >= 100000) fmtVal = 'â‚¹' + (val / 100000).toFixed(2) + 'L';
                else if (val >= 1000) fmtVal = 'â‚¹' + (val / 1000).toFixed(1) + 'K';

                legendHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.875rem;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="width:12px; height:12px; border-radius:3px; background:${color}"></span>
                            <span style="font-weight:500; color:var(--text)">${lbl}</span>
                        </div>
                        <div style="display:flex; gap:12px;">
                            <span style="color:var(--text-muted)">${pct}%</span>
                            <span style="font-weight:700; width:60px; text-align:right">${fmtVal}</span>
                        </div>
                    </div>
                `;
            });
            legendWrap.innerHTML = legendHtml;
        }

        function renderTopProducts(products, orders) {
            const tbody = document.getElementById('topProductsBody');

            // Map strictly from real DB sales_count or price
            let sortedProducts = [...products].sort((a, b) => {
                const salesA = parseInt(a.sales_count || 0);
                const salesB = parseInt(b.sales_count || 0);
                return salesB - salesA;
            });

            const top5 = sortedProducts.slice(0, 5);

            if (top5.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--text-muted)">No products available.</td></tr>';
                return;
            }

            tbody.innerHTML = top5.map(p => {
                const img = p.image_url ? p.image_url : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="%23f1f5f9"/></svg>';
                const sales = parseInt(p.sales_count || 0);
                const estRev = sales * parseFloat(p.price || 0);

                return `
                    <tr>
                        <td>
                            <div class="prod-cell">
                                <img src="${escapeHtml(img)}" class="prod-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\'><rect width=\\'44\\' height=\\'44\\' fill=\\'%23f1f5f9\\'/></svg>'">
                                <div class="prod-info">
                                    <div class="prod-name">${escapeHtml(p.name)}</div>
                                    <div class="prod-cat">${escapeHtml(p.category || 'General')}</div>
                                </div>
                            </div>
                        </td>
                        <td style="text-align:right; font-weight:600; color:var(--text-muted)">${sales}</td>
                        <td style="text-align:right" class="amt-cell">â‚¹${estRev.toLocaleString('en-IN')}</td>
                    </tr>
                `;
            }).join('');
        }

        function renderGeoData(orders) {
            const container = document.getElementById('geoListContainer');
            const cityMap = {};

            orders.forEach(o => {
                if (o.city) {
                    const city = o.city.trim().charAt(0).toUpperCase() + o.city.trim().slice(1).toLowerCase();
                    const amt = parseFloat(o.total_amount || 0);
                    cityMap[city] = (cityMap[city] || 0) + amt;
                }
            });

            const sortedCities = Object.keys(cityMap).map(k => ({ city: k, amount: cityMap[k] })).sort((a, b) => b.amount - a.amount).slice(0, 5);

            if (sortedCities.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">Not enough geo data.</div>';
                return;
            }

            const maxAmt = sortedCities[0].amount;

            container.innerHTML = sortedCities.map((item) => {
                const pct = Math.max(5, Math.round((item.amount / maxAmt) * 100)); // Min 5% for visual bar

                let fmtAmt = 'â‚¹' + item.amount.toLocaleString('en-IN');
                if (item.amount >= 100000) fmtAmt = 'â‚¹' + (item.amount / 100000).toFixed(2) + 'L';
                else if (item.amount >= 1000) fmtAmt = 'â‚¹' + (item.amount / 1000).toFixed(1) + 'K';

                return `
                    <div class="geo-item">
                        <div class="geo-header">
                            <span>${escapeHtml(item.city)}</span>
                            <span class="geo-val">${fmtAmt}</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:0%" data-target-width="${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join('');

            // Trigger animation
            setTimeout(() => {
                document.querySelectorAll('.progress-fill').forEach(el => {
                    el.style.width = el.getAttribute('data-target-width');
                });
            }, 100);
        }

        function renderFunnel(allLiveOrders) {
            const container = document.getElementById('funnelContainer');

            if (allLiveOrders.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">Waiting for data to build funnel.</div>';
                return;
            }

            // Real Funnel calculated perfectly based on actual Live Order Statuses
            let totalPlaced = allLiveOrders.length;
            let totalPaid = 0;
            let totalConfirmed = 0;
            let totalShipped = 0;
            let totalDelivered = 0;

            allLiveOrders.forEach(o => {
                const s = (o.order_status || '').toLowerCase();
                const p = (o.payment_status || '').toLowerCase();

                // Logical progression in a real ecommerce database
                if (p === 'paid' || p === 'success' || s !== 'cancelled') totalPaid++;
                if (s === 'confirmed' || s === 'shipped' || s === 'delivered') totalConfirmed++;
                if (s === 'shipped' || s === 'delivered') totalShipped++;
                if (s === 'delivered') totalDelivered++;
            });

            const steps = [
                { icon: 'fa-bag-shopping', label: 'Orders Placed', val: totalPlaced },
                { icon: 'fa-credit-card', label: 'Payment Success', val: totalPaid },
                { icon: 'fa-box-open', label: 'Confirmed / Processing', val: totalConfirmed },
                { icon: 'fa-truck-fast', label: 'Shipped', val: totalShipped },
                { icon: 'fa-check-double', label: 'Successfully Delivered', val: totalDelivered, isFinal: true }
            ];

            container.innerHTML = steps.map((s, index) => {
                let rateHtml = '';
                if (index > 0) {
                    const prevVal = steps[index - 1].val;
                    const dropRate = prevVal > 0 ? Math.round((s.val / prevVal) * 100) : 0;
                    rateHtml = `<div class="f-rate">${dropRate}% from prev</div>`;
                }

                return `
                    <div class="funnel-step">
                        <div class="f-icon ${s.isFinal ? 'active' : ''}"><i class="fa-solid ${s.icon}"></i></div>
                        <div class="f-content" style="${s.isFinal ? 'border-color:var(--gold); background:var(--gold-light)' : ''}">
                            <div class="f-label">${s.label}</div>
                            <div class="f-stats">
                                <div class="f-val">${s.val.toLocaleString('en-IN')}</div>
                                ${rateHtml}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderReturnsSummary(returns, totalOrders, totalRev) {
            const container = document.getElementById('returnsBanner');

            if (returns.length === 0 && totalOrders === 0) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">No returns data available yet.</div>';
                return;
            }

            const reqCount = returns.length;
            const approved = returns.filter(r => r.status === 'approved');
            const pending = returns.filter(r => r.status === 'pending');

            const reqPct = totalOrders > 0 ? ((reqCount / totalOrders) * 100).toFixed(1) : 0;
            const appRate = reqCount > 0 ? ((approved.length / reqCount) * 100).toFixed(1) : 0;

            let totalRefunds = 0;
            approved.forEach(r => totalRefunds += parseFloat(r.refund_amount || 0));

            const refundPct = totalRev > 0 ? ((totalRefunds / totalRev) * 100).toFixed(1) : 0;

            container.innerHTML = `
                <div class="ret-box">
                    <div class="ret-lbl">Return Requests</div>
                    <div class="ret-val">${reqCount}</div>
                    <div class="ret-desc" style="color:var(--danger)">${reqPct}% of total orders</div>
                </div>
                <div class="ret-box">
                    <div class="ret-lbl">Approved</div>
                    <div class="ret-val" style="color:var(--success)">${approved.length}</div>
                    <div class="ret-desc">${appRate}% approval rate</div>
                </div>
                <div class="ret-box">
                    <div class="ret-lbl">Pending Action</div>
                    <div class="ret-val" style="color:var(--warning)">${pending.length}</div>
                    <div class="ret-desc">Awaiting admin review</div>
                </div>
                <div class="ret-box">
                    <div class="ret-lbl">Refund Impact</div>
                    <div class="ret-val" style="color:var(--danger)">â‚¹${Math.round(totalRefunds).toLocaleString('en-IN')}</div>
                    <div class="ret-desc">${refundPct}% of total revenue</div>
                </div>
            `;
        }

        // Utils
        function escapeHtml(unsafe) {
            return String(unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }