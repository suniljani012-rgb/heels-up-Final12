import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Trash2, Edit3, X, UploadCloud, ChevronLeft, ChevronRight, RefreshCw, Download, FileText, CheckCircle2, AlertTriangle, Palette } from 'lucide-react';
import HeicImage from '../../components/HeicImage';

// --- Interfaces ---
interface ColorVariant {
  color: string;        // e.g. "Black", "Tan", "White"
  size_stock: { size_label: string; stock: number }[];
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
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
  size_stock?: { size_label: string; stock: number }[];
  colors?: string[];
  color_variants?: ColorVariant[];
}

interface ProductsManagerProps {
  products: Product[];
  categories: any[];
  token: string;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onRefresh: () => void;
}

const STANDARD_SIZES = ['6', '7', '8', '9', '10', '11'];

// Create a blank color variant
const blankVariant = (color = ''): ColorVariant => ({
  color,
  size_stock: STANDARD_SIZES.map(s => ({ size_label: s, stock: 0 }))
});

// --- Component ---
export default function ProductsManager({ products, categories, token, showToast, onRefresh }: ProductsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(0);
  const itemsPerPage = 12;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'colors' | 'media' | 'seo'>('basic');

  // Bulk CSV
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ success: number; errors: string[] } | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  // Basic form fields
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodActive, setProdActive] = useState(true);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodIsNew, setProdIsNew] = useState(true);
  const [prodIsTrending, setProdIsTrending] = useState(false);
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodDescription, setProdDescription] = useState('');
  const [prodBrand, setProdBrand] = useState('HeelsUp');
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [prodShowMrp, setProdShowMrp] = useState(true);
  const [prodMetaTitle, setProdMetaTitle] = useState('');
  const [prodMetaDesc, setProdMetaDesc] = useState('');

  // Color-Size Variants (key feature)
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([blankVariant()]);
  const [newColorInput, setNewColorInput] = useState('');

  const [tagInput, setTagInput] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // --- Computed ---
  const filteredProducts = useMemo(() =>
    products.filter(p => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
      const matchesCat = selectedCategory ? p.category === selectedCategory : true;
      return matchesSearch && matchesCat;
    }), [products, searchQuery, selectedCategory]);

  const paginatedProducts = useMemo(() => {
    const start = page * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, page]);

  // Total stock across all color variants
  const totalStock = colorVariants.reduce((sum, cv) =>
    sum + cv.size_stock.reduce((s2, ss) => s2 + ss.stock, 0), 0);

  // --- Helpers ---
  const resetForm = () => {
    setProdName(''); setProdSku(''); setProdCategory(categories[0]?.name || '');
    setProdPrice(''); setProdOriginalPrice('');
    setProdActive(true); setProdFeatured(false); setProdIsNew(true); setProdIsTrending(false);
    setProdImages([]); setProdDescription(''); setProdBrand('HeelsUp');
    setProdTags([]); setProdShowMrp(true); setProdMetaTitle(''); setProdMetaDesc('');
    setColorVariants([blankVariant()]);
    setNewColorInput('');
    setTagInput('');
  };

  const loadFromProduct = (p: Product) => {
    setProdName(p.name); setProdSku(p.sku); setProdCategory(p.category);
    setProdPrice((p.price / 100).toString());
    setProdOriginalPrice(p.original_price ? (p.original_price / 100).toString() : '');
    setProdActive(p.active); setProdFeatured(p.featured); setProdIsNew(p.is_new); setProdIsTrending(p.is_trending);
    setProdImages(p.images || []); setProdDescription(p.description || '');
    setProdBrand(p.brand || 'HeelsUp'); setProdTags(p.tags || []);
    setProdShowMrp(p.show_mrp !== undefined ? p.show_mrp : true);
    setProdMetaTitle(p.meta_title || ''); setProdMetaDesc(p.meta_desc || '');

    // Load color variants — support both old format (colors + size_stock) and new format (color_variants)
    if (p.color_variants && p.color_variants.length > 0) {
      const mapped = p.color_variants.map(cv => ({
        color: cv.color,
        size_stock: STANDARD_SIZES.map(sz => {
          const found = cv.size_stock.find(ss => ss.size_label === sz);
          return { size_label: sz, stock: found ? found.stock : 0 };
        })
      }));
      setColorVariants(mapped);
    } else if (p.colors && p.colors.length > 0) {
      // Migrate old format: spread existing size_stock across each color
      const mapped = p.colors.map(color => ({
        color,
        size_stock: STANDARD_SIZES.map(sz => {
          const found = p.size_stock?.find(ss => ss.size_label === sz);
          return { size_label: sz, stock: found ? Math.round(found.stock / p.colors!.length) : 0 };
        })
      }));
      setColorVariants(mapped);
    } else {
      // No colors — single "Default" variant
      const mapped: ColorVariant[] = [{
        color: '',
        size_stock: STANDARD_SIZES.map(sz => {
          const found = p.size_stock?.find(ss => ss.size_label === sz);
          return { size_label: sz, stock: found ? found.stock : 0 };
        })
      }];
      setColorVariants(mapped);
    }
  };

  const handleOpenAdd = () => { resetForm(); setActiveTab('basic'); setEditingProduct(null); setDrawerOpen(true); };
  const handleOpenEdit = (p: Product) => { setEditingProduct(p); loadFromProduct(p); setActiveTab('basic'); setDrawerOpen(true); };

  // Add new color row
  const handleAddColorRow = () => {
    const name = newColorInput.trim();
    if (!name) { showToast('error', 'Color Required', 'Type a color name first (e.g. Black, White, Tan)'); return; }
    if (colorVariants.some(cv => cv.color.toLowerCase() === name.toLowerCase())) {
      showToast('warning', 'Duplicate Color', `"${name}" already exists.`); return;
    }
    setColorVariants(prev => [...prev, blankVariant(name)]);
    setNewColorInput('');
  };

  // Remove a color row
  const handleRemoveColorRow = (idx: number) => {
    if (colorVariants.length <= 1) { showToast('warning', 'Minimum 1 Color', 'At least one color/variant row is required.'); return; }
    setColorVariants(prev => prev.filter((_, i) => i !== idx));
  };

  // Update color name
  const handleColorNameChange = (idx: number, name: string) => {
    setColorVariants(prev => prev.map((cv, i) => i === idx ? { ...cv, color: name } : cv));
  };

  // Update stock for a specific color + size
  const handleStockChange = (colorIdx: number, sizeLabel: string, val: number) => {
    setColorVariants(prev => prev.map((cv, ci) => {
      if (ci !== colorIdx) return cv;
      return {
        ...cv,
        size_stock: cv.size_stock.map(ss =>
          ss.size_label === sizeLabel ? { ...ss, stock: Math.max(0, val) } : ss
        )
      };
    }));
  };

  // Image upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
          const heic2any = (await import('heic2any')).default;
          const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          formData.append('files', new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' }));
        } else { formData.append('files', file); }
      }
      const res = await fetch('/api/admin/upload', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      const data = await res.json();
      if (data.success && data.data) {
        setProdImages(prev => [...prev, ...data.data.urls]);
        showToast('success', 'Images Uploaded', `${data.data.urls.length} images uploaded.`);
      } else { showToast('error', 'Upload Error', data.error || 'Upload failed.'); }
    } catch { showToast('error', 'Upload Failed', 'Image upload pipeline error.'); }
    finally { setUploadingImages(false); }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodSku || !prodPrice) {
      showToast('error', 'Missing Fields', 'Name, SKU and price are required.'); return;
    }
    if (colorVariants.some(cv => !cv.color.trim())) {
      showToast('error', 'Color Name Missing', 'Every color row must have a color name.'); return;
    }

    // Build payload
    const allSizeStock: { size_label: string; stock: number }[] = [];
    const sizeMap: Record<string, number> = {};
    colorVariants.forEach(cv => {
      cv.size_stock.forEach(ss => {
        sizeMap[ss.size_label] = (sizeMap[ss.size_label] || 0) + ss.stock;
      });
    });
    STANDARD_SIZES.forEach(sz => {
      allSizeStock.push({ size_label: sz, stock: sizeMap[sz] || 0 });
    });

    const payload = {
      name: prodName.trim(),
      sku: prodSku.trim().toUpperCase(),
      category: prodCategory,
      price: Math.round(parseFloat(prodPrice) * 100),
      original_price: prodOriginalPrice ? Math.round(parseFloat(prodOriginalPrice) * 100) : null,
      stock: totalStock,
      active: prodActive,
      featured: prodFeatured,
      is_new: prodIsNew,
      is_trending: prodIsTrending,
      sizes: allSizeStock.filter(s => s.stock > 0).map(s => s.size_label),
      images: prodImages,
      description: prodDescription.trim(),
      brand: prodBrand.trim(),
      tags: prodTags,
      show_mrp: prodShowMrp,
      meta_title: prodMetaTitle.trim(),
      meta_desc: prodMetaDesc.trim(),
      size_stock: allSizeStock,
      colors: colorVariants.map(cv => cv.color).filter(Boolean),
      color_variants: colorVariants.map(cv => ({
        color: cv.color,
        size_stock: cv.size_stock.filter(ss => ss.stock > 0)
      }))
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Product Saved', `"${prodName}" saved successfully.`);
        setDrawerOpen(false); onRefresh();
      } else { showToast('error', 'Save Failed', data.error || 'Server rejected.'); }
    } catch { showToast('error', 'Network Error', 'Could not connect to server.'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) { showToast('success', 'Deleted', 'Product removed.'); onRefresh(); }
      else showToast('error', 'Delete Failed', data.error || 'Access denied.');
    } catch { showToast('error', 'Network Error', 'Failed.'); }
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['name', 'sku', 'category', 'price', 'original_price', 'description', 'brand', 'colors', 'tags',
      'black_stock_6', 'black_stock_7', 'black_stock_8', 'black_stock_9', 'black_stock_10', 'black_stock_11',
      'white_stock_6', 'white_stock_7', 'white_stock_8', 'white_stock_9', 'white_stock_10', 'white_stock_11',
      'active', 'featured', 'is_new', 'is_trending', 'meta_title', 'meta_desc'];
    const example = ['Oxford Double Strap', 'HU-OX-01', 'Jodhpuris', '4999', '8999', 'Premium leather oxford', 'HeelsUp',
      'Black;White', 'wedding;premium', '5', '10', '8', '6', '4', '2', '3', '5', '4', '2', '1', '0',
      'true', 'false', 'true', 'false', 'Premium Oxford Boots', 'Buy premium oxford boots'];
    const note = ['# Colors column: use semicolons. Stock columns: use color_size format. Add more color columns as needed.'];
    const csv = [note[0], headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'heelsup_products_template.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('info', 'Template Downloaded', 'Fill colors column with semicolon-separated names. Each color gets its own stock_6...stock_11 columns.');
  };

  // CSV Bulk Upload
  const handleBulkUpload = async () => {
    if (!csvFile) { showToast('error', 'No File', 'Select a CSV file first.'); return; }
    setCsvLoading(true); setCsvResult(null);
    try {
      const text = await csvFile.text();
      const lines = text.trim().split('\n').filter(l => !l.startsWith('#'));
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).filter(l => l.trim());
      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const vals = rows[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        if (!row.name || !row.sku || !row.price) { errors.push(`Row ${i + 2}: Missing name/sku/price`); continue; }

        const colorList = row.colors ? row.colors.split(';').map((c: string) => c.trim()).filter(Boolean) : ['Default'];

        // Build color_variants from columns like black_stock_6, white_stock_7 etc.
        const color_variants: ColorVariant[] = colorList.map((color: string) => {
          const prefix = color.toLowerCase().replace(/\s+/g, '_');
          return {
            color,
            size_stock: STANDARD_SIZES.map(sz => ({
              size_label: sz,
              stock: parseInt(row[`${prefix}_stock_${sz}`] || '0') || 0
            }))
          };
        });

        const sizeMap: Record<string, number> = {};
        color_variants.forEach(cv => cv.size_stock.forEach(ss => {
          sizeMap[ss.size_label] = (sizeMap[ss.size_label] || 0) + ss.stock;
        }));
        const size_stock = STANDARD_SIZES.map(sz => ({ size_label: sz, stock: sizeMap[sz] || 0 }));
        const totalStockRow = size_stock.reduce((a, s) => a + s.stock, 0);

        const payload = {
          name: row.name, sku: row.sku.toUpperCase(),
          category: row.category || (categories[0]?.name || ''),
          price: Math.round(parseFloat(row.price) * 100),
          original_price: row.original_price ? Math.round(parseFloat(row.original_price) * 100) : null,
          description: row.description || '', brand: row.brand || 'HeelsUp',
          colors: colorList,
          color_variants,
          tags: row.tags ? row.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : [],
          sizes: size_stock.filter(s => s.stock > 0).map(s => s.size_label),
          size_stock, stock: totalStockRow,
          active: row.active !== 'false', featured: row.featured === 'true',
          is_new: row.is_new !== 'false', is_trending: row.is_trending === 'true',
          images: [], show_mrp: true,
          meta_title: row.meta_title || '', meta_desc: row.meta_desc || ''
        };

        try {
          const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) successCount++;
          else errors.push(`Row ${i + 2} (${row.sku}): ${data.error || 'Server error'}`);
        } catch { errors.push(`Row ${i + 2} (${row.sku}): Network error`); }
      }

      setCsvResult({ success: successCount, errors });
      if (successCount > 0) onRefresh();
    } catch { showToast('error', 'CSV Error', 'Failed to parse CSV.'); }
    finally { setCsvLoading(false); }
  };

  return (
    <div className="space-y-6 text-neutral-900 animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-neutral-900 font-display italic">Products Catalog</h1>
          <p className="text-xs text-neutral-500">Manage footwear collections with color-size stock variants</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadTemplate}
            className="px-3 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all">
            <Download className="w-3.5 h-3.5" /> CSV Template
          </button>
          <button onClick={() => { setShowBulkModal(true); setCsvFile(null); setCsvResult(null); }}
            className="px-3 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all">
            <FileText className="w-3.5 h-3.5" /> Bulk Import
          </button>
          <button onClick={handleOpenAdd}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search by name, SKU..." className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none" />
          </div>
          <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPage(0); }}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
          <span className="text-neutral-400">{filteredProducts.length} products</span>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-200 disabled:opacity-30">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>{page + 1} / {Math.ceil(filteredProducts.length / itemsPerPage) || 1}</span>
          <button disabled={(page + 1) * itemsPerPage >= filteredProducts.length} onClick={() => setPage(p => p + 1)}
            className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-200 disabled:opacity-30">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-mono uppercase tracking-widest text-[10px]">
                <th className="p-4 w-14">Image</th>
                <th className="p-4">Product</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Colors</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginatedProducts.map(p => (
                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-4">
                    {p.images && p.images.length > 0 ? (
                      <div className="w-10 h-10 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 flex items-center justify-center">
                        <HeicImage src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 font-bold font-mono text-[8px]">N/A</div>
                    )}
                  </td>
                  <td className="p-4">
                    <h4 className="font-semibold text-neutral-900">{p.name}</h4>
                    <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-mono block mt-0.5">{p.brand || 'HeelsUp'}</span>
                  </td>
                  <td className="p-4 font-mono text-neutral-700 font-semibold">{p.sku}</td>
                  <td className="p-4 text-neutral-500">{p.category}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {(p.color_variants || []).slice(0, 4).map((cv, i) => (
                        <span key={i} className="text-[9px] bg-neutral-100 border border-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">{cv.color}</span>
                      ))}
                      {!p.color_variants && (p.colors || []).slice(0, 4).map((c, i) => (
                        <span key={i} className="text-[9px] bg-neutral-100 border border-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-neutral-900">
                    ₹{(p.price / 100).toFixed(0)}
                    {p.original_price && <span className="text-[10px] text-neutral-400 line-through ml-2">₹{(p.original_price / 100).toFixed(0)}</span>}
                  </td>
                  <td className="p-4 font-mono">
                    <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${p.stock <= 5 ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                      {p.stock} units
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.active ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-neutral-100 border border-neutral-200 text-neutral-500'}`}>
                      {p.active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenEdit(p)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="p-1.5 bg-neutral-100 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && (
                <tr><td colSpan={9} className="py-24 text-center text-neutral-400 italic font-mono">No products match the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======= ADD/EDIT DRAWER ======= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="w-full max-w-2xl bg-white border-l border-neutral-200 shadow-2xl relative z-10 flex flex-col h-full">

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Product'}</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Total stock across all colors: <strong>{totalStock}</strong> units</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Nav */}
            <div className="flex border-b border-neutral-200 shrink-0">
              {(['basic', 'colors', 'media', 'seo'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${activeTab === tab ? 'text-neutral-900 border-b-2 border-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}>
                  {tab === 'colors' && <Palette className="w-3 h-3" />}
                  {tab === 'basic' ? 'Basic Info' : tab === 'colors' ? `Colors & Stock` : tab === 'media' ? 'Images' : 'SEO'}
                  {tab === 'colors' && <span className="bg-neutral-900 text-white text-[8px] px-1.5 py-0.5 rounded-full">{colorVariants.length}</span>}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">

              {/* ---- BASIC TAB ---- */}
              {activeTab === 'basic' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Style Name *</label>
                      <input type="text" required value={prodName} onChange={e => setProdName(e.target.value)}
                        placeholder="e.g. Oxford Double Strap"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">SKU *</label>
                      <input type="text" required value={prodSku} onChange={e => setProdSku(e.target.value)}
                        placeholder="HU-OX-01"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Category</label>
                      <select value={prodCategory} onChange={e => setProdCategory(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none">
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Price (₹) *</label>
                      <input type="number" step="0.01" required value={prodPrice} onChange={e => setProdPrice(e.target.value)}
                        placeholder="4999" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">MRP (Optional)</label>
                      <input type="number" step="0.01" value={prodOriginalPrice} onChange={e => setProdOriginalPrice(e.target.value)}
                        placeholder="8999" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Brand</label>
                      <input type="text" value={prodBrand} onChange={e => setProdBrand(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Show MRP Badge</label>
                      <div className="flex items-center gap-3 pt-2.5">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={prodShowMrp} onChange={e => setProdShowMrp(e.target.checked)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
                          <span className="ml-2 text-neutral-600 text-[10px] font-semibold">{prodShowMrp ? 'Visible' : 'Hidden'}</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Description</label>
                    <textarea rows={3} value={prodDescription} onChange={e => setProdDescription(e.target.value)}
                      placeholder="Describe design features, sole quality..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none leading-relaxed" />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Tags</label>
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl min-h-[44px]">
                      {prodTags.map((tag, idx) => (
                        <span key={idx} className="bg-white border border-neutral-300 text-neutral-700 font-mono text-[9px] py-0.5 px-2 rounded-lg flex items-center gap-1">
                          {tag}<button type="button" onClick={() => setProdTags(p => p.filter((_, i) => i !== idx))} className="text-rose-400 font-black">×</button>
                        </span>
                      ))}
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim() && !prodTags.includes(tagInput.trim())) { setProdTags(p => [...p, tagInput.trim()]); setTagInput(''); } } }}
                        placeholder="Add tag, Enter to add..." className="bg-transparent border-0 text-neutral-900 placeholder-neutral-400 focus:outline-none py-0.5 flex-1 min-w-[120px]" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-neutral-100 font-mono font-bold text-[9px] uppercase tracking-wider text-neutral-500">
                    {[
                      { label: 'Publish', value: prodActive, setter: setProdActive },
                      { label: 'Featured', value: prodFeatured, setter: setProdFeatured },
                      { label: 'New Release', value: prodIsNew, setter: setProdIsNew },
                      { label: 'Trending', value: prodIsTrending, setter: setProdIsTrending },
                    ].map(({ label, value, setter }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={value} onChange={e => setter(e.target.checked)}
                          className="rounded border-neutral-300 w-3.5 h-3.5 accent-neutral-900" /> {label}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {/* ---- COLORS & STOCK TAB ---- */}
              {activeTab === 'colors' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Color — Size Stock Matrix</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Each color has its own size-wise stock count</p>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 font-mono">Total: {totalStock} units</span>
                  </div>

                  {/* Color rows */}
                  {colorVariants.map((cv, colorIdx) => (
                    <div key={colorIdx} className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3">
                      {/* Color name header */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Color Name</label>
                          <input
                            type="text"
                            value={cv.color}
                            onChange={e => handleColorNameChange(colorIdx, e.target.value)}
                            placeholder="e.g. Black, Tan, White, Dark Brown"
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-semibold focus:outline-none focus:border-neutral-400 placeholder-neutral-400"
                          />
                        </div>
                        <button type="button" onClick={() => handleRemoveColorRow(colorIdx)}
                          className="mt-5 p-2 bg-white hover:bg-rose-50 border border-neutral-200 hover:border-rose-200 text-neutral-400 hover:text-rose-500 rounded-xl transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Size Stock Grid for this color */}
                      <div>
                        <div className="grid grid-cols-6 gap-2">
                          {cv.size_stock.map((ss, sizeIdx) => (
                            <div key={sizeIdx} className="text-center">
                              <label className="block text-[9px] font-bold font-mono text-neutral-500 mb-1">UK {ss.size_label}</label>
                              <input
                                type="number" min={0}
                                value={ss.stock}
                                onChange={e => handleStockChange(colorIdx, ss.size_label, parseInt(e.target.value) || 0)}
                                className="w-full bg-white border border-neutral-200 rounded-lg py-1.5 px-1 text-center text-neutral-900 font-mono text-xs focus:outline-none focus:border-neutral-500"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] text-neutral-400 mt-1.5 text-right">
                          Subtotal for {cv.color || 'this color'}: <strong className="text-neutral-600">{cv.size_stock.reduce((a, s) => a + s.stock, 0)} units</strong>
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Add New Color Row */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newColorInput}
                      onChange={e => setNewColorInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddColorRow(); } }}
                      placeholder="Type color name (e.g. White, Tan, Cognac) and press Add"
                      className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
                    />
                    <button type="button" onClick={handleAddColorRow}
                      className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add Color
                    </button>
                  </div>
                  <p className="text-[9px] text-neutral-400">Each color row has its own size-stock per UK size 6–11.</p>
                </div>
              )}

              {/* ---- MEDIA TAB ---- */}
              {activeTab === 'media' && (
                <div className="space-y-4">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-3">Product Gallery</label>
                  <div className="grid grid-cols-4 gap-3">
                    {prodImages.map((img, idx) => (
                      <div key={idx} className="aspect-square bg-neutral-50 border border-neutral-200 rounded-xl relative flex items-center justify-center group overflow-hidden">
                        <HeicImage src={img} alt="" className="w-full h-full object-contain" />
                        <button type="button" onClick={() => setProdImages(p => p.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-xl transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square bg-neutral-50 hover:bg-neutral-100 border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-neutral-700 transition-colors">
                      <input type="file" multiple accept="image/*,.heic" onChange={handleFileUpload} className="hidden" />
                      {uploadingImages ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><UploadCloud className="w-5 h-5 mb-1" /><span className="text-[9px] font-bold font-mono">Upload</span></>}
                    </label>
                  </div>
                  <p className="text-[9px] text-neutral-400">Supports JPG, PNG, WEBP, HEIC. First image is the cover photo.</p>
                </div>
              )}

              {/* ---- SEO TAB ---- */}
              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-4">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">SEO Parameters</h4>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-neutral-500 mb-1">Meta Title</label>
                      <input type="text" value={prodMetaTitle} onChange={e => setProdMetaTitle(e.target.value)}
                        placeholder="Premium Jodhpur Boots | HeelsUp"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none" />
                      <p className="text-[9px] text-neutral-400 mt-1">{prodMetaTitle.length}/60 characters</p>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-neutral-500 mb-1">Meta Description</label>
                      <textarea rows={3} value={prodMetaDesc} onChange={e => setProdMetaDesc(e.target.value)}
                        placeholder="Buy premium hand-crafted jodhpur boots at HeelsUp..."
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none leading-relaxed" />
                      <p className="text-[9px] text-neutral-400 mt-1">{prodMetaDesc.length}/160 characters</p>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Drawer Footer */}
            <div className="border-t border-neutral-200 px-6 py-4 shrink-0 flex gap-3">
              <button type="button" onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95">
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= BULK CSV MODAL ======= */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white border border-neutral-200 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Bulk Product Import</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">CSV with color-size stock columns</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500"><X className="w-4 h-4" /></button>
            </div>

            <div onClick={() => csvRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-2xl p-8 text-center cursor-pointer transition-colors group">
              <input ref={csvRef} type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} className="hidden" />
              <FileText className="w-8 h-8 text-neutral-300 group-hover:text-neutral-500 mx-auto mb-2 transition-colors" />
              {csvFile ? (
                <div><p className="text-sm font-bold text-neutral-900">{csvFile.name}</p><p className="text-[10px] text-neutral-500">{(csvFile.size / 1024).toFixed(1)} KB</p></div>
              ) : (
                <><p className="text-sm font-semibold text-neutral-600">Click to select CSV</p><p className="text-[10px] text-neutral-400 mt-1">Download template first for correct column format</p></>
              )}
            </div>

            {csvResult && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold">{csvResult.success} products imported</span>
                </div>
                {csvResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{csvResult.errors.length} rows with errors:</span>
                    </div>
                    <div className="max-h-28 overflow-y-auto">{csvResult.errors.map((e, i) => <p key={i} className="text-[9px] text-rose-500 font-mono pl-5">{e}</p>)}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleDownloadTemplate}
                className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Template
              </button>
              <button onClick={handleBulkUpload} disabled={!csvFile || csvLoading}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95">
                {csvLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                {csvLoading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
