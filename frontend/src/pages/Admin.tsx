import React, { useState, useEffect, useMemo } from 'react'
import HeicImage from '../components/HeicImage'
import {
  LayoutDashboard, ShoppingCart, Package, ListChecks,
  LogOut, Plus, Edit3, Settings, Tag, Star, Users, FileText, Image as ImageIcon,
  UploadCloud, AlertTriangle, CheckCircle2, X, ChevronRight, ChevronLeft, Search, Bell,
  RotateCw, Printer, Download, Trash2, Lock, PlusCircle, Percent, Activity
} from 'lucide-react'

// --- TypeScript Interfaces ---
interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // in paise for DB precision
  original_price: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  images: string[];
  sizes: string[];
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  order_status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: string;
  payment_method: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  courier_name?: string;
  source: 'web' | 'pos' | 'whatsapp' | 'instagram';
  items: OrderItem[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
}

interface OrderItem {
  id: number;
  product_name: string;
  size: string;
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

interface Collection {
  id: number;
  name: string;
  type: 'manual' | 'automated';
  rules?: { field: string; relation: string; value: string }[];
  description?: string;
  image_url?: string;
  active: boolean;
}

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  active: boolean;
}

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
  active: boolean;
}

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  product_name: string;
  created_at: string;
  approved: boolean;
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
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  active: boolean;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders_count: number;
  total_spent: number;
  registered_at: string;
  tag: 'VIP' | 'Regular' | 'New Customer' | 'Gold';
}

// --- Pre-populated High-Fidelity Mock Database (Clear for D1) ---
const initialProducts: Product[] = [];
const initialOrders: Order[] = [];
const initialCustomers: Customer[] = [];
const initialCategories: Category[] = [];
const initialCollections: Collection[] = [];
const initialCoupons: Coupon[] = [];
const initialBanners: Banner[] = [];
const initialReviews: Review[] = [];
const initialPages: PageConfig[] = [];
const initialStaff: Staff[] = [];

