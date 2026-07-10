import React, { useState, useMemo } from 'react';
import {
  ShoppingCart, Search, Trash2, Plus, X, Printer, User, DollarSign,
  MessageCircle, CreditCard, Banknote, Smartphone, CheckCircle2, Package
} from 'lucide-react';
import HeicImage from '../../components/HeicImage';

// Instagram SVG icon (lucide-react may not have Instagram in older versions)
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface ColorVariant {
  color: string;
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
  images: string[];
  sizes: string[];
  colors?: string[];
  color_variants?: ColorVariant[];
}

interface PosTerminalProps {
  products: Product[];
  categories: any[];
  coupons: any[];
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onOrderCreated: () => void;
}

type PaymentMethod = 'cash' | 'upi' | 'card' | 'whatsapp' | 'instagram';
type SaleChannel = 'in-store' | 'whatsapp' | 'instagram' | 'phone';

export default function PosTerminal({ products, categories, coupons, showToast, onOrderCreated }: PosTerminalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<{ product: Product; size: string; color: string; qty: number; customPrice?: number }[]>([]);

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [saleChannel, setSaleChannel] = useState<SaleChannel>('in-store');

  // Financials
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('In-Store POS Sale');

  // Drawer
  const [drawerStartCash, setDrawerStartCash] = useState<number>(5000);
  const [cashDrops, setCashDrops] = useState<{ amount: number; reason: string; time: string }[]>([]);
  const [dropAmount, setDropAmount] = useState<number>(0);
  const [dropReason, setDropReason] = useState('');
  const [showDrawerManager, setShowDrawerManager] = useState(false);

  // Size + Color Selection Modal
  const [activeSizeProduct, setActiveSizeProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Derived: available sizes for selected color
  const availableSizesForColor = useMemo(() => {
    if (!activeSizeProduct) return [];
    if (activeSizeProduct.color_variants && activeSizeProduct.color_variants.length > 0 && selectedColor) {
      const cv = activeSizeProduct.color_variants.find(v => v.color === selectedColor);
      if (cv) return cv.size_stock.filter(ss => ss.stock > 0).map(ss => ss.size_label);
      return [];
    }
    return activeSizeProduct.sizes || [];
  }, [activeSizeProduct, selectedColor]);

  // Invoice
  const [printedOrder, setPrintedOrder] = useState<any | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory ? p.category === selectedCategory : true;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const subtotalPaise = useMemo(() =>
    cart.reduce((sum, item) => {
      const price = item.customPrice !== undefined ? item.customPrice * 100 : item.product.price;
      return sum + (price * item.qty);
    }, 0), [cart]);

  const couponDiscountPaise = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') return Math.round((subtotalPaise * appliedCoupon.discount_value) / 100);
    return appliedCoupon.discount_value * 100;
  }, [appliedCoupon, subtotalPaise]);

  const totalDiscountPaise = useMemo(() =>
    Math.min(subtotalPaise, couponDiscountPaise + (customDiscount * 100)),
    [couponDiscountPaise, customDiscount, subtotalPaise]);

  const taxableAmountPaise = Math.max(0, subtotalPaise - totalDiscountPaise);
  const gstAmountPaise = Math.round((taxableAmountPaise * gstRate) / (100 + gstRate));
  const baseAmountPaise = taxableAmountPaise - gstAmountPaise;
  const totalPayablePaise = taxableAmountPaise;

  const totalCashSales = 0;
  const currentDrawerCash = useMemo(() => {
    const drops = cashDrops.reduce((acc, d) => acc - d.amount, 0);
    return drawerStartCash + totalCashSales + drops;
  }, [drawerStartCash, cashDrops]);

  const handleProductClick = (p: Product) => {
    setActiveSizeProduct(p);
    // Default to first color variant or first color
    const firstColor = p.color_variants?.[0]?.color || p.colors?.[0] || '';
    setSelectedColor(firstColor);
    // Default to first in-stock size for that color
    if (p.color_variants && p.color_variants.length > 0) {
      const cv = p.color_variants.find(v => v.color === firstColor);
      const firstInStockSize = cv?.size_stock.find(ss => ss.stock > 0)?.size_label || '';
      setSelectedSize(firstInStockSize);
    } else {
      setSelectedSize(p.sizes?.[0] || '');
    }
  };

  const handleConfirmAddToCart = () => {
    if (!activeSizeProduct) return;
    if (!selectedSize) { showToast('warning', 'Select Size', 'Please select a size before adding to cart.'); return; }
    const existingIdx = cart.findIndex(item =>
      item.product.id === activeSizeProduct.id &&
      item.size === selectedSize &&
      item.color === selectedColor
    );
    if (existingIdx > -1) {
      const updated = [...cart];
      updated[existingIdx].qty += 1;
      setCart(updated);
    } else {
      setCart(prev => [...prev, { product: activeSizeProduct, size: selectedSize, color: selectedColor, qty: 1 }]);
    }
    setActiveSizeProduct(null);
    showToast('success', 'Added to Cart', `${activeSizeProduct.name} (Size ${selectedSize}) added.`);
  };

  const updateQty = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].qty += delta;
    if (updated[idx].qty <= 0) updated.splice(idx, 1);
    setCart(updated);
  };

  const removeFromCart = (idx: number) => {
    const updated = [...cart];
    updated.splice(idx, 1);
    setCart(updated);
  };

  const updateCustomPrice = (idx: number, valueStr: string) => {
    const numVal = parseFloat(valueStr);
    const updated = [...cart];
    if (isNaN(numVal) || numVal < 0) delete updated[idx].customPrice;
    else updated[idx].customPrice = numVal;
    setCart(updated);
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) { setAppliedCoupon(null); return; }
    const found = coupons.find(c => c.code.toLowerCase() === couponCode.trim().toLowerCase());
    if (!found) { showToast('error', 'Invalid Coupon', 'Coupon code does not exist.'); setAppliedCoupon(null); return; }
    if (!found.active) { showToast('error', 'Expired Coupon', 'This promotion is no longer active.'); setAppliedCoupon(null); return; }
    if (subtotalPaise / 100 < found.min_purchase) { showToast('warning', 'Threshold Not Met', `Min purchase of ₹${found.min_purchase} required.`); setAppliedCoupon(null); return; }
    setAppliedCoupon(found);
    showToast('success', 'Coupon Applied', `Discount of ${found.discount_value}${found.discount_type === 'percentage' ? '%' : ' Rs'} activated.`);
  };

  const handleAddCashDrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (dropAmount <= 0 || !dropReason.trim()) { showToast('error', 'Fields Required', 'Enter a valid amount and reason.'); return; }
    if (dropAmount > currentDrawerCash) { showToast('error', 'Limit Exceeded', 'Cannot payout more than drawer balance.'); return; }
    setCashDrops(prev => [...prev, { amount: dropAmount, reason: dropReason, time: new Date().toLocaleTimeString() }]);
    setDropAmount(0); setDropReason('');
    showToast('info', 'Cash Outflow Registered', 'Safe drop transaction recorded.');
  };

  // WhatsApp share link
  const handleShareWhatsApp = () => {
    if (cart.length === 0) { showToast('error', 'Empty Cart', 'Add products before sharing.'); return; }
    const items = cart.map(item => `• ${item.product.name} (Size: ${item.size}) x${item.qty} — ₹${((item.customPrice ?? item.product.price / 100) * item.qty).toFixed(0)}`).join('\n');
    const msg = `*HeelsUp Order Summary*\n\nCustomer: ${customerName || 'Walk-in'}\n\n${items}\n\n*Total: ₹${(totalPayablePaise / 100).toFixed(0)}*\n\nThank you for choosing HeelsUp! 👟`;
    const url = `https://wa.me/${customerPhone ? '91' + customerPhone : ''}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { showToast('error', 'Checkout Denied', 'Cart is empty.'); return; }
    const channelNotes = saleChannel === 'whatsapp' ? '📱 WhatsApp Sale' : saleChannel === 'instagram' ? '📸 Instagram Sale' : saleChannel === 'phone' ? '📞 Phone Order' : 'In-Store POS Sale';
    const payload = {
      customer_name: customerName.trim() || 'Walk-in Customer',
      customer_phone: customerPhone.trim() || '0000000000',
      customer_email: customerEmail.trim() || 'pos-customer@heelsup.in',
      payment_method: paymentMethod,
      items: cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        size: item.size,
        quantity: item.qty,
        price: item.customPrice !== undefined ? Math.round(item.customPrice * 100) : item.product.price,
        sku: item.product.sku,
        image: item.product.images?.[0] || ''
      })),
      subtotal_amount: subtotalPaise / 100,
      shipping_amount: 0,
      discount_amount: totalDiscountPaise / 100,
      total_amount: totalPayablePaise / 100,
      notes: `${channelNotes} | GST Rate: ${gstRate}%${notes !== 'In-Store POS Sale' ? ' | ' + notes : ''}`,
      coupon_code: appliedCoupon ? appliedCoupon.code : null
    };
    try {
      const res = await fetch('/api/admin/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.order) {
        showToast('success', 'Sale Completed', `Invoice #${data.order.order_number} issued.`);
        setPrintedOrder(data.order);
        setCart([]); setCustomerName(''); setCustomerPhone(''); setCustomerEmail('');
        setCouponCode(''); setAppliedCoupon(null); setCustomDiscount(0);
        setSaleChannel('in-store');
        onOrderCreated();
      } else {
        showToast('error', 'Checkout Failed', data.error || 'Server rejected POS sale.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not record transaction.');
    }
  };

  const channelColors: Record<SaleChannel, string> = {
    'in-store': 'border-neutral-900 bg-neutral-900 text-white',
    'whatsapp': 'border-emerald-500 bg-emerald-500 text-white',
    'instagram': 'border-purple-500 bg-purple-500 text-white',
    'phone': 'border-blue-500 bg-blue-500 text-white',
  };

  const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
    cash: <Banknote className="w-3.5 h-3.5" />,
    upi: <Smartphone className="w-3.5 h-3.5" />,
    card: <CreditCard className="w-3.5 h-3.5" />,
    whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
    instagram: <InstagramIcon className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 font-display italic">POS Terminal</h2>
          <p className="text-[10px] text-neutral-500 font-medium">In-store & social commerce billing · Cash register & invoice</p>
        </div>

        {/* Sale Channel Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mr-1">Channel:</span>
          {(['in-store', 'whatsapp', 'instagram', 'phone'] as SaleChannel[]).map(ch => (
            <button
              key={ch}
              onClick={() => { setSaleChannel(ch); setNotes(ch === 'in-store' ? 'In-Store POS Sale' : ch === 'whatsapp' ? 'WhatsApp Sale' : ch === 'instagram' ? 'Instagram DM Sale' : 'Phone Order'); }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 ${saleChannel === ch ? channelColors[ch] : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}
            >
              {ch === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
              {ch === 'instagram' && <InstagramIcon className="w-3 h-3" />}
              {ch === 'in-store' && <Package className="w-3 h-3" />}
              {ch === 'phone' && <Smartphone className="w-3 h-3" />}
              {ch === 'in-store' ? 'In-Store' : ch.charAt(0).toUpperCase() + ch.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowDrawerManager(!showDrawerManager)}
          className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          Drawer: ₹{currentDrawerCash.toFixed(0)}
        </button>
      </div>

      {/* Main POS Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        {/* LEFT: Product Catalog (8 cols) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white border border-neutral-200 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 shadow-sm">
            <div className="md:col-span-8 relative">
              <Search className="absolute inset-y-0 left-3 h-full w-4 text-neutral-400 flex items-center" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Scan barcode or type name / SKU..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400" />
            </div>
            <div className="md:col-span-4">
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl">
                No matching products found.
              </div>
            ) : (
              filteredProducts.map(p => {
                const priceRs = (p.price / 100).toLocaleString('en-IN');
                return (
                  <div key={p.id} onClick={() => handleProductClick(p)}
                    className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-col justify-between hover:border-neutral-400 hover:shadow-md transition-all cursor-pointer group">
                    <div className="aspect-square bg-neutral-50 border border-neutral-100 rounded-lg overflow-hidden flex items-center justify-center relative mb-2.5">
                      <HeicImage src={p.images?.[0] || ''} alt={p.name} className="max-w-full max-h-full object-contain" />
                      {p.stock <= 2 && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded text-[8px] font-bold text-rose-600 uppercase">
                          Low ({p.stock})
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5 font-mono">{p.sku}</span>
                      <h4 className="text-[10px] font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors line-clamp-2 leading-tight">{p.name}</h4>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[11px] font-bold text-neutral-900 font-mono">₹{priceRs}</span>
                        <span className="text-[8px] text-neutral-400 font-semibold">{p.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Cart & Checkout (4 cols) */}
        <div className="xl:col-span-4 bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-neutral-600" />
              Cart ({cart.length} items)
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider">
                Clear All
              </button>
            )}
          </div>

          <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Cart Items */}
            <div className="space-y-2.5 min-h-[80px]">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-400">Select products to add to cart</div>
              ) : (
                cart.map((item, idx) => {
                  const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price / 100;
                  return (
                    <div key={`${item.product.id}-${item.size}`} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 relative">
                      <button onClick={() => removeFromCart(idx)} className="absolute top-2 right-2 text-neutral-400 hover:text-rose-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex gap-2.5 pr-5">
                        <div className="w-9 h-9 bg-white border border-neutral-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          <HeicImage src={item.product.images?.[0]} alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[10px] font-semibold text-neutral-900 truncate">{item.product.name}</h4>
                          <span className="text-[8px] text-neutral-500 font-mono uppercase block">{item.color && `${item.color} · `}UK {item.size} · {item.product.sku}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-neutral-100">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-neutral-400 uppercase font-semibold">Override ₹</span>
                          <input type="number" step="0.01"
                            placeholder={(item.product.price / 100).toString()}
                            value={item.customPrice !== undefined ? item.customPrice : ''}
                            onChange={e => updateCustomPrice(idx, e.target.value)}
                            className="w-16 bg-white border border-neutral-200 rounded-lg px-1.5 py-0.5 text-[10px] text-right font-mono text-neutral-900 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(idx, -1)}
                            className="w-6 h-6 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-center text-neutral-600 transition-colors">
                            <span className="font-bold text-xs leading-none">−</span>
                          </button>
                          <span className="text-[10px] font-bold text-neutral-900 font-mono w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(idx, 1)}
                            className="w-6 h-6 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-center text-neutral-600 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-900 font-mono">₹{(itemPrice * item.qty).toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5">
              <span className="block text-[9px] font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Customer Info
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-900 focus:outline-none col-span-2" />
                <input type="text" placeholder="Phone (+91...)" maxLength={10} value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-900 focus:outline-none font-mono" />
                <input type="email" placeholder="Email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-900 focus:outline-none" />
              </div>

              {/* WhatsApp Quick Share */}
              {(saleChannel === 'whatsapp' || saleChannel === 'instagram') && (
                <button
                  onClick={handleShareWhatsApp}
                  className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${saleChannel === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                >
                  {saleChannel === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> : <InstagramIcon className="w-3.5 h-3.5" />}
                  Share Cart via {saleChannel === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                </button>
              )}
            </div>

            {/* Coupons & Discount */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Promo Code</label>
                <div className="flex gap-1.5">
                  <input type="text" placeholder="CODE" value={couponCode} onChange={e => setCouponCode(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] uppercase text-neutral-900 focus:outline-none font-mono" />
                  <button onClick={handleApplyCoupon}
                    className="px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[9px] font-bold whitespace-nowrap transition-colors">
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {appliedCoupon.code} applied
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Manual Discount (₹)</label>
                <input type="number" placeholder="0" value={customDiscount || ''}
                  onChange={e => setCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-[10px] text-right text-neutral-900 focus:outline-none font-mono" />
              </div>
            </div>

            {/* Tax & Payment */}
            <div className="grid grid-cols-2 gap-2.5 border-t border-neutral-100 pt-3">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">GST Slab</label>
                <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] text-neutral-900 focus:outline-none">
                  <option value="0">0% Exempt</option>
                  <option value="5">5% GST (Flat)</option>
                  <option value="12">12% GST (Standard)</option>
                  <option value="18">18% GST (Luxury)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Payment Mode</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] text-neutral-900 focus:outline-none">
                  <option value="cash">💵 Cash</option>
                  <option value="upi">📱 UPI / QR</option>
                  <option value="card">💳 Card</option>
                  <option value="whatsapp">📩 WhatsApp Pay</option>
                  <option value="instagram">📸 Instagram Pay</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Order Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-[10px] text-neutral-900 focus:outline-none" />
            </div>

            {/* Receipt Summary */}
            <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl space-y-1.5 text-[10px] font-mono">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span><span>₹{(subtotalPaise / 100).toFixed(2)}</span>
              </div>
              {totalDiscountPaise > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Discount</span><span>-₹{(totalDiscountPaise / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400 text-[9px]">
                <span>Base Value</span><span>₹{(baseAmountPaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-400 text-[9px]">
                <span>GST ({gstRate}%) incl.</span><span>₹{(gstAmountPaise / 100).toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-1.5 flex justify-between text-xs font-bold text-neutral-900">
                <span>NET PAYABLE</span><span>₹{(totalPayablePaise / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button onClick={handleCheckout} disabled={cart.length === 0}
              className={`w-full py-3.5 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 ${saleChannel === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : saleChannel === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-neutral-900 hover:bg-neutral-100'}`}>
              {paymentIcons[paymentMethod]}
              {saleChannel === 'whatsapp' ? 'Confirm WhatsApp Sale' : saleChannel === 'instagram' ? 'Confirm Instagram Sale' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>

      {/* Size Selector Modal — Color First, then Size */}
      {activeSizeProduct && (
        <div className="fixed inset-0 z-50 flex justify-center items-center">
          <div onClick={() => setActiveSizeProduct(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white border border-neutral-200 w-full max-w-sm rounded-2xl p-6 relative z-10 space-y-5 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h4 className="text-[10px] text-neutral-500 font-mono font-bold uppercase">{activeSizeProduct.sku}</h4>
                <h3 className="text-sm font-bold text-neutral-900 mt-0.5">{activeSizeProduct.name}</h3>
                <span className="text-[10px] text-neutral-400 font-mono">₹{(activeSizeProduct.price / 100).toLocaleString('en-IN')}</span>
              </div>
              <button onClick={() => setActiveSizeProduct(null)} className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Color Selection */}
            {(() => {
              const colorList = activeSizeProduct.color_variants && activeSizeProduct.color_variants.length > 0
                ? activeSizeProduct.color_variants.map(cv => cv.color)
                : (activeSizeProduct.colors || []);
              return colorList.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-neutral-600 uppercase tracking-wider">
                    1. Select Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorList.map(c => (
                      <button key={c} onClick={() => {
                        setSelectedColor(c);
                        // Auto-select first in-stock size for this color
                        if (activeSizeProduct.color_variants) {
                          const cv = activeSizeProduct.color_variants.find(v => v.color === c);
                          const firstSize = cv?.size_stock.find(ss => ss.stock > 0)?.size_label || '';
                          setSelectedSize(firstSize);
                        }
                      }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${selectedColor === c
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                          : 'border-neutral-200 hover:border-neutral-400 text-neutral-700 bg-white'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Step 2: Size Selection (filtered by color) */}
            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-neutral-600 uppercase tracking-wider">
                {(activeSizeProduct.color_variants && activeSizeProduct.color_variants.length > 0) ? '2. Select Size' : 'Select Size'}
                {selectedColor && <span className="ml-1 font-normal text-neutral-400 normal-case">for {selectedColor}</span>}
              </label>
              {availableSizesForColor.length === 0 ? (
                <p className="text-xs text-rose-400 italic">No stock available for this color.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSizesForColor.map(sz => {
                    // Get stock count for this size+color combo
                    const cv = activeSizeProduct.color_variants?.find(v => v.color === selectedColor);
                    const stock = cv?.size_stock.find(ss => ss.size_label === sz)?.stock ?? null;
                    const outOfStock = stock !== null && stock === 0;
                    return (
                      <button key={sz} disabled={outOfStock} onClick={() => setSelectedSize(sz)}
                        className={`py-2.5 rounded-xl border text-xs font-bold font-mono transition-all relative
                          ${outOfStock ? 'border-neutral-100 text-neutral-300 bg-neutral-50 cursor-not-allowed' :
                          selectedSize === sz ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' :
                          'border-neutral-200 hover:border-neutral-400 text-neutral-700 bg-white'}`}>
                        UK {sz}
                        {stock !== null && !outOfStock && (
                          <span className={`block text-[8px] font-mono mt-0.5 ${selectedSize === sz ? 'text-neutral-300' : 'text-neutral-400'}`}>{stock} left</span>
                        )}
                        {outOfStock && <span className="block text-[8px] text-neutral-300 mt-0.5">Out</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary row */}
            {selectedColor && selectedSize && (
              <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-mono text-neutral-600">
                <span>Adding: <strong className="text-neutral-900">{selectedColor}</strong> · Size <strong className="text-neutral-900">UK {selectedSize}</strong></span>
              </div>
            )}

            <button onClick={handleConfirmAddToCart} disabled={!selectedSize}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors active:scale-95">
              Add to Cart
            </button>
          </div>
        </div>
      )}


      {/* Cash Drawer Manager */}
      {showDrawerManager && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setShowDrawerManager(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="w-full max-w-md bg-white border-l border-neutral-200 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Cash Register
                </h3>
                <button onClick={() => setShowDrawerManager(false)} className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Opening Float</span>
                  <input type="number" value={drawerStartCash} onChange={e => setDrawerStartCash(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-transparent border-b border-neutral-200 text-lg font-bold font-mono text-neutral-900 mt-1 py-0.5 focus:outline-none focus:border-neutral-500" />
                </div>
                <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-xl">
                  <span className="block text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Drawer Balance</span>
                  <span className="block text-lg font-bold font-mono text-emerald-700 mt-1">₹{currentDrawerCash.toFixed(0)}</span>
                </div>
              </div>

              <form onSubmit={handleAddCashDrop} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                <span className="block text-[9px] font-bold text-neutral-700 uppercase tracking-wider">Log Cash Drop / Outflow</span>
                <div>
                  <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input type="number" required value={dropAmount || ''} onChange={e => setDropAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00" className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Reason</label>
                  <input type="text" required value={dropReason} onChange={e => setDropReason(e.target.value)}
                    placeholder="e.g. Bank deposit, Vendor payment"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none" />
                </div>
                <button type="submit" className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors">
                  Record Outflow
                </button>
              </form>

              <div className="space-y-2">
                <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Drop Log</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {cashDrops.length === 0 ? (
                    <div className="py-6 text-center text-[10px] text-neutral-400">No drops recorded today.</div>
                  ) : (
                    cashDrops.map((d, i) => (
                      <div key={i} className="flex justify-between text-[10px] font-mono p-2 border border-neutral-100 rounded-lg">
                        <div>
                          <span className="text-neutral-700 font-semibold font-sans">{d.reason}</span>
                          <span className="text-neutral-400 text-[8px] block">{d.time}</span>
                        </div>
                        <span className="text-rose-500 font-bold">-₹{d.amount.toFixed(0)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setShowDrawerManager(false)}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-100 text-white font-semibold rounded-xl text-xs uppercase transition-colors">
              Close Register
            </button>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {printedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setPrintedOrder(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-white text-black p-6 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 flex flex-col items-center">
            <div className="w-full text-center space-y-1 font-mono border-b border-dashed border-gray-300 pb-4 mb-4 text-[10px]">
              <h2 className="text-sm font-bold tracking-widest uppercase">HeelsUp Boutique</h2>
              <p>DLF Phase 4, Galleria Market, Gurugram</p>
              <p>Tel: +91 99999-88888 | GSTIN: 06AAAAA1111A1Z1</p>
              <div className="h-[1px] border-t border-dashed border-gray-300 my-2" />
              <p className="font-bold">INVOICE: {printedOrder.order_number}</p>
              <p>Date: {new Date(printedOrder.created_at || Date.now()).toLocaleString()}</p>
              <p>Mode: {printedOrder.payment_method?.toUpperCase()}</p>
              <p>Channel: {saleChannel.toUpperCase()}</p>
            </div>
            <div className="w-full text-left font-mono text-[9px] border-b border-dashed border-gray-300 pb-3 mb-3 space-y-0.5">
              <p><strong>Customer:</strong> {printedOrder.customer_name}</p>
              <p><strong>Phone:</strong> {printedOrder.customer_phone}</p>
              {printedOrder.customer_email && <p><strong>Email:</strong> {printedOrder.customer_email}</p>}
            </div>
            <div className="w-full font-mono text-[10px] border-b border-dashed border-gray-300 pb-3 mb-3">
              <div className="flex justify-between font-bold border-b border-gray-200 pb-1 mb-1">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/3 text-right">Amount</span>
              </div>
              <div className="space-y-1.5">
                {printedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[9px]">
                    <div className="w-1/2 min-w-0 truncate">
                      <span>{item.product_name}</span>
                      <span className="block text-[8px] text-gray-400">{item.color && `${item.color} · `}UK {item.size}</span>
                    </div>
                    <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                    <span className="w-1/3 text-right font-mono">₹{((item.price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full font-mono text-[10px] space-y-1 border-b border-dashed border-gray-300 pb-3 mb-4">
              <div className="flex justify-between"><span>Subtotal:</span><span>₹{printedOrder.subtotal_amount?.toFixed(2)}</span></div>
              {printedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Discount:</span><span>-₹{printedOrder.discount_amount?.toFixed(2)}</span>
                </div>
              )}
              <div className="h-[1px] border-t border-gray-200 my-1" />
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL:</span><span>₹{printedOrder.total_amount?.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-full text-center font-mono text-[9px] space-y-2">
              <p className="font-semibold italic">Thank you for shopping at HeelsUp!</p>
              <p className="text-[8px] text-gray-400">Follow us on Instagram & WhatsApp for new arrivals</p>
            </div>
            <div className="flex gap-3 mt-5 w-full">
              <button onClick={() => window.print()}
                className="flex-1 py-2.5 bg-neutral-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-neutral-100 flex items-center justify-center gap-1.5 transition-colors">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button onClick={() => setPrintedOrder(null)}
                className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-neutral-50 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
