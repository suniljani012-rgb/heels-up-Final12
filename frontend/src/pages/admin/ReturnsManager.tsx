import { useState, useMemo } from 'react';
import { RotateCw, Search, Eye, RefreshCw, X, Phone, Mail } from 'lucide-react';

interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  return_type: 'refund' | 'exchange';
  reason: string;
  items: string; // JSON string representing array of items
  status: 'pending' | 'approved' | 'received' | 'completed' | 'rejected';
  action_notes?: string;
  created_at: string;
  updated_at: string;
}

interface ReturnsManagerProps {
  returns: ReturnRequest[];
  onRefresh: () => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export default function ReturnsManager({ returns, onRefresh, showToast }: ReturnsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Return Details Drawer
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Filter returns
  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      const term = searchQuery.toLowerCase();
      const matchSearch = r.order_number?.toLowerCase().includes(term) ||
                          r.customer_name?.toLowerCase().includes(term) ||
                          r.customer_phone?.toLowerCase().includes(term) ||
                          r.reason?.toLowerCase().includes(term);
      
      const matchStatus = filterStatus ? r.status === filterStatus : true;
      return matchSearch && matchStatus;
    });
  }, [returns, searchQuery, filterStatus]);

  // Parse items from JSON
  const parseItems = (itemsJson: string): any[] => {
    try {
      return JSON.parse(itemsJson || '[]');
    } catch {
      return [];
    }
  };

  // Status transitions handler
  const handleUpdateStatus = async (status: 'approved' | 'received' | 'completed' | 'rejected') => {
    if (!selectedReturn) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/admin/returns/${selectedReturn.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ status, admin_note: actionNotes.trim(), admin_notes: actionNotes.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Status Updated', `Return request #${selectedReturn.order_number} is now marked as ${status}.`);
        setSelectedReturn(null);
        setActionNotes('');
        onRefresh();
      } else {
        showToast('error', 'Update Failed', data.error || 'Database transaction error.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not save return status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openReturnDrawer = (ret: ReturnRequest) => {
    setSelectedReturn(ret);
    setActionNotes(ret.action_notes || '');
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Search and Filters */}
      <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by order number, customer phone, reason..."
              className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#121211] border border-neutral-850 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="">All Claims</option>
              <option value="pending">Pending Claim</option>
              <option value="approved">Approved</option>
              <option value="received">Items Received</option>
              <option value="completed">Completed / Exchanged</option>
              <option value="rejected">Rejected Claim</option>
            </select>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 border border-neutral-850 hover:bg-neutral-850 rounded-xl text-neutral-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Claims List Table */}
      <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-[#121211]/80 border-b border-neutral-900">
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <RotateCw className="w-4 h-4 text-amber-500" />
            Product Returns & Exchanges registry ({filteredReturns.length} active claims)
          </span>
        </div>

        {filteredReturns.length === 0 ? (
          <div className="py-24 text-center text-xs text-neutral-500 border border-dashed border-neutral-850 m-4 rounded-xl">
            No return request claims match your selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#070707] text-neutral-400 border-b border-neutral-900 font-mono">
                  <th className="p-3 font-bold uppercase tracking-wider">Order No</th>
                  <th className="p-3 font-bold uppercase tracking-wider">Customer</th>
                  <th className="p-3 font-bold uppercase tracking-wider">Claim Type</th>
                  <th className="p-3 font-bold uppercase tracking-wider">Reason of Return</th>
                  <th className="p-3 font-bold uppercase tracking-wider">Status</th>
                  <th className="p-3 font-bold uppercase tracking-wider">Claims Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 font-sans text-white">
                {filteredReturns.map(r => (
                  <tr key={r.id} className="hover:bg-[#121211]/25 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-amber-500 font-bold">
                      {r.order_number}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-neutral-300">{r.customer_name}</div>
                      <span className="text-[9px] text-neutral-500 block font-mono">{r.customer_phone}</span>
                    </td>
                    <td className="p-3 uppercase font-mono text-[10px]">
                      {r.return_type === 'exchange' ? (
                        <span className="text-amber-500">🔄 Exchange</span>
                      ) : (
                        <span className="text-rose-400">💵 Refund</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-400 max-w-xs truncate text-[11px]">
                      {r.reason}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        r.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        r.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        r.status === 'received' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-neutral-500">
                      {new Date(r.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openReturnDrawer(r)}
                        className="p-1 text-[#ead2ae] hover:bg-neutral-900 rounded inline-flex items-center gap-1.5 text-[10px] uppercase font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Claim
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DRAWER: Claims details and processing panel */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSelectedReturn(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Return Request Review Panel</h3>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="p-1.5 rounded-lg border border-neutral-850 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Order and Customer Contact Card */}
              <div className="p-4 bg-[#121211] border border-neutral-850 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-amber-500 font-bold font-mono">ORDER: {selectedReturn.order_number}</span>
                  <span className="text-[9px] text-neutral-500">{new Date(selectedReturn.created_at).toLocaleString()}</span>
                </div>
                <h4 className="text-xs font-bold text-white uppercase">{selectedReturn.customer_name}</h4>
                <div className="flex flex-col gap-1 text-[10px] text-neutral-400 font-mono pt-1">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-neutral-500" /> {selectedReturn.customer_phone}</span>
                  {selectedReturn.customer_email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-neutral-500" /> {selectedReturn.customer_email}</span>}
                </div>
              </div>

              {/* Items returning list */}
              <div className="space-y-2">
                <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Returning Items Details</span>
                <div className="space-y-2">
                  {parseItems(selectedReturn.items).map((it, idx) => (
                    <div key={idx} className="p-3 bg-[#070707] border border-neutral-900 rounded-xl flex justify-between items-center text-[11px]">
                      <div>
                        <span className="text-white block font-semibold">{it.product_name || 'Heelsup footwear'}</span>
                        <span className="text-neutral-500 text-[9px] font-mono">Size: {it.size} | Qty: {it.quantity || 1}</span>
                      </div>
                      <span className="font-mono text-neutral-400">₹{it.price ? (it.price / 100).toFixed(2) : '0.00'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason card */}
              <div className="p-4 bg-[#1b120c]/60 border border-amber-900/20 rounded-xl space-y-1">
                <span className="block text-[8px] font-bold text-amber-500 uppercase tracking-wider">Reason of Return Claim:</span>
                <p className="text-[11px] text-neutral-300 leading-relaxed italic">"{selectedReturn.reason}"</p>
              </div>

              {/* Action Notes Form */}
              <div className="space-y-3 pt-2">
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Claim Review Notes</label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  placeholder="Record packaging conditions, replacement tracking numbers, or processing logs here..."
                  className="w-full bg-[#121211] border border-neutral-850 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Claim Action Pipelines */}
              <div className="space-y-2">
                <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Execution Pipeline</span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedReturn.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus('approved')}
                        disabled={updatingStatus}
                        className="py-2.5 bg-emerald-500 text-neutral-950 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-emerald-600 transition-colors"
                      >
                        Approve Claim
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('rejected')}
                        disabled={updatingStatus}
                        className="py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-rose-500 hover:text-neutral-950 transition-colors"
                      >
                        Reject Claim
                      </button>
                    </>
                  )}
                  {selectedReturn.status === 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus('received')}
                      disabled={updatingStatus}
                      className="col-span-2 py-2.5 bg-purple-500 text-neutral-950 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-purple-600 transition-colors"
                    >
                      Confirm Item Received in Store
                    </button>
                  )}
                  {selectedReturn.status === 'received' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={updatingStatus}
                      className="col-span-2 py-2.5 bg-[#ead2ae] text-neutral-950 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-[#b17e3f] transition-colors"
                    >
                      {selectedReturn.return_type === 'exchange' ? 'Ship Replacement Item' : 'Issue Net Refund'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedReturn(null)}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Close claim panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