// --- Custom Toast Alert System ---
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export default function App() {
  // Authentication State
  const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(() => {
    const savedUser = localStorage.getItem('heelsup_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Global Toasts State
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Sidebar controls
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState('');

  // Active view routing
  const [activeTab, setActiveTab] = useState<string>('db_editor');

  // Database State (In-Memory Unified Store)
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [categoriesList, setCategoriesList] = useState<Category[]>(initialCategories);
  const [collectionsList, setCollectionsList] = useState<Collection[]>(initialCollections);
  const [couponsList, setCouponsList] = useState<Coupon[]>(initialCoupons);
  const [bannersList, setBannersList] = useState<Banner[]>(initialBanners);
  const [reviewsList, setReviewsList] = useState<Review[]>(initialReviews);
  const [pagesList, setPagesList] = useState<PageConfig[]>(initialPages);
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Live DB Editor States
  const [selectedDbTable, setSelectedDbTable] = useState<string>('products');
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [editingDbRow, setEditingDbRow] = useState<any | null>(null);
  const [isAddingDbRow, setIsAddingDbRow] = useState<boolean>(false);
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');

  const dbTablesList = [
    { id: 'products', label: 'products' },
    { id: 'product_images', label: 'product_images' },
    { id: 'product_size_stock', label: 'product_size_stock' },
    { id: 'categories', label: 'categories' },
    { id: 'collections', label: 'collections' },
    { id: 'collection_products', label: 'collection_products' },
    { id: 'orders', label: 'orders' },
    { id: 'order_items', label: 'order_items' },
    { id: 'users', label: 'users (customers)' },
    { id: 'addresses', label: 'addresses' },
    { id: 'payments', label: 'payments' },
    { id: 'coupons', label: 'coupons' },
    { id: 'banners', label: 'banners' },
    { id: 'pages', label: 'pages' },
    { id: 'product_reviews', label: 'product_reviews' },
    { id: 'exchanges', label: 'exchanges' },
    { id: 'exchange_items', label: 'exchange_items' },
    { id: 'offline_sales', label: 'offline_sales' },
    { id: 'settings', label: 'settings' },
    { id: 'staff', label: 'staff' },
    { id: 'staff_roles', label: 'staff_roles' },
    { id: 'wishlists', label: 'wishlists' },
    { id: 'contact_messages', label: 'contact_messages' },
    { id: 'newsletter', label: 'newsletter' },
    { id: 'shipping_methods', label: 'shipping_methods' },
    { id: 'shipping_pincodes', label: 'shipping_pincodes' },
    { id: 'shipping_couriers', label: 'shipping_couriers' },
    { id: 'shipping_zones', label: 'shipping_zones' },
    { id: 'shipping_rates', label: 'shipping_rates' },
    { id: 'tax_rules', label: 'tax_rules' },
    { id: 'blog_posts', label: 'blog_posts' },
    { id: 'notifications', label: 'notifications' },
    { id: 'inventory_log', label: 'inventory_log' },
    { id: 'audit_log', label: 'audit_log' },
    { id: 'login_attempts', label: 'login_attempts' },
    { id: 'rate_limits', label: 'rate_limits' },
    { id: 'analytics_events', label: 'analytics_events' },
    { id: 'otp_tokens', label: 'otp_tokens' },
    { id: 'sessions', label: 'sessions' }
  ];

  const fetchDbTableData = async (tableName: string) => {
    setDbLoading(true);
    try {
      const colRes = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ sql: `PRAGMA table_info(${tableName})` })
      });
      const colData = await colRes.json();
      const cols = colData.success && colData.data?.results 
        ? colData.data.results.map((c: any) => c.name) 
        : [];
      setDbColumns(cols);

      const rowRes = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ sql: `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 500` })
      });
      const rowData = await rowRes.json();
      if (rowData.success && rowData.data?.results) {
        setDbRows(rowData.data.results);
      } else {
        setDbRows([]);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Database Error', `Failed to load table ${tableName}`);
    } finally {
      setDbLoading(false);
    }
  };

  const handleDeleteRow = async (id: any) => {
    if (!confirm('Are you sure you want to delete this row?')) return;
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          sql: `DELETE FROM ${selectedDbTable} WHERE id = ?`,
          params: [id]
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Deleted successfully', `Row with ID ${id} deleted.`);
        fetchDbTableData(selectedDbTable);
      } else {
        showToast('error', 'Delete failed', data.error);
      }
    } catch (err) {
      showToast('error', 'Delete failed', 'Network error');
    }
  };

  const handleUpdateRow = async (updatedRow: any) => {
    try {
      const keys = Object.keys(updatedRow).filter(k => k !== 'id');
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const params = keys.map(k => updatedRow[k]);
      params.push(updatedRow.id);

      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          sql: `UPDATE ${selectedDbTable} SET ${sets} WHERE id = ?`,
          params
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Updated successfully', `Row with ID ${updatedRow.id} updated.`);
        setEditingDbRow(null);
        fetchDbTableData(selectedDbTable);
      } else {
        showToast('error', 'Update failed', data.error);
      }
    } catch (err) {
      showToast('error', 'Update failed', 'Network error');
    }
  };

  const handleInsertRow = async (newRow: any) => {
    try {
      const keys = Object.keys(newRow).filter(k => k !== 'id');
      const placeholders = keys.map(() => '?').join(', ');
      const params = keys.map(k => newRow[k]);

      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          sql: `INSERT INTO ${selectedDbTable} (${keys.join(', ')}) VALUES (${placeholders})`,
          params
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Inserted successfully', 'New row created.');
        setIsAddingDbRow(false);
        fetchDbTableData(selectedDbTable);
      } else {
        showToast('error', 'Insert failed', data.error);
      }
    } catch (err) {
      showToast('error', 'Insert failed', 'Network error');
    }
  };

  useEffect(() => {
    if (activeTab === 'db_editor') {
      fetchDbTableData(selectedDbTable);
    }
  }, [selectedDbTable, activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        setDashboardStats(resData.data);
      }
    } catch (err) {
      console.error('Fetch dashboard stats error:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?limit=100&all=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setProducts(resData.data);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setOrders(resData.data);
      } else {
        showToast('error', 'Orders Error', resData.error || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      showToast('error', 'Orders Network Error', 'Failed to connect to backend to fetch orders');
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setCustomers(resData.data);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setCategoriesList(resData.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/admin/collections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        const mapped = resData.data.map((c: any) => {
          let cond = { type: 'manual', rules: undefined };
          try {
            if (c.condition) {
              const parsed = typeof c.condition === 'string' ? JSON.parse(c.condition) : c.condition;
              if (parsed.type) cond.type = parsed.type;
              if (parsed.rules) cond.rules = parsed.rules;
            }
          } catch (e) {
            console.error('Parse collection condition error:', e);
          }
          return {
            id: c.id,
            name: c.name,
            type: cond.type as any,
            rules: cond.rules,
            description: c.description || '',
            active: c.is_active === 1 || c.is_active === true || !!c.is_active
          };
        });
        setCollectionsList(mapped);
      }
    } catch (err) {
      console.error('Fetch collections error:', err);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setCouponsList(resData.data);
      }
    } catch (err) {
      console.error('Fetch coupons error:', err);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/admin/banners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setBannersList(resData.data);
      }
    } catch (err) {
      console.error('Fetch banners error:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/admin/reviews', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        const mapped = resData.data.map((r: any) => ({
          id: r.id,
          user_name: r.reviewer_name || 'Anonymous',
          rating: r.rating,
          comment: r.body || '',
          product_name: r.product_name || 'Product ID ' + r.product_id,
          created_at: r.created_at,
          approved: r.status === 'approved'
        }));
        setReviewsList(mapped);
      }
    } catch (err) {
      console.error('Fetch reviews error:', err);
    }
  };

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/pages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setPagesList(resData.data);
      }
    } catch (err) {
      console.error('Fetch pages error:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        const mapped = resData.data.map((s: any) => ({
          id: s.id || s.user_id,
          name: s.name || 'Staff Member',
          email: s.email || '',
          role: s.role || 'staff',
          active: s.is_active === 1 || s.is_active === true || !!s.is_active
        }));
        setStaffList(mapped);
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        const d = resData.data;
        setSettings({
          storeName: d.store_name || d.storeName || 'HeelsUp Boutique',
          storePhone: d.store_phone || d.storePhone || '+91 7891470935',
          storeEmail: d.store_email || d.storeEmail || 'sales@heelsup.in',
          storeAddress: d.store_address || d.storeAddress || '3rd Road Sardarpura, Jodhpur, Rajasthan (342003)',
          razorpayKeyId: d.razorpay_key_id || d.razorpayKeyId || 'rzp_live_76sTba98VscH81',
          razorpaySecret: d.razorpay_key_secret || d.razorpaySecret || '••••••••••••••••••••••••',
          smsEnabled: d.sms_enabled === 'true' || d.sms_enabled === true || d.smsEnabled === true
        });
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  const handleUpdateStock = async (productId: number, newStock: number, sku: string) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ stock: newStock })
      });
      const resData = await res.json();
      if (resData.success) {
        setProducts(prev => prev.map(item => item.id === productId ? { ...item, stock: newStock } : item));
        showToast('success', 'Stock Updated', `Stock level for ${sku} updated to ${newStock}.`);
      } else {
        showToast('error', 'Update Failed', resData.message || 'Could not update stock');
      }
    } catch (err) {
      console.error('Update stock error:', err);
      showToast('error', 'Update Failed', 'Network error');
    }
  };

  const fetchAllData = () => {
    fetchDashboardStats();
    fetchProducts();
    fetchOrders();
    fetchCustomers();
    fetchCategories();
    fetchCollections();
    fetchCoupons();
    fetchBanners();
    fetchReviews();
    fetchPages();
    fetchStaff();
    fetchSettings();
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, activeTab]);

  // Search/Filters per section
  const [productFilterQuery, setProductFilterQuery] = useState('');
  const [orderFilterQuery, setOrderFilterQuery] = useState('');
  const [customerFilterQuery, setCustomerFilterQuery] = useState('');

  // Dynamic Metrics Simulation
  const [liveTraffic, setLiveTraffic] = useState(38);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'aov'>('revenue');

  // Live session event simulation
  const [liveSessions, setLiveSessions] = useState([
    { id: '1', location: 'Jodhpur, RJ', action: 'Applied coupon FIRST10', time: 'Just now', status: 'warning' as const },
    { id: '2', location: 'Delhi, DL', action: 'Added "Royal Golden Zari Block Heels" to cart', time: '1m ago', status: 'active' as const },
    { id: '3', location: 'Mumbai, MH', action: 'Completed Checkout (₹3,798)', time: '3m ago', status: 'success' as const },
    { id: '4', location: 'Jaipur, RJ', action: 'Viewing Bridal collection', time: '5m ago', status: 'active' as const }
  ]);

  useEffect(() => {
    const locations = ['Mumbai, MH', 'Jaipur, RJ', 'Delhi, DL', 'Jodhpur, RJ', 'Bangalore, KA', 'Ahmedabad, GJ', 'Udaipur, RJ', 'Kolkata, WB'];
    const actions = [
      'Viewing Heels & Stilettos list',
      'Added "Classic Velvet Black Stiletto" to cart',
      'Completed Checkout (₹2,649)',
      'Inquired shipping details via popup',
      'Completed Checkout (₹1,439)',
      'Selected Razorpay UPI option'
    ];

    const interval = setInterval(() => {
      setLiveTraffic(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return next > 10 ? (next < 80 ? next : 50) : 15;
      });

      const randomLoc = locations[Math.floor(Math.random() * locations.length)];
      const randomAct = actions[Math.floor(Math.random() * actions.length)];
      const status: 'success' | 'active' | 'warning' = randomAct.includes('Completed Checkout') ? 'success' : 'active';

      setLiveSessions(prev => [
        { id: Math.random().toString(36).substring(2, 6).toUpperCase(), location: randomLoc, action: randomAct, time: 'Just now', status },
        ...prev.map(s => s.time === 'Just now' ? { ...s, time: '1m ago' } : s)
      ].slice(0, 5));
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // --- Sub-module Form States & Editors ---

  // Category Form
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImg, setCatImg] = useState('');
  const [catSort, setCatSort] = useState(0);

  // Automated/Manual Collection Form
  const [colName, setColName] = useState('');
  const [colType, setColType] = useState<'manual' | 'automated'>('automated');
  const [colDesc, setColDesc] = useState('');
  const [colRuleField, setColRuleField] = useState('name');
  const [colRuleRelation, setColRuleRelation] = useState('contains');
  const [colRuleVal, setColRuleVal] = useState('');

  // Coupon Form
  const [coupCode, setCoupCode] = useState('');
  const [coupType, setCoupType] = useState<'percentage' | 'fixed'>('percentage');
  const [coupValue, setCoupValue] = useState(0);
  const [coupMin, setCoupMin] = useState(0);

  // Banner Form
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImg, setBannerImg] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  // Page Form
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');

  // Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'manager' | 'staff'>('staff');

  // Product Creator/Editor Form
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodFormName, setProdFormName] = useState('');
  const [prodFormSku, setProdFormSku] = useState('');
  const [prodFormCategory, setProdFormCategory] = useState('heels');
  const [prodFormPrice, setProdFormPrice] = useState(0); // input as Rupees
  const [prodFormMrp, setProdFormMrp] = useState(0); // input as Rupees
  const [prodFormStock, setProdFormStock] = useState(10);
  const [prodFormSizes, setProdFormSizes] = useState<string[]>(['37', '38', '39', '40']);
  const [prodFormImages, setProdFormImages] = useState<string[]>([]);
  const [imageInputUrl, setImageInputUrl] = useState('');

  // POS Billing Spreadsheet Rows
  const [posRows, setPosRows] = useState<any[]>([
    { id: '1', query: '', selectedProduct: null, size: '38', qty: 1, customPrice: 0 }
  ]);
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerEmail, setPosCustomerEmail] = useState('');
  const [posDiscount, setPosDiscount] = useState(0); // Flat INR
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [posCashReceived, setPosCashReceived] = useState(0);
  const [posRemarks, setPosRemarks] = useState('In-Store POS Sale');

  // Detailed Modal Selectors
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkParsedResult, setBulkParsedResult] = useState<any[]>([]);

  // Courier/Tracking fields for Order drawer
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [triggerSms, setTriggerSms] = useState(true);

  // Settings State
  const [settings, setSettings] = useState({
    storeName: 'HeelsUp Boutique',
    storePhone: '+91 7891470935',
    storeEmail: 'sales@heelsup.in',
    storeAddress: '3rd Road Sardarpura, Jodhpur, Rajasthan (342003)',
    razorpayKeyId: 'rzp_live_76sTba98VscH81',
    razorpaySecret: '••••••••••••••••••••••••',
    smsEnabled: true
  });

  // Reports Parameters State
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'customers' | 'orders'>('sales');
  const [reportFrom, setReportFrom] = useState('2026-05-01');
  const [reportTo, setReportTo] = useState('2026-06-04');
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // --- File Compression & HEIC Conversion Helper ---
  const compressAndResizeImage = async (file: File): Promise<Blob> => {
    let activeFile = file;
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
    
    if (isHeic) {
      try {
        const heic2anyModule = await import('heic2any');
        const heic2any = heic2anyModule.default;
        const conversionResult = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        const singleBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        activeFile = new File([singleBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch (err) {
        console.error('HEIC pre-conversion failed:', err);
      }
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(activeFile);
              }
            }, 'image/jpeg', 0.8);
          } else {
            resolve(activeFile);
          }
        };
        img.onerror = () => resolve(activeFile);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(activeFile);
      reader.readAsDataURL(activeFile);
    });
  };

  // --- File Upload Helper ---
  const handleUploadImage = async (file: File): Promise<string | null> => {
    try {
      const compressedBlob = await compressAndResizeImage(file);
      const compressedFile = new File([compressedBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', compressedFile);
      
      const token = localStorage.getItem('heelsup_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData
      });
      
      const result = await response.json();
      if (result.success && result.data?.url) {
        return result.data.url;
      } else {
        showToast('error', 'Upload Failed', result.error || 'Server rejected file upload');
        return null;
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('error', 'Upload Error', 'Could not connect to the upload service');
      return null;
    }
  };

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast('error', 'Fields Required', 'Please enter your registered staff email and password credentials.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.step === 'otp_required') {
          setOtpRequired(true);
          setSessionToken(data.data.session_token);
          showToast('info', '2FA OTP Required', 'A verification code has been generated. Please check console/logs.');
        } else {
          const { token, user: loggedUser } = data.data;
          localStorage.setItem('heelsup_token', token);
          localStorage.setItem('heelsup_user', JSON.stringify(loggedUser));
          setUser(loggedUser);
          showToast('success', 'Access Granted', `Welcome back ${loggedUser.name} (${loggedUser.role.toUpperCase()}). Session validated.`);
        }
      } else {
        showToast('error', 'Unauthorized Access', data.error || 'Access denied. The email or credentials did not match active records.');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('error', 'Authentication Error', 'Could not connect to the auth server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 6) {
      showToast('error', 'Invalid OTP', 'Please enter a valid 6-digit OTP code.');
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
        showToast('success', 'Access Granted', `Welcome back ${loggedUser.name} (${loggedUser.role.toUpperCase()}). Session validated.`);
      } else {
        showToast('error', 'Verification Failed', data.error || 'Invalid verification code.');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      showToast('error', 'Verification Error', 'Could not connect to the verification server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('heelsup_token');
    localStorage.removeItem('heelsup_user');
    setUser(null);
    showToast('info', 'Session Terminated', 'You have securely signed out of the HeelsUp administrative control panel.');
  };

  // --- POS Sale Submittor ---
  const posSubtotal = useMemo(() => {
    return posRows.reduce((acc, curr) => {
      const p = curr.selectedProduct;
      const rate = curr.customPrice > 0 ? curr.customPrice : (p ? p.price / 100 : 0);
      return acc + (rate * curr.qty);
    }, 0);
  }, [posRows]);

  const posGrandTotal = useMemo(() => {
    return Math.max(0, posSubtotal - posDiscount);
  }, [posSubtotal, posDiscount]);

  const handlePosCheckout = async () => {
    const validItems = posRows.filter(r => r.selectedProduct !== null);
    if (validItems.length === 0) {
      showToast('error', 'Spreadsheet Grid Empty', 'Please select at least one valid product from search suggestions.');
      return;
    }

    try {
      const itemsPayload = validItems.map(r => ({
        product_id: r.selectedProduct.id,
        unit_price: (r.customPrice > 0 ? r.customPrice : r.selectedProduct.price / 100) * 100, // convert back to paise
        quantity: r.qty,
        size: r.size,
        color: r.selectedProduct.color || ''
      }));

      const res = await fetch('/api/admin/pos/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          customer_name: posCustomerName || 'Walk-in',
          customer_phone: posCustomerPhone || null,
          items: itemsPayload,
          payment_method: posPaymentMethod.toLowerCase(),
          discount: posDiscount * 100, // in paise
          notes: posRemarks
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const { bill_number, sale_id } = data.data;
        showToast('success', 'Sale Recorded', `Transaction logged as ${bill_number}. Inventory amounts updated.`);

        // Fetch complete sale details to populate receipt modal
        const saleRes = await fetch(`/api/admin/pos/${sale_id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
        });
        const saleData = await saleRes.json();
        if (saleData.success && saleData.data) {
          const s = saleData.data;
          const mappedOrder: Order = {
            id: s.id,
            order_number: s.bill_number,
            customer_name: s.customer_name || 'Walk-in Retail Buyer',
            customer_phone: s.customer_phone || 'N/A',
            customer_email: posCustomerEmail || undefined,
            subtotal_amount: s.subtotal,
            shipping_amount: 0,
            discount_amount: s.discount,
            total_amount: s.total,
            order_status: 'delivered',
            payment_status: 'paid',
            payment_method: s.payment_method.toUpperCase(),
            created_at: s.created_at,
            source: 'pos',
            items: (s.items || []).map((it: any) => ({
              id: it.id,
              product_name: it.product_name,
              size: it.size,
              quantity: it.quantity,
              price: it.unit_price,
              image: `https://media.heelsup.in/products/HEELS/${it.product_code.split('-')[0]}.webp`
            })),
            notes: s.notes
          };
          setSelectedOrder(mappedOrder);
        }

        // Clear spreadsheet and reload tables
        setPosRows([{ id: '1', query: '', selectedProduct: null, size: '38', qty: 1, customPrice: 0 }]);
        setPosCustomerName('');
        setPosCustomerPhone('');
        setPosCustomerEmail('');
        setPosDiscount(0);
        setPosCashReceived(0);
        setPosRemarks('In-Store POS Sale');
        
        // Refresh products, orders, customers, and dashboard stats
        fetchProducts();
        fetchOrders();
        fetchCustomers();
        fetchDashboardStats();
      } else {
        showToast('error', 'Checkout Failed', data.error || 'Failed to submit POS checkout');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Checkout Error', 'Network error placing POS checkout');
    }
  };

  // --- Product Form Handlers ---
  const handleAddProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodFormName || !prodFormSku || !prodFormPrice) {
      showToast('error', 'Validation Error', 'A design style name, unique SKU, and active catalog price are mandatory fields.');
      return;
    }

    try {
      const payload = {
        name: prodFormName,
        sku: prodFormSku,
        category: prodFormCategory,
        price: prodFormPrice * 100,
        mrp: prodFormMrp ? prodFormMrp * 100 : null,
        stock: prodFormStock,
        sizes: prodFormSizes,
        images: prodFormImages.length > 0 ? prodFormImages : ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=60']
      };

      if (editingProduct) {
        // Edit
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          fetchProducts();
          showToast('success', 'Product Synchronized', `Successfully committed changes to SKU: ${prodFormSku}.`);
        } else {
          showToast('error', 'Update Failed', data.error || 'Failed to update product');
        }
      } else {
        // Create new
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          fetchProducts();
          showToast('success', 'Product Created', `Added style design "${prodFormName}" with stock level ${prodFormStock}.`);
        } else {
          showToast('error', 'Creation Failed', data.error || 'Failed to create product');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network Error', 'Failed to connect to catalog server');
    }

    // Reset Form
    setEditingProduct(null);
    setProdFormName('');
    setProdFormSku('');
    setProdFormPrice(0);
    setProdFormMrp(0);
    setProdFormStock(10);
    setProdFormImages([]);
  };

  // --- Bulk Parser Functionality ---
  useEffect(() => {
    if (!bulkInputText.trim()) {
      setBulkParsedResult([]);
      return;
    }
    // Attempt JSON first
    const trimmed = bulkInputText.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : (parsed.products || []);
        const output = list.map((item: any, idx: number) => {
          const errors = [];
          if (!item.name) errors.push('Missing Name');
          if (!item.sku) errors.push('Missing SKU');
          if (!item.price || isNaN(Number(item.price))) errors.push('Price must be a number');
          return {
            ...item,
            id: idx + 1,
            price: Number(item.price) || 0,
            original_price: Number(item.mrp) || null,
            stock: Number(item.stock) || 5,
            category: item.category || 'heels',
            sizes: Array.isArray(item.sizes) ? item.sizes : ['37', '38', '39', '40'],
            images: Array.isArray(item.images) ? item.images : [],
            isValid: errors.length === 0,
            errors
          };
        });
        setBulkParsedResult(output);
      } catch (err: any) {
        setBulkParsedResult([{ error: `JSON Parse error: ${err.message}`, isValid: false, errors: ['Invalid JSON format'] }]);
      }
    } else {
      // Attempt CSV parse
      const lines = trimmed.split('\n');
      const firstLine = lines[0].toLowerCase();
      const headers = firstLine.split(',').map(h => h.trim());
      const results = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const item: any = {};
        headers.forEach((h, idx) => {
          item[h] = columns[idx];
        });

        const errors = [];
        const name = item.name || item.title || '';
        const sku = item.sku || item.code || '';
        const price = Number(item.price) || 0;
        const stock = Number(item.stock) || 0;

        if (!name) errors.push('Missing Name');
        if (!sku) errors.push('Missing SKU');
        if (!price) errors.push('Missing Price');

        results.push({
          name,
          sku,
          price,
          original_price: Number(item.mrp) || null,
          stock,
          category: item.category || 'heels',
          sizes: item.sizes ? item.sizes.split('|') : ['37', '38', '39', '40'],
          images: item.images ? [item.images] : [],
          isValid: errors.length === 0,
          errors
        });
      }
      setBulkParsedResult(results);
    }
  }, [bulkInputText]);

  const handleCommitBulkUpload = () => {
    const validOnes = bulkParsedResult.filter(p => p.isValid);
    if (validOnes.length === 0) {
      showToast('error', 'Bulk Committal Failed', 'No valid rows found in the parsed dataset. Verify inputs.');
      return;
    }

    const formatted: Product[] = validOnes.map((p, idx) => ({
      id: products.length + idx + 1,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price * 100,
      original_price: p.original_price ? p.original_price * 100 : null,
      stock: p.stock,
      active: true,
      featured: false,
      images: p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=60'],
      sizes: p.sizes
    }));

    setProducts(prev => [...formatted, ...prev]);
    showToast('success', 'Bulk committal resolved', `Successfully recorded ${formatted.length} high-fashion footwear profiles to database.`);
    setShowBulkUploadModal(false);
    setBulkInputText('');
  };

  // --- Detailed Reports Generator ---
  const generateStoreReport = async () => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem('heelsup_token');
      const [salesRes, invRes] = await Promise.all([
        fetch(`/api/reports/sales?from=${reportFrom}&to=${reportTo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/reports/inventory`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const salesData = await salesRes.json();
      const invData = await invRes.json();
      
      if (salesData.success && invData.success) {
        setGeneratedReport({
          summary: {
            total_orders: salesData.data.summary?.total_orders || 0,
            total_revenue: salesData.data.summary?.total_revenue || 0,
            avg_order_value: salesData.data.summary?.avg_order_value || 0,
            unique_customers: salesData.data.summary?.unique_customers || 0
          },
          by_payment: salesData.data.by_payment || [],
          low_stock: invData.data.low_stock || [],
          out_of_stock: invData.data.out_of_stock || [],
          top_customers: [],
          category_levels: []
        });
        showToast('success', 'Report Resolved', 'D1 Ledger data calculated for requested calendar window.');
      } else {
        showToast('error', 'Report Error', 'Failed to resolve store reports');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Report Error', 'Network error generating report');
    } finally {
      setReportLoading(false);
    }
  };

  // --- Dynamic Search Filters ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const query = productFilterQuery.toLowerCase();
      return p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
    });
  }, [products, productFilterQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const query = orderFilterQuery.toLowerCase();
      return o.customer_name.toLowerCase().includes(query) || o.order_number.toLowerCase().includes(query) || o.customer_phone.includes(query);
    });
  }, [orders, orderFilterQuery]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const query = customerFilterQuery.toLowerCase();
      return c.name.toLowerCase().includes(query) || c.phone.includes(query) || c.email.toLowerCase().includes(query);
    });
  }, [customers, customerFilterQuery]);

  // Collapsible navigational link builder
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', section: 'Main', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pos', label: 'POS Terminal', section: 'Main', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'products', label: 'Styles Directory', section: 'Catalogue', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', section: 'Catalogue', icon: <Tag className="w-4 h-4" /> },
    { id: 'collections', label: 'Collections', section: 'Catalogue', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'orders', label: 'Online Orders', section: 'Sales', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers Log', section: 'Sales', icon: <Users className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory Center', section: 'Sales', icon: <Activity className="w-4 h-4" /> },
    { id: 'coupons', label: 'Promos & Coupons', section: 'Sales', icon: <Percent className="w-4 h-4" /> },
    { id: 'banners', label: 'Banners Slideshow', section: 'Content', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'reviews', label: 'Reviews Moderation', section: 'Content', icon: <Star className="w-4 h-4" /> },
    { id: 'pages', label: 'Static Policy Pages', section: 'Content', icon: <FileText className="w-4 h-4" /> },
    { id: 'staff', label: 'Staff Accounts', section: 'System', icon: <Lock className="w-4 h-4" /> },
    { id: 'settings', label: 'General Configuration', section: 'System', icon: <Settings className="w-4 h-4" /> },
    { id: 'db_editor', label: 'Database Tables', section: 'System', icon: <Activity className="w-4 h-4" /> },
    { id: 'reports', label: 'Enterprise Reports', section: 'Main', icon: <FileText className="w-4 h-4" /> }
  ];

  const allowedNavs = useMemo(() => {
    let list = navigationItems;
    if (sidebarQuery.trim()) {
      const q = sidebarQuery.toLowerCase();
      list = list.filter(item => item.label.toLowerCase().includes(q));
    }
    return list;
  }, [sidebarQuery]);

  // --- SVG Analytics Area Chart Plotter ---
  const getTimelinePoints = () => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const values = dates.map(dt => {
      const dayOrders = orders.filter(o => o.created_at.split('T')[0] === dt);
      if (chartMetric === 'orders') return dayOrders.length;
      const dayRev = dayOrders.reduce((acc, curr) => acc + curr.total_amount, 0) / 100;
      if (chartMetric === 'aov') {
        return dayOrders.length > 0 ? Math.round(dayRev / dayOrders.length) : 0;
      }
      return dayRev;
    });

    const maxVal = Math.max(...values, chartMetric === 'orders' ? 4 : 2000);
    const height = 140;
    const width = 500;

    const coords = dates.map((_, idx) => {
      const x = (idx / 6) * width;
      const y = height - ((values[idx] / maxVal) * 110) - 15;
      return { x, y, value: values[idx], label: dates[idx] };
    });

    const linePointsStr = coords.map(c => `${c.x},${c.y}`).join(' ');
    const areaPointsStr = `0,${height} ${linePointsStr} ${width},${height}`;

    return { linePointsStr, areaPointsStr, coords, maxVal };
  };

  const handlePrint = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Restore React state binding safely
  };

  // --- Authentication Guard Overlay ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        {/* Toast floating alerts */}
        <div className="fixed top-4 right-4 z-[9999] space-y-2">
          {toasts.map(t => (
            <div key={t.id} className={`p-4 rounded-xl shadow-lg border flex gap-3 w-80 animate-slideIn bg-white ${t.type === 'success' ? 'border-emerald-200' : 'border-rose-200'
              }`}>
              <div className={t.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}>
                {t.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <strong className="text-xs text-gray-900 block font-bold">{t.title}</strong>
                <p className="text-[11px] text-gray-500 mt-0.5">{t.message}</p>
              </div>
            </div>
          ))}
        </div>

        {otpRequired ? (
          <div className="max-w-md w-full bg-white border border-gray-150 rounded-3xl p-8 shadow-xl space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-serif italic text-gray-900 tracking-wide animate-pulse">
                2FA Verification
              </h1>
              <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest font-bold">Enter the 6-digit security code</p>
            </div>

            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">One-Time Password (OTP)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg tracking-widest font-mono bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:bg-white font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 bg-gray-950 text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-md"
              >
                {loggingIn ? 'Verifying Security Code...' : 'Verify OTP & Log In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpRequired(false);
                  setSessionToken(null);
                  setOtpInput('');
                }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-950 font-bold uppercase tracking-wider mt-2"
              >
                Back to Login
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-md w-full bg-white border border-gray-150 rounded-3xl p-8 shadow-xl space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-serif italic text-gray-900 tracking-wide">
                Heels<span className="text-[#C9A96E]">Up</span>
              </h1>
              <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest font-bold">Staff Central Workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  placeholder="staff@heelsup.in"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Access Token Security Key</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:bg-white font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 bg-gray-950 text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-md"
              >
                {loggingIn ? 'Decrypt & Authenticate...' : 'Decrypt & Authenticate'}
              </button>
            </form>

            <div className="border-t border-gray-150 pt-4 text-center">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Protected by military-grade backend tokens & Jodhpur flagship boutique firewall policies. Direct access attempts are permanently logged.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex text-gray-800 antialiased font-sans">
      {/* Toast floating alerts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`p-4 rounded-xl shadow-lg border flex gap-3 w-80 animate-slideIn bg-white ${t.type === 'success' ? 'border-emerald-200' : 'border-rose-200'
            }`}>
            <div className={t.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}>
              {t.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <strong className="text-xs text-gray-900 block font-bold">{t.title}</strong>
              <p className="text-[11px] text-gray-500 mt-0.5">{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- SIDEBAR WORKSPACE --- */}
      <aside className={`bg-gray-950 text-white flex flex-col justify-between transition-all duration-300 z-30 ${sidebarCollapsed ? 'w-20' : 'w-64'
        } shrink-0 hidden md:flex border-r border-gray-900`}>
        <div>
          {/* Logo Brand Header */}
          <div className="p-5 flex items-center justify-between border-b border-gray-900">
            {!sidebarCollapsed ? (
              <div>
                <h1 className="text-2xl font-serif italic text-white tracking-wider">
                  Heels<span className="text-[#C9A96E] font-bold">Up</span>
                </h1>
                <span className="text-[8px] tracking-widest uppercase text-gray-500 block font-bold font-mono">Control v2.4 Live</span>
              </div>
            ) : (
              <span className="text-xl font-serif italic text-[#C9A96E] mx-auto block font-bold">HU</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Sidebar Search Link */}
          {!sidebarCollapsed && (
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter boutique modules..."
                  value={sidebarQuery}
                  onChange={e => setSidebarQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-transparent rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-800"
                />
              </div>
            </div>
          )}

          {/* Navigation Links Grouped */}
          <nav className="p-3 space-y-6 max-h-[70vh] overflow-y-auto">
            {['Main', 'Catalogue', 'Sales', 'Content', 'System'].map(section => {
              const items = allowedNavs.filter(i => i.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section} className="space-y-1">
                  {!sidebarCollapsed && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block px-3 mb-1">{section}</span>
                  )}
                  {items.map(nav => (
                    <button
                      key={nav.id}
                      onClick={() => {
                        setActiveTab(nav.id);
                        setSidebarMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl font-medium transition-all ${activeTab === nav.id
                          ? 'bg-[#C9A96E] text-gray-950 font-bold'
                          : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                        }`}
                    >
                      {nav.icon}
                      {!sidebarCollapsed && <span>{nav.label}</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Staff footer drawer */}
        <div className="p-4 border-t border-gray-900 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A96E] text-gray-950 font-extrabold flex items-center justify-center text-xs">
              {user.name[0]}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="text-xs text-white font-bold block truncate">{user.name}</span>
                <span className="text-[10px] text-gray-500 block capitalize">{user.role} Privilege</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-gray-900 hover:bg-rose-950 hover:text-rose-200 transition-colors rounded-xl text-gray-400 text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!sidebarCollapsed && <span>Sign Out Workspace</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Nav Header Menu */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-800"
            >
              <Activity className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-serif italic text-gray-900 tracking-wide uppercase">
                {navigationItems.find(n => n.id === activeTab)?.label} Control Panel
              </h2>
              <p className="text-[10px] text-gray-400 font-semibold font-mono tracking-widest uppercase">
                Active Environment: Jodhpur Store Live SQL Binding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live active visitors pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-emerald-800 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{liveTraffic} Live Browsers</span>
            </div>

            <button
              onClick={() => showToast('success', 'Database Synchronized', 'Handshake renewed with Cloudflare D1 SQL Server.')}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              title="Sync Database"
            >
              <RotateCw className="w-4 h-4 animate-spin-hover" />
            </button>

            <div className="relative cursor-pointer">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </div>
          </div>
        </header>

        {/* --- MAIN PAGE TAB CONTAINER --- */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">

          {/* =======================================
              DASHBOARD OVERVIEW TAB
              ======================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Dynamic summary KPI blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Live Month Sales', value: dashboardStats ? `₹${(dashboardStats.totalRevenue / 100).toLocaleString('en-IN')}` : '₹5,49,200', change: '+18.2% vs Last Mo', type: 'revenue', bg: 'from-amber-50 to-orange-50 border-[#ead2ae]' },
                  { label: 'Total Placed Orders', value: dashboardStats ? dashboardStats.totalOrders : orders.length, change: '100% Secure Checkout', type: 'orders', bg: 'from-blue-50 to-indigo-50 border-blue-100' },
                  { label: 'Customer Retention', value: '84.6%', change: 'Very High Repeat LTV', type: 'aov', bg: 'from-emerald-50 to-teal-50 border-emerald-100' },
                  { label: 'Average Basket Value', value: dashboardStats && dashboardStats.totalOrders > 0 ? `₹${Math.round(dashboardStats.totalRevenue / dashboardStats.totalOrders / 100).toLocaleString('en-IN')}` : '₹1,490', change: 'Embellished items focus', type: 'aov', bg: 'from-purple-50 to-fuchsia-50 border-purple-100' }
                ].map((kpi, idx) => (
                  <div key={idx} className={`p-6 rounded-3xl border bg-gradient-to-br ${kpi.bg} shadow-sm space-y-2`}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.label}</span>
                    <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">{kpi.change}</p>
                  </div>
                ))}
              </div>

              {/* Dynamic SVG Area Chart and Shopper breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SVG Chart Panel */}
                <div className="lg:col-span-2 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Enterprise Performance Graph</h4>
                      <p className="text-[10px] text-gray-400">Displaying historical calendar transaction timelines</p>
                    </div>
                    {/* Metric Selectors */}
                    <div className="flex bg-gray-100 p-0.5 rounded-xl text-[9px] font-bold uppercase select-none">
                      {(['revenue', 'orders', 'aov'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setChartMetric(m)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${chartMetric === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                        >
                          {m === 'revenue' ? 'Revenue' : m === 'orders' ? 'Orders Volume' : 'Basket AOV'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Area Chart Rendering */}
                  <div className="relative h-44 border-b border-gray-100">
                    {(() => {
                      const { coords, linePointsStr, areaPointsStr } = getTimelinePoints();
                      const colorHex = chartMetric === 'orders' ? '#10B981' : chartMetric === 'aov' ? '#8B5CF6' : '#C9A96E';
                      return (
                        <svg className="w-full h-full" viewBox="0 0 500 140" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colorHex} stopOpacity="0.25" />
                              <stop offset="100%" stopColor={colorHex} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid references */}
                          <line x1="0" y1="20" x2="500" y2="20" stroke="#f3f4f6" strokeDasharray="3" />
                          <line x1="0" y1="70" x2="500" y2="70" stroke="#f3f4f6" strokeDasharray="3" />
                          <line x1="0" y1="120" x2="500" y2="120" stroke="#f3f4f6" strokeDasharray="3" />

                          {/* Render filled Area */}
                          <polygon points={areaPointsStr} fill="url(#chartAreaGrad)" />

                          {/* Render beautiful Line path */}
                          <polyline points={linePointsStr} fill="none" stroke={colorHex} strokeWidth="2.5" strokeLinecap="round" />

                          {/* Points */}
                          {coords.map((c, i) => (
                            <g key={i} className="group/dot cursor-pointer">
                              <circle cx={c.x} cy={c.y} r="4" fill={colorHex} stroke="#fff" strokeWidth="1.5" />
                              <title>{c.label}: {chartMetric === 'orders' ? `${c.value} Orders` : `₹${c.value}`}</title>
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* Horizontal Labels */}
                  <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                    {getTimelinePoints().coords.map((c, idx) => (
                      <span key={idx}>{new Date(c.label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    ))}
                  </div>
                </div>

                {/* Real-time Ticker Feed */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Live Activity Timeline</h4>
                    <p className="text-[10px] text-gray-400">Streamed boutique actions across India</p>
                  </div>

                  <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                    {liveSessions.map(sess => (
                      <div key={sess.id} className={`p-3 rounded-xl border text-[10px] flex justify-between items-start ${sess.status === 'success' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' :
                          sess.status === 'warning' ? 'bg-amber-50/50 border-amber-100 text-amber-900' : 'bg-gray-50 border-gray-100 text-gray-700'
                        }`}>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold bg-white/70 px-1 py-0.5 rounded text-[8px] uppercase border border-gray-200">{sess.location}</span>
                            <span className="font-semibold">{sess.action}</span>
                          </div>
                          <span className="text-[8px] text-gray-400 block font-mono">ID: #{sess.id}</span>
                        </div>
                        <span className="text-[8px] text-gray-400 font-bold whitespace-nowrap">{sess.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Middle Section: Funnel and Category Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual conversion funnel */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Boutique Checkout Funnel</h4>
                    <p className="text-[10px] text-gray-400">Web visit to order conversion tracking</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { step: '1. Storefront Visitors', count: '10,240 pageviews', percent: 100, color: 'bg-amber-500/20' },
                      { step: '2. Footwear Card Interactions', count: '3,120 clicks', percent: 30.4, color: 'bg-[#C9A96E]/20' },
                      { step: '3. Initiated Razorpay Checkouts', count: '1,560 orders started', percent: 15.2, color: 'bg-[#C9A96E]/40' },
                      { step: '4. Fully Paid Invoices', count: `${orders.length} completed sales`, percent: 4.8, color: 'bg-emerald-500/20' }
                    ].map((f, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          <span>{f.step}</span>
                          <span>{f.percent}%</span>
                        </div>
                        <div className="h-7 bg-gray-100 rounded-lg relative overflow-hidden flex items-center px-3">
                          <div className={`absolute left-0 inset-y-0 ${f.color}`} style={{ width: `${f.percent}%` }} />
                          <span className="text-[10px] font-bold text-gray-900 relative z-10 font-mono">{f.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cloud ledger & server status health indicator */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Cloud Ledger Integrations</h4>
                    <p className="text-[10px] text-gray-400">Active status check-ins with API providers</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { name: 'Cloudflare D1 SQL Server', status: 'Healthy Connection', latency: '14ms Response', color: 'bg-emerald-500' },
                      { name: 'Razorpay Gateway Security Binding', status: 'Live rzp_live_* keys active', latency: '256-bit SSL', color: 'bg-emerald-500' },
                      { name: 'Maajisa SMS Gateway Host', status: 'Trigger dispatch configured', latency: '99.8% Del. rate', color: 'bg-emerald-500' },
                      { name: 'R2 Embellished Image CDN', status: 'Static images resolved', latency: 'Maajisa S3 cloud', color: 'bg-emerald-500' }
                    ].map((api, i) => (
                      <div key={i} className="flex justify-between items-center p-3 border border-gray-150 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${api.color} opacity-75`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${api.color}`} />
                          </span>
                          <span className="text-xs font-bold text-gray-900">{api.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-800 font-bold block">{api.status}</span>
                          <span className="text-[9px] text-gray-400 font-mono block">{api.latency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channel Contributions with 3D Glossy Cylinder look */}
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Boutique Acquisition Channels</h4>
                  <p className="text-[10px] text-gray-400">Total payments mapped across transaction sources</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: 'Web Storefront', percent: 64, color: '#C9A96E', val: '₹3,51,488' },
                    { title: 'Retail POS Terminal', percent: 18, color: '#111827', val: '₹98,856' },
                    { title: 'WhatsApp Orders', percent: 12, color: '#10B981', val: '₹65,904' },
                    { title: 'Instagram Direct', percent: 6, color: '#EC4899', val: '₹32,952' }
                  ].map((ch, i) => (
                    <div key={i} className="p-4 border border-gray-150 rounded-2xl space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-gray-700">
                        <span>{ch.title}</span>
                        <span>{ch.percent}%</span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full relative overflow-hidden">
                        <div className="absolute left-0 inset-y-0 rounded-full" style={{ width: `${ch.percent}%`, backgroundColor: ch.color }}>
                          <div className="absolute top-0.5 inset-x-0 h-1 bg-white/30 rounded-full mx-1" />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-900 block font-mono">{ch.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =======================================
              POS TERMINAL SPREADSHEET VIEW
              ======================================= */}
          {activeTab === 'pos' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4">
                <h3 className="text-xl font-serif italic text-gray-950">Point-of-Sale Register</h3>
                <p className="text-xs text-gray-400 mt-1">Simulate counter billing instantly. Inventory volumes automatically synced on transaction.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Side: Product Spreadsheet Table Grid */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <span>🧾 Active Counter Items Spreadsheet Grid</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px] align-middle">
                        <thead>
                          <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <th className="py-3 px-2 w-[40%]">Product Name / Search Auto-Complete</th>
                            <th className="py-3 px-2 w-[15%]">Size Code</th>
                            <th className="py-3 px-2 w-[18%]">Custom Invoice Price (₹)</th>
                            <th className="py-3 px-2 w-[12%]">Qty</th>
                            <th className="py-3 px-2 w-[13%]">Line Total</th>
                            <th className="py-3 px-2 w-[5%] text-center">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {posRows.map((row, idx) => {
                            const isSelected = row.selectedProduct !== null;
                            // Filter matches based on search term
                            const matches = row.query.trim().length > 0 && !isSelected
                              ? products.filter(p =>
                                p.name.toLowerCase().includes(row.query.toLowerCase()) ||
                                p.sku.toLowerCase().includes(row.query.toLowerCase())
                              ).slice(0, 5)
                              : [];

                            return (
                              <tr key={row.id} className="align-middle group/row">
                                {/* Auto-Complete suggestions field */}
                                <td className="py-3 px-2 relative">
                                  <input
                                    type="text"
                                    placeholder="Type footwear name or unique SKU..."
                                    value={row.query}
                                    onChange={e => {
                                      const next = [...posRows];
                                      next[idx].query = e.target.value;
                                      if (isSelected && next[idx].selectedProduct.name !== e.target.value) {
                                        next[idx].selectedProduct = null;
                                        next[idx].customPrice = 0;
                                      }
                                      setPosRows(next);
                                    }}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium focus:outline-none focus:border-[#C9A96E]"
                                  />

                                  {matches.length > 0 && (
                                    <div className="absolute left-2 right-2 top-11 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 divide-y divide-gray-50 overflow-hidden max-h-56 overflow-y-auto">
                                      {matches.map(p => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            const next = [...posRows];
                                            next[idx].selectedProduct = p;
                                            next[idx].query = p.name;
                                            next[idx].customPrice = p.price / 100;
                                            next[idx].size = p.sizes[0] || '38';
                                            setPosRows(next);
                                          }}
                                          className="w-full text-left p-3 hover:bg-amber-50/50 flex items-center justify-between text-xs transition-colors"
                                        >
                                          <div>
                                            <div className="font-bold text-gray-900">{p.name}</div>
                                            <div className="text-[9px] text-gray-400 font-mono mt-0.5">SKU: {p.sku} &middot; Left: {p.stock} units</div>
                                          </div>
                                          <span className="font-bold text-[#C9A96E]">₹{(p.price / 100).toLocaleString('en-IN')}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </td>

                                {/* Size option selection */}
                                <td className="py-3 px-2">
                                  <select
                                    disabled={!isSelected}
                                    value={row.size}
                                    onChange={e => {
                                      const next = [...posRows];
                                      next[idx].size = e.target.value;
                                      setPosRows(next);
                                    }}
                                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white font-bold text-gray-800 disabled:opacity-50"
                                  >
                                    {(row.selectedProduct?.sizes || ['36', '37', '38', '39', '40', '41', '42']).map((sz: string) => (
                                      <option key={sz} value={sz}>Size {sz}</option>
                                    ))}
                                  </select>
                                </td>

                                {/* Unit custom invoice price adjustment */}
                                <td className="py-3 px-2">
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    value={row.customPrice || ''}
                                    onChange={e => {
                                      const next = [...posRows];
                                      next[idx].customPrice = Number(e.target.value);
                                      setPosRows(next);
                                    }}
                                    placeholder="0.00"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-right font-bold focus:outline-none disabled:opacity-50"
                                  />
                                </td>

                                {/* Quantity counter */}
                                <td className="py-3 px-2">
                                  <input
                                    type="number"
                                    min="1"
                                    disabled={!isSelected}
                                    value={row.qty}
                                    onChange={e => {
                                      const next = [...posRows];
                                      next[idx].qty = Math.max(1, Number(e.target.value));
                                      setPosRows(next);
                                    }}
                                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs text-center font-bold bg-white disabled:opacity-50"
                                  />
                                </td>

                                {/* Row Grand total calculation */}
                                <td className="py-3 px-2 text-right font-bold text-gray-900 font-mono text-xs">
                                  ₹{((row.customPrice || 0) * row.qty).toLocaleString('en-IN')}
                                </td>

                                {/* Delete row handler */}
                                <td className="py-3 px-2 text-center">
                                  <button
                                    onClick={() => {
                                      if (posRows.length > 1) {
                                        setPosRows(posRows.filter(r => r.id !== row.id));
                                      } else {
                                        setPosRows([{ id: '1', query: '', selectedProduct: null, size: '38', qty: 1, customPrice: 0 }]);
                                      }
                                    }}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={() => setPosRows([...posRows, { id: Math.random().toString(), query: '', selectedProduct: null, size: '38', qty: 1, customPrice: 0 }])}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C9A96E] hover:text-[#b17e3f] bg-amber-50 hover:bg-amber-100/60 px-4 py-2 rounded-xl transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add Footwear Line Item
                    </button>
                  </div>
                </div>

                {/* Right Side Column: Checkout details, Cash returns calculations, discount sliders */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Registry Details */}
                  <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1">
                      <span>👤 Walk-In Customer Profile</span>
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="Search or add 10-digit mobile..."
                          value={posCustomerPhone}
                          onChange={e => {
                            setPosCustomerPhone(e.target.value);
                            // Auto-fetch if existing customer
                            const matched = customers.find(c => c.phone === e.target.value);
                            if (matched) {
                              setPosCustomerName(matched.name);
                              setPosCustomerEmail(matched.email);
                              showToast('info', 'Customer Profile Pulled', `${matched.name} identified as repeating ${matched.tag} member.`);
                            }
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Full Name</label>
                        <input
                          type="text"
                          placeholder="Client Name"
                          value={posCustomerName}
                          onChange={e => setPosCustomerName(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="client@gmail.com"
                          value={posCustomerEmail}
                          onChange={e => setPosCustomerEmail(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing billing calculations */}
                  <div className="bg-[#faf8f4] border border-[#ead2ae] rounded-3xl p-5 shadow-sm space-y-4">
                    <h4 className="text-xs font-extrabold text-gray-950 uppercase tracking-widest border-b border-gray-200/80 pb-2">
                      💰 Payments & Deductions
                    </h4>

                    <div className="space-y-3 text-xs">
                      {/* Payment mode choice */}
                      <div className="grid grid-cols-3 gap-2">
                        {(['Cash', 'UPI', 'Card'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPosPaymentMethod(mode)}
                            className={`py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${posPaymentMethod === mode
                                ? 'bg-gray-950 border-gray-950 text-white shadow-md'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}
                          >
                            {mode === 'Cash' ? '💵 Cash' : mode === 'UPI' ? '📱 UPI' : '💳 Card'}
                          </button>
                        ))}
                      </div>

                      {/* Cash Counter helper */}
                      {posPaymentMethod === 'Cash' && (
                        <div className="p-3 bg-white border border-amber-200/60 rounded-2xl space-y-2 animate-fadeIn">
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Cash Handed Over (₹)</label>
                          <input
                            type="number"
                            value={posCashReceived || ''}
                            onChange={e => setPosCashReceived(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-right font-bold"
                            placeholder="0"
                          />
                          {posCashReceived > posGrandTotal && (
                            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg mt-2">
                              <span>Return Change:</span>
                              <span>₹{(posCashReceived - posGrandTotal).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase">Apply flat discount (₹)</label>
                        <input
                          type="number"
                          value={posDiscount || ''}
                          onChange={e => setPosDiscount(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-right"
                          placeholder="0"
                        />
                      </div>

                      <div className="border-t border-gray-200 pt-3 space-y-2 text-[11px] font-semibold text-gray-600">
                        <div className="flex justify-between">
                          <span>Subtotal Amount</span>
                          <span>₹{posSubtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span>Discount Deduct</span>
                          <span>-₹{posDiscount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-[10px]">
                          <span>Included CGST/SGST (18% inclusive)</span>
                          <span>₹{(posGrandTotal * 18 / 118).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm font-extrabold text-gray-950 border-t border-gray-200 pt-3">
                          <span>Grand Total Bill</span>
                          <span className="text-[#C9A96E] text-base">₹{posGrandTotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <button
                        onClick={handlePosCheckout}
                        className="w-full py-4 bg-gray-950 text-white rounded-2xl text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" /> Issue Invoice & Sync Stock
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =======================================
              PRODUCTS CATALOGUE TAB
              ======================================= */}
          {activeTab === 'products' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">Style Directory Database</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure active pricing grids, imagery references, and size distributions.</p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    onClick={() => setShowBulkUploadModal(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                  >
                    CSV/JSON Bulk Upload
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProdFormName('');
                      setProdFormSku('');
                      setProdFormPrice(0);
                      setProdFormMrp(0);
                      setProdFormStock(10);
                      setProdFormImages([]);
                      showToast('info', 'Form Reset', 'Ready to add new premium collection footwear item.');
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-950 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                  >
                    New Style Profile
                  </button>
                </div>
              </div>

              {/* Add/Edit Dynamic Form */}
              <form onSubmit={handleAddProductForm} className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-6">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C9A96E]" />
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">
                    {editingProduct ? 'Update Style Specifications' : 'New Footwear Style Registry'}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Footwear Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Golden Zari Block Heels"
                      value={prodFormName}
                      onChange={e => setProdFormName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none font-semibold text-gray-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">SKU identifier Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HU-HE-089"
                      value={prodFormSku}
                      onChange={e => setProdFormSku(e.target.value.toUpperCase())}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Parent Category</label>
                    <select
                      value={prodFormCategory}
                      onChange={e => setProdFormCategory(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white font-bold text-gray-700"
                    >
                      {categoriesList.map(cat => (
                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Catalog Display Price (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2499"
                      value={prodFormPrice || ''}
                      onChange={e => setProdFormPrice(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Original Price / MRP (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 3499"
                      value={prodFormMrp || ''}
                      onChange={e => setProdFormMrp(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Stock Volume</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={prodFormStock}
                      onChange={e => setProdFormStock(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white font-bold"
                    />
                  </div>
                </div>

                {/* Sizing array checklists */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Indian Sizes</label>
                  <div className="flex flex-wrap gap-2">
                    {['35', '36', '37', '38', '39', '40', '41', '42'].map(sz => {
                      const active = prodFormSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setProdFormSizes(prev => prev.filter(s => s !== sz));
                            } else {
                              setProdFormSizes(prev => [...prev, sz].sort());
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${active
                              ? 'bg-gray-950 text-white border-gray-950'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                            }`}
                        >
                          Size {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* R2 Image Uploader Simulation */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Media Gallery references</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste online image URL..."
                      value={imageInputUrl}
                      onChange={e => setImageInputUrl(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (imageInputUrl.trim()) {
                          setProdFormImages(prev => [...prev, imageInputUrl.trim()]);
                          setImageInputUrl('');
                          showToast('success', 'Image Added', 'Attached thumbnail URL reference.');
                        }
                      }}
                      className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
                    >
                      Attach
                    </button>
                    <label className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-gray-250 flex items-center gap-1 shrink-0">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            showToast('info', 'Uploading...', 'Uploading image to media storage...');
                            const url = await handleUploadImage(file);
                            if (url) {
                              setProdFormImages(prev => [...prev, url]);
                              showToast('success', 'Upload Complete', 'Uploaded and added image to product.');
                            }
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Preview grid */}
                  {prodFormImages.length > 0 && (
                    <div className="flex flex-wrap gap-4 pt-2">
                      {prodFormImages.map((img, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden shadow-sm shrink-0">
                          <HeicImage src={img} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setProdFormImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gray-950 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
                  >
                    {editingProduct ? 'Commit Updates' : 'Add Footwear Profile'}
                  </button>
                </div>
              </form>

              {/* Dynamic search bar & Table List */}
              <div className="bg-white border border-gray-150 rounded-3xl shadow-sm overflow-hidden space-y-4">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-gray-50/50 border-b border-gray-150">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by footwear style or SKU code..."
                      value={productFilterQuery}
                      onChange={e => setProductFilterQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-xs focus:outline-none"
                    />
                  </div>
                  {productFilterQuery && (
                    <button
                      onClick={() => setProductFilterQuery('')}
                      className="text-xs font-bold text-gray-400 hover:text-gray-900"
                    >
                      Clear search
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-150 text-gray-500 font-bold uppercase text-[9px] tracking-widest">
                        <th className="p-4">Visual Details</th>
                        <th className="p-4">Unique SKU</th>
                        <th className="p-4">Parent Category</th>
                        <th className="p-4">Display Price</th>
                        <th className="p-4 text-center">Active Stock</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map(p => {
                        const isOut = p.stock === 0;
                        const isLow = p.stock <= 5;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <HeicImage src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" />
                              <div>
                                <span className="font-bold text-gray-900 block">{p.name}</span>
                                <span className="text-[10px] text-gray-400 block font-mono">Sizes: {p.sizes.join(', ')}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-bold text-gray-500 uppercase">{p.sku}</td>
                            <td className="p-4 uppercase text-[10px] font-bold text-gray-400">{p.category}</td>
                            <td className="p-4 font-bold text-gray-950 font-mono">₹{(p.price / 100).toLocaleString('en-IN')}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase ${isOut ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  isLow ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                {isOut ? 'Critical Out' : isLow ? `${p.stock} units (Low)` : `${p.stock} units`}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProdFormName(p.name);
                                  setProdFormSku(p.sku);
                                  setProdFormCategory(p.category);
                                  setProdFormPrice(p.price / 100);
                                  setProdFormMrp(p.original_price ? p.original_price / 100 : 0);
                                  setProdFormStock(p.stock);
                                  setProdFormSizes(p.sizes);
                                  setProdFormImages(p.images);
                                  showToast('info', 'Editing Product', `Form populated with properties for ${p.sku}`);
                                }}
                                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 inline-block"
                                title="Edit Product properties"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setProducts(prev => prev.filter(item => item.id !== p.id));
                                  showToast('warning', 'Product Suspended', `Style profile ${p.sku} removed from directory.`);
                                }}
                                className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 inline-block"
                                title="Delete Style"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* =======================================
              CATEGORIES MANAGER TAB
              ======================================= */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">Style Categories Catalogue</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure parent categories that dynamically structures the online storefront.</p>
                </div>
              </div>

              {/* Category creation form */}
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!catName || !catSlug) return;
                  try {
                    const res = await fetch('/api/admin/categories', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                      },
                      body: JSON.stringify({
                        name: catName,
                        slug: catSlug,
                        description: catDesc,
                        image_url: catImg,
                        sort_order: Number(catSort),
                        active: true
                      })
                    });
                    const data = await res.json();
                    if (data.success) {
                      fetchCategories();
                      showToast('success', 'Category Created', `Navigational cluster "${catName}" verified and locked.`);
                      setCatName('');
                      setCatSlug('');
                      setCatDesc('');
                      setCatImg('');
                      setCatSort(0);
                    } else {
                      showToast('error', 'Category Creation Failed', data.error || 'Failed to create category');
                    }
                  } catch (err) {
                    showToast('error', 'Network Error', 'Failed to create category');
                  }
                }}
                className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Traditional Wedges"
                      value={catName}
                      onChange={e => {
                        setCatName(e.target.value);
                        setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Url Slug identifier</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. wedges"
                      value={catSlug}
                      onChange={e => setCatSlug(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Image URL reference</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={catImg}
                        onChange={e => setCatImg(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                      <label className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-gray-250 flex items-center gap-1 shrink-0">
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              showToast('info', 'Uploading...', 'Uploading category image...');
                              const url = await handleUploadImage(file);
                              if (url) {
                                setCatImg(url);
                                showToast('success', 'Upload Complete', 'Uploaded and set category image.');
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sorting Priority</label>
                    <input
                      type="number"
                      value={catSort}
                      onChange={e => setCatSort(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Detailed Description</label>
                    <input
                      type="text"
                      placeholder="Display prompt for users visiting collection catalogs..."
                      value={catDesc}
                      onChange={e => setCatDesc(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="px-6 py-2.5 bg-gray-950 hover:bg-black text-white text-xs font-bold uppercase rounded-xl shadow-md">
                    Register Category
                  </button>
                </div>
              </form>

              {/* Category table */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                      <th className="p-4">Visual asset</th>
                      <th className="p-4">Cluster Category</th>
                      <th className="p-4">URL Slug Route</th>
                      <th className="p-4">Priority Rank</th>
                      <th className="p-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categoriesList.map(cat => (
                      <tr key={cat.id} className="hover:bg-gray-50/20">
                        <td className="p-4">
                          <img
                            src={cat.image_url || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=100&auto=format&fit=crop&q=60'}
                            alt={cat.name}
                            className="w-10 h-10 object-cover rounded-lg border"
                          />
                        </td>
                        <td className="p-4 font-bold text-gray-950">
                          {cat.name}
                          <span className="text-[10px] text-gray-400 block font-normal mt-0.5">{cat.description || 'No description provided.'}</span>
                        </td>
                        <td className="p-4 font-mono font-semibold text-gray-500">/{cat.slug}</td>
                        <td className="p-4 font-bold text-gray-800">{cat.sort_order}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/categories/${cat.id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                                  }
                                });
                                const data = await res.json();
                                if (data.success) {
                                  fetchCategories();
                                  showToast('warning', 'Category Suspended', `Cluster "${cat.name}" removed.`);
                                } else {
                                  showToast('error', 'Delete Failed', data.error || 'Failed to delete category');
                                }
                              } catch (err) {
                                showToast('error', 'Network Error', 'Failed to delete category');
                              }
                            }}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================
              COLLECTIONS & SYSTEM TAGS TAB
              ======================================= */}
          {activeTab === 'collections' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">Automated Collections Panel</h3>
                  <p className="text-xs text-gray-400 mt-1">Structure virtual smart collections based on pricing triggers or title keywords.</p>
                </div>
              </div>

              {/* Collections Creator form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!colName) return;
                  const condition = colType === 'automated'
                    ? { type: 'automated', rules: [{ field: colRuleField, relation: colRuleRelation, value: colRuleVal }] }
                    : { type: 'manual' };

                  fetch('/api/admin/collections', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                    },
                    body: JSON.stringify({
                      name: colName,
                      description: colDesc,
                      condition: condition,
                      is_active: 1
                    })
                  })
                    .then(res => res.json())
                    .then(resData => {
                      if (resData.success) {
                        showToast('success', 'Collection Configured', `Smart target "${colName}" committed to ledger.`);
                        fetchCollections();
                        setColName('');
                        setColDesc('');
                        setColRuleVal('');
                      } else {
                        showToast('error', 'Configuration Failed', resData.message || 'Error occurred');
                      }
                    })
                    .catch(err => {
                      console.error('Create collection error:', err);
                      showToast('error', 'Configuration Failed', 'Network error');
                    });
                }}
                className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Collection Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Wedding Collection"
                      value={colName}
                      onChange={e => setColName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Acquisition Logic Type</label>
                    <select
                      value={colType}
                      onChange={e => setColType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-bold"
                    >
                      <option value="automated">Automated Smart Rules</option>
                      <option value="manual">Manual Boutique Choice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Brief Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Handcrafted designs for weddings"
                      value={colDesc}
                      onChange={e => setColDesc(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {colType === 'automated' && (
                  <div className="p-4 bg-white border border-dashed border-gray-200 rounded-2xl space-y-3 animate-fadeIn">
                    <span className="text-[10px] font-extrabold text-gray-900 uppercase tracking-widest block">Automated Selection Rules</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={colRuleField}
                        onChange={e => setColRuleField(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50"
                      >
                        <option value="name">Product Title</option>
                        <option value="price">Product Display Price</option>
                        <option value="stock">Stock Quantity</option>
                      </select>
                      <select
                        value={colRuleRelation}
                        onChange={e => setColRuleRelation(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50"
                      >
                        <option value="contains">Contains Value</option>
                        <option value="greater_than">Is Greater Than</option>
                        <option value="equals">Is Strictly Equal To</option>
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Keyword or Numeric value"
                        value={colRuleVal}
                        onChange={e => setColRuleVal(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <button type="submit" className="px-6 py-2.5 bg-gray-950 text-white hover:bg-black text-xs font-bold uppercase rounded-xl">
                    Register Collection
                  </button>
                </div>
              </form>

              {/* Collections listings */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                      <th className="p-4">Collection Title</th>
                      <th className="p-4">Logic Type</th>
                      <th className="p-4">Smart Target Rules Set</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {collectionsList.map(col => (
                      <tr key={col.id} className="hover:bg-gray-50/20">
                        <td className="p-4">
                          <span className="font-bold text-gray-900 block">{col.name}</span>
                          <span className="text-[10px] text-gray-400 block">{col.description || 'No summary registered.'}</span>
                        </td>
                        <td className="p-4 uppercase text-[10px] font-bold">
                          <span className={`px-2 py-0.5 rounded ${col.type === 'automated' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                            {col.type}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-gray-500 text-[10px]">
                          {col.rules ? col.rules.map((r, i) => (
                            <span key={i} className="bg-gray-100 px-2 py-1 rounded">
                              {r.field} {r.relation} "{r.value}"
                            </span>
                          )) : <span className="italic text-gray-400">Manual allocation targets</span>}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              fetch(`/api/admin/collections/${col.id}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                                }
                              })
                                .then(res => res.json())
                                .then(resData => {
                                  if (resData.success) {
                                    showToast('warning', 'Collection Suspended', `Target "${col.name}" deleted.`);
                                    fetchCollections();
                                  } else {
                                    showToast('error', 'Deletion Failed', resData.message || 'Error occurred');
                                  }
                                })
                                .catch(err => {
                                  console.error('Delete collection error:', err);
                                  showToast('error', 'Deletion Failed', 'Network error');
                                });
                            }}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================
              ONLINE ORDERS TAB
              ======================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4">
                <h3 className="text-xl font-serif italic text-gray-950">Online Orders Timeline Manager</h3>
                <p className="text-xs text-gray-400 mt-1">Track payments status, manage shipment channels, and trigger customer dispatches.</p>
              </div>

              {/* Search bar filter for orders */}
              <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Buyer name, Order number (#), or Contact..."
                    value={orderFilterQuery}
                    onChange={e => setOrderFilterQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                      <th className="p-4">Invoice ID</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Revenue Total</th>
                      <th className="p-4">Date & Gateway status</th>
                      <th className="p-4 text-center">Fulfillment State</th>
                      <th className="p-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map(ord => {
                      const statusStyles: Record<string, string> = {
                        placed: 'bg-blue-50 text-blue-700 border border-blue-100',
                        confirmed: 'bg-amber-50 text-amber-700 border border-amber-100',
                        shipped: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
                        delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                        cancelled: 'bg-rose-50 text-rose-700 border border-rose-100'
                      };
                      return (
                        <tr key={ord.id} className="hover:bg-gray-50/20">
                          <td className="p-4 font-mono font-bold text-gray-950 tracking-wider">
                            {ord.order_number}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-gray-900 block">{ord.customer_name}</span>
                            <span className="text-[10px] text-gray-400 block font-mono">{ord.customer_phone}</span>
                          </td>
                          <td className="p-4 font-bold text-gray-950 font-mono">
                            ₹{(ord.total_amount / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] text-gray-500 font-medium block">
                              {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[9px] text-gray-400 uppercase font-bold font-mono block">{ord.payment_status} ({ord.payment_method})</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusStyles[ord.order_status]}`}>
                              {ord.order_status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  showToast('info', 'Loading Details', 'Fetching order line items...');
                                  const res = await fetch(`/api/admin/orders/${ord.id}`, {
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                                    }
                                  });
                                  const resData = await res.json();
                                  if (resData.success && resData.data) {
                                    setSelectedOrder(resData.data);
                                    setCourierName(resData.data.courier_name || '');
                                    setTrackingNumber(resData.data.tracking_number || '');
                                    setTrackingUrl(resData.data.tracking_url || '');
                                  } else {
                                    showToast('error', 'Details Error', resData.error || 'Failed to fetch details');
                                  }
                                } catch (err) {
                                  console.error('Fetch order details error:', err);
                                  showToast('error', 'Network Error', 'Failed to fetch order details');
                                }
                              }}
                              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold uppercase rounded-lg transition-colors border border-gray-200"
                            >
                              Dispatch Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================
              CUSTOMERS LOG TAB
              ======================================= */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4">
                <h3 className="text-xl font-serif italic text-gray-950">Acquired Customers Directory</h3>
                <p className="text-xs text-gray-400 mt-1">Monitor buyer history log profiles, transaction rates, and loyalty tag states.</p>
              </div>

              <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter profiles by customer name, phone contacts or emails..."
                    value={customerFilterQuery}
                    onChange={e => setCustomerFilterQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredCustomers.map(cust => (
                  <div key={cust.id} className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm space-y-4 hover:border-[#C9A96E] transition-colors relative">
                    <span className={`absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${cust.tag === 'VIP' ? 'bg-amber-100 text-amber-800' :
                        cust.tag === 'Gold' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {cust.tag}
                    </span>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#faf6ee] border border-[#ead2ae] text-[#C9A96E] font-bold flex items-center justify-center">
                        {cust.name[0]}
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-gray-900 block">{cust.name}</strong>
                        <span className="text-[10px] text-gray-400 block font-mono">{cust.phone}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 flex justify-between text-xs font-semibold text-gray-500">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block">Completed Transactions</span>
                        <span className="text-gray-900 font-bold font-mono mt-0.5 block">{cust.orders_count} orders</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider block">Boutique LTV Spend</span>
                        <span className="text-gray-950 font-bold font-mono mt-0.5 block">₹{(cust.total_spent / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-right">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="text-[10px] font-bold uppercase text-[#C9A96E] hover:text-[#b17e3f]"
                      >
                        Profile History Card &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =======================================
              INVENTORY MANAGEMENT TAB
              ======================================= */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4">
                <h3 className="text-xl font-serif italic text-gray-950">Warehouse Inventory Control</h3>
                <p className="text-xs text-gray-400 mt-1">One-click adjustments for safe stock reserves and automatic out-of-stock indicators.</p>
              </div>

              {/* Warnings KPI and Quick Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-5 border border-amber-200/80 bg-amber-50/50 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg">!</div>
                  <div>
                    <strong className="text-amber-900 text-xs font-bold block uppercase tracking-wide">Stock Warnings</strong>
                    <span className="text-sm font-bold text-gray-900 block font-mono">
                      {products.filter(p => p.stock <= 5 && p.stock > 0).length} footwear styles near depletion threshold.
                    </span>
                  </div>
                </div>

                <div className="p-5 border border-rose-200/80 bg-rose-50/50 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg">✗</div>
                  <div>
                    <strong className="text-rose-900 text-xs font-bold block uppercase tracking-wide">Out Of Stock</strong>
                    <span className="text-sm font-bold text-gray-900 block font-mono">
                      {products.filter(p => p.stock === 0).length} footwear profiles completely out of stock.
                    </span>
                  </div>
                </div>

                <div className="p-5 border border-emerald-200/80 bg-emerald-50/50 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">✓</div>
                  <div>
                    <strong className="text-emerald-900 text-xs font-bold block uppercase tracking-wide">Total Healthy Units</strong>
                    <span className="text-sm font-bold text-gray-900 block font-mono">
                      {products.reduce((acc, curr) => acc + curr.stock, 0)} units currently managed in boutique database.
                    </span>
                  </div>
                </div>
              </div>

              {/* Unified catalog inventory levels controller */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                      <th className="p-4">Boutique Item SKU Design</th>
                      <th className="p-4">Active Stock Units</th>
                      <th className="p-4">Status Alert Indicator</th>
                      <th className="p-4 text-right">Quick Restock Allocation Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map(p => {
                      const isOut = p.stock === 0;
                      const isLow = p.stock <= 5;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/20 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-gray-950 block">{p.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">SKU: {p.sku} &middot; Category: {p.category}</span>
                          </td>
                          <td className="p-4 font-bold text-gray-900 font-mono text-sm">{p.stock} units</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isOut ? 'bg-rose-100 text-rose-800' :
                                isLow ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                              {isOut ? 'Depleted' : isLow ? 'Low Warnings' : 'Healthy'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateStock(p.id, Math.max(0, p.stock - 1), p.sku)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold flex items-center justify-center text-sm"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleUpdateStock(p.id, p.stock + 1, p.sku)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold flex items-center justify-center text-sm"
                              >
                                +
                              </button>
                              <button
                                onClick={() => handleUpdateStock(p.id, p.stock + 10, p.sku)}
                                className="px-3.5 py-1.5 rounded-lg bg-gray-950 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider"
                              >
                                +10 Batch
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================
              PROMOS & COUPONS TAB
              ======================================= */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">Promo Coupons directory</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure active codes, flat vs. percentage discounts, and minimum order values.</p>
                </div>
              </div>

              {/* Promo creation form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!coupCode || !coupValue) return;
                  fetch('/api/admin/coupons', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                    },
                    body: JSON.stringify({
                      code: coupCode.toUpperCase(),
                      discount_type: coupType,
                      discount_value: coupType === 'percentage' ? coupValue : coupValue * 100, // stored in paise if fixed
                      min_purchase: coupMin * 100, // stored in paise
                      active: true
                    })
                  })
                    .then(res => res.json())
                    .then(resData => {
                      if (resData.success) {
                        showToast('success', 'Coupon Configured', `Promo code "${coupCode.toUpperCase()}" active.`);
                        fetchCoupons();
                        setCoupCode('');
                        setCoupValue(0);
                        setCoupMin(0);
                      } else {
                        showToast('error', 'Configuration Failed', resData.message || 'Error occurred');
                      }
                    })
                    .catch(err => {
                      console.error('Create coupon error:', err);
                      showToast('error', 'Configuration Failed', 'Network error');
                    });
                }}
                className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Coupon Code (UPPERCASE)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FIRST15"
                      value={coupCode}
                      onChange={e => setCoupCode(e.target.value.toUpperCase())}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Deduction Type</label>
                    <select
                      value={coupType}
                      onChange={e => setCoupType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-bold"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed INR (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Deduction Value (% or ₹)</label>
                    <input
                      type="number"
                      required
                      value={coupValue || ''}
                      onChange={e => setCoupValue(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minimum Order Target (₹)</label>
                    <input
                      type="number"
                      value={coupMin || ''}
                      onChange={e => setCoupMin(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <button type="submit" className="px-6 py-2.5 bg-gray-950 text-white text-xs font-bold uppercase rounded-xl">
                    Register Promo Code
                  </button>
                </div>
              </form>

              {/* Coupons table list */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                      <th className="p-4">Coupon Code</th>
                      <th className="p-4">Deduction Rate</th>
                      <th className="p-4">Minimum Order target</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {couponsList.map(cp => (
                      <tr key={cp.id} className="hover:bg-gray-50/20">
                        <td className="p-4 font-mono font-extrabold text-gray-900 tracking-wider text-sm">{cp.code}</td>
                        <td className="p-4 font-bold text-gray-700">
                          {cp.discount_type === 'percentage' ? `${cp.discount_value}% Off` : `₹${(cp.discount_value / 100).toLocaleString()} Off`}
                        </td>
                        <td className="p-4 font-semibold text-gray-500">₹{(cp.min_purchase / 100).toLocaleString()} minimum basket</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              fetch(`/api/admin/coupons/${cp.id}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                                }
                              })
                                .then(res => res.json())
                                .then(resData => {
                                  if (resData.success) {
                                    showToast('warning', 'Coupon Suspended', `Promo code "${cp.code}" deleted.`);
                                    fetchCoupons();
                                  } else {
                                    showToast('error', 'Deletion Failed', resData.message || 'Error occurred');
                                  }
                                })
                                .catch(err => {
                                  console.error('Delete coupon error:', err);
                                  showToast('error', 'Deletion Failed', 'Network error');
                                });
                            }}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================
              BANNERS SLIDESHOW TAB
              ======================================= */}
          {activeTab === 'banners' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">Homepage Banners Slideshow</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure slideshow campaigns for promotional announcements and new launches.</p>
                </div>
              </div>

              {/* Form creation */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!bannerTitle || !bannerImg) return;
                  fetch('/api/admin/banners', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                    },
                    body: JSON.stringify({
                      title: bannerTitle,
                      subtitle: bannerSubtitle,
                      image_url: bannerImg,
                      link: bannerLink,
                      active: true
                    })
                  })
                    .then(res => res.json())
                    .then(resData => {
                      if (resData.success) {
                        showToast('success', 'Banner Configured', 'Slideshow entry added.');
                        fetchBanners();
                        setBannerTitle('');
                        setBannerSubtitle('');
                        setBannerImg('');
                        setBannerLink('');
                      } else {
                        showToast('error', 'Configuration Failed', resData.message || 'Error occurred');
                      }
                    })
                    .catch(err => {
                      console.error('Create banner error:', err);
                      showToast('error', 'Configuration Failed', 'Network error');
                    });
                }}
                className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Banner Campaign Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wedding Juttis Collection"
                      value={bannerTitle}
                      onChange={e => setBannerTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Image URL reference</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="https://images.unsplash.com/..."
                        value={bannerImg}
                        onChange={e => setBannerImg(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                      <label className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-gray-250 flex items-center gap-1 shrink-0">
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              showToast('info', 'Uploading...', 'Uploading banner image...');
                              const url = await handleUploadImage(file);
                              if (url) {
                                setBannerImg(url);
                                showToast('success', 'Upload Complete', 'Uploaded and set banner image.');
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Subtitle</label>
                    <input
                      type="text"
                      placeholder="Special description"
                      value={bannerSubtitle}
                      onChange={e => setBannerSubtitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target link redirect</label>
                    <input
                      type="text"
                      placeholder="e.g. /shop?category=sandals"
                      value={bannerLink}
                      onChange={e => setBannerLink(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <button type="submit" className="px-6 py-2.5 bg-gray-950 text-white text-xs font-bold uppercase rounded-xl">
                    Deploy Banner
                  </button>
                </div>
              </form>

              {/* Banners display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bannersList.map(bn => (
                  <div key={bn.id} className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm relative group">
                    <HeicImage src={bn.image_url} alt={bn.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 flex flex-col justify-end text-white">
                      <strong className="text-sm font-serif italic block text-[#C9A96E]">{bn.title}</strong>
                      <p className="text-[10px] text-gray-300 mt-1">{bn.subtitle || 'Active slide campaign'}</p>
                      <span className="text-[9px] font-mono text-[#C9A96E] mt-2 block">Redirect: {bn.link || 'Homepage'}</span>
                    </div>

                    <button
                      onClick={() => {
                        fetch(`/api/admin/banners/${bn.id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                          }
                        })
                          .then(res => res.json())
                          .then(resData => {
                            if (resData.success) {
                              showToast('warning', 'Banner Suspended', 'Homepage slideshow element deleted.');
                              fetchBanners();
                            } else {
                              showToast('error', 'Deletion Failed', resData.message || 'Error occurred');
                            }
                          })
                          .catch(err => {
                            console.error('Delete banner error:', err);
                            showToast('error', 'Deletion Failed', 'Network error');
                          });
                      }}
                      className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =======================================
              REVIEWS MODERATION TAB
              ======================================= */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4">
                <h3 className="text-xl font-serif italic text-gray-950">Boutique Reviews Moderation</h3>
                <p className="text-xs text-gray-400 mt-1">Moderate customer feedback before publishing it live on the footwear catalogue details.</p>
              </div>

              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-100">
                {reviewsList.map(rev => (
                  <div key={rev.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/50">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <strong className="text-sm font-bold text-gray-900">{rev.user_name}</strong>
                        <div className="flex text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 italic">"{rev.comment}"</p>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                        Style target: <strong className="text-gray-600">{rev.product_name}</strong> &middot; Date: {rev.created_at}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const nextApproved = !rev.approved;
                          fetch(`/api/admin/reviews/${rev.id}/approve`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                            },
                            body: JSON.stringify({ status: nextApproved ? 'approved' : 'pending' })
                          })
                            .then(res => res.json())
                            .then(resData => {
                              if (resData.success) {
                                showToast('success', 'Moderation Toggled', `Review status changed to ${nextApproved ? 'Approved' : 'Pending'}.`);
                                fetchReviews();
                              } else {
                                showToast('error', 'Update Failed', resData.message || 'Error occurred');
                              }
                            })
                            .catch(err => {
                              console.error('Toggle review approval error:', err);
                              showToast('error', 'Update Failed', 'Network error');
                            });
                        }}
                        className={`px-4 py-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${rev.approved
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                            : 'bg-amber-50 border-amber-100 text-amber-800'
                          }`}
                      >
                        {rev.approved ? '✓ Approved Live' : '⧗ Pending validation'}
                      </button>
                      <button
                        onClick={() => {
                          fetch(`/api/admin/reviews/${rev.id}`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                            }
                          })
                            .then(res => res.json())
                            .then(resData => {
                              if (resData.success) {
                                showToast('warning', 'Review Deleted', 'User feedback deleted from boutique records.');
                                fetchReviews();
                              } else {
                                showToast('error', 'Deletion Failed', resData.message || 'Error occurred');
                              }
                            })
                            .catch(err => {
                              console.error('Delete review error:', err);
                              showToast('error', 'Deletion Failed', 'Network error');
                            });
                        }}
                        className="p-2 bg-rose-50 text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =======================================
              STATIC POLICY PAGES TAB
              ======================================= */}
          {activeTab === 'pages' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">Static policy Pages</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure static terms & conditions pages like exchange policy or privacy details.</p>
                </div>
              </div>

              {/* Page editor form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!pageTitle || !pageContent) return;
                  fetch('/api/admin/pages', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                    },
                    body: JSON.stringify({
                      title: pageTitle,
                      slug: pageSlug,
                      content: pageContent,
                      active: true
                    })
                  })
                    .then(res => res.json())
                    .then(resData => {
                      if (resData.success) {
                        showToast('success', 'Page saved', 'Custom HTML document published successfully.');
                        fetchPages();
                        setPageTitle('');
                        setPageSlug('');
                        setPageContent('');
                      } else {
                        showToast('error', 'Publish Failed', resData.message || 'Error occurred');
                      }
                    })
                    .catch(err => {
                      console.error('Create page error:', err);
                      showToast('error', 'Publish Failed', 'Network error');
                    });
                }}
                className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Document Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Refund Policy"
                      value={pageTitle}
                      onChange={e => {
                        setPageTitle(e.target.value);
                        setPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Custom Navigation Slug</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. refunds"
                      value={pageSlug}
                      onChange={e => setPageSlug(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">HTML Raw Content editor</label>
                  <textarea
                    required
                    rows={6}
                    value={pageContent}
                    onChange={e => setPageContent(e.target.value)}
                    placeholder="<h3>Privacy details</h3><p>We process secure UPI transactions only...</p>"
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white font-mono focus:outline-none"
                  />
                </div>

                <div className="text-right">
                  <button type="submit" className="px-6 py-2.5 bg-gray-950 text-white text-xs font-bold uppercase rounded-xl">
                    Publish Document
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                      <th className="p-4">Document Name</th>
                      <th className="p-4">Navigation Slug</th>
                      <th className="p-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagesList.map(pg => (
                      <tr key={pg.id} className="hover:bg-gray-50/20">
                        <td className="p-4 font-bold text-gray-900">{pg.title}</td>
                        <td className="p-4 font-mono text-gray-500">/{pg.slug}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              fetch(`/api/admin/pages/${pg.id}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                                }
                              })
                                .then(res => res.json())
                                .then(resData => {
                                  if (resData.success) {
                                    showToast('warning', 'Document Suspended', `Policy page "${pg.title}" deleted.`);
                                    fetchPages();
                                  } else {
                                    showToast('error', 'Deletion Failed', resData.message || 'Error occurred');
                                  }
                                })
                                .catch(err => {
                                  console.error('Delete page error:', err);
                                  showToast('error', 'Deletion Failed', 'Network error');
                                });
                            }}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================
              STAFF ACCOUNTS TAB
              ======================================= */}
          {activeTab === 'staff' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">Administrative Staff Accounts</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure roles (Admin, Manager, Staff assistant) and revoke credentials access.</p>
                </div>
              </div>

              {/* Creator form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!staffName || !staffEmail) return;
                  const nameParts = staffName.trim().split(' ');
                  const firstName = nameParts[0];
                  const lastName = nameParts.slice(1).join(' ');

                  fetch('/api/admin/staff', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                    },
                    body: JSON.stringify({
                      first_name: firstName,
                      last_name: lastName,
                      email: staffEmail,
                      role: staffRole,
                      is_active: true
                    })
                  })
                    .then(res => res.json())
                    .then(resData => {
                      if (resData.success) {
                        showToast('success', 'Staff Member Added', `Verified email ${staffEmail} assigned role ${staffRole.toUpperCase()}.`);
                        fetchStaff();
                        setStaffName('');
                        setStaffEmail('');
                        setStaffRole('staff');
                      } else {
                        showToast('error', 'Registration Failed', resData.message || 'Error occurred');
                      }
                    })
                    .catch(err => {
                      console.error('Create staff error:', err);
                      showToast('error', 'Registration Failed', 'Network error');
                    });
                }}
                className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abhishek Jodhpur"
                      value={staffName}
                      onChange={e => setStaffName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      placeholder="name@heelsup.in"
                      value={staffEmail}
                      onChange={e => setStaffEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Permission Tier Role</label>
                    <select
                      value={staffRole}
                      onChange={e => setStaffRole(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-bold text-gray-700"
                    >
                      <option value="staff">Staff Assistant</option>
                      <option value="manager">Manager (Inventory/Orders)</option>
                      <option value="admin">Administrator (Full access)</option>
                    </select>
                  </div>
                </div>

                <div className="text-right">
                  <button type="submit" className="px-6 py-2.5 bg-gray-950 text-white text-xs font-bold uppercase rounded-xl">
                    Register Staff credentials
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                      <th className="p-4">Name</th>
                      <th className="p-4">Work Email address</th>
                      <th className="p-4">Assigned Tier role</th>
                      <th className="p-4 text-right">Delete Account</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffList.map(st => (
                      <tr key={st.id} className="hover:bg-gray-50/20">
                        <td className="p-4 font-bold text-gray-900">{st.name}</td>
                        <td className="p-4 text-gray-500 font-mono">{st.email}</td>
                        <td className="p-4 uppercase text-[10px] font-bold font-mono">
                          <span className={`px-2.5 py-0.5 rounded ${st.role === 'admin' ? 'bg-[#ead2ae] text-gray-950 font-extrabold' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {st.role}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              if (st.email === user.email) {
                                showToast('error', 'Critical Error', 'You cannot suspend your own active administrative session.');
                                return;
                              }
                              fetch(`/api/admin/staff/${st.id}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                                }
                              })
                                .then(res => res.json())
                                .then(resData => {
                                  if (resData.success) {
                                    showToast('warning', 'Staff Terminated', `Access privileges revoked for ${st.email}.`);
                                    fetchStaff();
                                  } else {
                                    showToast('error', 'Revocation Failed', resData.message || 'Error occurred');
                                  }
                                })
                                .catch(err => {
                                  console.error('Delete staff error:', err);
                                  showToast('error', 'Revocation Failed', 'Network error');
                                });
                            }}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================
              GENERAL CONFIGURATION TAB
              ======================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4">
                <h3 className="text-xl font-serif italic text-gray-950">Boutique Configuration Panel</h3>
                <p className="text-xs text-gray-400 mt-1">Configure Razorpay webhooks, brand details, SMS gateways and support channels.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Brand & Support */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest border-b pb-2">🏢 Support Channels</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Boutique Store Name</label>
                      <input
                        type="text"
                        value={settings.storeName}
                        onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Support Contact Hotline</label>
                      <input
                        type="text"
                        value={settings.storePhone}
                        onChange={e => setSettings({ ...settings, storePhone: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Store Support Email</label>
                      <input
                        type="email"
                        value={settings.storeEmail}
                        onChange={e => setSettings({ ...settings, storeEmail: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Physical Address</label>
                      <input
                        type="text"
                        value={settings.storeAddress}
                        onChange={e => setSettings({ ...settings, storeAddress: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Gateway credentials */}
                <div className="bg-white border border-[#ead2ae] p-6 rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#fcfbf9] shadow-sm space-y-4">
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest border-b pb-2 text-gray-800">💳 Secure Payments Gateway (Razorpay)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Razorpay Live Key ID</label>
                      <input
                        type="text"
                        value={settings.razorpayKeyId}
                        onChange={e => setSettings({ ...settings, razorpayKeyId: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Razorpay API Secret</label>
                      <input
                        type="password"
                        value={settings.razorpaySecret}
                        onChange={e => setSettings({ ...settings, razorpaySecret: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-mono"
                      />
                    </div>

                    <div className="p-3.5 bg-white border border-gray-150 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-600">
                      <span>Automated SMS Dispatch System</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSettings({ ...settings, smsEnabled: !settings.smsEnabled });
                          showToast('info', 'System settings changed', 'Automated dispatch SMS state changed.');
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${settings.smsEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                      >
                        {settings.smsEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          showToast('info', 'Testing connection...', 'Connecting to Razorpay...');
                          try {
                            const res = await fetch('/api/admin/settings/test/razorpay', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                              },
                              body: JSON.stringify({
                                razorpay_key_id: settings.razorpayKeyId,
                                razorpay_key_secret: settings.razorpaySecret
                              })
                            });
                            const resData = await res.json();
                            if (resData.success) {
                              showToast('success', 'Connection Verified', 'Live API handshake resolved with Razorpay routing server.');
                            } else {
                              showToast('error', 'Connection Failed', resData.message || 'Verification failed');
                            }
                          } catch (err) {
                            showToast('error', 'Connection Failed', 'Network error');
                          }
                        }}
                        className="w-full py-3 border border-gray-300 hover:border-gray-900 bg-white text-gray-700 hover:text-black rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Test Live connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right border-t pt-4">
                <button
                  onClick={async () => {
                    showToast('info', 'Saving settings...', 'Updating boutique configuration...');
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                        },
                        body: JSON.stringify({
                          store_name: settings.storeName,
                          store_phone: settings.storePhone,
                          store_email: settings.storeEmail,
                          store_address: settings.storeAddress,
                          razorpay_key_id: settings.razorpayKeyId,
                          razorpay_key_secret: settings.razorpaySecret,
                          sms_enabled: settings.smsEnabled
                        })
                      });
                      const resData = await res.json();
                      if (resData.success) {
                        showToast('success', 'Boutique Configurations Saved', 'General boutique properties saved successfully.');
                        fetchSettings();
                      } else {
                        showToast('error', 'Save Failed', resData.message || 'Could not save configurations');
                      }
                    } catch (err) {
                      showToast('error', 'Save Failed', 'Network error');
                    }
                  }}
                  className="px-6 py-3 bg-gray-950 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
                >
                  Save Global configuration
                </button>
              </div>
            </div>
          )}

          {/* =======================================
              D1 LIVE DATABASE TABLES TAB
              ======================================= */}
          {activeTab === 'db_editor' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-serif italic text-gray-950">D1 Live Database Table Editor</h3>
                  <p className="text-xs text-gray-400 mt-1">Directly view and edit raw rows in the D1 SQL database tables.</p>
                </div>
                <button
                  onClick={() => setIsAddingDbRow(true)}
                  className="px-4 py-2 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors uppercase shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Row
                </button>
              </div>

              {/* Controls bar */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Database Table:</span>
                  <select
                    value={selectedDbTable}
                    onChange={(e) => setSelectedDbTable(e.target.value)}
                    className="border rounded-xl px-3 py-1.5 text-xs font-extrabold bg-white text-gray-800 focus:outline-none"
                  >
                    {dbTablesList.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => fetchDbTableData(selectedDbTable)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
                    title="Reload data"
                  >
                    <RotateCw className={'w-4 h-4 ' + (dbLoading ? 'animate-spin' : '')} />
                  </button>
                </div>

                <div className="admin-search w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search database rows..."
                    value={dbSearchQuery}
                    onChange={e => setDbSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Table rendering */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-[#faf9f6] text-gray-500 font-bold uppercase text-[9px] tracking-widest border-b border-gray-150">
                        {dbColumns.map(col => (
                          <th key={col} className="p-4 whitespace-nowrap">{col}</th>
                        ))}
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dbLoading ? (
                        <tr>
                          <td colSpan={dbColumns.length + 1} className="p-8 text-center text-gray-400">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
                              <span>Fetching live records from D1...</span>
                            </div>
                          </td>
                        </tr>
                      ) : dbRows.length === 0 ? (
                        <tr>
                          <td colSpan={dbColumns.length + 1} className="p-8 text-center text-gray-400">No rows found in this table.</td>
                        </tr>
                      ) : (
                        dbRows.filter(row => {
                          if (!dbSearchQuery.trim()) return true;
                          const q = dbSearchQuery.toLowerCase();
                          return Object.values(row).some(val => String(val).toLowerCase().includes(q));
                        }).map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-gray-50/70 transition-colors font-medium">
                            {dbColumns.map(col => {
                              const val = row[col];
                              const isImg = typeof val === 'string' && (val.startsWith('http') || val.startsWith('/')) && (val.match(/\.(jpeg|jpg|gif|png|webp|heic)$/i) || val.includes('key='));
                              return (
                                <td key={col} className="p-4 max-w-xs truncate text-gray-700">
                                  {isImg ? (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border bg-gray-50">
                                      <HeicImage src={val} className="w-full h-full object-cover" />
                                    </div>
                                  ) : val === null ? (
                                    <span className="text-gray-350 italic">null</span>
                                  ) : typeof val === 'object' ? (
                                    JSON.stringify(val)
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingDbRow({ ...row })}
                                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Modal */}
              {isAddingDbRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white border border-gray-150 rounded-3xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scaleUp">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                      <h3 className="font-serif italic text-lg text-gray-900">Add Row to {selectedDbTable}</h3>
                      <button onClick={() => setIsAddingDbRow(false)} className="text-gray-400 hover:text-gray-650">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData: Record<string, any> = {};
                      const formElements = e.currentTarget.elements;
                      dbColumns.forEach(c => {
                        if (c === 'id') return;
                        const inputEl = formElements.namedItem(c) as HTMLInputElement | null;
                        if (inputEl) {
                          const val = inputEl.value;
                          formData[c] = val === '' ? null : (isNaN(Number(val)) || val.trim() === '' ? val : Number(val));
                        }
                      });
                      handleInsertRow(formData);
                    }} className="flex-1 overflow-y-auto p-6 space-y-4">
                      {dbColumns.map(col => {
                        if (col === 'id') return null;
                        const isImg = col.toLowerCase().includes('image') || col.toLowerCase().includes('url');
                        return (
                          <div key={col} className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">{col}</label>
                            {isImg ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  name={col}
                                  id={col}
                                  placeholder={'Enter ' + col + '...'}
                                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                                />
                                <label className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-gray-250 flex items-center gap-1 shrink-0">
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  Upload
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        showToast('info', 'Uploading...', 'Uploading database asset...');
                                        const url = await handleUploadImage(file);
                                        if (url) {
                                          const inputEl = document.getElementById(col) as HTMLInputElement | null;
                                          if (inputEl) inputEl.value = url;
                                          showToast('success', 'Upload Complete', 'Asset uploaded.');
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            ) : (
                              <input
                                type="text"
                                name={col}
                                placeholder={'Enter ' + col + '...'}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                              />
                            )}
                          </div>
                        );
                      })}
                      <div className="pt-4 border-t flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsAddingDbRow(false)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl uppercase transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl uppercase transition-colors"
                        >
                          Save Row
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Modal */}
              {editingDbRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white border border-gray-150 rounded-3xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scaleUp">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                      <h3 className="font-serif italic text-lg text-gray-900 font-display">Edit Row {editingDbRow.id} in {selectedDbTable}</h3>
                      <button onClick={() => setEditingDbRow(null)} className="text-gray-400 hover:text-gray-655">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData: Record<string, any> = { id: editingDbRow.id };
                      const formElements = e.currentTarget.elements;
                      dbColumns.forEach(c => {
                        if (c === 'id') return;
                        const inputEl = formElements.namedItem(c) as HTMLInputElement | null;
                        if (inputEl) {
                          const val = inputEl.value;
                          formData[c] = val === '' ? null : (isNaN(Number(val)) || val.trim() === '' ? val : Number(val));
                        }
                      });
                      handleUpdateRow(formData);
                    }} className="flex-1 overflow-y-auto p-6 space-y-4">
                      {dbColumns.map(col => {
                        const isImg = col.toLowerCase().includes('image') || col.toLowerCase().includes('url');
                        return (
                          <div key={col} className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">{col}</label>
                            {col === 'id' ? (
                              <input
                                type="text"
                                disabled
                                value={editingDbRow.id}
                                className="w-full border border-gray-150 rounded-xl px-3 py-2 text-xs bg-gray-50 text-gray-450 focus:outline-none font-bold"
                              />
                            ) : isImg ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  name={col}
                                  id={'edit_' + col}
                                  defaultValue={editingDbRow[col] === null ? '' : String(editingDbRow[col])}
                                  placeholder={'Enter ' + col + '...'}
                                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                                />
                                <label className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-gray-250 flex items-center gap-1 shrink-0">
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  Upload
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        showToast('info', 'Uploading...', 'Uploading database asset...');
                                        const url = await handleUploadImage(file);
                                        if (url) {
                                          const inputEl = document.getElementById('edit_' + col) as HTMLInputElement | null;
                                          if (inputEl) inputEl.value = url;
                                          showToast('success', 'Upload Complete', 'Asset uploaded.');
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            ) : (
                              <input
                                type="text"
                                name={col}
                                defaultValue={editingDbRow[col] === null ? '' : String(editingDbRow[col])}
                                placeholder={'Enter ' + col + '...'}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                              />
                            )}
                          </div>
                        );
                      })}
                      <div className="pt-4 border-t flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingDbRow(null)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl uppercase transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl uppercase transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =======================================
              ENTERPRISE REPORTS TAB
              ======================================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-150 pb-4">
                <h3 className="text-xl font-serif italic text-gray-950">Enterprise Ledger Reporting</h3>
                <p className="text-xs text-gray-400 mt-1">Compile comprehensive financial audit reports directly from database query logs.</p>
              </div>

              {/* Filters setup */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <span>📊 Configure Report Target Range</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dataset Mode</label>
                    <select
                      value={reportType}
                      onChange={e => setReportType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium"
                    >
                      <option value="sales">Sales & Revenue</option>
                      <option value="inventory">Inventory Warnings</option>
                      <option value="customers">Acquisition Insights</option>
                      <option value="orders">Payment Methods distribution</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                    <input
                      type="date"
                      value={reportFrom}
                      onChange={e => setReportFrom(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                    <input
                      type="date"
                      value={reportTo}
                      onChange={e => setReportTo(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <button
                      onClick={generateStoreReport}
                      className="w-full py-2.5 bg-gray-950 hover:bg-black text-white text-[10px] font-bold uppercase rounded-xl tracking-widest transition-all"
                    >
                      Compile Data Report
                    </button>
                  </div>
                </div>
              </div>

              {/* Report display section */}
              {reportLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#C9A96E] border-t-transparent animate-spin mx-auto" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Compiling D1 SQL Server registries...</span>
                </div>
              ) : generatedReport ? (
                <div className="space-y-6">
                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handlePrint('print-report-container')}
                      className="px-4 py-2 border border-gray-200 hover:border-gray-900 bg-white text-gray-700 hover:text-black rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" /> Print Formatted PDF
                    </button>
                    <button
                      onClick={() => {
                        const headers = ['Metric name', 'Dataset Value'];
                        const rows = [
                          ['Total Orders', generatedReport.summary.total_orders],
                          ['Total Gross Revenue (₹)', (generatedReport.summary.total_revenue / 100).toFixed(2)],
                          ['AOV (₹)', (generatedReport.summary.avg_order_value / 100).toFixed(2)],
                          ['Unique Customers', generatedReport.summary.unique_customers]
                        ];
                        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.setAttribute('href', url);
                        link.setAttribute('download', `heelsup_report_${reportType}.csv`);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast('success', 'CSV Generated', 'Excel compatible sheet downloaded successfully.');
                      }}
                      className="px-4 py-2 bg-[#C9A96E] hover:bg-[#b17e3f] text-gray-950 font-extrabold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> Export CSV Spreadsheet
                    </button>
                  </div>

                  {/* Print Container wrapper */}
                  <div id="print-report-container" className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                    <div className="border-b-2 border-gray-900 pb-4">
                      <h2 className="text-2xl font-serif italic text-gray-950">HeelsUp Audited Data Ledger Report</h2>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1 font-mono">
                        <span>Calendar Range: {reportFrom} to {reportTo}</span>
                        <span>Generated on: {new Date().toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Audited Transactions</span>
                        <span className="text-xl font-bold text-gray-900 mt-1 block font-mono">{generatedReport.summary.total_orders}</span>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Gross Sales Revenue</span>
                        <span className="text-xl font-bold text-[#C9A96E] mt-1 block font-mono">₹{(generatedReport.summary.total_revenue / 100).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Audit Basket AOV</span>
                        <span className="text-xl font-bold text-gray-900 mt-1 block font-mono">₹{(generatedReport.summary.avg_order_value / 100).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Shopper Contacts</span>
                        <span className="text-xl font-bold text-gray-900 mt-1 block font-mono">{generatedReport.summary.unique_customers}</span>
                      </div>
                    </div>

                    {/* Low stock indicators table inside report */}
                    <div className="space-y-3">
                      <strong className="text-xs uppercase font-extrabold text-gray-800 tracking-wider block">⚠️ Low Stock alert catalog items</strong>
                      <div className="border rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-gray-50 border-b">
                            <tr className="font-bold text-gray-400 uppercase text-[8px] tracking-widest">
                              <th className="p-3">Product design name</th>
                              <th className="p-3">SKU</th>
                              <th className="p-3 text-right">Units remaining</th>
                            </tr>
                          </thead>
                          <tbody>
                            {generatedReport.low_stock.map((p: any) => (
                              <tr key={p.id} className="border-b last:border-0 font-medium text-gray-600">
                                <td className="p-3 text-gray-900">{p.name}</td>
                                <td className="p-3 font-mono">{p.sku}</td>
                                <td className="p-3 text-right font-bold text-rose-600 font-mono">{p.stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 border-2 border-dashed border-gray-200 rounded-3xl text-center space-y-3">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                  <strong className="text-sm font-bold text-gray-700 block">No Report dataset compiled</strong>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Select a data category and target calendar dates from above to filter database ledgers.
                  </p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* =======================================
          BULK CSV/JSON UPLOAD MODAL
          ======================================= */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-[#C9A96E]" />
                <div>
                  <strong className="text-sm font-bold text-gray-900 block font-mono">BULK PRODUCTS CSV/JSON PARSER</strong>
                  <span className="text-[10px] text-gray-400 block font-medium">Commit multiple style catalogs simultaneously</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkInputText('');
                }}
                className="text-gray-400 hover:text-black p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 min-h-0">
              <div className="flex-1 flex flex-col gap-4">
                <div className="bg-amber-50/50 p-4 border border-amber-100 rounded-2xl text-[10px] text-amber-900 space-y-2 leading-relaxed">
                  <span className="font-extrabold uppercase block">CSV Header specifications</span>
                  <p>First line columns must match: <strong className="font-mono text-gray-950">name,sku,price,mrp,stock,category,sizes,images</strong></p>
                  <p>Or paste a structured JSON array directly inside.</p>
                </div>

                <textarea
                  value={bulkInputText}
                  onChange={e => setBulkInputText(e.target.value)}
                  placeholder={`name,sku,price,mrp,stock,category,sizes,images\nMidnight Heel,HU-MN-90,1499,1999,25,heels,"36|37|38","https://..."`}
                  className="w-full flex-1 min-h-[180px] p-3.5 border border-gray-200 rounded-2xl text-xs font-mono focus:outline-none focus:border-[#C9A96E] bg-gray-50/30"
                />
              </div>

              {/* Live Preview Side */}
              <div className="w-full md:w-[45%] flex flex-col border-t md:border-t-0 md:border-l border-gray-150 pt-5 md:pt-0 md:pl-5 min-w-0">
                <span className="text-[10px] font-extrabold text-gray-900 uppercase tracking-widest block mb-3">Live validation diagnostics</span>

                {/* KPI status tags */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase block">Valid Commits</span>
                    <span className="text-lg font-bold text-emerald-800 font-mono block mt-0.5">{bulkParsedResult.filter(p => p.isValid).length}</span>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center">
                    <span className="text-[9px] font-bold text-rose-500 uppercase block">Errors flagged</span>
                    <span className="text-lg font-bold text-rose-700 font-mono block mt-0.5">{bulkParsedResult.filter(p => !p.isValid).length}</span>
                  </div>
                </div>

                {/* Parsed list scroll */}
                <div className="flex-1 border rounded-2xl overflow-hidden bg-gray-50/50 flex flex-col max-h-[220px]">
                  <div className="bg-gray-100 px-3 py-1.5 border-b text-[9px] text-gray-500 font-bold uppercase tracking-wider flex justify-between">
                    <span>Parsed Styles Registry</span>
                    <span>Status</span>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100 text-[11px]">
                    {bulkParsedResult.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 italic">Paste raw spreadsheet code into box.</div>
                    ) : (
                      bulkParsedResult.map((p, idx) => (
                        <div key={idx} className="p-3 bg-white flex justify-between gap-3 items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-gray-900 truncate">{p.name || <span className="italic text-gray-400">Missing title</span>}</span>
                              <span className="text-[9px] font-mono bg-gray-100 text-gray-500 px-1 rounded uppercase">{p.sku || 'N/A'}</span>
                            </div>
                            {p.errors && p.errors.length > 0 && (
                              <span className="text-[9px] text-rose-600 block mt-0.5">{p.errors.join(', ')}</span>
                            )}
                          </div>
                          {p.isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-5 border-t border-gray-150 bg-gray-50 flex justify-between items-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                {bulkParsedResult.filter(p => p.isValid).length} items verified and ready to commit
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setBulkInputText('');
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-bold uppercase hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitBulkUpload}
                  disabled={bulkParsedResult.filter(p => p.isValid).length === 0}
                  className="px-4 py-2 bg-gray-950 hover:bg-black text-white text-xs font-bold uppercase rounded-xl disabled:opacity-50"
                >
                  Commit parsed Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
          DETAILED ORDER FULFILLMENT VIEWER (SLIDING DRAWER)
          ======================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-end animate-fadeIn">
          {/* Backdrop */}
          <div onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" />

          {/* Drawer content */}
          <div className="w-full max-w-2xl h-full bg-white relative z-10 shadow-2xl flex flex-col justify-between overflow-hidden animate-slideLeft">

            {/* Header */}
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <div>
                <strong className="text-sm font-bold text-gray-900 tracking-wider block font-mono">DISPATCH LEDGER: {selectedOrder.order_number}</strong>
                <span className="text-[10px] text-gray-400 block font-medium">Recorded date: {new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-black p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Calculations meta tags */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border rounded-2xl text-xs font-semibold text-gray-600">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Audited Total</span>
                  <span className="text-gray-950 font-bold block mt-0.5 text-sm font-mono">₹{(selectedOrder.total_amount / 100).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Acquisition Source</span>
                  <span className="text-[#C9A96E] uppercase font-bold block mt-0.5 font-mono">{selectedOrder.source}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Gateway Status</span>
                  <span className="text-emerald-700 uppercase font-bold block mt-0.5">{selectedOrder.payment_status}</span>
                </div>
              </div>

              {/* Customer profiles & address tags */}
              <div className="p-5 border border-gray-150 rounded-2xl space-y-3">
                <strong className="text-[10px] font-extrabold text-gray-950 uppercase tracking-widest block border-b pb-1">Customer Logistics details</strong>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-600">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Contact Name</span>
                    <span className="text-gray-950 font-bold text-sm block">{selectedOrder.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Direct Contact Logs</span>
                    <span className="block font-mono">Phone: {selectedOrder.customer_phone}</span>
                    <span className="block font-mono">Email: {selectedOrder.customer_email || 'N/A'}</span>
                  </div>

                  {selectedOrder.address_line1 ? (
                    <div className="sm:col-span-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Recipient Address</span>
                      <p className="text-gray-900 font-medium mt-0.5">
                        {selectedOrder.address_line1}<br />
                        {selectedOrder.address_line2 ? `${selectedOrder.address_line2}, ` : ''}
                        {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}
                      </p>
                    </div>
                  ) : (
                    <div className="sm:col-span-2 text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                      In-Store Retail Sale. Handed over directly at flag store cash register.
                    </div>
                  )}
                </div>
              </div>

              {/* Ordered items details */}
              <div className="space-y-3">
                <strong className="text-[10px] font-extrabold text-gray-950 uppercase tracking-widest block">Ordered Design Style Items</strong>
                <div className="border border-gray-150 rounded-2xl divide-y overflow-hidden">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="p-4 bg-white flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <HeicImage src={item.image} alt={item.product_name} className="w-12 h-12 object-cover rounded-xl border" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                        )}
                        <div>
                          <strong className="text-gray-950 font-bold block">{item.product_name}</strong>
                          <span className="text-[10px] text-gray-400 block font-mono">Size Code: {item.size} &middot; Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-extrabold text-gray-950 font-mono">₹{((item.price * item.quantity) / 100).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipment tracker form */}
              {selectedOrder.source !== 'pos' && (
                <div className="p-5 bg-gray-50 border border-gray-150 rounded-3xl space-y-3">
                  <strong className="text-[10px] font-extrabold text-gray-900 uppercase tracking-widest block">Courier Timeline Tracking</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Courier Carrier</label>
                      <input
                        type="text"
                        placeholder="e.g. Delhivery"
                        value={courierName}
                        onChange={e => setCourierName(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-xs bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tracking Number</label>
                      <input
                        type="text"
                        placeholder="e.g. DEL90123"
                        value={trackingNumber}
                        onChange={e => setTrackingNumber(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tracking Link URL</label>
                      <input
                        type="text"
                        placeholder="https://delhivery.com/..."
                        value={trackingUrl}
                        onChange={e => setTrackingUrl(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <input
                      type="checkbox"
                      id="triggerSmsDispatch"
                      checked={triggerSms}
                      onChange={e => setTriggerSms(e.target.checked)}
                      className="rounded text-[#C9A96E] focus:ring-[#C9A96E] h-4 w-4 border-gray-300"
                    />
                    <label htmlFor="triggerSmsDispatch" className="text-[10px] font-bold text-gray-500 uppercase select-none cursor-pointer">
                      Send automated transactional SMS to customer immediately
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions & Dispatch updates */}
            <div className="p-6 border-t border-gray-150 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Change Fulfillment State:</span>
                <select
                  value={selectedOrder.order_status}
                  onChange={e => {
                    const nextStatus = e.target.value as any;
                    (async () => {
                      try {
                        const res = await fetch(`/api/admin/orders/${selectedOrder.id}/status`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
                          },
                          body: JSON.stringify({
                            status: nextStatus,
                            tracking_number: trackingNumber || undefined,
                            tracking_url: trackingUrl || undefined,
                            courier_name: courierName || undefined,
                            send_sms: triggerSms
                          })
                        });
                        const resData = await res.json();
                        if (resData.success) {
                          showToast('success', 'Fulfillment Updated', `Fulfillment status changed to "${nextStatus.toUpperCase()}".`);
                          fetchOrders();
                          setSelectedOrder(null);
                        } else {
                          showToast('error', 'Fulfillment Error', resData.error || 'Failed to update order status');
                        }
                      } catch (err) {
                        console.error('Fulfillment update error:', err);
                        showToast('error', 'Network Error', 'Failed to update order status');
                      }
                    })();
                  }}
                  className="border rounded-xl px-3 py-1.5 text-xs font-extrabold bg-white text-gray-800 focus:outline-none"
                >
                  {(() => {
                    const allowedTransitions = {
                      'placed': ['placed', 'confirmed', 'cancelled'],
                      'confirmed': ['confirmed', 'shipped', 'cancelled'],
                      'shipped': ['shipped', 'delivered', 'cancelled'],
                      'delivered': ['delivered'],
                      'cancelled': ['cancelled']
                    };
                    const allowed = allowedTransitions[selectedOrder.order_status] || [selectedOrder.order_status];
                    return (
                      <>
                        <option value="placed" disabled={!allowed.includes('placed')}>Placed</option>
                        <option value="confirmed" disabled={!allowed.includes('confirmed')}>Confirmed</option>
                        <option value="shipped" disabled={!allowed.includes('shipped')}>Shipped</option>
                        <option value="delivered" disabled={!allowed.includes('delivered')}>Delivered</option>
                        <option value="cancelled" disabled={!allowed.includes('cancelled')}>Cancelled</option>
                      </>
                    );
                  })()}
                </select>
              </div>

              {/* Printable Invoice receipt helper */}
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    const itemsHtml = selectedOrder.items.map(item => `
                      <tr>
                        <td style="padding:12px; border-bottom:1px solid #f3f4f6; font-size:12px; font-weight:600;">${item.product_name} (Size: ${item.size})</td>
                        <td style="padding:12px; border-bottom:1px solid #f3f4f6; text-align:center; font-size:12px;">${item.quantity}</td>
                        <td style="padding:12px; border-bottom:1px solid #f3f4f6; text-align:right; font-size:12px; font-weight:700;">₹${((item.price * item.quantity) / 100).toLocaleString('en-IN')}</td>
                      </tr>
                    `).join('');

                    const frame = window.open('', '_blank');
                    if (frame) {
                      frame.document.write(`
                        <html>
                        <head>
                          <title>Invoice #${selectedOrder.order_number}</title>
                          <style>
                            body { font-family: 'DM Sans', sans-serif; color: #111827; padding: 40px; margin: 0; line-height: 1.5; }
                            .header { border-bottom: 2px solid #C9A96E; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                            .logo { font-size: 24px; font-family: serif; font-style: italic; color: #111; letter-spacing: 1px; }
                            .meta { text-align: right; font-size: 12px; color: #4b5563; }
                            .title { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #6b7280; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 30px; margin-bottom: 12px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                            th { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #4b5563; background: #f9fafb; padding: 10px; border-bottom: 1px solid #e5e7eb; }
                            .totals { float: right; width: 300px; margin-top: 30px; font-size: 13px; }
                            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
                            .grand { font-size: 16px; font-weight: bold; border-top: 2px solid #C9A96E; padding-top: 10px; color: #C9A96E; }
                            .footer { margin-top: 150px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div>
                              <div class="logo">HeelsUp Jodhpur</div>
                              <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Premium Rajasthani Hand-Zari Footwear</div>
                            </div>
                            <div class="meta">
                              <h2 style="margin: 0; color: #111827; font-weight: 300;">TAX INVOICE</h2>
                              <div style="margin-top: 4px;">Order: <strong>${selectedOrder.order_number}</strong></div>
                              <div>Date: ${new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</div>
                            </div>
                          </div>

                          <div class="title">Billed & Shipped To</div>
                          <div style="font-size: 13px;">
                            <strong>${selectedOrder.customer_name}</strong><br/>
                            Phone: ${selectedOrder.customer_phone}<br/>
                            ${selectedOrder.address_line1 ? `
                              Address: ${selectedOrder.address_line1}, ${selectedOrder.address_line2 || ''}<br/>
                              ${selectedOrder.city}, ${selectedOrder.state} - ${selectedOrder.pincode}
                            ` : 'POS Store Counter Acquisition'}
                          </div>

                          <div class="title">Invoice Line Items</div>
                          <table>
                            <thead>
                              <tr>
                                <th style="text-align: left;">Style description</th>
                                <th style="width: 80px;">Qty</th>
                                <th style="text-align: right; width: 120px;">Total Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${itemsHtml}
                            </tbody>
                          </table>

                          <div style="width: 100%; display: flex; justify-content: flex-end;">
                            <div class="totals">
                              <div class="totals-row">
                                <span>Subtotal</span>
                                <span>₹${(selectedOrder.subtotal_amount / 100).toLocaleString('en-IN')}</span>
                              </div>
                              ${selectedOrder.discount_amount > 0 ? `
                                <div class="totals-row" style="color:#ef4444;">
                                  <span>Deductions Discount</span>
                                  <span>-₹${(selectedOrder.discount_amount / 100).toLocaleString('en-IN')}</span>
                                </div>
                              ` : ''}
                              <div class="totals-row grand">
                                <span>Amount Paid</span>
                                <span>₹${(selectedOrder.total_amount / 100).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          <div class="footer">
                            Thank you for shopping at HeelsUp. For logistics or replacement support, contact boutique help desk at sales@heelsup.in or Call +91 7891470935.
                          </div>

                          <script>
                            window.onload = function() { window.print(); }
                          </script>
                        </body>
                        </html>
                      `);
                      frame.document.close();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[#C9A96E] text-gray-95 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-[#b17e3f] transition-all"
                >
                  Print physical Receipt
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-[10px] uppercase tracking-wider font-bold rounded-xl"
                >
                  Close Drawer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =======================================
          DETAILED CUSTOMER PROFILE DRAWER
          ======================================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-end animate-fadeIn">
          <div onClick={() => setSelectedCustomer(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" />

          <div className="w-full max-w-md h-full bg-white relative z-10 shadow-2xl flex flex-col justify-between overflow-hidden animate-slideLeft">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <strong className="text-sm font-bold text-gray-900 block font-mono">LOYALTY PROFILE CARD</strong>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-[#faf6ee] text-[#C9A96E] font-serif italic text-2xl flex items-center justify-center mx-auto border border-[#ead2ae] shadow-inner">
                  {selectedCustomer.name[0]}
                </div>
                <h4 className="text-base font-bold text-gray-950">{selectedCustomer.name}</h4>
                <span className="inline-block bg-amber-100 text-amber-800 font-extrabold px-3 py-1 rounded-full text-[9px] uppercase tracking-widest">
                  {selectedCustomer.tag} Status member
                </span>
              </div>

              <div className="border border-gray-150 rounded-2xl p-4 bg-gray-50/50 space-y-2 font-semibold">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mobile Contact:</span>
                  <span className="text-gray-900 font-mono">{selectedCustomer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Work Email:</span>
                  <span className="text-gray-900 font-mono">{selectedCustomer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Member Since:</span>
                  <span className="text-gray-900 font-mono">{selectedCustomer.registered_at}</span>
                </div>
              </div>

              <div className="border border-gray-150 rounded-2xl p-4 bg-gray-50/50 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Acquisition LTV Ledger</span>
                <div className="flex justify-between text-sm font-bold">
                  <span>Total Purchases Count:</span>
                  <span className="text-gray-900 font-mono">{selectedCustomer.orders_count} orders</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Total Life spent value:</span>
                  <span className="text-[#C9A96E] font-mono">₹{(selectedCustomer.total_spent / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Display list of recent order items associated with customer phone */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Recent Order Invoices</span>
                <div className="space-y-2">
                  {orders.filter(o => o.customer_phone === selectedCustomer.phone).map(o => (
                    <div key={o.id} className="p-3 border rounded-xl flex justify-between items-center bg-white hover:border-gray-400">
                      <div>
                        <strong className="text-gray-900 block font-mono">{o.order_number}</strong>
                        <span className="text-[9px] text-gray-400">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className="font-bold text-gray-950 font-mono text-[11px]">₹{(o.total_amount / 100).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t text-right">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-6 py-2.5 bg-gray-950 text-white text-xs font-bold uppercase rounded-xl"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Navigation Overlay */}
      {sidebarMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div onClick={() => setSidebarMobileOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="w-64 bg-gray-950 text-white flex flex-col justify-between p-5 relative z-10 shadow-2xl h-full border-r border-gray-900 animate-slideRight">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-serif italic text-white">Heels<span className="text-[#C9A96E]">Up</span></h1>
                <button onClick={() => setSidebarMobileOpen(false)} className="p-1 rounded bg-gray-900 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter boutique modules..."
                  value={sidebarQuery}
                  onChange={e => setSidebarQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-transparent rounded-xl py-1.5 pl-9 pr-3 text-xs text-white"
                />
              </div>

              <nav className="space-y-4 max-h-[60vh] overflow-y-auto">
                {allowedNavs.map(nav => (
                  <button
                    key={nav.id}
                    onClick={() => {
                      setActiveTab(nav.id);
                      setSidebarMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl font-medium transition-all ${activeTab === nav.id ? 'bg-[#C9A96E] text-gray-950 font-bold' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                      }`}
                  >
                    {nav.icon}
                    <span>{nav.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-3 border-t border-gray-900">
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-gray-900 hover:bg-rose-950 text-gray-400 hover:text-rose-200 transition-colors rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Workspace</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}