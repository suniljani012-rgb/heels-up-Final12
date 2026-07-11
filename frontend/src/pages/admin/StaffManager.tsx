import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, ShieldCheck } from 'lucide-react';

interface StaffUser {
  id: number;
  email: string;
  role: string;
  name?: string;
  active: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

interface StaffManagerProps {
  staff: StaffUser[];
  token: string;
  onRefresh: () => void;
}

export default function StaffManager({ staff, token, onRefresh }: StaffManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('manager');
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState('');

  // Filter staff
  const filtered = staff.filter(s => 
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open add
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setEmail('');
    setName('');
    setRole('manager');
    setActive(true);
    setPassword('');
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (s: StaffUser) => {
    setEditingStaff(s);
    setEmail(s.email);
    setName(s.name || '');
    setRole(s.role);
    setActive(s.active);
    setPassword(''); // leave empty to not change
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('error', 'Missing Fields', 'Email address is required.');
      return;
    }

    const payload: any = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      active
    };

    if (password) {
      payload.password = password;
    }

    try {
      const url = editingStaff ? `/api/admin/staff/${editingStaff.id}` : '/api/admin/staff';
      const method = editingStaff ? 'PUT' : 'POST';

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
        showToast('success', 'Staff Member Saved', `Credentials synchronized for '${email}'.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to identity provider.');
    }
  };

  // Delete staff member
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to revoke this staff member\'s access permanently? They will be logged out instantly.')) return;
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Access Revoked', 'Staff member deleted from database.');
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
            <h1 className="text-3xl font-light text-neutral-900 font-display italic">Staff Management</h1>
            <p className="text-xs text-neutral-500">Manage internal users, role access models, and session scopes</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Register Staff
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
              placeholder="Search staff email, name..."
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
                <th className="p-4">Name / Info</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role Profile</th>
                <th className="p-4">2FA State</th>
                <th className="p-4">Access status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/20 transition-colors">
                  <td className="p-4 font-bold text-neutral-900 text-xs">{s.name || 'Anonymous User'}</td>
                  <td className="p-4 font-mono text-neutral-700">{s.email}</td>
                  <td className="p-4 font-mono font-bold text-neutral-900 capitalize">{s.role}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${s.two_factor_enabled ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 'bg-neutral-200 text-neutral-500'}`}>
                      {s.two_factor_enabled ? 'Verified' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${s.active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {s.active ? 'Granted' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-lg transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
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
                  <td colSpan={6} className="py-24 text-center text-neutral-500 italic font-mono bg-white">No staff credentials match criteria.</td>
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
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-neutral-900" /> {editingStaff ? 'Modify Staff Credentials' : 'Register Staff Account'}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. staff@heelsup.in"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Role Type</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                    >
                      <option value="admin">Administrator (Full Scope)</option>
                      <option value="manager">Manager (No Purges)</option>
                      <option value="pos">POS Cashier (POS Terminal Only)</option>
                      <option value="support">Customer Support (Exchanges/Reviews)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Access Status</label>
                    <div className="flex items-center gap-2 pt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => setActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-neutral-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-white"></div>
                        <span className="ml-2 text-neutral-500 text-[10px] font-bold">Access Granted</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">
                    {editingStaff ? 'New Password (Leave blank to keep current)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required={!editingStaff}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Credentials
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
