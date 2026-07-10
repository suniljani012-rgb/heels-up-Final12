import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Search } from 'lucide-react';

interface PageConfig {
  id: number;
  title: string;
  slug: string;
  content: string;
  active: boolean;
}

interface PagesManagerProps {
  pages: PageConfig[];
  token: string;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onRefresh: () => void;
}

export default function PagesManager({ pages, token, showToast, onRefresh }: PagesManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageConfig | null>(null);

  // Form states
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [pageActive, setPageActive] = useState(true);

  // Filter pages
  const filtered = pages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Open add
  const handleOpenAdd = () => {
    setEditingPage(null);
    setPageTitle('');
    setPageSlug('');
    setPageContent('');
    setPageActive(true);
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (p: PageConfig) => {
    setEditingPage(p);
    setPageTitle(p.title);
    setPageSlug(p.slug);
    setPageContent(p.content || '');
    setPageActive(p.active);
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle || !pageSlug) {
      showToast('error', 'Missing Fields', 'Page Title and Slug are required.');
      return;
    }

    const payload = {
      title: pageTitle.trim(),
      slug: pageSlug.trim().toLowerCase(),
      content: pageContent.trim(),
      active: pageActive
    };

    try {
      const url = editingPage ? `/api/admin/pages/${editingPage.id}` : '/api/admin/pages';
      const method = editingPage ? 'PUT' : 'POST';

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
        showToast('success', 'Page Saved', `Page '${pageTitle}' recorded.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to static page database.');
    }
  };

  // Delete page
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this static page? Storefront links to this slug will return 404.')) return;
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Page Purged', 'Static page removed successfully.');
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
          <h1 className="text-2xl font-light text-neutral-900 font-display italic">Static Pages</h1>
          <p className="text-xs text-neutral-500">Configure storefront content like privacy policy, sizing guides, and terms</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Static Page
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
            placeholder="Search pages..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-mono">
                <th className="p-4">Page Title</th>
                <th className="p-4">Url Slug</th>
                <th className="p-4">Content Size</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/20 transition-colors">
                  <td className="p-4 font-bold text-neutral-900 text-xs">{p.title}</td>
                  <td className="p-4 font-mono text-neutral-500">/{p.slug}</td>
                  <td className="p-4 text-neutral-500 font-mono">{p.content?.length || 0} characters</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {p.active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-lg transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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
                  <td colSpan={5} className="py-24 text-center text-neutral-500 italic font-mono bg-white">No static pages match criteria.</td>
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
          <div className="w-full max-w-2xl bg-white border-l border-neutral-200/80 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 font-mono">
                  {editingPage ? 'Modify Static Page' : 'Create Static Page'}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Page Title</label>
                    <input
                      type="text"
                      required
                      value={pageTitle}
                      onChange={(e) => {
                        setPageTitle(e.target.value);
                        if (!editingPage) setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }}
                      placeholder="e.g. Terms of Service"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">URL Slug</label>
                    <input
                      type="text"
                      required
                      value={pageSlug}
                      onChange={(e) => setPageSlug(e.target.value)}
                      placeholder="e.g. terms"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">HTML Content</label>
                  <textarea
                    rows={12}
                    required
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    placeholder="<h1>Terms of Service</h1><p>Welcome to HeelsUp...</p>"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-neutral-900 focus:outline-none font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageActive}
                      onChange={(e) => setPageActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-neutral-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-white"></div>
                    <span className="ml-2 text-neutral-500 text-[10px] font-bold">Publish Page (Make Public)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Static Page
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
