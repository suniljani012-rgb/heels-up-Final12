import React, { useState, useMemo } from 'react';
import { ShoppingCart, Search, Trash2, Plus, X, Printer, User, DollarSign } from 'lucide-react';
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
  images: string[];
  sizes: string[];
}

interface PosTerminalProps {
  products: Product[];
  categories: any[];
  coupons: any[];
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onOrderCreated: () => void;
}

export default function PosTerminal({ products, categories, coupons, showToast, onOrderCreated }: PosTerminalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<{ product: Product; size: string; qty: number; customPrice?: number }[]>([]);
  
  // Customer parameters
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  // Financial adjustments
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [customDiscount, setCustomDiscount] = useState<number>(0); // in Rupees
  const [gstRate, setGstRate] = useState<number>(18); // Default 18% GST for premium footwear
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [notes, setNotes] = useState('In-Store POS Sale');
  
  // Drawer parameters
  const [drawerStartCash, setDrawerStartCash] = useState<number>(5000); // 5000 Rs starting float
  const [cashDrops, setCashDrops] = useState<{ amount: number; reason: string; time: string }[]>([]);
  const [dropAmount, setDropAmount] = useState<number>(0);
  const [dropReason, setDropReason] = useState('');
  const [showDrawerManager, setShowDrawerManager] = useState(false);
  
  // Sizes Selection Modal
  const [activeSizeProduct, setActiveSizeProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  
  // Printable Invoice state
  const [printedOrder, setPrintedOrder] = useState<any | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory ? p.category === selectedCategory : true;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // POS Drawer Cash Balance calculation
  const totalCashSales = useMemo(() => {
    if (!printedOrder) return 0;
    // Calculated based on completed sales in the current session
    return 0; // Simulated/Local session
  }, [printedOrder]);

  const currentDrawerCash = useMemo(() => {
    const drops = cashDrops.reduce((acc, d) => acc - d.amount, 0);
    return drawerStartCash + totalCashSales + drops;
  }, [drawerStartCash, totalCashSales, cashDrops]);

  // Cart Subtotal in Paise
  const subtotalPaise = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.customPrice !== undefined ? item.customPrice * 100 : item.product.price;
      return sum + (price * item.qty);
    }, 0);
  }, [cart]);

  // Coupon Discount in Paise
  const couponDiscountPaise = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.round((subtotalPaise * appliedCoupon.discount_value) / 100);
    } else {
      return appliedCoupon.discount_value * 100; // stored in Rs, convert to paise
    }
  }, [appliedCoupon, subtotalPaise]);

  // Total discount in Paise (Coupon + Custom)
  const totalDiscountPaise = useMemo(() => {
    const customDiscPaise = customDiscount * 100;
    return Math.min(subtotalPaise, couponDiscountPaise + customDiscPaise);
  }, [couponDiscountPaise, customDiscount, subtotalPaise]);

  // GST calculation
  const taxableAmountPaise = Math.max(0, subtotalPaise - totalDiscountPaise);
  const gstAmountPaise = Math.round((taxableAmountPaise * gstRate) / (100 + gstRate)); // Inclusive GST calculation
  const baseAmountPaise = taxableAmountPaise - gstAmountPaise;

  const totalPayablePaise = taxableAmountPaise;

  // Add Item
  const handleProductClick = (p: Product) => {
    setActiveSizeProduct(p);
    setSelectedSize(p.sizes?.[0] || '38');
  };

  const handleConfirmAddToCart = () => {
    if (!activeSizeProduct) return;
    
    // Check if item already in cart
    const existingIdx = cart.findIndex(item => item.product.id === activeSizeProduct.id && item.size === selectedSize);
    if (existingIdx > -1) {
      const updated = [...cart];
      updated[existingIdx].qty += 1;
      setCart(updated);
    } else {
      setCart(prev => [...prev, { product: activeSizeProduct, size: selectedSize, qty: 1 }]);
    }
    
    setActiveSizeProduct(null);
    showToast('success', 'Cart Updated', `${activeSizeProduct.name} (Size ${selectedSize}) added.`);
  };

  // Cart Qty updates
  const updateQty = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].qty += delta;
    if (updated[idx].qty <= 0) {
      updated.splice(idx, 1);
    }
    setCart(updated);
  };

  // Remove Item
  const removeFromCart = (idx: number) => {
    const updated = [...cart];
    updated.splice(idx, 1);
    setCart(updated);
  };

  // Custom Price Update
  const updateCustomPrice = (idx: number, valueStr: string) => {
    const numVal = parseFloat(valueStr);
    const updated = [...cart];
    if (isNaN(numVal) || numVal < 0) {
      delete updated[idx].customPrice;
    } else {
      updated[idx].customPrice = numVal;
    }
    setCart(updated);
  };

  // Coupon lookup
  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setAppliedCoupon(null);
      return;
    }
    const found = coupons.find(c => c.code.toLowerCase() === couponCode.trim().toLowerCase());
    if (!found) {
      showToast('error', 'Invalid Coupon', 'The coupon code does not exist.');
      setAppliedCoupon(null);
      return;
    }
    if (!found.active) {
      showToast('error', 'Expired Coupon', 'This promotion is no longer active.');
      setAppliedCoupon(null);
      return;
    }
    if (subtotalPaise / 100 < found.min_purchase) {
      showToast('warning', 'Threshold Not Met', `Minimum purchase of ₹${found.min_purchase} required.`);
      setAppliedCoupon(null);
      return;
    }
    
    setAppliedCoupon(found);
    showToast('success', 'Coupon Applied', `Discount of ${found.discount_value}${found.discount_type === 'percentage' ? '%' : ' Rs'} activated.`);
  };

  // Cash drop
  const handleAddCashDrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (dropAmount <= 0 || !dropReason.trim()) {
      showToast('error', 'Fields Required', 'Please enter a valid amount and payout reason.');
      return;
    }
    if (dropAmount > currentDrawerCash) {
      showToast('error', 'Limit Exceeded', 'Cannot payout more cash than current drawer balance.');
      return;
    }
    setCashDrops(prev => [...prev, {
      amount: dropAmount,
      reason: dropReason,
      time: new Date().toLocaleTimeString()
    }]);
    setDropAmount(0);
    setDropReason('');
    showToast('info', 'Cash Outflow Registered', 'Safe drop transaction recorded successfully.');
  };

  // POS Checkout Sale submit
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('error', 'Checkout Denied', 'Your shopping cart is empty.');
      return;
    }

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
      notes: `${notes} | GST Rate: ${gstRate}%`,
      coupon_code: appliedCoupon ? appliedCoupon.code : null
    };

    try {
      const res = await fetch('/api/admin/pos/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.order) {
        showToast('success', 'POS Sale Logged', `Invoice #${data.order.order_number} issued successfully.`);
        setPrintedOrder(data.order);
        
        // Reset POS fields
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCouponCode('');
        setAppliedCoupon(null);
        setCustomDiscount(0);
        setNotes('In-Store POS Sale');
        onOrderCreated();
      } else {
        showToast('error', 'Checkout Failed', data.error || 'Server rejected POS sale validation.');
      }
    } catch (err) {
      showToast('error', 'Connection Failure', 'Could not record transaction to cloud database.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* POS Controls / Top Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-neutral-200/80 p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 font-display italic">POS terminal</h2>
          <p className="text-[10px] text-neutral-500 font-medium">In-store billing panel & register log.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDrawerManager(!showDrawerManager)}
            className="px-4 py-2 border border-neutral-200 hover:bg-neutral-200 text-neutral-800 hover:text-neutral-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            Drawer: ₹{currentDrawerCash.toFixed(2)}
          </button>
        </div>
      </div>

      {/* POS Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Catalog and Search (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Filters Panel */}
          <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Scan barcode or type style name, sku..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div className="md:col-span-4">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Catalog Display Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-2xl">
                No matching product inventory found.
              </div>
            ) : (
              filteredProducts.map(p => {
                const priceRs = (p.price / 100).toLocaleString('en-IN');
                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className="bg-white border border-neutral-200/80 rounded-xl p-3 flex flex-col justify-between hover:border-amber-500/30 transition-all cursor-pointer group"
                  >
                    <div className="aspect-square bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden flex items-center justify-center relative mb-2.5">
                      <HeicImage src={p.images?.[0] || ''} alt={p.name} className="max-w-full max-h-full object-contain" />
                      {p.stock <= 2 && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[8px] font-bold text-rose-500 uppercase">
                          Low Stock ({p.stock})
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">{p.sku}</span>
                      <h4 className="text-[10px] font-bold text-neutral-900 group-hover:text-amber-500 transition-colors line-clamp-1">{p.name}</h4>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[11px] font-bold text-neutral-850 font-mono">₹{priceRs}</span>
                        <span className="text-[8px] text-neutral-500 font-semibold">{p.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sales Receipt cart panel (4 cols) */}
        <div className="xl:col-span-4 bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-5 shadow-lg relative">
          <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-amber-500" />
              Sales Basket ({cart.length})
            </h3>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[9px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart items list */}
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                Cart is empty. Select products on the left.
              </div>
            ) : (
              cart.map((item, idx) => {
                const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price / 100;
                return (
                  <div key={`${item.product.id}-${item.size}`} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 relative">
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="absolute top-2 right-2 text-neutral-500 hover:text-neutral-900"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-white border border-neutral-200 rounded flex items-center justify-center overflow-hidden shrink-0">
                        <HeicImage src={item.product.images?.[0]} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0 pr-5">
                        <h4 className="text-[10px] font-bold text-neutral-900 truncate">{item.product.name}</h4>
                        <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider block font-mono">
                          Size: {item.size} | SKU: {item.product.sku} | ₹{itemPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1 border-t border-neutral-200/80">
                      {/* Custom pricing override input */}
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-neutral-500 uppercase font-semibold">Override:</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={(item.product.price / 100).toString()}
                          value={item.customPrice !== undefined ? item.customPrice : ''}
                          onChange={e => updateCustomPrice(idx, e.target.value)}
                          className="w-16 bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-[10px] text-right font-mono text-neutral-850 focus:outline-none"
                        />
                      </div>

                      {/* Quantity selector */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(idx, -1)}
                          className="p-0.5 bg-white hover:bg-neutral-800 border border-neutral-200 rounded text-neutral-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-neutral-900 font-mono">{item.qty}</span>
                        <button
                          onClick={() => updateQty(idx, 1)}
                          className="p-0.5 bg-white hover:bg-neutral-800 border border-neutral-200 rounded text-neutral-500"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Customer Lookup Form */}
          <div className="p-3.5 bg-neutral-50/50 border border-neutral-200/80 rounded-xl space-y-3">
            <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-amber-500" /> Customer Information
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-900 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Phone Number"
                maxLength={10}
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-900 focus:outline-none"
              />
            </div>
            <input
              type="email"
              placeholder="Email (Optional)"
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-900 focus:outline-none"
            />
          </div>

          {/* Coupons & Adjustments */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Promo Coupon</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="CODE"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-[10px] uppercase text-neutral-900 focus:outline-none font-mono"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg text-[9px] font-bold"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Custom Discount (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                value={customDiscount || ''}
                onChange={e => setCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-[10px] text-right text-neutral-900 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Tax Slabs & Payments */}
          <div className="grid grid-cols-2 gap-3 border-t border-neutral-200/80 pt-3">
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Inclusive GST Slab</label>
              <select
                value={gstRate}
                onChange={e => setGstRate(Number(e.target.value))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] text-neutral-900 focus:outline-none"
              >
                <option value="5">5% GST (Flat)</option>
                <option value="12">12% GST (Standard)</option>
                <option value="18">18% GST (Footwear/Lux)</option>
                <option value="0">0% Exempt</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] text-neutral-900 focus:outline-none"
              >
                <option value="cash">💵 Cash In-Hand</option>
                <option value="upi">📱 UPI QR Payment</option>
                <option value="card">💳 Card Terminal</option>
              </select>
            </div>
          </div>

          {/* Receipt Financial Calculations Summary */}
          <div className="bg-neutral-50 p-3 rounded-xl space-y-2 text-[10px] font-mono">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal Amount:</span>
              <span>₹{(subtotalPaise / 100).toFixed(2)}</span>
            </div>
            {totalDiscountPaise > 0 && (
              <div className="flex justify-between text-rose-500 font-bold">
                <span>Promotional Discount:</span>
                <span>-₹{(totalDiscountPaise / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-500 text-[9px]">
              <span>Base Value:</span>
              <span>₹{(baseAmountPaise / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-500 text-[9px]">
              <span>GST Inclusive ({gstRate}%):</span>
              <span>₹{(gstAmountPaise / 100).toFixed(2)}</span>
            </div>
            <div className="h-[1px] bg-neutral-900 my-1" />
            <div className="flex justify-between text-xs font-bold text-neutral-900">
              <span className="text-neutral-850">NET PAYABLE:</span>
              <span className="text-neutral-850">₹{(totalPayablePaise / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]"
          >
            Submit Cashier Sale
          </button>
        </div>
      </div>

      {/* MODAL: Size Selector Drawer */}
      {activeSizeProduct && (
        <div className="fixed inset-0 z-50 flex justify-center items-center">
          <div onClick={() => setActiveSizeProduct(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-white border border-neutral-200/80 w-full max-w-sm rounded-2xl p-6 relative z-10 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
              <div>
                <h4 className="text-xs text-neutral-500 font-bold uppercase tracking-wider">{activeSizeProduct.sku}</h4>
                <h3 className="text-sm font-bold text-neutral-900">{activeSizeProduct.name}</h3>
              </div>
              <button
                onClick={() => setActiveSizeProduct(null)}
                className="p-1 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Select Size Variant</label>
              <div className="grid grid-cols-4 gap-2">
                {activeSizeProduct.sizes.map(sz => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-2 text-xs font-bold font-mono rounded-lg border transition-all ${
                      selectedSize === sz
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : 'border-neutral-200 hover:border-neutral-700 text-neutral-900 bg-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmAddToCart}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors"
            >
              Add Selected Variant
            </button>
          </div>
        </div>
      )}

      {/* DRAWER: Safe Register Logs Manager */}
      {showDrawerManager && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setShowDrawerManager(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="w-full max-w-md bg-white border-l border-neutral-200/80 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Cash Register Manager
                </h3>
                <button
                  onClick={() => setShowDrawerManager(false)}
                  className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status matrix */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Starting Float</span>
                  <input
                    type="number"
                    value={drawerStartCash}
                    onChange={e => setDrawerStartCash(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-transparent border-b border-neutral-200 text-lg font-bold font-mono text-neutral-900 mt-1 py-0.5 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Actual Balance</span>
                  <span className="block text-lg font-bold font-mono text-emerald-700 mt-1">₹{currentDrawerCash.toFixed(2)}</span>
                </div>
              </div>

              {/* Register Action Payout Form */}
              <form onSubmit={handleAddCashDrop} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-4">
                <span className="block text-[9px] font-bold text-neutral-900 uppercase tracking-wider">Log Safe Cash Drop / Cash Drawer Outflow</span>
                <div>
                  <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Outflow Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={dropAmount || ''}
                    onChange={e => setDropAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Reason / Destination</label>
                  <input
                    type="text"
                    required
                    value={dropReason}
                    onChange={e => setDropReason(e.target.value)}
                    placeholder="e.g. Bank Safe Drop, Vendor Payout"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-neutral-900 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors"
                >
                  Record Cash Payout
                </button>
              </form>

              {/* Drop list log */}
              <div className="space-y-2">
                <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Drawer Payouts Log</span>
                <div className="space-y-2 divide-y divide-neutral-900 max-h-48 overflow-y-auto">
                  {cashDrops.length === 0 ? (
                    <div className="py-6 text-center text-[10px] text-neutral-600">No cash drops recorded today.</div>
                  ) : (
                    cashDrops.map((d, i) => (
                      <div key={i} className="pt-2 flex justify-between text-[10px] font-mono">
                        <div>
                          <span className="text-neutral-900 block font-sans font-semibold">{d.reason}</span>
                          <span className="text-neutral-500 text-[8px]">{d.time}</span>
                        </div>
                        <span className="text-rose-500 font-bold">-₹{d.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowDrawerManager(false)}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 font-semibold rounded-xl text-xs uppercase transition-colors"
            >
              Close Drawer Register
            </button>
          </div>
        </div>
      )}

      {/* INVOICE THERMAL PRINTER MODAL DIALOG */}
      {printedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setPrintedOrder(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="bg-white text-black p-6 w-full max-w-sm rounded-lg shadow-2xl relative z-10 flex flex-col items-center">
            {/* Header info */}
            <div className="w-full text-center space-y-1 font-mono border-b border-dashed border-gray-300 pb-4 mb-4 text-[10px]">
              <h2 className="text-sm font-bold tracking-widest uppercase">HEELSUP BOUTIQUE</h2>
              <p>DLF Phase 4, Galleria Market, Gurugram</p>
              <p>Tel: +91 99999-88888 | GSTIN: 06AAAAA1111A1Z1</p>
              <div className="h-[1px] my-2" />
              <p className="font-bold">INVOICE: {printedOrder.order_number}</p>
              <p>Date: {new Date(printedOrder.created_at || Date.now()).toLocaleString()}</p>
              <p>Type: {printedOrder.payment_method?.toUpperCase()} SALE</p>
              <p>Cashier: Staff Admin</p>
            </div>

            {/* Customer Details */}
            <div className="w-full text-left font-mono text-[9px] border-b border-dashed border-gray-300 pb-3 mb-3 space-y-0.5">
              <p><strong>Customer:</strong> {printedOrder.customer_name}</p>
              <p><strong>Phone:</strong> {printedOrder.customer_phone}</p>
              {printedOrder.customer_email && <p><strong>Email:</strong> {printedOrder.customer_email}</p>}
            </div>

            {/* Items table */}
            <div className="w-full font-mono text-[10px] border-b border-dashed border-gray-300 pb-3 mb-3">
              <div className="flex justify-between font-bold border-b border-gray-200 pb-1 mb-1">
                <span className="w-1/2">Item Description</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/3 text-right">Price</span>
              </div>
              <div className="space-y-1.5">
                {printedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[9px]">
                    <div className="w-1/2 min-w-0 truncate">
                      <span>{item.product_name}</span>
                      <span className="block text-[8px] text-gray-500">Sz: {item.size}</span>
                    </div>
                    <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                    <span className="w-1/3 text-right font-mono">₹{((item.price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations breakdown */}
            <div className="w-full font-mono text-[10px] space-y-1 border-b border-dashed border-gray-300 pb-3 mb-3">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>₹{(printedOrder.subtotal_amount).toFixed(2)}</span>
              </div>
              {printedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Promo Discounts:</span>
                  <span>-₹{(printedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="h-[1px] border-t border-gray-200 my-1" />
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL AMOUNT:</span>
                <span>₹{(printedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Barcode / Thank note */}
            <div className="w-full text-center font-mono text-[9px] space-y-4">
              <p className="font-semibold italic">Thank you for shopping at HeelsUp!</p>
              
              {/* SVG Mock barcode representation */}
              <div className="flex justify-center items-center py-2 bg-gray-100/50 rounded">
                <svg width="180" height="30" className="overflow-visible">
                  <rect x="10" y="0" width="3" height="30" fill="black" />
                  <rect x="15" y="0" width="1" height="30" fill="black" />
                  <rect x="18" y="0" width="2" height="30" fill="black" />
                  <rect x="23" y="0" width="4" height="30" fill="black" />
                  <rect x="30" y="0" width="1" height="30" fill="black" />
                  <rect x="35" y="0" width="3" height="30" fill="black" />
                  <rect x="40" y="0" width="2" height="30" fill="black" />
                  <rect x="45" y="0" width="1" height="30" fill="black" />
                  <rect x="48" y="0" width="4" height="30" fill="black" />
                  <rect x="55" y="0" width="1" height="30" fill="black" />
                  <rect x="60" y="0" width="2" height="30" fill="black" />
                  <rect x="65" y="0" width="3" height="30" fill="black" />
                  <rect x="70" y="0" width="1" height="30" fill="black" />
                  <rect x="74" y="0" width="4" height="30" fill="black" />
                  <rect x="80" y="0" width="2" height="30" fill="black" />
                  <rect x="85" y="0" width="1" height="30" fill="black" />
                  <rect x="90" y="0" width="3" height="30" fill="black" />
                  <rect x="95" y="0" width="2" height="30" fill="black" />
                  <rect x="100" y="0" width="1" height="30" fill="black" />
                  <rect x="103" y="0" width="4" height="30" fill="black" />
                  <rect x="110" y="0" width="2" height="30" fill="black" />
                  <rect x="115" y="0" width="1" height="30" fill="black" />
                  <rect x="120" y="0" width="3" height="30" fill="black" />
                  <rect x="125" y="0" width="2" height="30" fill="black" />
                  <rect x="130" y="0" width="4" height="30" fill="black" />
                  <rect x="138" y="0" width="1" height="30" fill="black" />
                  <rect x="142" y="0" width="2" height="30" fill="black" />
                  <rect x="147" y="0" width="3" height="30" fill="black" />
                  <rect x="152" y="0" width="1" height="30" fill="black" />
                  <rect x="156" y="0" width="4" height="30" fill="black" />
                  <rect x="162" y="0" width="2" height="30" fill="black" />
                  <rect x="168" y="0" width="3" height="30" fill="black" />
                </svg>
              </div>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest">{printedOrder.order_number}</p>
            </div>

            <div className="flex gap-3 mt-6 w-full relative z-10 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-neutral-900 text-neutral-900 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print slip
              </button>
              <button
                onClick={() => setPrintedOrder(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-600 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
