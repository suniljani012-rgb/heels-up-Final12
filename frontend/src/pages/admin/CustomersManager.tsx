import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, UserMinus, UserCheck } from 'lucide-react';

interface Customer {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
  is_blocked: boolean;
}

interface CustomersManagerProps {
  customers: Customer[];
  onToggleBlock: (cust: Customer) => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export default function CustomersManager({ customers, onToggleBlock, showToast }: CustomersManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const itemsPerPage = 15;

  // Filter customers
  const filtered = useMemo(() => {
    return customers.filter(c => {
      const term = searchQuery.toLowerCase();
      return (c.first_name || '').toLowerCase().includes(term) ||
             (c.last_name || '').toLowerCase().includes(term) ||
             (c.email || '').toLowerCase().includes(term) ||
             (c.phone || '').includes(term);
    });
  }, [customers, searchQuery]);

  const paginated = useMemo(() => {
    const start = page * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page]);

  return (
    <div className="space-y-6 text-neutral-900 animate-fade-in relative">
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div>
          <h1 className="text-3xl font-light text-neutral-900 font-display italic">Registered Customers</h1>
          <p className="text-xs text-neutral-500">Moderate customer accounts, view order profiles and purchase logs</p>
        </div>

        {/* Filter Row */}
        <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search customers by name, email, phone..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-1 hover:bg-neutral-100 rounded border border-neutral-200 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>{page + 1} / {Math.ceil(filtered.length / itemsPerPage) || 1}</span>
            <button
              disabled={(page + 1) * itemsPerPage >= filtered.length}
              onClick={() => setPage(p => p + 1)}
              className="p-1 hover:bg-neutral-100 rounded border border-neutral-200 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-mono">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4 text-center">Orders</th>
                <th className="p-4 text-center">Total Spent</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginated.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/20 transition-colors">
                  <td className="p-4 font-bold text-neutral-900 text-xs">{c.first_name} {c.last_name || ''}</td>
                  <td className="p-4 font-mono text-neutral-700">{c.email}</td>
                  <td className="p-4 font-mono text-neutral-500">{c.phone || '—'}</td>
                  <td className="p-4 text-center font-mono">{c.orders_count || 0} orders</td>
                  <td className="p-4 text-center font-mono font-bold text-neutral-200">₹{((c.total_spent || 0) / 100).toFixed(2)}</td>
                  <td className="p-4 text-neutral-500 font-mono">{new Date(c.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleBlock(c)}
                      className={`px-3 py-1.5 font-bold uppercase rounded-xl text-[9px] flex items-center gap-1.5 ml-auto tracking-wider transition-all border ${
                        c.is_blocked 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-600 hover:bg-rose-500/20'
                      }`}
                    >
                      {c.is_blocked ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Unblock Account
                        </>
                      ) : (
                        <>
                          <UserMinus className="w-3.5 h-3.5" /> Block Account
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center text-neutral-500 italic font-mono bg-white">No customer profiles found matching search query.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
