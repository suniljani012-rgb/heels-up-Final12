import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X } from 'lucide-react';
import HeicImage from '../../components/HeicImage';

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
  active: boolean;
  sort_order: number;
}

interface BannersManagerProps {
  banners: Banner[];
  token: string;
  onRefresh: () => void;
}

export default function BannersManager({ banners, token, onRefresh }: BannersManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('');
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Open add
  const handleOpenAdd = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setLink('');
    setActive(true);
    setSortOrder('0');
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (b: Banner) => {
    setEditingBanner(b);
    setTitle(b.title);
    setSubtitle(b.subtitle || '');
    setImageUrl(b.image_url);
    setLink(b.link || '');
    setActive(b.active);
    setSortOrder(b.sort_order.toString());
    setDrawerOpen(true);
  };

  // File Upload Helper
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);

    try {
      const formData = new FormData();
      const file = e.target.files[0];
      
      // HEIC support
      if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        formData.append('files', new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' }));
      } else {
        formData.append('files', file);
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data) {
        setImageUrl(data.data.urls[0]);
        showToast('success', 'Banner Processed', 'Image uploaded successfully.');
      } else {
        showToast('error', 'Upload Error', data.error || 'Server rejected file upload.');
      }
    } catch {
      showToast('error', 'Upload Failed', 'Failure occurred during image upload pipeline.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      showToast('error', 'Missing Fields', 'Banner Title and Image URL are required.');
      return;
    }

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      image_url: imageUrl.trim(),
      link: link.trim(),
      active,
      sort_order: parseInt(sortOrder) || 0
    };

    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = editingBanner ? 'PUT' : 'POST';

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
        showToast('success', 'Banner Saved', `Banner '${title}' recorded.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to banner service.');
    }
  };

  // Delete banner
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this homepage banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Purged', 'Banner removed successfully.');
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
            <h1 className="text-3xl font-light text-neutral-900 font-display italic">Homepage Banners</h1>
            <p className="text-xs text-neutral-500">Configure promotional slides and active landing media</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>
      </div>

      {/* Grid of Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((b) => (
          <div key={b.id} className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-xl flex flex-col group">
            <div className="aspect-[21/9] bg-white relative border-b border-neutral-200/80 flex items-center justify-center p-1 overflow-hidden">
              {b.image_url ? (
                <HeicImage src={b.image_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <span className="text-[10px] font-mono text-neutral-600">No image loaded</span>
              )}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${b.active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                  {b.active ? 'Active' : 'Draft'}
                </span>
                <span className="bg-neutral-100/90 border border-neutral-200 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold text-neutral-700">Order {b.sort_order}</span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-neutral-900 text-xs line-clamp-1">{b.title}</h4>
                <p className="text-[10px] text-neutral-500 line-clamp-2">{b.subtitle || 'No subtitle provided.'}</p>
                {b.link && (
                  <span className="text-[9px] text-neutral-900 font-mono block truncate mt-2">Redirect: {b.link}</span>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-neutral-200/80/60">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-[10px] uppercase tracking-wider text-center"
                >
                  Edit Banner
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="px-3 py-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-rose-600 border border-[#ef4444]/15 font-bold rounded-xl text-[10px] uppercase"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="col-span-full py-24 text-center text-neutral-500 italic bg-white rounded-3xl border border-neutral-200/80">
            No homepage promotional banners configured.
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs"></div>
          <div className="w-full max-w-md bg-white border-l border-neutral-200/80 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900 font-mono">
                  {editingBanner ? 'Modify Banner' : 'Create Banner'}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Banner Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Royal Jodhpur Edition"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Subtitle (Optional)</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Crafted in Premium Full Grain Leather"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Action Link (Optional)</label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="e.g. /shop?category=boots"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Sort Position</label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Status</label>
                    <div className="flex items-center gap-2 pt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => setActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-neutral-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-white"></div>
                        <span className="ml-2 text-neutral-455 text-[10px] font-bold">Banner Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* File Upload box */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Banner Image</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      required
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://media.heelsup.in/banners/..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                    />
                    <label className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-mono font-bold uppercase rounded-xl cursor-pointer shrink-0">
                      Upload
                      <input
                        type="file"
                        accept="image/*,.heic"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {uploadingImage && (
                    <span className="text-[10px] font-mono text-neutral-900 italic">Uploading file, converting HEIC...</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Banner Record
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
