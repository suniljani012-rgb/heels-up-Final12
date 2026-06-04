import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, ListChecks,
  ShieldAlert, LogOut, Plus, Edit3, Settings
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'

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
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

export default function Admin() {
  const { user, token, logout, login } = useAuthStore()
  const { showToast } = useToastStore()
  const navigate = useNavigate()

  // Login credentials for staff panel
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Current tab view: 'dashboard' | 'pos' | 'products' | 'orders' | 'inventory' | 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'products' | 'orders' | 'inventory' | 'settings'>('dashboard')

  // Shared data states
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [, setLoadingData] = useState(false)

  // Settings Tab states
  const [storeSettings, setStoreSettings] = useState<any>({
    store_name: '',
    store_email: '',
    support_phone: '',
    store_address: '',
    razorpay_key_id: '',
    razorpay_key_secret: '',
    google_client_id: '',
    social_instagram: '',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [testingRzp, setTestingRzp] = useState(false)

  // POS billing ticket states
  const [posCart, setPosCart] = useState<any[]>([])
  const [posCustomerName, setPosCustomerName] = useState('')
  const [posCustomerPhone, setPosCustomerPhone] = useState('')
  const [posDiscount, setPosDiscount] = useState(0) // in rupees
  const [posPaymentMethod] = useState<'Cash' | 'Card' | 'UPI'>('Cash')
  const [posSearchQuery, setPosSearchQuery] = useState('')

  // Product Manager states
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [productFormName, setProductFormName] = useState('')
  const [productFormSKU, setProductFormSKU] = useState('')
  const [productFormPrice, setProductFormPrice] = useState(0) // Rupees
  const [productFormMrp, setProductFormMrp] = useState(0) // Rupees
  const [productFormStock, setProductFormStock] = useState(5)
  const [productFormCategory, setProductFormCategory] = useState('heels')

  // Fetch dashboard and tab-specific details
  const isStaff = token && (user?.role === 'admin' || user?.role === 'staff')

  useEffect(() => {
    if (!isStaff) return
    loadTabDetails()
  }, [activeTab, token])

  const loadTabDetails = async () => {
    setLoadingData(true)
    try {
      if (activeTab === 'dashboard' || activeTab === 'products' || activeTab === 'pos' || activeTab === 'inventory') {
        const prodRes = await fetch('/api/products?limit=100')
        const prodData = await prodRes.json()
        if (prodData.success) {
          setProducts(prodData.data)
        }
      }
      if (activeTab === 'dashboard' || activeTab === 'orders') {
        const ordRes = await fetch('/api/orders/admin', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const ordData = await ordRes.json()
        if (ordData.success) {
          setOrders(ordData.data)
        }
      }
      if (activeTab === 'settings') {
        const res = await fetch('/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setStoreSettings(data.data || {})
        }
      }
    } catch {
      showToast('error', 'Error Loading Data', 'Failed to synchronize administrative logs.')
    } finally {
      setLoadingData(false)
    }
  }

  // Test Razorpay connection
  const handleTestRazorpay = async () => {
    if (!storeSettings.razorpay_key_id || !storeSettings.razorpay_key_secret) {
      showToast('error', 'Keys Required', 'Please enter both Key ID and Secret to test.')
      return
    }
    setTestingRzp(true)
    try {
      const res = await fetch('/api/settings/test/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_key_id: storeSettings.razorpay_key_id,
          razorpay_key_secret: storeSettings.razorpay_key_secret
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Razorpay Connected! ✅', 'Live API connection validated successfully.')
      } else {
        showToast('error', 'Connection Failed', data.error || 'Invalid credentials or keys.')
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to the Razorpay test endpoint.')
    } finally {
      setTestingRzp(false)
    }
  }

  // Update Settings in DB
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storeSettings)
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Settings Saved! 💾', 'Store settings updated in D1 database.')
      } else {
        showToast('error', 'Save Failed', data.error || 'Failed to update settings.')
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to save settings changes.')
    } finally {
      setSavingSettings(false)
    }
  }

  // Handle Staff Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoggingIn(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        const { token: staffToken, user: staffUser } = data.data
        if (staffUser.role === 'admin' || staffUser.role === 'staff') {
          login(staffToken, staffUser)
          showToast('success', 'Access Granted', `Administrative session initiated for ${staffUser.name}.`)
        } else {
          showToast('error', 'Access Denied', 'Access restricted to store staff and administrators.')
        }
      } else {
        showToast('error', 'Login Failed', data.error || 'Invalid credentials.')
      }
    } catch {
      showToast('error', 'Auth Error', 'Failed to authenticate staff credentials.')
    } finally {
      setLoggingIn(false)
    }
  }

  // Add Product to POS ticket
  const handleAddPosItem = (prod: Product) => {
    const existingIdx = posCart.findIndex(i => i.id === prod.id)
    if (existingIdx > -1) {
      const updated = [...posCart]
      updated[existingIdx].qty += 1
      setPosCart(updated)
    } else {
      setPosCart([...posCart, {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        price: prod.price / 100, // API price is paise, POS operates in rupees
        qty: 1
      }])
    }
  }

  // POS Checkout trigger
  const handlePosCheckout = async () => {
    if (posCart.length === 0) return

    try {
      const checkoutBody = {
        items: posCart.map(i => ({
          productId: i.id,
          name: i.name,
          sku: i.sku,
          qty: i.qty,
          price: i.price,
          size: '38',
          image: '/assets/placeholder.jpg'
        })),
        customerName: posCustomerName || 'Retail Customer',
        customerPhone: posCustomerPhone || '',
        discount: posDiscount,
        paymentMethod: posPaymentMethod,
        notes: 'In-Store POS Bill'
      }

      const res = await fetch('/api/pos/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(checkoutBody)
      })

      const data = await res.json()
      if (data.success) {
        showToast('success', 'Sale Logged successfully! 🧾', `Invoice Generated: ${data.data?.bill_number}`)
        setPosCart([])
        setPosCustomerName('')
        setPosCustomerPhone('')
        setPosDiscount(0)
        loadTabDetails()
      } else {
        showToast('error', 'POS Checkout Failed', data.error || 'Sale could not be saved.')
      }
    } catch {
      showToast('error', 'POS Network Error', 'Failed to process checkout transaction.')
    }
  }

  // Order status transitions (admin toggle)
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/admin/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Status Updated', `Order status updated to ${status}.`)
        loadTabDetails()
      }
    } catch {
      showToast('error', 'Failed status update', 'Order status could not be changed.')
    }
  }

  // Edit/Add product submit
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productFormName || !productFormSKU || !productFormPrice) return

    try {
      const prodBody = {
        name: productFormName,
        sku: productFormSKU,
        price: productFormPrice, // Rupees to API
        mrp: productFormMrp || productFormPrice,
        stock: productFormStock,
        category: productFormCategory,
        sizes: ['36', '37', '38', '39', '40', '41'],
        images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400&auto=format&fit=crop'],
        brand: 'HeelsUp'
      }

      let res
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(prodBody)
        })
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(prodBody)
        })
      }

      const data = await res.json()
      if (data.success) {
        showToast('success', 'Catalog Updated', editingProduct ? 'Product fields updated.' : 'New product created.')
        setEditingProduct(null)
        setProductFormName('')
        setProductFormSKU('')
        setProductFormPrice(0)
        setProductFormMrp(0)
        setProductFormStock(5)
        loadTabDetails()
      } else {
        showToast('error', 'Catalog Save Failed', data.error || 'Failed to edit database.')
      }
    } catch {
      showToast('error', 'Network error', 'Catalog save request failed.')
    }
  }

  // POS pricing aggregates
  const posSubtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0)
  const posTotal = Math.max(0, posSubtotal - posDiscount)

  // Render Login overlay if not staff
  if (!isStaff) {
    return (
      <div className="max-w-md mx-auto px-6 mt-20 min-h-[50vh] flex flex-col justify-center select-none">
        <div className="border border-gray-100 bg-white rounded-2xl p-8 shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light text-gray-900 font-display italic flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-6 h-6 text-[#d4456b]" /> Staff Workspace
            </h1>
            <p className="text-xs text-gray-400 mt-1.5">Verify your credentials to open POS and inventory controls</p>
          </div>

          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Staff Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                placeholder="staff@heelsup.in"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Access Token / Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                placeholder="Password"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 mt-6"
            >
              Verify Credentials
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-screen select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 border border-gray-100 rounded-xl p-5 bg-white shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-sm font-semibold text-gray-900 font-display italic">Store Management</h2>
            <p className="text-[10px] text-gray-500 capitalize">{user?.role} &middot; {user?.name}</p>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { id: 'dashboard', label: 'Summary Metrics', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'pos', label: 'POS Billing Terminal', icon: <ShoppingCart className="w-4 h-4" /> },
              { id: 'products', label: 'Products Manager', icon: <Package className="w-4 h-4" /> },
              { id: 'orders', label: 'Online Orders', icon: <ListChecks className="w-4 h-4" /> },
              { id: 'inventory', label: 'Stock Manager', icon: <Plus className="w-4 h-4" /> },
              { id: 'settings', label: 'Store Settings', icon: <Settings className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 text-xs font-semibold p-2.5 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              logout()
              showToast('info', 'Logged Out', 'Staff session closed.')
              navigate('/')
            }}
            className="w-full py-2 border border-gray-100 text-gray-500 hover:text-rose-600 hover:bg-rose-50/20 text-xs font-semibold rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Dynamic Tab view */}
        <div className="lg:col-span-9 bg-white border border-gray-100 rounded-xl p-6 shadow-sm min-h-[60vh]">
          
          {/* Active Tab: Summary Metrics */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <h3 className="text-base font-semibold text-gray-900 font-display italic border-b border-gray-100 pb-3">
                Summary Metrics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Catalog Styles</span>
                  <span className="text-2xl font-light text-primary block mt-1.5">{products.length}</span>
                </div>
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">D1 Logs (Orders)</span>
                  <span className="text-2xl font-light text-emerald-700 block mt-1.5">{orders.length}</span>
                </div>
                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Staff</span>
                  <span className="text-2xl font-light text-[#d4456b] block mt-1.5">1 Session</span>
                </div>
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pending Orders</span>
                  <span className="text-2xl font-light text-amber-700 block mt-1.5">
                    {orders.filter(o => o.order_status === 'placed' || o.order_status === 'confirmed').length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: POS billing terminal */}
          {activeTab === 'pos' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-gray-900 font-display italic border-b border-gray-100 pb-3">
                Point-of-Sale (POS) Checkout
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Search & Add product list */}
                <div className="md:col-span-7 space-y-4">
                  <input
                    type="text"
                    placeholder="Search by product name or code..."
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                  />
                  <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100 pr-2 border border-gray-100 rounded-lg p-2 bg-white space-y-2">
                    {products.filter(p => p.name.toLowerCase().includes(posSearchQuery.toLowerCase())).map((p) => (
                      <div key={p.id} className="flex justify-between items-center py-2">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-800">{p.name}</h4>
                          <span className="text-[9px] text-gray-400">SKU: {p.sku} &middot; Stock: {p.stock}</span>
                        </div>
                        <button
                          onClick={() => handleAddPosItem(p)}
                          className="px-2.5 py-1.5 bg-primary text-white hover:bg-[#b17e3f] rounded-md text-[10px] font-semibold transition-colors"
                        >
                          Add to POS
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout items ticket */}
                <div className="md:col-span-5 border border-[#ead2ae] bg-[#f7f5f0] rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200/50 pb-2">
                    Receipt Ticket
                  </h4>

                  {/* Items list */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {posCart.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-6">Ticket is empty</p>
                    ) : (
                      posCart.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-800 line-clamp-1">{item.name} (x{item.qty})</span>
                          <span className="font-bold text-gray-900">₹{(item.price * item.qty).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Customer information */}
                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      className="w-full border border-gray-200 rounded-md p-1.5 text-[10px] bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="Customer Phone"
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      className="w-full border border-gray-200 rounded-md p-1.5 text-[10px] bg-white"
                    />
                  </div>

                  {/* Pricing aggregates */}
                  <div className="border-t border-gray-200 pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{posSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Discount (₹)</span>
                      <input
                        type="number"
                        value={posDiscount}
                        onChange={(e) => setPosDiscount(Number(e.target.value))}
                        className="w-16 border border-gray-200 rounded p-0.5 text-right text-[10px] bg-white"
                      />
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-2 text-sm text-gray-950">
                      <span>POS Total</span>
                      <span>₹{posTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePosCheckout}
                    disabled={posCart.length === 0}
                    className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Complete POS Sale
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Products manager */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-base font-semibold text-gray-900 font-display italic">
                  {editingProduct ? 'Edit Catalog Entry' : 'Database Catalog'}
                </h3>
                <button
                  onClick={() => {
                    setEditingProduct(null)
                    setProductFormName('')
                    setProductFormSKU('')
                    setProductFormPrice(0)
                    setProductFormMrp(0)
                    setProductFormStock(5)
                  }}
                  className="px-2.5 py-1.5 bg-gray-900 text-white rounded-md text-[10px] font-semibold uppercase tracking-wider"
                >
                  Create Product
                </button>
              </div>

              {/* Editor Form */}
              <form onSubmit={handleProductFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-[#ead2ae] p-4 rounded-xl bg-[#f7f5f0] shadow-sm mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productFormName}
                    onChange={(e) => setProductFormName(e.target.value)}
                    className="w-full border border-gray-200 rounded-md p-2 text-xs bg-white focus:outline-none"
                    placeholder="e.g. Classic Stiletto"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Product SKU / Code</label>
                  <input
                    type="text"
                    required
                    value={productFormSKU}
                    onChange={(e) => setProductFormSKU(e.target.value)}
                    className="w-full border border-gray-200 rounded-md p-2 text-xs bg-white focus:outline-none"
                    placeholder="e.g. 0089-A"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={productFormPrice}
                    onChange={(e) => setProductFormPrice(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-md p-2 text-xs bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Original Price / MRP (₹)</label>
                  <input
                    type="number"
                    value={productFormMrp}
                    onChange={(e) => setProductFormMrp(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-md p-2 text-xs bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Total Stock</label>
                  <input
                    type="number"
                    value={productFormStock}
                    onChange={(e) => setProductFormStock(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-md p-2 text-xs bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Category</label>
                  <select
                    value={productFormCategory}
                    onChange={(e) => setProductFormCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-md p-2 text-xs bg-white"
                  >
                    <option value="heels">Heels</option>
                    <option value="sandals">Sandals</option>
                    <option value="flats">Flats</option>
                    <option value="bags">Bags</option>
                  </select>
                </div>
                <div className="md:col-span-2 pt-2 text-right">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold uppercase tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

              {/* Table list */}
              <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 font-semibold">
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Price</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-[#fcfbf9]">
                        <td className="p-3 font-semibold text-gray-900">{p.name}</td>
                        <td className="p-3 text-gray-500 uppercase">{p.sku}</td>
                        <td className="p-3 font-semibold text-gray-900">₹{(p.price / 100).toLocaleString()}</td>
                        <td className="p-3 text-center font-semibold">{p.stock}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingProduct(p)
                              setProductFormName(p.name)
                              setProductFormSKU(p.sku)
                              setProductFormPrice(p.price / 100)
                              setProductFormMrp(p.original_price ? p.original_price / 100 : p.price / 100)
                              setProductFormStock(p.stock)
                              setProductFormCategory(p.category)
                            }}
                            className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 inline-block"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active Tab: Online Orders list */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-gray-900 font-display italic border-b border-gray-100 pb-3">
                Online Orders Manager
              </h3>

              <div className="divide-y divide-gray-100 max-h-[450px] overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-6 text-center">No active orders</p>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="py-4 flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-gray-900">{ord.order_number}</h4>
                        <p className="text-[10px] text-gray-500">
                          {ord.customer_name} &middot; {new Date(ord.created_at).toLocaleDateString('en-IN')}
                        </p>
                        <span className="font-semibold text-gray-900 mt-1 block">
                          ₹{(ord.total_amount / 100).toLocaleString('en-IN')} &middot; {ord.payment_status}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={ord.order_status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="border border-gray-200 rounded-md p-1.5 text-[10px] bg-white"
                        >
                          <option value="placed">Placed</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Active Tab: Store Settings */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-base font-semibold text-gray-900 font-display italic">
                  Store Settings & Gateway Integration
                </h3>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              {/* General Settings */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">General Configurations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Store Name</label>
                    <input
                      type="text"
                      value={storeSettings.store_name || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="e.g. HeelsUp Store"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Support Phone</label>
                    <input
                      type="text"
                      value={storeSettings.support_phone || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, support_phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="e.g. +91 98290 12345"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Support Email</label>
                    <input
                      type="email"
                      value={storeSettings.store_email || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, store_email: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="e.g. support@heelsup.in"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Store Address</label>
                    <input
                      type="text"
                      value={storeSettings.store_address || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, store_address: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="Jodhpur, Rajasthan, India"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Gateway */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Razorpay Live Integration</h4>
                  <p className="text-[10px] text-gray-500 mt-1">Configure your merchant live keys below to route order payments directly to your Razorpay account.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Razorpay Key ID</label>
                    <input
                      type="text"
                      value={storeSettings.razorpay_key_id || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, razorpay_key_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="rzp_live_xxxxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Razorpay Key Secret</label>
                    <input
                      type="password"
                      value={storeSettings.razorpay_key_secret || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, razorpay_key_secret: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="••••••••••••••••••••"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={testingRzp}
                    onClick={handleTestRazorpay}
                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:text-black hover:border-black text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testingRzp ? 'Testing Connection...' : 'Test Razorpay Connection'}
                  </button>
                </div>
              </div>

              {/* Other configs */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Socials & Identity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Instagram Profile</label>
                    <input
                      type="text"
                      value={storeSettings.social_instagram || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, social_instagram: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Google OAuth Client ID</label>
                    <input
                      type="text"
                      value={storeSettings.google_client_id || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, google_client_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none"
                      placeholder="For Google social login integration..."
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
