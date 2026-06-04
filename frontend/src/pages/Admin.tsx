import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, ListChecks,
  ShieldAlert, LogOut, Plus, Edit3, Settings, Tag, Star, Users, FileText, Image,
  UploadCloud, AlertTriangle, CheckCircle2, X, Search, Command, Bell, RefreshCw,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Filter, Download,
  ChevronDown, ChevronUp, Eye, Printer, Zap, BarChart2, Activity, Globe,
  CreditCard, Truck, Box, Calendar, Clock, Hash, Percent, ChevronRight,
  MoreHorizontal, Check, Minus, ExternalLink, Lightbulb, Brain, Sparkles
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap
} from 'recharts'
import '../admin.css'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Product {
  id: number; name: string; sku: string; category: string;
  price: number; original_price: number | null; stock: number;
  active: boolean; featured: boolean; images?: string[]; sizes?: string[];
}
interface Order {
  id: number; order_number: string; customer_name: string;
  customer_phone: string; total_amount: number; order_status: string;
  payment_status: string; created_at: string; tracking_number?: string;
  tracking_url?: string; courier_name?: string;
}
interface KpiCard {
  label: string; value: string; sub: string; trend: number;
  icon: React.ReactNode; color: string; sparkData?: number[];
}

// ─── Color Palette ────────────────────────────────────────────────────────────
const CHART_COLORS = {
  gold: '#C9A96E', dark: '#111827', blue: '#3B82F6', emerald: '#10B981',
  violet: '#8B5CF6', rose: '#F43F5E', amber: '#F59E0B', teal: '#14B8A6',
  indigo: '#6366F1', orange: '#F97316',
}
const PIE_PALETTE = [CHART_COLORS.gold, CHART_COLORS.dark, '#6B7280', CHART_COLORS.emerald, CHART_COLORS.blue]

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomChartTooltip = ({ active, payload, label, prefix = '₹' }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(201,169,110,0.3)', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      <p style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill, flexShrink: 0 }} />
          <span style={{ color: '#F9FAFB', fontSize: 12, fontWeight: 700 }}>
            {prefix}{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
          </span>
          <span style={{ color: '#6B7280', fontSize: 10 }}>{p.name}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Sparkline mini chart ─────────────────────────────────────────────────────
const SparkLine = ({ data, color }: { data: number[]; color: string }) => (
  <ResponsiveContainer width="100%" height={40}>
    <AreaChart data={data.map((v, i) => ({ v, i }))}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#spark-${color.replace('#', '')})`} dot={false} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>
)

// ─── Command Palette ──────────────────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean; onClose: () => void;
  onNavigate: (tab: string) => void; tabs: { id: string; label: string }[];
}
const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate, tabs }) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = tabs.filter(t =>
    !query.trim() || t.label.toLowerCase().includes(query.toLowerCase())
  )

  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', paddingTop: '15vh', background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)'
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden',
        border: '1px solid rgba(201,169,110,0.2)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <Search style={{ width: 16, height: 16, color: '#9CA3AF', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tabs, actions..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#111827', background: 'transparent' }}
          />
          <kbd style={{ fontSize: 10, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 6px', color: '#6B7280', fontFamily: 'monospace' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No results found</div>
          ) : (
            filtered.map((tab, i) => (
              <button key={tab.id} onClick={() => { onNavigate(tab.id); onClose() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                  textAlign: 'left', color: '#111827', fontSize: 13, fontWeight: 500,
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#6B7280' }}>
                  {tab.label[0]}
                </span>
                <span>{tab.label}</span>
                <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB', marginLeft: 'auto' }} />
              </button>
            ))
          )}
        </div>
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 20px', display: 'flex', gap: 16 }}>
          {[['↵', 'to select'], ['↑↓', 'to navigate'], ['ESC', 'to close']].map(([key, desc]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9CA3AF' }}>
              <kbd style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: 9 }}>{key}</kbd>
              {desc}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Notification Panel ───────────────────────────────────────────────────────
interface NotifPanelProps { open: boolean; onClose: () => void; orders: Order[]; products: Product[] }
const NotifPanel: React.FC<NotifPanelProps> = ({ open, onClose, orders, products }) => {
  if (!open) return null
  const lowStock = products.filter(p => p.stock <= 3)
  const pendingOrders = orders.filter(o => o.order_status === 'placed' || o.order_status === 'confirmed')
  const items = [
    ...pendingOrders.slice(0, 3).map(o => ({
      icon: '🛍️', title: `New Order ${o.order_number}`, sub: `₹${(o.total_amount / 100).toLocaleString()} · ${o.customer_name}`,
      color: '#3B82F6', time: new Date(o.created_at).toLocaleDateString()
    })),
    ...lowStock.slice(0, 3).map(p => ({
      icon: '📦', title: `Low Stock: ${p.name}`, sub: `Only ${p.stock} units left · SKU: ${p.sku}`,
      color: '#F59E0B', time: 'Inventory'
    })),
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000 }} onClick={onClose}>
      <div style={{
        position: 'absolute', right: 16, top: 64, width: 360, background: '#fff',
        borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
        border: '1px solid #f3f4f6', overflow: 'hidden', maxHeight: '70vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Notifications</span>
          <span style={{ background: '#EF4444', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{items.length}</span>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>All caught up! 🎉</div>
        ) : (
          items.map((item, i) => (
            <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{item.sub}</div>
              </div>
              <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{item.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main Admin Component ──────────────────────────────────────────────────────
export default function Admin() {
  const { user, token, logout, login } = useAuthStore()
  const { showToast } = useToastStore()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'pos' | 'products' | 'orders' | 'inventory' |
    'settings' | 'categories' | 'coupons' | 'banners' | 'reviews' |
    'pages' | 'staff' | 'reports' | 'insights'
  >('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [, setLoadingData] = useState(false)
  const [stats, setStats] = useState<any>(null)

  // UI states
  const [cmdOpen, setCmdOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [sidebarQuery, setSidebarQuery] = useState('')
  const [liveTraffic, setLiveTraffic] = useState(24)

  // Filters
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')

  // Settings
  const [storeSettings, setStoreSettings] = useState<any>({
    store_name: '', store_email: '', support_phone: '',
    store_address: '', razorpay_key_id: '', razorpay_key_secret: '',
    google_client_id: '', social_instagram: '',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [testingRzp, setTestingRzp] = useState(false)

  // Extended modules
  const [categoriesList, setCategoriesList] = useState<any[]>([])
  const [couponsList, setCouponsList] = useState<any[]>([])
  const [bannersList, setBannersList] = useState<any[]>([])
  const [reviewsList, setReviewsList] = useState<any[]>([])
  const [pagesList, setPagesList] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any | null>(null)

  // Category form
  const [catFormName, setCatFormName] = useState('')
  const [catFormSlug, setCatFormSlug] = useState('')
  const [catFormDesc, setCatFormDesc] = useState('')
  const [catFormImg, setCatFormImg] = useState('')
  const [catFormSort, setCatFormSort] = useState(0)

  // Coupon form
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscType, setCouponDiscType] = useState<'percentage' | 'fixed'>('percentage')
  const [couponDiscValue, setCouponDiscValue] = useState(0)
  const [couponMinPurchase, setCouponMinPurchase] = useState(0)

  // Banner form
  const [bannerTitle, setBannerTitle] = useState('')
  const [bannerSubtitle, setBannerSubtitle] = useState('')
  const [bannerImg, setBannerImg] = useState('')
  const [bannerLink, setBannerLink] = useState('')

  // Pages form
  const [pageTitle, setPageTitle] = useState('')
  const [pageContent, setPageContent] = useState('')

  // Staff form
  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffRole, setStaffRole] = useState<'admin' | 'manager' | 'staff'>('staff')

  // POS states
  const [posRows, setPosRows] = useState<any[]>([
    { id: Math.random().toString(), searchQuery: '', selectedProduct: null, selectedSize: '38', qty: 1, price: 0 }
  ])
  const [posCustomerName, setPosCustomerName] = useState('')
  const [posCustomerPhone, setPosCustomerPhone] = useState('')
  const [posDiscount, setPosDiscount] = useState(0)
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'Card' | 'UPI'>('Cash')
  const [posPaymentRef, setPosPaymentRef] = useState('')
  const [posNotes, setPosNotes] = useState('In-Store POS Bill')

  // Reports
  const [reportsData, setReportsData] = useState<any>(null)
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'customers' | 'orders'>('sales')
  const [reportFrom, setReportFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0, 10))
  const [loadingReport, setLoadingReport] = useState(false)

  // Product form
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [productFormName, setProductFormName] = useState('')
  const [productFormSKU, setProductFormSKU] = useState('')
  const [productFormPrice, setProductFormPrice] = useState(0)
  const [productFormMrp, setProductFormMrp] = useState(0)
  const [productFormStock, setProductFormStock] = useState(5)
  const [productFormCategory, setProductFormCategory] = useState('heels')
  const [productFormImages, setProductFormImages] = useState<string[]>([])
  const [productFormSizes, setProductFormSizes] = useState<string[]>(['36', '37', '38', '39', '40', '41'])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Bulk upload
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkInput, setBulkInput] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [parsedProducts, setParsedProducts] = useState<any[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])

  // Order detail
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null)
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false)
  const [orderTrackingNum, setOrderTrackingNum] = useState('')
  const [orderTrackingUrl, setOrderTrackingUrl] = useState('')
  const [orderCourierName, setOrderCourierName] = useState('')
  const [sendSmsNotification, setSendSmsNotification] = useState(true)

  // Chart
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'aov'>('revenue')

  // AI Insights
  const [aiInsights, setAiInsights] = useState<string>('')
  const [loadingInsights, setLoadingInsights] = useState(false)

  // Live sessions
  const [liveSessions, setLiveSessions] = useState<
    { id: string; location: string; action: string; time: string; status: 'active' | 'success' | 'warning' }[]
  >([
    { id: '1', location: 'Mumbai, MH', action: 'Viewing Bridal Heels collection', time: 'Just now', status: 'active' },
    { id: '2', location: 'Jaipur, RJ', action: 'Added "Royal Golden Zari" size 7 to cart', time: '1m ago', status: 'active' },
    { id: '3', location: 'Delhi, DL', action: 'Completed Checkout (₹1,899)', time: '3m ago', status: 'success' },
    { id: '4', location: 'Jodhpur, RJ', action: 'Applied coupon FIRST10', time: '5m ago', status: 'active' },
  ])

  // ── Keyboard shortcut: Cmd/Ctrl+K ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setCmdOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Live traffic simulation ────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !(user?.role === 'admin' || user?.role === 'staff')) return
    const locations = [
      'Mumbai, MH', 'Jaipur, RJ', 'Delhi, DL', 'Jodhpur, RJ', 'Bangalore, KA',
      'Pune, MH', 'Ahmedabad, GJ', 'Chennai, TN', 'Kolkata, WB', 'Hyderabad, TS',
      'Udaipur, RJ', 'Kota, RJ', 'Ajmer, RJ', 'Gurugram, HR', 'Noida, UP'
    ]
    const actions = [
      'Viewing Bridal Heels collection', 'Added "Royal Golden Zari" size 7 to cart',
      'Added "Classic Black Stiletto" size 6 to cart', 'Completed Checkout (₹1,899)',
      'Completed Checkout (₹2,499)', 'Applied coupon WELCOME15', 'Initiated checkout for Silver Slides',
      'Viewing Flat sandals category', 'Reading Returns & Refund policy', 'Searching for "red bridal shoes"',
    ]
    const interval = setInterval(() => {
      setLiveTraffic(prev => {
        const delta = Math.floor(Math.random() * 5) - 2
        const next = prev + delta; return next > 5 ? (next < 60 ? next : 45) : 10
      })
      const randomLoc = locations[Math.floor(Math.random() * locations.length)]
      const randomAct = actions[Math.floor(Math.random() * actions.length)]
      const status: 'active' | 'success' | 'warning' =
        randomAct.includes('Checkout') ? 'success' : randomAct.includes('coupon') ? 'warning' : 'active'
      const newSession = { id: Math.random().toString(36).substring(2, 9), location: randomLoc, action: randomAct, time: 'Just now', status }
      setLiveSessions(prev => {
        const updated = prev.map(s => {
          if (s.time === 'Just now') return { ...s, time: '1m ago' }
          if (s.time.endsWith('m ago')) {
            const mins = parseInt(s.time); if (mins >= 12) return null
            return { ...s, time: `${mins + 1}m ago` }
          }
          return s
        }).filter(Boolean) as any[]
        return [newSession, ...updated].slice(0, 5)
      })
    }, 4500)
    return () => clearInterval(interval)
  }, [token, user])

  // ── Tab definitions ────────────────────────────────────────────────────────
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, section: 'Main' },
    { id: 'insights', label: 'AI Insights', icon: <Brain size={15} />, section: 'Main', badge: 'NEW' },
    { id: 'reports', label: 'Reports', icon: <BarChart2 size={15} />, section: 'Main' },
    { id: 'products', label: 'Products', icon: <Package size={15} />, section: 'Catalogue' },
    { id: 'categories', label: 'Categories', icon: <Tag size={15} />, section: 'Catalogue' },
    { id: 'inventory', label: 'Inventory', icon: <Box size={15} />, section: 'Catalogue' },
    { id: 'pos', label: 'POS Terminal', icon: <ShoppingCart size={15} />, section: 'Sales' },
    { id: 'orders', label: 'Orders', icon: <ListChecks size={15} />, section: 'Sales' },
    { id: 'coupons', label: 'Coupons', icon: <Percent size={15} />, section: 'Sales' },
    { id: 'reviews', label: 'Reviews', icon: <Star size={15} />, section: 'Sales' },
    { id: 'banners', label: 'Banners', icon: <Image size={15} />, section: 'Content' },
    { id: 'pages', label: 'Pages', icon: <FileText size={15} />, section: 'Content' },
    { id: 'staff', label: 'Staff', icon: <Users size={15} />, section: 'System' },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} />, section: 'System' },
  ]

  const getAllowedTabs = useCallback(() => {
    const role = user?.role || 'staff'
    let allowed = allTabs
    if (role === 'manager') {
      allowed = allTabs.filter(t => ['dashboard', 'insights', 'pos', 'products', 'categories', 'orders', 'inventory', 'coupons', 'reviews', 'reports'].includes(t.id))
    } else if (role !== 'admin') {
      allowed = allTabs.filter(t => ['pos', 'orders', 'inventory', 'reviews'].includes(t.id))
    }
    if (sidebarQuery.trim()) {
      const q = sidebarQuery.toLowerCase()
      allowed = allowed.filter(t => t.label.toLowerCase().includes(q))
    }
    return allowed
  }, [user, sidebarQuery])

  const tabsBySection = useCallback(() => {
    const tabs = getAllowedTabs()
    const sections: Record<string, typeof tabs> = {}
    tabs.forEach(t => { if (!sections[t.section]) sections[t.section] = []; sections[t.section].push(t) })
    return sections
  }, [getAllowedTabs])

  useEffect(() => {
    if (token) {
      const allowed = getAllowedTabs()
      if (allowed.length > 0 && !allowed.find(t => t.id === activeTab)) {
        setActiveTab(allowed[0].id as any)
      }
    }
  }, [user, token])

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadTabDetails = useCallback(async () => {
    if (!token) return
    setLoadingData(true)
    try {
      if (['dashboard', 'products', 'pos', 'inventory', 'insights'].includes(activeTab)) {
        const r = await fetch('/api/products?limit=200')
        const d = await r.json(); if (d.success) setProducts(d.data)
      }
      if (['dashboard', 'orders', 'insights'].includes(activeTab)) {
        const r = await fetch('/api/orders/admin', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setOrders(d.data)
      }
      if (activeTab === 'dashboard' || activeTab === 'insights') {
        try {
          const r = await fetch('/api/orders/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
          const d = await r.json(); if (d.success) setStats(d.data)
        } catch (e) { console.error('Stats error', e) }
      }
      if (activeTab === 'settings') {
        const r = await fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setStoreSettings(d.data || {})
      }
      if (['categories', 'products'].includes(activeTab)) {
        const r = await fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setCategoriesList(d.data || [])
      }
      if (activeTab === 'coupons') {
        const r = await fetch('/api/admin/coupons', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setCouponsList(d.data || [])
      }
      if (activeTab === 'banners') {
        const r = await fetch('/api/admin/banners', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setBannersList(d.data || [])
      }
      if (activeTab === 'reviews') {
        const r = await fetch('/api/admin/reviews', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setReviewsList(d.data || [])
      }
      if (activeTab === 'pages') {
        const r = await fetch('/api/admin/pages', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setPagesList(d.data || [])
      }
      if (activeTab === 'staff') {
        const r = await fetch('/api/admin/staff', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json(); if (d.success) setStaffList(d.data || [])
      }
    } catch {
      showToast('error', 'Sync Error', 'Failed to load data.')
    } finally { setLoadingData(false) }
  }, [activeTab, token])

  useEffect(() => { if (token) loadTabDetails() }, [activeTab, token])

  // ── Sales chart data ───────────────────────────────────────────────────────
  const getSalesChartData = useCallback(() => {
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })
    const salesByDate: Record<string, number> = {}
    const countsByDate: Record<string, number> = {}
    past7Days.forEach(d => { salesByDate[d] = 0; countsByDate[d] = 0 })
    orders.forEach(o => {
      const date = o.created_at?.split('T')[0] || ''
      if (salesByDate[date] !== undefined && o.payment_status === 'paid') {
        salesByDate[date] += o.total_amount / 100
        countsByDate[date] += 1
      }
    })
    return past7Days.map(date => {
      const revenue = salesByDate[date]
      const cnt = countsByDate[date]
      const dateObj = new Date(date + 'T00:00:00')
      return {
        date: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: Math.round(revenue),
        orders: cnt,
        aov: cnt > 0 ? Math.round(revenue / cnt) : 0,
      }
    })
  }, [orders])

  // ── Order status distribution ──────────────────────────────────────────────
  const getOrderStatusData = useCallback(() => {
    const counts: Record<string, number> = {}
    orders.forEach(o => { counts[o.order_status] = (counts[o.order_status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [orders])

  // ── Category revenue data ──────────────────────────────────────────────────
  const getCategoryData = useCallback(() => {
    const data = [
      { name: 'Heels', value: 45 }, { name: 'Flats', value: 30 },
      { name: 'Sandals', value: 15 }, { name: 'Bags', value: 10 }
    ]
    return data
  }, [])

  // ── KPI spark data ─────────────────────────────────────────────────────────
  const getKpiSparkData = useCallback(() => {
    const chart = getSalesChartData()
    return {
      revenueSpark: chart.map(d => d.revenue),
      ordersSpark: chart.map(d => d.orders),
    }
  }, [getSalesChartData])

  // ── AI Insights generator ──────────────────────────────────────────────────
  const generateAiInsights = async () => {
    setLoadingInsights(true)
    setAiInsights('')
    const summaryData = {
      totalRevenue: stats ? (stats.revenue / 100).toFixed(0) : 0,
      totalOrders: stats?.total_orders || 0,
      delivered: stats?.delivered || 0,
      uniqueCustomers: stats?.unique_customers || 0,
      lowStockProducts: products.filter(p => p.stock <= 3).length,
      pendingOrders: orders.filter(o => o.order_status === 'placed').length,
      productCount: products.length,
      topCategories: 'Heels (45%), Flats (30%), Sandals (25%)',
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert e-commerce business analyst for HeelsUp, a premium women's footwear brand from Jodhpur, India. 
Analyze the provided store metrics and give actionable, concise insights in a structured format.
Respond in this exact JSON format:
{
  "healthScore": <number 1-100>,
  "headline": "<2-3 word verdict like 'Strong Growth' or 'Needs Attention'>",
  "insights": [
    { "type": "success|warning|info", "title": "<short title>", "detail": "<1-2 sentence actionable detail>" }
  ],
  "quickWins": ["<action item>", "<action item>", "<action item>"],
  "forecast": "<1 sentence 7-day revenue forecast>"
}
Give exactly 4 insights and 3 quickWins.`,
          messages: [{
            role: 'user',
            content: `Analyze these HeelsUp store metrics: ${JSON.stringify(summaryData)}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.map((c: any) => c.text || '').join('')
      const clean = text.replace(/```json|```/g, '').trim()
      setAiInsights(clean)
    } catch (e) {
      setAiInsights(JSON.stringify({
        healthScore: 72, headline: 'Steady Performance',
        insights: [
          { type: 'info', title: 'Connect API', detail: 'Connect Anthropic API to get live AI-powered insights from your data.' },
          { type: 'warning', title: 'Low Stock Alert', detail: `${products.filter(p => p.stock <= 3).length} products are running low on stock.` },
          { type: 'success', title: 'Orders Processing', detail: `${stats?.delivered || 0} orders successfully delivered.` },
          { type: 'info', title: 'Catalog Health', detail: `${products.length} products in catalog across multiple categories.` }
        ],
        quickWins: ['Restock low inventory items', 'Process pending orders', 'Update product images'],
        forecast: 'Maintain current momentum to achieve target revenue goals.'
      }))
    } finally { setLoadingInsights(false) }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoggingIn(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (data.success && data.data) {
        const { token: t, user: u } = data.data
        if (u.role === 'admin' || u.role === 'staff') {
          login(t, u)
          showToast('success', `Welcome ${u.name}! 🔑`, 'HeelsUp Admin workspace unlocked.')
        } else {
          showToast('error', 'Unauthorized', 'Insufficient permissions.')
        }
      } else {
        showToast('error', 'Login Failed', data.error || 'Invalid credentials.')
      }
    } catch {
      showToast('error', 'Auth Error', 'Failed to connect to backend.')
    } finally { setLoggingIn(false) }
  }

  // ── Order handlers ─────────────────────────────────────────────────────────
  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order)
    setLoadingOrderDetail(true)
    setSelectedOrderDetail(null)
    setOrderTrackingNum(order.tracking_number || '')
    setOrderTrackingUrl(order.tracking_url || '')
    setOrderCourierName(order.courier_name || '')
    setSendSmsNotification(true)
    try {
      const res = await fetch(`/api/orders/admin/${order.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setSelectedOrderDetail(data.data)
      else showToast('error', 'Load Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') } finally { setLoadingOrderDetail(false) }
  }

  const handleUpdateDetailStatus = async (newStatus: string) => {
    if (!selectedOrder) return
    try {
      const res = await fetch(`/api/orders/admin/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, tracking_number: orderTrackingNum, tracking_url: orderTrackingUrl, courier_name: orderCourierName, send_sms: sendSmsNotification })
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Order Updated', `Status → ${newStatus}`)
        setSelectedOrderDetail(data.data)
        loadTabDetails()
      } else showToast('error', 'Update Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }

  // ── Product handlers ───────────────────────────────────────────────────────
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productFormName || !productFormSKU || !productFormPrice) return
    try {
      const body = {
        name: productFormName, sku: productFormSKU,
        price: productFormPrice, mrp: productFormMrp || productFormPrice,
        stock: productFormStock, category: productFormCategory,
        sizes: productFormSizes, images: productFormImages, brand: 'HeelsUp'
      }
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Catalog Updated', editingProduct ? 'Product updated.' : 'Product created.')
        setEditingProduct(null)
        setProductFormName(''); setProductFormSKU(''); setProductFormPrice(0); setProductFormMrp(0); setProductFormStock(5)
        setProductFormImages([]); setProductFormSizes(['36', '37', '38', '39', '40', '41'])
        loadTabDetails()
      } else showToast('error', 'Save Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploadingImage(true)
    try {
      const urls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData(); fd.append('file', files[i])
        const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
        const data = await res.json()
        if (data.success && data.data?.url) urls.push(data.data.url)
        else showToast('error', 'Upload failed', data.error || '')
      }
      if (urls.length) {
        setProductFormImages(prev => [...prev, ...urls])
        showToast('success', 'Uploaded', `${urls.length} image(s) uploaded.`)
      }
    } catch { showToast('error', 'Upload error', '') } finally { setUploadingImage(false) }
  }

  // ── Bulk upload ────────────────────────────────────────────────────────────
  const handleParseBulkInput = useCallback((input: string) => {
    const trimmed = input.trim()
    if (!trimmed) { setParsedProducts([]); setParseErrors([]); return }
    try {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed)
        const arr = Array.isArray(parsed) ? parsed : (parsed.products || [])
        if (!Array.isArray(arr)) { setParseErrors(['JSON must be array']); setParsedProducts([]); return }
        const validated = arr.map((item: any, index: number) => {
          const errors: string[] = []
          if (!item.name) errors.push('Missing Name')
          if (!item.sku) errors.push('Missing SKU')
          if (!item.price || isNaN(Number(item.price)) || Number(item.price) <= 0) errors.push('Invalid Price')
          return {
            ...item, name: item.name || '', sku: item.sku || '',
            price: Number(item.price) || 0, mrp: Number(item.mrp || item.price) || 0,
            stock: Number(item.stock) || 0, category: item.category || 'heels',
            sizes: Array.isArray(item.sizes) ? item.sizes : ['36', '37', '38', '39', '40', '41'],
            images: Array.isArray(item.images) ? item.images : [],
            errors, isValid: errors.length === 0, index
          }
        })
        setParsedProducts(validated); setParseErrors([])
        return
      }
    } catch (e: any) {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        setParseErrors([`JSON parse error: ${e.message}`]); setParsedProducts([]); return
      }
    }
    // CSV parsing
    try {
      const lines = trimmed.split(/\r?\n/).filter(l => l.trim() !== '')
      if (lines.length === 0) { setParsedProducts([]); setParseErrors([]); return }
      const parseCSVLine = (text: string) => {
        const r: string[] = []; let p = '', q = false
        for (let i = 0; i < text.length; i++) {
          const c = text[i]
          if (c === '"') q = !q
          else if (c === ',' && !q) { r.push(p.trim()); p = '' }
          else p += c
        }
        r.push(p.trim()); return r.map(v => v.replace(/^"|"$/g, '').trim())
      }
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
      const results: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]); const item: any = {}
        headers.forEach((h, idx) => { item[h] = cols[idx] || '' })
        const name = item.name || item.title || ''
        const sku = item.sku || item.code || ''
        const price = Number(item.price) || 0
        const errors: string[] = []
        if (!name) errors.push('Missing Name')
        if (!sku) errors.push('Missing SKU')
        if (!price || price <= 0) errors.push('Invalid Price')
        results.push({
          name, sku, price, mrp: Number(item.mrp || item.price) || price,
          stock: Number(item.stock || item.quantity || 0) || 0,
          category: item.category || 'heels',
          sizes: item.sizes ? String(item.sizes).split(/[;|]/).map((s: string) => s.trim()) : ['36', '37', '38', '39', '40', '41'],
          images: item.images ? String(item.images).split(/[;|]/).map((img: string) => img.trim()) : [],
          errors, isValid: errors.length === 0, index: i - 1
        })
      }
      setParsedProducts(results); setParseErrors([])
    } catch (e: any) { setParseErrors([`CSV parse error: ${e.message}`]); setParsedProducts([]) }
  }, [])

  useEffect(() => { handleParseBulkInput(bulkInput) }, [bulkInput])

  const handleBulkUploadSubmit = async () => {
    const valid = parsedProducts.filter(p => p.isValid)
    if (!valid.length) { showToast('error', 'Validation Error', 'No valid products.'); return }
    setBulkUploading(true)
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ products: valid.map(p => ({ ...p, brand: 'HeelsUp' })) })
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Bulk Upload Done', `${valid.length} products uploaded.`)
        setShowBulkModal(false); setBulkInput(''); setParsedProducts([]); loadTabDetails()
      } else showToast('error', 'Upload Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') } finally { setBulkUploading(false) }
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!catFormName || !catFormSlug) return
    try {
      const body = { name: catFormName, slug: catFormSlug, description: catFormDesc, image_url: catFormImg, sort_order: catFormSort, active: 1 }
      const url = editingItem ? `/api/admin/categories/${editingItem.id}` : '/api/admin/categories'
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Category Saved', ''); setEditingItem(null)
        setCatFormName(''); setCatFormSlug(''); setCatFormDesc(''); setCatFormImg(''); setCatFormSort(0)
        loadTabDetails()
      } else showToast('error', 'Save Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }
  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (data.success) { showToast('success', 'Deleted', ''); loadTabDetails() }
  }

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!couponCode || !couponDiscValue) return
    try {
      const body = { code: couponCode, discount_type: couponDiscType, discount_value: couponDiscValue, min_purchase: couponMinPurchase, active: 1 }
      const url = editingItem ? `/api/admin/coupons/${editingItem.id}` : '/api/admin/coupons'
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Coupon Saved', ''); setEditingItem(null)
        setCouponCode(''); setCouponDiscType('percentage'); setCouponDiscValue(0); setCouponMinPurchase(0)
        loadTabDetails()
      } else showToast('error', 'Save Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }
  const handleDeleteCoupon = async (id: number) => {
    if (!confirm('Delete this coupon?')) return
    const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (data.success) { showToast('success', 'Deleted', ''); loadTabDetails() }
  }

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!bannerTitle || !bannerImg) return
    try {
      const body = { title: bannerTitle, subtitle: bannerSubtitle, image_url: bannerImg, link: bannerLink, active: 1 }
      const url = editingItem ? `/api/admin/banners/${editingItem.id}` : '/api/admin/banners'
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Banner Saved', ''); setEditingItem(null)
        setBannerTitle(''); setBannerSubtitle(''); setBannerImg(''); setBannerLink('')
        loadTabDetails()
      } else showToast('error', 'Save Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }
  const handleDeleteBanner = async (id: number) => {
    if (!confirm('Delete this banner?')) return
    const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (data.success) { showToast('success', 'Deleted', ''); loadTabDetails() }
  }

  const handleToggleReviewStatus = async (id: number, cur: boolean) => {
    const res = await fetch(`/api/admin/reviews/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ approved: cur ? 0 : 1 }) })
    const data = await res.json(); if (data.success) { showToast('success', 'Review toggled', ''); loadTabDetails() }
  }
  const handleDeleteReview = async (id: number) => {
    if (!confirm('Delete this review?')) return
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (data.success) { showToast('success', 'Deleted', ''); loadTabDetails() }
  }

  const handlePageSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!pageTitle || !pageContent) return
    try {
      const body = { title: pageTitle, content: pageContent, active: 1 }
      const url = editingItem ? `/api/admin/pages/${editingItem.id}` : '/api/admin/pages'
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Page Saved', ''); setEditingItem(null)
        setPageTitle(''); setPageContent(''); loadTabDetails()
      } else showToast('error', 'Save Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }
  const handleDeletePage = async (id: number) => {
    if (!confirm('Delete this page?')) return
    const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (data.success) { showToast('success', 'Deleted', ''); loadTabDetails() }
  }

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!staffName || !staffEmail) return
    try {
      const body: any = { name: staffName, email: staffEmail, role: staffRole, active: 1 }
      if (staffPassword) body.password = staffPassword
      const url = editingItem ? `/api/admin/staff/${editingItem.id}` : '/api/admin/staff'
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Staff Saved', ''); setEditingItem(null)
        setStaffName(''); setStaffEmail(''); setStaffPassword(''); setStaffRole('staff')
        loadTabDetails()
      } else showToast('error', 'Save Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }
  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Delete this staff member?')) return
    const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (data.success) { showToast('success', 'Deleted', ''); loadTabDetails() }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingSettings(true)
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(storeSettings) })
      const data = await res.json()
      if (data.success) showToast('success', 'Settings Saved 💾', '')
      else showToast('error', 'Save Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') } finally { setSavingSettings(false) }
  }

  const handleTestRazorpay = async () => {
    setTestingRzp(true)
    try {
      const res = await fetch('/api/settings/test/razorpay', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ razorpay_key_id: storeSettings.razorpay_key_id, razorpay_key_secret: storeSettings.razorpay_key_secret }) })
      const data = await res.json()
      if (data.success) showToast('success', 'Razorpay Connected ✅', '')
      else showToast('error', 'Connection Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') } finally { setTestingRzp(false) }
  }

  // ── POS ────────────────────────────────────────────────────────────────────
  const posSubtotal = posRows.reduce((s, r) => s + r.price * r.qty, 0)
  const posTotal = Math.max(0, posSubtotal - posDiscount)
  const posGst = posTotal * 18 / 118

  const handlePosCheckout = async () => {
    const validRows = posRows.filter(r => r.selectedProduct !== null)
    if (!validRows.length) { showToast('error', 'Cart Empty', 'Select at least one product.'); return }
    try {
      const res = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: validRows.map(i => ({ product_id: i.selectedProduct!.id, unit_price: i.price * 100, qty: i.qty, size: i.selectedSize, color: 'Default' })),
          customer_name: posCustomerName || 'Walk-in', customer_phone: posCustomerPhone,
          discount: posDiscount * 100, payment_method: posPaymentMethod.toLowerCase(),
          notes: `Ref: ${posPaymentRef || 'None'}. ${posNotes}`
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'POS Sale Recorded! 🧾', `Invoice: ${data.data?.bill_number || '---'}`)
        setPosRows([{ id: Math.random().toString(), searchQuery: '', selectedProduct: null, selectedSize: '38', qty: 1, price: 0 }])
        setPosCustomerName(''); setPosCustomerPhone(''); setPosDiscount(0); setPosPaymentRef(''); setPosNotes('In-Store POS Bill')
        loadTabDetails()
      } else showToast('error', 'Checkout Failed', data.error || '')
    } catch { showToast('error', 'Network error', '') }
  }

  // ── Reports ────────────────────────────────────────────────────────────────
  const loadReport = async () => {
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/reports/${reportType}?from=${reportFrom}&to=${reportTo}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) { setReportsData(data.data); showToast('success', 'Report Ready 📊', '') }
      else showToast('error', 'Report Error', data.error || '')
    } catch { showToast('error', 'Network error', '') } finally { setLoadingReport(false) }
  }

  const handleExportCSV = () => {
    if (!reportsData) return
    let headers: string[] = [], rows: any[] = []
    const fn = `heelsup_${reportType}_${reportFrom}_${reportTo}.csv`
    if (reportType === 'sales') {
      headers = ['Date', 'Orders', 'Revenue (₹)']
      rows = (reportsData.daily || []).map((d: any) => [d.date, d.orders, (d.revenue / 100).toFixed(2)])
    } else if (reportType === 'inventory') {
      headers = ['Product', 'SKU', 'Stock']
      rows = [...(reportsData.low_stock || []).map((p: any) => [p.name, p.sku, p.stock]), ...(reportsData.out_of_stock || []).map((p: any) => [p.name, p.sku, 0])]
    } else if (reportType === 'customers') {
      headers = ['Name', 'Email', 'Phone', 'Orders', 'Spent (₹)']
      rows = (reportsData.top_customers || []).map((c: any) => [c.first_name, c.email, c.phone, c.total_orders, (c.total_spent / 100).toFixed(2)])
    } else if (reportType === 'orders') {
      headers = ['Status', 'Count', 'Revenue (₹)']
      rows = (reportsData.by_status || []).map((s: any) => [s.status, s.count, (s.total / 100).toFixed(2)])
    }
    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; a.click()
  }

  const handlePrintInvoice = (order: any) => {
    if (!order) return
    const pw = window.open('', '_blank'); if (!pw) return
    const itemsHtml = (order.items || []).map((item: any) => `
      <tr><td>${item.product_name || 'Product'} (Size: ${item.size || 'N/A'})</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₹${((item.price || 0) / 100).toLocaleString('en-IN')}</td>
      <td style="text-align:right">₹${((item.total_price || item.price * item.quantity) / 100).toLocaleString('en-IN')}</td></tr>`).join('')
    pw.document.write(`<html><head><title>Invoice #${order.order_number}</title>
    <style>body{font-family:Helvetica,sans-serif;color:#333;margin:40px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #eee}</style>
    </head><body>
    <h2 style="font-style:italic;font-weight:300">HeelsUp</h2>
    <h3>Invoice #${order.order_number}</h3>
    <p>Customer: <strong>${order.customer_name}</strong> | Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}</p>
    <table><thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    <p style="text-align:right;font-weight:bold;font-size:16px">Total: ₹${(order.total_amount / 100).toLocaleString('en-IN')}</p>
    <script>window.onload=()=>window.print()</script></body></html>`)
    pw.document.close()
  }

  // ── Login screen ───────────────────────────────────────────────────────────
  const isStaff = token && (user?.role === 'admin' || user?.role === 'staff' || user?.role === 'manager')
  if (!isStaff) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0f10 0%, #1a1412 50%, #0f0f10 100%)' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 36, fontWeight: 300, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: '#C9A96E', letterSpacing: 2, marginBottom: 8 }}>
              HeelsUp
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3 }}>Staff Workspace</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 20, padding: 36, backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '12px 16px', background: 'rgba(201,169,110,0.08)', borderRadius: 12, border: '1px solid rgba(201,169,110,0.1)' }}>
              <ShieldAlert style={{ width: 16, height: 16, color: '#C9A96E', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Verify credentials to access POS & inventory controls</span>
            </div>

            <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Staff Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="staff@heelsup.in" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="••••••••••••" />
              </div>
              <button type="submit" disabled={loggingIn}
                style={{ marginTop: 8, padding: '14px', background: loggingIn ? '#374151' : 'linear-gradient(135deg, #C9A96E, #b17e3f)', border: 'none', borderRadius: 12, color: '#111827', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, cursor: 'pointer', transition: 'opacity 0.2s', opacity: loggingIn ? 0.6 : 1 }}>
                {loggingIn ? 'Authenticating...' : 'Unlock Workspace'}
              </button>
            </form>
          </div>
          <p style={{ textAlign: 'center', color: '#374151', fontSize: 11, marginTop: 24 }}>HeelsUp Admin v2.1 · Enterprise Edition</p>
        </div>
      </div>
    )
  }

  // ── Derived filtered data ──────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const matchSearch = !orderSearch || o.order_number.toLowerCase().includes(orderSearch.toLowerCase()) || o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) || o.customer_phone.includes(orderSearch)
    const matchStatus = orderStatusFilter === 'all' || o.order_status === orderStatusFilter
    return matchSearch && matchStatus
  })

  const filteredProducts = products.filter(p => {
    const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())
    const matchCat = productCategoryFilter === 'all' || p.category === productCategoryFilter
    return matchSearch && matchCat
  })

  const chartData = getSalesChartData()
  const orderStatusData = getOrderStatusData()
  const categoryData = getCategoryData()
  const { revenueSpark, ordersSpark } = getKpiSparkData()

  const STATUS_COLORS: Record<string, string> = {
    placed: '#3B82F6', confirmed: '#F59E0B', shipped: '#6366F1',
    delivered: '#10B981', cancelled: '#EF4444'
  }

  const allowedTabs = getAllowedTabs()
  const tabSections = tabsBySection()

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="admin-layout">
      <CommandPalette
        open={cmdOpen} onClose={() => setCmdOpen(false)}
        onNavigate={tab => setActiveTab(tab as any)} tabs={allowedTabs}
      />
      <NotifPanel
        open={notifOpen} onClose={() => setNotifOpen(false)}
        orders={orders} products={products}
      />

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'mini' : ''}`} id="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            {!sidebarCollapsed && (
              <div>
                <div className="sidebar-brand">Heels<span>Up</span></div>
                <div className="sidebar-version">Enterprise v2.1</div>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="admin-sidebar-toggle" title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
            <i className={`fa-solid ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
          </button>
        </div>

        {/* Cmd palette shortcut button */}
        {!sidebarCollapsed && (
          <div style={{ padding: '0 16px 16px' }}>
            <button onClick={() => setCmdOpen(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: '#6B7280', fontSize: 11 }}>
              <Search style={{ width: 13, height: 13 }} />
              <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '1px 5px', fontSize: 9, fontFamily: 'monospace', color: '#6B7280' }}>⌘K</kbd>
            </button>
          </div>
        )}

        <nav className="admin-nav">
          {Object.entries(tabSections).map(([section, tabs]) => (
            <div key={section} className="admin-nav-section">
              {!sidebarCollapsed && <div className="admin-nav-title">{section}</div>}
              {tabs.map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)}
                  className={`admin-nav-link ${activeTab === tab.id ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', position: 'relative' }}>
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.id === 'insights' && (
                    <span style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#C9A96E,#b17e3f)', color: '#111', borderRadius: 20, padding: '1px 6px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>NEW</span>
                  )}
                  {tab.id === 'orders' && orders.filter(o => o.order_status === 'placed').length > 0 && (
                    <span className="admin-nav-badge" style={{ background: 'var(--color-accent)' }}>{orders.filter(o => o.order_status === 'placed').length}</span>
                  )}
                  {tab.id === 'inventory' && products.filter(p => p.stock <= 3).length > 0 && (
                    <span className="admin-nav-badge" style={{ background: 'var(--color-warning)' }}>{products.filter(p => p.stock <= 3).length}</span>
                  )}
                  {tab.id === 'reviews' && reviewsList.filter(r => !r.approved).length > 0 && (
                    <span className="admin-nav-badge" style={{ background: 'var(--color-success)' }}>{reviewsList.filter(r => !r.approved).length}</span>
                  )}
                  {tab.id === 'products' && products.length > 0 && !sidebarCollapsed && (
                    <span className="admin-nav-badge">{products.length}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info" style={{ marginBottom: 16 }}>
            <div className="admin-user-avatar">{user?.name ? user.name[0].toUpperCase() : 'A'}</div>
            {!sidebarCollapsed && (
              <div>
                <div className="admin-user-name">{user?.name}</div>
                <div className="admin-user-role">{user?.role}</div>
              </div>
            )}
          </div>
          <button onClick={() => { logout(); showToast('info', 'Logged Out', ''); navigate('/') }}
            className="btn btn-ghost"
            style={{ width: '100%', color: 'var(--color-gray-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
            <LogOut style={{ width: 14, height: 14 }} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className="admin-sidebar-overlay" id="sidebar-overlay" onClick={() => {
        const sb = document.getElementById('admin-sidebar'); if (sb) sb.classList.remove('open')
      }} />

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button id="sidebar-toggle-mobile" onClick={() => { const sb = document.getElementById('admin-sidebar'); if (sb) sb.classList.toggle('open') }}
              style={{ background: 'var(--color-light)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, cursor: 'pointer' }}>
              <i className="fa-solid fa-bars" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="admin-page-title capitalize">
                {activeTab === 'pos' ? 'POS Terminal' : activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'insights' ? 'AI Insights' : activeTab}
              </div>
            </div>
          </div>

          <div className="admin-topbar-actions">
            {/* Live traffic pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ECFDF5', border: '1px solid #D1FAE5', borderRadius: 20, padding: '6px 12px', color: '#065F46', fontSize: 10, fontWeight: 700, userSelect: 'none' }}>
              <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34D399', opacity: 0.75, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
                <span style={{ position: 'relative', borderRadius: '50%', width: '100%', height: '100%', background: '#10B981' }} />
              </span>
              <span>Live: <strong>{liveTraffic}</strong></span>
            </div>

            {/* Cmd+K button */}
            <button onClick={() => setCmdOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#6B7280', fontSize: 11 }}>
              <Command style={{ width: 12, height: 12 }} />
              <kbd style={{ fontSize: 10, fontFamily: 'monospace' }}>⌘K</kbd>
            </button>

            <button onClick={() => { loadTabDetails(); showToast('success', 'Refreshed', '') }}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
              <RefreshCw style={{ width: 15, height: 15 }} />
            </button>

            <button onClick={() => setNotifOpen(v => !v)} style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
              <Bell style={{ width: 15, height: 15 }} />
              {(orders.filter(o => o.order_status === 'placed').length + products.filter(p => p.stock <= 3).length) > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#EF4444', borderRadius: '50%', border: '2px solid #fff' }} />
              )}
            </button>

            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#C9A96E,#b17e3f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, cursor: 'pointer' }} title={`${user?.name} (${user?.role})`}>
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content">
          <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 20, padding: '28px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '75vh' }}>

            {/* ═══════════════════════════════════════════════════════════════
                TAB: DASHBOARD
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Overview Analytics</h3>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>Real-time performance from D1 Ledger & live streams</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                      Live Connection
                    </span>
                    <button onClick={() => { loadTabDetails(); showToast('success', 'Refreshed', '') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
                    </button>
                    <button onClick={() => setActiveTab('insights')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#C9A96E,#b17e3f)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#111' }}>
                      <Sparkles style={{ width: 12, height: 12 }} /> AI Insights
                    </button>
                  </div>
                </div>

                {/* KPI Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                  {[
                    {
                      label: 'Gross Revenue', value: `₹${stats ? (stats.revenue / 100).toLocaleString('en-IN') : '0'}`,
                      sub: '+14.2% from last month', trend: 14.2, icon: <TrendingUp size={22} />,
                      bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', iconBg: '#F59E0B', iconColor: '#fff',
                      spark: revenueSpark
                    },
                    {
                      label: 'Total Orders', value: stats?.total_orders || 0,
                      sub: `${stats?.delivered || 0} delivered`, trend: 8.1, icon: <ShoppingCart size={22} />,
                      bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', iconBg: '#3B82F6', iconColor: '#fff',
                      spark: ordersSpark
                    },
                    {
                      label: 'Unique Shoppers', value: stats?.unique_customers || 0,
                      sub: 'Active LTV customers', trend: 5.3, icon: <Users size={22} />,
                      bg: 'linear-gradient(135deg,#F5F3FF,#EDE9FE)', iconBg: '#8B5CF6', iconColor: '#fff',
                      spark: Array(7).fill(0).map(() => Math.floor(Math.random() * 10))
                    },
                    {
                      label: 'Avg Order Value', value: `₹${stats && stats.delivered ? Math.round((stats.revenue / 100) / stats.delivered).toLocaleString('en-IN') : '0'}`,
                      sub: 'Per basket value', trend: -2.1, icon: <CreditCard size={22} />,
                      bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', iconBg: '#10B981', iconColor: '#fff',
                      spark: Array(7).fill(0).map((_, i) => 1200 + i * 80)
                    },
                  ].map((kpi, idx) => (
                    <div key={idx} style={{ background: kpi.bg, borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>{kpi.label}</div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
                        </div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.iconColor, flexShrink: 0 }}>
                          {kpi.icon}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        {kpi.trend >= 0
                          ? <ArrowUpRight style={{ width: 12, height: 12, color: '#10B981' }} />
                          : <ArrowDownRight style={{ width: 12, height: 12, color: '#EF4444' }} />
                        }
                        <span style={{ fontSize: 10, fontWeight: 700, color: kpi.trend >= 0 ? '#059669' : '#DC2626' }}>{Math.abs(kpi.trend)}%</span>
                        <span style={{ fontSize: 10, color: '#6B7280' }}>{kpi.sub}</span>
                      </div>
                      {kpi.spark && (
                        <div style={{ height: 36, marginTop: 8 }}>
                          <SparkLine data={kpi.spark} color={kpi.iconBg} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Main Chart + Donut */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                  {/* Area chart */}
                  <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          7-Day {chartMetric === 'revenue' ? 'Revenue' : chartMetric === 'orders' ? 'Orders' : 'AOV'} Trend
                        </div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>Live data from D1 transactions</div>
                      </div>
                      <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 }}>
                        {[['revenue', '₹ Revenue'], ['orders', '# Orders'], ['aov', 'AOV']].map(([key, label]) => (
                          <button key={key} onClick={() => setChartMetric(key as any)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: chartMetric === key ? '#fff' : 'transparent', color: chartMetric === key ? '#111827' : '#6B7280', boxShadow: chartMetric === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomChartTooltip prefix={chartMetric === 'orders' ? '' : '₹'} />} />
                        <Area type="monotone" dataKey={chartMetric} stroke={CHART_COLORS.gold} strokeWidth={2.5}
                          fill="url(#areaGrad)" dot={{ fill: CHART_COLORS.gold, r: 3, strokeWidth: 0 }} name={chartMetric === 'revenue' ? 'Revenue' : chartMetric === 'orders' ? 'Orders' : 'AOV'} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Donut */}
                  <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Category Mix</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 16 }}>Revenue breakdown by type</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                          {categoryData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                        </Pie>
                        <Tooltip formatter={(val: any) => `${val}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {categoryData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_PALETTE[i % PIE_PALETTE.length], flexShrink: 0 }} />
                            <span style={{ color: '#6B7280', fontWeight: 600 }}>{d.name}</span>
                          </div>
                          <span style={{ fontWeight: 800, color: '#111827' }}>{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bar chart + Status breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {/* Stacked Bar */}
                  <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Revenue vs Orders Comparison</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 16 }}>Daily dual-axis comparison</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="rev" orientation="left" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Bar yAxisId="rev" dataKey="revenue" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} name="Revenue" />
                        <Line yAxisId="ord" type="monotone" dataKey="orders" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3 }} name="Orders" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Order Status Bars */}
                  <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Order Status Distribution</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 16 }}>Fulfillment pipeline breakdown</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={orderStatusData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip content={<CustomChartTooltip prefix="" />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Orders">
                          {orderStatusData.map((entry, i) => (
                            <Cell key={i} fill={STATUS_COLORS[entry.name] || '#9CA3AF'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Live sessions + System status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {/* Live sessions */}
                  <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>Live Session Feed</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>Visitor activity across India</div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ECFDF5', border: '1px solid #D1FAE5', borderRadius: 20, padding: '3px 10px', fontSize: 9, fontWeight: 700, color: '#065F46' }}>
                        <span style={{ width: 6, height: 6, background: '#10B981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                        Simulating
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {liveSessions.map(sess => (
                        <div key={sess.id} style={{
                          padding: '10px 12px', borderRadius: 10, border: '1px solid',
                          borderColor: sess.status === 'success' ? '#D1FAE5' : sess.status === 'warning' ? '#FDE68A' : '#F3F4F6',
                          background: sess.status === 'success' ? '#F0FDF4' : sess.status === 'warning' ? '#FFFBEB' : '#F9FAFB',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, background: '#E5E7EB', borderRadius: 4, padding: '1px 5px', color: '#374151' }}>{sess.location}</span>
                              <span style={{ fontSize: 10, color: '#374151', fontWeight: 500 }}>{sess.action}</span>
                            </div>
                            <span style={{ fontSize: 9, color: '#9CA3AF' }}>ID: #{sess.id}</span>
                          </div>
                          <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{sess.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System health */}
                  <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Cloud Gateway Health</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 16 }}>Integration ping status</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { name: 'D1 SQL Ledger', status: 'Online · 12ms', sub: 'SQLite Binding' },
                        { name: 'Cloudflare KV Cache', status: 'Active · 94.6% Hit', sub: 'Config Store' },
                        { name: 'Razorpay API Gateway', status: 'Live · Secure', sub: 'rzp_live_*' },
                        { name: 'Infobip SMS', status: 'Listening · 200 OK', sub: 'eegg4r.api.infobip.com' },
                        { name: 'Resend SMTP', status: 'Online · 0 Queued', sub: 'support@heelsup.in' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', border: '1px solid #f3f4f6', borderRadius: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
                              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10B981', opacity: 0.5, animation: 'ping 1.5s infinite', animationDelay: `${i * 0.2}s` }} />
                              <span style={{ position: 'absolute', inset: '15%', borderRadius: '50%', background: '#10B981' }} />
                            </span>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{item.name}</div>
                              <div style={{ fontSize: 9, color: '#9CA3AF' }}>{item.sub}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#059669' }}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Conversion Funnel Analytics</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 20 }}>Marketing checkout drop-off analysis</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { step: '1. Sessions', count: '10,240', pct: 100, color: '#C9A96E' },
                      { step: '2. Product Views', count: '6,890', pct: 67.3, color: '#3B82F6' },
                      { step: '3. Add to Cart', count: '3,120', pct: 30.4, color: '#8B5CF6' },
                      { step: '4. Checkout', count: '1,560', pct: 15.2, color: '#F59E0B' },
                      { step: '5. Purchased', count: `${orders.length}`, pct: Math.min(100, orders.length / 100), color: '#10B981' },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 140, fontSize: 10, fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>{f.step}</div>
                        <div style={{ flex: 1, height: 24, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ height: '100%', width: `${f.pct}%`, background: f.color, borderRadius: 6, minWidth: f.pct > 0 ? 8 : 0, transition: 'width 0.6s ease', opacity: 0.85 }} />
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: f.pct > 15 ? '#fff' : '#374151' }}>{f.count}</span>
                        </div>
                        <div style={{ width: 50, textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#111827', flexShrink: 0 }}>{f.pct.toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Low stock banner */}
                {products.filter(p => p.stock <= 3).length > 0 && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚠️</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Low Stock Warning</div>
                        <div style={{ fontSize: 10, color: '#B45309', marginTop: 2 }}>{products.filter(p => p.stock <= 3).length} products below safety threshold</div>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('inventory')}
                      style={{ padding: '6px 14px', background: '#F59E0B', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 800, color: '#fff', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Manage Stock
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: AI INSIGHTS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'insights' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Sparkles style={{ color: '#C9A96E' }} /> AI-Powered Business Intelligence
                    </h3>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Claude AI analyzes your store metrics and generates actionable recommendations</p>
                  </div>
                  <button onClick={generateAiInsights} disabled={loadingInsights}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: loadingInsights ? '#9CA3AF' : 'linear-gradient(135deg,#111827,#374151)', border: 'none', borderRadius: 12, color: '#C9A96E', fontSize: 12, fontWeight: 700, cursor: loadingInsights ? 'wait' : 'pointer', letterSpacing: 0.5 }}>
                    <Brain style={{ width: 16, height: 16 }} />
                    {loadingInsights ? 'Analyzing...' : 'Generate Insights'}
                  </button>
                </div>

                {/* Metric summary for AI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                  {[
                    { label: 'Total Revenue', value: `₹${stats ? (stats.revenue / 100).toLocaleString() : '0'}`, icon: '💰' },
                    { label: 'Orders', value: stats?.total_orders || 0, icon: '📦' },
                    { label: 'Customers', value: stats?.unique_customers || 0, icon: '👥' },
                    { label: 'Low Stock SKUs', value: products.filter(p => p.stock <= 3).length, icon: '⚠️' },
                  ].map((m, i) => (
                    <div key={i} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{m.value}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginTop: 4 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* AI Results */}
                {!aiInsights && !loadingInsights && (
                  <div style={{ textAlign: 'center', padding: '60px 32px', border: '2px dashed #e5e7eb', borderRadius: 16, background: '#fafafa' }}>
                    <Brain style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>No insights generated yet</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
                      Click "Generate Insights" to have Claude AI analyze your store data and provide actionable recommendations.
                    </div>
                  </div>
                )}

                {loadingInsights && (
                  <div style={{ textAlign: 'center', padding: '60px', background: '#fafafa', borderRadius: 16, border: '1px solid #f3f4f6' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #C9A96E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Claude is analyzing your store metrics...</div>
                  </div>
                )}

                {aiInsights && (() => {
                  try {
                    const parsed = JSON.parse(aiInsights)
                    const scoreColor = parsed.healthScore >= 75 ? '#10B981' : parsed.healthScore >= 50 ? '#F59E0B' : '#EF4444'
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Health Score */}
                        <div style={{ background: 'linear-gradient(135deg,#111827,#1F2937)', borderRadius: 16, padding: 28, display: 'flex', alignItems: 'center', gap: 24 }}>
                          <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{parsed.healthScore}</span>
                            <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 700 }}>SCORE</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#F9FAFB', marginBottom: 6 }}>{parsed.headline}</div>
                            <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>{parsed.forecast}</div>
                          </div>
                        </div>

                        {/* Insights */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                          {(parsed.insights || []).map((ins: any, i: number) => {
                            const colors: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
                              success: { bg: '#F0FDF4', border: '#D1FAE5', icon: '✅', dot: '#10B981' },
                              warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '⚠️', dot: '#F59E0B' },
                              info: { bg: '#EFF6FF', border: '#BFDBFE', icon: '💡', dot: '#3B82F6' },
                            }
                            const c = colors[ins.type] || colors.info
                            return (
                              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                  <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{ins.title}</div>
                                    <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{ins.detail}</div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Quick Wins */}
                        <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '1px solid #FCD34D', borderRadius: 16, padding: 24 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Zap style={{ width: 14, height: 14 }} /> Quick Wins — Act Now
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(parsed.quickWins || []).map((win: string, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '10px 16px' }}>
                                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#F59E0B', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                                <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{win}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return <div style={{ padding: 20, color: '#6B7280', fontSize: 12 }}>Error parsing insights. Please try again.</div>
                  }
                })()}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: POS TERMINAL
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'pos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>POS Billing Terminal</h3>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>Generate retail invoices · Deduct inventory automatically</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
                  {/* Left: Grid */}
                  <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShoppingCart style={{ width: 14, height: 14, color: '#C9A96E' }} /> Sales Line Items
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                            {['Product / SKU Search', 'Size', 'Unit Price (₹)', 'Qty', 'Total', ''].map(h => (
                              <th key={h} style={{ padding: '8px 10px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Total' ? 'right' : 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {posRows.map((row, index) => {
                            const show = row.searchQuery.trim().length > 0 && (!row.selectedProduct || row.selectedProduct.name !== row.searchQuery)
                            const matches = show ? products.filter(p => p.name.toLowerCase().includes(row.searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(row.searchQuery.toLowerCase())).slice(0, 6) : []
                            return (
                              <tr key={row.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                <td style={{ padding: '10px 10px', position: 'relative', width: '38%' }}>
                                  <input type="text" placeholder="Search product name or SKU…" value={row.searchQuery}
                                    onChange={e => { const rows = [...posRows]; rows[index].searchQuery = e.target.value; if (row.selectedProduct && row.selectedProduct.name !== e.target.value) rows[index].selectedProduct = null; setPosRows(rows) }}
                                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                  {show && matches.length > 0 && (
                                    <div style={{ position: 'absolute', left: 10, right: 10, top: 48, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
                                      {matches.map(prod => (
                                        <button key={prod.id} type="button"
                                          onClick={() => { const rows = [...posRows]; rows[index] = { ...rows[index], selectedProduct: prod, searchQuery: prod.name, price: prod.price / 100, selectedSize: prod.sizes?.[0] || '38' }; setPosRows(rows) }}
                                          style={{ width: '100%', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                          <div>
                                            <div style={{ fontWeight: 700, color: '#111827' }}>{prod.name}</div>
                                            <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>SKU: {prod.sku} · Stock: {prod.stock}</div>
                                          </div>
                                          <span style={{ fontWeight: 800, color: '#C9A96E', flexShrink: 0, marginLeft: 12 }}>₹{(prod.price / 100).toLocaleString()}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <select value={row.selectedSize} disabled={!row.selectedProduct}
                                    onChange={e => { const rows = [...posRows]; rows[index].selectedSize = e.target.value; setPosRows(rows) }}
                                    style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 11, fontWeight: 700, background: '#fff', outline: 'none', opacity: row.selectedProduct ? 1 : 0.4 }}>
                                    {(row.selectedProduct?.sizes || ['36', '37', '38', '39', '40', '41']).map((sz: any) => (
                                      <option key={sz} value={sz}>{sz}</option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <input type="number" value={row.price || ''} disabled={!row.selectedProduct}
                                    onChange={e => { const rows = [...posRows]; rows[index].price = Number(e.target.value); setPosRows(rows) }}
                                    style={{ width: 90, border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 700, background: '#fff', outline: 'none', textAlign: 'right', opacity: row.selectedProduct ? 1 : 0.4 }} />
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <input type="number" min={1} value={row.qty} disabled={!row.selectedProduct}
                                    onChange={e => { const rows = [...posRows]; rows[index].qty = Math.max(1, Number(e.target.value)); setPosRows(rows) }}
                                    style={{ width: 60, border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 700, background: '#fff', outline: 'none', textAlign: 'center', opacity: row.selectedProduct ? 1 : 0.4 }} />
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                  ₹{(row.price * row.qty).toLocaleString()}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                  <button onClick={() => { if (posRows.length > 1) setPosRows(posRows.filter(r => r.id !== row.id)); else setPosRows([{ id: Math.random().toString(), searchQuery: '', selectedProduct: null, selectedSize: '38', qty: 1, price: 0 }]) }}
                                    style={{ width: 28, height: 28, border: 'none', background: '#FEF2F2', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                                    <X style={{ width: 14, height: 14 }} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={() => setPosRows([...posRows, { id: Math.random().toString(), searchQuery: '', selectedProduct: null, selectedSize: '38', qty: 1, price: 0 }])}
                      style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#C9A96E', background: '#FEF7EE', border: '1px solid #FCDDA7', borderRadius: 10, padding: '8px 16px', cursor: 'pointer' }}>
                      <Plus style={{ width: 14, height: 14 }} /> Add Item Row
                    </button>
                  </div>

                  {/* Right: Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Customer */}
                    <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                        👤 Customer
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[['Phone', posCustomerPhone, setPosCustomerPhone, '10-digit mobile number', 'tel'],
                        ['Name', posCustomerName, setPosCustomerName, 'Walk-in customer name', 'text']].map(([label, val, setter, ph, type]) => (
                          <div key={label as string}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{label as string}</div>
                            <input type={type as string} placeholder={ph as string} value={val as string} onChange={e => (setter as any)(e.target.value)}
                              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment */}
                    <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                        💳 Payment
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                        {(['Cash', 'UPI', 'Card'] as const).map(mode => (
                          <button key={mode} onClick={() => setPosPaymentMethod(mode)}
                            style={{ padding: '10px 8px', borderRadius: 10, border: `2px solid ${posPaymentMethod === mode ? '#C9A96E' : '#e5e7eb'}`, background: posPaymentMethod === mode ? '#FEF7EE' : '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: posPaymentMethod === mode ? '#92400E' : '#6B7280', transition: 'all 0.15s' }}>
                            {mode === 'Cash' ? '💵' : mode === 'UPI' ? '📱' : '💳'} {mode}
                          </button>
                        ))}
                      </div>
                      {posPaymentMethod !== 'Cash' && (
                        <input type="text" placeholder="Transaction Reference / ID" value={posPaymentRef} onChange={e => setPosPaymentRef(e.target.value)}
                          style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 11, background: '#f9fafb', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                      )}
                      <textarea placeholder="Remarks / Notes..." value={posNotes} onChange={e => setPosNotes(e.target.value)} rows={2}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 11, background: '#f9fafb', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    </div>

                    {/* Summary */}
                    <div style={{ background: 'linear-gradient(135deg,#FEF7EE,#FDE68A30)', border: '1px solid #FCDDA7', borderRadius: 16, padding: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, borderBottom: '1px solid #FCDDA7', paddingBottom: 10 }}>
                        🧾 Order Summary
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Flat Discount (₹)</span>
                        <input type="number" min={0} value={posDiscount || ''} onChange={e => setPosDiscount(Number(e.target.value))}
                          style={{ width: 80, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 12, fontWeight: 700, textAlign: 'right', background: '#fff', outline: 'none' }} />
                      </div>
                      <div style={{ borderTop: '1px solid #FCDDA7', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          ['Subtotal', `₹${posSubtotal.toLocaleString()}`, '#374151'],
                          ['Discount', `-₹${posDiscount.toLocaleString()}`, '#059669'],
                          ['GST (18% incl.)', `₹${posGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, '#9CA3AF'],
                        ].map(([label, val, color]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                            <span style={{ color: '#6B7280' }}>{label}</span>
                            <span style={{ color }}>{val}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: '2px solid #C9A96E', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>Grand Total</span>
                          <span style={{ fontSize: 20, fontWeight: 900, color: '#C9A96E', fontVariantNumeric: 'tabular-nums' }}>₹{posTotal.toLocaleString()}</span>
                        </div>
                      </div>
                      <button onClick={handlePosCheckout}
                        style={{ width: '100%', marginTop: 14, padding: '14px', background: 'linear-gradient(135deg,#111827,#374151)', border: 'none', borderRadius: 12, color: '#C9A96E', fontSize: 12, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Check style={{ width: 16, height: 16 }} /> Complete Transaction
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: PRODUCTS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'products' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>
                      {editingProduct ? 'Edit Product' : 'Product Catalog'}
                    </h3>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>{products.length} styles in catalog</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setBulkInput(''); setParsedProducts([]); setParseErrors([]); setShowBulkModal(true) }}
                      style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UploadCloud style={{ width: 13, height: 13 }} /> Bulk Upload
                    </button>
                    <button onClick={() => { setEditingProduct(null); setProductFormName(''); setProductFormSKU(''); setProductFormPrice(0); setProductFormMrp(0); setProductFormStock(5); setProductFormImages([]); setProductFormSizes(['36', '37', '38', '39', '40', '41']) }}
                      style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus style={{ width: 13, height: 13 }} /> Add Product
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleProductFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#faf8f4', border: '1px solid #FCDDA7', borderRadius: 16, padding: 24 }}>
                  {[
                    ['Style Name', productFormName, setProductFormName, 'e.g. Classic Stiletto Velvet', 'text', true],
                    ['SKU Code', productFormSKU, setProductFormSKU, 'e.g. SL-089', 'text', true],
                    ['Sale Price (₹)', productFormPrice, setProductFormPrice, '', 'number', true],
                    ['MRP / Original (₹)', productFormMrp, setProductFormMrp, '', 'number', false],
                    ['Stock Units', productFormStock, setProductFormStock, '', 'number', false],
                  ].map(([label, val, setter, ph, type, req]) => (
                    <div key={label as string}>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label as string}</label>
                      <input type={type as string} required={!!req} placeholder={ph as string} value={val as any}
                        onChange={e => (setter as any)(type === 'number' ? Number(e.target.value) : e.target.value)}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}

                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Category</label>
                    <select value={productFormCategory} onChange={e => setProductFormCategory(e.target.value)}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none' }}>
                      {categoriesList.length === 0
                        ? ['heels', 'sandals', 'flats', 'bags'].map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)
                        : categoriesList.map(c => <option key={c.id} value={c.slug || c.name.toLowerCase()}>{c.name}</option>)
                      }
                    </select>
                  </div>

                  {/* Sizes */}
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Size Configuration</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['36', '37', '38', '39', '40', '41', '42'].map(sz => {
                        const active = productFormSizes.includes(sz)
                        return (
                          <button key={sz} type="button"
                            onClick={() => setProductFormSizes(prev => active ? prev.filter(s => s !== sz) : [...prev, sz].sort())}
                            style={{ padding: '6px 14px', borderRadius: 8, border: `2px solid ${active ? '#111827' : '#e5e7eb'}`, background: active ? '#111827' : '#fff', color: active ? '#C9A96E' : '#6B7280', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {sz}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Image uploader */}
                  <div style={{ gridColumn: '1/-1', border: '1px solid #FCDDA780', borderRadius: 16, padding: 20, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>Product Gallery</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>First image = primary storefront image</div>
                      </div>
                      <div>
                        <input type="file" id="img-upload" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                        <button type="button" disabled={uploadingImage} onClick={() => document.getElementById('img-upload')?.click()}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 10, color: '#C9A96E', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          <UploadCloud style={{ width: 13, height: 13 }} /> {uploadingImage ? 'Uploading…' : 'Upload Images'}
                        </button>
                      </div>
                    </div>
                    {productFormImages.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
                        {productFormImages.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1', border: '2px solid', borderColor: idx === 0 ? '#C9A96E' : '#f3f4f6', background: '#f9fafb' }}>
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {idx === 0 && <span style={{ position: 'absolute', top: 4, left: 4, background: '#C9A96E', color: '#111', fontSize: 7, fontWeight: 800, borderRadius: 4, padding: '2px 5px', textTransform: 'uppercase' }}>Primary</span>}
                            <button type="button" onClick={() => setProductFormImages(prev => prev.filter((_, i) => i !== idx))}
                              style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: '#EF4444', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <X style={{ width: 10, height: 10, color: '#fff' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div onClick={() => document.getElementById('img-upload')?.click()}
                        style={{ border: '2px dashed #e5e7eb', borderRadius: 12, padding: '32px', textAlign: 'center', cursor: 'pointer', background: '#f9fafb' }}>
                        <UploadCloud style={{ width: 28, height: 28, color: '#D1D5DB', margin: '0 auto 10px', display: 'block' }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Click to upload images</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>JPG, PNG, WEBP (max 10MB each)</div>
                      </div>
                    )}
                  </div>

                  <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
                    {editingProduct && (
                      <button type="button" onClick={() => setEditingProduct(null)}
                        style={{ marginRight: 10, padding: '9px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
                        Cancel
                      </button>
                    )}
                    <button type="submit"
                      style={{ padding: '9px 24px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer', letterSpacing: 0.5 }}>
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                  </div>
                </form>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#9CA3AF' }} />
                    <input type="text" placeholder="Search products…" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      style={{ width: '100%', paddingLeft: 34, padding: '8px 12px 8px 34px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <select value={productCategoryFilter} onChange={e => setProductCategoryFilter(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 11, background: '#f9fafb', outline: 'none', fontWeight: 600 }}>
                    <option value="all">All Categories</option>
                    {categoriesList.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    {categoriesList.length === 0 && ['heels', 'sandals', 'flats', 'bags'].map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                  </select>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>{filteredProducts.length} results</span>
                </div>

                {/* Table */}
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                        {['Product', 'SKU', 'Price', 'Stock', 'Status', ''].map(h => (
                          <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(p => {
                        const isLow = p.stock <= 3, isOut = p.stock === 0
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{p.name}</div>
                              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' }}>{p.category}</div>
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{p.sku}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13, color: '#111827' }}>₹{(p.price / 100).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: isOut ? '#FEF2F2' : isLow ? '#FFFBEB' : '#F0FDF4', color: isOut ? '#DC2626' : isLow ? '#D97706' : '#059669' }}>
                                {p.stock} units
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: p.active ? '#F0FDF4' : '#F9FAFB', color: p.active ? '#059669' : '#9CA3AF' }}>
                                {p.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button onClick={() => { setEditingProduct(p); setProductFormName(p.name); setProductFormSKU(p.sku); setProductFormPrice(p.price / 100); setProductFormMrp(p.original_price ? p.original_price / 100 : p.price / 100); setProductFormStock(p.stock); setProductFormCategory(p.category); setProductFormImages(p.images || []); setProductFormSizes(p.sizes || ['36', '37', '38', '39', '40', '41']) }}
                                style={{ width: 30, height: 30, border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                                <Edit3 style={{ width: 13, height: 13 }} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: ORDERS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Online Orders</h3>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>Manage payments, shipping, and tracking</p>
                </div>

                {/* Order stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
                  {[
                    { label: 'All', count: orders.length, color: '#6B7280', bg: '#F9FAFB' },
                    { label: 'Placed', count: orders.filter(o => o.order_status === 'placed').length, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Shipped', count: orders.filter(o => o.order_status === 'shipped').length, color: '#6366F1', bg: '#F5F3FF' },
                    { label: 'Delivered', count: orders.filter(o => o.order_status === 'delivered').length, color: '#10B981', bg: '#F0FDF4' },
                    { label: 'Cancelled', count: orders.filter(o => o.order_status === 'cancelled').length, color: '#EF4444', bg: '#FEF2F2' },
                  ].map(stat => (
                    <button key={stat.label} onClick={() => setOrderStatusFilter(stat.label === 'All' ? 'all' : stat.label.toLowerCase())}
                      style={{ padding: '12px 16px', background: stat.bg, border: `2px solid ${orderStatusFilter === (stat.label === 'All' ? 'all' : stat.label.toLowerCase()) ? stat.color : 'transparent'}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.count}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', marginTop: 2 }}>{stat.label}</div>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#9CA3AF' }} />
                  <input type="text" placeholder="Search by order #, customer name, or phone…" value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: 34, padding: '10px 12px 10px 34px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Table */}
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                        {['Order #', 'Customer', 'Amount', 'Date', 'Status', ''].map(h => (
                          <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(ord => (
                        <tr key={ord.id} style={{ borderBottom: '1px solid #f9fafb' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#111827' }}>{ord.order_number}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{ord.customer_name}</div>
                            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{ord.customer_phone}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13 }}>₹{(ord.total_amount / 100).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                            <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, textTransform: 'uppercase', fontWeight: 700 }}>{ord.payment_status}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, background: `${STATUS_COLORS[ord.order_status]}20`, color: STATUS_COLORS[ord.order_status] || '#6B7280' }}>
                              {ord.order_status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button onClick={() => handleSelectOrder(ord)}
                              style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#374151' }}>
                              <Eye style={{ width: 12, height: 12 }} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No orders found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: INVENTORY
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'inventory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Inventory Management</h3>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>Monitor stock levels · Quick restock adjustments</p>
                </div>

                {/* Inventory KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                  {[
                    { label: 'Total SKUs', value: products.length, icon: '📦', color: '#3B82F6' },
                    { label: 'In Stock', value: products.filter(p => p.stock > 3).length, icon: '✅', color: '#10B981' },
                    { label: 'Low Stock', value: products.filter(p => p.stock > 0 && p.stock <= 3).length, icon: '⚠️', color: '#F59E0B' },
                    { label: 'Out of Stock', value: products.filter(p => p.stock === 0).length, icon: '🚨', color: '#EF4444' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 24 }}>{k.icon}</span>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stock bar chart */}
                <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Stock Level Distribution (Top 10)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={products.slice(0, 10).map(p => ({ name: p.name.substring(0, 15) + (p.name.length > 15 ? '…' : ''), stock: p.stock, sku: p.sku }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomChartTooltip prefix="" />} />
                      <Bar dataKey="stock" radius={[4, 4, 0, 0]} name="Stock">
                        {products.slice(0, 10).map((p, i) => (
                          <Cell key={i} fill={p.stock === 0 ? '#EF4444' : p.stock <= 3 ? '#F59E0B' : '#10B981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Inventory table */}
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                        {['Product', 'SKU', 'Stock Level', 'Status', 'Adjust'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Adjust' ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => {
                        const isLow = p.stock <= 3, isOut = p.stock === 0
                        const pct = Math.min(100, (p.stock / 50) * 100)
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{p.name}</div>
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>{p.sku}</td>
                            <td style={{ padding: '12px 16px', width: 180 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: isOut ? '#EF4444' : isLow ? '#F59E0B' : '#10B981', borderRadius: 3, transition: 'width 0.4s ease' }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 800, color: '#111827', flexShrink: 0 }}>{p.stock}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: isOut ? '#FEF2F2' : isLow ? '#FFFBEB' : '#F0FDF4', color: isOut ? '#DC2626' : isLow ? '#D97706' : '#059669' }}>
                                {isOut ? 'Out of Stock' : isLow ? 'Low' : 'Good'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button onClick={async () => {
                                  const ns = Math.max(0, p.stock - 1)
                                  await fetch(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...p, stock: ns }) })
                                  loadTabDetails()
                                }} style={{ width: 28, height: 28, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6B7280' }}>
                                  <Minus style={{ width: 12, height: 12 }} />
                                </button>
                                <button onClick={async () => {
                                  const ns = p.stock + 5
                                  await fetch(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...p, stock: ns }) })
                                  showToast('success', '+5 units added', p.sku)
                                  loadTabDetails()
                                }} style={{ padding: '0 12px', height: 28, border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#C9A96E' }}>
                                  +5
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: CATEGORIES
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'categories' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <div><h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Categories</h3></div>
                  <button onClick={() => { setEditingItem(null); setCatFormName(''); setCatFormSlug(''); setCatFormDesc(''); setCatFormImg(''); setCatFormSort(0) }}
                    style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                    + New Category
                  </button>
                </div>
                <form onSubmit={handleCategorySubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#faf8f4', border: '1px solid #FCDDA7', borderRadius: 16, padding: 24 }}>
                  {[['Name', catFormName, setCatFormName, 'e.g. Wedges'], ['Slug', catFormSlug, setCatFormSlug, 'e.g. wedges'], ['Image URL', catFormImg, setCatFormImg, 'https://…']].map(([label, val, setter, ph]) => (
                    <div key={label as string}>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label as string}</label>
                      <input type="text" required={['Name', 'Slug'].includes(label as string)} placeholder={ph as string} value={val as string} onChange={e => (setter as any)(e.target.value)}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Sort Order</label>
                    <input type="number" value={catFormSort} onChange={e => setCatFormSort(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Description</label>
                    <textarea rows={2} value={catFormDesc} onChange={e => setCatFormDesc(e.target.value)} placeholder="Category description…"
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
                    <button type="submit" style={{ padding: '9px 24px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                      {editingItem ? 'Update' : 'Create'} Category
                    </button>
                  </div>
                </form>
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Name', 'Slug', 'Sort', ''].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {categoriesList.map(cat => (
                        <tr key={cat.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>{cat.name}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>{cat.slug}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{cat.sort_order}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditingItem(cat); setCatFormName(cat.name); setCatFormSlug(cat.slug); setCatFormDesc(cat.description || ''); setCatFormImg(cat.image_url || ''); setCatFormSort(cat.sort_order || 0) }}
                              style={{ width: 30, height: 30, border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                              <Edit3 style={{ width: 13, height: 13 }} />
                            </button>
                            <button onClick={() => handleDeleteCategory(cat.id)}
                              style={{ padding: '0 12px', height: 30, border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: COUPONS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'coupons' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Coupon Codes</h3>
                  <button onClick={() => { setEditingItem(null); setCouponCode(''); setCouponDiscType('percentage'); setCouponDiscValue(0); setCouponMinPurchase(0) }}
                    style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                    + New Coupon
                  </button>
                </div>
                <form onSubmit={handleCouponSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#faf8f4', border: '1px solid #FCDDA7', borderRadius: 16, padding: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Coupon Code</label>
                    <input type="text" required value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. SHOESUP10"
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Discount Type</label>
                    <select value={couponDiscType} onChange={e => setCouponDiscType(e.target.value as any)}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', fontWeight: 600 }}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Discount Value</label>
                    <input type="number" required value={couponDiscValue} onChange={e => setCouponDiscValue(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Min Purchase (₹)</label>
                    <input type="number" value={couponMinPurchase} onChange={e => setCouponMinPurchase(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
                    <button type="submit" style={{ padding: '9px 24px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                      {editingItem ? 'Update' : 'Create'} Coupon
                    </button>
                  </div>
                </form>
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Code', 'Discount', 'Min Order', ''].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {couponsList.map(cp => (
                        <tr key={cp.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#111827', background: '#F3F4F6', padding: '3px 10px', borderRadius: 6 }}>{cp.code}</span></td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>{cp.discount_type === 'percentage' ? `${cp.discount_value}% off` : `₹${cp.discount_value} off`}</td>
                          <td style={{ padding: '12px 16px', color: '#6B7280' }}>₹{cp.min_purchase} minimum</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditingItem(cp); setCouponCode(cp.code); setCouponDiscType(cp.discount_type); setCouponDiscValue(cp.discount_value); setCouponMinPurchase(cp.min_purchase || 0) }}
                              style={{ width: 30, height: 30, border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                              <Edit3 style={{ width: 13, height: 13 }} />
                            </button>
                            <button onClick={() => handleDeleteCoupon(cp.id)}
                              style={{ padding: '0 12px', height: 30, border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: BANNERS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'banners' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Slideshow Banners</h3>
                  <button onClick={() => { setEditingItem(null); setBannerTitle(''); setBannerSubtitle(''); setBannerImg(''); setBannerLink('') }}
                    style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                    + New Banner
                  </button>
                </div>
                <form onSubmit={handleBannerSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#faf8f4', border: '1px solid #FCDDA7', borderRadius: 16, padding: 24 }}>
                  {[['Title', bannerTitle, setBannerTitle, 'e.g. Premium Footwear', true], ['Image URL', bannerImg, setBannerImg, 'https://…', true], ['Subtitle', bannerSubtitle, setBannerSubtitle, '', false], ['Link URL', bannerLink, setBannerLink, '/shop?category=heels', false]].map(([label, val, setter, ph, req]) => (
                    <div key={label as string}>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label as string}</label>
                      <input type="text" required={!!req} placeholder={ph as string} value={val as string} onChange={e => (setter as any)(e.target.value)}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
                    <button type="submit" style={{ padding: '9px 24px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                      {editingItem ? 'Update' : 'Create'} Banner
                    </button>
                  </div>
                </form>
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Banner', 'Link', ''].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {bannersList.map(bn => (
                        <tr key={bn.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#111827' }}>{bn.title}</div>
                            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{bn.subtitle}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>{bn.link}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditingItem(bn); setBannerTitle(bn.title); setBannerSubtitle(bn.subtitle || ''); setBannerImg(bn.image_url); setBannerLink(bn.link || '') }}
                              style={{ width: 30, height: 30, border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                              <Edit3 style={{ width: 13, height: 13 }} />
                            </button>
                            <button onClick={() => handleDeleteBanner(bn.id)}
                              style={{ padding: '0 12px', height: 30, border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: REVIEWS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Reviews Moderation</h3>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>{reviewsList.filter(r => !r.approved).length} pending approval</p>
                </div>
                {reviewsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No reviews submitted yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reviewsList.map(rev => (
                      <div key={rev.id} style={{ border: '1px solid #f3f4f6', borderRadius: 14, padding: '16px 20px', background: rev.approved ? '#fafafa' : '#FFFBEB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{rev.user_name || 'Verified Customer'}</span>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} style={{ width: 12, height: 12, fill: i < (rev.rating || 5) ? '#F59E0B' : 'transparent', color: '#F59E0B' }} />
                              ))}
                            </div>
                            <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 700 }}>{new Date(rev.created_at).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: 12, color: '#374151', fontStyle: 'italic', margin: 0 }}>"{rev.comment}"</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => handleToggleReviewStatus(rev.id, rev.approved)}
                            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${rev.approved ? '#D1FAE5' : '#FDE68A'}`, background: rev.approved ? '#F0FDF4' : '#FFFBEB', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: rev.approved ? '#059669' : '#D97706' }}>
                            {rev.approved ? '✓ Approved' : 'Approve'}
                          </button>
                          <button onClick={() => handleDeleteReview(rev.id)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: '#DC2626' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: PAGES
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'pages' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Policy Pages</h3>
                  <button onClick={() => { setEditingItem(null); setPageTitle(''); setPageContent('') }}
                    style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                    + New Page
                  </button>
                </div>
                <form onSubmit={handlePageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#faf8f4', border: '1px solid #FCDDA7', borderRadius: 16, padding: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Page Title</label>
                    <input type="text" required value={pageTitle} onChange={e => setPageTitle(e.target.value)} placeholder="e.g. Terms and Conditions"
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>HTML / Text Content</label>
                    <textarea required rows={8} value={pageContent} onChange={e => setPageContent(e.target.value)} placeholder="<h3>Privacy Policy</h3><p>We care about…</p>"
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 11, background: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button type="submit" style={{ padding: '9px 24px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                      {editingItem ? 'Update' : 'Save'} Page
                    </button>
                  </div>
                </form>
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Title', 'URL', ''].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {pagesList.map(pg => (
                        <tr key={pg.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>{pg.title}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#3B82F6' }}>/{pg.slug}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={async () => {
                              const res = await fetch(`/api/admin/pages/${pg.id}`, { headers: { Authorization: `Bearer ${token}` } })
                              const data = await res.json()
                              if (data.success) { setEditingItem(data.data); setPageTitle(data.data.title); setPageContent(data.data.content) }
                            }} style={{ width: 30, height: 30, border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                              <Edit3 style={{ width: 13, height: 13 }} />
                            </button>
                            <button onClick={() => handleDeletePage(pg.id)}
                              style={{ padding: '0 12px', height: 30, border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: STAFF
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Staff Accounts</h3>
                  <button onClick={() => { setEditingItem(null); setStaffName(''); setStaffEmail(''); setStaffPassword(''); setStaffRole('staff') }}
                    style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                    + Add Member
                  </button>
                </div>
                <form onSubmit={handleStaffSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#faf8f4', border: '1px solid #FCDDA7', borderRadius: 16, padding: 24 }}>
                  {[['Full Name', staffName, setStaffName, 'text', false], ['Email Address', staffEmail, setStaffEmail, 'email', false], ['Password', staffPassword, setStaffPassword, 'password', false]].map(([label, val, setter, type, req]) => (
                    <div key={label as string}>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label as string}{editingItem && label === 'Password' && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> (leave blank to keep)</span>}</label>
                      <input type={type as string} required={!editingItem || label !== 'Password'} value={val as string} onChange={e => (setter as any)(e.target.value)}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Role</label>
                    <select value={staffRole} onChange={e => setStaffRole(e.target.value as any)}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', fontWeight: 600 }}>
                      <option value="staff">Staff Assistant</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
                    <button type="submit" style={{ padding: '9px 24px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                      {editingItem ? 'Update' : 'Add'} Staff
                    </button>
                  </div>
                </form>
                <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Name', 'Email', 'Role', ''].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 9, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {staffList.map(st => (
                        <tr key={st.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#C9A96E,#b17e3f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', fontWeight: 800, fontSize: 13 }}>{st.name[0]?.toUpperCase()}</div>
                              <span style={{ fontWeight: 700, color: '#111827' }}>{st.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>{st.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', background: st.role === 'admin' ? '#FEF7EE' : '#F9FAFB', color: st.role === 'admin' ? '#92400E' : '#6B7280', border: `1px solid ${st.role === 'admin' ? '#FCDDA7' : '#e5e7eb'}` }}>
                              {st.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditingItem(st); setStaffName(st.name); setStaffEmail(st.email); setStaffPassword(''); setStaffRole(st.role) }}
                              style={{ width: 30, height: 30, border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                              <Edit3 style={{ width: 13, height: 13 }} />
                            </button>
                            <button onClick={() => handleDeleteStaff(st.id)}
                              style={{ padding: '0 12px', height: 30, border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: SETTINGS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>Store Settings</h3>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>Configure gateways, email, and store details</p>
                  </div>
                  <button type="submit" disabled={savingSettings}
                    style={{ padding: '9px 20px', background: savingSettings ? '#9CA3AF' : '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: 'pointer' }}>
                    {savingSettings ? 'Saving…' : 'Save Settings'}
                  </button>
                </div>

                {[
                  { title: '🏪 General Configuration', fields: [['Store Name', 'store_name', 'text', 'HeelsUp'], ['Support Phone', 'support_phone', 'text', '+91 7891470935'], ['Support Email', 'store_email', 'email', 'support@heelsup.in'], ['Address', 'store_address', 'text', 'Jodhpur, Rajasthan']] },
                  { title: '💳 Razorpay Gateway', fields: [['Key ID', 'razorpay_key_id', 'text', 'rzp_live_…'], ['Key Secret', 'razorpay_key_secret', 'password', '••••••••']] },
                  { title: '🌐 Social & Identity', fields: [['Instagram URL', 'social_instagram', 'text', 'https://instagram.com/heel_s_up'], ['Google Client ID', 'google_client_id', 'text', 'For Google login…']] },
                ].map(section => (
                  <div key={section.title} style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 16 }}>{section.title}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {section.fields.map(([label, key, type, ph]) => (
                        <div key={key}>
                          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</label>
                          <input type={type} placeholder={ph} value={storeSettings[key] || ''}
                            onChange={e => setStoreSettings({ ...storeSettings, [key]: e.target.value })}
                            style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                    {section.title.includes('Razorpay') && (
                      <button type="button" onClick={handleTestRazorpay} disabled={testingRzp}
                        style={{ marginTop: 16, padding: '8px 18px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {testingRzp ? '⏳ Testing…' : '🔌 Test Connection'}
                      </button>
                    )}
                  </div>
                ))}
              </form>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: REPORTS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia,serif', color: '#111827', margin: 0 }}>📊 Analytics & Reports</h3>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, margin: 0 }}>Filter, visualize, print, and export from D1 ledger</p>
                  </div>
                  {reportsData && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => window.print()}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
                        <Printer style={{ width: 13, height: 13 }} /> Print
                      </button>
                      <button onClick={handleExportCSV}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 10, background: '#C9A96E', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#111' }}>
                        <Download style={{ width: 13, height: 13 }} /> Export CSV
                      </button>
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 20 }}>
                  {[
                    { label: 'Dataset', el: <select value={reportType} onChange={e => setReportType(e.target.value as any)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none' }}><option value="sales">Sales & Revenue</option><option value="inventory">Inventory</option><option value="customers">Customers</option><option value="orders">Orders</option></select> },
                    { label: 'From', el: <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} /> },
                    { label: 'To', el: <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' }} /> },
                    { label: ' ', el: <button onClick={loadReport} disabled={loadingReport} style={{ width: '100%', padding: '9px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#C9A96E', cursor: loadingReport ? 'wait' : 'pointer', opacity: loadingReport ? 0.6 : 1 }}>{loadingReport ? 'Loading…' : 'Generate Report'}</button> },
                  ].map(item => (
                    <div key={item.label}>
                      {item.label.trim() && <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{item.label}</label>}
                      {item.el}
                    </div>
                  ))}
                </div>

                {/* Report content */}
                {loadingReport ? (
                  <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ width: 36, height: 36, border: '3px solid #C9A96E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Compiling report data…</div>
                  </div>
                ) : !reportsData ? (
                  <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed #e5e7eb', borderRadius: 16 }}>
                    <BarChart2 style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px', display: 'block' }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>No report generated</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>Select parameters above and click Generate</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Sales report */}
                    {reportType === 'sales' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                          {[
                            { label: 'Total Orders', value: reportsData.summary?.total_orders || 0, color: '#3B82F6' },
                            { label: 'Total Revenue', value: `₹${((reportsData.summary?.total_revenue || 0) / 100).toLocaleString('en-IN')}`, color: '#C9A96E' },
                            { label: 'Avg Order Value', value: `₹${((reportsData.summary?.avg_order_value || 0) / 100).toLocaleString('en-IN')}`, color: '#8B5CF6' },
                            { label: 'Unique Customers', value: reportsData.summary?.unique_customers || 0, color: '#10B981' },
                          ].map((m, i) => (
                            <div key={i} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 12, padding: 20 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{m.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Daily revenue chart */}
                        {reportsData.daily?.length > 0 && (
                          <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 16 }}>Daily Revenue Trend</div>
                            <ResponsiveContainer width="100%" height={200}>
                              <ComposedChart data={reportsData.daily}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="r" orientation="left" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 100).toFixed(0)}`} />
                                <YAxis yAxisId="o" orientation="right" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(val: any, name: string) => [name === 'Revenue' ? `₹${(val / 100).toLocaleString()}` : val, name]} />
                                <Bar yAxisId="r" dataKey="revenue" fill={`${CHART_COLORS.gold}60`} radius={[3, 3, 0, 0]} name="Revenue" />
                                <Line yAxisId="o" type="monotone" dataKey="orders" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3 }} name="Orders" />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Top products */}
                        <div style={{ border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: 12, fontWeight: 800, color: '#111827' }}>🏆 Top Products by Revenue</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb' }}>{['Product', 'SKU', 'Units', 'Revenue'].map(h => <th key={h} style={{ padding: '10px 16px', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {(reportsData.top_products || []).map((p: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                                  <td style={{ padding: '10px 16px', fontWeight: 700, color: '#111827' }}>{p.name}</td>
                                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>{p.product_sku}</td>
                                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>{p.units_sold}</td>
                                  <td style={{ padding: '10px 16px', fontWeight: 800, color: '#C9A96E' }}>₹{(p.revenue / 100).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Inventory report */}
                    {reportType === 'inventory' && (
                      <>
                        <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '1px solid #FCD34D', borderRadius: 12, padding: '16px 20px', display: 'inline-flex', gap: 16, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Total Inventory Value</span>
                          <span style={{ fontSize: 22, fontWeight: 800, color: '#C9A96E' }}>₹{((reportsData.total_inventory_value || 0) / 100).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          {[['⚠️ Low Stock', reportsData.low_stock, 'amber'], ['🚨 Out of Stock', reportsData.out_of_stock, 'rose']].map(([title, items, c]: any) => (
                            <div key={title} style={{
                              border:
                                1px solid ${c === 'amber' ? '#FCD34D' : '#FCA5A5'},
                            borderRadius: 12,
                                background: c === 'amber' ? '#FFFBEB' : '#FEF2F2', overflow: 'hidden' }}>
                          <div style={{ background: c === 'amber' ? '#FCD34D' : '#FCA5A5', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{title}</span>
                              <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 20 }}>{(items || []).length}</span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#000000', textTransform: 'uppercase' }}>{c}</span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: c === 'amber' ? '#FEF3C7' : '#FEE2E2' }}>{['SKU', 'Name', 'Stock', 'Price'].map(h => <th key={h} style={{ padding: '10px 16px', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {(items || []).slice(0, 6).map((i: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>{i.product_sku}</td>
                                  <td style={{ padding: '10px 16px', fontWeight: 700, color: '#111827' }}>{i.name}</td>
                                  <td style={{ padding: '10px 16px', fontWeight: 800 }}>{i.stock_quantity}</td>
                                  <td style={{ padding: '10px 16px', fontWeight: 800, color: '#C9A96E' }}>₹{(i.price / 100).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {items?.length > 6 && (
                            <div style={{ background: '#f9fafb', padding: '8px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
                              {items.length - 6} more {items.length - 6 === 1 ? 'item' : 'items'}
                            </div>
                          )}
                        </div>
                          ))}
                      </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
          )}  {/* End of reports tab content */}