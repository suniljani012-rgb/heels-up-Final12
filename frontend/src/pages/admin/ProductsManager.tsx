import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit3, X, UploadCloud, ChevronLeft, ChevronRight, Sliders, CheckCircle2, ShieldAlert } from 'lucide-react';
import HeicImage from '../../components/HeicImage';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // in paise
  original_price: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  sizes: string[];
  images: string[];
  description?: string;
  brand?: string;
  tags?: string[];
  show_mrp?: boolean;
  meta_title?: string;
  meta_desc?: string;
  size_stock?: { size_label: string; stock: number; reserved?: number }[];
}

interface ProductsManagerProps {
  products: Product[];
  categories: any[];
  token: string;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onRefresh: () => void;
}

export default function ProductsManager({ products, categories, token, showToast, onRefresh }: ProductsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(0);
  const itemsPerPage = 12;

  // Drawer / Modal states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodStock, setProdStock] = useState('0');
  const [prodActive, setProdActive] = useState(true);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodIsNew, setProdIsNew] = useState(true);
  const [prodIsTrending, setProdIsTrending] = useState(false);
  const [prodSizes, setProdSizes] = useState<string[]>([]);
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodDescription, setProdDescription] = useState('');
  const [prodBrand, setProdBrand] = useState('HeelsUp');
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [prodShowMrp, setProdShowMrp] = useState(true);
  const [prodMetaTitle, setProdMetaTitle] = useState('');
  const [prodMetaDesc, setProdMetaDesc] = useState('');
  const [prodSizeStock, setProdSizeStock] = useState<{ size_label: string; stock: number }[]>([]);

  // Temp states for tags and images
  const [tagInput, setTagInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // Standard shoe sizes
  const standardSizes = ['6', '7', '8', '9', '10', '11'];

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
      const matchesCat = selectedCategory ? p.category === selectedCategory : true;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const paginatedProducts = useMemo(() => {
    const start = page * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, page]);

  // Open Add Form
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSku('');
    setProdCategory(categories[0]?.name || '');
    setProdPrice('');
    setProdOriginalPrice('');
    setProdStock('0');
    setProdActive(true);
    setProdFeatured(false);
    setProdIsNew(true);
    setProdIsTrending(false);
    setProdSizes([]);
    setProdImages([]);
    setProdDescription('');
    setProdBrand('HeelsUp');
    setProdTags([]);
    setProdShowMrp(true);
    setProdMetaTitle('');
    setProdMetaDesc('');
    // Initialize stock array
    setProdSizeStock(standardSizes.map(s => ({ size_label: s, stock: 0 })));
    setDrawerOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdSku(p.sku);
    setProdCategory(p.category);
    setProdPrice((p.price / 100).toString());
    setProdOriginalPrice(p.original_price ? (p.original_price / 100).toString() : '');
    setProdStock(p.stock.toString());
    setProdActive(p.active);
    setProdFeatured(p.featured);
    setProdIsNew(p.is_new);
    setProdIsTrending(p.is_trending);
    setProdSizes(p.sizes || []);
    setProdImages(p.images || []);
    setProdDescription(p.description || '');
    setProdBrand(p.brand || 'HeelsUp');
    setProdTags(p.tags || []);
    setProdShowMrp(p.show_mrp !== undefined ? p.show_mrp : true);
    setProdMetaTitle(p.meta_title || '');
    setProdMetaDesc(p.meta_desc || '');
    
    // Map existing size stock
    const mapped = standardSizes.map(size => {
      const found = p.size_stock?.find(ss => ss.size_label === size);
      return { size_label: size, stock: found ? found.stock : 0 };
    });
    setProdSizeStock(mapped);
    setDrawerOpen(true);
  };

  // Image Upload helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImages(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        // HEIC client-side converter check
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
          const heic2any = (await import('heic2any')).default;
          const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          formData.append('files', new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' }));
        } else {
          formData.append('files', file);
        }
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data) {
        setProdImages(prev => [...prev, ...data.data.urls]);
        showToast('success', 'Images Uploaded', `${data.data.urls.length} images processed.`);
      } else {
        showToast('error', 'Upload Error', data.error || 'Server rejected file upload.');
      }
    } catch (err) {
      showToast('error', 'Upload Failed', 'Failure occurred during image upload pipeline.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodSku || !prodPrice) {
      showToast('error', 'Missing Fields', 'Product title, SKU and price are mandatory.');
      return;
    }

    const totalStock = prodSizeStock.reduce((sum, s) => sum + s.stock, 0);

    const payload = {
      name: prodName.trim(),
      sku: prodSku.trim().toUpperCase(),
      category: prodCategory,
      price: Math.round(parseFloat(prodPrice) * 100), // convert to paise
      original_price: prodOriginalPrice ? Math.round(parseFloat(prodOriginalPrice) * 100) : null,
      stock: totalStock,
      active: prodActive,
      featured: prodFeatured,
      is_new: prodIsNew,
      is_trending: prodIsTrending,
      sizes: prodSizeStock.filter(s => s.stock > 0).map(s => s.size_label),
      images: prodImages,
      description: prodDescription.trim(),
      brand: prodBrand.trim(),
      tags: prodTags,
      show_mrp: prodShowMrp,
      meta_title: prodMetaTitle.trim(),
      meta_desc: prodMetaDesc.trim(),
      size_stock: prodSizeStock.map(s => ({ size_label: s.size_label, stock: s.stock }))
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

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
        showToast('success', 'Catalog Synced', `Product '${prodName}' successfully saved.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected catalog submission.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to catalog database.');
    }
  };

  // Delete product
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this style entry from the catalog? This is irreversible.')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Product Purged', 'Catalog entry permanently deleted.');
        onRefresh();
      } else {
        showToast('error', 'Delete Denied', data.error || 'Access denied.');
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  return (
    <div className="space-y-6 text-white animate-fade-in relative">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white font-display italic">Products Catalog</h1>
          <p className="text-xs text-neutral-400">Manage Jodhpur Footwear collections & stock allocations</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Style Entry
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search name, SKU..."
              className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary/50"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(0); }}
            className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="p-1 hover:bg-[#171715] rounded border border-neutral-800 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>{page + 1} / {Math.ceil(filteredProducts.length / itemsPerPage) || 1}</span>
          <button
            disabled={(page + 1) * itemsPerPage >= filteredProducts.length}
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
                <th className="p-4 w-16">Image</th>
                <th className="p-4">Description</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/60">
              {paginatedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#121211]/20 transition-colors">
                  <td className="p-4">
                    {p.images && p.images.length > 0 ? (
                      <div className="w-10 h-10 bg-[#121211] rounded-lg overflow-hidden border border-neutral-850 flex items-center justify-center p-1">
                        <HeicImage src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-600 font-bold font-mono">N/A</div>
                    )}
                  </td>
                  <td className="p-4">
                    <h4 className="font-bold text-white text-xs">{p.name}</h4>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono mt-0.5 block">{p.brand || 'HeelsUp'}</span>
                  </td>
                  <td className="p-4 font-mono text-neutral-300 font-bold">{p.sku}</td>
                  <td className="p-4 text-neutral-400">{p.category}</td>
                  <td className="p-4 font-mono font-bold text-neutral-200">
                    ₹{(p.price / 100).toFixed(2)}
                    {p.original_price && (
                      <span className="text-[10px] text-neutral-650 line-through ml-2">₹{(p.original_price / 100).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="p-4 font-mono">
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${p.stock <= 5 ? 'bg-[#ef4444]/15 border border-[#ef4444]/25 text-rose-400' : 'bg-neutral-800 text-neutral-350'}`}>
                      {p.stock} units
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                      {p.active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 hover:text-primary rounded-lg transition-all"
                        title="Edit Style Entry"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 bg-neutral-800 hover:bg-[#ef4444]/15 hover:text-rose-500 rounded-lg transition-all"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-24 text-center text-neutral-500 italic font-mono bg-[#0f0f0e]">No products match the filter search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide drawer for add/edit product (Tailwind Sliding Drawer) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs"></div>
          
          {/* Content container */}
          <div className="w-full max-w-2xl bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary font-mono">
                  {editingProduct ? `Modify Entry: ${prodName}` : 'Add Style Entry to Catalog'}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-neutral-850 rounded-lg text-neutral-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Style Name</label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="e.g. Oxford Double Strap Jodhpur"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Style SKU (Unique)</label>
                    <input
                      type="text"
                      required
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      placeholder="e.g. HU-JODHPUR-01"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Category</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Price (Rupees)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="4999.00"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">MRP/Original (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prodOriginalPrice}
                      onChange={(e) => setProdOriginalPrice(e.target.value)}
                      placeholder="8999.00"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      placeholder="HeelsUp"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Show MRP / Discount Badge</label>
                    <div className="flex items-center gap-3 pt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prodShowMrp}
                          onChange={(e) => setProdShowMrp(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary/80"></div>
                        <span className="ml-2 text-neutral-400 text-[10px] font-bold">Visibility Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Size Stock grid */}
                <div className="bg-[#121211] border border-neutral-850 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 border-b border-neutral-850 pb-2">Size Stock Quantities</h4>
                  <div className="grid grid-cols-6 gap-3">
                    {prodSizeStock.map((s, idx) => (
                      <div key={idx} className="text-center space-y-1">
                        <label className="block text-[10px] font-mono text-neutral-500">UK-{s.size_label}</label>
                        <input
                          type="number"
                          min={0}
                          value={s.stock}
                          onChange={(e) => {
                            const copy = [...prodSizeStock];
                            copy[idx].stock = Math.max(0, parseInt(e.target.value) || 0);
                            setProdSizeStock(copy);
                          }}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-1 px-1.5 text-center text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Product Description</label>
                  <textarea
                    rows={3}
                    value={prodDescription}
                    onChange={(e) => setProdDescription(e.target.value)}
                    placeholder="Describe design features, sole quality, stitch density..."
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Product Tags */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Metadata tags</label>
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-[#121211] border border-neutral-850 rounded-xl min-h-[40px]">
                    {prodTags.map((tag, idx) => (
                      <span key={idx} className="bg-neutral-800 border border-neutral-750 text-neutral-300 font-mono text-[9px] py-0.5 px-2 rounded-lg flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => setProdTags(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 font-black">×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tagInput.trim() && !prodTags.includes(tagInput.trim())) {
                            setProdTags(prev => [...prev, tagInput.trim()]);
                            setTagInput('');
                          }
                        }
                      }}
                      placeholder="Add tag and hit Enter..."
                      className="bg-transparent border-0 text-white placeholder-neutral-600 focus:outline-none py-0.5 flex-1 min-w-[120px]"
                    />
                  </div>
                </div>

                {/* Images Upload */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Product Gallery Images</label>
                  
                  {/* Grid of uploaded images */}
                  <div className="grid grid-cols-5 gap-3">
                    {prodImages.map((img, idx) => (
                      <div key={idx} className="aspect-square bg-neutral-900 border border-neutral-800 rounded-xl relative p-1 flex items-center justify-center group overflow-hidden">
                        <HeicImage src={img} alt="" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setProdImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-opacity rounded-xl"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add Image File box */}
                    <label className="aspect-square bg-[#121211]/80 hover:bg-[#121211] border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center cursor-pointer text-neutral-500 hover:text-neutral-350 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.heic"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {uploadingImages ? (
                        <div className="animate-spin text-primary">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5 mb-1" />
                          <span className="text-[8px] font-bold font-mono">Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Meta details */}
                <div className="bg-[#121211] border border-neutral-850 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 border-b border-neutral-850 pb-2">SEO Search Parameters</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">Search Page Title</label>
                      <input
                        type="text"
                        value={prodMetaTitle}
                        onChange={(e) => setProdMetaTitle(e.target.value)}
                        placeholder="Meta title override..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">Search Page Description</label>
                      <input
                        type="text"
                        value={prodMetaDesc}
                        onChange={(e) => setProdMetaDesc(e.target.value)}
                        placeholder="Meta description override..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-neutral-900/60 font-mono font-bold text-[9px] uppercase tracking-wider text-neutral-400">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={prodActive} onChange={(e) => setProdActive(e.target.checked)} className="rounded bg-neutral-900 border-neutral-800 text-primary focus:ring-0 w-3.5 h-3.5" />
                    Publish Style Entry
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={prodFeatured} onChange={(e) => setProdFeatured(e.target.checked)} className="rounded bg-neutral-900 border-neutral-800 text-primary focus:ring-0 w-3.5 h-3.5" />
                    Feature on Homepage
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={prodIsNew} onChange={(e) => setProdIsNew(e.target.checked)} className="rounded bg-neutral-900 border-neutral-800 text-primary focus:ring-0 w-3.5 h-3.5" />
                    Mark as New Release
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={prodIsTrending} onChange={(e) => setProdIsTrending(e.target.checked)} className="rounded bg-neutral-900 border-neutral-800 text-primary focus:ring-0 w-3.5 h-3.5" />
                    Mark as Trending Style
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Save Catalog Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
