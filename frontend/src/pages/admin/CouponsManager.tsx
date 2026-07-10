import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Search } from 'lucide-react';

interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  max_discount?: number;
  max_uses?: number;
  used_count: number;
  active: boolean;
  expires_at?: string;
  description?: string;
}

interface CouponsManagerProps {
  coupons: Coupon[];
  token: string;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onRefresh: () => void;
}

export default function CouponsManager({ coupons, token, showToast, onRefresh }: CouponsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [active, setActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');

  // Filter coupons
  const filtered = coupons.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()));

  // Open add
  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setCode('');
    setType('percentage');
    setValue('');
    setMinOrder('0');
    setMaxDiscount('');
    setMaxUses('');
    setActive(true);
    setExpiresAt('');
    setDescription('');
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setType(c.type);
    setValue((c.value).toString());
    setMinOrder((c.min_order / 100).toString()); // assuming stored in paise
    setMaxDiscount(c.max_discount ? (c.max_discount / 100).toString() : '');
    setMaxUses(c.max_uses ? c.max_uses.toString() : '');
    setActive(c.active);
    setExpiresAt(c.expires_at ? c.expires_at.split(' ')[0] : '');
    setDescription(c.description || '');
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value) {
      showToast('error', 'Missing Fields', 'Coupon Code and Value are required.');
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      type,
      value: parseFloat(value),
      min_order: Math.round(parseFloat(minOrder || '0') * 100), // convert to paise
      max_discount: maxDiscount ? Math.round(parseFloat(maxDiscount) * 100) : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      active,
      expires_at: expiresAt ? expiresAt + ' 23:59:59' : null,
      description: description.trim()
    };

    try {
      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Promo Code Saved', `Promo Code '${code}' recorded.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to coupon service.');
    }
  };

  // Delete coupon
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this promo code? Usage histories for completed orders will remain in the database.')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Promo Code Purged', 'Promo Code removed successfully.');
        onRefresh();
      } else {
        showToast('error', 'Delete Denied', data.error || 'Access denied.');
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  return (
    <div className="space-y-6 text-neutral-900 animate-fade-in relative">
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-neutral-900 font-display italic">Promo Codes Registry</h1>
            <p className="text-xs text-neutral-500">Manage campaign discounts and customer checkout coupons</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Promo Code
          </button>
        </div>

        {/* Filter Row */}
        <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search promo codes..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-mono">
                <th className="p-4">Code</th>
                <th className="p-4">Type</th>
                <th className="p-4">Value</th>
                <th className="p-4">Min Spend</th>
                <th className="p-4">Uses Limit</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/20 transition-colors">
                  <td className="p-4 font-mono font-bold text-neutral-900 text-xs">{c.code}</td>
                  <td className="p-4 text-neutral-500 capitalize">{c.type}</td>
                  <td className="p-4 font-mono font-bold text-neutral-900">
                    {c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}
                  </td>
                  <td className="p-4 font-mono text-neutral-500">₹{(c.min_order / 100).toFixed(0)}</td>
                  <td className="p-4 font-mono text-neutral-500">{c.used_count} / {c.max_uses || '∞'}</td>
                  <td className="p-4 font-mono text-neutral-500">{c.expires_at ? c.expires_at.split(' ')[0] : 'Never'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${c.active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {c.active ? 'Active' : 'Expired/Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-lg transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 bg-neutral-100 hover:bg-rose-50 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-24 text-center text-neutral-500 italic font-mono bg-white">No promo codes match criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs"></div>
          <div className="w-full max-w-md bg-white border-l border-neutral-200/80 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 font-mono">
                  {editingCoupon ? 'Modify Promo Code' : 'Create Promo Code'}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. JODHPUR50"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Discount Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Price (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Discount Value</label>
                    <input
                      type="number"
                      required
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={type === 'percentage' ? '15' : '500'}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Min Spend Required (₹)</label>
                    <input
                      type="number"
                      value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                      placeholder="1000"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Max Cap (Percentage only, ₹)</label>
                    <input
                      type="number"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      placeholder="500"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Max Uses Limit</label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      placeholder="100"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Expiration Date</label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Campaign Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 15% off Oxford Jodhpurs on order above 3999"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-neutral-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-white"></div>
                    <span className="ml-2 text-neutral-500 text-[10px] font-bold">Coupon Code Active</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Coupon Record
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
