import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useToastStore } from '../../store/useToastStore';
import {
  ShoppingCart, Search, Trash2, Plus, X, Printer, User, DollarSign,
  MessageCircle, CreditCard, Banknote, Smartphone, CheckCircle2, Package,
  ChevronDown, ArrowRight
} from 'lucide-react';
import HeicImage from '../../components/HeicImage';

// Instagram SVG icon
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
  size_stock?: { size_label: string; stock: number }[];
}

interface PosTerminalProps {
  products: Product[];
  categories: any[];
  coupons: any[];
  onOrderCreated: () => void;
}

type PaymentMethod = 'cash' | 'upi' | 'card' | 'whatsapp' | 'instagram';
type SaleChannel = 'in-store' | 'whatsapp' | 'instagram' | 'phone';

export default function PosTerminal({ products, categories, coupons, onOrderCreated }: PosTerminalProps) {
  const showToast = useToastStore((state) => state.showToast);
  // Cart/Billing list state
  const [cart, setCart] = useState<{ product: Product; size: string; color: string; qty: number; customPrice?: number }[]>([]);

  // Item selector form states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [itemPriceOverride, setItemPriceOverride] = useState('');
  const [itemQty, setItemQty] = useState(1);

  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [saleChannel, setSaleChannel] = useState<SaleChannel>('in-store');

  // Billing and discounts
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('In-Store POS Sale');

  // Drawer float and drops
  const [drawerStartCash, setDrawerStartCash] = useState<number>(5000);
  const [cashDrops, setCashDrops] = useState<{ amount: number; reason: string; time: string }[]>([]);
  const [dropAmount, setDropAmount] = useState<number>(0);
  const [dropReason, setDropReason] = useState('');
  const [showDrawerManager, setShowDrawerManager] = useState(false);

  // Print invoice modal state
  const [printedOrder, setPrintedOrder] = useState<any | null>(null);

  // Filter products for the searchable dropdown
  const filteredProductOptions = useMemo(() => {
    if (!searchProductQuery.trim()) {
      return products.filter(p => p.active);
    }
    const q = searchProductQuery.toLowerCase();
    return products.filter(p => p.active && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)));
  }, [products, searchProductQuery]);

  // Derived colors for the selected product
  const availableColors = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.color_variants && selectedProduct.color_variants.length > 0) {
      return selectedProduct.color_variants.map(cv => cv.color);
    }
    return selectedProduct.colors || [];
  }, [selectedProduct]);

  // Derived sizes & stocks based on selected product and selected color
  const sizeStockOptions = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.color_variants && selectedProduct.color_variants.length > 0) {
      const cv = selectedProduct.color_variants.find(v => v.color === selectedColor);
      return cv ? cv.size_stock : [];
    }
    // Fallback: If no color_variants, return size_stock from main product
    return selectedProduct.sizes.map(sz => {
      const found = selectedProduct.size_stock?.find((ss: any) => ss.size_label === sz);
      return { size_label: sz, stock: found ? found.stock : 99 };
    });
  }, [selectedProduct, selectedColor]);

  // Auto-fill color and size when product changes
  useEffect(() => {
    if (selectedProduct) {
      const defaultColor = availableColors[0] || '';
      setSelectedColor(defaultColor);
      setItemPriceOverride((selectedProduct.price / 100).toString());
    } else {
      setSelectedColor('');
      setSelectedSize('');
      setItemPriceOverride('');
    }
    setItemQty(1);
  }, [selectedProduct, availableColors]);

  // Auto-fill size when color changes
  useEffect(() => {
    if (sizeStockOptions.length > 0) {
      // Find first size with stock > 0, otherwise first size
      const instock = sizeStockOptions.find(opt => opt.stock > 0);
      setSelectedSize(instock ? instock.size_label : sizeStockOptions[0].size_label);
    } else {
      setSelectedSize('');
    }
  }, [selectedColor, sizeStockOptions]);

  // Handle outside click for product dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Financial calculations
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

  // Add selected item to billing list (cart)
  const handleAddItemToBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('error', 'Select Product', 'Please select a product first.');
      return;
    }
    if (!selectedSize) {
      showToast('error', 'Select Size', 'Please select a valid size.');
      return;
    }

    // Check stock availability
    const variantOpt = sizeStockOptions.find(opt => opt.size_label === selectedSize);
    const availableStock = variantOpt ? variantOpt.stock : 0;
    if (availableStock < itemQty) {
      showToast('warning', 'Low Stock', `Only ${availableStock} units available for this selection.`);
      return;
    }

    const priceOverrideNum = parseFloat(itemPriceOverride);
    const hasOverride = !isNaN(priceOverrideNum) && priceOverrideNum !== (selectedProduct.price / 100);

    const existingIdx = cart.findIndex(item =>
      item.product.id === selectedProduct.id &&
      item.size === selectedSize &&
      item.color === selectedColor
    );

    if (existingIdx > -1) {
      const updated = [...cart];
      const newQty = updated[existingIdx].qty + itemQty;
      if (availableStock < newQty) {
        showToast('error', 'Limit Exceeded', `Cannot add more. Max stock is ${availableStock}.`);
        return;
      }
      updated[existingIdx].qty = newQty;
      if (hasOverride) updated[existingIdx].customPrice = priceOverrideNum;
      setCart(updated);
    } else {
      setCart(prev => [...prev, {
        product: selectedProduct,
        size: selectedSize,
        color: selectedColor,
        qty: itemQty,
        customPrice: hasOverride ? priceOverrideNum : undefined
      }]);
    }

    showToast('success', 'Added', `${selectedProduct.name} added to bill.`);
    // Reset product selection
    setSelectedProduct(null);
    setSearchProductQuery('');
  };

  const updateQty = (idx: number, delta: number) => {
    const updated = [...cart];
    const item = updated[idx];
    
    // Check stock
    const cv = item.product.color_variants?.find(v => v.color === item.color);
    const variantOpt = cv ? cv.size_stock.find(ss => ss.size_label === item.size) : null;
    const availableStock = variantOpt ? variantOpt.stock : 99;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      updated.splice(idx, 1);
    } else {
      if (newQty > availableStock) {
        showToast('warning', 'Low Stock', `Only ${availableStock} units are in stock.`);
        return;
      }
      updated[idx].qty = newQty;
    }
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

  const handleShareWhatsApp = () => {
    if (cart.length === 0) { showToast('error', 'Empty Cart', 'Add products before sharing.'); return; }
    const items = cart.map(item => `• ${item.product.name} (${item.color && item.color + ' · '}Size: ${item.size}) x${item.qty} — ₹${((item.customPrice ?? item.product.price / 100) * item.qty).toFixed(0)}`).join('\n');
    const msg = `*HeelsUp Order Summary*\n\nCustomer: ${customerName || 'Walk-in'}\n\n${items}\n\n*Total: ₹${(totalPayablePaise / 100).toFixed(0)}*\n\nThank you for choosing HeelsUp! 👟`;
    const url = `https://wa.me/${customerPhone ? '91' + customerPhone : ''}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { showToast('error', 'Checkout Denied', 'Billing list is empty.'); return; }
    
    const finalizeSale = async (rzpPaymentId?: string) => {
      const channelNotes = saleChannel === 'whatsapp' ? '📱 WhatsApp Sale' : saleChannel === 'instagram' ? '📸 Instagram Sale' : saleChannel === 'phone' ? '📞 Phone Order' : 'In-Store POS Sale';
      const paymentNotes = rzpPaymentId ? ` | Razorpay TxID: ${rzpPaymentId}` : '';
      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || '0000000000',
        customer_email: customerEmail.trim() || 'pos-customer@heelsup.in',
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          size: item.size,
          color: item.color,
          quantity: item.qty,
          price: item.customPrice !== undefined ? Math.round(item.customPrice * 100) : item.product.price,
          sku: item.product.sku,
          image: item.product.images?.[0] || ''
        })),
        subtotal_amount: subtotalPaise / 100,
        shipping_amount: 0,
        discount_amount: totalDiscountPaise / 100,
        total_amount: totalPayablePaise / 100,
        notes: `${channelNotes} | GST Rate: ${gstRate}%${notes !== 'In-Store POS Sale' && notes ? ' | ' + notes : ''}${paymentNotes}`,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        created_at: new Date().toISOString()
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

    if (paymentMethod === 'upi') {
      try {
        showToast('info', 'Generating UPI QR', 'Contacting Razorpay Gateway...');
        // 1. Call POS Payment Initiate API
        const initRes = await fetch('/api/admin/pos/initiate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` },
          body: JSON.stringify({ amount: totalPayablePaise / 100 })
        });
        const initData = await initRes.json();
        if (!initData.success) {
          showToast('error', 'Gateway Error', initData.error || 'Failed to initialize payment order.');
          return;
        }

        const { key, razorpayOrder } = initData.data;

        // 2. Launch Razorpay with prefilled UPI QR
        const rzpOptions = {
          key: key,
          amount: razorpayOrder.amount,
          currency: 'INR',
          name: 'HeelsUp Boutique POS',
          description: `POS Bill Amount: ₹${(totalPayablePaise / 100).toFixed(2)}`,
          image: '/logo.png',
          order_id: razorpayOrder.id,
          prefill: {
            name: customerName.trim() || 'POS Customer',
            contact: customerPhone.trim() || '9999999999',
            email: customerEmail.trim() || 'pos-customer@heelsup.in',
            method: 'upi'
          },
          config: {
            display: {
              blocks: {
                banks: {
                  name: 'Scan & Pay UPI QR',
                  instruments: [
                    {
                      method: 'upi',
                      flows: ['qr']
                    }
                  ]
                }
              },
              sequence: ['block.banks'],
              preferences: {
                show_default_blocks: false
              }
            }
          },
          theme: {
            color: '#2563eb'
          },
          handler: async function (response: any) {
            showToast('success', 'UPI Payment Received', `Razorpay ID: ${response.razorpay_payment_id}`);
            await finalizeSale(response.razorpay_payment_id);
          },
          modal: {
            ondismiss: function () {
              showToast('warning', 'Payment Cancelled', 'Merchant cancelled the Razorpay window.');
            }
          }
        };

        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.open();
      } catch (e) {
        showToast('error', 'Razorpay Failure', 'Could not open UPI payment interface.');
      }
    } else {
      // Direct offline sale for cash/card/etc.
      await finalizeSale();
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
    <div className="space-y-5 animate-fade-in text-neutral-900">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 font-display italic">POS Terminal</h2>
          <p className="text-[10px] text-neutral-500 font-medium">Traditional Quick Invoice and Sales Ledger Billing</p>
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
          className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          Drawer: ₹{currentDrawerCash.toFixed(0)}
        </button>
      </div>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT: Product Selection & Bill Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Product Selection Form */}
          <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
              Select Product & Variant
            </h3>
            
            <form onSubmit={handleAddItemToBill} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Dropdown search for Product */}
              <div className="md:col-span-5 relative" ref={productDropdownRef}>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Search & Select Product</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type name or SKU..."
                    value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : searchProductQuery}
                    onChange={(e) => {
                      if (selectedProduct) setSelectedProduct(null);
                      setSearchProductQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-400"
                  />
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => { setSelectedProduct(null); setSearchProductQuery(''); }}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showProductDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl z-20 divide-y divide-neutral-50">
                    {filteredProductOptions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-neutral-400 italic">No products found</div>
                    ) : (
                      filteredProductOptions.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setShowProductDropdown(false);
                          }}
                          className="p-3 hover:bg-neutral-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="font-semibold text-neutral-800">
                            {p.name}
                            <span className="block text-[9px] font-mono text-neutral-400 uppercase mt-0.5">{p.sku}</span>
                          </div>
                          <span className="font-bold text-neutral-900 font-mono">₹{(p.price / 100).toFixed(0)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Color Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Color</label>
                <select
                  disabled={!selectedProduct || availableColors.length === 0}
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2 text-xs font-semibold text-neutral-800 focus:outline-none disabled:opacity-50"
                >
                  {availableColors.length === 0 && <option value="">N/A</option>}
                  {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Size Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Size & Stock</label>
                <select
                  disabled={!selectedProduct || sizeStockOptions.length === 0}
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2 text-xs font-semibold text-neutral-800 focus:outline-none disabled:opacity-50"
                >
                  {sizeStockOptions.length === 0 && <option value="">N/A</option>}
                  {sizeStockOptions.map(opt => (
                    <option key={opt.size_label} value={opt.size_label}>
                      UK {opt.size_label} ({opt.stock} left)
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Override Input */}
              <div className="md:col-span-2">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Price (₹)</label>
                <input
                  type="number"
                  disabled={!selectedProduct}
                  value={itemPriceOverride}
                  onChange={(e) => setItemPriceOverride(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-right text-neutral-900 focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Qty and Submit */}
              <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={!selectedProduct}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Billing List Table */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 uppercase tracking-wider">
                Invoice items ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest">
                  Clear All
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-100 font-mono text-[9px] uppercase tracking-wider">
                    <th className="p-3.5">Product Description</th>
                    <th className="p-3.5 w-32">Unit Price (₹)</th>
                    <th className="p-3.5 w-32 text-center">Quantity</th>
                    <th className="p-3.5 w-32 text-right">Subtotal</th>
                    <th className="p-3.5 w-16 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-neutral-400 italic">
                        Select a product above to build your invoice
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => {
                      const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price / 100;
                      return (
                        <tr key={`${item.product.id}-${item.size}-${item.color}`} className="hover:bg-neutral-50/40">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {item.product.images?.[0] && (
                                <div className="w-9 h-9 border border-neutral-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                  <HeicImage src={item.product.images[0]} className="w-full h-full object-contain" />
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-neutral-900 block">{item.product.name}</span>
                                <span className="text-[9px] text-neutral-500 font-mono block mt-0.5">
                                  SKU: {item.product.sku} {item.color && `· Color: ${item.color}`} · Size: UK {item.size}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <input
                              type="number"
                              step="0.01"
                              value={item.customPrice !== undefined ? item.customPrice : ''}
                              placeholder={(item.product.price / 100).toString()}
                              onChange={e => updateCustomPrice(idx, e.target.value)}
                              className="w-24 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs text-right font-mono text-neutral-900 focus:outline-none"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => updateQty(idx, -1)}
                                className="w-6 h-6 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-center text-neutral-600 transition-colors">
                                <span className="font-bold text-xs leading-none">−</span>
                              </button>
                              <span className="text-xs font-bold text-neutral-900 font-mono w-5 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(idx, 1)}
                                className="w-6 h-6 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-center text-neutral-600 transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-neutral-900 text-xs">
                            ₹{(itemPrice * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right">
                            <button onClick={() => removeFromCart(idx)} className="text-neutral-400 hover:text-rose-500 p-1 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Checkout & Summary Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-2xl shadow-sm p-4 space-y-4">
          
          {/* Customer */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5">
            <span className="block text-[9px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Customer details
            </span>
            <div className="space-y-2">
              <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Phone (+91...)" maxLength={10} value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none font-mono" />
                <input type="email" placeholder="Email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none" />
              </div>
            </div>

            {/* Social quick share links */}
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

          {/* Coupons & Manual Discount */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Promo Coupon</label>
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
                  <CheckCircle2 className="w-3 h-3" /> {appliedCoupon.code} active
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Discount (₹)</label>
              <input type="number" placeholder="0" value={customDiscount || ''}
                onChange={e => setCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-right text-neutral-900 focus:outline-none font-mono" />
            </div>
          </div>

          {/* GST Slab & Payment Mode */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-neutral-100 pt-3">
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">GST Slab</label>
              <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-xs text-neutral-900 focus:outline-none">
                <option value="0">0% Exempt</option>
                <option value="5">5% GST (Flat)</option>
                <option value="12">12% GST (Standard)</option>
                <option value="18">18% GST (Luxury)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Payment Mode</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-xs text-neutral-900 focus:outline-none">
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
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none" />
          </div>

          {/* Summary */}
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span><span>₹{(subtotalPaise / 100).toFixed(2)}</span>
            </div>
            {totalDiscountPaise > 0 && (
              <div className="flex justify-between text-rose-500 font-bold">
                <span>Discount</span><span>-₹{(totalDiscountPaise / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400 text-[11px]">
              <span>Base Value</span><span>₹{(baseAmountPaise / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-400 text-[11px]">
              <span>GST ({gstRate}%) incl.</span><span>₹{(gstAmountPaise / 100).toFixed(2)}</span>
            </div>
            <div className="border-t border-neutral-200 pt-2 flex justify-between text-sm font-bold text-neutral-900">
              <span>NET PAYABLE</span><span>₹{(totalPayablePaise / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button onClick={handleCheckout} disabled={cart.length === 0}
            className={`w-full py-4 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 ${saleChannel === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : saleChannel === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-neutral-900 hover:bg-neutral-800'}`}>
            {paymentIcons[paymentMethod]}
            {saleChannel === 'whatsapp' ? 'Confirm WhatsApp Sale' : saleChannel === 'instagram' ? 'Confirm Instagram Sale' : 'Complete Sale & Print'}
          </button>
        </div>
      </div>

      {/* Drawer Float manager */}
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
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs uppercase transition-colors">
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
              <p className="font-bold">INVOICE: <span className="text-blue-600 font-bold">{printedOrder.order_number}</span></p>
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
                className="flex-1 py-2.5 bg-neutral-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-neutral-800 flex items-center justify-center gap-1.5 transition-colors">
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
