import React, { useState, useEffect, useMemo } from 'react';
import HeicImage from '../components/HeicImage';
import {
  LayoutDashboard, ShoppingCart, Package, ListChecks, LogOut, Plus, Edit3, Settings, Tag, Star, Users,
  FileText, Image as ImageIcon, UploadCloud, AlertTriangle, CheckCircle2, X, ChevronRight, ChevronLeft,
  Search, RotateCw, Trash2, Lock, PlusCircle, Percent, Activity, Sliders, RefreshCw, BarChart2
} from 'lucide-react';

// Import Modular Administrative Subcomponents
import PosTerminal from './admin/PosTerminal';
import DbConsole from './admin/DbConsole';
import EnterpriseReports from './admin/EnterpriseReports';
import AuditLogs from './admin/AuditLogs';
import ReviewsModeration from './admin/ReviewsModeration';
import ReturnsManager from './admin/ReturnsManager';

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

interface PageConfig {
  id: number;
  title: string;
  slug: string;
  content: string;
  active: boolean;
}

interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  is_blocked: boolean;
  staff_permissions?: string;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders_count: number;
  total_spent: number;
  registered_at: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// ── GLOBAL FETCH INTERCEPTOR SETUP ──────────────────────────────────────────
if (typeof window !== 'undefined' && !(window as any).__fetch_intercepted) {
  (window as any).__fetch_intercepted = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    
    // Auto-inject authorization token if target is our API and token exists
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
    
    // Check for authorization expired or forbidden status codes
    if (url.startsWith('/api/') && (response.status === 401 || response.status === 403) && !url.includes('/api/auth/login')) {
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
  const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(() => {
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

  // Global Toasts State
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Listen for global unauthorized events (session expiry)
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      showToast('error', 'Session Expired', 'Your admin session has expired. Please log in again.');
    };
    window.addEventListener('heelsup_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('heelsup_unauthorized', handleUnauthorized);
  }, []);

  // Sidebar Controls
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarQuery, setSidebarQuery] = useState('');

  // Core Datasets
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [collectionsList, setCollectionsList] = useState<Collection[]>([]);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [bannersList, setBannersList] = useState<Banner[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [pagesList, setPagesList] = useState<PageConfig[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Filters & Search states
  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Drawers and Selection states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [courierNameForm, setCourierNameForm] = useState('');
  const [trackingNumberForm, setTrackingNumberForm] = useState('');
  const [trackingUrlForm, setTrackingUrlForm] = useState('');
  const [orderStatusForm, setOrderStatusForm] = useState<string>('');
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isAddingCollection, setIsAddingCollection] = useState(false);

  // Product Form states
  const [prodFormName, setProdFormName] = useState('');
  const [prodFormSku, setProdFormSku] = useState('');
  const [prodFormCategory, setProdFormCategory] = useState('');
  const [prodFormPrice, setProdFormPrice] = useState<number>(0);
  const [prodFormMrp, setProdFormMrp] = useState<number>(0);
  const [prodFormStock, setProdFormStock] = useState<number>(0);
  const [prodFormSizes, setProdFormSizes] = useState<string[]>(['36', '37', '38', '39', '40', '41']);
  const [prodFormImages, setProdFormImages] = useState<string[]>([]);
  const [prodFormActive, setProdFormActive] = useState(true);
  const [prodFormFeatured, setProdFormFeatured] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category/Collection Form states
  const [catFormName, setCatFormName] = useState('');
  const [catFormSlug, setCatFormSlug] = useState('');
  const [catFormDescription, setCatFormDescription] = useState('');
  const [catFormImageUrl, setCatFormImageUrl] = useState('');
  const [catFormSort, setCatFormSort] = useState(1);
  const [catFormActive, setCatFormActive] = useState(true);

  const [colFormName, setColFormName] = useState('');
  const [colFormDescription, setColFormDescription] = useState('');
  const [colFormImageUrl, setColFormImageUrl] = useState('');
  const [colFormActive, setColFormActive] = useState(true);

  // Banners & Coupons Form states
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'fixed' | 'percentage'>('fixed');
  const [couponVal, setCouponVal] = useState<number>(0);
  const [couponMin, setCouponMin] = useState<number>(0);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSub, setBannerSub] = useState('');
  const [bannerImg, setBannerImg] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  // Page & Staff Form states
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'manager' | 'staff'>('staff');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPermsList, setStaffPermsList] = useState<string[]>([]);

  // Blogs Management States
  const [blogsList, setBlogsList] = useState<any[]>([]);
  const [isAddingBlog, setIsAddingBlog] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [blogFormTitle, setBlogFormTitle] = useState('');
  const [blogFormSlug, setBlogFormSlug] = useState('');
  const [blogFormAuthor, setBlogFormAuthor] = useState('');
  const [blogFormContent, setBlogFormContent] = useState('');
  const [blogFormImageUrl, setBlogFormImageUrl] = useState('');
  const [blogFormTags, setBlogFormTags] = useState('');
  const [blogFormActive, setBlogFormActive] = useState(true);

  // Returns & Exchanges States
  const [returnsList, setReturnsList] = useState<any[]>([]);

  // Audit Logs States
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);

  // Settings Forms & Sessions States
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [testingRzp, setTestingRzp] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  const dbTablesList = [
    { id: 'products', label: 'products' },
    { id: 'product_images', label: 'product_images' },
    { id: 'product_size_stock', label: 'product_size_stock' },
    { id: 'categories', label: 'categories' },
    { id: 'collections', label: 'collections' },
    { id: 'orders', label: 'orders' },
    { id: 'order_items', label: 'order_items' },
    { id: 'users', label: 'users' },
    { id: 'coupons', label: 'coupons' },
    { id: 'banners', label: 'banners' },
    { id: 'pages', label: 'pages' },
    { id: 'product_reviews', label: 'product_reviews' },
    { id: 'settings', label: 'settings' },
    { id: 'carts', label: 'carts' },
    { id: 'announcements', label: 'announcements' }
  ];

  // Collapsible navigational links
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', section: 'Main', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pos', label: 'POS Terminal', section: 'Main', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'reports', label: 'Enterprise Reports', section: 'Main', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'products', label: 'Styles Directory', section: 'Catalogue', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', section: 'Catalogue', icon: <Tag className="w-4 h-4" /> },
    { id: 'collections', label: 'Collections', section: 'Catalogue', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'blogs', label: 'Blog Articles', section: 'Catalogue', icon: <FileText className="w-4 h-4" /> },
    { id: 'orders', label: 'Online Orders', section: 'Sales', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'returns', label: 'Exchanges & Returns', section: 'Sales', icon: <RotateCw className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers Log', section: 'Sales', icon: <Users className="w-4 h-4" /> },
    { id: 'coupons', label: 'Promos & Coupons', section: 'Sales', icon: <Percent className="w-4 h-4" /> },
    { id: 'banners', label: 'Banners Slideshow', section: 'Content', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'reviews', label: 'Reviews Moderation', section: 'Content', icon: <Star className="w-4 h-4" /> },
    { id: 'pages', label: 'Static Policy Pages', section: 'Content', icon: <FileText className="w-4 h-4" /> },
    { id: 'staff', label: 'Staff Accounts', section: 'System', icon: <Lock className="w-4 h-4" /> },
    { id: 'settings', label: 'General Configuration', section: 'System', icon: <Settings className="w-4 h-4" /> },
    { id: 'db_editor', label: 'Database Tables', section: 'System', icon: <Sliders className="w-4 h-4" /> },
    { id: 'audit_logs', label: 'Audit Log Registry', section: 'System', icon: <Activity className="w-4 h-4" /> }
  ];

  const filteredNavs = useMemo(() => {
    if (!sidebarQuery.trim()) return navigationItems;
    const q = sidebarQuery.toLowerCase();
    return navigationItems.filter(n => n.label.toLowerCase().includes(q));
  }, [sidebarQuery]);

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (data.success && data.data) {
        setDashboardStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?limit=100&all=true');
      const data = await res.json();
      if (data.success && data.data) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders?limit=100');
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers?limit=100');
      const data = await res.json();
      if (data.success && data.data) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  // Fetch auxiliary data sets
  const fetchAuxiliaryData = async () => {
    const fetchSec = async (endpoint: string, setter: Function) => {
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.success && data.data) {
          if (endpoint.includes('/settings')) {
            const arr = Object.entries(data.data).map(([key, val]) => ({
              key,
              value: typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)
            }));
            setter(arr);
          } else {
            setter(data.data);
          }
        }
      } catch (err) {
        console.error(`Error loading ${endpoint}:`, err);
      }
    };

    fetchSec('/api/admin/categories', setCategoriesList);
    fetchSec('/api/admin/collections', setCollectionsList);
    fetchSec('/api/admin/coupons', setCouponsList);
    fetchSec('/api/admin/banners', setBannersList);
    fetchSec('/api/admin/reviews', setReviewsList);
    fetchSec('/api/admin/pages', setPagesList);
    fetchSec('/api/admin/staff', setStaffList);
    fetchSec('/api/admin/settings', setSettingsList);
    fetchSec('/api/admin/blogs', setBlogsList);
    fetchSec('/api/admin/returns', setReturnsList);
  };

  const fetchAuditLogs = async () => {
    setAuditLogLoading(true);
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: "SELECT l.*, u.email as admin_email FROM admin_audit_logs l LEFT JOIN users u ON l.admin_id = u.id ORDER BY l.id DESC LIMIT 150"
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAuditLogsList(data.data.results || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLogLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: "SELECT s.*, u.email FROM sessions s JOIN users u ON s.user_id = u.id ORDER BY s.id DESC LIMIT 50"
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveSessions(data.data.results || []);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    }
  };

  // Run on Login/Mount
  useEffect(() => {
    if (user) {
      fetchDashboardStats();
      fetchProducts();
      fetchOrders();
      fetchCustomers();
      fetchAuxiliaryData();
      fetchAuditLogs();
      fetchActiveSessions();
    }
  }, [user]);

  // Auth Handlers
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
          if (data.data.warning) {
            showToast('warning', 'OTP Status Bypass', data.data.warning);
          } else {
            showToast('info', '2FA OTP Required', 'A verification code has been dispatched. Please check your email.');
          }
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
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.warning) {
          showToast('warning', 'OTP Failover Bypass', data.data.warning);
        } else {
          showToast('success', 'Recovery Sent', 'A password recovery OTP has been sent.');
        }
        setResetStep('reset_otp');
      } else {
        showToast('error', 'Request Denied', data.error || 'Account search yielded no active records.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not reach the password recovery service.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode || !resetNewPassword || !resetConfirmPassword) {
      showToast('error', 'All Fields Required', 'Please fill in all requested fields.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      showToast('error', 'Password Mismatch', 'New password and confirm password do not match.');
      return;
    }
    if (resetNewPassword.length < 8) {
      showToast('error', 'Insecure Password', 'Password must be at least 8 characters long.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtpCode,
          password: resetNewPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Password Updated', 'Your credentials have been securely reset. Please log in.');
        setResetStep('login');
        setPasswordInput(resetNewPassword);
        setEmailInput(resetEmail);
        setResetEmail('');
        setResetOtpCode('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      } else {
        showToast('error', 'Reset Failed', data.error || 'Invalid recovery code.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not reach the password reset server.');
    } finally {
      setResettingPassword(false);
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
    showToast('info', 'Logged Out', 'Your administration console session has expired.');
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetListSetter: Function, currentList: string[]) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        targetListSetter([...currentList, data.url]);
        showToast('success', 'Image Uploaded', 'Media assets stored successfully.');
      } else {
        showToast('error', 'Upload Failed', data.error || 'Unable to upload image file.');
      }
    } catch (err) {
      showToast('error', 'Upload Error', 'Connection failure during asset upload.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Product CRUD
  const openProductDrawer = (p: Product | null) => {
    if (p) {
      setEditingProduct(p);
      setProdFormName(p.name);
      setProdFormSku(p.sku);
      setProdFormCategory(p.category);
      setProdFormPrice(p.price / 100);
      setProdFormMrp(p.original_price ? p.original_price / 100 : 0);
      setProdFormStock(p.stock);
      setProdFormSizes(p.sizes || ['36', '37', '38', '39', '40', '41']);
      setProdFormImages(p.images || []);
      setProdFormActive(p.active);
      setProdFormFeatured(p.featured);
      setIsAddingProduct(false);
    } else {
      setEditingProduct(null);
      setProdFormName('');
      setProdFormSku('');
      setProdFormCategory(categoriesList[0]?.name || 'Heels');
      setProdFormPrice(0);
      setProdFormMrp(0);
      setProdFormStock(5);
      setProdFormSizes(['36', '37', '38', '39', '40', '41']);
      setProdFormImages([]);
      setProdFormActive(true);
      setProdFormFeatured(false);
      setIsAddingProduct(true);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodFormName || !prodFormSku || !prodFormCategory || prodFormPrice <= 0) {
      showToast('error', 'Fields Required', 'Product title, sku, category and selling price are required.');
      return;
    }

    const payload = {
      name: prodFormName,
      sku: prodFormSku,
      category: prodFormCategory,
      price: Math.round(prodFormPrice * 100),
      original_price: prodFormMrp > 0 ? Math.round(prodFormMrp * 100) : null,
      stock: prodFormStock,
      sizes: prodFormSizes,
      images: prodFormImages,
      active: prodFormActive,
      featured: prodFormFeatured
    };

    const isEdit = !!editingProduct;
    const url = isEdit ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Product Saved', `Style '${prodFormName}' successfully updated.`);
        setEditingProduct(null);
        setIsAddingProduct(false);
        fetchProducts();
      } else {
        showToast('error', 'Save Failed', data.error || 'Server rejected product validation rules.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not write to product directory.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Delete style from catalog? This will affect stock listings.')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Product Deleted', 'Item removed from administration catalogue.');
        fetchProducts();
      } else {
        showToast('error', 'Delete Failed', data.error || 'Item locked in active orders.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Unable to reach backend.');
    }
  };

  // Order Details & status updates
  const openOrderDrawer = (order: Order) => {
    setSelectedOrder(order);
    setCourierNameForm(order.courier_name || '');
    setTrackingNumberForm(order.tracking_number || '');
    setTrackingUrlForm(order.tracking_url || '');
    setOrderStatusForm(order.order_status);
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: orderStatusForm,
          courier_name: courierNameForm.trim(),
          tracking_number: trackingNumberForm.trim(),
          tracking_url: trackingUrlForm.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Order Updated', `Order status set to '${orderStatusForm}'.`);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        showToast('error', 'Update Failed', data.error || 'Allowed status transitions rejected by server.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not record order status.');
    }
  };

  // Categories CRUD
  const openCategoryDrawer = (c: Category | null) => {
    if (c) {
      setEditingCategory(c);
      setCatFormName(c.name);
      setCatFormSlug(c.slug);
      setCatFormDescription(c.description || '');
      setCatFormImageUrl(c.image_url || '');
      setCatFormSort(c.sort_order);
      setCatFormActive(c.active);
      setIsAddingCategory(false);
    } else {
      setEditingCategory(null);
      setCatFormName('');
      setCatFormSlug('');
      setCatFormDescription('');
      setCatFormImageUrl('');
      setCatFormSort(1);
      setCatFormActive(true);
      setIsAddingCategory(true);
    }
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName || !catFormSlug) {
      showToast('error', 'Fields Required', 'Category name and slug are required.');
      return;
    }
    const payload = {
      name: catFormName,
      slug: catFormSlug.toLowerCase().trim().replace(/\s+/g, '-'),
      description: catFormDescription,
      image_url: catFormImageUrl,
      sort_order: catFormSort,
      active: catFormActive
    };

    const isEdit = !!editingCategory;
    const url = isEdit ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category Saved', `Category '${catFormName}' registered.`);
        setEditingCategory(null);
        setIsAddingCategory(false);
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Save Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not write category records.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete category? Styles will lack mapping.')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category Deleted', 'Category removed.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Action Denied', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not contact categories API.');
    }
  };

  // Collections CRUD
  const openCollectionDrawer = (c: Collection | null) => {
    if (c) {
      setEditingCollection(c);
      setColFormName(c.name);
      setColFormDescription(c.description || '');
      setColFormImageUrl(c.image_url || '');
      setColFormActive(c.active);
      setIsAddingCollection(false);
    } else {
      setEditingCollection(null);
      setColFormName('');
      setColFormDescription('');
      setColFormImageUrl('');
      setColFormActive(true);
      setIsAddingCollection(true);
    }
  };

  const handleSaveCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colFormName) {
      showToast('error', 'Name Required', 'Collection name is required.');
      return;
    }
    const payload = {
      name: colFormName,
      type: 'manual',
      description: colFormDescription,
      image_url: colFormImageUrl,
      active: colFormActive
    };

    const isEdit = !!editingCollection;
    const url = isEdit ? `/api/admin/collections/${editingCollection.id}` : '/api/admin/collections';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Collection Saved', `Collection '${colFormName}' saved.`);
        setEditingCollection(null);
        setIsAddingCollection(false);
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Save Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not record collection.');
    }
  };

  const handleDeleteCollection = async (id: number) => {
    if (!window.confirm('Delete this collection?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Collection Removed', 'Collection purged.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Delete Denied', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not delete collection.');
    }
  };

  // Coupons CRUD
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || couponVal <= 0) {
      showToast('error', 'Fields Required', 'Coupon code and value are required.');
      return;
    }
    const payload = {
      code: couponCode.toUpperCase().trim(),
      discount_type: couponType,
      discount_value: couponVal,
      min_purchase: couponMin,
      active: true
    };
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Coupon Created', `Promo '${couponCode}' successfully saved.`);
        setCouponCode('');
        setCouponVal(0);
        setCouponMin(0);
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Save Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to save coupon.');
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('Purge this coupon code?')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Promo Deleted', 'Coupon code removed.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Purge Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to reach coupons API.');
    }
  };

  // Banners CRUD
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImg) {
      showToast('error', 'Image Required', 'Please upload a desktop slideshow banner asset.');
      return;
    }
    const payload = {
      title: bannerTitle,
      subtitle: bannerSub,
      image_url: bannerImg,
      link: bannerLink,
      active: true
    };
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Saved', 'Slideshow frame updated.');
        setBannerTitle('');
        setBannerSub('');
        setBannerImg('');
        setBannerLink('');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Save Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to save banner.');
    }
  };

  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('Remove slide from landing page slideshow?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Purged', 'Slide removed.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Purge Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to delete banner.');
    }
  };

  // Static Pages CRUD
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle || !pageSlug || !pageContent) {
      showToast('error', 'Fields Required', 'Title, slug path, and body content are required.');
      return;
    }
    const payload = {
      title: pageTitle,
      slug: pageSlug.toLowerCase().trim().replace(/\s+/g, '-'),
      content: pageContent,
      active: true
    };
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Page Published', `Policy Page '${pageTitle}' published.`);
        setPageTitle('');
        setPageSlug('');
        setPageContent('');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Publish Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to write policy page.');
    }
  };

  const handleDeletePage = async (id: number) => {
    if (!window.confirm('Delete this policy page from public site footer?')) return;
    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Page Purged', 'Static page removed.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Purge Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to delete page.');
    }
  };

  // Staff accounts & permissions CRUD
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFirstName || !staffEmail || !staffPassword) {
      showToast('error', 'Fields Required', 'First name, email and password credentials required.');
      return;
    }
    const payload = {
      firstName: staffFirstName,
      lastName: staffLastName,
      email: staffEmail.toLowerCase().trim(),
      password: staffPassword,
      role: staffRole,
      permissions: JSON.stringify(staffPermsList)
    };
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Staff Registered', `Console access granted to ${staffFirstName}.`);
        setStaffFirstName('');
        setStaffLastName('');
        setStaffEmail('');
        setStaffPassword('');
        setStaffPermsList([]);
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Registration Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to create staff account.');
    }
  };

  const handleToggleBlockStaff = async (staffMember: Staff) => {
    const nextBlockState = !staffMember.is_blocked;
    const confirmMsg = nextBlockState 
      ? `Revoke login permissions for staff ${staffMember.first_name}?`
      : `Restore login access for staff ${staffMember.first_name}?`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/staff/${staffMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: nextBlockState })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Status Changed', 'Console lock permissions toggled.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Operation Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not update staff status.');
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm('Permanently delete staff account from user database?')) return;
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Staff Removed', 'Account deleted.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Delete Denied', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not delete staff.');
    }
  };

  // Blogs CRUD
  const openBlogDrawer = (blog: any | null) => {
    if (blog) {
      setEditingBlog(blog);
      setBlogFormTitle(blog.title);
      setBlogFormSlug(blog.slug);
      setBlogFormAuthor(blog.author || '');
      setBlogFormContent(blog.content || '');
      setBlogFormImageUrl(blog.image_url || '');
      setBlogFormTags(blog.tags || '');
      setBlogFormActive(!!blog.active);
      setIsAddingBlog(false);
    } else {
      setEditingBlog(null);
      setBlogFormTitle('');
      setBlogFormSlug('');
      setBlogFormAuthor(user?.name || 'Admin');
      setBlogFormContent('');
      setBlogFormImageUrl('');
      setBlogFormTags('');
      setBlogFormActive(true);
      setIsAddingBlog(true);
    }
  };

  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogFormTitle || !blogFormSlug || !blogFormContent) {
      showToast('error', 'Fields Required', 'Title, slug and article content are required.');
      return;
    }
    const payload = {
      title: blogFormTitle,
      slug: blogFormSlug.toLowerCase().trim().replace(/\s+/g, '-'),
      author: blogFormAuthor,
      content: blogFormContent,
      image_url: blogFormImageUrl,
      tags: blogFormTags,
      active: blogFormActive
    };

    const isEdit = !!editingBlog;
    const url = isEdit ? `/api/admin/blogs/${editingBlog.id}` : '/api/admin/blogs';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Article Saved', 'Blog article details updated.');
        setEditingBlog(null);
        setIsAddingBlog(false);
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Failed to Save', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not publish blog article.');
    }
  };

  const handleDeleteBlog = async (id: number) => {
    if (!window.confirm('Delete blog article permanently?')) return;
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Article Purged', 'Blog listing deleted.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Purge Failed', data.error);
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not communicate with blogs API.');
    }
  };

  // Settings Save translation (flat values to payload)
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    // Transform setting array back into flat key-value payload object
    const payload = settingsList.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as { [key: string]: string });

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Settings Saved', 'System configurations updated on worker server.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Save Failed', data.error || 'Server rejected settings updates.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not save configurations.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestRazorpay = async () => {
    setTestingRzp(true);
    try {
      const res = await fetch('/api/admin/settings/test/razorpay');
      const data = await res.json();
      if (data.success) {
        showToast('success', 'API Active', `Razorpay verification completed: Mode is ${data.mode}. Merchant accounts live.`);
      } else {
        showToast('error', 'Connection Failed', data.error || 'Invalid credentials or keys rejected.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Failed to communicate with test route.');
    } finally {
      setTestingRzp(false);
    }
  };

  // Session Terminate
  const handleRevokeSession = async (sessId: number) => {
    if (!window.confirm('Revoke this staff session token? They will be logged out on next action.')) return;
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'UPDATE sessions SET revoked = 1 WHERE id = ?;',
          params: [sessId]
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Session Revoked', 'Session state set to expired.');
        fetchActiveSessions();
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not revoke session.');
    }
  };

  // Toggle staff permissions checklist
  const handleTogglePerm = (perm: string) => {
    setStaffPermsList(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  // UI calculations
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.toLowerCase().includes(prodSearch.toLowerCase());
      const matchCat = prodCatFilter ? p.category === prodCatFilter : true;
      return matchSearch && matchCat;
    });
  }, [products, prodSearch, prodCatFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.customer_phone?.toLowerCase().includes(orderSearch.toLowerCase());
      const matchStatus = orderStatusFilter ? o.order_status === orderStatusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const term = customerSearch.toLowerCase();
      return c.name?.toLowerCase().includes(term) ||
             c.email?.toLowerCase().includes(term) ||
             c.phone?.toLowerCase().includes(term);
    });
  }, [customers, customerSearch]);

  // Unauthenticated render state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col justify-center items-center px-4 font-body select-none">
        {/* Glow backgrounds */}
        <div className="absolute top-[10%] left-[10%] w-[35%] h-[35%] bg-[#C9A96E]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0f0f0e]/90 backdrop-blur-md border border-neutral-900 rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block px-3 py-1 bg-[#C9A96E]/10 border border-[#C9A96E]/20 rounded-full text-[10px] text-[#ead2ae] font-bold uppercase tracking-widest mb-3">
              Staff Portal
            </div>
            <h1 className="text-3xl font-light text-white font-display italic tracking-wide">HeelsUp Console</h1>
            <p className="text-xs text-neutral-400 mt-2 font-medium">Log in with administration credentials to continue.</p>
          </div>

          {!otpRequired ? (
            resetStep === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A96E]/60 transition-colors"
                    placeholder="staff@heelsup.in"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => setResetStep('forgot_email')}
                      className="text-[9px] font-bold text-[#ead2ae] hover:text-[#C9A96E] transition-colors uppercase tracking-wider"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A96E]/60 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-3.5 bg-gradient-to-r from-[#C9A96E] to-yellow-600 hover:from-[#b17e3f] hover:to-yellow-700 text-neutral-950 text-xs font-bold rounded-xl uppercase tracking-widest transition-all mt-6 shadow-lg shadow-[#C9A96E]/10 active:scale-[0.98] duration-200"
                >
                  {loggingIn ? 'Authenticating...' : 'Enter Console'}
                </button>
              </form>
            ) : resetStep === 'forgot_email' ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="text-center mb-2">
                  <p className="text-[10px] text-neutral-400 leading-relaxed uppercase tracking-wider">
                    Enter your staff email address to receive a password recovery OTP code.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A96E]/60 transition-colors"
                    placeholder="staff@heelsup.in"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="w-full py-3.5 bg-gradient-to-r from-[#C9A96E] to-yellow-600 hover:from-[#b17e3f] hover:to-yellow-700 text-neutral-950 text-xs font-bold rounded-xl uppercase tracking-widest transition-all mt-4"
                >
                  {resettingPassword ? 'Sending OTP...' : 'Send Recovery OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setResetStep('login')}
                  className="w-full text-center text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-wider mt-2.5 block transition-colors"
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-[#C9A96E]/20 rounded-xl text-[10px] text-[#ead2ae] leading-relaxed mb-2">
                  🔑 Enter the 6-digit OTP code sent to your email along with your new password.
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Verification OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtpCode}
                    onChange={e => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A96E]/60 transition-colors font-mono tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A96E]/60 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A96E]/60 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="w-full py-3.5 bg-gradient-to-r from-[#C9A96E] to-yellow-600 hover:from-[#b17e3f] hover:to-yellow-700 text-neutral-950 text-xs font-bold rounded-xl uppercase tracking-widest transition-all mt-4"
                >
                  {resettingPassword ? 'Resetting...' : 'Reset Password & Login'}
                </button>
                <button
                  type="button"
                  onClick={() => setResetStep('login')}
                  className="w-full text-center text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-wider mt-2.5 block transition-colors"
                >
                  Back to Login
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-[#C9A96E]/20 rounded-xl text-[10px] text-[#ead2ae] leading-relaxed mb-2">
                🔒 Two-Factor authentication enabled. A security verification code has been dispatched.
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Verification OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-center font-mono tracking-widest text-white focus:outline-none focus:border-[#C9A96E]/60 transition-colors"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 bg-gradient-to-r from-[#C9A96E] to-yellow-600 hover:from-[#b17e3f] hover:to-yellow-700 text-neutral-950 text-xs font-bold rounded-xl uppercase tracking-widest transition-all mt-4"
              >
                {loggingIn ? 'Verifying OTP...' : 'Verify & Access'}
              </button>
              <button
                type="button"
                onClick={() => setOtpRequired(false)}
                className="w-full text-center text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-wider mt-2.5 block transition-colors"
              >
                Cancel 2FA
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-gray-200 flex font-body select-none relative overflow-x-hidden">
      {/* Toast Alert System Overlay */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all animate-slide-in ${
              t.type === 'success' ? 'bg-[#0f1d13]/90 border-emerald-900/50 text-emerald-300' :
              t.type === 'error' ? 'bg-[#1f0f12]/90 border-rose-950/50 text-rose-300' :
              t.type === 'warning' ? 'bg-[#1e170c]/90 border-amber-900/50 text-amber-300' :
              'bg-[#0f131a]/90 border-blue-950/50 text-blue-300'
            }`}
          >
            <div className="mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#ead2ae]" />}
              {t.type === 'info' && <Activity className="w-4 h-4 text-blue-500" />}
            </div>
            <div className="flex-1">
              <h5 className="text-[10px] font-bold uppercase tracking-wider">{t.title}</h5>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0c0c0b] border-r border-neutral-900/50 flex flex-col justify-between transition-all duration-300 z-30 shrink-0`}>
        <div className="flex flex-col gap-6 p-5">
          <div className="flex items-center justify-between border-b border-neutral-900/60 pb-5">
            {!sidebarCollapsed && (
              <span className="text-sm font-bold tracking-widest text-[#ead2ae] font-display italic">
                HEELSUP PANEL
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg bg-[#121211] border border-neutral-880 text-neutral-400 hover:text-white"
            >
              {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={sidebarQuery}
                onChange={e => setSidebarQuery(e.target.value)}
                placeholder="Search tabs..."
                className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-3 py-2 text-[10px] focus:outline-none text-white focus:border-[#C9A96E]/50"
              />
            </div>
          )}

          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] pr-1">
            {filteredNavs.map(nav => (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === nav.id
                    ? 'bg-[#ead2ae]/10 text-[#ead2ae] border-l-2 border-[#C9A96E]'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/30'
                }`}
              >
                {nav.icon}
                {!sidebarCollapsed && <span>{nav.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer profile log out */}
        <div className="p-5 border-t border-neutral-900/60 space-y-3">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#121211] border border-neutral-800 flex items-center justify-center font-bold text-[#ead2ae] text-xs">
                {user.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-white block truncate">{user.name}</span>
                <span className="text-[9px] text-neutral-500 block uppercase tracking-wider">{user.role}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-950 border border-neutral-900 hover:bg-neutral-900 hover:text-white text-xs font-bold rounded-xl text-neutral-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 min-w-0 overflow-y-auto relative p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <h2 className="text-xl font-bold text-white font-display italic">Overview Dashboard</h2>
                <p className="text-[10px] text-neutral-500 font-medium">Real-time statistics of HeelsUp storefront.</p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Gross Sales</span>
                  <span className="block text-lg font-bold font-mono text-white mt-1">
                    ₹{dashboardStats?.totalSales ? (dashboardStats.totalSales / 100).toLocaleString('en-IN') : '0.00'}
                  </span>
                  <span className="text-[7px] text-emerald-500 font-bold uppercase mt-1 block">Live storefront</span>
                </div>
                <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Completed Orders</span>
                  <span className="block text-lg font-bold font-mono text-white mt-1">
                    {dashboardStats?.ordersCount || 0}
                  </span>
                  <span className="text-[7px] text-[#ead2ae] font-semibold mt-1 block">Completed transactions</span>
                </div>
                <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Total Products</span>
                  <span className="block text-lg font-bold font-mono text-white mt-1">
                    {products.length}
                  </span>
                  <span className="text-[7px] text-neutral-500 font-semibold mt-1 block">Active styles catalog</span>
                </div>
                <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Users Registered</span>
                  <span className="block text-lg font-bold font-mono text-white mt-1">
                    {customers.length}
                  </span>
                  <span className="text-[7px] text-neutral-500 font-semibold mt-1 block">Store customers</span>
                </div>
              </div>

              {/* Recent Orders and Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                  <span className="block text-[9px] font-bold text-neutral-400 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                    Latest Web Orders
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#070707] text-neutral-500 border-b border-neutral-900 font-mono">
                          <th className="p-3 font-bold uppercase">Order No</th>
                          <th className="p-3 font-bold uppercase">Customer</th>
                          <th className="p-3 font-bold uppercase">Total</th>
                          <th className="p-3 font-bold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id} className="hover:bg-[#121211]/20">
                            <td className="p-3 font-mono text-[10px] text-amber-500 font-bold">{o.order_number}</td>
                            <td className="p-3 text-[11px]">{o.customer_name}</td>
                            <td className="p-3 font-mono">₹{(o.total_amount).toFixed(2)}</td>
                            <td className="p-3">
                              <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-[8px] font-bold uppercase rounded text-neutral-400">{o.order_status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                  <span className="block text-[9px] font-bold text-neutral-400 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                    Top Selling Categories
                  </span>
                  <div className="p-4 space-y-3">
                    {categoriesList.slice(0, 4).map((cat, idx) => (
                      <div key={cat.id} className="flex justify-between items-center text-xs">
                        <span className="text-neutral-400 font-semibold">{cat.name}</span>
                        <span className="px-2 py-0.5 bg-[#121211] border border-neutral-850 text-[10px] font-mono font-bold text-[#ead2ae] rounded-lg">Rank #{idx+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: POS TERMINAL */}
          {activeTab === 'pos' && (
            <PosTerminal
              products={products}
              categories={categoriesList}
              coupons={couponsList}
              showToast={showToast}
              onOrderCreated={fetchOrders}
            />
          )}

          {/* TAB: DATABASE TABLES CONSOLE */}
          {activeTab === 'db_editor' && (
            <DbConsole
              tables={dbTablesList}
              showToast={showToast}
            />
          )}

          {/* TAB: ENTERPRISE REPORTS */}
          {activeTab === 'reports' && (
            <EnterpriseReports
              orders={orders}
              products={products}
              showToast={showToast}
            />
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <AuditLogs
              logs={auditLogsList}
              loading={auditLogLoading}
              onRefresh={fetchAuditLogs}
              showToast={showToast}
            />
          )}

          {/* TAB: REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <ReviewsModeration
              reviews={reviewsList}
              onRefresh={() => fetchAuxiliaryData()}
              showToast={showToast}
            />
          )}

          {/* TAB: EXCHANGES & RETURNS */}
          {activeTab === 'returns' && (
            <ReturnsManager
              returns={returnsList}
              onRefresh={() => fetchAuxiliaryData()}
              showToast={showToast}
            />
          )}

          {/* TAB: STYLES DIRECTORY */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Styles Directory</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Manage product inventory list.</p>
                </div>
                <button
                  onClick={() => openProductDrawer(null)}
                  className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Style Item
                </button>
              </div>

              {/* Filters */}
              <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={e => setProdSearch(e.target.value)}
                    placeholder="Search styles directory by name, SKU code..."
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A96E]/50"
                  />
                </div>
                <div className="md:col-span-4">
                  <select
                    value={prodCatFilter}
                    onChange={e => setProdCatFilter(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Grid Table */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900 font-mono">
                        <th className="p-3.5 font-bold uppercase">Style Image</th>
                        <th className="p-3.5 font-bold uppercase">Details</th>
                        <th className="p-3.5 font-bold uppercase">Category</th>
                        <th className="p-3.5 font-bold uppercase">Price (INR)</th>
                        <th className="p-3.5 font-bold uppercase text-center">Stock</th>
                        <th className="p-3.5 font-bold uppercase text-center">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/60 text-white">
                      {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-[#121211]/25 transition-colors">
                          <td className="p-3">
                            <div className="w-12 h-12 bg-[#121211] border border-neutral-850 rounded overflow-hidden flex items-center justify-center">
                              <HeicImage src={p.images?.[0] || ''} alt={p.name} className="max-w-full max-h-full object-contain" />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-neutral-200">{p.name}</div>
                            <span className="text-[9px] font-mono text-neutral-500 block uppercase tracking-wider">{p.sku}</span>
                          </td>
                          <td className="p-3 text-neutral-400">{p.category}</td>
                          <td className="p-3 font-mono">
                            ₹{(p.price / 100).toLocaleString('en-IN')}
                            {p.original_price && (
                              <span className="text-[10px] text-neutral-500 line-through ml-2 font-mono">₹{(p.original_price / 100).toLocaleString()}</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-semibold">
                            {p.stock <= 2 ? (
                              <span className="text-rose-500 font-bold">{p.stock} (Low)</span>
                            ) : p.stock}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${p.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-500'}`}>
                              {p.active ? 'Active' : 'Draft'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => openProductDrawer(p)}
                              className="p-1.5 text-[#ead2ae] hover:bg-[#121211] rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-rose-500 hover:bg-[#121211] rounded"
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

          {/* TAB: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Categories</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Manage storefront product categories hierarchy.</p>
                </div>
                <button
                  onClick={() => openCategoryDrawer(null)}
                  className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </div>

              {/* Categories list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoriesList.map(cat => (
                  <div key={cat.id} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-[#121211] border border-neutral-850 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        {cat.image_url ? (
                          <HeicImage src={cat.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Tag className="w-6 h-6 text-neutral-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{cat.name}</h4>
                        <span className="text-[9px] font-mono text-neutral-500 block truncate">Slug: /{cat.slug}</span>
                        <p className="text-[10px] text-neutral-400 mt-1.5 line-clamp-2">{cat.description || 'No description provided.'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-neutral-900 pt-3.5">
                      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Weight Sort: {cat.sort_order}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openCategoryDrawer(cat)}
                          className="px-2 py-1 text-[9px] font-semibold text-[#ead2ae] hover:bg-[#121211] rounded uppercase tracking-wider"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="px-2 py-1 text-[9px] font-semibold text-rose-500 hover:bg-[#121211] rounded uppercase tracking-wider"
                        >
                          Purge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: COLLECTIONS */}
          {activeTab === 'collections' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Collections</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Manage automated slideshow directories.</p>
                </div>
                <button
                  onClick={() => openCollectionDrawer(null)}
                  className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Collection
                </button>
              </div>

              {/* Collections list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collectionsList.map(col => (
                  <div key={col.id} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-[#121211] border border-neutral-850 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        {col.image_url ? (
                          <HeicImage src={col.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PlusCircle className="w-6 h-6 text-neutral-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{col.name}</h4>
                        <span className="text-[9px] font-mono text-neutral-500 block">Type: Manual</span>
                        <p className="text-[10px] text-neutral-400 mt-1.5 line-clamp-2">{col.description || 'No description provided.'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-900 pt-3.5">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${col.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-neutral-850 text-neutral-500'}`}>
                        {col.active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openCollectionDrawer(col)}
                          className="px-2 py-1 text-[9px] font-semibold text-[#ead2ae] hover:bg-[#121211] rounded uppercase tracking-wider"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(col.id)}
                          className="px-2 py-1 text-[9px] font-semibold text-rose-500 hover:bg-[#121211] rounded uppercase tracking-wider"
                        >
                          Purge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BLOG ARTICLES */}
          {activeTab === 'blogs' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Blog Articles</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Manage lifestyle and footwear marketing journals.</p>
                </div>
                <button
                  onClick={() => openBlogDrawer(null)}
                  className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Blog Article
                </button>
              </div>

              {/* Blogs Table list */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900 font-mono">
                      <th className="p-3 font-bold uppercase">Image preview</th>
                      <th className="p-3 font-bold uppercase">Title</th>
                      <th className="p-3 font-bold uppercase">Author</th>
                      <th className="p-3 font-bold uppercase">Slug Path</th>
                      <th className="p-3 font-bold uppercase text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                    {blogsList.map(b => (
                      <tr key={b.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-3">
                          <div className="w-12 h-10 bg-[#121211] border border-neutral-850 rounded overflow-hidden flex items-center justify-center">
                            {b.image_url ? (
                              <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-4 h-4 text-neutral-600" />
                            )}
                          </div>
                        </td>
                        <td className="p-3">{b.title}</td>
                        <td className="p-3 text-neutral-400">{b.author || 'Store Editor'}</td>
                        <td className="p-3 font-mono text-[10px] text-neutral-500">/blogs/{b.slug}</td>
                        <td className="p-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${b.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25' : 'bg-neutral-800 text-neutral-550'}`}>
                            {b.active ? 'Live' : 'Draft'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => openBlogDrawer(b)}
                            className="p-1.5 text-[#ead2ae] hover:bg-[#121211] rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBlog(b.id)}
                            className="p-1.5 text-rose-500 hover:bg-[#121211] rounded"
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
          )}

          {/* TAB: ONLINE ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <h2 className="text-lg font-bold text-white font-display italic">Online Orders</h2>
                <p className="text-[10px] text-neutral-500 font-medium">Verify placed client transactions and details.</p>
              </div>

              {/* Filters toolbar */}
              <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Search by Order ID, customer phone number..."
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A96E]/50"
                  />
                </div>
                <div className="md:col-span-4">
                  <select
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">All Orders Status</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Table list */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900 font-mono">
                        <th className="p-3.5 font-bold uppercase">Order number</th>
                        <th className="p-3.5 font-bold uppercase">Customer</th>
                        <th className="p-3.5 font-bold uppercase">Total (INR)</th>
                        <th className="p-3.5 font-bold uppercase">Order Status</th>
                        <th className="p-3.5 font-bold uppercase">Payment Mode</th>
                        <th className="p-3.5 font-bold uppercase">Creation Date</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                      {filteredOrders.map(o => (
                        <tr key={o.id} className="hover:bg-[#121211]/25 transition-colors">
                          <td className="p-3 font-mono text-[10px] text-amber-500 font-bold">{o.order_number}</td>
                          <td className="p-3">
                            <div>{o.customer_name}</div>
                            <span className="text-[9px] text-neutral-500 block font-mono">{o.customer_phone}</span>
                          </td>
                          <td className="p-3 font-mono">₹{(o.total_amount).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                              o.order_status === 'placed' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              o.order_status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              o.order_status === 'shipped' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              o.order_status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              'bg-neutral-800 text-neutral-500'
                            }`}>
                              {o.order_status}
                            </span>
                          </td>
                          <td className="p-3 uppercase text-[9px] font-mono text-neutral-400">{o.payment_method}</td>
                          <td className="p-3 text-neutral-500 font-mono text-[10px]">{new Date(o.created_at || Date.now()).toLocaleDateString()}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => openOrderDrawer(o)}
                              className="px-2 py-1 text-[#ead2ae] hover:bg-neutral-900 rounded font-bold text-[9px] uppercase tracking-wider"
                            >
                              Details drawer
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

          {/* TAB: CUSTOMERS LOG */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <h2 className="text-lg font-bold text-white font-display italic">Customers Log</h2>
                <p className="text-[10px] text-neutral-500 font-medium">Verify registered customer accounts directory.</p>
              </div>

              {/* Search input */}
              <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-2xl relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search customers log by name, phone or email..."
                  className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A96E]/50"
                />
              </div>

              {/* Customers table */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900 font-mono">
                        <th className="p-3.5 font-bold uppercase">Customer Name</th>
                        <th className="p-3.5 font-bold uppercase">Email</th>
                        <th className="p-3.5 font-bold uppercase">Phone</th>
                        <th className="p-3.5 font-bold uppercase text-center">Orders Count</th>
                        <th className="p-3.5 font-bold uppercase text-center">Total Spent</th>
                        <th className="p-3.5 font-bold uppercase">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                      {filteredCustomers.map(c => (
                        <tr key={c.id} className="hover:bg-[#121211]/25 transition-colors">
                          <td className="p-3 text-neutral-200 font-semibold">{c.name}</td>
                          <td className="p-3 text-neutral-400 font-mono">{c.email}</td>
                          <td className="p-3 text-neutral-400 font-mono">{c.phone || 'N/A'}</td>
                          <td className="p-3 text-center font-mono">{c.orders_count || 0}</td>
                          <td className="p-3 text-center font-mono text-[#ead2ae]">₹{((c.total_spent || 0) / 100).toFixed(2)}</td>
                          <td className="p-3 text-neutral-500 font-mono text-[10px]">{new Date(c.registered_at || Date.now()).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROMOS & COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form column */}
                <form onSubmit={handleSaveCoupon} className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-900 pb-3 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-500" /> Create Promo Coupon
                  </h3>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Coupon Code</label>
                    <input
                      type="text"
                      required
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      placeholder="e.g. HEELS15"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs uppercase font-mono text-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Discount Type</label>
                      <select
                        value={couponType}
                        onChange={e => setCouponType(e.target.value as any)}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="fixed">Fixed (Rs)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Value</label>
                      <input
                        type="number"
                        required
                        value={couponVal || ''}
                        onChange={e => setCouponVal(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="e.g. 15"
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Min Order Purchase (₹)</label>
                    <input
                      type="number"
                      value={couponMin || ''}
                      onChange={e => setCouponMin(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="e.g. 2999"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-4"
                  >
                    Create Coupon
                  </button>
                </form>

                {/* List column */}
                <div className="lg:col-span-8 bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                  <span className="block text-[9px] font-bold text-neutral-400 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                    Promo coupons registry
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#070707] text-neutral-400 border-b border-neutral-900 font-mono">
                          <th className="p-3 font-bold uppercase">Promo Code</th>
                          <th className="p-3 font-bold uppercase">Benefit</th>
                          <th className="p-3 font-bold uppercase">Min Purchase</th>
                          <th className="p-3 font-bold uppercase text-center">Status</th>
                          <th className="p-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                        {couponsList.map(cp => (
                          <tr key={cp.id} className="hover:bg-[#121211]/25 transition-colors">
                            <td className="p-3 font-mono text-[11px] text-amber-500 font-bold">{cp.code}</td>
                            <td className="p-3 font-mono">
                              {cp.discount_value}{cp.discount_type === 'percentage' ? '%' : ' Rs'} OFF
                            </td>
                            <td className="p-3 font-mono">₹{(cp.min_purchase).toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 rounded text-[8px] font-bold uppercase">Active</span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteCoupon(cp.id)}
                                className="p-1 text-rose-500 hover:bg-[#121211] rounded"
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
            </div>
          )}

          {/* TAB: BANNERS SLIDESHOW */}
          {activeTab === 'banners' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form column */}
                <form onSubmit={handleSaveBanner} className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-900 pb-3 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-500" /> Upload Slider Banner
                  </h3>
                  
                  {/* Banner Image Preview Container */}
                  <div className="h-32 bg-[#121211] border border-neutral-850 rounded-xl overflow-hidden flex items-center justify-center relative group">
                    {bannerImg ? (
                      <>
                        <img src={bannerImg} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setBannerImg('')}
                          className="absolute top-2 right-2 p-1 bg-black/70 rounded-full text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <UploadCloud className="w-8 h-8 text-neutral-600 mx-auto mb-1.5" />
                        <span className="text-[10px] text-neutral-400 font-bold block">1200x450px banner asset</span>
                        <input
                          type="file"
                          onChange={e => handleImageUpload(e, (arr: string[]) => setBannerImg(arr[arr.length - 1]), [])}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Banner Title</label>
                    <input
                      type="text"
                      value={bannerTitle}
                      onChange={e => setBannerTitle(e.target.value)}
                      placeholder="e.g. SUMMER LUXURY DESIGNS"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={bannerSub}
                      onChange={e => setBannerSub(e.target.value)}
                      placeholder="e.g. Up to 40% discount checkout"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Redirection Link</label>
                    <input
                      type="text"
                      value={bannerLink}
                      onChange={e => setBannerLink(e.target.value)}
                      placeholder="e.g. /collections/luxury"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={uploadingImage}
                    className="w-full py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-4"
                  >
                    Save slide frame
                  </button>
                </form>

                {/* List column */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bannersList.map(bn => (
                    <div key={bn.id} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md group relative">
                      <div className="h-40 bg-neutral-950 relative">
                        <HeicImage src={bn.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity" />
                        <button
                          onClick={() => handleDeleteBanner(bn.id)}
                          className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-xl text-rose-500 hover:text-rose-400 border border-neutral-900"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-4 space-y-1">
                        <h4 className="text-xs font-bold text-white uppercase truncate">{bn.title || 'Untitled Banner'}</h4>
                        <p className="text-[10px] text-neutral-400 line-clamp-1">{bn.subtitle || 'No subtitle.'}</p>
                        <span className="text-[9px] font-mono text-neutral-500 block truncate">Link: {bn.link || 'None'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STATIC PAGES */}
          {activeTab === 'pages' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form column */}
                <form onSubmit={handleSavePage} className="lg:col-span-5 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-900 pb-3 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" /> Create Policy Page
                  </h3>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Page Title</label>
                    <input
                      type="text"
                      required
                      value={pageTitle}
                      onChange={e => setPageTitle(e.target.value)}
                      placeholder="e.g. Terms and Conditions"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Slug URL path</label>
                    <input
                      type="text"
                      required
                      value={pageSlug}
                      onChange={e => setPageSlug(e.target.value)}
                      placeholder="e.g. terms-conditions"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Content Markdown/HTML</label>
                    <textarea
                      required
                      rows={8}
                      value={pageContent}
                      onChange={e => setPageContent(e.target.value)}
                      placeholder="Type static content body here..."
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-4"
                  >
                    Publish policy page
                  </button>
                </form>

                {/* List column */}
                <div className="lg:col-span-7 bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                  <span className="block text-[9px] font-bold text-neutral-400 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                    Static footer pages
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#070707] text-neutral-400 border-b border-neutral-900 font-mono">
                          <th className="p-3 font-bold uppercase">Page Title</th>
                          <th className="p-3 font-bold uppercase">Slug Path</th>
                          <th className="p-3 font-bold uppercase text-center">Status</th>
                          <th className="p-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                        {pagesList.map(pg => (
                          <tr key={pg.id} className="hover:bg-[#121211]/25 transition-colors">
                            <td className="p-3 font-semibold text-neutral-200">{pg.title}</td>
                            <td className="p-3 font-mono text-[10px] text-neutral-500">/pages/{pg.slug}</td>
                            <td className="p-3 text-center">
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 rounded text-[8px] font-bold uppercase">Live</span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeletePage(pg.id)}
                                className="p-1 text-rose-500 hover:bg-[#121211] rounded"
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
            </div>
          )}

          {/* TAB: STAFF ACCOUNTS */}
          {activeTab === 'staff' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form column */}
                <form onSubmit={handleSaveStaff} className="lg:col-span-5 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-900 pb-3 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-500" /> Register Staff Account
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={staffFirstName}
                        onChange={e => setStaffFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Last Name</label>
                      <input
                        type="text"
                        value={staffLastName}
                        onChange={e => setStaffLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={staffEmail}
                      onChange={e => setStaffEmail(e.target.value)}
                      placeholder="john.doe@heelsup.in"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Role Type</label>
                      <select
                        value={staffRole}
                        onChange={e => setStaffRole(e.target.value as any)}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Permissions Checklist */}
                  <div className="space-y-2 border-t border-neutral-900 pt-3">
                    <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Role Permissions</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
                      {['catalogue', 'sales', 'settings', 'database', 'blogs'].map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer hover:text-white">
                          <input
                            type="checkbox"
                            checked={staffPermsList.includes(p)}
                            onChange={() => handleTogglePerm(p)}
                            className="rounded border-neutral-800 text-amber-500 focus:ring-0 bg-neutral-950"
                          />
                          <span className="capitalize">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-4"
                  >
                    Register Access
                  </button>
                </form>

                {/* List column */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Staff accounts list */}
                  <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                    <span className="block text-[9px] font-bold text-neutral-400 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                      Console credentials directory
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#070707] text-neutral-400 border-b border-neutral-900 font-mono">
                            <th className="p-3 font-bold uppercase">Staff Name</th>
                            <th className="p-3 font-bold uppercase">Email</th>
                            <th className="p-3 font-bold uppercase">Role Permissions</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                          {staffList.map(st => (
                            <tr key={st.id} className="hover:bg-[#121211]/25 transition-colors">
                              <td className="p-3 font-semibold text-neutral-200">
                                {st.first_name} {st.last_name || ''}
                              </td>
                              <td className="p-3 font-mono text-[10px] text-neutral-400">{st.email}</td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  st.role === 'admin' ? 'bg-[#ead2ae]/10 text-[#ead2ae]' : 'bg-neutral-800 text-neutral-500'
                                }`}>
                                  {st.role}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlockStaff(st)}
                                  className={`px-2 py-1 text-[8px] font-bold uppercase rounded ${
                                    st.is_blocked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                  }`}
                                >
                                  {st.is_blocked ? 'Unlock' : 'Block'}
                                </button>
                                {st.email !== 'support@heelsup.in' && (
                                  <button
                                    onClick={() => handleDeleteStaff(st.id)}
                                    className="p-1 text-rose-500 hover:bg-[#121211] rounded inline-block"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Active login sessions list */}
                  <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                    <span className="block text-[9px] font-bold text-neutral-400 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                      Active Developer/Admin Sessions
                    </span>
                    <div className="overflow-x-auto max-h-56">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#070707] text-neutral-400 border-b border-neutral-900 font-mono">
                            <th className="p-3 font-bold uppercase">Staff Email</th>
                            <th className="p-3 font-bold uppercase">IP Address</th>
                            <th className="p-3 font-bold uppercase w-36">Logged At</th>
                            <th className="p-3 text-right">Revoke</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900/60 text-white font-medium">
                          {activeSessions.map(sess => (
                            <tr key={sess.id} className="hover:bg-[#121211]/25 transition-colors">
                              <td className="p-3 font-semibold text-neutral-300">{sess.email}</td>
                              <td className="p-3 font-mono text-[10px] text-neutral-400">{sess.ip_address || 'unknown'}</td>
                              <td className="p-3 font-mono text-[9px] text-neutral-500">{new Date(sess.created_at).toLocaleString()}</td>
                              <td className="p-3 text-right">
                                {sess.revoked ? (
                                  <span className="text-[8px] text-neutral-600 font-bold uppercase mr-2">Revoked</span>
                                ) : (
                                  <button
                                    onClick={() => handleRevokeSession(sess.id)}
                                    className="p-1 text-rose-500 hover:bg-[#121211] rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GENERAL CONFIG */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <h2 className="text-lg font-bold text-white font-display italic">Console configuration</h2>
                <p className="text-[10px] text-neutral-500 font-medium">Manage server parameters and integrations.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Gateway config */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Payment gateway settings</h3>
                    <div className="h-[1px] bg-neutral-900" />
                    <div className="space-y-4">
                      {settingsList.map((item, idx) => {
                        if (['razorpay_key_id', 'razorpay_key_secret'].includes(item.key)) {
                          return (
                            <div key={item.key}>
                              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                {item.key.replace(/_/g, ' ')}
                              </label>
                              <input
                                type="text"
                                value={item.value}
                                onChange={e => {
                                  const v = e.target.value;
                                  setSettingsList(prev => prev.map((s, i) => i === idx ? { ...s, value: v } : s));
                                }}
                                className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                              />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <div className="pt-4 flex gap-4">
                      <button
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="px-6 py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors"
                      >
                        {savingSettings ? 'Saving...' : 'Save Credentials'}
                      </button>
                      <button
                        onClick={handleTestRazorpay}
                        disabled={testingRzp}
                        className="px-4 py-2.5 border border-neutral-800 hover:bg-neutral-850 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingRzp ? 'animate-spin' : ''}`} /> Test Live Connection
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">General settings</h3>
                    <div className="h-[1px] bg-neutral-900" />
                    <div className="grid grid-cols-2 gap-4">
                      {settingsList.map((item, idx) => {
                        if (['site_name', 'shipping_free_above'].includes(item.key)) {
                          return (
                            <div key={item.key}>
                              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                {item.key.replace(/_/g, ' ')}
                              </label>
                              <input
                                type="text"
                                value={item.value}
                                onChange={e => {
                                  const v = e.target.value;
                                  setSettingsList(prev => prev.map((s, i) => i === idx ? { ...s, value: v } : s));
                                }}
                                className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                              />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={handleSaveSettings}
                        className="px-6 py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors"
                      >
                        Update settings
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md self-start">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Configuration values</h3>
                  <div className="h-[1px] bg-neutral-900" />
                  <div className="divide-y divide-neutral-900 text-xs">
                    {settingsList.filter(s => !['razorpay_key_id', 'razorpay_key_secret', 'site_name', 'shipping_free_above'].includes(s.key)).map(s => (
                      <div key={s.key} className="py-2.5 flex justify-between">
                        <span className="text-neutral-500 font-semibold uppercase text-[9px] tracking-wider truncate max-w-[150px]">{s.key}</span>
                        <span className="text-neutral-300 font-mono text-[10px] truncate max-w-[150px]">{s.value || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Online Order details slider drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <div>
                  <span className="text-[10px] text-amber-500 font-bold font-mono">ORDER ID: {selectedOrder.order_number}</span>
                  <h3 className="text-sm font-bold text-white uppercase mt-0.5">{selectedOrder.customer_name}</h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg border border-neutral-850 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status and payment detail logs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#121211] p-3 border border-neutral-850 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Net total amount</span>
                  <span className="block text-sm font-bold font-mono text-[#ead2ae] mt-1">₹{selectedOrder.total_amount.toFixed(2)}</span>
                </div>
                <div className="bg-[#121211] p-3 border border-neutral-850 rounded-xl">
                  <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Payment method</span>
                  <span className="block text-sm font-bold uppercase font-mono text-white mt-1">{selectedOrder.payment_method}</span>
                </div>
              </div>

              {/* Order items lists */}
              <div className="space-y-2">
                <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Order Items Details</span>
                <div className="space-y-2">
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="p-3 bg-[#070707] border border-neutral-900 rounded-xl flex justify-between items-center text-[11px]">
                      <div>
                        <span className="text-white block font-semibold">{it.product_name || 'Heelsup style'}</span>
                        <span className="text-neutral-500 text-[9px] font-mono">Size: {it.size} | Qty: {it.quantity || 1}</span>
                      </div>
                      <span className="font-mono text-neutral-400">₹{(it.price / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery address details */}
              <div className="p-4 bg-[#121211]/50 border border-neutral-900 rounded-xl space-y-2 text-[11px]">
                <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-900 pb-1">Delivery Address</span>
                <p className="text-neutral-300 font-medium">{selectedOrder.address_line1}</p>
                {selectedOrder.address_line2 && <p className="text-neutral-300">{selectedOrder.address_line2}</p>}
                <p className="text-neutral-400">{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
              </div>

              {/* Courier Tracking Submission Form */}
              <form onSubmit={handleUpdateOrderStatus} className="p-4 bg-[#121211] border border-neutral-850 rounded-xl space-y-4">
                <span className="block text-[9px] font-bold text-white uppercase tracking-wider">Update order shipping & status</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Carrier Name</label>
                    <input
                      type="text"
                      value={courierNameForm}
                      onChange={e => setCourierNameForm(e.target.value)}
                      placeholder="e.g. BlueDart"
                      className="w-full bg-[#0f0f0e] border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={trackingNumberForm}
                      onChange={e => setTrackingNumberForm(e.target.value)}
                      placeholder="e.g. 12345678"
                      className="w-full bg-[#0f0f0e] border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Tracking URL</label>
                  <input
                    type="text"
                    value={trackingUrlForm}
                    onChange={e => setTrackingUrlForm(e.target.value)}
                    placeholder="e.g. https://track.bluedart.com/..."
                    className="w-full bg-[#0f0f0e] border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Order status</label>
                  <select
                    value={orderStatusForm}
                    onChange={e => setOrderStatusForm(e.target.value)}
                    className="w-full bg-[#0f0f0e] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors"
                >
                  Save Order parameters
                </button>
              </form>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Close details panel
            </button>
          </div>
        </div>
      )}

      {/* Category CRUD drawer */}
      {(isAddingCategory || editingCategory) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {isAddingCategory ? 'Add Category' : 'Edit Category'}
                </h3>
                <button
                  onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }}
                  className="p-1.5 rounded-lg border border-neutral-850 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={catFormName}
                    onChange={e => setCatFormName(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Slug URL</label>
                  <input
                    type="text"
                    required
                    value={catFormSlug}
                    onChange={e => setCatFormSlug(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Description</label>
                  <textarea
                    value={catFormDescription}
                    onChange={e => setCatFormDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Image URL path</label>
                  <input
                    type="text"
                    value={catFormImageUrl}
                    onChange={e => setCatFormImageUrl(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={catFormSort}
                      onChange={e => setCatFormSort(Number(e.target.value))}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      checked={catFormActive}
                      onChange={e => setCatFormActive(e.target.checked)}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-0 bg-neutral-950"
                    />
                    <span className="text-[10px] font-bold text-white uppercase">Active status</span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-6"
                >
                  Save Category
                </button>
              </form>
            </div>
            
            <button
              onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Cancel drawer
            </button>
          </div>
        </div>
      )}

      {/* Collection CRUD drawer */}
      {(isAddingCollection || editingCollection) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => { setIsAddingCollection(false); setEditingCollection(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {isAddingCollection ? 'Add Collection' : 'Edit Collection'}
                </h3>
                <button
                  onClick={() => { setIsAddingCollection(false); setEditingCollection(null); }}
                  className="p-1.5 rounded-lg border border-neutral-850 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCollectionSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Collection Name</label>
                  <input
                    type="text"
                    required
                    value={colFormName}
                    onChange={e => setColFormName(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Description</label>
                  <textarea
                    value={colFormDescription}
                    onChange={e => setColFormDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Image URL path</label>
                  <input
                    type="text"
                    value={colFormImageUrl}
                    onChange={e => setColFormImageUrl(e.target.value)}
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={colFormActive}
                    onChange={e => setColFormActive(e.target.checked)}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-0 bg-neutral-950"
                  />
                  <span className="text-[10px] font-bold text-white uppercase">Active status</span>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-6"
                >
                  Save Collection
                </button>
              </form>
            </div>
            
            <button
              onClick={() => { setIsAddingCollection(false); setEditingCollection(null); }}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Cancel drawer
            </button>
          </div>
        </div>
      )}

      {/* Product CRUD side drawer */}
      {(isAddingProduct || editingProduct) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="w-full max-w-xl bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {isAddingProduct ? 'Add Product Style' : 'Edit Product Style'}
                </h3>
                <button
                  onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                  className="p-1.5 rounded-lg border border-neutral-850 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Style Name</label>
                    <input
                      type="text"
                      required
                      value={prodFormName}
                      onChange={e => setProdFormName(e.target.value)}
                      placeholder="e.g. Stiletto Heels"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">SKU identifier</label>
                    <input
                      type="text"
                      required
                      value={prodFormSku}
                      onChange={e => setProdFormSku(e.target.value)}
                      placeholder="e.g. HUP-001"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Category</label>
                    <select
                      value={prodFormCategory}
                      onChange={e => setProdFormCategory(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none"
                    >
                      {categoriesList.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={prodFormPrice || ''}
                      onChange={e => setProdFormPrice(parseFloat(e.target.value) || 0)}
                      placeholder="2999"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">MRP Original Price (₹)</label>
                    <input
                      type="number"
                      value={prodFormMrp || ''}
                      onChange={e => setProdFormMrp(parseFloat(e.target.value) || 0)}
                      placeholder="4999"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Upload Image container */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Product Images Directory ({prodFormImages.length}/5)</label>
                  <div className="flex flex-wrap gap-3">
                    {prodFormImages.map((img, idx) => (
                      <div key={idx} className="w-16 h-16 bg-[#121211] border border-neutral-850 rounded-lg overflow-hidden flex items-center justify-center relative">
                        <img src={img} alt="" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setProdFormImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {prodFormImages.length < 5 && (
                      <div className="w-16 h-16 bg-[#121211] border border-dashed border-neutral-800 rounded-lg flex items-center justify-center relative cursor-pointer">
                        <UploadCloud className="w-5 h-5 text-neutral-500" />
                        <input
                          type="file"
                          onChange={e => handleImageUpload(e, setProdFormImages, prodFormImages)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-neutral-900 pt-3.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prodFormActive}
                      onChange={e => setProdFormActive(e.target.checked)}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-0 bg-neutral-950"
                    />
                    <span className="text-[10px] font-bold text-white uppercase">Active on site</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prodFormFeatured}
                      onChange={e => setProdFormFeatured(e.target.checked)}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-0 bg-neutral-950"
                    />
                    <span className="text-[10px] font-bold text-white uppercase">Featured home</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-6"
                >
                  Save Style listing
                </button>
              </form>
            </div>
            
            <button
              onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Cancel drawer
            </button>
          </div>
        </div>
      )}

      {/* Blog Article Editor side drawer */}
      {(isAddingBlog || editingBlog) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => { setIsAddingBlog(false); setEditingBlog(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="w-full max-w-2xl bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {isAddingBlog ? 'Create Journal Article' : 'Edit Journal Article'}
                </h3>
                <button
                  onClick={() => { setIsAddingBlog(false); setEditingBlog(null); }}
                  className="p-1.5 rounded-lg border border-neutral-850 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBlogSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Article Title</label>
                    <input
                      type="text"
                      required
                      value={blogFormTitle}
                      onChange={e => setBlogFormTitle(e.target.value)}
                      placeholder="e.g. Trends in Stiletto designs"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Slug URL path</label>
                    <input
                      type="text"
                      required
                      value={blogFormSlug}
                      onChange={e => setBlogFormSlug(e.target.value)}
                      placeholder="e.g. stiletto-trends-2026"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Author Name</label>
                    <input
                      type="text"
                      required
                      value={blogFormAuthor}
                      onChange={e => setBlogFormAuthor(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Cover Image URL</label>
                    <input
                      type="text"
                      value={blogFormImageUrl}
                      onChange={e => setBlogFormImageUrl(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={blogFormTags}
                    onChange={e => setBlogFormTags(e.target.value)}
                    placeholder="e.g. stiletto, heels, luxury, summer"
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Article Content</label>
                  <textarea
                    required
                    rows={12}
                    value={blogFormContent}
                    onChange={e => setBlogFormContent(e.target.value)}
                    placeholder="Type blog article body here (HTML/Markdown supported)..."
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl p-4 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                  <input
                    type="checkbox"
                    checked={blogFormActive}
                    onChange={e => setBlogFormActive(e.target.checked)}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-0 bg-neutral-950"
                  />
                  <span className="text-[10px] font-bold text-white uppercase">Publish Live storefront</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-6"
                >
                  Save Journal article
                </button>
              </form>
            </div>
            
            <button
              onClick={() => { setIsAddingBlog(false); setEditingBlog(null); }}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Cancel drawer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}