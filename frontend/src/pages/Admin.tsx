import React, { useState, useEffect, useMemo } from 'react';
import HeicImage from '../components/HeicImage';
import {
  ShoppingCart, Plus, Edit3, Star,
  UploadCloud, AlertTriangle, CheckCircle2, X, ChevronRight, ChevronLeft,
  Search, Trash2, Percent, Activity, Sliders, RefreshCw,
  Printer, Database, Play, HelpCircle, Eye, Check, Download, Truck, Minus
} from 'lucide-react';

// --- Modular Admin Panel Components ---
import DashboardView from './admin/DashboardView';
import ProductsManager from './admin/ProductsManager';
import StockManager from './admin/StockManager';
import OrdersManager from './admin/OrdersManager';
import CategoriesManager from './admin/CategoriesManager';
import CouponsManager from './admin/CouponsManager';
import BannersManager from './admin/BannersManager';
import PagesManager from './admin/PagesManager';
import SettingsManager from './admin/SettingsManager';
import StaffManager from './admin/StaffManager';
import CustomersManager from './admin/CustomersManager';

import PosTerminal from './admin/PosTerminal';
import ReturnsManager from './admin/ReturnsManager';
import ReviewsModeration from './admin/ReviewsModeration';

import AuditLogs from './admin/AuditLogs';
import EnterpriseReports from './admin/EnterpriseReports';

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
  two_factor_enabled?: boolean;
}

interface Customer {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
  is_blocked: boolean;
}

interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  return_type: 'refund' | 'exchange';
  reason: string;
  items: any;
  status: 'pending' | 'approved' | 'received' | 'completed' | 'rejected' | any;
  action_notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  images?: string;
  refund_amount?: number;
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
  approved: boolean;
  merchant_reply?: string;
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'stock' | 'orders' | 'categories' | 'customers' | 'reviews' | 'coupons' | 'banners' | 'pages' | 'settings' | 'pos' | 'audits' | 'returns' | 'analysis' | 'staff'>('dashboard');

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

  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLedger, setExportLedger] = useState(true);
  const [exportCategory, setExportCategory] = useState(true);
  const [exportInventory, setExportInventory] = useState(true);
  const [exportChannel, setExportChannel] = useState(true);
  const [exportCustomer, setExportCustomer] = useState(true);
  const [editingColor, setEditingColor] = useState<{ id?: number; color_name: string; hex_code: string } | null>(null);
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
        'audits', 'settings', 'analysis', 'staff'
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
      const res = await fetch(`/api/admin/customers/${cust.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
      <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative text-neutral-900">
        {/* Floating Toasts container */}
        <div className="fixed top-5 right-5 z-50 space-y-3 w-80 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-2xl shadow-lg border pointer-events-auto flex items-start gap-3 bg-white transition-all transform animate-slide-in ${
                toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                'border-sky-200 bg-sky-50 text-sky-700'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              {toast.type === 'info' && <HelpCircle className="w-5 h-5 text-sky-400 shrink-0" />}
              <div>
                <h5 className="text-xs font-bold font-display">{toast.title}</h5>
                <p className="text-[10px] opacity-90 mt-0.5">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-md w-full space-y-8 bg-white border border-neutral-200/80 shadow-2xl p-8 rounded-3xl animate-fade-in">
          <div className="text-center">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 font-display">HeelsUp</span>
            <h2 className="mt-4 text-xl font-light text-neutral-900 italic">Administration Portal Setup</h2>
            <p className="mt-1.5 text-xs text-neutral-500">Authentication portal gateway verification</p>
          </div>

          {resetStep === 'login' && !otpRequired && (
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="rounded-md space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Staff Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="support@heelsup.in"
                    className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Access Password</label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <button
                    type="button"
                    onClick={() => setResetStep('forgot_email')}
                    className="font-medium text-neutral-900 hover:underline transition-colors"
                  >
                    Forgot access credentials?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-neutral-900 bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
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
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Two-Factor Passcode (OTP)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="123456"
                    className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-605 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs font-mono text-center tracking-widest transition-all"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-neutral-900 bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
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
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Registered Staff Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="support@heelsup.in"
                    className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setResetStep('login')}
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                  Back to Sign In
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-neutral-900 bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
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
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">OTP Recovery Code</label>
                  <input
                    type="text"
                    required
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value)}
                    placeholder="123456"
                    className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs text-center font-mono tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-neutral-900 bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
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

  const dbTables = [
    { id: 'products', label: 'products' },
    { id: 'orders', label: 'orders' },
    { id: 'order_items', label: 'order_items' },
    { id: 'users', label: 'users' },
    { id: 'categories', label: 'categories' },
    { id: 'coupons', label: 'coupons' },
    { id: 'banners', label: 'banners' },
    { id: 'static_pages', label: 'static_pages' },
    { id: 'product_reviews', label: 'product_reviews' },
    { id: 'returns', label: 'returns' },
    { id: 'settings', label: 'settings' },
  ];

  const menuSections = [
    {
      title: 'Dashboard & Reports',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { id: 'analysis', label: 'Advanced Analysis', icon: 'fas fa-chart-line' },
      ]
    },
    {
      title: 'E-commerce & POS',
      items: [
        { id: 'pos', label: 'POS Terminal', icon: 'fas fa-cash-register' },
        { id: 'orders', label: 'Orders Registry', icon: 'fas fa-shopping-cart' },
        { id: 'returns', label: 'Exchanges Manager', icon: 'fas fa-exchange-alt' },
      ]
    },
    {
      title: 'Catalog & Stock',
      items: [
        { id: 'products', label: 'Products Catalog', icon: 'fas fa-shoe-prints' },
        { id: 'stock', label: 'Stock Inventory', icon: 'fas fa-boxes' },
        { id: 'categories', label: 'Categories', icon: 'fas fa-tags' },
      ]
    },
    {
      title: 'Customers & Reviews',
      items: [
        { id: 'customers', label: 'Customers', icon: 'fas fa-users' },
        { id: 'reviews', label: 'Reviews Moderation', icon: 'fas fa-star' },
        { id: 'coupons', label: 'Promo Codes', icon: 'fas fa-percentage' },
      ]
    },
    {
      title: 'Content & System',
      items: [
        { id: 'banners', label: 'Homepage Banners', icon: 'fas fa-images' },
        { id: 'pages', label: 'Static Pages', icon: 'fas fa-file-alt' },
        { id: 'staff', label: 'Staff Management', icon: 'fas fa-user-shield' },
        { id: 'audits', label: 'Audit Logs', icon: 'fas fa-history' },
        { id: 'settings', label: 'Settings', icon: 'fas fa-cogs' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-neutral-900 font-sans flex flex-col md:flex-row relative">
      {/* Floating Toasts container */}
      <div className="fixed top-5 right-5 z-50 space-y-3 w-80 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border pointer-events-auto flex items-start gap-3 bg-white border-neutral-200/80 transition-all transform animate-slide-in ${
              toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' :
              toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' :
              'border-sky-200 bg-sky-50 text-sky-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <HelpCircle className="w-5 h-5 text-sky-400 shrink-0" />}
            <div>
              <h5 className="text-xs font-bold font-display">{toast.title}</h5>
              <p className="text-[10px] opacity-90 mt-0.5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Order Alert Banner */}
      {showOrderBanner && (
        <div className="fixed top-18 right-6 z-50 animate-slide-left pointer-events-auto bg-white text-neutral-900 p-4 rounded-xl shadow-2xl border border-neutral-200 flex items-center gap-3 w-80 max-w-sm">
          <div className="w-8 h-8 rounded-full bg-neutral-50 border border-primary/30 flex items-center justify-center animate-pulse text-neutral-900">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[9px] uppercase font-extrabold text-neutral-900 tracking-wider">New Order Alert</h5>
            <p className="text-[11px] font-semibold leading-snug mt-0.5">{showOrderBanner}</p>
          </div>
          <button onClick={() => setShowOrderBanner(null)} className="text-neutral-500 hover:text-neutral-900 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sidebar Panel */}
      <aside className={`w-64 bg-white border-r border-neutral-200/80 flex flex-col justify-between shrink-0 h-screen z-30 transition-transform fixed left-0 top-0 md:sticky md:self-start md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200/80 shrink-0">
          <span className="text-lg font-bold tracking-tight text-neutral-900 font-display flex items-center gap-1.5">
            <Sliders className="w-5 h-5" /> HeelsUp Admin
          </span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-neutral-500 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6 space-y-6">
          {menuSections.map((sect, sIdx) => {
            const allowedItems = sect.items.filter(item => hasPermission(item.id));
            if (allowedItems.length === 0) return null;
            return (
              <div key={sIdx} className="space-y-2">
                <span className="text-[9px] uppercase tracking-widest font-black text-neutral-500 block px-3">
                  {sect.title}
                </span>
                <div className="space-y-1">
                  {allowedItems.map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          if (item.id === 'orders') setUnseenOrders(0);
                          if (window.innerWidth < 768) setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          active ? 'text-neutral-900 bg-neutral-100 border border-neutral-200/80 font-bold' : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-50/50 border border-transparent'
                        }`}
                      >
                        <i className={`${item.icon} text-sm`}></i>
                        <span>{item.label}</span>
                        {item.id === 'orders' && unseenOrders > 0 && (
                          <span className="ml-auto bg-rose-500 text-neutral-900 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                            {unseenOrders}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Sign Out */}
        <div className="p-4 border-t border-neutral-200/80 shrink-0">
          <button onClick={handleLogout} className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#f5f5f4] min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-neutral-200/80 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-neutral-500 hover:bg-neutral-50 rounded-lg transition-colors md:hidden"
            >
              <Sliders className="w-5 h-5 rotate-90" />
            </button>
            <span className="text-xs text-neutral-500 capitalize font-mono">
              admin &middot; {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadAllData}
              disabled={dataLoading}
              className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-[10px] font-bold text-neutral-700 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${dataLoading ? 'animate-spin' : ''}`} />
              {dataLoading ? 'Syncing...' : 'Sync Database'}
            </button>
            <div className="text-[10px] text-neutral-500 font-mono hidden sm:block">
              <span>Cloudflare D1: heelsup-live</span>
            </div>
          </div>
        </header>

        {/* Workspace body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              products={productsList}
              returns={returnsList}
              onTabChange={setActiveTab}
            />
          )}

          {activeTab === 'products' && (
            <ProductsManager
              products={productsList}
              categories={categoriesList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'stock' && (
            <StockManager
              products={productsList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersManager
              orders={ordersList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesManager
              categories={categoriesList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'coupons' && (
            <CouponsManager
              coupons={couponsList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'banners' && (
            <BannersManager
              banners={bannersList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'pages' && (
            <PagesManager
              pages={pagesList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsManager
              settings={settingsList}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'staff' && (
            <StaffManager
              staff={staffList.map((st) => ({
                id: st.id || st.user_id,
                email: st.email,
                role: st.role,
                name: st.name || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
                active: st.is_active !== 0 && !st.is_blocked,
                two_factor_enabled: st.two_factor_enabled || false,
                created_at: st.created_at || ''
              }))}
              token={token || ""}
              showToast={showToast}
              onRefresh={loadAllData}
            />
          )}


          {activeTab === 'customers' && (
            <CustomersManager
              customers={customersList}
              onToggleBlock={handleToggleBlockCustomer}
              showToast={showToast}
            />
          )}

          {activeTab === 'pos' && (
            <PosTerminal
              products={productsList}
              categories={categoriesList}
              coupons={couponsList}
              showToast={showToast}
              onOrderCreated={loadAllData}
            />
          )}

          {activeTab === 'returns' && (
            <ReturnsManager
              returns={returnsList}
              onRefresh={loadAllData}
              showToast={showToast}
            />
          )}

          {activeTab === 'reviews' && (
            <ReviewsModeration
              reviews={reviewsList}
              onRefresh={loadAllData}
              showToast={showToast}
            />
          )}


          {activeTab === 'audits' && (
            <AuditLogs
              logs={auditLogs}
              loading={dataLoading}
              onRefresh={loadAllData}
              showToast={showToast}
            />
          )}

          {activeTab === 'analysis' && (
            <EnterpriseReports
              orders={ordersList}
              products={productsList}
              showToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}
