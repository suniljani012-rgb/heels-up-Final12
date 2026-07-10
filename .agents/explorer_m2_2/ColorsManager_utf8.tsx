import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Search } from 'lucide-react';

interface Color {
  id: number;
  name: string;
  hex_code: string;
}

interface ColorsManagerProps {
  colors: Color[];
  token: string;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onRefresh: () => void;
}

export default function ColorsManager({ colors, token, showToast, onRefresh }: ColorsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);

  // Form states
  const [colorName, setColorName] = useState('');
  const [colorHexCode, setColorHexCode] = useState('');

  // Filter colors
  const filtered = colors.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Open add
  const handleOpenAdd = () => {
    setEditingColor(null);
    setColorName('');
    setColorHexCode('#c9a96e');
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (c: Color) => {
    setEditingColor(c);
    setColorName(c.name);
    setColorHexCode(c.hex_code);
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorName || !colorHexCode) {
      showToast('error', 'Missing Fields', 'Color Name and HEX code are required.');
      return;
    }

    const payload = {
      name: colorName.trim(),
      hex_code: colorHexCode.trim().toLowerCase()
    };

    try {
      const url = editingColor ? `/api/admin/colors/${editingColor.id}` : '/api/admin/colors';
      const method = editingColor ? 'PUT' : 'POST';

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
        showToast('success', 'Color Saved', `Color swatch '${colorName}' added.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to color database.');
    }
  };

  // Delete color
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this color definition?')) return;
    try {
      const res = await fetch(`/api/admin/colors/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Color Purged', 'Color swatch removed successfully.');
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-neutral-900 font-display italic">Database Colors</h1>
          <p className="text-xs text-neutral-500">Map leather colorway names to Hexadecimal swatch swatches</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Swatch
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
            placeholder="Search colors..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Color Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white border border-neutral-200/80 rounded-3xl p-4 shadow-lg flex flex-col items-center text-center space-y-4 hover:border-primary/30 transition-all group">
            {/* Color Swatch Circle */}
            <div
              className="w-16 h-16 rounded-full border border-neutral-200 shadow-inner group-hover:scale-105 transition-transform duration-300"
              style={{ backgroundColor: c.hex_code }}
            ></div>

            <div className="space-y-1 w-full">
              <h4 className="font-bold text-neutral-900 text-xs truncate px-1">{c.name}</h4>
              <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase tracking-wider block">{c.hex_code}</span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/80/60 w-full justify-center">
              <button
                onClick={() => handleOpenEdit(c)}
                className="p-1 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-lg transition-all"
                title="Edit Color"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-1 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 hover:text-rose-500 border border-[#ef4444]/15 rounded-lg transition-all"
                title="Delete Color"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center text-neutral-500 italic bg-white rounded-3xl border border-neutral-200/80">
            No colorway swatches defined.
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs"></div>
          <div className="w-full max-w-sm bg-white border-l border-neutral-200/80 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 font-mono">
                  {editingColor ? 'Modify Swatch' : 'Create Swatch'}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Color Name</label>
                  <input
                    type="text"
                    required
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    placeholder="e.g. Nero Black"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">HEX Code</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={colorHexCode}
                      onChange={(e) => setColorHexCode(e.target.value)}
                      className="w-10 h-8 bg-transparent border border-neutral-200 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      required
                      value={colorHexCode}
                      onChange={(e) => setColorHexCode(e.target.value)}
                      placeholder="#000000"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Swatch Definition
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
