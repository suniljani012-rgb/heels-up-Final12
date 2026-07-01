import React, { useState, useEffect, useMemo } from 'react';
import HeicImage from '../components/HeicImage';
import {
  LayoutDashboard, ShoppingCart, Package, LogOut, Plus, Edit3, Settings, Tag, Star, Users,
  FileText, Image as ImageIcon, UploadCloud, AlertTriangle, CheckCircle2, X, ChevronRight, ChevronLeft,
  Search, RotateCw, Trash2, Percent, Activity, Sliders, RefreshCw,
  Printer, Database, Shield, Play, HelpCircle, Eye, Check, Download, Truck, Minus
} from 'lucide-react';

// --- TypeScript Interfaces ---
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
  sold_count?: number;
}

interface Order {
  id: any;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  order_status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'Completed' | any;
  payment_status: string;
  payment_method: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  courier_name?: string;
  source: 'web' | 'pos' | 'whatsapp' | 'instagram' | any;
  items: OrderItem[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  is_pos?: boolean;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  delivery_method?: string;
}

interface OrderItem {
  id: any;
  product_id?: any;
  product_name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  active: boolean;
}



interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  max_discount?: number;
  max_uses?: number;
  used_count: number;
  active: boolean;
  expires_at?: string;
  description?: string;
}

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
  active: boolean;
  sort_order: number;
}

interface PageConfig {
  id: number;
  title: string;
  slug: string;
  content: string;
  active: boolean;
}

interface Staff {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff' | string;
  is_blocked: boolean;
  is_active?: number;
  permissions?: string;
  notes?: string;
  last_login_at?: string;
  created_at?: string;
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
  is_blocked: boolean;
}

interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  user_id: number;
  reviewer_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  refund_amount: number;
  admin_notes?: string;
  created_at: string;
  description?: string;
  items?: any[];
  images?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  reviewer_name: string;
  product_name: string;
  product_id: number;
  status: 'pending' | 'approved' | 'rejected';
}

// ── GLOBAL FETCH INTERCEPTOR SETUP ──────────────────────────────────────────
if (typeof window !== 'undefined' && !(window as any).__fetch_intercepted) {
  (window as any).__fetch_intercepted = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    if (url.startsWith('/api/')) {
      init = init || {};
      init.headers = init.headers || {};
      const token = localStorage.getItem('heelsup_token');
      if (token) {
        if (init.headers instanceof Headers) {
          if (!init.headers.has('Authorization')) {
            init.headers.set('Authorization', `Bearer ${token}`);
          }
        } else if (Array.isArray(init.headers)) {
          if (!init.headers.some(([k]) => k.toLowerCase() === 'authorization')) {
            init.headers.push(['Authorization', `Bearer ${token}`]);
          }
        } else {
          if (!(init.headers as any)['Authorization']) {
            (init.headers as any)['Authorization'] = `Bearer ${token}`;
          }
        }
      }
    }
    const response = await originalFetch(input, init);
    if (url.startsWith('/api/') && (response.status === 401 || response.status === 451) && !url.includes('/api/auth/login')) {
      console.warn('Authentication token expired or unauthorized. Logging out.');
      localStorage.removeItem('heelsup_token');
      localStorage.removeItem('heelsup_user');
      window.dispatchEvent(new Event('heelsup_unauthorized'));
    }
    return response;
  };
}

