import React, { useState, useMemo } from 'react';
import { Search, Eye, X, Printer, Truck, DollarSign, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface OrderItem {
  id: any;
  product_name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: any;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  courier_name?: string;
  source: string;
  items: OrderItem[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
}

interface OrdersManagerProps {
  orders: Order[];
  token: string;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onRefresh: () => void;
}

export default function OrdersManager({ orders, token, showToast, onRefresh }: OrdersManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const itemsPerPage = 15;

  // Drawer / Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [orderStatusVal, setOrderStatusVal] = useState('');
  const [paymentStatusVal, setPaymentStatusVal] = useState('');
  
  // Tracking parameters
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [courierName, setCourierName] = useState('');

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = o.order_number?.toLowerCase().includes(term) ||
                            o.customer_name?.toLowerCase().includes(term) ||
                            o.customer_phone?.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'all' ? true : o.order_status === statusFilter;
      const matchesSource = sourceFilter === 'all' ? true : o.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  const paginatedOrders = useMemo(() => {
    const start = page * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, page]);

  // Open Details Drawer
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderStatusVal(order.order_status);
    setPaymentStatusVal(order.payment_status);
    setTrackingNumber(order.tracking_number || '');
    setTrackingUrl(order.tracking_url || '');
    setCourierName(order.courier_name || '');
  };

  // Save Order Updates
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_status: orderStatusVal,
          payment_status: paymentStatusVal,
          tracking_number: trackingNumber.trim(),
          tracking_url: trackingUrl.trim(),
          courier_name: courierName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Order Saved', `Order #${selectedOrder.order_number} record updated.`);
        setSelectedOrder(null);
        onRefresh();
      } else {
        showToast('error', 'Update Error', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to connect to billing server.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Helper: Print invoice
  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = order.items.map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
        <td style="padding: 10px 0;">
          <strong>${item.product_name}</strong><br/>
          <span style="font-size: 9px; color: #64748b;">Size: UK-${item.size} ${item.color ? `&middot; ${item.color}` : ''}</span>
        </td>
        <td style="padding: 10px 0; text-align: center; font-family: monospace;">${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right; font-family: monospace;">₹${(item.price / 100).toFixed(2)}</td>
        <td style="padding: 10px 0; text-align: right; font-family: monospace;">₹${((item.price * item.quantity) / 100).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - #${order.order_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: -0.02em; }
            .invoice-title { text-align: right; }
            .details { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-top: 40px; font-size: 12px; }
            .table-container { margin-top: 40px; }
            table { width: 100%; border-collapse: collapse; }
            th { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
            .totals { margin-top: 30px; margin-left: auto; width: 300px; font-size: 12px; }
            .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
            .grand-total { border-top: 2px solid #0f172a; font-weight: 800; font-size: 14px; padding-top: 10px !important; }
            .footer { margin-top: 80px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">HeelsUp</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Premium Footwear Co.</div>
            </div>
            <div class="invoice-title">
              <h2 style="margin: 0; font-weight: 300;">TAX INVOICE</h2>
              <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 5px;">Invoice Ref: #${order.order_number}</div>
            </div>
          </div>

          <div class="details">
            <div>
              <h4 style="margin: 0 0 10px; text-transform: uppercase; font-size: 11px; color: #64748b;">Billed To:</h4>
              <strong>${order.customer_name}</strong><br/>
              Phone: ${order.customer_phone}<br/>
              ${order.customer_email ? `Email: ${order.customer_email}<br/>` : ''}
              ${order.address_line1 || ''}<br/>
              ${order.address_line2 || ''}<br/>
              ${order.city || ''}, ${order.state || ''} - ${order.pincode || ''}
            </div>
            <div style="text-align: right;">
              <h4 style="margin: 0 0 10px; text-transform: uppercase; font-size: 11px; color: #64748b;">Order Info:</h4>
              Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}<br/>
              Payment Method: <span style="text-transform: uppercase;">${order.payment_method}</span><br/>
              Payment Status: <span style="text-transform: uppercase;">${order.payment_status}</span><br/>
              Delivery Source: <span style="text-transform: uppercase;">${order.source}</span>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Description</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 100px;">Rate</th>
                  <th style="text-align: right; width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div>
              <span>Subtotal:</span>
              <span style="font-family: monospace;">₹${(order.subtotal_amount / 100).toFixed(2)}</span>
            </div>
            <div>
              <span>Shipping Fee:</span>
              <span style="font-family: monospace;">₹${(order.shipping_amount / 100).toFixed(2)}</span>
            </div>
            ${order.discount_amount > 0 ? `
              <div style="color: #be123c;">
                <span>Discounts:</span>
                <span style="font-family: monospace;">-₹${(order.discount_amount / 100).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="grand-total">
              <span>Total Payable:</span>
              <span style="font-family: monospace;">₹${(order.total_amount / 100).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            Thank you for shopping at HeelsUp. In case of exchanges, visit heelsup.in/returns.<br/>
            This is a system generated document. No signature required.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-neutral-900 animate-fade-in relative">
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div>
          <h1 className="text-3xl font-light text-neutral-900 font-display italic">Billing Orders Registry</h1>
          <p className="text-xs text-neutral-500">Process and fulfill customer retail logs and transaction manifests</p>
        </div>

        {/* Filter Row */}
        <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="Search order #, customer..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-primary/50"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 text-xs text-neutral-900 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="placed">Placed</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 text-xs text-neutral-900 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="web">Web Storefront</option>
              <option value="pos">In-store POS</option>
              <option value="whatsapp">WhatsApp Order</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-1 hover:bg-neutral-100 rounded border border-neutral-200 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>{page + 1} / {Math.ceil(filteredOrders.length / itemsPerPage) || 1}</span>
            <button
              disabled={(page + 1) * itemsPerPage >= filteredOrders.length}
              onClick={() => setPage(p => p + 1)}
              className="p-1 hover:bg-neutral-100 rounded border border-neutral-200 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid Table */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-mono">
                <th className="p-4">Order #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Order status</th>
                <th className="p-4">Payment</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginatedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50/20 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-600">#{o.order_number}</td>
                  <td className="p-4 text-neutral-900 font-mono">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="p-4">
                    <h4 className="font-bold text-neutral-900 text-xs">{o.customer_name}</h4>
                    <span className="text-[9px] text-neutral-500 font-mono">{o.customer_phone}</span>
                  </td>
                  <td className="p-4 font-mono font-bold text-black">₹{(o.total_amount / 100).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${o.source === 'pos' ? 'bg-sky-500/10 border border-sky-500/20 text-sky-600' : 'bg-neutral-100 text-neutral-500'}`}>
                      {o.source}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      o.order_status === 'delivered' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' :
                      o.order_status === 'cancelled' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600' :
                      o.order_status === 'shipped' ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' :
                      'bg-amber-500/10 border border-amber-500/20 text-amber-600'
                    }`}>
                      {o.order_status}
                    </span>
                  </td>
                  <td className="p-4 uppercase text-[9px] font-mono font-bold">
                    <span className={o.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-500'}>
                      {o.payment_status} &middot; {o.payment_method}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenDetails(o)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-lg transition-all"
                        title="View & Edit"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(o)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-lg transition-all"
                        title="Print Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-24 text-center text-neutral-500 italic font-mono bg-white">No billing manifests match criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs"></div>
          <div className="w-full max-w-xl bg-white border-l border-neutral-200/80 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 font-mono">
                  Modify Manifest: <span className="text-blue-600">#{selectedOrder.order_number}</span>
                </h3>
                <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order items lists */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Order Items</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs">
                      <div>
                        <h5 className="font-bold text-neutral-900">{item.product_name}</h5>
                        <span className="text-[9px] text-neutral-500 font-mono">Size UK-{item.size} {item.color ? `&middot; ${item.color}` : ''} &middot; {item.quantity} units</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-700">₹{((item.price * item.quantity) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address details */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3 text-xs leading-relaxed text-neutral-700">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 border-b border-neutral-200 pb-2">Customer Address Details</h4>
                <p>
                  <strong>Ship To:</strong> {selectedOrder.customer_name}<br/>
                  <strong>Phone:</strong> {selectedOrder.customer_phone}<br/>
                  {selectedOrder.customer_email && <><strong>Email:</strong> {selectedOrder.customer_email}<br/></>}
                  {selectedOrder.address_line1 && <>{selectedOrder.address_line1}<br/></>}
                  {selectedOrder.address_line2 && <>{selectedOrder.address_line2}<br/></>}
                  {selectedOrder.city && <>{selectedOrder.city}, {selectedOrder.state || ''} - {selectedOrder.pincode || ''}</>}
                </p>
                {selectedOrder.notes && (
                  <div className="mt-2 p-2.5 bg-white border border-neutral-200 rounded-xl text-[11px] text-neutral-500 italic">
                    Note: "{selectedOrder.notes}"
                  </div>
                )}
              </div>

              {/* Update Status Form */}
              <form onSubmit={handleSaveOrder} className="space-y-5 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Order Status</label>
                    <select
                      value={orderStatusVal}
                      onChange={(e) => setOrderStatusVal(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                    >
                      <option value="placed">Placed / In Queue</option>
                      <option value="confirmed">Confirmed / Processing</option>
                      <option value="shipped">Shipped / Dispatched</option>
                      <option value="delivered">Delivered / Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Payment Status</label>
                    <select
                      value={paymentStatusVal}
                      onChange={(e) => setPaymentStatusVal(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                    >
                      <option value="pending">Pending Payment</option>
                      <option value="paid">Paid / Settled</option>
                      <option value="failed">Failed / Refunded</option>
                    </select>
                  </div>
                </div>

                {/* Delivery details */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-4">
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 border-b border-neutral-200 pb-2 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-neutral-900" /> Courier Dispatch Registry
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">Courier Partner</label>
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. Delhivery, Bluedart"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">Awb Tracking #</label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. 123456789"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">Tracking Redirect Url</label>
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="https://delhivery.com/track/..."
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:bg-neutral-100"
                >
                  {updatingStatus ? 'Syncing...' : 'Save Order Manifest'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
