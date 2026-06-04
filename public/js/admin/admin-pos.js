/* ═══════════════════════════════════════════════════
           POS ENGINE — Enterprise Grade
        ═══════════════════════════════════════════════════ */
        let allProducts = [];
        let allCustomers = [];
        let historyData = [], filteredHistory = [];
        let histPage = 1;
        const PAGE = 20;

        // ── AUTH ──────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', async () => {
            const user = HeelsUpAuth.getUser();
            if (!user || user.role !== 'admin') {
                window.location = 'login.html?redirect=admin-pos.html'; return;
            }
            const name = user.firstName || user.first_name || 'Admin';
            document.getElementById('s-avatar').textContent = name.charAt(0).toUpperCase();
            document.getElementById('s-name').textContent = name;
            document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];

            addProductRow();
            initPage();
        });

        async function initPage() {
            try {
                const [productsData, ordersData, customersData] = await Promise.all([
                    HeelsUpAuth.api('/api/admin/products').catch(() => ({ products: [] })),
                    HeelsUpAuth.api('/api/admin/orders').catch(() => ({ orders: [] })),
                    HeelsUpAuth.api('/api/admin/customers').catch(() => ({ customers: [] }))
                ]);

                allProducts = Array.isArray(productsData) ? productsData : (productsData.products || []);
                allCustomers = (customersData.customers || []);

                // Auto-invoice numbering
                const orders = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
                let maxNum = 1000;
                orders.forEach(o => {
                    const match = (o.order_number || '').match(/\d+/);
                    if (match) { const n = parseInt(match[0]); if (n > maxNum) maxNum = n; }
                    else if (o.id && parseInt(o.id) > maxNum) maxNum = parseInt(o.id);
                });
                document.getElementById('invoiceNumber').value = `INV-${maxNum + 1}`;

                // Mini stats from today's POS orders
                const today = new Date().toISOString().split('T')[0];
                const posOrders = orders.filter(o =>
                    (o.payment_method || '').startsWith('pos') &&
                    (o.created_at || '').startsWith(today)
                );
                const totalRev = posOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
                const cashSales = posOrders.filter(o => o.payment_method === 'pos_cash').length;
                const digital = posOrders.filter(o => o.payment_method !== 'pos_cash').length;

                document.getElementById('ms-today').textContent = posOrders.length;
                document.getElementById('ms-rev').textContent = '₹' + Math.round(totalRev).toLocaleString('en-IN');
                document.getElementById('ms-cash').textContent = cashSales;
                document.getElementById('ms-digital').textContent = digital;

                // Store all POS for history
                historyData = orders.filter(o => (o.payment_method || '').startsWith('pos'));
                filteredHistory = [...historyData];

            } catch (err) {
                showToast('Failed to load data', 'error');
                document.getElementById('invoiceNumber').value = `INV-${Date.now().toString().slice(-6)}`;
            }
        }

        // ── SIDEBAR / NAV ─────────────────────────────────
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('mobOverlay').style.display =
                document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
        }
        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('mobOverlay').style.display = 'none';
        }
        function doLogout() { HeelsUpAuth.clearSession(); window.location = 'login.html'; }

        // ── TOAST ─────────────────────────────────────────
        function showToast(msg, type = 'success', dur = 4000) {
            const wrap = document.getElementById('toastWrap');
            const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${msg}</span><span class="toast-close" onclick="this.parentNode.remove()">✕</span>`;
            wrap.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, dur);
        }

        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const fmtAmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

        // ── TABS ──────────────────────────────────────────
        function switchTab(id, btn) {
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-' + id).classList.add('active');
            btn.classList.add('active');
            if (id === 'history') loadHistory();
        }

        // ── PRODUCT ROWS ──────────────────────────────────
        function addProductRow() {
            const tbody = document.getElementById('productRows');
            const tr = document.createElement('tr');
            tr.innerHTML = `
    <td class="td-product">
      <div class="ac-wrap">
        <input type="text" class="form-input prod-search" placeholder="Search product or SKU…" autocomplete="off" required>
        <input type="hidden" class="prod-id">
        <div class="ac-dropdown"></div>
      </div>
    </td>
    <td class="td-size">
      <input type="text" class="form-input size-input" placeholder="36–41" style="width:70px">
    </td>
    <td class="td-qty">
      <input type="number" class="form-input qty-input" value="1" min="1" required style="width:65px">
    </td>
    <td class="td-price">
      <input type="number" class="form-input price-input" placeholder="0.00" min="0" step="0.01" required style="width:100px">
    </td>
    <td class="td-total line-total" style="font-family:var(--font-mono)">—</td>
    <td class="td-action">
      <button type="button" class="btn-icon btn-del" onclick="removeRow(this)"><i class="fa-solid fa-xmark"></i></button>
    </td>`;
            tbody.appendChild(tr);

            const searchEl = tr.querySelector('.prod-search');
            const dropdown = tr.querySelector('.ac-dropdown');
            searchEl.addEventListener('input', e => doSearch(e.target, dropdown));
            searchEl.addEventListener('focus', e => doSearch(e.target, dropdown));
            tr.querySelector('.qty-input').addEventListener('input', calcTotals);
            tr.querySelector('.price-input').addEventListener('input', calcTotals);

            updateRemoveBtns();
        }

        function doSearch(input, dropdown) {
            const q = input.value.toLowerCase().trim();
            let matches = allProducts;
            if (q) matches = allProducts.filter(p =>
                (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
            );
            matches = matches.slice(0, 15);
            dropdown.innerHTML = '';
            if (!matches.length) { dropdown.classList.remove('show'); return; }
            dropdown.classList.add('show');
            matches.forEach(p => {
                const stock = Number(p.stock) || 0;
                const stockColor = stock > 5 ? '#166534' : '#9f1239';
                const stockBg = stock > 5 ? '#dcfce7' : '#fff1f2';
                const item = document.createElement('div');
                item.className = 'ac-item';
                item.innerHTML = `
      <div>
        <div class="ac-name">${esc(p.name)}</div>
        <div class="ac-sku">SKU: ${esc(p.sku || 'N/A')}</div>
        <span class="ac-stock" style="background:${stockBg};color:${stockColor}">Stock: ${stock}</span>
      </div>
      <div class="ac-price">₹${Number(p.price || 0).toLocaleString('en-IN')}</div>`;
                item.addEventListener('click', () => {
                    const row = input.closest('tr');
                    input.value = p.name;
                    row.querySelector('.prod-id').value = p.id;
                    row.querySelector('.price-input').value = p.price;
                    if (p.sizes && p.sizes.length) row.querySelector('.size-input').placeholder = p.sizes.join('/');
                    dropdown.classList.remove('show');
                    calcTotals();
                });
                dropdown.appendChild(item);
            });
        }

        document.addEventListener('click', e => {
            if (!e.target.closest('.ac-wrap'))
                document.querySelectorAll('.ac-dropdown').forEach(d => d.classList.remove('show'));
        });

        function removeRow(btn) {
            btn.closest('tr').remove();
            updateRemoveBtns();
            calcTotals();
        }
        function updateRemoveBtns() {
            const rows = document.querySelectorAll('#productRows tr');
            rows.forEach(r => {
                const b = r.querySelector('.btn-del');
                if (!b) return;
                b.disabled = rows.length === 1;
                b.style.opacity = rows.length === 1 ? '.3' : '1';
                b.style.cursor = rows.length === 1 ? 'not-allowed' : 'pointer';
            });
            // Update item count badge
            document.getElementById('itemCountBadge').textContent = rows.length + ' item' + (rows.length !== 1 ? 's' : '');
        }

        // ── TOTALS ────────────────────────────────────────
        function calcTotals() {
            let subtotal = 0;
            document.querySelectorAll('#productRows tr').forEach(row => {
                const qty = Number(row.querySelector('.qty-input')?.value) || 0;
                const price = Number(row.querySelector('.price-input')?.value) || 0;
                const line = qty * price;
                const cell = row.querySelector('.line-total');
                if (cell) cell.textContent = line > 0 ? fmtAmt(line) : '—';
                subtotal += line;
            });
            const discount = Math.min(Number(document.getElementById('discountInput').value) || 0, subtotal);
            const tax = Number(document.getElementById('taxInput').value) || 0;
            const total = subtotal - discount + tax;

            document.getElementById('s-subtotal').textContent = fmtAmt(subtotal);
            document.getElementById('s-discount').textContent = '-' + fmtAmt(discount);
            document.getElementById('s-tax').textContent = '+' + fmtAmt(tax);
            document.getElementById('s-total').textContent = fmtAmt(total);

            calcChange();
        }

        // ── PAYMENT ───────────────────────────────────────
        function setPayment(method, el) {
            document.querySelectorAll('.pm-card').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('selectedPayment').value = method;
            document.getElementById('referenceField').style.display = (method === 'upi' || method === 'card') ? 'block' : 'none';
            document.getElementById('changeCalc').style.display = method === 'cash' ? 'block' : 'none';
            document.getElementById('changeDue').style.display = 'none';
        }

        function calcChange() {
            const total = parseFloat((document.getElementById('s-total').textContent || '0').replace(/[^0-9.]/g, '')) || 0;
            const received = parseFloat(document.getElementById('cashReceived')?.value) || 0;
            const changeDue = document.getElementById('changeDue');
            if (received > 0) {
                const change = received - total;
                document.getElementById('changeDueAmt').textContent = fmtAmt(Math.max(0, change));
                changeDue.style.display = 'block';
                changeDue.style.color = change < 0 ? 'var(--rose)' : 'var(--teal)';
                document.getElementById('changeDueAmt').textContent = change < 0 ? `Short by ${fmtAmt(Math.abs(change))}` : fmtAmt(change);
            } else {
                changeDue.style.display = 'none';
            }
        }

        // ── CUSTOMER LOOKUP ───────────────────────────────
        function lookupCustomer() {
            const phone = document.getElementById('customerPhone').value.trim();
            if (!phone || phone.length < 10) { showToast('Enter 10-digit phone number first', 'warning'); return; }
            const found = allCustomers.find(c => c.phone === phone || c.phone === '+91' + phone);
            const hint = document.getElementById('customerLookupHint');
            if (found) {
                document.getElementById('customerFirst').value = found.first_name || '';
                document.getElementById('customerLast').value = found.last_name || '';
                document.getElementById('customerEmail').value = found.email || '';
                hint.textContent = '✓ Existing customer found & filled!';
                hint.style.color = 'var(--green)';
                showToast('Customer details auto-filled!', 'success');
            } else {
                hint.textContent = 'New customer — details will be saved on sale.';
                hint.style.color = 'var(--muted-lt)';
            }
        }

        // ── CLEAR FORM ────────────────────────────────────
        function clearForm() {
            if (!confirm('Clear all form data?')) return;
            document.getElementById('pos-form').reset();
            document.getElementById('productRows').innerHTML = '';
            document.getElementById('customerLookupHint').textContent = '';
            document.getElementById('formError').style.display = 'none';
            document.getElementById('changeDue').style.display = 'none';
            document.getElementById('changeCalc').style.display = 'none';
            document.getElementById('referenceField').style.display = 'none';
            document.querySelectorAll('.pm-card').forEach((c, i) => c.classList.toggle('active', i === 0));
            document.getElementById('selectedPayment').value = 'cash';
            document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];
            addProductRow();
            calcTotals();
        }

        // ── SUBMIT ────────────────────────────────────────
        async function submitSale(e) {
            e.preventDefault();
            hideError();
            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing…';

            const phone = document.getElementById('customerPhone').value.trim();
            const first = document.getElementById('customerFirst').value.trim();
            const last = document.getElementById('customerLast').value.trim();
            const email = document.getElementById('customerEmail').value.trim();

            if (!phone || phone.length !== 10) { showError('Enter a valid 10-digit phone number.'); resetBtn(btn); return; }

            // Gather line items
            const items = [];
            let subtotal = 0;
            let hasError = false;
            document.querySelectorAll('#productRows tr').forEach(row => {
                const name = row.querySelector('.prod-search')?.value?.trim();
                const pid = row.querySelector('.prod-id')?.value;
                const size = row.querySelector('.size-input')?.value?.trim();
                const qty = Number(row.querySelector('.qty-input')?.value) || 1;
                const price = Number(row.querySelector('.price-input')?.value) || 0;
                if (name && price > 0) {
                    subtotal += qty * price;
                    items.push({ product_id: pid || null, name, size, qty, price });
                } else if (name && price === 0) {
                    row.querySelector('.price-input').classList.add('error');
                    hasError = true;
                }
            });

            if (hasError) { showError('Enter price for all added products.'); resetBtn(btn); return; }
            if (items.length === 0) { showError('Add at least one product with a valid price.'); resetBtn(btn); return; }

            const discount = Number(document.getElementById('discountInput').value) || 0;
            const tax = Number(document.getElementById('taxInput').value) || 0;
            const total = subtotal - discount + tax;
            const payment = document.getElementById('selectedPayment').value;
            const ref = document.getElementById('paymentRef').value.trim();
            const invoice = document.getElementById('invoiceNumber').value.trim();
            const notes = document.getElementById('saleNotes').value.trim();
            const location = document.getElementById('storeLocation').value;

            try {
                // Step 1: Find / create customer
                let custId = null;
                const existing = allCustomers.find(c => c.phone === phone);
                if (existing) {
                    custId = existing.id;
                } else {
                    const nc = await HeelsUpAuth.api('/api/admin/customers', {
                        method: 'POST',
                        body: JSON.stringify({
                            first_name: first || 'Store',
                            last_name: last || 'Customer',
                            email: email || `${phone}@offline.heelsup.in`,
                            phone,
                            role: 'customer'
                        })
                    });
                    custId = nc.id || nc.customer_id;
                }

                // Step 2: Create order
                const payload = {
                    order_number: invoice,
                    customer_id: custId,
                    customer_name: `${first || ''} ${last || ''}`.trim() || 'Store Customer',
                    customer_phone: phone,
                    customer_email: email || `${phone}@offline.heelsup.in`,
                    total_amount: total,
                    subtotal: subtotal,
                    discount_amount: discount,
                    tax_amount: tax,
                    payment_status: 'paid',
                    payment_method: payment === 'cash' ? 'pos_cash' : payment === 'upi' ? 'pos_upi' : 'pos_card',
                    transaction_id: ref,
                    order_status: 'delivered',
                    delivery_method: 'pos',
                    store_location: location,
                    address_line1: 'In-Store Purchase (POS)',
                    city: 'Jodhpur',
                    state: 'Rajasthan',
                    pincode: '342001',
                    notes,
                    items: items.map(i => ({
                        product_id: i.product_id,
                        name: i.name,
                        size: i.size,
                        quantity: i.qty,
                        price: i.price,
                        total: i.qty * i.price
                    }))
                };

                await HeelsUpAuth.api('/api/admin/orders', { method: 'POST', body: JSON.stringify(payload) });

                showToast('Sale recorded successfully! ✓', 'success');
                setTimeout(() => {
                    clearForm();
                    // Regenerate invoice number
                    const match = invoice.match(/\d+/);
                    const next = match ? parseInt(match[0]) + 1 : 1001;
                    document.getElementById('invoiceNumber').value = `INV-${next}`;
                }, 1200);

            } catch (err) {
                showError(err.message || 'Failed to process sale. Please try again.');
            } finally {
                resetBtn(btn);
            }
        }

        function showError(msg) {
            document.getElementById('formError').style.display = 'flex';
            document.getElementById('formErrorMsg').textContent = msg;
            document.getElementById('formError').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        function hideError() { document.getElementById('formError').style.display = 'none'; }
        function resetBtn(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Record Sale';
        }

        // ── HISTORY ───────────────────────────────────────
        async function loadHistory() {
            document.getElementById('historyBody').innerHTML = '<tr><td colspan="7"><div class="loading-state"><i class="fa-solid fa-spinner"></i>Loading…</div></td></tr>';
            try {
                const { orders } = await HeelsUpAuth.api('/api/admin/orders');
                historyData = (orders || []).filter(o => (o.payment_method || '').startsWith('pos'));
                filteredHistory = [...historyData];
                filterHistory();
            } catch {
                document.getElementById('historyBody').innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load history.</p></div></td></tr>';
            }
        }

        function filterHistory() {
            const q = (document.getElementById('histSearch').value || '').toLowerCase();
            const pay = document.getElementById('histPayFilter').value;
            const days = document.getElementById('histDateFilter').value;

            filteredHistory = historyData.filter(o => {
                const mq = !q || (o.order_number || '').toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q) || (o.customer_phone || '').includes(q);
                const mp = !pay || o.payment_method === pay;
                let md = true;
                if (days === 'today') {
                    md = (o.created_at || '').startsWith(new Date().toISOString().split('T')[0]);
                } else if (days) {
                    const from = new Date(); from.setDate(from.getDate() - parseInt(days));
                    md = new Date(o.created_at) >= from;
                }
                return mq && mp && md;
            });
            histPage = 1; renderHistory();
        }

        function renderHistory() {
            const start = (histPage - 1) * PAGE;
            const page = filteredHistory.slice(start, start + PAGE);
            const tbody = document.getElementById('historyBody');

            if (!page.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-cash-register"></i><p>No POS sales found.</p></div></td></tr>';
                document.getElementById('histPagination').innerHTML = '';
                return;
            }

            const payLabel = { pos_cash: 'Cash', pos_upi: 'UPI', pos_card: 'Card' };
            const payCls = { pos_cash: 'b-cash', pos_upi: 'b-upi', pos_card: 'b-card' };

            tbody.innerHTML = page.map(o => `<tr>
    <td><span class="tbl-mono">${esc(o.order_number || '—')}</span></td>
    <td>
      <div class="tbl-name">${esc(o.customer_name || '—')}</div>
      <div class="tbl-sub">${esc(o.customer_phone || '')}${o.customer_email ? ' · ' + o.customer_email : ''}</div>
    </td>
    <td class="tbl-sub">${fmt(o.created_at)}</td>
    <td style="font-weight:600">${o.items ? (Array.isArray(o.items) ? o.items.length : JSON.parse(o.items || '[]').length) : '—'}</td>
    <td><span class="badge ${payCls[o.payment_method] || 'b-cash'}">${payLabel[o.payment_method] || o.payment_method}</span></td>
    <td><strong>₹${Number(o.total_amount || 0).toLocaleString('en-IN')}</strong></td>
    <td><div class="act-cell">
      <button class="btn btn-ghost btn-sm" onclick="printReceipt(${JSON.stringify(o).replace(/'/g, '&#39;').replace(/"/g, '&quot;')})"><i class="fa-solid fa-print"></i> Print</button>
    </div></td>
  </tr>`).join('');

            // Pagination
            const pages = Math.ceil(filteredHistory.length / PAGE);
            const pag = document.getElementById('histPagination');
            if (pages <= 1) { pag.innerHTML = ''; return; }
            pag.innerHTML = `
    <button class="pg-btn" onclick="histPage=${histPage - 1};renderHistory()" ${histPage <= 1 ? 'disabled' : ''}>‹</button>
    <span class="pg-info">Page ${histPage} of ${pages} (${filteredHistory.length})</span>
    <button class="pg-btn" onclick="histPage=${histPage + 1};renderHistory()" ${histPage >= pages ? 'disabled' : ''}>›</button>`;
        }

        // ── PRINT RECEIPT ─────────────────────────────────
        function printReceipt(order) {
            const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
            const payLabel = { pos_cash: 'Cash', pos_upi: 'UPI', pos_card: 'Card POS' };
            const w = window.open('', '_blank', 'width=400,height=600');
            w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Receipt — ${order.order_number}</title>
    
  </head><body>
    <div class="center">
      <div class="brand">HeelsUp</div>
      <div class="sub">Jodhpur, Rajasthan</div>
      <div class="sub">+91 XXXXX XXXXX</div>
    </div>
    <hr>
    <div class="row"><span>Invoice:</span><strong>${order.order_number}</strong></div>
    <div class="row"><span>Date:</span><span>${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}</span></div>
    <div class="row"><span>Customer:</span><span>${order.customer_name || '—'}</span></div>
    <div class="row"><span>Phone:</span><span>+91 ${order.customer_phone || '—'}</span></div>
    <hr>
    <table>
      <tr><td><strong>Item</strong></td><td><strong>Qty</strong></td><td class="amt"><strong>Price</strong></td></tr>
      ${items.map(i => `<tr><td>${i.name || i.product_name || '—'}${i.size ? ` (${i.size})` : ''}</td><td>×${i.qty || i.quantity || 1}</td><td class="amt">₹${((i.price || 0) * (i.qty || i.quantity || 1)).toLocaleString('en-IN')}</td></tr>`).join('')}
    </table>
    <hr>
    <div class="row"><span>Subtotal</span><span>₹${Number(order.subtotal || order.total_amount).toLocaleString('en-IN')}</span></div>
    ${order.discount_amount ? `<div class="row"><span>Discount</span><span>-₹${Number(order.discount_amount).toLocaleString('en-IN')}</span></div>` : ''}
    ${order.tax_amount ? `<div class="row"><span>GST / Tax</span><span>+₹${Number(order.tax_amount).toLocaleString('en-IN')}</span></div>` : ''}
    <div class="row total"><span>Grand Total</span><span>₹${Number(order.total_amount).toLocaleString('en-IN')}</span></div>
    <div class="row"><span>Payment</span><span>${payLabel[order.payment_method] || order.payment_method}</span></div>
    ${order.transaction_id ? `<div class="row"><span>Ref ID</span><span>${order.transaction_id}</span></div>` : ''}
    <hr>
    <div class="footer">Thank you for shopping with HeelsUp!<br>Visit again ♥</div>
  </body></html>`);
            w.document.close();
            setTimeout(() => w.print(), 400);
        }

        // ── EXPORT ────────────────────────────────────────
        function exportPOS() {
            const csv = ['Invoice,Customer,Phone,Date,Amount,Payment,Reference']
                .concat(filteredHistory.map(o =>
                    `"${o.order_number}","${o.customer_name}","${o.customer_phone}","${fmt(o.created_at)}","${o.total_amount}","${o.payment_method}","${o.transaction_id || ''}"`
                )).join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `heelsup_pos_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            showToast(`Exported ${filteredHistory.length} sales`, 'info');
        }

        // ── KEYBOARD ──────────────────────────────────────
        document.addEventListener('keydown', e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') document.getElementById('pos-form')?.requestSubmit();
        });