export default function Admin() {
  // Authentication State
  const [user, setUser] = useState<{ name: string; role: string; email: string; permissions?: string[] } | null>(() => {
    const savedUser = localStorage.getItem('heelsup_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch { return null; }
    }
    return null;
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Password Recovery States
  const [resetStep, setResetStep] = useState<'login' | 'forgot_email' | 'reset_otp'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Active Panel Navigation Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'stock' | 'orders' | 'categories' | 'customers' | 'reviews' | 'coupons' | 'banners' | 'pages' | 'settings' | 'pos' | 'sql' | 'audits' | 'returns' | 'analysis' | 'staff' | 'colors'>('dashboard');

  // Sidebar Layout Collapsed State
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Lists & States for Dashboard
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [bannersList, setBannersList] = useState<Banner[]>([]);
  const [pagesList, setPageConfigsList] = useState<PageConfig[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [returnsList, setReturnsList] = useState<ReturnRequest[]>([]);
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [posSalesList, setPosSalesList] = useState<any[]>([]);
  const [rawColorsList, setRawColorsList] = useState<{ color_name: string; hex_code: string }[]>([]);

  // Colors Tab CRUD States
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLedger, setExportLedger] = useState(true);
  const [exportCategory, setExportCategory] = useState(true);
  const [exportInventory, setExportInventory] = useState(true);
  const [exportChannel, setExportChannel] = useState(true);
  const [exportCustomer, setExportCustomer] = useState(true);
  const [editingColor, setEditingColor] = useState<{ color_name: string; hex_code: string } | null>(null);
  const [colorNameInput, setColorNameInput] = useState('');
  const [colorHexInput, setColorHexInput] = useState('');

  // Staff Tab CRUD States
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('staff');
  const [staffNotes, setStaffNotes] = useState('');
  const [staffActive, setStaffActive] = useState(true);
  const [staffPermissions, setStaffPermissions] = useState<string[]>(['dashboard', 'orders', 'pos']);

  // Advanced Business Analysis Filters
  const [analysisDatePreset, setAnalysisDatePreset] = useState<'7' | '15' | '30' | '90' | 'custom'>('30');
  const [analysisStartDate, setAnalysisStartDate] = useState('');
  const [analysisEndDate, setAnalysisEndDate] = useState('');
  const [analysisCustomerSearch, setAnalysisCustomerSearch] = useState('');
  const [analysisProductSearch, setAnalysisProductSearch] = useState('');
  const [analysisCategoryFilter, setAnalysisCategoryFilter] = useState('all');
  const [analysisChannel, setAnalysisChannel] = useState<'all' | 'web' | 'pos'>('all');
  const [analysisMinAmt, setAnalysisMinAmt] = useState('');
  const [analysisMaxAmt, setAnalysisMaxAmt] = useState('');

  // NEW: Colors states for modal & POS
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [prodColor, setProdColor] = useState('Default');
  const [prodColorCustom, setProdColorCustom] = useState('');

  // NEW: Real-time alerts states
  const [unseenOrders, setUnseenOrders] = useState<number>(0);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);
  const [showOrderBanner, setShowOrderBanner] = useState<string | null>(null);

  // NEW: SVG interactive states
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [hoveredCategoryAnalysis, setHoveredCategoryAnalysis] = useState<number | null>(null);
  const [hoveredPointAnalysis, setHoveredPointAnalysis] = useState<number | null>(null);

  // NEW: AdminLTE Chart States (Interactivity: Collapse and Visibility)
  const [collapsedSalesTrend, setCollapsedSalesTrend] = useState(false);
  const [visibleSalesTrend, setVisibleSalesTrend] = useState(true);
  const [collapsedCategoryShare, setCollapsedCategoryShare] = useState(false);
  const [visibleCategoryShare, setVisibleCategoryShare] = useState(true);
  const [collapsedStockWarning, setCollapsedStockWarning] = useState(false);
  const [visibleStockWarning, setVisibleStockWarning] = useState(true);

  const [collapsedCategoryRevenueShare, setCollapsedCategoryRevenueShare] = useState(false);
  const [visibleCategoryRevenueShare, setVisibleCategoryRevenueShare] = useState(true);
  const [collapsedCategorySalesVolume, setCollapsedCategorySalesVolume] = useState(false);
  const [visibleCategorySalesVolume, setVisibleCategorySalesVolume] = useState(true);
  const [collapsedFilteredRevenueTrend, setCollapsedFilteredRevenueTrend] = useState(false);
  const [visibleFilteredRevenueTrend, setVisibleFilteredRevenueTrend] = useState(true);
  const [collapsedAverageItemValue, setCollapsedAverageItemValue] = useState(false);
  const [visibleAverageItemValue, setVisibleAverageItemValue] = useState(true);

  // Loading States
  const [dataLoading, setDataLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Toasts list
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Category and Live Dashboard Analytics helpers
  const getProductCategory = (productId: number | string | null | undefined, productName: string): string => {
    if (productId) {
      const p = productsList.find(x => String(x.id) === String(productId));
      if (p && p.category) return p.category;
    }
    const nameLower = (productName || '').toLowerCase();
    const matched = productsList.find(x => nameLower.includes((x.name || '').toLowerCase()) && x.category);
    if (matched) return matched.category;

    if (nameLower.includes('wedge')) return 'Wedges';
    if (nameLower.includes('flat')) return 'Flats';
    if (nameLower.includes('block') || nameLower.includes('heel')) return 'Block Heels';
    if (nameLower.includes('stiletto')) return 'Stilettos';
    if (nameLower.includes('pump')) return 'Pumps';
    return 'Footwear';
  };

  const getDashboardDailyRevenue = () => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    const map: Record<string, { date: string; revenue: number; count: number }> = {};
    dates.forEach(d => {
      const parts = d.split('-');
      const displayDate = `${parts[1]}-${parts[2]}`;
      map[d] = { date: displayDate, revenue: 0, count: 0 };
    });

    ordersList.forEach((o: any) => {
      const dateStr = o.created_at?.slice(0, 10);
      if (map[dateStr] && o.payment_status === 'paid' && o.order_status !== 'cancelled') {
        map[dateStr].revenue += o.total_amount;
        map[dateStr].count += 1;
      }
    });

    posSalesList.forEach((s: any) => {
      const dateStr = s.created_at?.slice(0, 10);
      if (map[dateStr]) {
        map[dateStr].revenue += s.total;
        map[dateStr].count += 1;
      }
    });

    return Object.values(map);
  };

  const getDashboardCategorySales = () => {
    const categoryMap: Record<string, number> = {};
    
    const addSale = (productId: number | string | null | undefined, productName: string, rev: number) => {
      const cat = getProductCategory(productId, productName);
      categoryMap[cat] = (categoryMap[cat] || 0) + rev;
    };

    ordersList.forEach((o: any) => {
      if (o.payment_status === 'paid' && o.order_status !== 'cancelled') {
        if (Array.isArray(o.items)) {
          o.items.forEach((it: any) => {
            const pId = it.product_id || it.productId;
            const pName = it.product_name || it.name || '';
            const qty = it.quantity || it.qty || 1;
            const price = it.price || it.unit_price || 0;
            addSale(pId, pName, price * qty);
          });
        }
      }
    });

    posSalesList.forEach((s: any) => {
      if (s.items_json) {
        try {
          const parsed = JSON.parse(s.items_json);
          parsed.forEach((it: any) => {
            const pId = it.product_id || it.productId;
            const pName = it.product_name || it.name || '';
            const qty = it.quantity || it.qty || 1;
            const price = it.unit_price || it.price || 0;
            addSale(pId, pName, price * qty);
          });
        } catch (_) {}
      }
    });

    const result = Object.entries(categoryMap).map(([category, revenue]) => ({ category, revenue }));
    if (result.length === 0) {
      return [
        { category: 'Wedges', revenue: 0 },
        { category: 'Block Heels', revenue: 0 },
        { category: 'Flats', revenue: 0 }
      ];
    }
    return result.sort((a, b) => b.revenue - a.revenue);
  };

  const getAnalysisCategoryData = () => {
    const filtered = getFilteredTransactions();
    const map: Record<string, { category: string; revenue: number; quantity: number; orderCount: number; dailyTrend: Record<string, number> }> = {};

    filtered.forEach((t) => {
      const dateStr = t.created_at?.slice(0, 10) || '';

      if (Array.isArray(t.raw_items) && t.raw_items.length > 0) {
        t.raw_items.forEach((it: any) => {
          const pId = it.product_id || it.productId;
          const pName = it.product_name || it.name || '';
          const qty = it.quantity || it.qty || 1;
          const price = it.price || it.unit_price || 0;
          const cat = getProductCategory(pId, pName);

          if (!map[cat]) {
            map[cat] = { category: cat, revenue: 0, quantity: 0, orderCount: 0, dailyTrend: {} };
          }
          map[cat].revenue += price * qty;
          map[cat].quantity += qty;
          map[cat].dailyTrend[dateStr] = (map[cat].dailyTrend[dateStr] || 0) + price * qty;
        });
      } else {
        const cat = 'Footwear';
        if (!map[cat]) {
          map[cat] = { category: cat, revenue: 0, quantity: 0, orderCount: 0, dailyTrend: {} };
        }
        map[cat].revenue += t.total;
        map[cat].quantity += 1;
        map[cat].dailyTrend[dateStr] = (map[cat].dailyTrend[dateStr] || 0) + t.total;
      }
    });

    return Object.values(map);
  };

  // Filter States
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderSourceFilter, setOrderSourceFilter] = useState<'all' | 'web' | 'pos'>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');

  // Pagination states
  const [productPage, setProductPage] = useState(0);
  const [orderPage, setOrderPage] = useState(0);
  const [customerPage, setCustomerPage] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const itemsPerPage = 15;

  // Selected details drawers
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);

  // Product Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodMrp, setProdMrp] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImages, setProdImages] = useState<string[]>(['']);
  const [prodSizes, setProdSizes] = useState<string[]>(['36', '37', '38', '39', '40', '41']);
  const [prodActive, setProdActive] = useState(true);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodNew, setProdNew] = useState(true);
  const [prodTrending, setProdTrending] = useState(false);
  const [prodShowMrp, setProdShowMrp] = useState(true);
  const [prodBrand, setProdBrand] = useState('HeelsUp');
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [prodMetaTitle, setProdMetaTitle] = useState('');
  const [prodMetaDesc, setProdMetaDesc] = useState('');
  const [prodSizeStocks, setProdSizeStocks] = useState<Record<string, number>>({});

  // Coupon Modals
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('');
  const [couponMinOrder, setCouponMinOrder] = useState('');
  const [couponActive, setCouponActive] = useState(true);
  const [couponDescription, setCouponDescription] = useState('');

  // Category Modals
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('0');
  const [catActive, setCatActive] = useState(true);

  // Banner Modals
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerSortOrder, setBannerSortOrder] = useState('0');

  // Page Modals
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageConfig | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [pageActive, setPageActive] = useState(true);

  // Stock quick update state
  const [stockUpdates, setStockUpdates] = useState<Record<string, Record<string, number>>>({});

  // SQL Console inline state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM products LIMIT 10;');
  const [sqlResults, setSqlResults] = useState<any | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  // POS Cart State
  const [posCart, setPosCart] = useState<{ product: Product; size: string; color: string; qty: number; price: number }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [posDiscount, setPosDiscount] = useState('0');
  const [posNotes, setPosNotes] = useState('');
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [posCatFilter, setPosCatFilter] = useState('');
  const [posSelectedProduct, setPosSelectedProduct] = useState<Product | null>(null);
  const [posSelectedSize, setPosSelectedSize] = useState('38');
  const [posSelectedQty, setPosSelectedQty] = useState(1);
  const [posSelectedColor, setPosSelectedColor] = useState('Default');

  // Returns manager status modal
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnStatus, setReturnStatus] = useState<'approved' | 'rejected'>('approved');
  const [returnNotes, setReturnNotes] = useState('');

  // Toast Creator Helper
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const token = localStorage.getItem('heelsup_token');

  // Fetch helper
  const fetchSec = async (endpoint: string, setter: Function) => {
    if (!token) return;
    try {
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setter(data.data);
      }
    } catch (e) {
      console.error(`Fetch error at ${endpoint}:`, e);
    }
  };

  // Synthesizer Audio Alerts using Web Audio API (CORS & CDN free)
  const playAlertSound = () => {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // First note (ding)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5 note
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Second note (dong) - delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1109.73, now + 0.15); // C#6 note
      gain2.gain.setValueAtTime(0.15, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.error('Audio synthesis failed:', e);
    }
  };

  // Load Database Colors Hex Map
  const loadColors = async () => {
    try {
      const res = await fetch('/api/colors');
      const data = await res.json();
      if (data.success && data.data) {
        setRawColorsList(data.data);
        const map: Record<string, string> = {};
        data.data.forEach((c: any) => {
          map[c.color_name.toLowerCase().trim()] = c.hex_code;
        });
        setColorMap(map);
      }
    } catch (e) {
      console.error('Failed to load colors:', e);
    }
  };

  // Main Load Data
  const loadAllData = async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      await Promise.all([
        fetchSec('/api/admin/dashboard', setDashboardData),
        fetchSec('/api/admin/products?limit=250&all=true', setProductsList),
        fetchSec('/api/admin/orders?limit=250', setOrdersList),
        fetchSec('/api/admin/customers?limit=250', setCustomersList),
        fetchSec('/api/admin/categories', setCategoriesList),
        fetchSec('/api/admin/coupons', setCouponsList),
        fetchSec('/api/admin/banners', setBannersList),
        fetchSec('/api/admin/reviews', setReviewsList),
        fetchSec('/api/admin/pages', setPageConfigsList),
        fetchSec('/api/admin/staff', setStaffList),
        fetchSec('/api/admin/settings', setSettingsList),
        fetchSec('/api/admin/returns', setReturnsList),
        fetchSec('/api/admin/pos/sales?all=true', setPosSalesList),
        loadColors(),
      ]);
    } catch (e) {
      showToast('error', 'Sync Failure', 'Failed to retrieve administrative data.');
    } finally {
      setDataLoading(false);
    }
  };

  // Initial Data Sync
  useEffect(() => {
    if (token && user) {
      loadAllData();
    }
  }, [token, user]);

  // Set Initial Order Count for Alerting
  useEffect(() => {
    if (ordersList.length > 0 && lastOrderCount === null) {
      setLastOrderCount(ordersList.length);
    }
  }, [ordersList]);

  // Polling loop for real-time new orders with Chime alert
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/orders?limit=250', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const fetchedOrders = data.data;
          if (lastOrderCount !== null && fetchedOrders.length > lastOrderCount) {
            const diff = fetchedOrders.length - lastOrderCount;
            const latest = fetchedOrders[0];
            playAlertSound();
            setShowOrderBanner(`New Order! #${latest.order_number} placed by ${latest.customer_name}`);
            setUnseenOrders(prev => prev + diff);
            setOrdersList(fetchedOrders);
            setLastOrderCount(fetchedOrders.length);
            setTimeout(() => {
              setShowOrderBanner(null);
            }, 8000);
          } else if (lastOrderCount === null) {
            setLastOrderCount(fetchedOrders.length);
          }
        }
      } catch (e) {
        console.error('Error polling for new orders:', e);
      }
    }, 30000); // 30s intervals
    return () => clearInterval(interval);
  }, [token, lastOrderCount]);

  // Inject Aptos Font CSS & Font Scale-up Overrides
  useEffect(() => {
    const styleId = 'admin-aptos-font';
    let tag = document.getElementById(styleId);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = styleId;
      tag.innerHTML = `
        @import url('https://fonts.cdnfonts.com/css/aptos');
        .admin-aptos-container {
          font-family: 'Aptos', 'Inter', -apple-system, sans-serif !important;
          font-size: 15px !important;
        }
        .admin-aptos-container input,
        .admin-aptos-container select,
        .admin-aptos-container textarea,
        .admin-aptos-container button {
          font-family: 'Aptos', 'Inter', -apple-system, sans-serif !important;
        }
        /* Override specific text sizing classes to be larger and clearer */
        .admin-aptos-container .text-\[9px\] { font-size: 11px !important; }
        .admin-aptos-container .text-\[10px\] { font-size: 12px !important; }
        .admin-aptos-container .text-xs { font-size: 14px !important; }
        .admin-aptos-container .text-sm { font-size: 16px !important; }
        .admin-aptos-container .text-base { font-size: 17px !important; }
        .admin-aptos-container .text-lg { font-size: 19px !important; }
        .admin-aptos-container .text-xl { font-size: 21px !important; }
        .admin-aptos-container .text-2xl { font-size: 26px !important; }
        .admin-aptos-container .text-3xl { font-size: 32px !important; }
        .admin-aptos-container .text-4xl { font-size: 38px !important; }
      `;
      document.head.appendChild(tag);
    }
  }, []);

  // Handle Fetch Unauthorized Broadcasts
  useEffect(() => {
    const handleUnauth = () => {
      setUser(null);
      setOtpRequired(false);
      showToast('error', 'Session Expired', 'Please verify your administrative credentials again.');
    };
    window.addEventListener('heelsup_unauthorized', handleUnauth);
    return () => window.removeEventListener('heelsup_unauthorized', handleUnauth);
  }, []);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast('error', 'Fields Required', 'Please enter your registered staff email and password.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.toLowerCase().trim(), password: passwordInput })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.step === 'otp_required') {
          setOtpRequired(true);
          setSessionToken(data.data.session_token);
          if (data.data.warning) {
            showToast('warning', 'OTP Bypassed (Local Dev)', data.data.warning);
          } else {
            showToast('info', '2FA Check', 'A 6-digit passcode has been sent to your email.');
          }
        } else {
          const { token, user: loggedUser } = data.data;
          localStorage.setItem('heelsup_token', token);
          localStorage.setItem('heelsup_user', JSON.stringify(loggedUser));
          setUser(loggedUser);
          showToast('success', 'Session Established', `Welcome back, ${loggedUser.name}!`);
        }
      } else {
        showToast('error', 'Authentication Failed', data.error || 'Invalid email or password credentials.');
      }
    } catch (err) {
      showToast('error', 'Network Error', 'Failed to connect to the authentication server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 6) {
      showToast('error', 'Invalid Format', 'Please enter the 6-digit passcode.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/admin-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput, session_token: sessionToken })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const { token, user: loggedUser } = data.data;
        localStorage.setItem('heelsup_token', token);
        localStorage.setItem('heelsup_user', JSON.stringify(loggedUser));
        setUser(loggedUser);
        setOtpRequired(false);
        setSessionToken(null);
        setOtpInput('');
        showToast('success', 'OTP Verified', `Access granted for ${loggedUser.name}`);
      } else {
        showToast('error', 'OTP Mismatch', data.error || 'The passcode you entered is invalid.');
      }
    } catch {
      showToast('error', 'Verification Failure', 'Could not complete passcode verification.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('error', 'Email Required', 'Please enter your registered staff email.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.toLowerCase().trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'OTP Sent', 'Password reset code has been sent.');
        setResetStep('reset_otp');
      } else {
        showToast('error', 'Request Denied', data.error || 'Account not found.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not trigger forgot password service.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode || !resetNewPassword || !resetConfirmPassword) {
      showToast('error', 'Missing Parameters', 'All password parameters are mandatory.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.toLowerCase().trim(), otp: resetOtpCode, password: resetNewPassword })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Credentials Reset', 'Your password has been successfully updated.');
        setResetStep('login');
      } else {
        showToast('error', 'Reset Failure', data.error || 'Invalid passcode.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not establish connection to reset services.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('heelsup_token');
    localStorage.removeItem('heelsup_user');
    setUser(null);
    showToast('info', 'Logged Out', 'You have securely terminated the admin session.');
  };

  // Base SKU & Color helpers for variant mapping
  const getBaseSku = (sku?: string) => {
    if (!sku) return '';
    return sku.split('-')[0].trim();
  };

  const extractColor = (name: string) => {
    if (!name) return 'Default';
    const parts = name.split(' - ');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    return 'Default';
  };

  const getColorHex = (name: string) => {
    if (!name) return '#cbd5e1';
    const cleanName = name.toLowerCase().trim();
    return colorMap[cleanName] || '#cbd5e1';
  };

  // Product Modals & Editors
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSku('');
    setProdCategory(categoriesList[0]?.name || 'Heels');
    setProdPrice('');
    setProdMrp('');
    setProdDescription('');
    setProdImages(['']);
    setProdSizes(['36', '37', '38', '39', '40', '41']);
    setProdActive(true);
    setProdFeatured(false);
    setProdNew(true);
    setProdTrending(false);
    setProdShowMrp(true);
    setProdBrand('HeelsUp');
    setProdTags([]);
    setProdMetaTitle('');
    setProdMetaDesc('');
    setProdSizeStocks({});
    setProdColor('Default');
    setProdColorCustom('');
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdSku(prod.sku);
    setProdCategory(prod.category);
    setProdPrice((prod.price / 100).toString());
    setProdMrp(prod.original_price ? (prod.original_price / 100).toString() : '');
    setProdDescription(prod.description || '');
    setProdImages(prod.images && prod.images.length > 0 ? prod.images : ['']);
    setProdSizes(prod.sizes || []);
    setProdActive(prod.active);
    setProdFeatured(prod.featured);
    setProdNew(prod.is_new !== false);
    setProdTrending(prod.is_trending || false);
    setProdBrand(prod.brand || 'HeelsUp');
    setProdTags(prod.tags || []);
    setProdShowMrp(prod.show_mrp !== false);
    setProdMetaTitle(prod.meta_title || '');
    setProdMetaDesc(prod.meta_desc || '');
    
    // Fetch size stocks
    const sizeStockMap: Record<string, number> = {};
    if (prod.size_stock) {
      prod.size_stock.forEach((s) => {
        sizeStockMap[s.size_label] = s.stock;
      });
    }
    setProdSizeStocks(sizeStockMap);

    // Set color variant fields
    const extracted = extractColor(prod.name);
    if (extracted && extracted !== 'Default') {
      const knownColor = Object.keys(colorMap).find(k => k.toLowerCase() === extracted.toLowerCase());
      if (knownColor) {
        setProdColor(knownColor.charAt(0).toUpperCase() + knownColor.slice(1));
      } else {
        setProdColor('Custom');
        setProdColorCustom(extracted);
      }
    } else {
      setProdColor('Default');
      setProdColorCustom('');
    }

    setProductModalOpen(true);
  };

  const handleImageFieldChange = (index: number, val: string) => {
    const updated = [...prodImages];
    updated[index] = val;
    setProdImages(updated);
  };

  const handleAddImageField = () => {
    setProdImages([...prodImages, '']);
  };

  const handleRemoveImageField = (index: number) => {
    const updated = prodImages.filter((_, i) => i !== index);
    setProdImages(updated.length === 0 ? [''] : updated);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodSku || !prodPrice) {
      showToast('error', 'Missing Fields', 'Product title, SKU and price are mandatory fields.');
      return;
    }

    const pricePaise = Math.round(parseFloat(prodPrice) * 100);
    const mrpPaise = prodMrp ? Math.round(parseFloat(prodMrp) * 100) : null;

    // Construct size stock array
    const sizeStockArray = prodSizes.map((s) => ({
      size_label: s,
      stock: prodSizeStocks[s] || 0
    }));

    const totalStock = sizeStockArray.reduce((sum, s) => sum + s.stock, 0);

    // Auto append color variant naming
    let finalName = prodName.trim();
    const activeColor = prodColor === 'Custom' ? prodColorCustom.trim() : prodColor;
    if (activeColor !== 'Default' && activeColor !== '') {
      const colorSuffix = ` - ${activeColor}`;
      if (!finalName.endsWith(colorSuffix)) {
        const dashIdx = finalName.lastIndexOf(' - ');
        if (dashIdx > -1) {
          finalName = finalName.substring(0, dashIdx);
        }
        finalName = `${finalName}${colorSuffix}`;
      }
    }

    const payload = {
      name: finalName,
      sku: prodSku,
      category: prodCategory,
      description: prodDescription,
      price: pricePaise,
      mrp: mrpPaise,
      stock: totalStock,
      sizes: prodSizes,
      images: prodImages.filter((img) => img.trim() !== ''),
      brand: prodBrand,
      tags: prodTags,
      is_new: prodNew,
      is_featured: prodFeatured,
      is_trending: prodTrending,
      show_mrp: prodShowMrp,
      meta_title: prodMetaTitle,
      meta_desc: prodMetaDesc,
      size_stock: sizeStockArray,
      active: prodActive
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
        showToast('success', 'Catalogue Synced', `Product '${prodName}' has been saved.`);
        setProductModalOpen(false);
        loadAllData();
      } else {
        showToast('error', 'Sync Denied', data.error || 'Failed to sync product data.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not establish connection to catalog server.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this product? This catalog deletion cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Product Deleted', 'The catalog entry has been purged.');
        loadAllData();
      } else {
        showToast('error', 'Deletion Error', data.error || 'Access denied.');
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  // Staff CRUD Handlers
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffFirstName('');
    setStaffLastName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffPassword('');
    setStaffRole('staff');
    setStaffNotes('');
    setStaffActive(true);
    setStaffPermissions(['dashboard', 'orders', 'pos']);
    setStaffModalOpen(true);
  };

  const handleOpenEditStaff = (st: any) => {
    setEditingStaff(st);
    setStaffFirstName(st.first_name || '');
    setStaffLastName(st.last_name || '');
    setStaffEmail(st.email || '');
    setStaffPhone(st.phone || '');
    setStaffPassword('');
    setStaffRole(st.role || 'staff');
    setStaffNotes(st.notes || '');
    setStaffActive(st.is_active !== 0);
    
    let parsedPerms = ['dashboard', 'orders', 'pos'];
    if (st.permissions) {
      try {
        parsedPerms = JSON.parse(st.permissions);
      } catch (_) {
        parsedPerms = [];
      }
    }
    setStaffPermissions(parsedPerms);
    setStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFirstName || !staffEmail) {
      showToast('error', 'Missing Fields', 'First name and email are required.');
      return;
    }

    const payload: any = {
      first_name: staffFirstName,
      last_name: staffLastName,
      email: staffEmail.trim().toLowerCase(),
      phone: staffPhone || null,
      role: staffRole,
      notes: staffNotes,
      permissions: staffPermissions,
      is_active: staffActive
    };

    if (!editingStaff) {
      payload.password = staffPassword || 'HeelsUp@2026';
    }

    const url = editingStaff ? `/api/admin/staff/${editingStaff.user_id}` : '/api/admin/staff';
    const method = editingStaff ? 'PUT' : 'POST';

    try {
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
        showToast('success', 'Staff Saved', `Staff member '${staffFirstName}' saved successfully.`);
        setStaffModalOpen(false);
        loadAllData();
      } else {
        showToast('error', 'Failed to Save Staff', data.error || 'Server rejected request.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not sync staff data.');
    }
  };

  const handleDeleteStaff = async (staffMember: any) => {
    if (staffMember.email === 'support@heelsup.in') {
      showToast('error', 'Protected Account', 'The root superadmin account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete staff member '${staffMember.name || staffMember.email}'?`)) return;
    try {
      const res = await fetch(`/api/admin/staff/${staffMember.user_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Staff Deleted', 'Staff member removed successfully.');
        loadAllData();
      } else {
        showToast('error', 'Failed', data.error || 'Server error.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not delete staff.');
    }
  };

  const handleToggleStaffStatus = async (staffMember: any) => {
    if (staffMember.email === 'support@heelsup.in') {
      showToast('error', 'Protected Account', 'The root superadmin account cannot be suspended.');
      return;
    }
    const isAct = staffMember.is_active !== 0;
    const action = isAct ? 'suspend' : 'activate';
    try {
      const res = await fetch(`/api/admin/staff/${staffMember.user_id}/${action}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Status Updated', `Staff has been ${isAct ? 'suspended' : 'activated'}.`);
        loadAllData();
      } else {
        showToast('error', 'Failed', data.error || 'Server error.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not update status.');
    }
  };

  // Colors CRUD Handlers
  const handleOpenAddColor = () => {
    setEditingColor(null);
    setColorNameInput('');
    setColorHexInput('#000000');
    setColorModalOpen(true);
  };

  const handleOpenEditColor = (col: any) => {
    setEditingColor(col);
    setColorNameInput(col.color_name);
    setColorHexInput(col.hex_code);
    setColorModalOpen(true);
  };

  const handleColorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorNameInput || !colorHexInput) {
      showToast('error', 'Missing Fields', 'Please enter color name and hex code.');
      return;
    }
    const hex = colorHexInput.startsWith('#') ? colorHexInput : `#${colorHexInput}`;
    const url = editingColor ? `/api/admin/colors/${editingColor.color_name}` : '/api/admin/colors';
    const method = editingColor ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ color_name: colorNameInput.trim(), hex_code: hex.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Color Saved', `Color '${colorNameInput}' mapping updated.`);
        setColorModalOpen(false);
        loadColors();
      } else {
        showToast('error', 'Failed', data.error || 'Server error.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to color service.');
    }
  };

  const handleDeleteColor = async (colorName: string) => {
    if (!window.confirm(`Delete color mapping for '${colorName}'?`)) return;
    try {
      const res = await fetch(`/api/admin/colors/${colorName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Color Deleted', `Mapping for '${colorName}' removed.`);
        loadColors();
      } else {
        showToast('error', 'Failed', data.error || 'Server error.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect.');
    }
  };

  // Advanced Analysis Filter Logic
  const getFilteredTransactions = () => {
    const webTx = ordersList.map((o: any) => {
      let itemsSummary = '';
      if (o.items && Array.isArray(o.items)) {
        itemsSummary = o.items.map((it: any) => `${it.product_name} (${it.size}/${it.color || 'Default'}) x${it.quantity}`).join(', ');
      } else if (o.items_json) {
        try {
          const parsed = JSON.parse(o.items_json);
          itemsSummary = parsed.map((it: any) => `${it.product_name} (${it.size}/${it.color || 'Default'}) x${it.quantity}`).join(', ');
        } catch (_) {
          itemsSummary = 'Items detail unavailable';
        }
      } else {
        itemsSummary = 'Standard Online Purchase';
      }

      return {
        id: `WEB-${o.id}`,
        db_id: o.id,
        transaction_number: o.order_number,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone || '',
        customer_email: o.customer_email || '',
        items_summary: itemsSummary,
        raw_items: o.items || [],
        subtotal: o.total_amount,
        discount: 0,
        total: o.total_amount,
        payment_method: o.payment_method || 'Online',
        notes: o.notes || '',
        channel: 'Web',
        created_at: o.created_at,
        status: o.order_status,
        category: o.category || 'Footwear'
      };
    });

    const posTx = posSalesList.map((s: any) => {
      let itemsSummary = '';
      let rawItems: any[] = [];
      if (s.items_json) {
        try {
          const parsed = JSON.parse(s.items_json);
          itemsSummary = parsed.map((it: any) => `${it.product_name || it.name} (${it.size || 'Default'}/${it.color || 'Default'}) x${it.quantity || it.qty}`).join(', ');
          rawItems = parsed.map((it: any) => ({
            product_id: it.product_id || it.productId,
            product_name: it.product_name || it.name,
            quantity: it.quantity || it.qty || 1,
            price: (it.unit_price || it.price || 0) * 100,
            size: it.size || 'Default',
            color: it.color || 'Default'
          }));
        } catch (_) {
          itemsSummary = 'POS walk-in items';
        }
      }
      return {
        id: `POS-${s.id}`,
        db_id: s.id,
        transaction_number: s.sale_number,
        customer_name: s.customer_name || 'Walk-in',
        customer_phone: s.customer_phone || '',
        customer_email: '',
        items_summary: itemsSummary,
        raw_items: rawItems,
        subtotal: s.subtotal * 100,
        discount: (s.discount || 0) * 100,
        total: s.total * 100,
        payment_method: s.payment_method || 'Cash',
        notes: s.notes || '',
        channel: 'POS',
        created_at: s.created_at,
        status: 'Completed',
        category: 'Footwear'
      };
    });

    const allTx = [...webTx, ...posTx];

    return allTx.filter((t) => {
      // 1. Date filter
      const txDate = new Date(t.created_at);
      if (analysisDatePreset !== 'custom') {
        const days = parseInt(analysisDatePreset);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        if (txDate < limitDate) return false;
      } else {
        if (analysisStartDate) {
          const start = new Date(`${analysisStartDate}T00:00:00`);
          if (txDate < start) return false;
        }
        if (analysisEndDate) {
          const end = new Date(`${analysisEndDate}T23:59:59`);
          if (txDate > end) return false;
        }
      }

      // 2. Channel filter
      if (analysisChannel !== 'all') {
        if (t.channel.toLowerCase() !== analysisChannel.toLowerCase()) return false;
      }

      // 3. Customer search
      if (analysisCustomerSearch) {
        const q = analysisCustomerSearch.toLowerCase();
        const nameMatch = t.customer_name?.toLowerCase().includes(q);
        const phoneMatch = t.customer_phone?.includes(q);
        const emailMatch = t.customer_email?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !emailMatch) return false;
      }

      // 4. Product/SKU search
      if (analysisProductSearch) {
        const q = analysisProductSearch.toLowerCase();
        if (!t.items_summary.toLowerCase().includes(q)) return false;
      }

      // 5. Category filter
      if (analysisCategoryFilter !== 'all') {
        const q = analysisCategoryFilter.toLowerCase();
        if (!t.items_summary.toLowerCase().includes(q)) return false;
      }

      // 6. Amount limits (convert to Rupees)
      const totalRupees = t.total / 100;
      if (analysisMinAmt) {
        const min = parseFloat(analysisMinAmt);
        if (!isNaN(min) && totalRupees < min) return false;
      }
      if (analysisMaxAmt) {
        const max = parseFloat(analysisMaxAmt);
        if (!isNaN(max) && totalRupees > max) return false;
      }

      return true;
    }).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const handleExportAnalysisCSV = () => {
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) {
      showToast('warning', 'No Data', 'There is no filtered transaction data to export.');
      return;
    }
    setExportModalOpen(true);
  };

  const executeExportCompilation = () => {
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) {
      showToast('warning', 'No Data', 'There is no filtered transaction data to export.');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM
    const sections: string[] = [];

    if (exportLedger) {
      const headers = [
        'Transaction Number', 'Date', 'Channel', 'Customer Name', 'Customer Phone', 'Customer Email',
        'Items Summary', 'Payment Method', 'Subtotal (INR)', 'Discount (INR)', 'Total Amount (INR)', 'Status', 'Notes'
      ];
      const rows = filtered.map((t) => [
        t.transaction_number,
        new Date(t.created_at).toLocaleString('en-IN'),
        t.channel,
        t.customer_name || 'N/A',
        t.customer_phone || 'N/A',
        t.customer_email || 'N/A',
        `"${(t.items_summary || '').replace(/"/g, '""')}"`,
        t.payment_method,
        (t.subtotal / 100).toFixed(2),
        (t.discount / 100).toFixed(2),
        (t.total / 100).toFixed(2),
        t.status,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ]);

      sections.push([
        '# SECTION: TRANSACTIONS LEDGER',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n'));
    }

    if (exportCategory) {
      const catData = getAnalysisCategoryData();
      const totalRev = catData.reduce((sum, d) => sum + d.revenue, 0);
      const headers = ['Category', 'Units Sold', 'Revenue (INR)', 'Percentage of Revenue'];
      const rows = catData.map((d) => {
        const pct = totalRev > 0 ? (d.revenue / totalRev) * 100 : 0;
        return [
          d.category,
          d.quantity,
          (d.revenue / 100).toFixed(2),
          `${pct.toFixed(2)}%`
        ];
      });

      sections.push([
        '',
        '# SECTION: CATEGORY PERFORMANCE',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n'));
    }

    if (exportInventory) {
      const headers = ['Product Name', 'SKU', 'Brand', 'Category', 'Historical Sold', 'Current Stock', 'Active Status'];
      const rows = productsList.map((p) => [
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.sku || 'N/A',
        p.brand || 'N/A',
        p.category || 'Footwear',
        p.sold_count || 0,
        p.stock || 0,
        p.active ? 'ACTIVE' : 'INACTIVE'
      ]);

      sections.push([
        '',
        '# SECTION: PRODUCT INVENTORY SUMMARY',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n'));
    }

    if (exportChannel) {
      const webTx = filtered.filter(t => t.channel === 'Web');
      const posTx = filtered.filter(t => t.channel === 'POS');

      const webRev = webTx.reduce((sum, t) => sum + t.total, 0) / 100;
      const posRev = posTx.reduce((sum, t) => sum + t.total, 0) / 100;

      const headers = ['Channel', 'Transaction Count', 'Total Revenue (INR)', 'Average Value (INR)'];
      const rows = [
        ['Web Store', webTx.length, webRev.toFixed(2), webTx.length > 0 ? (webRev / webTx.length).toFixed(2) : '0.00'],
        ['POS Walk-in', posTx.length, posRev.toFixed(2), posTx.length > 0 ? (posRev / posTx.length).toFixed(2) : '0.00']
      ];

      sections.push([
        '',
        '# SECTION: SALES CHANNEL COMPARISON',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n'));
    }

    if (exportCustomer) {
      const custMap: Record<string, { name: string; phone: string; email: string; count: number; spend: number; lastDate: string }> = {};

      filtered.forEach((t) => {
        const key = t.customer_phone || t.customer_name || 'Walk-in';
        if (!custMap[key]) {
          custMap[key] = {
            name: t.customer_name || 'Walk-in',
            phone: t.customer_phone || 'N/A',
            email: t.customer_email || 'N/A',
            count: 0,
            spend: 0,
            lastDate: t.created_at
          };
        }
        custMap[key].count += 1;
        custMap[key].spend += t.total;
        if (new Date(t.created_at) > new Date(custMap[key].lastDate)) {
          custMap[key].lastDate = t.created_at;
        }
      });

      const headers = ['Customer Name', 'Phone', 'Email', 'Total Transactions', 'LTV Spend (INR)', 'Last Transaction Date'];
      const rows = Object.values(custMap)
        .sort((a, b) => b.spend - a.spend)
        .map((c) => [
          `"${c.name.replace(/"/g, '""')}"`,
          c.phone,
          c.email,
          c.count,
          (c.spend / 100).toFixed(2),
          new Date(c.lastDate).toLocaleDateString('en-IN')
        ]);

      sections.push([
        '',
        '# SECTION: CUSTOMER LEADERBOARD',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n'));
    }

    csvContent += sections.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `heelsup_master_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportModalOpen(false);
    showToast('success', 'Export Complete', 'Selected reports compiled successfully.');
  };

  const hasPermission = (tabId: string) => {
    if (!user) return false;
    if (user.email === 'support@heelsup.in') return true;
    if (user.permissions) {
      return user.permissions.includes(tabId);
    }
    return ['dashboard', 'orders', 'pos'].includes(tabId);
  };

  useEffect(() => {
    if (user) {
      const allowedTabs = [
        'dashboard', 'products', 'stock', 'orders', 'categories', 'customers',
        'reviews', 'coupons', 'banners', 'pages', 'pos', 'returns',
        'sql', 'audits', 'settings', 'analysis', 'staff', 'colors'
      ].filter(hasPermission);
      
      if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
        setActiveTab(allowedTabs[0] as any);
      }
    }
  }, [user, activeTab]);

  // Stock Quick-Save Inline Form Updates
  const handleStockUpdateChange = (productId: number, sizeLabel: string, val: number) => {
    setStockUpdates((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [sizeLabel]: Math.max(0, val)
      }
    }));
  };

  const saveSizeStockChange = async (productId: number, sizeLabel: string) => {
    const val = stockUpdates[productId]?.[sizeLabel];
    if (val === undefined) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          size_stock: [{ size_label: sizeLabel, stock: val }]
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Stock Update', `Updated Size ${sizeLabel} stock to ${val}.`);
        loadAllData();
      } else {
        showToast('error', 'Update Error', data.error || 'Could not save stock change.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to sync stock changes.');
    }
  };

  // Order Details, Badges & Courier Tracking Updates
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Status Updated', `Order #${orderId} status set to ${status.toUpperCase()}.`);
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => prev ? { ...prev, order_status: status as any } : null);
        }
        loadAllData();
      } else {
        showToast('error', 'Failed Update', data.error || 'Operation rejected.');
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to communicate status update.');
    }
  };

  const handleUpdateTracking = async (orderId: number, courier: string, trackNum: string, trackUrl: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courier_name: courier,
          tracking_number: trackNum,
          tracking_url: trackUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Tracking Configured', 'Courier shipment tags saved.');
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => prev ? { ...prev, courier_name: courier, tracking_number: trackNum, tracking_url: trackUrl } : null);
        }
        loadAllData();
      } else {
        showToast('error', 'Save Denied', data.error || 'Tracking update failed.');
      }
    } catch {
      showToast('error', 'Connection failure', 'Failed to send tracking payload.');
    }
  };

  // Coupons CRUD
  const handleOpenAddCoupon = () => {
    setEditingCoupon(null);
    setCouponCode('');
    setCouponType('percentage');
    setCouponValue('');
    setCouponMinOrder('');
    setCouponActive(true);
    setCouponDescription('');
    setCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponCode(coupon.code);
    setCouponType(coupon.type);
    setCouponValue(coupon.value.toString());
    setCouponMinOrder(coupon.min_order.toString());
    setCouponActive(coupon.active);
    setCouponDescription(coupon.description || '');
    setCouponModalOpen(true);
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponValue) {
      showToast('error', 'Validation Error', 'Coupon code and value are mandatory.');
      return;
    }
    const payload = {
      code: couponCode.toUpperCase().trim(),
      type: couponType,
      value: parseFloat(couponValue),
      min_order: parseFloat(couponMinOrder || '0'),
      active: couponActive,
      description: couponDescription
    };
    try {
      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';
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
        showToast('success', 'Coupon Saved', `Promo '${couponCode}' saved successfully.`);
        setCouponModalOpen(false);
        loadAllData();
      } else {
        showToast('error', 'Error Saving', data.error || 'Failed to save coupon.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to sync coupon data.');
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('Delete this coupon code?')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Coupon purged', 'Promotion code deleted.');
        loadAllData();
      } else {
        showToast('error', 'Deletion blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Error', 'Failed to submit delete query.');
    }
  };

  // Categories CRUD
  const handleOpenAddCategory = () => {
    setEditingCat(null);
    setCatName('');
    setCatSlug('');
    setCatDescription('');
    setCatImageUrl('');
    setCatSortOrder('0');
    setCatActive(true);
    setCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatDescription(cat.description || '');
    setCatImageUrl(cat.image_url || '');
    setCatSortOrder(cat.sort_order.toString());
    setCatActive(cat.active);
    setCatModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catSlug) {
      showToast('error', 'Validation Error', 'Category title and slug are mandatory.');
      return;
    }
    const payload = {
      name: catName,
      slug: catSlug.toLowerCase().trim(),
      description: catDescription,
      image_url: catImageUrl,
      sort_order: parseInt(catSortOrder || '0'),
      active: catActive
    };
    try {
      const url = editingCat ? `/api/admin/categories/${editingCat.id}` : '/api/admin/categories';
      const method = editingCat ? 'PUT' : 'POST';
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
        showToast('success', 'Category Synced', `Category '${catName}' saved.`);
        setCatModalOpen(false);
        loadAllData();
      } else {
        showToast('error', 'Error Saving', data.error || 'Failed to save.');
      }
    } catch {
      showToast('error', 'Connection failure', 'Failed to sync category data.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete category?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category Purged', 'Category deleted.');
        loadAllData();
      } else {
        showToast('error', 'Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  // Banners CRUD
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerImageUrl('');
    setBannerLink('');
    setBannerActive(true);
    setBannerSortOrder('0');
    setBannerModalOpen(true);
  };

  const handleOpenEditBanner = (ban: Banner) => {
    setEditingBanner(ban);
    setBannerTitle(ban.title);
    setBannerSubtitle(ban.subtitle || '');
    setBannerImageUrl(ban.image_url);
    setBannerLink(ban.link || '');
    setBannerActive(ban.active);
    setBannerSortOrder(ban.sort_order.toString());
    setBannerModalOpen(true);
  };

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerImageUrl) {
      showToast('error', 'Validation Error', 'Banner Title and Image URL are required.');
      return;
    }
    const payload = {
      title: bannerTitle,
      subtitle: bannerSubtitle,
      image_url: bannerImageUrl,
      link: bannerLink,
      active: bannerActive ? 1 : 0,
      sort_order: parseInt(bannerSortOrder || '0')
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
        showToast('success', 'Banner Saved', `Banner slide '${bannerTitle}' updated.`);
        setBannerModalOpen(false);
        loadAllData();
      } else {
        showToast('error', 'Error Saving', data.error);
      }
    } catch {
      showToast('error', 'Network failure', 'Could not sync banner slides.');
    }
  };

  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('Purge banner slideshow file?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Purged', 'Banner deleted.');
        loadAllData();
      } else {
        showToast('error', 'Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  // Pages CRUD
  const handleOpenAddPage = () => {
    setEditingPage(null);
    setPageTitle('');
    setPageSlug('');
    setPageContent('');
    setPageActive(true);
    setPageModalOpen(true);
  };

  const handleOpenEditPage = (page: PageConfig) => {
    setEditingPage(page);
    setPageTitle(page.title);
    setPageSlug(page.slug);
    setPageContent(page.content);
    setPageActive(page.active);
    setPageModalOpen(true);
  };

  const handlePageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle || !pageSlug) {
      showToast('error', 'Validation Error', 'Page Title and Slug are required.');
      return;
    }
    const payload = {
      title: pageTitle,
      slug: pageSlug.toLowerCase().trim(),
      content: pageContent,
      active: pageActive ? 1 : 0
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
        showToast('success', 'Page Saved', `Page configuration '${pageTitle}' saved.`);
        setPageModalOpen(false);
        loadAllData();
      } else {
        showToast('error', 'Error Saving', data.error);
      }
    } catch {
      showToast('error', 'Network failure', 'Could not sync page parameters.');
    }
  };

  const handleDeletePage = async (id: number) => {
    if (!window.confirm('Delete this static page configuration?')) return;
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Page Purged', 'Page config deleted.');
        loadAllData();
      } else {
        showToast('error', 'Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  // Review Moderation
  const handleApproveReview = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Approved', 'Review status updated to approved.');
        loadAllData();
      } else {
        showToast('error', 'Operation Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to update review status.');
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!window.confirm('Purge customer review?')) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Purged', 'Review deleted from registry.');
        loadAllData();
      } else {
        showToast('error', 'Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  // Returns moderation
  const handleOpenReturnsModal = async (ret: ReturnRequest) => {
    try {
      const res = await fetch(`/api/admin/returns/${ret.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedReturn(data.data);
        setReturnStatus(data.data.status === 'pending' ? 'approved' : data.data.status as any);
        setReturnNotes(data.data.admin_notes || '');
        setReturnModalOpen(true);
      } else {
        showToast('error', 'Fetch Failure', data.error || 'Failed to fetch details');
      }
    } catch {
      showToast('error', 'Fetch Failure', 'Network error while fetching exchange details');
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;
    try {
      const res = await fetch(`/api/admin/returns/${selectedReturn.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: returnStatus,
          admin_note: returnNotes,
          admin_notes: returnNotes,
          refund_amount: selectedReturn.refund_amount
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Exchange Updated', 'Exchange request status recorded.');
        setReturnModalOpen(false);
        loadAllData();
      } else {
        showToast('error', 'Update Error', data.error);
      }
    } catch {
      showToast('error', 'Sync Error', 'Failed to submit update.');
    }
  };

  // Staff and Customers
  const handleToggleBlockStaff = async (staff: Staff) => {
    try {
      const res = await fetch(`/api/admin/staff/${staff.id}/block`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ block: !staff.is_blocked })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Staff Access Modifed', `Staff member ${staff.first_name} is now ${!staff.is_blocked ? 'BLOCKED' : 'ACTIVE'}.`);
        loadAllData();
      } else {
        showToast('error', 'Update Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Error', 'Could not save staff update.');
    }
  };

  const handleToggleBlockCustomer = async (cust: Customer) => {
    try {
      const res = await fetch(`/api/admin/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sql: 'UPDATE users SET is_blocked = ? WHERE id = ?',
          params: [cust.is_blocked ? 0 : 1, cust.id]
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'User Modified', `Customer block status updated.`);
        loadAllData();
      } else {
        showToast('error', 'Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Error', 'Failed to save customer configuration.');
    }
  };

  // SQL Console Handler
  const executeSqlQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sqlQuery.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    setSqlResults(null);
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSqlResults(data.data);
        showToast('success', 'Query Success', 'SQLite Statement completed.');
      } else {
        setSqlError(data.error || 'SQLite Syntax compilation error.');
      }
    } catch (err: any) {
      setSqlError(err.message || 'SQLite connection loss.');
    } finally {
      setSqlLoading(false);
    }
  };



  // POS CART Handlers
  const handleOpenPosProduct = (prod: Product) => {
    setPosSelectedProduct(prod);
    setPosSelectedSize(prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : '38');
    setPosSelectedQty(1);
    setPosSelectedColor('Default');
    // Check if there are actual sizes/colors
    const titleMatch = prod.name.match(/\((.*?)\)/);
    if (titleMatch && titleMatch[1]) {
      setPosSelectedColor(titleMatch[1]);
    }
  };

  const handleAddPosCart = () => {
    if (!posSelectedProduct) return;
    const existingIdx = posCart.findIndex(
      (item) =>
        item.product.id === posSelectedProduct.id &&
        item.size === posSelectedSize &&
        item.color.toLowerCase() === posSelectedColor.toLowerCase()
    );
    if (existingIdx > -1) {
      const updated = [...posCart];
      updated[existingIdx].qty += posSelectedQty;
      setPosCart(updated);
    } else {
      setPosCart([
        ...posCart,
        {
          product: posSelectedProduct,
          size: posSelectedSize,
          color: posSelectedColor,
          qty: posSelectedQty,
          price: posSelectedProduct.price
        }
      ]);
    }
    showToast('success', 'POS Cart updated', `${posSelectedProduct.name} (Size ${posSelectedSize}) added to sale.`);
    setPosSelectedProduct(null);
  };

  const handleRemovePosCart = (index: number) => {
    setPosCart(posCart.filter((_, i) => i !== index));
  };

  const handlePosCheckout = async () => {
    if (posCart.length === 0) {
      showToast('error', 'Empty Transaction', 'Select items to record offline transaction.');
      return;
    }
    const saleItems = posCart.map((item) => ({
      product_id: item.product.id,
      size: item.size,
      color: item.color,
      qty: item.qty,
      unit_price: item.price
    }));

    const discountValue = Math.round(parseFloat(posDiscount || '0') * 100);

    const payload = {
      customer_name: posCustomerName || 'Walk-in Customer',
      customer_phone: posCustomerPhone || null,
      items: saleItems,
      payment_method: posPaymentMethod,
      discount: discountValue,
      notes: posNotes
    };

    try {
      const res = await fetch('/api/admin/pos/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.data) {
        showToast('success', 'POS Transaction Recorded', `Invoice #${data.data.bill_number} generated successfully.`);
        // Reset states
        setPosCart([]);
        setPosCustomerName('');
        setPosCustomerPhone('');
        setPosDiscount('0');
        setPosNotes('');
        loadAllData();
      } else {
        showToast('error', 'POS Failed', data.error || 'Server rejected POS sale transaction.');
      }
    } catch {
      showToast('error', 'POS Failure', 'Could not establish connection to offline order system.');
    }
  };

  // File Upload to Worker R2 helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldSetter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast('info', 'Uploading File', 'Uploading image to Cloudflare R2 bucket...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        fieldSetter(data.data.url);
        showToast('success', 'Upload Success', 'Image path saved.');
      } else {
        showToast('error', 'Upload Error', data.error || 'Cloudflare upload failed.');
      }
    } catch {
      showToast('error', 'Network failure', 'Could not establish connection to asset upload service.');
    }
  };

  // Print Invoice utility
  const printInvoiceWindow = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const itemsList = order.items.map((item) => `
      <div style="margin-bottom: 6px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
        <div style="font-weight: bold; font-size: 11px;">${item.product_name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #444; margin-top: 2px;">
          <span>Size: ${item.size} &middot; Qty: ${item.quantity} &middot; @ ₹${(item.price / 100).toFixed(0)}</span>
          <span style="font-weight: bold; color: #000;">₹${((item.price * item.quantity) / 100).toFixed(0)}</span>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.order_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #000;
              margin: 0;
              padding: 12px;
              max-width: 290px;
              font-size: 11px;
              background-color: #fff;
            }
            .center { text-align: center; }
            .logo { height: 40px; margin-bottom: 6px; filter: grayscale(100%); }
            .shop-name { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .shop-addr { font-size: 9px; color: #444; line-height: 1.3; margin-top: 3px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
            .details-label { color: #555; }
            .details-val { font-weight: 500; }
            .section-title { font-weight: bold; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 6px; }
            .bill-totals { margin-top: 8px; font-size: 11px; }
            .bill-totals div { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .grand-total { font-size: 13px; font-weight: 700; border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
            .footer-msg { text-align: center; font-size: 9px; color: #555; line-height: 1.3; margin-top: 16px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <img class="logo" src="https://heelsup.in/logo.png" onerror="this.src='/logo.png'; this.onerror=null;" alt="HeelsUp" /><br/>
            <span class="shop-name">HeelsUp Boutique</span>
            <div class="shop-addr">
              1st B Rd, near Mahaveer Mega Mart,<br/>
              opposite Little Champ, Sardarpura,<br/>
              Jodhpur, Rajasthan 342001<br/>
              Phone: 078914 70935
            </div>
          </div>

          <div class="divider"></div>

          <div class="section-title">Order Details</div>
          <div class="details-row">
            <span class="details-label">Receipt No:</span>
            <span class="details-val">${order.order_number}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Date:</span>
            <span class="details-val">${new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Payment Mode:</span>
            <span class="details-val" style="text-transform: uppercase;">${order.payment_method}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Customer Name:</span>
            <span class="details-val">${order.customer_name}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Contact:</span>
            <span class="details-val">${order.customer_phone}</span>
          </div>

          <div class="divider"></div>

          <div class="section-title">Items Ordered</div>
          <div style="margin-top: 4px;">
            ${itemsList}
          </div>

          <div class="bill-totals">
            <div>
              <span>Subtotal:</span>
              <span>₹${(order.subtotal_amount / 100).toFixed(0)}</span>
            </div>
            ${order.discount_amount > 0 ? `
            <div style="color: #b91c1c;">
              <span>Discount Applied:</span>
              <span>-₹${(order.discount_amount / 100).toFixed(0)}</span>
            </div>` : ''}
            <div>
              <span>Shipping Fee:</span>
              <span>₹${(order.shipping_amount / 100).toFixed(0)}</span>
            </div>
            <div class="grand-total">
              <span>GRAND TOTAL:</span>
              <span>₹${(order.total_amount / 100).toFixed(0)}</span>
            </div>
          </div>

          <div class="footer-msg">
            Thank you for shopping with HeelsUp!<br/>
            Visit heelsup.in/returns for easy exchanges.<br/>
            Step out in confidence!
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Print Dispatch Slip (Premium Courier Sticker)
  const printDispatchWindow = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = order.items.map((item) => `
      <tr>
        <td style="font-size: 10px; padding: 6px; border-bottom: 1px solid #000; font-weight: 600;">${item.product_name}</td>
        <td style="font-size: 10px; padding: 6px; border-bottom: 1px solid #000; text-align: center; font-weight: 700;">Size: ${item.size}</td>
        <td style="font-size: 10px; padding: 6px; border-bottom: 1px solid #000; text-align: center; font-weight: 700;">Qty: ${item.quantity}</td>
      </tr>
    `).join('');

    const barcodeSvg = `
      <svg width="240" height="40" viewBox="0 0 120 20" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="2" width="2" height="16" fill="black" />
        <rect x="9" y="2" width="1" height="16" fill="black" />
        <rect x="12" y="2" width="3" height="16" fill="black" />
        <rect x="17" y="2" width="1" height="16" fill="black" />
        <rect x="19" y="2" width="2" height="16" fill="black" />
        <rect x="23" y="2" width="4" height="16" fill="black" />
        <rect x="29" y="2" width="1" height="16" fill="black" />
        <rect x="32" y="2" width="2" height="16" fill="black" />
        <rect x="36" y="2" width="1" height="16" fill="black" />
        <rect x="39" y="2" width="3" height="16" fill="black" />
        <rect x="44" y="2" width="1" height="16" fill="black" />
        <rect x="47" y="2" width="2" height="16" fill="black" />
        <rect x="51" y="2" width="4" height="16" fill="black" />
        <rect x="57" y="2" width="2" height="16" fill="black" />
        <rect x="61" y="2" width="1" height="16" fill="black" />
        <rect x="64" y="2" width="3" height="16" fill="black" />
        <rect x="69" y="2" width="2" height="16" fill="black" />
        <rect x="73" y="2" width="1" height="16" fill="black" />
        <rect x="76" y="2" width="3" height="16" fill="black" />
        <rect x="81" y="2" width="2" height="16" fill="black" />
        <rect x="85" y="2" width="1" height="16" fill="black" />
        <rect x="88" y="2" width="4" height="16" fill="black" />
        <rect x="94" y="2" width="2" height="16" fill="black" />
        <rect x="98" y="2" width="1" height="16" fill="black" />
        <rect x="101" y="2" width="3" height="16" fill="black" />
        <rect x="106" y="2" width="1" height="16" fill="black" />
        <rect x="109" y="2" width="2" height="16" fill="black" />
        <rect x="113" y="2" width="2" height="16" fill="black" />
      </svg>
    `;

    const isCod = order.payment_method?.toLowerCase() === 'cod' || order.payment_method?.toLowerCase() === 'cash';
    const payBadgeHtml = isCod
      ? `<div style="background: #000; color: #fff; font-size: 16px; font-weight: 900; padding: 6px 12px; border-radius: 4px; text-align: center; border: 2px solid #000; letter-spacing: 1px;">CASH ON DELIVERY (COD)<br/><span style="font-size: 18px;">COLLECT: ₹${(order.total_amount / 100).toFixed(0)}</span></div>`
      : `<div style="background: #fff; color: #000; font-size: 16px; font-weight: 900; padding: 6px 12px; border-radius: 4px; text-align: center; border: 3px solid #000; letter-spacing: 1.5px;">PREPAID &middot; ₹0 COLLECT</div>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Sticker - ${order.order_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #000; margin: 0; padding: 8px; max-width: 320px; }
            .sticker-container { border: 3px solid #000; padding: 10px; background-color: #fff; }
            .header-sec { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; }
            .logo-dispatch { height: 32px; filter: grayscale(100%); }
            .badge-wrapper { margin: 8px 0; }
            .meta-sec { display: flex; justify-content: space-between; font-size: 10px; border-bottom: 2px solid #000; padding-bottom: 6px; margin-top: 6px; }
            .barcode-sec { text-align: center; margin: 8px 0; padding-bottom: 6px; border-bottom: 1.5px dashed #000; }
            .barcode-text { font-family: monospace; font-size: 11px; font-weight: 700; margin-top: 2px; letter-spacing: 0.5px; }
            .deliver-to-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #444; margin: 0 0 4px 0; }
            .address-box { font-size: 11px; line-height: 1.45; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
            .customer-name { font-size: 14px; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 3px; }
            .pincode-box { font-size: 20px; font-weight: 900; margin-top: 6px; display: inline-block; padding: 2px 8px; border: 2.5px solid #000; background-color: #fff; letter-spacing: 1px; }
            .phone-box { font-size: 12px; font-weight: 700; margin-top: 6px; }
            .items-label-table { width: 100%; border-collapse: collapse; margin-top: 4px; border-bottom: 2.5px solid #000; margin-bottom: 8px; }
            .items-label-table th { font-size: 9px; font-weight: 800; text-transform: uppercase; background: #000; color: #fff; padding: 5px; text-align: left; }
            .return-sec { font-size: 9px; line-height: 1.35; }
            .return-title { font-weight: 800; text-transform: uppercase; font-size: 8px; color: #555; display: block; margin-bottom: 2px; }
          </style>
        </head>
        <body>
          <div class="sticker-container">
            <div class="header-sec">
              <img class="logo-dispatch" src="https://heelsup.in/logo.png" onerror="this.src='/logo.png'; this.onerror=null;" alt="HeelsUp" />
              <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px;">DELHIVERY EXPRESS</div>
            </div>

            <div class="badge-wrapper">
              ${payBadgeHtml}
            </div>

            <div class="meta-sec">
              <div>
                <strong>Order ID:</strong> #${order.order_number}<br/>
                <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN')}
              </div>
              <div style="text-align: right;">
                <strong>Routing:</strong> STD-SURFACE<br/>
                <strong>Weight:</strong> 0.8 Kg
              </div>
            </div>

            <div class="barcode-sec">
              ${barcodeSvg}
              <div class="barcode-text">${order.order_number}</div>
            </div>

            <div class="address-box">
              <div class="deliver-to-title">Deliver To:</div>
              <span class="customer-name">${order.customer_name}</span>
              <div>
                ${order.address_line1 || ''}<br/>
                ${order.address_line2 ? `${order.address_line2}<br/>` : ''}
                ${order.city}, ${order.state}<br/>
                <div class="pincode-box">PIN ${order.pincode}</div>
              </div>
              <div class="phone-box">Contact: ${order.customer_phone}</div>
            </div>

            <table class="items-label-table">
              <thead>
                <tr>
                  <th>Product Title</th>
                  <th style="text-align: center; width: 60px;">Size</th>
                  <th style="text-align: center; width: 40px;">Qty</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="return-sec">
              <span class="return-title">If Undelivered, Return To:</span>
              <strong>HeelsUp Store</strong><br/>
              1st B Rd, near Mahaveer Mega Mart,<br/>
              opposite Little Champ, Sardarpura,<br/>
              Jodhpur, Rajasthan 342001<br/>
              Phone: 078914 70935 &middot; support@heelsup.in
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      const q = productSearch.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchCat = productCatFilter ? p.category.toLowerCase() === productCatFilter.toLowerCase() : true;
      return matchSearch && matchCat;
    });
  }, [productsList, productSearch, productCatFilter]);

  const unifiedOrders = useMemo(() => {
    const web = ordersList.map((o: any) => ({
      ...o,
      is_pos: false,
      source_type: o.source || 'web'
    }));

    const pos = posSalesList.map((s: any) => {
      let items: any[] = [];
      if (s.items_json) {
        try {
          const parsed = JSON.parse(s.items_json);
          items = parsed.map((it: any, index: number) => ({
            id: `POS-ITEM-${s.id}-${index}`,
            product_id: it.product_id || it.productId || null,
            product_name: it.product_name || it.name || 'Product',
            sku: it.sku || it.product_sku || '',
            image: it.image || it.image_url || null,
            size: it.size || 'Default',
            color: it.color || 'Default',
            quantity: it.quantity || it.qty || 1,
            price: (it.unit_price || it.price || 0) * 100,
            total_price: (it.unit_price || it.price || 0) * (it.quantity || it.qty || 1) * 100
          }));
        } catch (_) {
          items = [];
        }
      }

      return {
        id: `POS-${s.id}`,
        db_id: s.id,
        order_number: s.sale_number,
        customer_name: s.customer_name || 'Walk-in Customer',
        customer_email: '',
        customer_phone: s.customer_phone || '',
        address_line1: 'POS Walk-in Store',
        address_line2: '',
        city: 'Offline Store',
        state: '',
        pincode: '',
        country: 'India',
        delivery_method: 'In-store Purchase',
        order_status: 'delivered',
        payment_status: 'paid',
        payment_method: s.payment_method || 'Cash',
        source: 'pos',
        source_type: 'pos',
        is_pos: true,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        razorpay_signature: null,
        subtotal_amount: (s.subtotal || 0) * 100,
        discount_amount: (s.discount || 0) * 100,
        shipping_amount: 0,
        total_amount: (s.total || 0) * 100,
        created_at: s.created_at,
        updated_at: s.created_at,
        notes: s.notes || '',
        items: items
      };
    });

    return [...web, ...pos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [ordersList, posSalesList]);

  const filteredOrders = useMemo(() => {
    return unifiedOrders.filter((o) => {
      const q = orderSearch.toLowerCase();
      const matchSearch =
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(q));

      const matchStatus = orderStatusFilter ? o.order_status === orderStatusFilter : true;

      let matchSource = true;
      if (orderSourceFilter !== 'all') {
        if (orderSourceFilter === 'pos') {
          matchSource = o.is_pos;
        } else {
          matchSource = !o.is_pos;
        }
      }

      return matchSearch && matchStatus && matchSource;
    });
  }, [unifiedOrders, orderSearch, orderStatusFilter, orderSourceFilter]);

  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const q = customerSearch.toLowerCase();
      return (c.first_name || '').toLowerCase().includes(q) || (c.last_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
    });
  }, [customersList, customerSearch]);

  const filteredReviews = useMemo(() => {
    return reviewsList.filter((r) => {
      const q = reviewSearch.toLowerCase();
      return (r.reviewer_name || '').toLowerCase().includes(q) || (r.body || '').toLowerCase().includes(q) || (r.product_name || '').toLowerCase().includes(q);
    });
  }, [reviewsList, reviewSearch]);

  // Paginated items
  const paginatedProducts = useMemo(() => {
    const start = productPage * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, productPage]);

  const paginatedOrders = useMemo(() => {
    const start = orderPage * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, orderPage]);

  const paginatedCustomers = useMemo(() => {
    const start = customerPage * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, customerPage]);

  const paginatedReviews = useMemo(() => {
    const start = reviewPage * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, reviewPage]);

  // POS filtered catalog list
  const posFilteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      const q = posSearchQuery.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchCat = posCatFilter ? p.category.toLowerCase() === posCatFilter.toLowerCase() : true;
      return matchSearch && matchCat && p.active;
    });
  }, [productsList, posSearchQuery, posCatFilter]);

  // Check if admin setup is missing or user has logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative">
        {/* Floating Toasts container */}
        <div className="fixed top-5 right-5 z-50 space-y-3 w-80 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-lg border pointer-events-auto flex items-start gap-3 bg-white transition-all transform animate-slide-in ${
                toast.type === 'success' ? 'border-emerald-100 bg-emerald-50/80 text-emerald-950' :
                toast.type === 'error' ? 'border-rose-100 bg-rose-50/80 text-rose-950' :
                toast.type === 'warning' ? 'border-amber-100 bg-amber-50/80 text-amber-950' :
                'border-sky-100 bg-sky-50/80 text-sky-950'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
              {toast.type === 'info' && <HelpCircle className="w-5 h-5 text-sky-500 shrink-0" />}
              <div>
                <h5 className="text-xs font-bold font-display">{toast.title}</h5>
                <p className="text-[10px] opacity-90 mt-0.5">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-md w-full space-y-8 bg-white p-8 border border-slate-100 shadow-xl rounded-2xl">
          <div className="text-center">
            <span className="text-2xl font-bold tracking-tight text-primary font-display">HeelsUp</span>
            <h2 className="mt-4 text-xl font-light text-slate-800 italic">Administration Portal Setup</h2>
            <p className="mt-1.5 text-xs text-slate-500">Authentication portal gateway verification</p>
          </div>

          {resetStep === 'login' && !otpRequired && (
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="rounded-md space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Staff Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="support@heelsup.in"
                    className="appearance-none relative block w-full px-3.5 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Access Password</label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="appearance-none relative block w-full px-3.5 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <button
                    type="button"
                    onClick={() => setResetStep('forgot_email')}
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Forgot access credentials?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md active:scale-95 disabled:bg-slate-300"
                >
                  {loggingIn ? 'Validating...' : 'Secure Sign In'}
                </button>
              </div>
            </form>
          )}

          {otpRequired && (
            <form className="mt-8 space-y-6" onSubmit={handleOtpVerify}>
              <div className="rounded-md space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Two-Factor Passcode (OTP)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="123456"
                    className="appearance-none relative block w-full px-3.5 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono text-center tracking-widest transition-all"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md active:scale-95 disabled:bg-slate-300"
                >
                  {loggingIn ? 'Verifying...' : 'Verify Passcode'}
                </button>
              </div>
            </form>
          )}

          {resetStep === 'forgot_email' && (
            <form className="mt-8 space-y-6" onSubmit={handleForgotSubmit}>
              <div className="rounded-md space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Registered Staff Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="support@heelsup.in"
                    className="appearance-none relative block w-full px-3.5 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setResetStep('login')}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Back to Sign In
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md active:scale-95 disabled:bg-slate-300"
                >
                  {resettingPassword ? 'Generating OTP...' : 'Send Recovery OTP'}
                </button>
              </div>
            </form>
          )}

          {resetStep === 'reset_otp' && (
            <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}>
              <div className="rounded-md space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">OTP Recovery Code</label>
                  <input
                    type="text"
                    required
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value)}
                    placeholder="123456"
                    className="appearance-none relative block w-full px-3.5 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs text-center font-mono tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="appearance-none relative block w-full px-3.5 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="appearance-none relative block w-full px-3.5 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md active:scale-95 disabled:bg-slate-300"
                >
                  {resettingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-aptos-container min-h-screen bg-slate-50 font-sans flex text-slate-800 relative">
      {/* Floating Toasts container */}
      <div className="fixed top-5 right-5 z-50 space-y-3 w-80 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border pointer-events-auto flex items-start gap-3 bg-white transition-all transform animate-slide-in ${
              toast.type === 'success' ? 'border-emerald-100 bg-emerald-50/80 text-emerald-950' :
              toast.type === 'error' ? 'border-rose-100 bg-rose-50/80 text-rose-950' :
              toast.type === 'warning' ? 'border-amber-100 bg-amber-50/80 text-amber-950' :
              'border-sky-100 bg-sky-50/80 text-sky-950'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
            {toast.type === 'info' && <HelpCircle className="w-5 h-5 text-sky-500 shrink-0" />}
            <div>
              <h5 className="text-xs font-bold font-display">{toast.title}</h5>
              <p className="text-[10px] opacity-90 mt-0.5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Order Alert Banner */}
      {showOrderBanner && (
        <div className="fixed top-18 right-6 z-50 animate-slide-left pointer-events-auto bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-850 flex items-center gap-3 w-80 max-w-sm">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center animate-pulse text-white">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[9px] uppercase font-extrabold text-blue-400 tracking-wider">New Order Alert</h5>
            <p className="text-[11px] font-semibold leading-snug mt-0.5">{showOrderBanner}</p>
          </div>
          <button onClick={() => setShowOrderBanner(null)} className="text-slate-400 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-35 md:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* --- AdminLTE Sidebar Navigation --- */}
      <aside className={`bg-[#343a40] text-[#c2c7d0] transition-all duration-300 flex flex-col shrink-0 z-40 font-sans shadow-lg
        ${sidebarOpen ? 'w-64 fixed md:relative h-screen' : 'w-0 overflow-hidden md:w-16 h-screen'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 border-b border-[#4b545c] gap-3 bg-[#343a40] shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#007bff] flex items-center justify-center text-white font-extrabold shrink-0 shadow">
            HU
          </div>
          {sidebarOpen && (
            <span className="text-sm font-bold tracking-wide text-white font-mono uppercase">
              HeelsUp Admin
            </span>
          )}
        </div>

        {/* User Info Section */}
        {sidebarOpen && (
          <div className="p-4 border-b border-[#4b545c] flex items-center gap-3 shrink-0 bg-[#343a40]">
            <div className="w-8 h-8 rounded-full bg-slate-600 text-white font-black text-xs flex items-center justify-center uppercase border border-slate-500 shadow-sm">
              {user.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate leading-tight">{user.name || 'Staff User'}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span className="text-[9px] text-[#c2c7d0] uppercase tracking-wider font-extrabold font-mono">{user.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Menu Items */}
        <nav className="flex-1 p-2 space-y-3 overflow-y-auto font-sans">
          {(() => {
            const menuSections = [
              {
                title: 'Dashboard & Reports',
                items: [
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'analysis', label: 'Advanced Analysis', icon: Activity },
                ]
              },
              {
                title: 'E-commerce & POS',
                items: [
                  { id: 'pos', label: 'POS Terminal', icon: Printer },
                  { id: 'orders', label: 'Orders', icon: ShoppingCart },
                  { id: 'returns', label: 'Exchanges Manager', icon: RotateCw },
                ]
              },
              {
                title: 'Catalog & Stock',
                items: [
                  { id: 'products', label: 'Products Catalog', icon: Package },
                  { id: 'stock', label: 'Stock Inventory', icon: Sliders },
                  { id: 'categories', label: 'Categories', icon: Tag },
                  { id: 'colors', label: 'Database Colors', icon: Settings },
                ]
              },
              {
                title: 'Customers & Reviews',
                items: [
                  { id: 'customers', label: 'Customers', icon: Users },
                  { id: 'reviews', label: 'Reviews Moderation', icon: Star },
                  { id: 'coupons', label: 'Promo Codes', icon: Percent },
                ]
              },
              {
                title: 'Content & System',
                items: [
                  { id: 'banners', label: 'Homepage Banners', icon: ImageIcon },
                  { id: 'pages', label: 'Static Pages', icon: FileText },
                  { id: 'staff', label: 'Staff Management', icon: Users },
                  { id: 'sql', label: 'SQL DB Console', icon: Database },
                  { id: 'audits', label: 'Audit Logs', icon: Shield },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ]
              }
            ];

            return menuSections.map((sect, sIdx) => {
              const allowedItems = sect.items.filter(item => hasPermission(item.id));
              if (allowedItems.length === 0) return null;

              return (
                <div key={sIdx} className="space-y-1">
                  {sidebarOpen && (
                    <div className="text-[9px] uppercase font-black tracking-widest text-[#6c757d] px-2.5 pt-2 pb-1 font-mono">
                      {sect.title}
                    </div>
                  )}
                  {allowedItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          if (item.id === 'orders') setUnseenOrders(0);
                          if (window.innerWidth < 768) setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-all duration-150 group ${
                          active
                            ? 'bg-[#007bff] text-white shadow'
                            : 'text-[#c2c7d0] hover:bg-[#494e53] hover:text-white'
                        }`}
                        title={item.label}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-white' : 'text-[#c2c7d0] group-hover:text-white'}`} />
                          {sidebarOpen && <span className="truncate">{item.label}</span>}
                        </div>
                        {item.id === 'orders' && unseenOrders > 0 && sidebarOpen && (
                          <span className="bg-[#dc3545] text-white text-[8px] font-black font-mono px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                            {unseenOrders}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
        </nav>

        {/* Sidebar Footer / Sign Out */}
        <div className="p-3 border-t border-[#4b545c] shrink-0 bg-[#343a40]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:bg-[#dc3545]/15 hover:text-rose-300 rounded transition-colors font-bold"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="uppercase tracking-wider">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* --- Main Workspace Content --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#f4f6f9]">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Sliders className="w-5 h-5 rotate-90" />
            </button>
            <span className="text-xs text-slate-400 capitalize">
              Admin &middot; {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync Status Button */}
            <button
              onClick={loadAllData}
              disabled={dataLoading}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${dataLoading ? 'animate-spin' : ''}`} />
              {dataLoading ? 'Syncing...' : 'Sync Database'}
            </button>
            <div className="text-[10px] text-slate-400 text-right hidden sm:block">
              <span>Cloudflare D1: heelsup-live</span>
            </div>
          </div>
        </header>

        {/* Page Content Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Dashboard Panel */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Overview Dashboard</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Real-time HeelsUp Sales & Operational Analytics</p>
                </div>
              </div>

              {/* AdminLTE Info/Small Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
                {/* 1. Total Revenue - bg-[#17a2b8] (Info) */}
                <div className="bg-[#17a2b8] text-white rounded shadow-sm overflow-hidden flex flex-col justify-between h-36 relative group">
                  <div className="p-4 relative z-10">
                    <h3 className="text-3xl font-black font-mono tracking-tight">
                      ₹{(((dashboardData?.total_sales || 0) + (dashboardData?.total_pos_sales || 0)) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </h3>
                    <p className="text-xs uppercase font-extrabold text-white/90 mt-1">Total Revenue</p>
                    <p className="text-[10px] text-white/70 font-mono mt-1">
                      Web: ₹{((dashboardData?.total_sales || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} | POS: ₹{((dashboardData?.total_pos_sales || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="absolute right-3 top-3 text-black/15 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                    <ShoppingCart className="w-16 h-16" />
                  </div>
                  <button onClick={() => { setActiveTab('orders'); setOrderSourceFilter('all'); }} className="bg-black/10 hover:bg-black/20 transition-colors text-center text-[10px] py-1.5 font-bold uppercase tracking-wider text-white border-t border-white/10 relative z-10 flex items-center justify-center gap-1">
                    More info <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Total Orders - bg-[#28a745] (Success) */}
                <div className="bg-[#28a745] text-white rounded shadow-sm overflow-hidden flex flex-col justify-between h-36 relative group">
                  <div className="p-4 relative z-10">
                    <h3 className="text-3xl font-black font-mono tracking-tight">
                      {(dashboardData?.orders_count || 0) + (dashboardData?.pos_sales_count || 0)}
                    </h3>
                    <p className="text-xs uppercase font-extrabold text-white/90 mt-1">Total Orders</p>
                    <p className="text-[10px] text-white/70 font-mono mt-1">
                      Web: {dashboardData?.orders_count || 0} | POS: {dashboardData?.pos_sales_count || 0}
                    </p>
                  </div>
                  <div className="absolute right-3 top-3 text-black/15 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                    <ShoppingCart className="w-16 h-16" />
                  </div>
                  <button onClick={() => { setActiveTab('orders'); setOrderSourceFilter('all'); }} className="bg-black/10 hover:bg-black/20 transition-colors text-center text-[10px] py-1.5 font-bold uppercase tracking-wider text-white border-t border-white/10 relative z-10 flex items-center justify-center gap-1">
                    More info <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. Catalog Products - bg-[#ffc107] (Warning - dark text) */}
                <div className="bg-[#ffc107] text-[#212529] rounded shadow-sm overflow-hidden flex flex-col justify-between h-36 relative group">
                  <div className="p-4 relative z-10">
                    <h3 className="text-3xl font-black font-mono tracking-tight">
                      {productsList.length}
                    </h3>
                    <p className="text-xs uppercase font-extrabold text-[#212529]/95 mt-1">Catalog Products</p>
                    <p className="text-[10px] text-[#212529]/70 font-mono mt-1 font-bold">
                      In Stock: {productsList.filter(p => p.stock > 0).length} | Out: {productsList.filter(p => p.stock === 0).length}
                    </p>
                  </div>
                  <div className="absolute right-3 top-3 text-black/10 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                    <Package className="w-16 h-16" />
                  </div>
                  <button onClick={() => setActiveTab('products')} className="bg-black/5 hover:bg-black/10 transition-colors text-center text-[10px] py-1.5 font-bold uppercase tracking-wider text-[#212529] border-t border-black/5 relative z-10 flex items-center justify-center gap-1">
                    More info <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4. Pending Exchanges - bg-[#dc3545] (Danger) */}
                <div className="bg-[#dc3545] text-white rounded shadow-sm overflow-hidden flex flex-col justify-between h-36 relative group">
                  <div className="p-4 relative z-10">
                    <h3 className="text-3xl font-black font-mono tracking-tight">
                      {returnsList.filter(r => r.status === 'pending').length}
                    </h3>
                    <p className="text-xs uppercase font-extrabold text-white/90 mt-1">Pending Exchanges</p>
                    <p className="text-[10px] text-white/70 font-mono mt-1">
                      Needs prompt processing
                    </p>
                  </div>
                  <div className="absolute right-3 top-3 text-white/15 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                    <RotateCw className="w-16 h-16" />
                  </div>
                  <button onClick={() => setActiveTab('returns')} className="bg-black/10 hover:bg-black/20 transition-colors text-center text-[10px] py-1.5 font-bold uppercase tracking-wider text-white border-t border-white/10 relative z-10 flex items-center justify-center gap-1">
                    More info <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* E-commerce Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (8/12 - 2 cols on lg) */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                  {/* Chart 1: Sales Trend */}
                  <div className={visibleSalesTrend ? "card card-outline card-primary bg-white border border-slate-150 border-t-[3px] border-t-blue-600 rounded-lg shadow-sm" : "hidden"}>
                    <div className="card-header border-b border-slate-150 px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                      <h3 className="card-title text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Sales & Revenue Trend
                      </h3>
                      <div className="card-tools flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase font-mono">Live</span>
                        <button 
                          onClick={() => setCollapsedSalesTrend(!collapsedSalesTrend)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Collapse"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setVisibleSalesTrend(false)}
                          className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className={`card-body p-6 space-y-4 ${collapsedSalesTrend ? 'hidden' : ''}`}>
                      <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider -mt-2">7-Day Transaction Performance</div>
                      {/* SVG Line Chart */}
                      <div className="relative">
                        <svg className="w-full h-64 overflow-visible" viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="trendShadow" x="-10%" y="-10%" width="120%" height="120%">
                              <feDropShadow dx="1.5" dy="2.5" stdDeviation="1.5" floodOpacity="0.25" />
                            </filter>
                          </defs>
      
                          {/* Grid Lines */}
                          <line x1="40" y1="30" x2="660" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="77.5" x2="660" y2="77.5" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="125" x2="660" y2="125" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="172.5" x2="660" y2="172.5" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="220" x2="660" y2="220" stroke="#e2e8f0" strokeWidth="1.5" />
      
                          {(() => {
                            const data = getDashboardDailyRevenue();
                            
                            const maxRev = Math.max(...data.map((d: any) => d.revenue || 0), 100000);
                            const minRev = 0;
                            
                            const points = data.map((d: any, idx: number) => {
                              const x = 50 + (idx * (590 / (data.length - 1 || 1)));
                              const y = 220 - (((d.revenue || 0) - minRev) / (maxRev - minRev)) * 170;
                              return { x, y, label: d.date || '', val: d.revenue || 0 };
                            });
      
                            const pathData = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaData = points.length ? `${pathData} L ${points[points.length - 1].x} 220 L ${points[0].x} 220 Z` : '';
      
                            return (
                              <>
                                {/* Area Fill */}
                                {areaData && <path d={areaData} fill="url(#areaGradient)" className="transition-all duration-500" />}
                                
                                {/* Trend Line */}
                                {pathData && <path d={pathData} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-500" filter="url(#trendShadow)" />}
      
                                {/* Data points */}
                                {points.map((p: any, idx: number) => {
                                  const isHovered = hoveredPoint === idx;
                                  return (
                                    <g key={idx}>
                                      {/* Interaction Circle */}
                                      <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r={isHovered ? 7 : 4.5}
                                        fill={isHovered ? '#2563eb' : '#ffffff'}
                                        stroke="#2563eb"
                                        strokeWidth="2.5"
                                        onMouseEnter={() => setHoveredPoint(idx)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                        className="cursor-pointer transition-all duration-150"
                                      />
                                      
                                      {/* X-Axis Label */}
                                      <text x={p.x} y="238" textAnchor="middle" className="text-[10px] fill-slate-400 font-bold font-mono">{p.label}</text>
                                      
                                      {/* Hover Tooltip */}
                                      {isHovered && (
                                        <g>
                                          <rect
                                            x={p.x - 50}
                                            y={p.y - 36}
                                            width="100"
                                            height="24"
                                            rx="6"
                                            fill="#0f172a"
                                            className="shadow-lg"
                                          />
                                          <text
                                            x={p.x}
                                            y={p.y - 20}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            className="text-[10px] font-extrabold font-mono"
                                          >
                                            ₹{(p.val / 100).toFixed(0)}
                                          </text>
                                        </g>
                                      )}
                                    </g>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Recent Web & POS Orders */}
                  <div className="card card-outline card-info bg-white border border-slate-150 border-t-[3px] border-t-sky-500 rounded-lg shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Recent Web & POS Orders</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-[10px] font-bold text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                            <th className="p-3">Ref</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {unifiedOrders.slice(0, 7).map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-mono font-bold text-slate-800">{o.order_number}</td>
                              <td className="p-3">{o.customer_name}</td>
                              <td className="p-3 font-mono font-bold">₹{(o.total_amount / 100).toFixed(2)}</td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  o.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                  o.order_status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                                  o.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {o.order_status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 text-[10px]">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column (4/12 - 1 col on lg) */}
                <div className="lg:col-span-1 space-y-6 flex flex-col">
                  {/* Chart 2: Category Share */}
                  <div className={visibleCategoryShare ? "card card-outline card-success bg-white border border-slate-150 border-t-[3px] border-t-emerald-500 rounded-lg shadow-sm" : "hidden"}>
                    <div className="card-header border-b border-slate-150 px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                      <h3 className="card-title text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                        <Tag className="w-4 h-4 text-emerald-500" />
                        Category Share
                      </h3>
                      <div className="card-tools flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase font-mono">Share</span>
                        <button 
                          onClick={() => setCollapsedCategoryShare(!collapsedCategoryShare)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Collapse"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setVisibleCategoryShare(false)}
                          className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
    
                    <div className={`card-body p-6 ${collapsedCategoryShare ? 'hidden' : ''}`}>
                      <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider -mt-2">Sales distribution by division</div>
                      <div className="flex flex-col items-center justify-between gap-6 pt-2">
                        {/* SVG Donut */}
                        <div className="relative w-44 h-44 shrink-0">
                          <svg className="w-full h-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            {(() => {
                              const data = getDashboardCategorySales();
                                
                              const total = data.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0);
                              let accumulatedPercent = 0;
                              
                              const segments = data.map((d: any, idx: number) => {
                                const percent = total > 0 ? (d.revenue || 0) / total : 0;
                                const strokeLength = percent * (2 * Math.PI * 50); // Circumference: ~314.16
                                const strokeOffset = 314.16 - strokeLength + (accumulatedPercent * 314.16);
                                accumulatedPercent -= percent;
                                
                                const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
                                const color = colors[idx % colors.length];
                                
                                return {
                                  category: d.category,
                                  revenue: d.revenue,
                                  percent: percent * 100,
                                  strokeLength,
                                  strokeOffset,
                                  color
                                };
                              });
      
                              const activeSeg = hoveredCategory !== null ? segments[hoveredCategory] : null;
      
                              return (
                                <>
                                  <defs>
                                    <filter id="donutShadow" x="-10%" y="-10%" width="120%" height="120%">
                                      <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.2" />
                                    </filter>
                                  </defs>
      
                                  {/* Background Circle */}
                                  <circle cx="100" cy="100" r="50" fill="none" stroke="#f1f5f9" strokeWidth="16" />
      
                                  {/* 3D Extrusion Shadow Layer */}
                                  {segments.map((seg: any, idx: number) => (
                                    <circle
                                      key={`shadow-${idx}`}
                                      cx="100"
                                      cy="103"
                                      r="50"
                                      fill="none"
                                      stroke="#0f172a"
                                      strokeOpacity="0.12"
                                      strokeWidth="16"
                                      strokeDasharray={`${seg.strokeLength} 314.16`}
                                      strokeDashoffset={seg.strokeOffset}
                                      transform="rotate(-90 100 103)"
                                    />
                                  ))}
      
                                  {/* Segments */}
                                  {segments.map((seg: any, idx: number) => (
                                    <circle
                                      key={idx}
                                      cx="100"
                                      cy="100"
                                      r="50"
                                      fill="none"
                                      stroke={seg.color}
                                      strokeWidth="16"
                                      strokeDasharray={`${seg.strokeLength} 314.16`}
                                      strokeDashoffset={seg.strokeOffset}
                                      transform="rotate(-90 100 100)"
                                      className="transition-all duration-300 cursor-pointer hover:stroke-[20]"
                                      onMouseEnter={() => setHoveredCategory(idx)}
                                      onMouseLeave={() => setHoveredCategory(null)}
                                      filter="url(#donutShadow)"
                                    />
                                  ))}
      
                                  {/* Center text */}
                                  <text x="100" y="92" textAnchor="middle" className="text-[12px] fill-slate-400 font-black uppercase tracking-widest font-sans">
                                    {activeSeg ? activeSeg.category : 'Total'}
                                  </text>
                                  <text x="100" y="118" textAnchor="middle" className="text-xl font-extrabold font-mono fill-slate-800">
                                    {activeSeg ? `${activeSeg.percent.toFixed(0)}%` : `₹${(total / 100 / 1000).toFixed(0)}k`}
                                  </text>
                                </>
                              );
                            })()}
                          </svg>
                        </div>
      
                        {/* Interactive legends */}
                        <div className="flex-1 space-y-1 w-full font-sans">
                          {(() => {
                            const data = getDashboardCategorySales();
                            const total = data.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0);
                            const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
      
                            return data.slice(0, 5).map((d: any, idx: number) => {
                              const pct = total > 0 ? (d.revenue / total) * 100 : 0;
                              const color = colors[idx % colors.length];
                              const active = hoveredCategory === idx;
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-1.5 rounded-xl transition-colors ${active ? 'bg-slate-50' : ''}`}
                                  onMouseEnter={() => setHoveredCategory(idx)}
                                  onMouseLeave={() => setHoveredCategory(null)}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="font-extrabold text-[10px] text-slate-655 truncate uppercase">{d.category}</span>
                                  </div>
                                  <span className="font-mono font-black text-xs text-slate-900">{pct.toFixed(0)}%</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 3: Stock Warning */}
                  <div className={visibleStockWarning ? "card card-outline card-warning bg-white border border-slate-150 border-t-[3px] border-t-amber-500 rounded-lg shadow-sm" : "hidden"}>
                    <div className="card-header border-b border-slate-150 px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                      <h3 className="card-title text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Product Stock Alert
                      </h3>
                      <div className="card-tools flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-650 rounded text-[9px] font-bold uppercase font-mono">Stock Warning</span>
                        <button 
                          onClick={() => setCollapsedStockWarning(!collapsedStockWarning)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Collapse"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setVisibleStockWarning(false)}
                          className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
    
                    <div className={`card-body p-6 space-y-4 ${collapsedStockWarning ? 'hidden' : ''}`}>
                      <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider -mt-2">Real-time stock levels of active items requiring attention</div>
                      <div className="relative">
                        <svg className="w-full h-44 overflow-visible" viewBox="0 0 350 140" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <filter id="cylShadow" x="-10%" y="-10%" width="120%" height="120%">
                              <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.15" />
                            </filter>
                          </defs>
                          {/* Grid limits */}
                          <line x1="20" y1="20" x2="330" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="20" y1="70" x2="330" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="20" y1="120" x2="330" y2="120" stroke="#e2e8f0" strokeWidth="1.5" />
      
                          {(() => {
                            const defaultTopProducts = [
                              { name: 'Bridal Wedge - Cream', stock: 12 },
                              { name: 'Casual Flat - Tan', stock: 8 },
                              { name: 'Office Block - Black', stock: 2 },
                              { name: 'Evening Heel - Silver', stock: 15 },
                              { name: 'Stiletto Wedge - Pink', stock: 1 },
                            ];
                            const data = productsList.length > 0
                              ? [...productsList].sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 5)
                              : defaultTopProducts;
                            
                            const maxVal = Math.max(...data.map((d: any) => d.stock || 0), 20);
      
                            return data.map((d: any, idx: number) => {
                              const height = Math.max(6, ((d.stock || 0) / maxVal) * 100);
                              const x = 30 + idx * 60;
                              const y = 120 - height;
                              const color = d.stock === 0 ? '#f43f5e' : d.stock <= 5 ? '#f59e0b' : '#10b981';
      
                              return (
                                <g key={idx} className="group cursor-pointer">
                                  <rect
                                    x={x + 4}
                                    y={20}
                                    width="22"
                                    height={100}
                                    rx="4"
                                    fill="#f8fafc"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                  />
                                  <rect
                                    x={x + 4}
                                    y={y}
                                    width="22"
                                    height={height}
                                    rx="4"
                                    fill={color}
                                    className="transition-all duration-300 group-hover:brightness-105"
                                  />
                                  <text
                                    x={x + 15}
                                    y={y - 4}
                                    textAnchor="middle"
                                    className="text-[8px] font-black font-mono fill-slate-700"
                                  >
                                    {d.stock}
                                  </text>
                                  <text
                                    x={x + 15}
                                    y="132"
                                    textAnchor="middle"
                                    className="text-[7px] fill-slate-500 font-bold font-sans uppercase"
                                  >
                                    {d.name ? (d.name.length > 8 ? d.name.slice(0, 6) + '..' : d.name) : `P-${idx+1}`}
                                  </text>
                                  <title>{d.name} ({d.stock} units)</title>
                                </g>
                              );
                            });
                          })()}
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Low Stock Watchlist */}
                  <div className="card card-outline card-danger bg-white border border-slate-150 border-t-[3px] border-t-rose-500 rounded-lg shadow-sm p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 font-sans">Low Stock Watchlist</h3>
                    <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
                      {productsList.filter(p => p.stock <= 5).slice(0, 10).map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-sans">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{p.name}</h4>
                            <span className="text-[9px] font-mono text-slate-400">{p.sku}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            p.stock === 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.stock} units
                          </span>
                        </div>
                      ))}
                      {productsList.filter(p => p.stock <= 5).length === 0 && (
                        <div className="py-12 text-center text-xs text-slate-400">Inventory levels are healthy!</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Panel */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Products Catalog</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Manage Jodhpur Footwear collections & stock allocations</p>
                </div>
                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Style Entry
                </button>
              </div>

              {/* Filter Row */}
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => { setProductSearch(e.target.value); setProductPage(0); }}
                      placeholder="Search name, SKU prefix..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={productCatFilter}
                    onChange={(e) => { setProductCatFilter(e.target.value); setProductPage(0); }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <button
                    disabled={productPage === 0}
                    onClick={() => setProductPage(p => p - 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>{productPage + 1} / {Math.ceil(filteredProducts.length / itemsPerPage) || 1}</span>
                  <button
                    disabled={(productPage + 1) * itemsPerPage >= filteredProducts.length}
                    onClick={() => setProductPage(p => p + 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Products Grid Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3 w-16">Image</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Stock Sum</th>
                        <th className="p-3">Markers</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3">
                            {p.images && p.images.length > 0 ? (
                              <div className="w-10 h-10 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center p-1">
                                <HeicImage src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold">N/A</div>
                            )}
                          </td>
                          <td className="p-3">
                            <h4 className="font-bold text-slate-900">{p.name}</h4>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{p.brand || 'HeelsUp'}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{p.sku}</td>
                          <td className="p-3 text-slate-500">{p.category}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">₹{(p.price / 100).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                              p.stock === 0 ? 'bg-rose-100 text-rose-800' :
                              p.stock <= 5 ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {p.stock} units
                            </span>
                          </td>
                          <td className="p-3 space-x-1 whitespace-nowrap">
                            {p.featured && <span className="text-[8px] bg-blue-50 text-blue-700 font-bold uppercase px-1 py-0.5 rounded border border-blue-100">Featured</span>}
                            {p.is_new && <span className="text-[8px] bg-emerald-50 text-emerald-700 font-bold uppercase px-1 py-0.5 rounded border border-emerald-100">New</span>}
                            {p.is_trending && <span className="text-[8px] bg-amber-50 text-amber-700 font-bold uppercase px-1 py-0.5 rounded border border-amber-100">Trending</span>}
                            {!p.active && <span className="text-[8px] bg-rose-50 text-rose-700 font-bold uppercase px-1 py-0.5 rounded border border-rose-100">Disabled</span>}
                          </td>
                          <td className="p-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 inline-block"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-600 hover:text-rose-700 inline-block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedProducts.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-24 text-center text-slate-400 italic">No products match search criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Stock Inventory Panel */}
          {activeTab === 'stock' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Stock & Size Inventory</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Control size-by-size stocks and reserved quantities</p>
              </div>

              {/* Filtering */}
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products by title or SKU..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-xs font-mono text-slate-400">
                  <span>Showing {filteredProducts.length} sizes matrices</span>
                </div>
              </div>

              {/* Stock matrices layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProducts.slice(0, 30).map((prod) => {
                  return (
                    <div key={prod.id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        {prod.images && prod.images.length > 0 ? (
                          <div className="w-12 h-12 rounded-lg bg-slate-50 overflow-hidden border border-slate-100 p-1 shrink-0">
                            <HeicImage src={prod.images[0]} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 shrink-0">N/A</div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{prod.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{prod.sku} &middot; {prod.category}</span>
                        </div>
                      </div>

                      {/* Sizes stock grid */}
                      <div className="grid grid-cols-4 gap-3">
                        {['36', '37', '38', '39', '40', '41'].map((size) => {
                          const sizeRecord = prod.size_stock?.find((s) => s.size_label === size);
                          const currentStock = sizeRecord ? sizeRecord.stock : 0;
                          const reservedStock = sizeRecord ? (sizeRecord.reserved || 0) : 0;

                          const tempVal = stockUpdates[prod.id]?.[size] ?? currentStock;

                          return (
                            <div key={size} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-1.5 relative group">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 font-mono">Size {size}</span>
                                {reservedStock > 0 && (
                                  <span className="text-[8px] bg-rose-100 text-rose-800 font-bold px-1 rounded">
                                    {reservedStock} res
                                  </span>
                                )}
                              </div>
                              
                              {/* Stock Input Form */}
                              <div className="flex items-center gap-1 mt-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={tempVal}
                                  onChange={(e) => handleStockUpdateChange(prod.id, size, parseInt(e.target.value) || 0)}
                                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                {tempVal !== currentStock && (
                                  <button
                                    onClick={() => saveSizeStockChange(prod.id, size)}
                                    className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                                    title="Save Stock"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orders Panel */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Customer Orders</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Fulfill shipments, update courier logs and dispatch tracking data</p>
              </div>

              {/* Filter */}
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(0); }}
                      placeholder="Search order ref, customer..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => { setOrderStatusFilter(e.target.value); setOrderPage(0); }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered / Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={orderSourceFilter}
                    onChange={(e) => { setOrderSourceFilter(e.target.value as any); setOrderPage(0); }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none font-sans"
                  >
                    <option value="all">All Channels</option>
                    <option value="web">Web Store</option>
                    <option value="pos">POS Offline</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <button
                    disabled={orderPage === 0}
                    onClick={() => setOrderPage(p => p - 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>{orderPage + 1} / {Math.ceil(filteredOrders.length / itemsPerPage) || 1}</span>
                  <button
                    disabled={(orderPage + 1) * itemsPerPage >= filteredOrders.length}
                    onClick={() => setOrderPage(p => p + 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Orders table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Ref Code</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Source</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Total Bill</th>
                        <th className="p-3">Order Status</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{o.order_number}</td>
                          <td className="p-3">
                            <h4 className="font-bold text-slate-800">{o.customer_name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">{o.customer_phone}</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              o.source === 'pos' ? 'bg-slate-100 text-slate-800' :
                              o.source === 'whatsapp' ? 'bg-emerald-100 text-emerald-800' :
                              o.source === 'instagram' ? 'bg-pink-100 text-pink-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {o.source || 'web'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[10px]">{new Date(o.created_at).toLocaleString('en-IN')}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">₹{(o.total_amount / 100).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              o.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                              o.order_status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                              o.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {o.order_status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">
                            <span className="font-bold uppercase text-[9px] block">{o.payment_method}</span>
                            <span className="text-[8px] opacity-70 block mt-0.5">{o.payment_status}</span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => { setSelectedOrder(o); setOrderDrawerOpen(true); }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 inline-block"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                             <button
                              onClick={() => printInvoiceWindow(o)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 inline-block"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {!o.is_pos && (
                              <button
                                onClick={() => printDispatchWindow(o)}
                                className="p-1 hover:bg-slate-100 rounded text-amber-600 hover:text-amber-800 inline-block"
                                title="Print Dispatch Slip"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {paginatedOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-24 text-center text-slate-400 italic">No orders match search parameters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Category Configuration</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Configure style categories and collection catalog lists</p>
                </div>
                <button
                  onClick={handleOpenAddCategory}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" /> New Category
                </button>
              </div>

              {/* Categories list */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3 w-16">Image</th>
                        <th className="p-3">Category Name</th>
                        <th className="p-3">Url Slug</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Sorting Index</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoriesList.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3">
                            {cat.image_url ? (
                              <div className="w-10 h-10 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 p-0.5">
                                <HeicImage src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400">N/A</div>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{cat.name}</td>
                          <td className="p-3 font-mono text-slate-500">/shop?cat={cat.slug}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{cat.description || 'No description provided.'}</td>
                          <td className="p-3 font-mono">{cat.sort_order}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              cat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {cat.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 inline-block"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-600 hover:text-rose-700 inline-block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Customers Panel */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Registered Users</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Moderate customer accounts, order limits, and system permissions</p>
              </div>

              {/* Filtering */}
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setCustomerPage(0); }}
                    placeholder="Search by name, email or phone..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <button
                    disabled={customerPage === 0}
                    onClick={() => setCustomerPage(p => p - 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>{customerPage + 1} / {Math.ceil(filteredCustomers.length / itemsPerPage) || 1}</span>
                  <button
                    disabled={(customerPage + 1) * itemsPerPage >= filteredCustomers.length}
                    onClick={() => setCustomerPage(p => p + 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Customers Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Customer Profile</th>
                        <th className="p-3">Contact Email</th>
                        <th className="p-3">Phone Number</th>
                        <th className="p-3">Orders Filled</th>
                        <th className="p-3">Total Spent</th>
                        <th className="p-3">Registration Date</th>
                        <th className="p-3 text-right">Block Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{c.first_name} {c.last_name || ''}</td>
                          <td className="p-3 font-mono text-slate-500">{c.email}</td>
                          <td className="p-3 font-mono text-slate-500">{c.phone || 'N/A'}</td>
                          <td className="p-3 font-mono">{c.orders_count || 0} orders</td>
                          <td className="p-3 font-mono font-bold text-slate-900">₹{((c.total_spent || 0) / 100).toFixed(2)}</td>
                          <td className="p-3 text-slate-400 text-[10px]">{new Date(c.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleBlockCustomer(c)}
                              className={`px-2 py-1 text-[8px] font-bold uppercase rounded ${
                                c.is_blocked ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}
                            >
                              {c.is_blocked ? 'Unblock' : 'Block User'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedCustomers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-24 text-center text-slate-400 italic">No customer accounts registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Panel */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Review Moderation</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Approve, reject or delete product feedback from verified buyers</p>
              </div>

              {/* Filtering */}
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => { setReviewSearch(e.target.value); setReviewPage(0); }}
                    placeholder="Search reviews by body, user or product..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <button
                    disabled={reviewPage === 0}
                    onClick={() => setReviewPage(p => p - 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>{reviewPage + 1} / {Math.ceil(filteredReviews.length / itemsPerPage) || 1}</span>
                  <button
                    disabled={(reviewPage + 1) * itemsPerPage >= filteredReviews.length}
                    onClick={() => setReviewPage(p => p + 1)}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reviews Listing */}
              <div className="grid grid-cols-1 gap-4">
                {paginatedReviews.map((rev) => (
                  <div key={rev.id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">{new Date(rev.created_at || Date.now()).toLocaleDateString('en-IN')}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs">{rev.title}</h4>
                      <p className="text-slate-600 text-xs leading-relaxed italic">"{rev.body}"</p>
                      <div className="text-[10px] text-slate-400">
                        Submitted by: <strong className="text-slate-600">{rev.reviewer_name}</strong> &middot; Product: <strong className="text-slate-600">{rev.product_name}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {rev.status === 'pending' ? (
                        <button
                          onClick={() => handleApproveReview(rev.id)}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95"
                        >
                          Approve Feedback
                        </button>
                      ) : (
                        <span className="text-[9px] bg-slate-100 text-slate-600 font-bold uppercase px-2 py-1 rounded border border-slate-200">Approved</span>
                      )}
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all active:scale-95"
                        title="Delete Review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {paginatedReviews.length === 0 && (
                  <div className="py-24 text-center text-slate-400 italic bg-white rounded-2xl border border-slate-100">No product feedback matching criteria.</div>
                )}
              </div>
            </div>
          )}

          {/* Promo Codes Panel */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Promo Codes & Coupons</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Manage customer discount offers and cart coupons</p>
                </div>
                <button
                  onClick={handleOpenAddCoupon}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Create Coupon
                </button>
              </div>

              {/* Coupons List */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Coupon Code</th>
                        <th className="p-3">Value</th>
                        <th className="p-3">Min Order Limit</th>
                        <th className="p-3">Discount Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {couponsList.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{coupon.code}</td>
                          <td className="p-3 font-mono font-bold">
                            {coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`}
                          </td>
                          <td className="p-3 font-mono">₹{coupon.min_order}</td>
                          <td className="p-3 capitalize text-slate-500">{coupon.type}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{coupon.description || 'N/A'}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              coupon.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {coupon.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditCoupon(coupon)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 inline-block"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-600 hover:text-rose-700 inline-block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Homepage Banners Panel */}
          {activeTab === 'banners' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Slideshow Banners</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Manage homepage slide assets and target routes</p>
                </div>
                <button
                  onClick={handleOpenAddBanner}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Banner Slide
                </button>
              </div>

              {/* Banners Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bannersList.map((ban) => (
                  <div key={ban.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="h-44 bg-slate-100 overflow-hidden relative">
                      <HeicImage src={ban.image_url} alt={ban.title} className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 bg-black/40 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm">
                        Slide Sort: {ban.sort_order}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-slate-950 text-sm">{ban.title}</h4>
                      <p className="text-slate-500 text-xs truncate">{ban.subtitle || 'No subtitle provided.'}</p>
                      <div className="text-[10px] text-slate-400 truncate">
                        Link URL: <span className="font-mono text-slate-600">{ban.link || '/shop'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          ban.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {ban.active ? 'Visible' : 'Hidden'}
                        </span>
                        <div className="space-x-2">
                          <button
                            onClick={() => handleOpenEditBanner(ban)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 inline-block text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBanner(ban.id)}
                            className="p-1 hover:bg-rose-50 rounded text-rose-600 hover:text-rose-700 inline-block text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Static Pages configurations */}
          {activeTab === 'pages' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Static Pages Manager</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Control Terms of Service, Privacy Policy and FAQ contents</p>
                </div>
                <button
                  onClick={handleOpenAddPage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" /> New Page Config
                </button>
              </div>

              {/* Pages config list */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Page Title</th>
                        <th className="p-3">Url Slug Path</th>
                        <th className="p-3">Content Preview</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagesList.map((page) => (
                        <tr key={page.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{page.title}</td>
                          <td className="p-3 font-mono text-slate-500">/pages/{page.slug}</td>
                          <td className="p-3 text-slate-400 max-w-xs truncate">{page.content ? page.content.slice(0, 80) : 'Empty content.'}...</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              page.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {page.active ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditPage(page)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 inline-block font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePage(page.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-600 hover:text-rose-700 inline-block font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Global System Settings</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Configure payment gateways, credentials and system toggles</p>
              </div>

              {/* Settings list form */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-3xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settingsList && Array.isArray(settingsList) && settingsList.map((st) => {
                    return (
                      <div key={st.key} className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">{st.description || st.key}</label>
                        <input
                          type="text"
                          value={st.value === null || st.value === undefined ? "" : (typeof st.value === 'object' ? JSON.stringify(st.value) : String(st.value))}
                          onChange={(e) => {
                            const updated = settingsList.map(item => item.key === st.key ? { ...item, value: e.target.value } : item);
                            setSettingsList(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/settings', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ settings: settingsList })
                        });
                        const data = await res.json();
                        if (data.success) {
                          showToast('success', 'Settings Saved', 'System configurations updated.');
                          loadAllData();
                        } else {
                          showToast('error', 'Error Saving', data.error);
                        }
                      } catch {
                        showToast('error', 'Sync Failure', 'Failed to update system variables.');
                      }
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>

              {/* Staff Management section */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-3xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">Administrative Staff Accounts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Staff Profile</th>
                        <th className="p-3">Administrative Email</th>
                        <th className="p-3">Role Status</th>
                        <th className="p-3 text-right">Block Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffList.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{st.first_name} {st.last_name || ''}</td>
                          <td className="p-3 font-mono text-slate-500">{st.email}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              st.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {st.role}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {st.email !== 'support@heelsup.in' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleBlockStaff(st)}
                                className={`px-2 py-1 text-[8px] font-bold uppercase rounded ${
                                  st.is_blocked ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}
                              >
                                {st.is_blocked ? 'Unlock Account' : 'Block Staff'}
                              </button>
                            ) : (
                              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider px-2">Root Master</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* POS Terminal Tab */}
          {activeTab === 'pos' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Point of Sale (POS)</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Process offline retail transactions and print receipts</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Product Catalog list (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={posSearchQuery}
                        onChange={(e) => setPosSearchQuery(e.target.value)}
                        placeholder="Search POS catalog..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <select
                      value={posCatFilter}
                      onChange={(e) => setPosCatFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      {categoriesList.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Catalog grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {posFilteredProducts.slice(0, 18).map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => handleOpenPosProduct(prod)}
                        className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm text-left flex flex-col gap-2 hover:border-blue-500 transition-colors"
                      >
                        {prod.images && prod.images.length > 0 ? (
                          <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden border border-slate-100 p-1 flex items-center justify-center">
                            <HeicImage src={prod.images[0]} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400">N/A</div>
                        )}
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{prod.name}</h4>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-slate-700">₹{(prod.price / 100).toFixed(2)}</span>
                          <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-1 rounded">{prod.stock} stock</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cart receipt list (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">Offline Billing Cart</h3>
                  
                  {/* Cart items */}
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {posCart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{item.product.name}</h4>
                          <span className="text-[9px] text-slate-400 font-mono">Size {item.size} &middot; {item.color} &middot; {item.qty} units</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-850">₹{((item.price * item.qty) / 100).toFixed(2)}</span>
                          <button onClick={() => handleRemovePosCart(idx)} className="text-rose-500 hover:text-rose-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {posCart.length === 0 && (
                      <div className="py-12 text-center text-xs text-slate-400 italic">Bill cart is empty. Click styles to add.</div>
                    )}
                  </div>

                  {/* Customer input fields */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          placeholder="Walk-in Customer"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={posCustomerPhone}
                          onChange={(e) => setPosCustomerPhone(e.target.value)}
                          placeholder="98765 XXXXX"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Discount (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={posDiscount}
                          onChange={(e) => setPosDiscount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Payment Method</label>
                        <select
                          value={posPaymentMethod}
                          onChange={(e) => setPosPaymentMethod(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600"
                        >
                          <option value="cash">Cash Payment</option>
                          <option value="upi">UPI / Scanner</option>
                          <option value="card">Debit/Credit Card</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Transaction Notes</label>
                      <input
                        type="text"
                        value={posNotes}
                        onChange={(e) => setPosNotes(e.target.value)}
                        placeholder="In-store pickup / size swap logs..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Summary bill calculations */}
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cart Subtotal:</span>
                      <span className="font-mono">
                        ₹{(posCart.reduce((sum, item) => sum + (item.price * item.qty), 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    {parseFloat(posDiscount) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>POS Discount:</span>
                        <span className="font-mono">-₹{parseFloat(posDiscount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-2 text-slate-900">
                      <span>Total Payable:</span>
                      <span className="font-mono">
                        ₹{Math.max(0, (posCart.reduce((sum, item) => sum + (item.price * item.qty), 0) / 100) - parseFloat(posDiscount || '0')).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handlePosCheckout}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors active:scale-95"
                  >
                    Generate POS Invoice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SQL Console Tab */}
          {activeTab === 'sql' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Database Console Terminal</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Execute raw SQLite query statements in the active Cloudflare D1 container</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-6">
                  {/* Console Terminal Editor */}
                  <form onSubmit={executeSqlQuery} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-600" /> SQL Command Line
                      </span>
                      <button type="button" onClick={() => setSqlQuery('')} className="text-[9px] text-slate-400 hover:text-slate-600 uppercase tracking-widest font-bold">Clear Editor</button>
                    </div>

                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="SELECT * FROM products ORDER BY id DESC LIMIT 5;"
                      className="w-full h-40 bg-slate-950 text-emerald-400 rounded-xl p-4 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent leading-relaxed"
                    />

                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 italic">Terminator (;) is required for SQLite statements.</span>
                      <button
                        type="submit"
                        disabled={sqlLoading}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs uppercase tracking-widest flex items-center gap-1.5 transition-colors shadow-md active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {sqlLoading ? 'Compiling...' : 'Run Statement'}
                      </button>
                    </div>
                  </form>

                  {/* SQL compilation error feedback */}
                  {sqlError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-xs text-rose-950">
                      <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[10px] uppercase tracking-wider">SQL Compilation Error</h5>
                        <p className="mt-1 font-mono leading-relaxed text-[11px]">{sqlError}</p>
                      </div>
                    </div>
                  )}

                  {/* SQL Results View */}
                  {sqlResults && (
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Query results ({sqlResults.results?.length || 0} rows | changes: {sqlResults.changes || 0})
                        </span>
                      </div>
                      {sqlResults.results?.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 font-mono">Statement executed successfully. No rows returned.</div>
                      ) : (
                        <div className="overflow-x-auto max-h-[30vh]">
                          <table className="w-full text-[10px] text-left border-collapse font-mono text-slate-800">
                            <thead>
                              <tr className="bg-slate-100 text-slate-500 border-b border-slate-200">
                                {Object.keys(sqlResults.results?.[0] || {}).map((k) => (
                                  <th key={k} className="p-3 font-bold uppercase tracking-wider">{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sqlResults.results?.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  {Object.keys(row).map((k) => (
                                    <td key={k} className="p-3 max-w-xs truncate">{String(row[k] ?? 'NULL')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Database schemas & Templates (4 cols) */}
                <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">Console Statement Library</h3>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSqlQuery('SELECT sku, name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC;')}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-mono text-slate-600 block transition-all"
                    >
                      ⚠️ Watch Low Stock Products
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlQuery('SELECT order_number, total_amount, order_status FROM orders WHERE order_status = \'placed\' ORDER BY id DESC;')}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-mono text-slate-600 block transition-all"
                    >
                      📦 Watch Placed Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlQuery('SELECT code, discount_value, min_purchase FROM coupons WHERE active = 1;')}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-mono text-slate-600 block transition-all"
                    >
                      🏷️ List Active Coupons
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'audits' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Audit Logs</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Track administrative staff write operations and system access logs</p>
              </div>

              {/* Filtering */}
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search logs by email, action, details..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        setLogsLoading(true);
                        try {
                          const val = (e.target as HTMLInputElement).value;
                          const res = await fetch(`/api/admin/query`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              sql: `SELECT * FROM audit_log ${val ? "WHERE LOWER(action) LIKE LOWER(?) OR LOWER(details) LIKE LOWER(?)" : ""} ORDER BY id DESC LIMIT 100`,
                              params: val ? [`%${val}%`, `%${val}%`] : []
                            })
                          });
                          const data = await res.json();
                          if (data.success && data.data) {
                            setAuditLogs(data.data.results || []);
                          }
                        } catch {
                          showToast('error', 'Query Failed', 'Failed to retrieve audit log entries.');
                        } finally {
                          setLogsLoading(false);
                        }
                      }
                    }}
                  />
                </div>
                <button
                  onClick={async () => {
                    setLogsLoading(true);
                    try {
                      const res = await fetch(`/api/admin/query`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          sql: 'SELECT * FROM audit_log ORDER BY id DESC LIMIT 100'
                        })
                      });
                      const data = await res.json();
                      if (data.success && data.data) {
                        setAuditLogs(data.data.results || []);
                        showToast('success', 'Refresh Logs', 'Audit logs synced.');
                      }
                    } catch {
                      showToast('error', 'Fetch Error', 'Failed to read logs.');
                    } finally {
                      setLogsLoading(false);
                    }
                  }}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} /> Sync Logs
                </button>
              </div>

              {/* Logs Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3 w-40">Timestamp</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono text-slate-400 text-[10px]">
                            {new Date(log.created_at || Date.now()).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {log.user_id ? `User ID ${log.user_id}` : 'System / Guest'}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-700 uppercase">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 leading-relaxed text-[11px]">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-24 text-center text-slate-400 italic">Press "Sync Logs" or type filter and press Enter to query registry.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Returns manager tab */}
          {activeTab === 'returns' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-light text-slate-900 font-display italic">Exchanges Manager</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Approve exchange requests, inspect customer reason notes and replacement products</p>
              </div>

              {/* Returns List */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Order Ref</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Exchange Reason</th>
                        <th className="p-3">Details / Notes</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returnsList.map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{ret.order_number}</td>
                          <td className="p-3 font-semibold text-slate-800">{ret.reviewer_name}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{ret.reason}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{ret.description || 'No additional details'}</td>
                          <td className="p-3 text-slate-400 text-[10px]">{new Date(ret.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              ret.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              ret.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {ret.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {ret.status === 'pending' ? (
                              <button
                                onClick={() => handleOpenReturnsModal(ret)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-700"
                              >
                                Review Request
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Handled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {returnsList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-24 text-center text-slate-400 italic">No exchange requests logged in registry.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* Advanced Analysis Panel */}
          {activeTab === 'analysis' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Advanced Business Analysis</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Granular multi-criteria filtering, order value boundaries, and CSV transaction exports</p>
                </div>
                <button
                  onClick={handleExportAnalysisCSV}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV Report
                </button>
              </div>

              {/* Filtering Controls Card */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Time Period Preset</label>
                    <select
                      value={analysisDatePreset}
                      onChange={(e: any) => setAnalysisDatePreset(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="7">Last 7 Days</option>
                      <option value="15">Last 15 Days</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                  </div>

                  {analysisDatePreset === 'custom' && (
                    <>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={analysisStartDate}
                          onChange={(e) => setAnalysisStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                        <input
                          type="date"
                          value={analysisEndDate}
                          onChange={(e) => setAnalysisEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Sales Channel</label>
                    <select
                      value={analysisChannel}
                      onChange={(e: any) => setAnalysisChannel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="all">All Channels (Web + POS)</option>
                      <option value="web">Web Store Only</option>
                      <option value="pos">POS Walk-in Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Filter</label>
                    <select
                      value={analysisCategoryFilter}
                      onChange={(e) => setAnalysisCategoryFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="all">All Categories</option>
                      {categoriesList.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Search Customer (Name, Phone, Email)</label>
                    <input
                      type="text"
                      placeholder="e.g. Customer Name, 9876543210"
                      value={analysisCustomerSearch}
                      onChange={(e) => setAnalysisCustomerSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Search Product Name or SKU</label>
                    <input
                      type="text"
                      placeholder="e.g. Bridal Wedge, SKU..."
                      value={analysisProductSearch}
                      onChange={(e) => setAnalysisProductSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Min Value (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={analysisMinAmt}
                        onChange={(e) => setAnalysisMinAmt(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Max Value (₹)</label>
                      <input
                        type="number"
                        placeholder="10000"
                        value={analysisMaxAmt}
                        onChange={(e) => setAnalysisMaxAmt(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Performance Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Chart 1: 3D Category Revenue Share (Pie) */}
                <div className={visibleCategoryRevenueShare ? "card card-outline card-info bg-white border border-slate-150 border-t-[3px] border-t-sky-500 rounded-lg shadow-sm" : "hidden"}>
                  <div className="card-header border-b border-slate-150 px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                    <h3 className="card-title text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                      <Sliders className="w-4 h-4 text-sky-500" />
                      Category Revenue Share
                    </h3>
                    <div className="card-tools flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase font-mono">Revenue %</span>
                      <button 
                        onClick={() => setCollapsedCategoryRevenueShare(!collapsedCategoryRevenueShare)}
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Collapse"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setVisibleCategoryRevenueShare(false)}
                        className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={`card-body p-5 space-y-4 ${collapsedCategoryRevenueShare ? 'hidden' : ''}`}>
                    <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider -mt-2">Revenue percentage per footwear division</div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <filter id="pieShadowAnalysis" x="-10%" y="-10%" width="120%" height="120%">
                              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.15" />
                            </filter>
                          </defs>
                          {(() => {
                            const catData = getAnalysisCategoryData();
                            const totalRev = catData.reduce((sum, d) => sum + d.revenue, 0);
                            let accumulatedPercent = 0;

                            const segments = catData.map((d, idx) => {
                              const percent = totalRev > 0 ? d.revenue / totalRev : 0;
                              const strokeLength = percent * 314.16;
                              const strokeOffset = 314.16 - strokeLength + (accumulatedPercent * 314.16);
                              accumulatedPercent -= percent;

                              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
                              const color = colors[idx % colors.length];

                              return {
                                category: d.category,
                                revenue: d.revenue,
                                percent: percent * 100,
                                strokeLength,
                                strokeOffset,
                                color
                              };
                            });

                            const activeSeg = hoveredCategoryAnalysis !== null ? segments[hoveredCategoryAnalysis] : null;

                            return (
                              <>
                                <circle cx="100" cy="100" r="50" fill="none" stroke="#f8fafc" strokeWidth="18" />
                                
                                {/* 3D shadow layer */}
                                {segments.map((seg, idx) => (
                                  <circle
                                    key={`sh-${idx}`}
                                    cx="100"
                                    cy="104"
                                    r="50"
                                    fill="none"
                                    stroke="#0f172a"
                                    strokeOpacity="0.1"
                                    strokeWidth="18"
                                    strokeDasharray={`${seg.strokeLength} 314.16`}
                                    strokeDashoffset={seg.strokeOffset}
                                    transform="rotate(-90 100 104)"
                                  />
                                ))}

                                {/* Segments */}
                                {segments.map((seg, idx) => (
                                  <circle
                                    key={idx}
                                    cx="100"
                                    cy="100"
                                    r="50"
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth="18"
                                    strokeDasharray={`${seg.strokeLength} 314.16`}
                                    strokeDashoffset={seg.strokeOffset}
                                    transform="rotate(-90 100 100)"
                                    className="transition-all duration-300 cursor-pointer hover:stroke-[22]"
                                    onMouseEnter={() => setHoveredCategoryAnalysis(idx)}
                                    onMouseLeave={() => setHoveredCategoryAnalysis(null)}
                                    filter="url(#pieShadowAnalysis)"
                                  />
                                ))}

                                {/* Center text */}
                                <text x="100" y="95" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold uppercase tracking-widest">
                                  {activeSeg ? activeSeg.category : 'Total Rev'}
                                </text>
                                <text x="100" y="115" textAnchor="middle" className="text-xs font-extrabold font-mono fill-slate-800">
                                  {activeSeg ? `${activeSeg.percent.toFixed(0)}%` : `₹${(totalRev / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                                </text>
                              </>
                            );
                          })()}
                        </svg>
                      </div>

                      <div className="flex-1 space-y-1.5 w-full">
                        {(() => {
                          const catData = getAnalysisCategoryData();
                          const totalRev = catData.reduce((sum, d) => sum + d.revenue, 0);
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

                          return catData.slice(0, 5).map((d, idx) => {
                            const pct = totalRev > 0 ? (d.revenue / totalRev) * 100 : 0;
                            const color = colors[idx % colors.length];
                            const active = hoveredCategoryAnalysis === idx;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-1.5 rounded-xl transition-all ${active ? 'bg-slate-50 border-l-2' : ''}`}
                                style={active ? { borderLeftColor: color } : {}}
                                onMouseEnter={() => setHoveredCategoryAnalysis(idx)}
                                onMouseLeave={() => setHoveredCategoryAnalysis(null)}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                  <span className="font-bold text-[10px] text-slate-650 truncate uppercase">{d.category}</span>
                                </div>
                                <span className="font-mono font-bold text-[10px] text-slate-900">₹{(d.revenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({pct.toFixed(0)}%)</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 2: 3D Cylinder Category Sales Volume */}
                <div className={visibleCategorySalesVolume ? "card card-outline card-success bg-white border border-slate-150 border-t-[3px] border-t-emerald-500 rounded-lg shadow-sm" : "hidden"}>
                  <div className="card-header border-b border-slate-150 px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                    <h3 className="card-title text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                      <ShoppingCart className="w-4 h-4 text-emerald-500" />
                      Category Sales Volume
                    </h3>
                    <div className="card-tools flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-650 rounded text-[9px] font-bold uppercase font-mono">Volume</span>
                      <button 
                        onClick={() => setCollapsedCategorySalesVolume(!collapsedCategorySalesVolume)}
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Collapse"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setVisibleCategorySalesVolume(false)}
                        className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={`card-body p-5 space-y-4 ${collapsedCategorySalesVolume ? 'hidden' : ''}`}>
                    <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider -mt-2">Total units sold per footwear division</div>
                    <div className="relative">
                      <svg className="w-full h-44 overflow-visible" viewBox="0 0 420 180" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <filter id="cylShadowAnalysis" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="2" dy="4" stdDeviation="2.5" floodOpacity="0.15" />
                          </filter>
                        </defs>
                        <line x1="30" y1="20" x2="400" y2="20" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="30" y1="80" x2="400" y2="80" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="30" y1="140" x2="400" y2="140" stroke="#f1f5f9" strokeWidth="1.5" />

                        {(() => {
                          const catData = getAnalysisCategoryData();
                          const maxQty = Math.max(...catData.map(d => d.quantity), 10);
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

                          return catData.slice(0, 5).map((d, idx) => {
                            const height = Math.max(12, (d.quantity / maxQty) * 110);
                            const x = 50 + idx * 72;
                            const y = 140 - height;
                            const color = colors[idx % colors.length];

                            return (
                              <g key={idx} className="group cursor-pointer">
                                <ellipse cx={x + 16} cy={140} rx="16" ry="6" fill="#cbd5e1" opacity="0.3" />
                                <ellipse cx={x + 16} cy={140} rx="14" ry="5.5" fill={color} opacity="0.75" />
                                <rect x={x + 2} y={y} width="28" height={height} fill={color} opacity="0.85" filter="url(#cylShadowAnalysis)" />
                                <rect x={x + 2} y={y} width="7" height={height} fill="#ffffff" opacity="0.12" />
                                <ellipse cx={x + 16} cy={y} rx="14" ry="5.5" fill={color} style={{ filter: 'brightness(1.15)' }} />

                                <text x={x + 16} y={y - 10} textAnchor="middle" className="text-[10px] font-extrabold font-mono fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {d.quantity} units
                                </text>
                                <text x={x + 16} y="156" textAnchor="middle" className="text-[9px] fill-slate-455 font-bold uppercase tracking-wider font-mono">
                                  {d.category.slice(0, 8)}
                                </text>
                                <title>{d.category}: {d.quantity} units sold</title>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Chart 3: Category Revenue Trend (Line/Area) */}
                <div className={visibleFilteredRevenueTrend ? "card card-outline card-primary bg-white border border-slate-150 border-t-[3px] border-t-blue-600 rounded-lg shadow-sm" : "hidden"}>
                  <div className="card-header border-b border-slate-150 px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                    <h3 className="card-title text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                      <Activity className="w-4 h-4 text-blue-600" />
                      Filtered Revenue Trend
                    </h3>
                    <div className="card-tools flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase font-mono">Trend</span>
                      <button 
                        onClick={() => setCollapsedFilteredRevenueTrend(!collapsedFilteredRevenueTrend)}
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Collapse"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setVisibleFilteredRevenueTrend(false)}
                        className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={`card-body p-5 space-y-4 ${collapsedFilteredRevenueTrend ? 'hidden' : ''}`}>
                    <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider -mt-2">Daily performance over selected dates</div>
                    <div className="relative">
                      <svg className="w-full h-44 overflow-visible" viewBox="0 0 500 180" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="areaGradAnalysis" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <line x1="40" y1="20" x2="480" y2="20" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="40" y1="52.5" x2="480" y2="52.5" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="40" y1="85" x2="480" y2="85" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="40" y1="117.5" x2="480" y2="117.5" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="40" y1="150" x2="480" y2="150" stroke="#f1f5f9" strokeWidth="1.5" />

                        {(() => {
                          const filtered = getFilteredTransactions();
                          const daysMap: Record<string, number> = {};
                          filtered.forEach(t => {
                            const d = t.created_at?.slice(5, 10) || '';
                            if (d) daysMap[d] = (daysMap[d] || 0) + t.total;
                          });
                          const sortedDays = Object.keys(daysMap).sort().slice(-7);

                          if (sortedDays.length === 0) {
                            return <text x="250" y="90" textAnchor="middle" className="text-xs fill-slate-400 italic">Insufficient date parameters</text>;
                          }

                          const maxVal = Math.max(...sortedDays.map(d => daysMap[d]), 10000);
                          const points = sortedDays.map((d, idx) => {
                            const x = 50 + (idx * (410 / (sortedDays.length - 1 || 1)));
                            const y = 150 - (daysMap[d] / maxVal) * 120;
                            return { x, y, label: d, val: daysMap[d] };
                          });

                          const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          const areaData = points.length ? `${pathData} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z` : '';

                          return (
                            <>
                              {areaData && <path d={areaData} fill="url(#areaGradAnalysis)" className="transition-all duration-350" />}
                              {pathData && <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-350" />}
                              
                              {points.map((p, idx) => {
                                const active = hoveredPointAnalysis === idx;
                                return (
                                  <g key={idx}>
                                    <circle
                                      cx={p.x}
                                      cy={p.y}
                                      r={active ? 6 : 4}
                                      fill={active ? '#3b82f6' : '#ffffff'}
                                      stroke="#3b82f6"
                                      strokeWidth="2"
                                      onMouseEnter={() => setHoveredPointAnalysis(idx)}
                                      onMouseLeave={() => setHoveredPointAnalysis(null)}
                                      className="cursor-pointer transition-all duration-150"
                                    />
                                    <text x={p.x} y="165" textAnchor="middle" className="text-[9px] fill-slate-450 font-bold font-mono">{p.label}</text>
                                    {active && (
                                      <g>
                                        <rect x={p.x - 45} y={p.y - 32} width="90" height="22" rx="6" fill="#0f172a" />
                                        <text x={p.x} y={p.y - 17} textAnchor="middle" fill="#ffffff" className="text-[9px] font-bold font-mono">
                                          ₹{(p.val / 100).toFixed(0)}
                                        </text>
                                      </g>
                                    )}
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Chart 4: Average Order Value (AOV) per Category (Donut) */}
                <div className={visibleAverageItemValue ? "card card-outline card-danger bg-white border border-slate-150 border-t-[3px] border-t-purple-500 rounded-lg shadow-sm" : "hidden"}>
                  <div className="card-header border-b border-slate-150 px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                    <h3 className="card-title text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                      <Percent className="w-4 h-4 text-purple-500" />
                      Average Item Value
                    </h3>
                    <div className="card-tools flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-650 rounded text-[9px] font-bold uppercase font-mono">AOV</span>
                      <button 
                        onClick={() => setCollapsedAverageItemValue(!collapsedAverageItemValue)}
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Collapse"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setVisibleAverageItemValue(false)}
                        className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={`card-body p-5 ${collapsedAverageItemValue ? 'hidden' : ''}`}>
                    <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider -mt-2">Average ticket price per division item</div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                          {(() => {
                            const catData = getAnalysisCategoryData();
                            const data = catData.map((d) => ({
                              category: d.category,
                              aov: d.quantity > 0 ? d.revenue / d.quantity : 0
                            }));

                            const totalAov = data.reduce((sum, d) => sum + d.aov, 0);
                            let accumulatedPercent = 0;

                            const segments = data.map((d, idx) => {
                              const percent = totalAov > 0 ? d.aov / totalAov : 0;
                              const strokeLength = percent * 314.16;
                              const strokeOffset = 314.16 - strokeLength + (accumulatedPercent * 314.16);
                              accumulatedPercent -= percent;

                              const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#64748b'];
                              const color = colors[idx % colors.length];

                              return {
                                category: d.category,
                                aov: d.aov,
                                percent: percent * 100,
                                strokeLength,
                                strokeOffset,
                                color
                              };
                            });

                            const activeSeg = hoveredCategoryAnalysis !== null ? segments[hoveredCategoryAnalysis] : null;

                            return (
                              <>
                                <circle cx="100" cy="100" r="50" fill="none" stroke="#f8fafc" strokeWidth="12" />
                                {segments.map((seg, idx) => (
                                  <circle
                                    key={idx}
                                    cx="100"
                                    cy="100"
                                    r="50"
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth="12"
                                    strokeDasharray={`${seg.strokeLength} 314.16`}
                                    strokeDashoffset={seg.strokeOffset}
                                    transform="rotate(-90 100 100)"
                                    className="transition-all duration-300 cursor-pointer hover:stroke-[15]"
                                    onMouseEnter={() => setHoveredCategoryAnalysis(idx)}
                                    onMouseLeave={() => setHoveredCategoryAnalysis(null)}
                                  />
                                ))}
                                <text x="100" y="95" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold uppercase tracking-widest">
                                  {activeSeg ? activeSeg.category : 'Average'}
                                </text>
                                <text x="100" y="115" textAnchor="middle" className="text-xs font-extrabold font-mono fill-slate-800">
                                  {activeSeg ? `₹${(activeSeg.aov / 100).toFixed(0)}` : `₹${(totalAov / (data.length || 1) / 100).toFixed(0)}`}
                                </text>
                              </>
                            );
                          })()}
                        </svg>
                      </div>

                      <div className="flex-1 space-y-1.5 w-full">
                        {(() => {
                          const catData = getAnalysisCategoryData();
                          const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#64748b'];

                          return catData.slice(0, 5).map((d, idx) => {
                            const aov = d.quantity > 0 ? d.revenue / d.quantity : 0;
                            const color = colors[idx % colors.length];
                            return (
                              <div key={idx} className="flex items-center justify-between p-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                  <span className="font-bold text-[10px] text-slate-655 truncate uppercase">{d.category}</span>
                                </div>
                                <span className="font-mono font-bold text-[10px] text-slate-900">₹{(aov / 100).toFixed(2)}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transactions Ledger</span>
                  <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {getFilteredTransactions().length} Transactions Found
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Ref ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Channel</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Product items summary</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getFilteredTransactions().map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{t.transaction_number}</td>
                          <td className="p-3 text-slate-500 font-medium">{new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              t.channel === 'Web' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {t.channel}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{t.customer_name}</div>
                            {t.customer_phone && <div className="text-[9px] text-slate-400 font-mono">{t.customer_phone}</div>}
                          </td>
                          <td className="p-3 text-slate-500 max-w-sm truncate">{t.items_summary}</td>
                          <td className="p-3 capitalize font-mono text-slate-600">{t.payment_method}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">₹{(t.total / 100).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                              t.status === 'delivered' || t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              t.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {getFilteredTransactions().length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-24 text-center text-slate-400 italic">No transactions match your filtered parameters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Staff Management Panel */}
          {activeTab === 'staff' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Staff User Registry</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Delegate role-based system permissions, block/suspend credentials and monitor administrative profiles</p>
                </div>
                <button
                  onClick={handleOpenAddStaff}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff User
                </button>
              </div>

              {/* Staff table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono">
                        <th className="p-3">Staff Profile</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Contact Phone</th>
                        <th className="p-3">System Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Access Scope</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffList.map((st) => {
                        let perms: string[] = [];
                        if (st.permissions) {
                          try { perms = JSON.parse(st.permissions); } catch (_) {}
                        }
                        const isRoot = st.email === 'support@heelsup.in';

                        return (
                          <tr key={st.user_id || st.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{st.name || `${st.first_name} ${st.last_name}`}</div>
                              {st.notes && <div className="text-[9px] text-slate-400 italic font-medium mt-0.5">{st.notes}</div>}
                            </td>
                            <td className="p-3 font-mono font-medium">{st.email}</td>
                            <td className="p-3 font-mono text-slate-500">{st.phone || 'N/A'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                st.role === 'admin' ? 'bg-indigo-100 text-indigo-800' :
                                st.role === 'manager' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {st.role}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                (st.is_active !== 0 && !st.is_blocked) ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {(st.is_active !== 0 && !st.is_blocked) ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td className="p-3">
                              {isRoot ? (
                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">Full Superadmin Access</span>
                              ) : (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {perms.length > 0 ? perms.slice(0, 3).map(p => (
                                    <span key={p} className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[8px] capitalize">{p}</span>
                                  )) : <span className="text-slate-400 italic">No access</span>}
                                  {perms.length > 3 && <span className="text-slate-400 text-[8px]">+{perms.length - 3} more</span>}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              <button
                                onClick={() => handleOpenEditStaff(st)}
                                className="px-2 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg text-[9px] font-bold text-slate-700 uppercase"
                              >
                                Edit
                              </button>
                              {!isRoot && (
                                <>
                                  <button
                                    onClick={() => handleToggleStaffStatus(st)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase border ${
                                      (st.is_active !== 0 && !st.is_blocked)
                                        ? 'border-rose-100 text-rose-600 hover:bg-rose-50'
                                        : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {(st.is_active !== 0 && !st.is_blocked) ? 'Suspend' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStaff(st)}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-bold uppercase"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Database Colors Panel */}
          {activeTab === 'colors' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-light text-slate-900 font-display italic">Database Color Hex Mappings</h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Map custom product color variant labels to specific color hex codes for online display</p>
                </div>
                <button
                  onClick={handleOpenAddColor}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Color Mapping
                </button>
              </div>

              {/* Colors Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {rawColorsList.map((c) => (
                  <div key={c.color_name} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center space-y-3 relative group">
                    {/* Circle Swatch */}
                    <div
                      className="w-12 h-12 rounded-full border border-slate-200 shadow-inner"
                      style={{ backgroundColor: c.hex_code }}
                    />
                    <div>
                      <div className="font-bold text-slate-800 text-xs capitalize">{c.color_name}</div>
                      <div className="text-[9px] font-mono font-semibold text-slate-400 uppercase mt-0.5">{c.hex_code}</div>
                    </div>

                    <div className="flex gap-2 w-full pt-1">
                      <button
                        onClick={() => handleOpenEditColor(c)}
                        className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-[8px] font-bold uppercase text-slate-600 border border-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteColor(c.color_name)}
                        className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg text-[8px] font-bold uppercase text-rose-600 border border-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {rawColorsList.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic">No color mappings mapped in catalog database.</div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Global Footer */}
        <footer className="py-4 px-6 border-t border-slate-100 text-center text-[10px] text-slate-400 shrink-0 bg-white">
          <span>Copyright &copy; 2026 HeelsUp Footwear. All rights reserved. &middot; AdminLTE Light Interface System</span>
        </footer>
      </div>

      {/* --- Global Modals & Dialog Drawers --- */}

      {/* Product Add/Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProductModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">{editingProduct ? 'Edit Catalog Entry' : 'Create Product Catalog Entry'}</h3>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleProductSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Classic Block Heels - Tan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="HU-HEEL-0078-1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:outline-none"
                  >
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="999.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">MRP Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodMrp}
                    onChange={(e) => setProdMrp(e.target.value)}
                    placeholder="1999.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Color Variant</label>
                  <select
                    value={prodColor}
                    onChange={(e) => setProdColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:outline-none"
                  >
                    <option value="Default">None / Default</option>
                    {Object.keys(colorMap).map((c) => (
                      <option key={c} value={c.charAt(0).toUpperCase() + c.slice(1)}>{c.toUpperCase()}</option>
                    ))}
                    <option value="Custom">Custom / Add New...</option>
                  </select>
                </div>
                {prodColor === 'Custom' && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Enter Custom Color Name</label>
                    <input
                      type="text"
                      required
                      value={prodColorCustom}
                      onChange={(e) => setProdColorCustom(e.target.value)}
                      placeholder="e.g. Cherry Gold"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description Body</label>
                <textarea
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Premium handcrafted block heels with cushion foam comfort..."
                  className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none"
                />
              </div>

              {/* Image Fields */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Image File Assets / URLs</label>
                {prodImages.map((img, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={img}
                      onChange={(e) => handleImageFieldChange(i, e.target.value)}
                      placeholder="https://media.heelsup.in/bucket/prod-img.webp"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                    />
                    <input
                      type="file"
                      id={`file-upload-${i}`}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, (url) => handleImageFieldChange(i, url))}
                    />
                    <label
                      htmlFor={`file-upload-${i}`}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer text-[10px] font-semibold text-slate-700 flex items-center gap-1 shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload R2
                    </label>
                    <button type="button" onClick={() => handleRemoveImageField(i)} className="p-1 hover:bg-rose-50 text-rose-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddImageField}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" /> Append Image Line
                </button>
              </div>

              {/* Sizes and stock mapping */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sizes Matrices & Initial Stocks</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {['36', '37', '38', '39', '40', '41'].map((size) => {
                    const isChecked = prodSizes.includes(size);
                    return (
                      <div key={size} className="p-2 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col gap-1.5 items-center">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setProdSizes(prodSizes.filter((s) => s !== size));
                              } else {
                                setProdSizes([...prodSizes, size]);
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className="font-bold font-mono">Size {size}</span>
                        </label>
                        {isChecked && (
                          <input
                            type="number"
                            min={0}
                            value={prodSizeStocks[size] ?? 0}
                            onChange={(e) => setProdSizeStocks({
                              ...prodSizeStocks,
                              [size]: parseInt(e.target.value) || 0
                            })}
                            placeholder="Qty"
                            className="w-14 bg-white border border-slate-200 rounded px-1 text-center font-mono text-[10px]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Switches */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={prodActive} onChange={(e) => setProdActive(e.target.checked)} className="rounded text-blue-600" />
                  <span>Active Catalog Listing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={prodFeatured} onChange={(e) => setProdFeatured(e.target.checked)} className="rounded text-blue-600" />
                  <span>Homepage Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={prodNew} onChange={(e) => setProdNew(e.target.checked)} className="rounded text-blue-600" />
                  <span>New Tag Badge</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={prodTrending} onChange={(e) => setProdTrending(e.target.checked)} className="rounded text-blue-600" />
                  <span>Trending Ribbon</span>
                </label>
              </div>

              {/* Meta information SEO */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">SEO Meta Configuration</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] text-slate-400 uppercase mb-0.5">Meta Title</label>
                    <input
                      type="text"
                      value={prodMetaTitle}
                      onChange={(e) => setProdMetaTitle(e.target.value)}
                      placeholder="Best Jodhpur wedge sandals HeelsUp"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-400 uppercase mb-0.5">Meta Description</label>
                    <input
                      type="text"
                      value={prodMetaDesc}
                      onChange={(e) => setProdMetaDesc(e.target.value)}
                      placeholder="Handcrafted wedges in Jaipur Jodhpur Rajasthan..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setProductModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold uppercase tracking-wider text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl uppercase tracking-wider shadow-md">Sync Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Dialog Popup Modal */}
      {orderDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOrderDrawerOpen(false)} />
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-scale-up max-h-[90vh] text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-950 font-mono text-base tracking-tight">{selectedOrder.order_number}</h3>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  selectedOrder.is_pos ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedOrder.is_pos ? 'POS Walk-in' : 'Web Store'}
                </span>
              </div>
              <button onClick={() => setOrderDrawerOpen(false)} className="p-1 hover:bg-slate-150 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Grid columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Customer & Fulfillment */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5">Customer details</h4>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 text-xs">{selectedOrder.customer_name}</p>
                      {selectedOrder.customer_email && <p className="text-slate-500 font-mono">{selectedOrder.customer_email}</p>}
                      <p className="text-slate-500 font-mono font-bold">Phone: {selectedOrder.customer_phone}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5">Delivery & Shipment</h4>
                    <div className="space-y-1 text-slate-600">
                      {selectedOrder.is_pos ? (
                        <p className="italic text-slate-400 font-medium">In-store immediate pickup</p>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-800">Shipping Address:</p>
                          <p>{selectedOrder.address_line1}</p>
                          {selectedOrder.address_line2 && <p>{selectedOrder.address_line2}</p>}
                          <p>{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Method: {selectedOrder.delivery_method || 'Standard Delivery'}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Payment & Razorpay / Updates */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5">Payment details</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Method:</span>
                        <span className="font-mono font-bold uppercase text-slate-800">{selectedOrder.payment_method}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Status:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          selectedOrder.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>{selectedOrder.payment_status}</span>
                      </div>
                      
                      {/* Razorpay logs if web order with Razorpay */}
                      {(selectedOrder.razorpay_order_id || selectedOrder.razorpay_payment_id) && (
                        <div className="pt-2 border-t border-slate-200/65 mt-2 space-y-1.5 text-[9px]">
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Razorpay Gateway ID logs:</span>
                          {selectedOrder.razorpay_order_id && (
                            <div className="flex justify-between items-center font-mono">
                              <span className="text-slate-400">Order ID:</span>
                              <span className="text-slate-700 select-all font-bold">{selectedOrder.razorpay_order_id}</span>
                            </div>
                          )}
                          {selectedOrder.razorpay_payment_id && (
                            <div className="flex justify-between items-center font-mono">
                              <span className="text-slate-400">Payment ID:</span>
                              <span className="text-slate-700 select-all font-bold">{selectedOrder.razorpay_payment_id}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipment Tracking or POS completion */}
                  {selectedOrder.is_pos ? (
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60 space-y-1 text-slate-700">
                      <h4 className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-250 pb-1">Fulfillment status</h4>
                      <p className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-emerald-800 mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                        Completed & Paid
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Order resolved offline instantly at POS Walk-in terminal counter.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1">Order Fulfillment controls</h4>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Change status</label>
                        <select
                          value={selectedOrder.order_status}
                          onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none"
                        >
                          <option value="placed">Placed (Received)</option>
                          <option value="confirmed">Confirmed (Processing)</option>
                          <option value="shipped">Shipped (In Transit)</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered (Completed)</option>
                          <option value="cancelled">Cancelled (Refunded)</option>
                        </select>
                      </div>
                      <div className="pt-2 mt-1 space-y-2 border-t border-slate-200/60">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Shipment tags</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            id="courierName"
                            defaultValue={selectedOrder.courier_name || ''}
                            placeholder="Courier (e.g. BlueDart)"
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            id="trackingNumber"
                            defaultValue={selectedOrder.tracking_number || ''}
                            placeholder="AWB tracking #"
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          id="trackingUrl"
                          defaultValue={selectedOrder.tracking_url || ''}
                          placeholder="Tracking URL link"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const courier = (document.getElementById('courierName') as HTMLInputElement).value;
                            const trackNum = (document.getElementById('trackingNumber') as HTMLInputElement).value;
                            const trackUrl = (document.getElementById('trackingUrl') as HTMLInputElement).value;
                            handleUpdateTracking(selectedOrder.id, courier, trackNum, trackUrl);
                          }}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95"
                        >
                          Save Shipment details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items list */}
              <div className="space-y-3">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Line Items ({selectedOrder.items?.length || 0})</h4>
                <div className="bg-slate-50/40 rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-mono text-[9px] uppercase tracking-wider">
                        <th className="p-3">Product Name</th>
                        <th className="p-3 text-center">Size</th>
                        <th className="p-3 text-center">Color</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              {item.image && (
                                <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden flex items-center justify-center bg-white p-0.5 shrink-0">
                                  <HeicImage src={item.image} className="w-full h-full object-contain" />
                                </div>
                              )}
                              <span className="truncate max-w-[200px]">{item.product_name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono">{item.size || 'N/A'}</td>
                          <td className="p-3 text-center font-mono capitalize">{item.color || 'N/A'}</td>
                          <td className="p-3 text-center font-mono">{item.quantity}</td>
                          <td className="p-3 text-right font-mono">₹{(item.price / 100).toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">₹{((item.price * item.quantity) / 100).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Price Details summary */}
              <div className="flex justify-end">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs w-full max-w-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{(selectedOrder.subtotal_amount / 100).toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Discount code deduction:</span>
                      <span className="font-mono">-₹{(selectedOrder.discount_amount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.shipping_amount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping delivery fee:</span>
                      <span className="font-mono">₹{(selectedOrder.shipping_amount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-2 text-slate-900">
                    <span>Total Bill:</span>
                    <span className="font-mono text-base font-extrabold">₹{(selectedOrder.total_amount / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-between gap-3 text-[10px]">
              <button
                type="button"
                onClick={() => printInvoiceWindow(selectedOrder)}
                className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase rounded-xl tracking-wider shadow-sm transition-all"
              >
                Print/Download Invoice
              </button>
              {!selectedOrder.is_pos && (
                <button
                  type="button"
                  onClick={() => printDispatchWindow(selectedOrder)}
                  className="flex-1 py-2.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold uppercase rounded-xl tracking-wider shadow-sm transition-all"
                >
                  Print Dispatch Slip
                </button>
              )}
              <button
                type="button"
                onClick={() => setOrderDrawerOpen(false)}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-950 text-white font-bold uppercase rounded-xl tracking-wider shadow-md transition-all shrink-0"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Select Product Modal */}
      {posSelectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPosSelectedProduct(null)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 relative z-10 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900">{posSelectedProduct.name}</h4>
              <button onClick={() => setPosSelectedProduct(null)} className="text-slate-400 hover:text-slate-650"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const baseSku = getBaseSku(posSelectedProduct.sku);
                const colorVariants = productsList.filter(p => getBaseSku(p.sku) === baseSku && p.active);
                if (colorVariants.length <= 1) return null;
                return (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Color Variant (Click to swap style)</label>
                    <div className="flex gap-2 flex-wrap">
                      {colorVariants.map((v) => {
                        const colorName = extractColor(v.name);
                        const active = posSelectedProduct.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setPosSelectedProduct(v);
                              setPosSelectedSize(v.sizes && v.sizes.length > 0 ? v.sizes[0] : '38');
                              setPosSelectedColor(colorName);
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: getColorHex(colorName) }} />
                            {colorName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {posSelectedProduct.sizes?.map((size) => {
                    const active = posSelectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPosSelectedSize(size)}
                        className={`py-1.5 border rounded-lg font-mono text-xs font-bold transition-all ${
                          active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={posSelectedQty}
                    onChange={(e) => setPosSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Color Option</label>
                  <input
                    type="text"
                    value={posSelectedColor}
                    onChange={(e) => setPosSelectedColor(e.target.value)}
                    placeholder="Default"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAddPosCart}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors active:scale-95"
            >
              Add to Bill Cart
            </button>
          </div>
        </div>
      )}

      {/* Returns Review Modal */}
      {returnModalOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReturnModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 relative z-10 text-xs text-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900">Review Exchange Request</h4>
              <button onClick={() => setReturnModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <p className="text-slate-500">Reason: <strong className="text-slate-800">"{selectedReturn.reason}"</strong></p>
                <p className="text-slate-500 mt-1">Details: <strong className="text-slate-800">"{selectedReturn.description || 'No description provided'}"</strong></p>
              </div>

              {/* Items details */}
              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div className="border border-slate-105 rounded-xl p-4 bg-slate-50 space-y-3">
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider">Exchange Specifications</h5>
                  {selectedReturn.items.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-150 pb-2">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Original Item</span>
                          <span className="font-semibold text-slate-800">{item.product_name || 'Product'}</span>
                          <span className="block text-[10px] text-slate-400">Size: {item.size} | Color: {item.color || 'Default'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Replacement Item</span>
                          <span className="font-semibold text-slate-800">{item.exchange_to_product_name || item.product_name || 'Product'}</span>
                          <span className="block text-[10px] text-slate-400">Size: {item.exchange_to_size || 'N/A'} | Color: {item.exchange_to_color || 'Default'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Photo Proof Verification */}
              {(() => {
                const images = selectedReturn.images ? (() => {
                  try {
                    return JSON.parse(selectedReturn.images);
                  } catch {
                    return [];
                  }
                })() : [];
                
                if (images.length === 0) return null;
                
                return (
                  <div className="space-y-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Verification Photos (Customer Proof)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((imgUrl: string, idx: number) => (
                        <a 
                          key={idx} 
                          href={imgUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="border border-slate-200 rounded-lg overflow-hidden h-24 flex items-center justify-center bg-slate-100 hover:border-blue-500 transition-all group relative"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`proof-${idx}`} 
                            className="object-cover w-full h-full"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">View</span>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Set request status</label>
                <select
                  value={returnStatus}
                  onChange={(e) => setReturnStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none"
                >
                  <option value="approved">Approve Exchange Request</option>
                  <option value="rejected">Reject & Deny Request</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Admin Resolution Notes</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Items inspected / replacement item approved for dispatch..."
                  className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setReturnModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Submit Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCatModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 relative z-10 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900">{editingCat ? 'Edit Category' : 'Add Category'}</h4>
              <button onClick={() => setCatModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (!editingCat) {
                      setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }
                  }}
                  placeholder="e.g. Flat Sandals"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="e.g. flat-sandals"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Description</label>
                <textarea
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Write description..."
                  className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={catImageUrl}
                    onChange={(e) => setCatImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input type="file" id="cat-file" className="hidden" onChange={(e) => handleFileUpload(e, setCatImageUrl)} />
                  <label htmlFor="cat-file" className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer font-bold text-[9px] uppercase tracking-wider flex items-center">Upload</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={catSortOrder}
                    onChange={(e) => setCatSortOrder(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={catActive} onChange={(e) => setCatActive(e.target.checked)} className="rounded text-blue-600" />
                    <span>Active category</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setCatModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Add/Edit Modal */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCouponModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 relative z-10 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h4>
              <button onClick={() => setCouponModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER20"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold tracking-wider"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Type</label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    placeholder="20"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={couponMinOrder}
                    onChange={(e) => setCouponMinOrder(e.target.value)}
                    placeholder="499"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={couponActive} onChange={(e) => setCouponActive(e.target.checked)} className="rounded text-blue-600" />
                    <span>Active code</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={couponDescription}
                  onChange={(e) => setCouponDescription(e.target.value)}
                  placeholder="Get 20% off on heels above Rs.499"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setCouponModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Save Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner Add/Edit Modal */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setBannerModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 relative z-10 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900">{editingBanner ? 'Edit Slide Banner' : 'Create Slide Banner'}</h4>
              <button onClick={() => setBannerModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleBannerSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. Step Into Confidence"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Banner Subtitle</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="e.g. Explore wedges sandals..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Slide Image Asset URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://media.heelsup.in/..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input type="file" id="ban-file" className="hidden" onChange={(e) => handleFileUpload(e, setBannerImageUrl)} />
                  <label htmlFor="ban-file" className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer font-bold text-[9px] uppercase tracking-wider flex items-center">Upload</label>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Redirection Link URL</label>
                <input
                  type="text"
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  placeholder="e.g. /shop?cat=heels"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Sorting Index</label>
                  <input
                    type="number"
                    value={bannerSortOrder}
                    onChange={(e) => setBannerSortOrder(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)} className="rounded text-blue-600" />
                    <span>Visible in slideshow</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setBannerModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Save Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Add/Edit Modal */}
      {pageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPageModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4 relative z-10 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900">{editingPage ? 'Edit Page Content' : 'Create Page Content'}</h4>
              <button onClick={() => setPageModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handlePageSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Page Title</label>
                  <input
                    type="text"
                    required
                    value={pageTitle}
                    onChange={(e) => {
                      setPageTitle(e.target.value);
                      if (!editingPage) {
                        setPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      }
                    }}
                    placeholder="e.g. Privacy Policy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Page Slug URL</label>
                  <input
                    type="text"
                    required
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value)}
                    placeholder="e.g. privacy-policy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">HTML/Markdown Page Content</label>
                <textarea
                  required
                  value={pageContent}
                  onChange={(e) => setPageContent(e.target.value)}
                  placeholder="<h1>Privacy Policy</h1><p>We respect your privacy...</p>"
                  className="w-full h-60 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={pageActive} onChange={(e) => setPageActive(e.target.checked)} className="rounded text-blue-600" />
                  <span>Publish this page</span>
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setPageModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Save Page Content</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Report Configurator Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setExportModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 relative z-10 text-xs text-slate-700 animate-slide-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">Export Report Configurator</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Customize what data sections compile into your Excel-compatible sheet</p>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-450 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Select Report Components</span>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportLedger}
                    onChange={(e) => setExportLedger(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-[11px] block uppercase">Transactions Ledger (Online + POS)</span>
                    <span className="text-[9px] text-slate-400 font-medium">A listing of all compiled sales matching your current date & filters.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportCategory}
                    onChange={(e) => setExportCategory(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-[11px] block uppercase">Category Sales Performance</span>
                    <span className="text-[9px] text-slate-400 font-medium">Revenue, units sold, and sales percentage share grouped by division.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportInventory}
                    onChange={(e) => setExportInventory(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-[11px] block uppercase">Product Inventory Summary</span>
                    <span className="text-[9px] text-slate-400 font-medium">Current stock levels, SKU, brand, and historical sales of products.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportChannel}
                    onChange={(e) => setExportChannel(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-[11px] block uppercase">Sales Channel Comparison</span>
                    <span className="text-[9px] text-slate-400 font-medium">Side-by-side transaction count and total revenue of Web vs POS.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportCustomer}
                    onChange={(e) => setExportCustomer(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-[11px] block uppercase">Customer Leaderboard</span>
                    <span className="text-[9px] text-slate-400 font-medium">Aggregated list of buyers sorted by lifetime transaction spend.</span>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeExportCompilation}
                  disabled={!exportLedger && !exportCategory && !exportInventory && !exportChannel && !exportCustomer}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  Compile & Export (Excel)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Add/Edit Modal */}
      {colorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setColorModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 relative z-10 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900">{editingColor ? 'Edit Color Mapping' : 'Create Color Mapping'}</h4>
              <button onClick={() => setColorModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleColorSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Color Name Label</label>
                <input
                  type="text"
                  required
                  value={colorNameInput}
                  onChange={(e) => setColorNameInput(e.target.value)}
                  placeholder="e.g. Cream, Blush Pink"
                  disabled={!!editingColor}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs capitalize"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">CSS Hex Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={colorHexInput}
                    onChange={(e) => setColorHexInput(e.target.value)}
                    placeholder="e.g. #f9f1e3"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase"
                  />
                  <input
                    type="color"
                    value={colorHexInput}
                    onChange={(e) => setColorHexInput(e.target.value)}
                    className="w-10 h-8 border border-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setColorModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Save Mapping</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Add/Edit Modal */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setStaffModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden relative z-10 text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">{editingStaff ? 'Edit Staff Credentials' : 'Create Staff Credentials'}</h3>
              <button onClick={() => setStaffModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleStaffSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={staffFirstName}
                    onChange={(e) => setStaffFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    value={staffLastName}
                    onChange={(e) => setStaffLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingStaff}
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Temporary Password</label>
                  <input
                    type="password"
                    placeholder="Defaults to HeelsUp@2026 if blank"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">System Role</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    disabled={editingStaff?.email === 'support@heelsup.in'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <option value="staff">Staff Assistant</option>
                    <option value="manager">Operations Manager</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={editingStaff?.email === 'support@heelsup.in'}
                      checked={staffActive}
                      onChange={(e) => setStaffActive(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Authorized (Active) Status</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Internal Notes</label>
                <textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="e.g. Noida retail manager..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs h-16"
                />
              </div>

              {/* Permissions scope */}
              <div className="border-t border-slate-100 pt-3">
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Access Scope Permissions</span>
                {editingStaff?.email === 'support@heelsup.in' ? (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 italic">
                    The root superadmin user retains full access to all areas automatically.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    {[
                      { id: 'dashboard', label: 'Dashboard' },
                      { id: 'analysis', label: 'Advanced Analysis' },
                      { id: 'products', label: 'Products' },
                      { id: 'stock', label: 'Stock Inventory' },
                      { id: 'orders', label: 'Orders' },
                      { id: 'pos', label: 'POS Terminal' },
                      { id: 'categories', label: 'Categories' },
                      { id: 'customers', label: 'Customers' },
                      { id: 'reviews', label: 'Reviews' },
                      { id: 'coupons', label: 'Promo Codes' },
                      { id: 'banners', label: 'Banners' },
                      { id: 'pages', label: 'Static Pages' },
                       { id: 'returns', label: 'Exchanges' },
                      { id: 'staff', label: 'Staff registry' },
                      { id: 'colors', label: 'Colors db' },
                      { id: 'sql', label: 'SQL console' },
                      { id: 'audits', label: 'Audits' },
                      { id: 'settings', label: 'Settings' }
                    ].map(p => {
                      const checked = staffPermissions.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-1.5 cursor-pointer py-0.5 text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setStaffPermissions([...staffPermissions, p.id]);
                              } else {
                                setStaffPermissions(staffPermissions.filter(perm => perm !== p.id));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="capitalize">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setStaffModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}