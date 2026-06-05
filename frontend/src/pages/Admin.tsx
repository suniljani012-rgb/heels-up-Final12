import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type NavItem = {
  id: string; label: string; icon: string; group: string; badge?: number | string
}
type Toast = { id: string; type: 'success'|'error'|'info'|'warning'; msg: string; title: string }
type Order = {
  id: number; order_number: string; customer_name: string; customer_phone: string
  customer_email?: string; total_amount: number; subtotal_amount: number
  discount_amount: number; shipping_amount: number
  order_status: 'placed'|'confirmed'|'shipped'|'delivered'|'cancelled'
  payment_status: string; payment_method: string; created_at: string
  source: string; courier_name?: string; tracking_number?: string
  tracking_url?: string; notes?: string
  address_line1?: string; address_line2?: string; city?: string
  state?: string; pincode?: string
  items: OrderItem[]
}
type OrderItem = {
  id: number; product_name: string; size: string; quantity: number
  price: number; image?: string
}
type Product = {
  id: number; name: string; sku: string; category: string; price: number
  original_price?: number; stock: number; active: boolean; featured: boolean
  images: string[]; sizes: string[]
}
type Customer = {
  id: number; name: string; email: string; phone: string
  orders_count: number; total_spent: number; registered_at: string
  tag: string
}
type Category = {
  id: number; name: string; slug: string; description?: string
  image_url?: string; sort_order: number; active: boolean
}
type Coupon = {
  id: number; code: string; discount_type: 'percentage'|'fixed'
  discount_value: number; min_purchase: number; active: boolean
  usage_count?: number; max_usage?: number
}
type Banner = {
  id: number; title: string; subtitle?: string; image_url: string
  link?: string; active: boolean; sort_order?: number
}
type Review = {
  id: number; user_name: string; rating: number; comment: string
  product_name: string; created_at: string; approved: boolean
}
type Staff = {
  id: number; name: string; email: string; role: string; active: boolean
}
type DbTable = { columns: string[]; rows: any[]; total: number }

// ─── API Helper ───────────────────────────────────────────────────────────────
const token = () => localStorage.getItem('heelsup_token') || ''
const apiHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
})

async function api<T>(path: string, opts?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(path, { headers: apiHeaders(), ...opts })
    return await res.json()
  } catch (e) {
    return { success: false, error: 'Network error' }
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',    icon: 'ti-dashboard',     group: 'Overview' },
  { id: 'orders',      label: 'Orders',       icon: 'ti-package',       group: 'Store' },
  { id: 'products',    label: 'Products',     icon: 'ti-hanger',        group: 'Store' },
  { id: 'inventory',   label: 'Inventory',    icon: 'ti-boxes',         group: 'Store' },
  { id: 'customers',   label: 'Customers',    icon: 'ti-users',         group: 'Store' },
  { id: 'categories',  label: 'Categories',   icon: 'ti-layout-grid',   group: 'Catalogue' },
  { id: 'coupons',     label: 'Coupons',      icon: 'ti-discount',      group: 'Catalogue' },
  { id: 'banners',     label: 'Banners',      icon: 'ti-photo',         group: 'Catalogue' },
  { id: 'reviews',     label: 'Reviews',      icon: 'ti-star',          group: 'Catalogue' },
  { id: 'pos',         label: 'POS',          icon: 'ti-receipt',       group: 'Operations' },
  { id: 'db_editor',   label: 'Database',     icon: 'ti-database',      group: 'Operations' },
  { id: 'staff',       label: 'Staff',        icon: 'ti-id-badge',      group: 'Settings' },
  { id: 'settings',    label: 'Settings',     icon: 'ti-settings',      group: 'Settings' },
]

// ─── Status Config ────────────────────────────────────────────────────────────
const ORDER_STATUS_COLORS: Record<string, string> = {
  placed:    '#3B82F6',
  confirmed: '#F59E0B',
  shipped:   '#8B5CF6',
  delivered: '#10B981',
  cancelled: '#EF4444',
}
const ORDER_STATUS_BG: Record<string, string> = {
  placed:    'rgba(59,130,246,0.1)',
  confirmed: 'rgba(245,158,11,0.1)',
  shipped:   'rgba(139,92,246,0.1)',
  delivered: 'rgba(16,185,129,0.1)',
  cancelled: 'rgba(239,68,68,0.1)',
}

