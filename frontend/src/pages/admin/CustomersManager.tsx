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
    <div className="space-y-6 text-white animate-fade-in relative">
      <div>
        <h1 className="text-2xl font-light text-white font-display italic">Registered Customers</h1>
        <p className="text-xs text-neutral-400">Moderate customer accounts, view order profiles and purchase logs</p>
      </div>

      {/* Filter Row */}
      <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Search customers by name, email, phone..."
            className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="p-1 hover:bg-[#171715] rounded border border-neutral-800 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>{page + 1} / {Math.ceil(filtered.length / itemsPerPage) || 1}</span>
          <button
            disabled={(page + 1) * itemsPerPage >= filtered.length}
            onClick={() => setPage(p => p + 1)}
            className="p-1 hover:bg-[#171715] rounded border border-neutral-800 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-[#0f0f0e] border border-neutral-900 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121211] text-neutral-400 border-b border-neutral-850 font-mono">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4 text-center">Orders</th>
                <th className="p-4 text-center">Total Spent</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/60">
              {paginated.map((c) => (
                <tr key={c.id} className="hover:bg-[#121211]/20 transition-colors">
                  <td className="p-4 font-bold text-white text-xs">{c.first_name} {c.last_name || ''}</td>
                  <td className="p-4 font-mono text-neutral-350">{c.email}</td>
                  <td className="p-4 font-mono text-neutral-400">{c.phone || '—'}</td>
                  <td className="p-4 text-center font-mono">{c.orders_count || 0} orders</td>
                  <td className="p-4 text-center font-mono font-bold text-neutral-200">₹{((c.total_spent || 0) / 100).toFixed(2)}</td>
                  <td className="p-4 text-neutral-400 font-mono">{new Date(c.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleBlock(c)}
                      className={`px-3 py-1.5 font-bold uppercase rounded-xl text-[9px] flex items-center gap-1.5 ml-auto tracking-wider transition-all border ${
                        c.is_blocked 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
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
                  <td colSpan={7} className="py-24 text-center text-neutral-500 italic font-mono bg-[#0f0f0e]">No customer profiles found matching search query.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