// ─── Utility: fmt ─────────────────────────────────────────────────────────────
const fmt = {
  inr: (p: number) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
  date: (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
  dateShort: (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  reltime: (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago'
    return Math.floor(diff/86400000) + 'd ago'
  }
}

// ─── DB_TABLES List ───────────────────────────────────────────────────────────
const DB_TABLES = [
  'products','product_images','product_size_stock','categories','collections',
  'collection_products','orders','order_items','users','addresses','payments',
  'coupons','banners','pages','product_reviews','exchanges','exchange_items',
  'offline_sales','settings','staff','staff_roles','wishlists','contact_messages',
  'newsletter','shipping_methods','shipping_pincodes','shipping_couriers',
  'shipping_zones','shipping_rates','tax_rules','blog_posts','notifications',
  'inventory_log','audit_log','login_attempts','rate_limits','analytics_events',
  'otp_tokens','sessions'
]

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [user, setUser] = useState<{name:string;role:string;email:string}|null>(() => {
    try { return JSON.parse(localStorage.getItem('heelsup_user')||'null') }
    catch { return null }
  })
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [sessionToken, setSessionToken] = useState('')

  const [tab, setTab] = useState('dashboard')
  const [sideCollapsed, setSideCollapsed] = useState(false)
  const [mobileSide, setMobileSide] = useState(false)

  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((type: Toast['type'], title: string, msg: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, type, title, msg }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  // ── Data State ──────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [dbTable, setDbTable] = useState('products')
  const [dbData, setDbData] = useState<DbTable>({ columns: [], rows: [], total: 0 })
  const [dbLoading, setDbLoading] = useState(false)
  const [dbSearch, setDbSearch] = useState('')
  const [editRow, setEditRow] = useState<any|null>(null)
  const [addRow, setAddRow] = useState(false)

  // ── Selected / Modal ─────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order|null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer|null>(null)
  const [editProduct, setEditProduct] = useState<Product|null>(null)
  const [showProductForm, setShowProductForm] = useState(false)

  // ── Search / Filter ──────────────────────────────────────────────────────────
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  // ── POS State ────────────────────────────────────────────────────────────────
  const [posItems, setPosItems] = useState<any[]>([{ id: 1, query: '', product: null, size: '', qty: 1, price: 0 }])
  const [posCustomer, setPosCustomer] = useState({ name: '', phone: '', email: '' })
  const [posDiscount, setPosDiscount] = useState(0)
  const [posPayment, setPosPayment] = useState('Cash')
  const [posCash, setPosCash] = useState(0)

  // ── Dashboard Stats ──────────────────────────────────────────────────────────
  const [dashStats, setDashStats] = useState({ revenue: 0, orders: 0, customers: 0, avgOrder: 0 })
  const [chartData, setChartData] = useState<{label:string;rev:number;cnt:number}[]>([])
  const [liveUsers, setLiveUsers] = useState(42)

  // ── Settings ─────────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState({
    storeName: '', storePhone: '', storeEmail: '', storeAddress: '',
    razorpayKeyId: '', razorpaySecret: '', smsEnabled: true
  })

  // ─── Load data on tab change ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    if (tab === 'orders') loadOrders()
    else if (tab === 'products') loadProducts()
    else if (tab === 'customers') loadCustomers()
    else if (tab === 'categories') loadCategories()
    else if (tab === 'coupons') loadCoupons()
    else if (tab === 'banners') loadBanners()
    else if (tab === 'reviews') loadReviews()
    else if (tab === 'staff') loadStaff()
    else if (tab === 'dashboard') loadDashboard()
    else if (tab === 'db_editor') loadDbTable(dbTable)
    else if (tab === 'settings') loadSettings()
    else if (tab === 'pos') loadProducts()
  }, [tab, user])

  useEffect(() => {
    if (user && tab === 'db_editor') loadDbTable(dbTable)
  }, [dbTable])

  useEffect(() => {
    if (!user) return
    const iv = setInterval(() => setLiveUsers(p => Math.max(10, p + (Math.random() > 0.5 ? 1 : -1))), 5000)
    return () => clearInterval(iv)
  }, [user])

  // ─── Loaders ──────────────────────────────────────────────────────────────
  const loadOrders = async () => {
    const r = await api<{orders:Order[]}>('/api/admin/orders?limit=200')
    if (r.success && r.data) setOrders(r.data.orders || (r.data as any))
  }
  const loadProducts = async () => {
    const r = await api<any>('/api/products?limit=200')
    if (r.success && r.data) setProducts(r.data.products || r.data)
  }
  const loadCustomers = async () => {
    const r = await api<any>('/api/admin/customers?limit=200')
    if (r.success && r.data) setCustomers(r.data.customers || r.data)
  }
  const loadCategories = async () => {
    const r = await api<any>('/api/categories')
    if (r.success && r.data) setCategories(r.data.categories || r.data)
  }
  const loadCoupons = async () => {
    const r = await api<any>('/api/admin/coupons')
    if (r.success && r.data) setCoupons(r.data.coupons || r.data)
  }
  const loadBanners = async () => {
    const r = await api<any>('/api/banners')
    if (r.success && r.data) setBanners(r.data.banners || r.data)
  }
  const loadReviews = async () => {
    const r = await api<any>('/api/admin/reviews')
    if (r.success && r.data) setReviews(r.data.reviews || r.data)
  }
  const loadStaff = async () => {
    const r = await api<any>('/api/admin/staff')
    if (r.success && r.data) setStaff(r.data.staff || r.data)
  }
  const loadSettings = async () => {
    const r = await api<any>('/api/admin/settings')
    if (r.success && r.data) setSettings(s => ({ ...s, ...r.data }))
  }
  const loadDashboard = async () => {
    const r = await api<any>('/api/admin/analytics/summary')
    if (r.success && r.data) {
      setDashStats({
        revenue: r.data.total_revenue || 0,
        orders: r.data.total_orders || 0,
        customers: r.data.total_customers || 0,
        avgOrder: r.data.avg_order_value || 0,
      })
      setChartData(r.data.daily_revenue || [])
    }
  }
  const loadDbTable = async (tbl: string) => {
    setDbLoading(true)
    setDbData({ columns: [], rows: [], total: 0 })
    const r = await api<any>('/api/admin/query', {
      method: 'POST',
      body: JSON.stringify({ sql: `SELECT * FROM ${tbl} ORDER BY id DESC LIMIT 500` })
    })
    if (r.success && r.data?.results) {
      const rows = r.data.results
      const cols = rows.length > 0 ? Object.keys(rows[0]) : []
      setDbData({ columns: cols, rows, total: rows.length })
    } else {
      const colR = await api<any>('/api/admin/query', {
        method: 'POST',
        body: JSON.stringify({ sql: `PRAGMA table_info(${tbl})` })
      })
      if (colR.success && colR.data?.results) {
        setDbData({ columns: colR.data.results.map((c:any)=>c.name), rows: [], total: 0 })
      }
    }
    setDbLoading(false)
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    const r = await api<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: loginEmail, password: loginPass })
    })
    setLoginLoading(false)
    if (r.success && r.data) {
      if (r.data.step === 'otp_required') {
        setOtpStep(true); setSessionToken(r.data.session_token)
      } else {
        localStorage.setItem('heelsup_token', r.data.token)
        localStorage.setItem('heelsup_user', JSON.stringify(r.data.user))
        setUser(r.data.user)
        toast('success', 'Welcome back', r.data.user.name)
      }
    } else toast('error', 'Login failed', r.error || 'Invalid credentials')
  }

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    const r = await api<any>('/api/auth/admin-verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otp, session_token: sessionToken })
    })
    setLoginLoading(false)
    if (r.success && r.data) {
      localStorage.setItem('heelsup_token', r.data.token)
      localStorage.setItem('heelsup_user', JSON.stringify(r.data.user))
      setUser(r.data.user); setOtpStep(false)
      toast('success', 'Verified', 'Logged in successfully')
    } else toast('error', 'OTP failed', r.error || 'Invalid code')
  }

  const handleLogout = () => {
    localStorage.removeItem('heelsup_token')
    localStorage.removeItem('heelsup_user')
    setUser(null)
  }

  // ─── DB CRUD ──────────────────────────────────────────────────────────────
  const dbUpdate = async (row: any) => {
    const keys = Object.keys(row).filter(k => k !== 'id')
    const sets = keys.map(k => `${k} = ?`).join(', ')
    const params = [...keys.map(k => row[k]), row.id]
    const r = await api<any>('/api/admin/query', {
      method: 'POST',
      body: JSON.stringify({ sql: `UPDATE ${dbTable} SET ${sets} WHERE id = ?`, params })
    })
    if (r.success) { toast('success', 'Saved', 'Row updated'); setEditRow(null); loadDbTable(dbTable) }
    else toast('error', 'Failed', r.error || 'Update error')
  }
  const dbInsert = async (row: any) => {
    const keys = Object.keys(row).filter(k => k !== 'id' && row[k] !== '')
    const r = await api<any>('/api/admin/query', {
      method: 'POST',
      body: JSON.stringify({
        sql: `INSERT INTO ${dbTable} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,
        params: keys.map(k => row[k])
      })
    })
    if (r.success) { toast('success', 'Created', 'Row inserted'); setAddRow(false); loadDbTable(dbTable) }
    else toast('error', 'Failed', r.error || 'Insert error')
  }
  const dbDelete = async (id: any) => {
    if (!confirm('Delete this row?')) return
    const r = await api<any>('/api/admin/query', {
      method: 'POST',
      body: JSON.stringify({ sql: `DELETE FROM ${dbTable} WHERE id = ?`, params: [id] })
    })
    if (r.success) { toast('success', 'Deleted', `Row #${id} removed`); loadDbTable(dbTable) }
    else toast('error', 'Failed', r.error || 'Delete error')
  }

  // ─── Order Status Update ──────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: number, status: string, extra?: any) => {
    const r = await api<any>(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...extra })
    })
    if (r.success) {
      toast('success', 'Order updated', `Status → ${status}`)
      loadOrders()
      setSelectedOrder(null)
    } else toast('error', 'Update failed', r.error || '')
  }

  // ─── Product Save ─────────────────────────────────────────────────────────
  const saveProduct = async (data: Partial<Product>) => {
    const isEdit = !!data.id
    const r = await api<any>(
      isEdit ? `/api/admin/products/${data.id}` : '/api/admin/products',
      { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(data) }
    )
    if (r.success) {
      toast('success', isEdit ? 'Updated' : 'Created', data.name || '')
      setShowProductForm(false); setEditProduct(null); loadProducts()
    } else toast('error', 'Failed', r.error || '')
  }

  const deleteProduct = async (id: number) => {
    if (!confirm('Delete product?')) return
    const r = await api(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (r.success) { toast('success', 'Deleted', 'Product removed'); loadProducts() }
    else toast('error', 'Failed', r.error || '')
  }

  // ─── Category CRUD ─────────────────────────────────────────────────────────
  const saveCategory = async (data: Partial<Category>) => {
    const isEdit = !!data.id
    const r = await api<any>(
      isEdit ? `/api/admin/categories/${data.id}` : '/api/admin/categories',
      { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(data) }
    )
    if (r.success) { toast('success', 'Saved', ''); loadCategories() }
    else toast('error', 'Failed', r.error || '')
  }

  const saveCoupon = async (data: Partial<Coupon>) => {
    const isEdit = !!data.id
    const r = await api<any>(
      isEdit ? `/api/admin/coupons/${data.id}` : '/api/admin/coupons',
      { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(data) }
    )
    if (r.success) { toast('success', 'Saved', ''); loadCoupons() }
    else toast('error', 'Failed', r.error || '')
  }

  const saveBanner = async (data: Partial<Banner>) => {
    const r = await api<any>('/api/admin/banners', { method: 'POST', body: JSON.stringify(data) })
    if (r.success) { toast('success', 'Saved', ''); loadBanners() }
    else toast('error', 'Failed', r.error || '')
  }

  const saveStaff = async (data: Partial<Staff>) => {
    const r = await api<any>('/api/admin/staff', { method: 'POST', body: JSON.stringify(data) })
    if (r.success) { toast('success', 'Staff added', ''); loadStaff() }
    else toast('error', 'Failed', r.error || '')
  }

  const toggleReview = async (id: number, approved: boolean) => {
    const r = await api(`/api/admin/reviews/${id}`, {
      method: 'PUT', body: JSON.stringify({ approved })
    })
    if (r.success) { loadReviews() }
    else toast('error', 'Failed', r.error || '')
  }

  const deleteReview = async (id: number) => {
    const r = await api(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    if (r.success) { toast('success', 'Deleted', ''); loadReviews() }
  }

  const saveSettings = async () => {
    const r = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
    if (r.success) toast('success', 'Saved', 'Settings updated')
    else toast('error', 'Failed', r.error || '')
  }

  const handleImageUpload = async (file: File): Promise<string|null> => {
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token()}` }, body: fd
      })
      const d = await res.json()
      return d.success ? d.data?.url : null
    } catch { return null }
  }

  // ─── POS ──────────────────────────────────────────────────────────────────
  const posSubtotal = posItems.reduce((a, i) => a + (i.price * i.qty), 0)
  const posTotal = Math.max(0, posSubtotal - posDiscount)

  const handlePosCheckout = async () => {
    const valid = posItems.filter(i => i.product)
    if (!valid.length) { toast('error', 'Empty cart', 'Add products first'); return }
    const r = await api<any>('/api/admin/pos/sale', {
      method: 'POST',
      body: JSON.stringify({
        customer: posCustomer,
        items: valid.map(i => ({ product_id: i.product.id, size: i.size, qty: i.qty, price: i.price * 100 })),
        discount_amount: posDiscount * 100,
        total_amount: posTotal * 100,
        payment_method: posPayment,
        notes: 'In-Store POS Sale'
      })
    })
    if (r.success) {
      toast('success', 'Sale recorded', r.data?.order_number || '')
      setPosItems([{ id: 1, query: '', product: null, size: '', qty: 1, price: 0 }])
      setPosCustomer({ name: '', phone: '', email: '' })
      setPosDiscount(0); setPosCash(0)
    } else toast('error', 'POS failed', r.error || '')
  }

  // ─── Filtered Lists ───────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => orders.filter(o => {
    const q = orderSearch.toLowerCase()
    const matchSearch = !q || o.customer_name?.toLowerCase().includes(q) || o.order_number?.toLowerCase().includes(q) || o.customer_phone?.includes(q)
    const matchStatus = orderStatusFilter === 'all' || o.order_status === orderStatusFilter
    return matchSearch && matchStatus
  }), [orders, orderSearch, orderStatusFilter])

  const filteredProducts = useMemo(() => products.filter(p =>
    !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  ), [products, productSearch])

  const filteredCustomers = useMemo(() => customers.filter(c =>
    !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)
  ), [customers, customerSearch])

  const filteredDbRows = useMemo(() => dbData.rows.filter(r =>
    !dbSearch || Object.values(r).some(v => String(v).toLowerCase().includes(dbSearch.toLowerCase()))
  ), [dbData.rows, dbSearch])

  // ══════════════════════════════════════════════════════════════════════════
  // ── LOGIN SCREEN ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (!user) return (
    <div style={S.loginBg}>
      <style>{GLOBAL_CSS}</style>
      <ToastList toasts={toasts} />
      <div style={S.loginCard}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={S.loginLogo}>HeelsUp</div>
          <div style={S.loginSub}>Admin Console</div>
        </div>
        {!otpStep ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={S.label}>Email</label>
              <input type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
                placeholder="admin@heelsup.in" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Password</label>
              <input type="password" required value={loginPass} onChange={e=>setLoginPass(e.target.value)}
                placeholder="••••••••••" style={S.input} />
            </div>
            <button type="submit" disabled={loginLoading} style={S.btnPrimary}>
              {loginLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>Enter the 6-digit OTP sent to your registered contact.</p>
            <input type="text" maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}
              placeholder="000000" style={{ ...S.input, textAlign: 'center', letterSpacing: '0.3em', fontSize: 20, fontWeight: 600 }} />
            <button type="submit" disabled={loginLoading} style={S.btnPrimary}>
              {loginLoading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => setOtpStep(false)} style={S.btnGhost}>← Back</button>
          </form>
        )}
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  // ── MAIN LAYOUT ───────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const groups = [...new Set(NAV.map(n => n.group))]
  const currentPage = NAV.find(n => n.id === tab)

  return (
    <div style={S.appRoot}>
      <style>{GLOBAL_CSS}</style>
      <ToastList toasts={toasts} />

      {/* ── Sidebar ── */}
      <aside style={{ ...S.sidebar, width: sideCollapsed ? 64 : 220 }} className="admin-sidebar">
        <div style={S.sideTop}>
          <div style={{ ...S.sideLogo, justifyContent: sideCollapsed ? 'center' : 'space-between' }}>
            {!sideCollapsed && <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: '#111' }}>HeelsUp</span>}
            <button onClick={() => setSideCollapsed(p => !p)} style={S.iconBtn} title="Toggle sidebar">
              <i className={`ti ${sideCollapsed ? 'ti-layout-sidebar-right-expand' : 'ti-layout-sidebar-left-collapse'}`} />
            </button>
          </div>
          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {groups.map(grp => (
              <div key={grp}>
                {!sideCollapsed && <div style={S.navGroup}>{grp}</div>}
                {NAV.filter(n => n.group === grp).map(n => (
                  <button key={n.id} onClick={() => { setTab(n.id); setMobileSide(false) }}
                    style={{ ...S.navItem, ...(tab === n.id ? S.navItemActive : {}) }}
                    title={sideCollapsed ? n.label : undefined}
                    className="nav-item">
                    <i className={`ti ${n.icon}`} style={{ fontSize: 17, flexShrink: 0 }} />
                    {!sideCollapsed && <span style={{ fontSize: 13 }}>{n.label}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div style={S.sideBottom}>
          {!sideCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={S.avatar}>{user.name[0]}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize' }}>{user.role}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ ...S.navItem, color: '#EF4444' }} className="nav-item">
            <i className="ti ti-logout" style={{ fontSize: 17 }} />
            {!sideCollapsed && <span style={{ fontSize: 13 }}>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={S.main}>
        {/* Topbar */}
        <header style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setMobileSide(p => !p)} style={{ ...S.iconBtn, display: 'none' }} className="mobile-menu-btn">
              <i className="ti ti-menu-2" />
            </button>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: 0 }}>{currentPage?.label || 'Dashboard'}</h1>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>HeelsUp Admin · Jodhpur Live</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={S.liveChip}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {liveUsers} live
            </div>
            <button style={S.iconBtn} onClick={() => { if(tab==='orders') loadOrders(); else if(tab==='products') loadProducts(); else if(tab==='dashboard') loadDashboard() }} title="Refresh">
              <i className="ti ti-refresh" style={{ fontSize: 17 }} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main style={S.content}>

          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && (
            <DashboardPage stats={dashStats} chartData={chartData} orders={orders} />
          )}

          {/* ═══ ORDERS ═══ */}
          {tab === 'orders' && (
            <div>
              <PageHeader title="Orders" count={filteredOrders.length}>
                <SearchBar value={orderSearch} onChange={setOrderSearch} placeholder="Search orders…" />
                <select value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)} style={S.select}>
                  <option value="all">All Status</option>
                  {['placed','confirmed','shipped','delivered','cancelled'].map(s=>(
                    <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                  ))}
                </select>
              </PageHeader>
              <div style={S.tableCard}>
                <table style={S.table} className="data-table">
                  <thead><tr>
                    <Th>Order</Th><Th>Customer</Th><Th>Amount</Th>
                    <Th>Status</Th><Th>Date</Th><Th>Source</Th><Th align="right">Action</Th>
                  </tr></thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="table-row">
                        <td style={S.td}><span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{o.order_number}</span></td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{o.customer_name}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{o.customer_phone}</div>
                        </td>
                        <td style={S.td}><span style={{ fontWeight: 600, fontSize: 13 }}>{fmt.inr(o.total_amount)}</span></td>
                        <td style={S.td}><StatusBadge status={o.order_status} /></td>
                        <td style={S.td}><span style={{ fontSize: 12, color: '#6B7280' }}>{fmt.date(o.created_at)}</span></td>
                        <td style={S.td}><SourceBadge source={o.source} /></td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <button style={S.btnSm} onClick={async () => {
                            const r = await api<Order>(`/api/admin/orders/${o.id}`)
                            setSelectedOrder(r.success && r.data ? r.data : o)
                          }}>View</button>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && <tr><td colSpan={7} style={S.emptyCell}>No orders found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ PRODUCTS ═══ */}
          {tab === 'products' && (
            <div>
              <PageHeader title="Products" count={filteredProducts.length}>
                <SearchBar value={productSearch} onChange={setProductSearch} placeholder="Search products…" />
                <button style={S.btnPrimary} onClick={() => { setEditProduct(null); setShowProductForm(true) }}>
                  <i className="ti ti-plus" /> Add Product
                </button>
              </PageHeader>
              <div style={S.tableCard}>
                <table style={S.table} className="data-table">
                  <thead><tr>
                    <Th>Product</Th><Th>SKU</Th><Th>Category</Th>
                    <Th>Price</Th><Th align="center">Stock</Th><Th align="right">Actions</Th>
                  </tr></thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="table-row">
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.images?.[0] && <img src={p.images[0]} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid #E5E7EB' }} />}
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.sizes?.join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>{p.sku}</span></td>
                        <td style={S.td}><span style={S.tag}>{p.category}</span></td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{fmt.inr(p.price)}</div>
                          {p.original_price && <div style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'line-through' }}>{fmt.inr(p.original_price)}</div>}
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: p.stock === 0 ? '#EF4444' : p.stock <= 5 ? '#F59E0B' : '#10B981' }}>
                            {p.stock === 0 ? 'Out' : p.stock}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button style={S.btnSm} onClick={() => { setEditProduct(p); setShowProductForm(true) }}>Edit</button>
                            <button style={{ ...S.btnSm, color: '#EF4444', borderColor: '#FECACA' }} onClick={() => deleteProduct(p.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && <tr><td colSpan={6} style={S.emptyCell}>No products found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ INVENTORY ═══ */}
          {tab === 'inventory' && (
            <div>
              <PageHeader title="Inventory" count={products.length} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Out of Stock', count: products.filter(p=>p.stock===0).length, color: '#EF4444' },
                  { label: 'Low Stock (≤5)', count: products.filter(p=>p.stock>0&&p.stock<=5).length, color: '#F59E0B' },
                  { label: 'Healthy', count: products.filter(p=>p.stock>5).length, color: '#10B981' },
                ].map(stat => (
                  <div key={stat.label} style={{ ...S.statCard, borderLeft: `3px solid ${stat.color}` }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, marginTop: 4 }}>{stat.count}</div>
                  </div>
                ))}
              </div>
              <div style={S.tableCard}>
                <table style={S.table} className="data-table">
                  <thead><tr>
                    <Th>Product</Th><Th>SKU</Th><Th align="center">Stock</Th><Th>Status</Th><Th align="right">Adjust</Th>
                  </tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} className="table-row">
                        <td style={S.td}><span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span></td>
                        <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.sku}</span></td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{p.stock}</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ ...S.statusBadge, background: p.stock===0?'rgba(239,68,68,0.1)':p.stock<=5?'rgba(245,158,11,0.1)':'rgba(16,185,129,0.1)', color: p.stock===0?'#EF4444':p.stock<=5?'#F59E0B':'#10B981' }}>
                            {p.stock===0?'Out of stock':p.stock<=5?'Low stock':'In stock'}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button style={S.iconBtn} onClick={async () => {
                              const r = await api(`/api/admin/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ stock: Math.max(0, p.stock-1) }) })
                              if (r.success) loadProducts()
                            }}>−</button>
                            <button style={S.iconBtn} onClick={async () => {
                              const r = await api(`/api/admin/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ stock: p.stock+1 }) })
                              if (r.success) loadProducts()
                            }}>+</button>
                            <button style={S.btnSm} onClick={async () => {
                              const r = await api(`/api/admin/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ stock: p.stock+10 }) })
                              if (r.success) { toast('success', '+10 added', p.sku); loadProducts() }
                            }}>+10</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ CUSTOMERS ═══ */}
          {tab === 'customers' && (
            <div>
              <PageHeader title="Customers" count={filteredCustomers.length}>
                <SearchBar value={customerSearch} onChange={setCustomerSearch} placeholder="Search customers…" />
              </PageHeader>
              <div style={S.tableCard}>
                <table style={S.table} className="data-table">
                  <thead><tr>
                    <Th>Customer</Th><Th>Phone</Th><Th align="center">Orders</Th>
                    <Th>Spent</Th><Th>Tag</Th><Th>Joined</Th><Th align="right">View</Th>
                  </tr></thead>
                  <tbody>
                    {filteredCustomers.map(c => (
                      <tr key={c.id} className="table-row">
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ ...S.avatar, width: 32, height: 32, fontSize: 12 }}>{c.name?.[0]}</div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.phone}</span></td>
                        <td style={{ ...S.td, textAlign: 'center' }}><span style={{ fontWeight: 600 }}>{c.orders_count}</span></td>
                        <td style={S.td}><span style={{ fontWeight: 600, fontSize: 13 }}>{fmt.inr(c.total_spent)}</span></td>
                        <td style={S.td}>
                          <span style={{ ...S.tag, background: c.tag==='VIP'?'rgba(234,179,8,0.15)':undefined, color: c.tag==='VIP'?'#854d0e':undefined }}>{c.tag}</span>
                        </td>
                        <td style={S.td}><span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmt.date(c.registered_at)}</span></td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <button style={S.btnSm} onClick={() => setSelectedCustomer(c)}>Profile</button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && <tr><td colSpan={7} style={S.emptyCell}>No customers found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ CATEGORIES ═══ */}
          {tab === 'categories' && (
            <CategoriesPage categories={categories} onSave={saveCategory}
              onDelete={async (id) => {
                const r = await api(`/api/admin/categories/${id}`, { method: 'DELETE' })
                if (r.success) { toast('success', 'Deleted', ''); loadCategories() }
              }}
              onUpload={handleImageUpload} toast={toast} />
          )}

          {/* ═══ COUPONS ═══ */}
          {tab === 'coupons' && (
            <CouponsPage coupons={coupons} onSave={saveCoupon}
              onDelete={async (id) => {
                const r = await api(`/api/admin/coupons/${id}`, { method: 'DELETE' })
                if (r.success) { toast('success', 'Deleted', ''); loadCoupons() }
              }} toast={toast} />
          )}

          {/* ═══ BANNERS ═══ */}
          {tab === 'banners' && (
            <BannersPage banners={banners} onSave={saveBanner}
              onDelete={async (id) => {
                const r = await api(`/api/admin/banners/${id}`, { method: 'DELETE' })
                if (r.success) { toast('success', 'Deleted', ''); loadBanners() }
              }}
              onUpload={handleImageUpload} toast={toast} />
          )}

          {/* ═══ REVIEWS ═══ */}
          {tab === 'reviews' && (
            <div>
              <PageHeader title="Reviews" count={reviews.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{r.user_name}</span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(s => (
                            <i key={s} className={s <= r.rating ? 'ti ti-star-filled' : 'ti ti-star'} style={{ fontSize: 13, color: s <= r.rating ? '#F59E0B' : '#D1D5DB' }} />
                          ))}
                        </div>
                        <span style={{ ...S.tag, fontSize: 11 }}>{r.product_name}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>"{r.comment}"</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8, marginBottom: 0 }}>{fmt.date(r.created_at)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button style={{ ...S.btnSm, color: r.approved ? '#10B981' : '#9CA3AF', borderColor: r.approved ? '#6EE7B7' : '#E5E7EB' }}
                        onClick={() => toggleReview(r.id, !r.approved)}>
                        {r.approved ? 'Approved' : 'Approve'}
                      </button>
                      <button style={{ ...S.btnSm, color: '#EF4444', borderColor: '#FECACA' }} onClick={() => deleteReview(r.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && <div style={S.emptyState}><i className="ti ti-star" style={{ fontSize: 32, color: '#D1D5DB' }} /><p>No reviews yet</p></div>}
              </div>
            </div>
          )}

          {/* ═══ POS ═══ */}
          {tab === 'pos' && (
            <PosPage products={products} posItems={posItems} setPosItems={setPosItems}
              posCustomer={posCustomer} setPosCustomer={setPosCustomer}
              posDiscount={posDiscount} setPosDiscount={setPosDiscount}
              posPayment={posPayment} setPosPayment={setPosPayment}
              posCash={posCash} setPosCash={setPosCash}
              posSubtotal={posSubtotal} posTotal={posTotal}
              onCheckout={handlePosCheckout} />
          )}

          {/* ═══ DB EDITOR ═══ */}
          {tab === 'db_editor' && (
            <div>
              <PageHeader title="Database Editor">
                <select value={dbTable} onChange={e => setDbTable(e.target.value)} style={{ ...S.select, minWidth: 200 }}>
                  {DB_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <SearchBar value={dbSearch} onChange={setDbSearch} placeholder="Search rows…" />
                <button style={S.btnPrimary} onClick={() => setAddRow(true)}>
                  <i className="ti ti-plus" /> Add Row
                </button>
              </PageHeader>
              <div style={S.tableCard}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table} className="data-table">
                    <thead><tr>
                      {dbData.columns.map(c => <Th key={c}>{c}</Th>)}
                      <Th align="right">Actions</Th>
                    </tr></thead>
                    <tbody>
                      {dbLoading ? (
                        <tr><td colSpan={dbData.columns.length+1} style={S.emptyCell}><LoadingSpinner /></td></tr>
                      ) : filteredDbRows.map((row, i) => (
                        <tr key={row.id||i} className="table-row">
                          {dbData.columns.map(col => (
                            <td key={col} style={{ ...S.td, maxWidth: 200 }}>
                              <span style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(row[col])}>
                                {row[col] === null ? <span style={{ color: '#D1D5DB', fontStyle: 'italic' }}>null</span> : String(row[col])}
                              </span>
                            </td>
                          ))}
                          <td style={{ ...S.td, textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button style={S.btnSm} onClick={() => setEditRow({ ...row })}>Edit</button>
                              <button style={{ ...S.btnSm, color: '#EF4444', borderColor: '#FECACA' }} onClick={() => dbDelete(row.id)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!dbLoading && filteredDbRows.length === 0 && (
                        <tr><td colSpan={dbData.columns.length+1} style={S.emptyCell}>No rows found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                {filteredDbRows.length} rows · Table: <code>{dbTable}</code>
              </div>
            </div>
          )}

          {/* ═══ STAFF ═══ */}
          {tab === 'staff' && (
            <StaffPage staff={staff} onSave={saveStaff}
              onDelete={async (id) => {
                const r = await api(`/api/admin/staff/${id}`, { method: 'DELETE' })
                if (r.success) { toast('success', 'Removed', ''); loadStaff() }
              }}
              currentUserEmail={user.email} toast={toast} />
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab === 'settings' && (
            <div>
              <PageHeader title="Settings" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={S.card}>
                  <h3 style={S.cardTitle}>Store Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'Store Name', key: 'storeName' },
                      { label: 'Phone', key: 'storePhone' },
                      { label: 'Email', key: 'storeEmail' },
                      { label: 'Address', key: 'storeAddress' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={S.label}>{f.label}</label>
                        <input value={(settings as any)[f.key]} onChange={e => setSettings(s => ({...s, [f.key]: e.target.value}))} style={S.input} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={S.card}>
                  <h3 style={S.cardTitle}>Payment Gateway (Razorpay)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={S.label}>Key ID</label>
                      <input value={settings.razorpayKeyId} onChange={e => setSettings(s => ({...s, razorpayKeyId: e.target.value}))} style={S.input} />
                    </div>
                    <div>
                      <label style={S.label}>Secret Key</label>
                      <input type="password" value={settings.razorpaySecret} onChange={e => setSettings(s => ({...s, razorpaySecret: e.target.value}))} style={S.input} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" checked={settings.smsEnabled} onChange={e => setSettings(s => ({...s, smsEnabled: e.target.checked}))} id="sms" />
                      <label htmlFor="sms" style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>Enable SMS notifications</label>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button style={S.btnPrimary} onClick={saveSettings}>Save Settings</button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── ORDER DRAWER ── */}
      {selectedOrder && (
        <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updateOrderStatus} toast={toast} />
      )}

      {/* ── CUSTOMER DRAWER ── */}
      {selectedCustomer && (
        <CustomerDrawer customer={selectedCustomer} orders={orders}
          onClose={() => setSelectedCustomer(null)} />
      )}

      {/* ── PRODUCT FORM MODAL ── */}
      {showProductForm && (
        <ProductFormModal product={editProduct} categories={categories}
          onSave={saveProduct} onClose={() => { setShowProductForm(false); setEditProduct(null) }}
          onUpload={handleImageUpload} toast={toast} />
      )}

      {/* ── DB EDIT MODAL ── */}
      {editRow && (
        <DbRowModal title={`Edit Row #${editRow.id}`} columns={dbData.columns}
          row={editRow} onSave={dbUpdate} onClose={() => setEditRow(null)} />
      )}
      {addRow && (
        <DbRowModal title="Add New Row" columns={dbData.columns}
          row={{}} onSave={dbInsert} onClose={() => setAddRow(false)} isNew />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function DashboardPage({ stats, chartData, orders }: { stats: any; chartData: any[]; orders: Order[] }) {
  const recentOrders = [...orders].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,8)
  const maxRev = Math.max(...chartData.map(d => d.rev || 0), 1)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Revenue', value: fmt.inr(stats.revenue), icon: 'ti-currency-rupee', color: '#C9A96E', bg: 'rgba(201,169,110,0.1)' },
          { label: 'Orders', value: stats.orders, icon: 'ti-package', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Customers', value: stats.customers, icon: 'ti-users', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Avg Order', value: fmt.inr(stats.avgOrder), icon: 'ti-chart-bar', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
        ].map(k => (
          <div key={k.label} style={S.kpiCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111', lineHeight: 1 }}>{k.value}</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: 19, color: k.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Revenue Chart */}
        <div style={S.card}>
          <h3 style={{ ...S.cardTitle, marginBottom: 20 }}>Revenue (Last 7 Days)</h3>
          {chartData.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 140 }}>
              {chartData.slice(-7).map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: '#C9A96E', borderRadius: '4px 4px 0 0', opacity: 0.85, minHeight: 4,
                    height: `${Math.max(4, ((d.rev||0) / maxRev) * 120)}px` }} title={fmt.inr((d.rev||0)*100)} />
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{d.label?.slice(-5) || ''}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB' }}>
              <span style={{ fontSize: 13 }}>No chart data — connect to API</span>
            </div>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div style={S.card}>
          <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Order Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['placed','confirmed','shipped','delivered','cancelled'].map(status => {
              const cnt = orders.filter(o => o.order_status === status).length
              const pct = orders.length ? Math.round(cnt / orders.length * 100) : 0
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, textTransform: 'capitalize', color: '#374151' }}>{status}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ORDER_STATUS_COLORS[status] }}>{cnt}</span>
                  </div>
                  <div style={{ height: 4, background: '#F3F4F6', borderRadius: 99 }}>
                    <div style={{ height: '100%', borderRadius: 99, background: ORDER_STATUS_COLORS[status], width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div style={S.card}>
        <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Recent Orders</h3>
        <table style={S.table} className="data-table">
          <thead><tr>
            <Th>Order</Th><Th>Customer</Th><Th>Amount</Th><Th>Status</Th><Th>Time</Th>
          </tr></thead>
          <tbody>
            {recentOrders.map(o => (
              <tr key={o.id} className="table-row">
                <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{o.order_number}</span></td>
                <td style={S.td}><span style={{ fontSize: 13 }}>{o.customer_name}</span></td>
                <td style={S.td}><span style={{ fontWeight: 600, fontSize: 13 }}>{fmt.inr(o.total_amount)}</span></td>
                <td style={S.td}><StatusBadge status={o.order_status} /></td>
                <td style={S.td}><span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmt.reltime(o.created_at)}</span></td>
              </tr>
            ))}
            {recentOrders.length === 0 && <tr><td colSpan={5} style={S.emptyCell}>No orders yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrderDrawer({ order, onClose, onUpdateStatus, toast }: { order: Order; onClose: ()=>void; onUpdateStatus: (id:number,s:string,e?:any)=>void; toast: any }) {
  const [courier, setCourier] = useState(order.courier_name || '')
  const [tracking, setTracking] = useState(order.tracking_number || '')
  const [trackUrl, setTrackUrl] = useState(order.tracking_url || '')
  const [sms, setSms] = useState(true)
  const [newStatus, setNewStatus] = useState(order.order_status)

  return (
    <Drawer onClose={onClose} title={`Order ${order.order_number}`} width={560}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[
          { l: 'Total', v: fmt.inr(order.total_amount), color: '#111' },
          { l: 'Payment', v: order.payment_status, color: '#10B981' },
          { l: 'Source', v: order.source, color: '#6B7280' },
        ].map(m => (
          <div key={m.l} style={{ flex: 1, padding: '12px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase' }}>{m.l}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: m.color, marginTop: 2 }}>{m.v}</div>
          </div>
        ))}
      </div>

      <Section title="Customer">
        <InfoRow label="Name" value={order.customer_name} />
        <InfoRow label="Phone" value={order.customer_phone} />
        {order.customer_email && <InfoRow label="Email" value={order.customer_email} />}
        {order.address_line1 && <InfoRow label="Address" value={[order.address_line1, order.address_line2, order.city, order.state, order.pincode].filter(Boolean).join(', ')} />}
      </Section>

      <Section title="Items">
        {order.items?.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {item.image && <img src={item.image} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.product_name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Size {item.size} × {item.quantity}</div>
              </div>
            </div>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{fmt.inr(item.price * item.quantity)}</span>
          </div>
        ))}
        <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
            <span>Subtotal</span><span>{fmt.inr(order.subtotal_amount)}</span>
          </div>
          {order.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#EF4444' }}>
            <span>Discount</span><span>−{fmt.inr(order.discount_amount)}</span>
          </div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 4, borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
            <span>Total</span><span>{fmt.inr(order.total_amount)}</span>
          </div>
        </div>
      </Section>

      {order.source !== 'pos' && (
        <Section title="Shipping">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={S.label}>Courier</label>
              <input value={courier} onChange={e=>setCourier(e.target.value)} placeholder="Delhivery" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Tracking #</label>
              <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="DEL123456" style={S.input} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.label}>Tracking URL</label>
              <input value={trackUrl} onChange={e=>setTrackUrl(e.target.value)} placeholder="https://…" style={S.input} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={sms} onChange={e=>setSms(e.target.checked)} id="sms-toggle" />
            <label htmlFor="sms-toggle" style={{ fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>Send SMS to customer</label>
          </div>
        </Section>
      )}

      <Section title="Update Status">
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={newStatus} onChange={e=>setNewStatus(e.target.value as any)} style={{ ...S.select, flex: 1 }}>
            {['placed','confirmed','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <button style={S.btnPrimary} onClick={() => onUpdateStatus(order.id, newStatus, { courier_name: courier, tracking_number: tracking, tracking_url: trackUrl, send_sms: sms })}>
            Update
          </button>
        </div>
      </Section>
    </Drawer>
  )
}

function CustomerDrawer({ customer, orders, onClose }: { customer: Customer; orders: Order[]; onClose: ()=>void }) {
  const custOrders = orders.filter(o => o.customer_phone === customer.phone)
  return (
    <Drawer onClose={onClose} title={customer.name} width={440}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ ...S.avatar, width: 56, height: 56, fontSize: 22, margin: '0 auto 12px' }}>{customer.name?.[0]}</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{customer.name}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{customer.email}</div>
        <span style={{ ...S.tag, display: 'inline-block', marginTop: 8 }}>{customer.tag}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>ORDERS</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{customer.orders_count}</div>
        </div>
        <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>SPENT</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: '#C9A96E' }}>{fmt.inr(customer.total_spent)}</div>
        </div>
      </div>
      <Section title="Recent Orders">
        {custOrders.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF' }}>No orders found</p>}
        {custOrders.slice(0,5).map(o => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{o.order_number}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{fmt.date(o.created_at)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt.inr(o.total_amount)}</div>
              <StatusBadge status={o.order_status} />
            </div>
          </div>
        ))}
      </Section>
    </Drawer>
  )
}

function ProductFormModal({ product, categories, onSave, onClose, onUpload, toast }: any) {
  const [form, setForm] = useState<Partial<Product>>(product || {
    name: '', sku: '', category: 'heels', price: 0, original_price: 0, stock: 10,
    active: true, featured: false, images: [], sizes: ['37','38','39','40']
  })
  const [imgUrl, setImgUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const url = await onUpload(file)
    if (url) { setForm(f => ({ ...f, images: [...(f.images||[]), url] })); toast('success', 'Uploaded', '') }
    else toast('error', 'Upload failed', '')
    setUploading(false)
  }

  const toggleSize = (sz: string) => setForm(f => ({
    ...f, sizes: f.sizes?.includes(sz) ? f.sizes.filter(s=>s!==sz) : [...(f.sizes||[]), sz].sort()
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.sku) { toast('error', 'Required', 'Name and SKU required'); return }
    onSave({ ...form, price: Number(form.price) * 100, original_price: form.original_price ? Number(form.original_price)*100 : null })
  }

  return (
    <Modal title={product ? 'Edit Product' : 'Add Product'} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: '1/3' }}>
            <label style={S.label}>Product Name *</label>
            <input required value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Royal Golden Zari Heels" style={S.input} />
          </div>
          <div>
            <label style={S.label}>SKU *</label>
            <input required value={form.sku||''} onChange={e=>setForm(f=>({...f,sku:e.target.value.toUpperCase()}))} placeholder="HU-HE-001" style={{ ...S.input, fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={S.label}>Sale Price (₹)</label>
            <input type="number" value={form.price ? Number(form.price)/100 : ''} onChange={e=>setForm(f=>({...f,price:Number(e.target.value)}))} placeholder="2499" style={S.input} />
          </div>
          <div>
            <label style={S.label}>MRP / Original (₹)</label>
            <input type="number" value={form.original_price ? Number(form.original_price)/100 : ''} onChange={e=>setForm(f=>({...f,original_price:Number(e.target.value)}))} placeholder="3499" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Stock</label>
            <input type="number" value={form.stock||0} onChange={e=>setForm(f=>({...f,stock:Number(e.target.value)}))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select value={form.category||'heels'} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={S.select}>
              {categories.map((c:Category) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Sizes</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {['35','36','37','38','39','40','41','42'].map(sz => (
              <button key={sz} type="button" onClick={() => toggleSize(sz)} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${form.sizes?.includes(sz) ? '#111' : '#E5E7EB'}`,
                background: form.sizes?.includes(sz) ? '#111' : 'white',
                color: form.sizes?.includes(sz) ? 'white' : '#374151'
              }}>
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Images</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="Paste image URL…" style={{ ...S.input, flex: 1 }} />
            <button type="button" style={S.btnSm} onClick={() => { if(imgUrl) { setForm(f=>({...f,images:[...(f.images||[]),imgUrl]})); setImgUrl('') }}}>Add</button>
            <label style={{ ...S.btnSm, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-upload" /> {uploading ? '…' : 'Upload'}
              <input type="file" accept="image/*" className="visually-hidden" onChange={handleImageFile} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {form.images?.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={img} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                <button type="button" onClick={() => setForm(f=>({...f,images:f.images?.filter((_,j)=>j!==i)}))}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
          <button type="button" style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button type="submit" style={S.btnPrimary}>{product ? 'Save Changes' : 'Create Product'}</button>
        </div>
      </form>
    </Modal>
  )
}

function CategoriesPage({ categories, onSave, onDelete, onUpload, toast }: any) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', image_url: '' })
  return (
    <div>
      <PageHeader title="Categories" count={categories.length} />
      <div style={{ ...S.card, marginBottom: 24 }}>
        <h3 style={S.cardTitle}>Add Category</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Name</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value, slug:e.target.value.toLowerCase().replace(/\s+/g,'-')}))} style={S.input} placeholder="Heels & Stilettos" />
          </div>
          <div>
            <label style={S.label}>Slug</label>
            <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} style={{ ...S.input, fontFamily: 'monospace' }} placeholder="heels" />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Image URL</label>
            <input value={form.image_url} onChange={e=>setForm(f=>({...f,image_url:e.target.value}))} style={S.input} />
          </div>
        </div>
        <button style={S.btnPrimary} onClick={() => { if(form.name) { onSave(form); setForm({ name:'',slug:'',description:'',image_url:'' }) } else toast('error','Required','Name is required') }}>
          Add Category
        </button>
      </div>
      <div style={S.tableCard}>
        <table style={S.table} className="data-table">
          <thead><tr><Th>Image</Th><Th>Name</Th><Th>Slug</Th><Th>Description</Th><Th align="right">Delete</Th></tr></thead>
          <tbody>
            {categories.map((c: Category) => (
              <tr key={c.id} className="table-row">
                <td style={S.td}>{c.image_url && <img src={c.image_url} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E7EB' }} />}</td>
                <td style={S.td}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
                <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>/{c.slug}</span></td>
                <td style={S.td}><span style={{ fontSize: 12, color: '#9CA3AF' }}>{c.description}</span></td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <button style={{ ...S.btnSm, color: '#EF4444', borderColor: '#FECACA' }} onClick={() => onDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CouponsPage({ coupons, onSave, onDelete, toast }: any) {
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: 10, min_purchase: 0 })
  return (
    <div>
      <PageHeader title="Coupons" count={coupons.length} />
      <div style={{ ...S.card, marginBottom: 24 }}>
        <h3 style={S.cardTitle}>Create Coupon</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Code</label>
            <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} style={{ ...S.input, fontFamily: 'monospace', fontWeight: 700 }} placeholder="FIRST10" />
          </div>
          <div>
            <label style={S.label}>Type</label>
            <select value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value}))} style={S.select}>
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed ₹</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Value ({form.discount_type === 'percentage' ? '%' : '₹'})</label>
            <input type="number" value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:Number(e.target.value)}))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Min Purchase (₹)</label>
            <input type="number" value={form.min_purchase} onChange={e=>setForm(f=>({...f,min_purchase:Number(e.target.value)}))} style={S.input} />
          </div>
        </div>
        <button style={S.btnPrimary} onClick={() => { if(form.code) { onSave({ ...form, min_purchase: form.min_purchase*100, discount_value: form.discount_type==='fixed' ? form.discount_value*100 : form.discount_value }); setForm({ code:'',discount_type:'percentage',discount_value:10,min_purchase:0 }) } else toast('error','Required','Code required') }}>
          Create Coupon
        </button>
      </div>
      <div style={S.tableCard}>
        <table style={S.table} className="data-table">
          <thead><tr><Th>Code</Th><Th>Discount</Th><Th>Min Purchase</Th><Th>Status</Th><Th align="right">Delete</Th></tr></thead>
          <tbody>
            {coupons.map((c: Coupon) => (
              <tr key={c.id} className="table-row">
                <td style={S.td}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#111' }}>{c.code}</span></td>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{c.discount_type==='percentage' ? `${c.discount_value}%` : fmt.inr(c.discount_value)} off</span></td>
                <td style={S.td}>{c.min_purchase > 0 ? `Min ${fmt.inr(c.min_purchase)}` : 'No minimum'}</td>
                <td style={S.td}><span style={{ ...S.statusBadge, background: c.active?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color: c.active?'#10B981':'#EF4444' }}>{c.active?'Active':'Inactive'}</span></td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <button style={{ ...S.btnSm, color: '#EF4444', borderColor: '#FECACA' }} onClick={() => onDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BannersPage({ banners, onSave, onDelete, onUpload, toast }: any) {
  const [form, setForm] = useState({ title: '', subtitle: '', image_url: '', link: '' })
  const [uploading, setUploading] = useState(false)
  return (
    <div>
      <PageHeader title="Banners" count={banners.length} />
      <div style={{ ...S.card, marginBottom: 24 }}>
        <h3 style={S.cardTitle}>Add Banner</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Title</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Subtitle</label>
            <input value={form.subtitle} onChange={e=>setForm(f=>({...f,subtitle:e.target.value}))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Image URL or Upload</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.image_url} onChange={e=>setForm(f=>({...f,image_url:e.target.value}))} style={{ ...S.input, flex: 1 }} />
              <label style={{ ...S.btnSm, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {uploading ? '…' : 'Upload'}
                <input type="file" accept="image/*" className="visually-hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return
                  setUploading(true)
                  const url = await onUpload(file)
                  if (url) setForm(f=>({...f,image_url:url}))
                  setUploading(false)
                }} />
              </label>
            </div>
          </div>
          <div>
            <label style={S.label}>Link URL</label>
            <input value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} style={S.input} placeholder="/shop?category=heels" />
          </div>
        </div>
        <button style={S.btnPrimary} onClick={() => { if(form.title&&form.image_url) { onSave(form); setForm({title:'',subtitle:'',image_url:'',link:''}) } else toast('error','Required','Title and image required') }}>
          Add Banner
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {banners.map((b: Banner) => (
          <div key={b.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', position: 'relative' }}>
            <img src={b.image_url} alt={b.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ color: '#C9A96E', fontWeight: 700, fontSize: 14 }}>{b.title}</div>
              {b.subtitle && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>{b.subtitle}</div>}
            </div>
            <button onClick={() => onDelete(b.id)} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StaffPage({ staff, onSave, onDelete, currentUserEmail, toast }: any) {
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' })
  return (
    <div>
      <PageHeader title="Staff" count={staff.length} />
      <div style={{ ...S.card, marginBottom: 24 }}>
        <h3 style={S.cardTitle}>Add Staff Member</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Full Name</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={{ ...S.input, fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={S.label}>Role</label>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={S.select}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button style={S.btnPrimary} onClick={() => { if(form.name&&form.email) { onSave(form); setForm({name:'',email:'',role:'staff'}) } else toast('error','Required','Name and email required') }}>
          Add Staff
        </button>
      </div>
      <div style={S.tableCard}>
        <table style={S.table} className="data-table">
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th align="right">Remove</Th></tr></thead>
          <tbody>
            {staff.map((m: Staff) => (
              <tr key={m.id} className="table-row">
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...S.avatar, width: 30, height: 30, fontSize: 12 }}>{m.name?.[0]}</div>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</span>
                  </div>
                </td>
                <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.email}</span></td>
                <td style={S.td}>
                  <span style={{ ...S.tag, background: m.role==='admin'?'rgba(201,169,110,0.15)':undefined, color: m.role==='admin'?'#92400e':undefined }}>
                    {m.role}
                  </span>
                </td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  {m.email !== currentUserEmail ? (
                    <button style={{ ...S.btnSm, color: '#EF4444', borderColor: '#FECACA' }} onClick={() => onDelete(m.id)}>Remove</button>
                  ) : <span style={{ fontSize: 11, color: '#9CA3AF' }}>You</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PosPage({ products, posItems, setPosItems, posCustomer, setPosCustomer, posDiscount, setPosDiscount, posPayment, setPosPayment, posCash, setPosCash, posSubtotal, posTotal, onCheckout }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Point of Sale</h2>
        <div style={S.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                {['Product', 'Size', 'Price (₹)', 'Qty', 'Total', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posItems.map((item: any, idx: number) => {
                const matches = item.query && !item.product ? products.filter((p:Product) => p.name?.toLowerCase().includes(item.query.toLowerCase()) || p.sku?.toLowerCase().includes(item.query.toLowerCase())).slice(0,5) : []
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 10px', position: 'relative' }}>
                      <input value={item.query} placeholder="Type product name…"
                        onChange={e => { const n=[...posItems]; n[idx]={...n[idx],query:e.target.value,product:null}; setPosItems(n) }}
                        style={{ ...S.input, fontSize: 12 }} />
                      {matches.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 10, right: 10, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                          {matches.map((p:Product) => (
                            <button key={p.id} type="button" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}
                              onMouseEnter={e=>(e.currentTarget.style.background='#F9FAFB')}
                              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                              onClick={() => { const n=[...posItems]; n[idx]={...n[idx],product:p,query:p.name,price:p.price/100,size:p.sizes?.[1]||'38'}; setPosItems(n) }}>
                              <div>
                                <div style={{ fontWeight: 500 }}>{p.name}</div>
                                <div style={{ color: '#9CA3AF' }}>{p.sku} · {p.stock} left</div>
                              </div>
                              <div style={{ fontWeight: 700, color: '#C9A96E' }}>{fmt.inr(p.price)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <select value={item.size} disabled={!item.product} onChange={e=>{const n=[...posItems];n[idx]={...n[idx],size:e.target.value};setPosItems(n)}} style={{ ...S.select, fontSize: 12, minWidth: 70 }}>
                        {(item.product?.sizes||['36','37','38','39','40']).map((s:string)=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" value={item.price||''} disabled={!item.product}
                        onChange={e=>{const n=[...posItems];n[idx]={...n[idx],price:Number(e.target.value)};setPosItems(n)}}
                        style={{ ...S.input, fontSize: 12, width: 80, textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" min={1} value={item.qty} disabled={!item.product}
                        onChange={e=>{const n=[...posItems];n[idx]={...n[idx],qty:Math.max(1,Number(e.target.value))};setPosItems(n)}}
                        style={{ ...S.input, fontSize: 12, width: 60, textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 13 }}>₹{(item.price*item.qty).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <button onClick={() => setPosItems(posItems.filter((_:any,i:number)=>i!==idx)||[{id:1,query:'',product:null,size:'',qty:1,price:0}])}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button style={{ ...S.btnGhost, marginTop: 12, fontSize: 12 }}
            onClick={() => setPosItems([...posItems, { id: Date.now(), query:'',product:null,size:'38',qty:1,price:0 }])}>
            <i className="ti ti-plus" /> Add Item
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={S.card}>
          <h3 style={S.cardTitle}>Customer</h3>
          {[{label:'Name',key:'name',type:'text'},{label:'Phone',key:'phone',type:'tel'},{label:'Email',key:'email',type:'email'}].map(f=>(
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={S.label}>{f.label}</label>
              <input type={f.type} value={(posCustomer as any)[f.key]} onChange={e=>setPosCustomer((c:any)=>({...c,[f.key]:e.target.value}))} style={S.input} />
            </div>
          ))}
        </div>

        <div style={S.card}>
          <h3 style={S.cardTitle}>Payment</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['Cash','UPI','Card'].map(m => (
              <button key={m} type="button" onClick={() => setPosPayment(m)} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${posPayment===m?'#111':'#E5E7EB'}`, background: posPayment===m?'#111':'white', color: posPayment===m?'white':'#374151' }}>
                {m}
              </button>
            ))}
          </div>
          {posPayment === 'Cash' && (
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Cash Received (₹)</label>
              <input type="number" value={posCash||''} onChange={e=>setPosCash(Number(e.target.value))} style={S.input} />
              {posCash > posTotal && <div style={{ fontSize: 12, color: '#10B981', marginTop: 4, fontWeight: 600 }}>Change: ₹{(posCash-posTotal).toLocaleString('en-IN')}</div>}
            </div>
          )}
          <div>
            <label style={S.label}>Discount (₹)</label>
            <input type="number" value={posDiscount||''} onChange={e=>setPosDiscount(Number(e.target.value))} style={S.input} />
          </div>
          <div style={{ marginTop: 16, borderTop: '1px solid #E5E7EB', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280' }}>
              <span>Subtotal</span><span>₹{posSubtotal.toLocaleString('en-IN')}</span>
            </div>
            {posDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#EF4444' }}>
              <span>Discount</span><span>−₹{posDiscount.toLocaleString('en-IN')}</span>
            </div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              <span>Total</span><span style={{ color: '#C9A96E' }}>₹{posTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button style={{ ...S.btnPrimary, width: '100%', marginTop: 14, padding: '13px', fontSize: 14 }} onClick={onCheckout}>
            <i className="ti ti-receipt" /> Complete Sale
          </button>
        </div>
      </div>
    </div>
  )
}

function DbRowModal({ title, columns, row, onSave, onClose, isNew }: { title:string; columns:string[]; row:any; onSave:(r:any)=>void; onClose:()=>void; isNew?:boolean }) {
  const [form, setForm] = useState<any>({ ...row })
  return (
    <Modal title={title} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {columns.map(col => (
          <div key={col}>
            <label style={S.label}>{col}{col==='id'?<span style={{color:'#9CA3AF'}}> (auto)</span>:null}</label>
            <input
              value={form[col] === null || form[col] === undefined ? '' : form[col]}
              disabled={col === 'id' && !isNew}
              onChange={e => setForm((f: any) => ({ ...f, [col]: e.target.value }))}
              style={{ ...S.input, fontFamily: col.includes('id')||col==='id'||col.includes('_at') ? 'monospace' : undefined, fontSize: 12 }}
              placeholder={col === 'id' && isNew ? 'Auto-generated' : `Enter ${col}…`}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #E5E7EB', marginTop: 16 }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btnPrimary} onClick={() => onSave(form)}>Save</button>
      </div>
    </Modal>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Drawer({ children, onClose, title, width = 480 }: { children: React.ReactNode; onClose: ()=>void; title: string; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', width, maxWidth: '95vw', background: 'white', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#FAFAFA' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ ...S.iconBtn, fontSize: 20 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: ()=>void; title: string; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', background: 'white', borderRadius: 16, width: '100%', maxWidth: wide ? 720 : 480, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA', flexShrink: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ ...S.iconBtn, fontSize: 20 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #F9FAFB' }}>
      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#111', maxWidth: '65%', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ ...S.statusBadge, background: ORDER_STATUS_BG[status] || 'rgba(0,0,0,0.05)', color: ORDER_STATUS_COLORS[status] || '#374151' }}>
      {status}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string,string> = { web:'#3B82F6', pos:'#8B5CF6', whatsapp:'#10B981', instagram:'#EC4899' }
  return <span style={{ ...S.tag, color: colors[source] || '#6B7280', borderColor: colors[source]+'33' || '#E5E7EB' }}>{source}</span>
}

function PageHeader({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>{title}</h2>
        {count !== undefined && <span style={{ fontSize: 13, color: '#9CA3AF' }}>{count.toLocaleString()}</span>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>}
    </div>
  )
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v:string)=>void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9CA3AF' }} />
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'Search…'}
        style={{ ...S.input, paddingLeft: 34, minWidth: 220, fontSize: 13 }} />
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: string }) {
  return <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#6B7280', textAlign: (align||'left') as any, background: '#F9FAFB', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{children}</th>
}

function LoadingSpinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div style={{ width: 24, height: 24, border: '2px solid #E5E7EB', borderTopColor: '#C9A96E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
}

function ToastList({ toasts }: { toasts: Toast[] }) {
  const colors: Record<string,string> = { success: '#10B981', error: '#EF4444', info: '#3B82F6', warning: '#F59E0B' }
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderLeft: `3px solid ${colors[t.type]}`, borderRadius: 10, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 280, maxWidth: 360, animation: 'slideIn 0.2s ease' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#111', marginBottom: 2 }}>{t.title}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{t.msg}</div>
        </div>
      ))}
    </div>
  )
}