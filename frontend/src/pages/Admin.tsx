import React, { useState, useEffect, useMemo } from 'react'
import HeicImage from '../components/HeicImage'
import {
  LayoutDashboard, ShoppingCart, Package, ListChecks,
  LogOut, Plus, Edit3, Settings, Tag, Star, Users, FileText, Image as ImageIcon,
  UploadCloud, AlertTriangle, CheckCircle2, X, ChevronRight, ChevronLeft, Search, Bell,
  RotateCw, Trash2, Lock, PlusCircle, Percent, Activity,
  Coins, Sliders, RefreshCw, BarChart2
} from 'lucide-react'

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

interface Review {
  id: number;
  reviewer_name: string;
  rating: number;
  body: string;
  title: string;
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
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  is_blocked: boolean;
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

  // Global Toasts State
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Sidebar Controls
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarQuery, setSidebarQuery] = useState('');

  // Unified Db States
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [collectionsList, setCollectionsList] = useState<Collection[]>([]);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [bannersList, setBannersList] = useState<Banner[]>([]);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [pagesList, setPagesList] = useState<PageConfig[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Search/Filters States
  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // POS Cart State
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('');
  const [posCart, setPosCart] = useState<{ product: Product; size: string; qty: number; customPrice?: number }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posDiscount, setPosDiscount] = useState(0); // in Rupees
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [posRemarks, setPosRemarks] = useState('In-Store POS Sale');

  // Detail/Edit Drawers States
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

  // SQL Developer Terminal States
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResults, setSqlResults] = useState<any | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlExecuting, setSqlExecuting] = useState(false);

  // SQL Database Tables Browser States
  const [selectedDbTable, setSelectedDbTable] = useState<string>('products');
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [dbLoading, setDbLoading] = useState<boolean>(false);

  // Enterprise Reports State
  const [reportType, setReportType] = useState<'sales' | 'inventory'>('sales');
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Settings state variables
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [testingRzp, setTestingRzp] = useState(false);

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
    { id: 'db_editor', label: 'Database Tables', section: 'System', icon: <Sliders className="w-4 h-4" /> },
    { id: 'reports', label: 'Enterprise Reports', section: 'Main', icon: <BarChart2 className="w-4 h-4" /> }
  ];

  const filteredNavs = useMemo(() => {
    if (!sidebarQuery.trim()) return navigationItems;
    const q = sidebarQuery.toLowerCase();
    return navigationItems.filter(n => n.label.toLowerCase().includes(q));
  }, [sidebarQuery]);

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
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
      const res = await fetch('/api/admin/products?limit=100&all=true', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
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
      const res = await fetch('/api/admin/orders?limit=100', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
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
      const res = await fetch('/api/admin/customers?limit=100', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
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
    const token = localStorage.getItem('heelsup_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchSec = async (endpoint: string, setter: Function) => {
      try {
        const res = await fetch(endpoint, { headers });
        const data = await res.json();
        if (data.success && data.data) setter(data.data);
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
  };

  // Run on Login/Mount
  useEffect(() => {
    if (user) {
      fetchDashboardStats();
      fetchProducts();
      fetchOrders();
      fetchCustomers();
      fetchAuxiliaryData();
    }
  }, [user]);

  // Auth Handler
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` },
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodFormName || !prodFormSku || !prodFormPrice) {
      showToast('error', 'Required Fields', 'Please complete catalog title, SKU and price details.');
      return;
    }

    const payload = {
      name: prodFormName,
      sku: prodFormSku,
      category: prodFormCategory,
      price: prodFormPrice * 100,
      mrp: prodFormMrp ? prodFormMrp * 100 : null,
      stock: prodFormStock,
      sizes: prodFormSizes,
      images: prodFormImages.length > 0 ? prodFormImages : ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=60'],
      active: prodFormActive ? 1 : 0,
      featured: prodFormFeatured ? 1 : 0
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Styles Database Updated', `${prodFormName} details synchronized.`);
        setEditingProduct(null);
        setIsAddingProduct(false);
        fetchProducts();
      } else {
        showToast('error', 'Sync Failure', data.error || 'Failed to save product details.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to save style design.');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Product Deleted', `${name} removed from catalogue.`);
        fetchProducts();
      }
    } catch {
      showToast('error', 'Network Error', 'Unable to delete style.');
    }
  };

  const handleQuickStockAdjust = async (id: number, delta: number) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    const newStock = Math.max(0, prod.stock + delta);

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ stock: newStock })
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
        showToast('success', 'Stock Adjusted', `Stock synchronized to ${newStock} units.`);
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to adjust stock level.');
    }
  };

  // Orders Actions
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ status, send_sms: true })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Status Updated', `Order status transition to ${status} completed.`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, order_status: status as any } : null);
        }
      } else {
        showToast('error', 'Transition Rejected', data.error || 'Failed to update order status.');
      }
    } catch {
      showToast('error', 'Update Error', 'Could not sync status with DB.');
    }
  };

  const getAllowedStatusTransitions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'placed':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['shipped', 'cancelled'];
      case 'shipped':
        return ['delivered', 'cancelled'];
      case 'exchange_requested':
        return ['exchange_approved', 'exchange_rejected'];
      case 'exchange_approved':
        return ['shipped', 'cancelled'];
      default:
        return [];
    }
  };

  const handleSaveOrderTracking = async (
    orderId: number,
    status: string,
    courierName?: string,
    trackingNumber?: string,
    trackingUrl?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          status,
          courier_name: courierName,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          send_sms: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Order Updated', 'Tracking details and status synced.');
        fetchOrders();
        setSelectedOrder(null);
      } else {
        showToast('error', 'Update Failed', data.error || 'Failed to update order.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to update order.');
    }
  };

  // POS Actions
  const handleAddToPosCart = (product: Product, size: string) => {
    setPosCart(prev => {
      const exist = prev.find(item => item.product.id === product.id && item.size === size);
      if (exist) {
        return prev.map(item => item.product.id === product.id && item.size === size ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, size, qty: 1 }];
    });
    showToast('info', 'Added to Cart', `${product.name} (Size ${size}) added to POS checkout cart.`);
  };

  const handleRemoveFromPosCart = (id: number, size: string) => {
    setPosCart(prev => prev.filter(item => !(item.product.id === id && item.size === size)));
  };

  const posTotals = useMemo(() => {
    const subtotal = posCart.reduce((sum, item) => sum + (item.customPrice || (item.product.price / 100)) * item.qty, 0);
    const discount = Number(posDiscount || 0);
    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
  }, [posCart, posDiscount]);

  const handlePosCheckoutSubmit = async () => {
    if (posCart.length === 0) {
      showToast('warning', 'Checkout Empty', 'Cart must contain at least 1 item.');
      return;
    }

    const payload = {
      customer_name: posCustomerName || 'Walk-in Retailer',
      customer_phone: posCustomerPhone || null,
      items: posCart.map(item => ({
        product_id: item.product.id,
        unit_price: (item.customPrice || (item.product.price / 100)) * 100, // back to paise
        quantity: item.qty,
        size: item.size,
        color: 'Default'
      })),
      payment_method: posPaymentMethod,
      discount: posDiscount * 100, // back to paise
      notes: posRemarks
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
      if (data.success) {
        showToast('success', 'POS Sale Recorded', `Receipt generated under POS.`);

        // Reload lists
        setPosCart([]);
        setPosCustomerName('');
        setPosCustomerPhone('');
        setPosDiscount(0);
        setPosRemarks('In-Store POS Sale');
        fetchProducts();
        fetchOrders();
        fetchDashboardStats();
      } else {
        showToast('error', 'Checkout Error', data.error || 'Failed to finalize transaction.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not push checkout to backend.');
    }
  };

  // Coupons CRUD
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponVal) return;

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          code: couponCode.toUpperCase().trim(),
          type: couponType,
          value: couponVal,
          min_order: couponMin,
          active: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Coupon Created', `Promo code ${couponCode} active.`);
        setCouponCode('');
        setCouponVal(0);
        setCouponMin(0);
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to create coupon.');
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Coupon Removed', 'Promo code disabled.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete coupon.');
    }
  };

  // Banners CRUD
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImg) return;

    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          title: bannerTitle,
          subtitle: bannerSub,
          image_url: bannerImg,
          link: bannerLink || '/shop',
          active: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Created', 'Added slideshow slider.');
        setBannerTitle('');
        setBannerSub('');
        setBannerImg('');
        setBannerLink('');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to save banner.');
    }
  };

  const handleDeleteBanner = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Removed', 'Slideshow element deleted.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete banner.');
    }
  };

  // Reviews Actions
  const handleApproveReview = async (id: number, approvedStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ status: approvedStatus ? 1 : 0 })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Moderated', 'Approval status synchronized.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to moderate review.');
    }
  };

  const handleDeleteReview = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Deleted', 'Review removed.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete review.');
    }
  };

  // Custom static Pages CRUD
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle || !pageSlug) return;
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          title: pageTitle,
          slug: pageSlug.toLowerCase().trim(),
          content: pageContent,
          active: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Page Created', 'Static policy page saved.');
        setPageTitle('');
        setPageSlug('');
        setPageContent('');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to save page.');
    }
  };

  const handleDeletePage = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Page Deleted', 'Page removed.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete page.');
    }
  };

  // Staff Account Management
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFirstName || !staffEmail) return;
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          first_name: staffFirstName,
          last_name: staffLastName,
          email: staffEmail,
          role: staffRole,
          password: staffPassword || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Staff Account Saved', `${staffFirstName} registered.`);
        setStaffFirstName('');
        setStaffLastName('');
        setStaffEmail('');
        setStaffPassword('');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to save staff user.');
    }
  };

  const handleDeleteStaff = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Account Deleted', 'Staff registry updated.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete staff user.');
    }
  };

  // Category & Collections Form CRUD Handlers
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
      setCatFormSort(categoriesList.length + 1);
      setCatFormActive(true);
      setIsAddingCategory(true);
    }
  };

  const openCollectionDrawer = (col: Collection | null) => {
    if (col) {
      setEditingCollection(col);
      setColFormName(col.name);
      setColFormDescription(col.description || '');
      setColFormImageUrl(col.image_url || '');
      setColFormActive(col.active);
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

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName || !catFormSlug) return;
    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          name: catFormName,
          slug: catFormSlug.toLowerCase().trim(),
          description: catFormDescription,
          image_url: catFormImageUrl,
          sort_order: catFormSort,
          active: catFormActive ? 1 : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category Saved', `${catFormName} details synced.`);
        setEditingCategory(null);
        setIsAddingCategory(false);
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to save category.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category Removed', 'Category has been deleted.');
        fetchAuxiliaryData();
      } else {
        showToast('error', 'Operation Failed', data.error || 'Failed to delete category.');
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete category.');
    }
  };

  const handleSaveCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colFormName) return;
    try {
      const url = editingCollection ? `/api/admin/collections/${editingCollection.id}` : '/api/admin/collections';
      const method = editingCollection ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          name: colFormName,
          type: 'manual',
          description: colFormDescription,
          image_url: colFormImageUrl,
          active: colFormActive ? 1 : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Collection Saved', `${colFormName} details synced.`);
        setEditingCollection(null);
        setIsAddingCollection(false);
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to save collection.');
    }
  };

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Collection Deleted', 'Removed successfully.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete collection.');
    }
  };

  // SQL Developer Terminal Query Executor
  const executeSQL = async () => {
    if (!sqlQuery.trim()) return;
    setSqlExecuting(true);
    setSqlError(null);
    setSqlResults(null);

    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSqlResults(data.data);
      } else {
        setSqlError(data.error || 'SQL execution failed.');
      }
    } catch (err: any) {
      setSqlError(err.message || 'Connection failure.');
    } finally {
      setSqlExecuting(false);
    }
  };

  // SQLite database table browser
  const handleDbRowDelete = async (id: any) => {
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
        showToast('success', 'Row Removed', `Entity ID ${id} deleted.`);
        fetchDbTableData(selectedDbTable);
      } else {
        showToast('error', 'Operation Failed', data.error);
      }
    } catch {
      showToast('error', 'Network Error', 'Connection failed.');
    }
  };

  const fetchDbTableData = async (tableName: string) => {
    if (!tableName) return;
    setDbLoading(true);
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          sql: `SELECT * FROM ${tableName} LIMIT 200`
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const results = data.data.results || [];
        setDbRows(results);
        if (results.length > 0) {
          setDbColumns(Object.keys(results[0]));
        } else {
          setDbColumns([]);
        }
      } else {
        showToast('error', 'Query Failed', data.error || 'Failed to fetch table data.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to fetch database records.');
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrder) {
      setCourierNameForm(selectedOrder.courier_name || '');
      setTrackingNumberForm(selectedOrder.tracking_number || '');
      setTrackingUrlForm(selectedOrder.tracking_url || '');
      setOrderStatusForm(selectedOrder.order_status || '');
    } else {
      setCourierNameForm('');
      setTrackingNumberForm('');
      setTrackingUrlForm('');
      setOrderStatusForm('');
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (activeTab === 'db_editor' && user) {
      fetchDbTableData(selectedDbTable);
    }
  }, [selectedDbTable, activeTab, user]);

  // Reports Builder
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const endpoint = reportType === 'sales'
        ? `/api/reports/sales?from=${reportFrom}&to=${reportTo}`
        : '/api/reports/inventory';
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setReportData(Array.isArray(data.data) ? data.data : [data.data]);
        showToast('success', 'Report Generated', 'Export data loaded.');
      }
    } catch {
      showToast('error', 'Error', 'Failed to compile report.');
    } finally {
      setReportLoading(false);
    }
  };

  // Razorpay Gateway live test
  const handleTestRazorpay = async () => {
    setTestingRzp(true);
    try {
      const res = await fetch('/api/admin/settings/test/razorpay', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Gateway Active ✅', 'Razorpay credentials validated successfully.');
      } else {
        showToast('error', 'Gateway Error ❌', data.error || 'Failed to authenticate.');
      }
    } catch {
      showToast('error', 'Network Error', 'Razorpay servers unreachable.');
    } finally {
      setTestingRzp(false);
    }
  };

  // Save Settings Config
  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ settings: settingsList })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Configuration Saved', 'Site configuration settings updated.');
        fetchAuxiliaryData();
      }
    } catch {
      showToast('error', 'Error', 'Failed to commit settings.');
    }
  };

  // Dynamic filter sets
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.toLowerCase().includes(prodSearch.toLowerCase());
      const matchCat = !prodCatFilter || p.category === prodCatFilter;
      return matchQuery && matchCat;
    });
  }, [products, prodSearch, prodCatFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchQuery = o.order_number.toLowerCase().includes(orderSearch.toLowerCase()) || o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) || o.customer_phone.includes(orderSearch);
      const matchStatus = !orderStatusFilter || o.order_status === orderStatusFilter;
      return matchQuery && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch) || c.email.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [customers, customerSearch]);

  const posProducts = useMemo(() => {
    return products.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(posSearchQuery.toLowerCase()) || p.sku.toLowerCase().includes(posSearchQuery.toLowerCase());
      const matchCat = !posCategoryFilter || p.category === posCategoryFilter;
      return p.active && matchQuery && matchCat;
    });
  }, [products, posSearchQuery, posCategoryFilter]);

  // Unauthenticated render state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col justify-center items-center px-4 font-body select-none">
        {/* Glow backgrounds */}
        <div className="absolute top-[10%] left-[10%] w-[35%] h-[35%] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0f0f0e]/90 backdrop-blur-md border border-neutral-900 rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-3">
              Staff Portal
            </div>
            <h1 className="text-3xl font-light text-white font-display italic tracking-wide">HeelsUp Console</h1>
            <p className="text-xs text-neutral-400 mt-2 font-medium">Log in with administration credentials to continue.</p>
          </div>

          {!otpRequired ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60 transition-colors"
                  placeholder="staff@heelsup.in"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 text-xs font-bold rounded-xl uppercase tracking-widest transition-all mt-6 shadow-lg shadow-amber-500/10 active:scale-[0.98] duration-200"
              >
                {loggingIn ? 'Authenticating...' : 'Enter Console'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-500 leading-relaxed mb-2">
                🔒 Two-Factor authentication enabled. A security verification code has been dispatched. Check worker log values.
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Verification OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#121211] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-center font-mono tracking-widest text-white focus:outline-none focus:border-amber-500/60 transition-colors"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 text-xs font-bold rounded-xl uppercase tracking-widest transition-all mt-4"
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
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
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
              className="p-1.5 rounded-lg bg-[#121211] border border-neutral-800 text-neutral-400 hover:text-white"
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
                className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-3 py-2 text-[10px] focus:outline-none text-white"
              />
            </div>
          )}

          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] pr-1">
            {filteredNavs.map(nav => (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === nav.id
                    ? 'bg-[#ead2ae]/10 border border-amber-500/20 text-[#ead2ae] shadow-lg'
                    : 'border border-transparent text-neutral-500 hover:text-neutral-350 hover:bg-[#121211]/30'
                }`}
              >
                {nav.icon}
                {!sidebarCollapsed && <span>{nav.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5 border-t border-neutral-900/60 flex flex-col gap-3">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 text-neutral-950 flex items-center justify-center font-bold text-xs">
                {user.name[0]}
              </div>
              <div className="overflow-hidden">
                <h5 className="text-[10px] font-bold text-white truncate leading-tight">{user.name}</h5>
                <span className="text-[9px] text-neutral-500 block uppercase tracking-wider">{user.role}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-neutral-800/80 hover:bg-[#1f0f12]/30 hover:border-rose-950/40 text-rose-400 hover:text-rose-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!sidebarCollapsed && <span>Exit Console</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Panel */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 border-b border-neutral-900/50 bg-[#070707] px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
            <span>Root Console</span>
            <ChevronRight className="w-3 h-3 text-neutral-600" />
            <span className="text-white uppercase tracking-wider text-[10px] font-bold">
              {navigationItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-xl bg-[#121211] border border-neutral-850 hover:bg-neutral-850 text-neutral-400 hover:text-white transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border border-[#070707]" />
            </button>
            <div className="h-4 w-[1px] bg-neutral-900" />
            <span className="text-[10px] font-mono text-neutral-500">SERVER: heel-live-D1</span>
          </div>
        </header>

        {/* Tab Canvas Content */}
        <div className="p-8 max-w-7xl w-full mx-auto flex-1 pb-24">
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-light text-white italic font-display">Dashboard overview</h1>
                  <p className="text-xs text-neutral-400 mt-1 font-medium">Real-time enterprise analytics and KPIs.</p>
                </div>
                <button
                  onClick={fetchDashboardStats}
                  className="px-4 py-2 border border-neutral-800 hover:bg-[#121211] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Refresh Statistics
                </button>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Revenue', val: `₹${((dashboardStats?.revenue || 0) / 100).toLocaleString('en-IN')}`, desc: 'Paid sales volume', icon: <Coins className="w-4 h-4 text-amber-500" /> },
                  { label: 'Orders Placed', val: dashboardStats?.total_orders || 0, desc: 'All incoming receipts', icon: <ShoppingCart className="w-4 h-4 text-[#ead2ae]" /> },
                  { label: 'Pending Shipments', val: dashboardStats?.confirmed || 0, desc: 'Awaiting shipping logs', icon: <ListChecks className="w-4 h-4 text-blue-400" /> },
                  { label: 'Delivered Packages', val: dashboardStats?.delivered || 0, desc: 'Successfully fulfilled', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> }
                ].map((k, i) => (
                  <div key={i} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-6 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{k.label}</span>
                      <div className="p-2 rounded-lg bg-[#121211] border border-neutral-850">{k.icon}</div>
                    </div>
                    <div className="text-2xl font-bold text-white tracking-wide">{k.val}</div>
                    <p className="text-[10px] text-neutral-500 mt-1.5 font-medium">{k.desc}</p>
                  </div>
                ))}
              </div>

              {/* Custom SVG line chart */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-neutral-900/60 pb-4 mb-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Sales & Conversions Trend</h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Interactive line aggregation chart</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Revenue (Paise)
                    </span>
                  </div>
                </div>

                <div className="h-64 flex items-end justify-between relative pt-6 px-4">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 700 240">
                    <defs>
                      <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#C9A96E" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 60, 120, 180, 240].map(y => (
                      <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#171716" strokeWidth="1" />
                    ))}
                    <path
                      d="M 20 200 Q 120 120 220 170 T 420 80 T 620 60 L 680 90"
                      fill="none"
                      stroke="#C9A96E"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 20 200 Q 120 120 220 170 T 420 80 T 620 60 L 680 90 L 680 240 L 20 240 Z"
                      fill="url(#glowGrad)"
                    />
                  </svg>
                </div>
              </div>

              {/* Recent Orders List */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-neutral-900/60 pb-4 mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recent Transactions</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:underline">
                    View All Orders
                  </button>
                </div>

                <div className="divide-y divide-neutral-900">
                  {orders.slice(0, 5).map(ord => (
                    <div key={ord.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-[#121211]/30 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#121211] border border-neutral-850 flex items-center justify-center font-bold text-[10px]">
                          {ord.order_number.slice(-4)}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{ord.customer_name}</span>
                          <span className="text-[10px] text-neutral-500 mt-0.5 block">{new Date(ord.created_at).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <span className="font-bold text-white block">₹{(ord.total_amount / 100).toLocaleString('en-IN')}</span>
                          <span className="text-[9px] text-neutral-500 uppercase block tracking-wider">{ord.payment_method}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full ${
                          ord.order_status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          ord.order_status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {ord.order_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: POS TERMINAL */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                  <div>
                    <h2 className="text-lg font-bold text-white font-display italic">Point of Sale (POS)</h2>
                    <p className="text-[10px] text-neutral-500 font-medium">In-store checkout & stock deduction.</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        value={posSearchQuery}
                        onChange={e => setPosSearchQuery(e.target.value)}
                        placeholder="Search product code/SKU..."
                        className="bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none text-white w-full md:w-48"
                      />
                    </div>
                    <select
                      value={posCategoryFilter}
                      onChange={e => setPosCategoryFilter(e.target.value)}
                      className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      {categoriesList.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {posProducts.map(p => (
                    <div key={p.id} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between h-72 hover:border-amber-500/20 transition-all shadow-sm">
                      <div className="relative rounded-xl overflow-hidden aspect-square bg-[#121211] border border-neutral-850 p-2 flex items-center justify-center">
                        <HeicImage src={p.images?.[0] || ''} alt={p.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="mt-3 space-y-1">
                        <h4 className="text-xs font-semibold text-white truncate">{p.name}</h4>
                        <span className="text-[9px] text-neutral-500 uppercase block tracking-wider truncate font-mono">SKU: {p.sku}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-white">₹{(p.price / 100).toLocaleString('en-IN')}</span>
                          <span className={`text-[8px] font-bold ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.stock} Units
                          </span>
                        </div>
                      </div>
                      {p.stock > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {p.sizes.map(sz => (
                            <button
                              key={sz}
                              onClick={() => handleAddToPosCart(p, sz)}
                              className="text-[9px] font-bold border border-neutral-800 hover:border-amber-500 hover:bg-amber-500/10 text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors"
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-rose-500/80 uppercase mt-2 text-center py-1 bg-rose-500/5 rounded-lg border border-rose-500/10">Out of Stock</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* POS Cart Summary */}
              <div className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-6 space-y-6 shadow-md self-start">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-900/60 pb-3">POS Checkout Basket</h3>

                {posCart.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500 border border-dashed border-neutral-850 rounded-xl">
                    Cart is empty. Select sizes on products to add items.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-900 max-h-[30vh] overflow-y-auto pr-1">
                    {posCart.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-[#121211] border border-neutral-850 flex-shrink-0 p-1">
                            <HeicImage src={item.product.images?.[0]} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <span className="font-semibold text-white block line-clamp-1">{item.product.name}</span>
                            <span className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5 block">Size {item.size} &middot; Qty {item.qty}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={item.customPrice || (item.product.price / 100)}
                            onChange={e => {
                              const v = Number(e.target.value);
                              setPosCart(prev => prev.map((c, i) => i === idx ? { ...c, customPrice: v } : c));
                            }}
                            className="w-16 bg-[#121211] border border-neutral-850 rounded-lg p-1 text-[10px] text-right text-white"
                          />
                          <button
                            onClick={() => handleRemoveFromPosCart(item.product.id, item.size)}
                            className="p-1 rounded-lg border border-neutral-800 hover:border-rose-950/30 text-rose-500 hover:text-rose-400 hover:bg-[#121211]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4 border-t border-neutral-900/60 pt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={posCustomerName}
                      onChange={e => setPosCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={posCustomerPhone}
                      onChange={e => setPosCustomerPhone(e.target.value)}
                      placeholder="Mobile Number"
                      className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-500 uppercase mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        value={posDiscount}
                        onChange={e => setPosDiscount(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-neutral-500 uppercase mb-1">Payment Method</label>
                      <select
                        value={posPaymentMethod}
                        onChange={e => setPosPaymentMethod(e.target.value as any)}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none"
                      >
                        <option value="cash">Cash Mode</option>
                        <option value="upi">UPI/NetBanking</option>
                        <option value="card">Card Terminal</option>
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={posRemarks}
                    onChange={e => setPosRemarks(e.target.value)}
                    placeholder="Remarks/Sale Notes"
                    className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none"
                  />
                </div>

                <div className="border-t border-neutral-900/60 pt-4 text-xs space-y-2">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span>₹{posTotals.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {posTotals.discount > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Discount Applied:</span>
                      <span>-₹{posTotals.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-dashed border-neutral-800">
                    <span>Payable Amount:</span>
                    <span className="text-[#ead2ae]">₹{posTotals.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  onClick={handlePosCheckoutSubmit}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 text-xs font-bold rounded-xl uppercase tracking-widest transition-all shadow-lg"
                >
                  Fulfill POS Order
                </button>
              </div>
            </div>
          )}

          {/* TAB: STYLES DIRECTORY (PRODUCTS) */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Product Styles</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Add, modify and synchronize catalog items.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={prodSearch}
                      onChange={e => setProdSearch(e.target.value)}
                      placeholder="Search design title/SKU..."
                      className="bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none text-white w-full md:w-48"
                    />
                  </div>
                  <select
                    value={prodCatFilter}
                    onChange={e => setProdCatFilter(e.target.value)}
                    className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => openProductDrawer(null)}
                    className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>
              </div>

              {/* Products Directory Grid */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Product</th>
                      <th className="p-4 font-bold uppercase tracking-wider">SKU</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Category</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Price</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Stock</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#121211] border border-neutral-850 p-1 flex-shrink-0">
                            <HeicImage src={p.images?.[0] || ''} alt="" className="w-full h-full object-contain" />
                          </div>
                          <span className="font-semibold text-white block line-clamp-1">{p.name}</span>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-neutral-400">{p.sku}</td>
                        <td className="p-4 text-neutral-400 capitalize">{p.category}</td>
                        <td className="p-4 text-right font-bold text-white">₹{(p.price / 100).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleQuickStockAdjust(p.id, -1)}
                              className="w-5 h-5 rounded border border-neutral-800 text-neutral-400 flex items-center justify-center hover:bg-neutral-850"
                            >
                              -
                            </button>
                            <span className="font-bold w-6 text-white">{p.stock}</span>
                            <button
                              onClick={() => handleQuickStockAdjust(p.id, 1)}
                              className="w-5 h-5 rounded border border-neutral-800 text-neutral-400 flex items-center justify-center hover:bg-neutral-850"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            p.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            {p.active ? 'Active' : 'Draft'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openProductDrawer(p)}
                            className="p-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 rounded-lg border border-neutral-800 hover:border-rose-950/30 text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right slide-out Product Drawer */}
              {(isAddingProduct || editingProduct) && (
                <div className="fixed inset-0 z-50 flex justify-end">
                  <div onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto select-none">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        {isAddingProduct ? 'Create Catalog Style' : 'Update Design Registry'}
                      </h3>
                      <button
                        onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4 flex-1">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Design Style Name</label>
                        <input
                          type="text"
                          required
                          value={prodFormName}
                          onChange={e => setProdFormName(e.target.value)}
                          placeholder="e.g. Everyday Comfort Flat Mules"
                          className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">SKU identifier</label>
                          <input
                            type="text"
                            required
                            value={prodFormSku}
                            onChange={e => setProdFormSku(e.target.value)}
                            placeholder="e.g. HU-FL-100"
                            className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Product Category</label>
                          <select
                            value={prodFormCategory}
                            onChange={e => setProdFormCategory(e.target.value)}
                            className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                          >
                            {categoriesList.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Price (₹)</label>
                          <input
                            type="number"
                            required
                            value={prodFormPrice}
                            onChange={e => setProdFormPrice(Number(e.target.value))}
                            className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Original Price / MRP (₹)</label>
                          <input
                            type="number"
                            value={prodFormMrp}
                            onChange={e => setProdFormMrp(Number(e.target.value))}
                            className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Stock Level</label>
                          <input
                            type="number"
                            value={prodFormStock}
                            onChange={e => setProdFormStock(Number(e.target.value))}
                            className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Available Sizes</label>
                        <div className="flex flex-wrap gap-2">
                          {['35', '36', '37', '38', '39', '40', '41', '42'].map(sz => {
                            const active = prodFormSizes.includes(sz);
                            return (
                              <button
                                type="button"
                                key={sz}
                                onClick={() => {
                                  setProdFormSizes(prev => active ? prev.filter(s => s !== sz) : [...prev, sz]);
                                }}
                                className={`h-8 w-10 font-bold rounded-lg border text-[10px] transition-colors ${
                                  active ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-neutral-850 text-neutral-500 hover:border-neutral-800'
                                }`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Product Media (Images)</label>
                        <div className="border-2 border-dashed border-neutral-850 rounded-xl p-4 text-center hover:border-neutral-800 transition-colors relative">
                          <input
                            type="file"
                            onChange={e => handleImageUpload(e, setProdFormImages, prodFormImages)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <UploadCloud className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
                          <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                            {uploadingImage ? 'Uploading assets...' : 'Choose image to upload'}
                          </span>
                        </div>
                        {prodFormImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-2.5 mt-3">
                            {prodFormImages.map((imgUrl, i) => (
                              <div key={i} className="relative rounded-lg border border-neutral-850 overflow-hidden aspect-square bg-[#121211] p-1">
                                <HeicImage src={imgUrl} alt="" className="w-full h-full object-contain" />
                                <button
                                  type="button"
                                  onClick={() => setProdFormImages(prev => prev.filter((_, idx) => idx !== i))}
                                  className="absolute top-1 right-1 p-0.5 bg-rose-500 rounded-md text-white hover:bg-rose-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-neutral-900 pt-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={prodFormActive}
                            onChange={e => setProdFormActive(e.target.checked)}
                            className="rounded border-neutral-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-950"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-white block uppercase tracking-wider">Active Status</span>
                            <span className="text-[9px] text-neutral-500 font-medium block">Publish design online</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={prodFormFeatured}
                            onChange={e => setProdFormFeatured(e.target.checked)}
                            className="rounded border-neutral-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-950"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-white block uppercase tracking-wider">Featured item</span>
                            <span className="text-[9px] text-neutral-500 font-medium block">Show on trending arrivals</span>
                          </div>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest transition-all mt-6 shadow-md"
                      >
                        Commit Changes
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Categories</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Group styles into active taxonomy sets.</p>
                </div>
                <button
                  onClick={() => openCategoryDrawer(null)}
                  className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </div>

              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Name</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Slug</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Description</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Order</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {categoriesList.map(c => (
                      <tr key={c.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 font-semibold text-white">{c.name}</td>
                        <td className="p-4 font-mono text-neutral-400">{c.slug}</td>
                        <td className="p-4 text-neutral-400 truncate max-w-xs">{c.description || 'N/A'}</td>
                        <td className="p-4 text-center text-white">{c.sort_order}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            c.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            {c.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openCategoryDrawer(c)}
                            className="p-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1.5 rounded-lg border border-neutral-800 hover:border-rose-950/30 text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right slide-out Category Drawer */}
              {(isAddingCategory || editingCategory) && (
                <div className="fixed inset-0 z-50 flex justify-end">
                  <div onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        {isAddingCategory ? 'Add Category' : 'Edit Category'}
                      </h3>
                      <button
                        onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-500 hover:text-white"
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
                            className="rounded border-neutral-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-950"
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
                </div>
              )}
            </div>
          )}

          {/* TAB: COLLECTIONS */}
          {activeTab === 'collections' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Collections</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Group styles into smart collection lists.</p>
                </div>
                <button
                  onClick={() => openCollectionDrawer(null)}
                  className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Collection
                </button>
              </div>

              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Collection Name</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Type</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Description</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {collectionsList.map(col => (
                      <tr key={col.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 font-semibold text-white">{col.name}</td>
                        <td className="p-4 font-mono text-neutral-400 uppercase text-[9px] tracking-wider">{col.type}</td>
                        <td className="p-4 text-neutral-400 truncate max-w-xs">{col.description || 'N/A'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            col.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            {col.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openCollectionDrawer(col)}
                            className="p-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCollection(col.id)}
                            className="p-1.5 rounded-lg border border-neutral-800 hover:border-rose-950/30 text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right slide-out Collection Drawer */}
              {(isAddingCollection || editingCollection) && (
                <div className="fixed inset-0 z-50 flex justify-end">
                  <div onClick={() => { setIsAddingCollection(false); setEditingCollection(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        {isAddingCollection ? 'Add Collection' : 'Edit Collection'}
                      </h3>
                      <button
                        onClick={() => { setIsAddingCollection(false); setEditingCollection(null); }}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-500 hover:text-white"
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
                          className="rounded border-neutral-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-950"
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
                </div>
              )}
            </div>
          )}

          {/* TAB: ONLINE ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Online Orders Log</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Moderate web orders, tracking details, and shipment status.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      placeholder="Search Order / Name / Phone..."
                      className="bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none text-white w-full md:w-56"
                    />
                  </div>

                  <select
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value)}
                    className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs focus:outline-none text-white w-full md:w-40"
                  >
                    <option value="">All Statuses</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Order No.</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Customer</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Date</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Total</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Payment</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500 font-medium">
                          No matching orders found in the registry.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(ord => (
                        <tr key={ord.id} className="hover:bg-[#121211]/25 transition-colors">
                          <td className="p-4 font-mono font-bold text-[#ead2ae]">
                            {ord.order_number}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-white block">{ord.customer_name}</span>
                            <span className="text-[10px] text-neutral-500 mt-0.5 block">{ord.customer_phone}</span>
                          </td>
                          <td className="p-4 text-neutral-400">
                            {new Date(ord.created_at).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 text-right font-bold text-white">
                            ₹{(ord.total_amount / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                              ord.payment_status?.toLowerCase() === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {ord.payment_status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full ${
                              ord.order_status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              ord.order_status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              ord.order_status === 'shipped' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              ord.order_status === 'confirmed' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {ord.order_status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="px-2.5 py-1 rounded-lg border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-white transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right slide-out Order Detail Drawer */}
              {selectedOrder && (
                <div className="fixed inset-0 z-50 flex justify-end">
                  <div onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <div className="w-full max-w-xl bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">Order Details</h3>
                        <span className="text-[10px] font-mono text-amber-500 mt-1 block">{selectedOrder.order_number}</span>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-6 flex-1">
                      <div className="bg-[#121211]/50 border border-neutral-900 rounded-xl p-4 space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Customer & Order Info</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-neutral-500 block">Name</span>
                            <span className="text-white font-semibold">{selectedOrder.customer_name}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block">Phone</span>
                            <span className="text-white font-semibold">{selectedOrder.customer_phone}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-neutral-500 block">Email</span>
                            <span className="text-white font-semibold truncate block">{selectedOrder.customer_email || 'N/A'}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-neutral-500 block">Order Date</span>
                            <span className="text-white font-semibold">{new Date(selectedOrder.created_at).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#121211]/50 border border-neutral-900 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Shipping Address</h4>
                        <p className="text-xs text-white leading-relaxed font-medium">
                          {selectedOrder.address_line1}
                          {selectedOrder.address_line2 && <span className="block">{selectedOrder.address_line2}</span>}
                          <span className="block mt-1 text-neutral-300">
                            {selectedOrder.city}, {selectedOrder.state} - <span className="font-mono">{selectedOrder.pincode}</span>
                          </span>
                        </p>
                        {selectedOrder.notes && (
                          <div className="mt-3 pt-2 border-t border-neutral-900/60">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 block">Order Notes</span>
                            <p className="text-xs text-neutral-400 mt-1 italic">"{selectedOrder.notes}"</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-[#121211]/50 border border-neutral-900 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Order Items</h4>
                        <div className="divide-y divide-neutral-900/60 space-y-3">
                          {selectedOrder.items && selectedOrder.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-3 pt-3 first:pt-0">
                              <div className="w-12 h-12 bg-[#070707] border border-neutral-850 rounded-lg overflow-hidden flex items-center justify-center">
                                {it.image ? (
                                  <HeicImage
                                    src={it.image}
                                    alt={it.product_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-neutral-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-white block">{it.product_name}</span>
                                <span className="text-[10px] text-neutral-500 mt-1 block">Size: <span className="text-amber-500 font-bold">{it.size}</span> | Qty: {it.quantity}</span>
                              </div>
                              <span className="text-xs font-bold text-white">₹{((it.price * it.quantity) / 100).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-neutral-900 space-y-2 text-xs text-neutral-400">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="text-white">₹{(selectedOrder.subtotal_amount / 100).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span>Discount</span>
                            <span>- ₹{(selectedOrder.discount_amount / 100).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping</span>
                            <span className="text-white">₹{(selectedOrder.shipping_amount / 100).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-neutral-900/80">
                            <span className="text-[#ead2ae] font-display">Grand Total</span>
                            <span>₹{(selectedOrder.total_amount / 100).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#121211]/50 border border-neutral-900 rounded-xl p-4 space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Courier & Tracking Information</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Courier Partner</label>
                            <input
                              type="text"
                              value={courierNameForm}
                              onChange={e => setCourierNameForm(e.target.value)}
                              placeholder="e.g. Delhivery, Bluedart"
                              className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Tracking Number</label>
                            <input
                              type="text"
                              value={trackingNumberForm}
                              onChange={e => setTrackingNumberForm(e.target.value)}
                              placeholder="e.g. AW12993881"
                              className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Tracking URL link</label>
                          <input
                            type="text"
                            value={trackingUrlForm}
                            onChange={e => setTrackingUrlForm(e.target.value)}
                            placeholder="e.g. https://delhivery.com/track?id=..."
                            className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveOrderTracking(selectedOrder.id, orderStatusForm, courierNameForm, trackingNumberForm, trackingUrlForm)}
                          className="w-full py-2.5 bg-neutral-900 hover:bg-[#151514] border border-neutral-850 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest transition-colors"
                        >
                          Sync Courier Details
                        </button>
                      </div>

                      <div className="bg-[#121211]/50 border border-neutral-900 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Order Operations</h4>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1.5">Change Order Status</label>
                            <select
                              value={orderStatusForm}
                              onChange={e => setOrderStatusForm(e.target.value)}
                              className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            >
                              <option value={selectedOrder.order_status}>{selectedOrder.order_status} (Current)</option>
                              {getAllowedStatusTransitions(selectedOrder.order_status).map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            disabled={orderStatusForm === selectedOrder.order_status}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, orderStatusForm)}
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Update Status
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CUSTOMERS LOG */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Customers Registry</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Verify buyer accounts and order statistics.</p>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Search name/email/phone..."
                    className="bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none text-white w-full md:w-56"
                  />
                </div>
              </div>

              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Customer Name</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Email Address</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Mobile Number</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">Orders Count</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Total Spent</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 font-semibold text-white">{c.name}</td>
                        <td className="p-4 text-neutral-400">{c.email}</td>
                        <td className="p-4 font-mono text-neutral-400">{c.phone || 'N/A'}</td>
                        <td className="p-4 text-center text-white font-bold">{c.orders_count || 0}</td>
                        <td className="p-4 text-right font-bold text-white">₹{((c.total_spent || 0) / 100).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right text-neutral-500">{new Date(c.registered_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: INVENTORY CENTER */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <h2 className="text-lg font-bold text-white font-display italic">Inventory Center</h2>
                <p className="text-[10px] text-neutral-500 font-medium">Quick stock adjustments and logging.</p>
              </div>

              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Style Details</th>
                      <th className="p-4 font-bold uppercase tracking-wider">SKU</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Category</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-center">In-Stock units</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Quick Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 font-semibold text-white">{p.name}</td>
                        <td className="p-4 font-mono text-[10px] text-neutral-400">{p.sku}</td>
                        <td className="p-4 text-neutral-400 capitalize">{p.category}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg font-bold text-xs ${
                            p.stock <= 2 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-neutral-900 text-white border border-neutral-850'
                          }`}>
                            {p.stock} Units
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleQuickStockAdjust(p.id, -5)}
                            className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white text-[10px] font-bold"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleQuickStockAdjust(p.id, -1)}
                            className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white text-[10px] font-bold"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleQuickStockAdjust(p.id, 1)}
                            className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white text-[10px] font-bold"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleQuickStockAdjust(p.id, 5)}
                            className="px-2 py-1 rounded bg-[#ead2ae]/10 border border-[#ead2ae]/25 text-[#ead2ae] hover:bg-[#ead2ae]/20 text-[10px] font-bold"
                          >
                            +5
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PROMOS & COUPONS */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              <div className="lg:col-span-8 bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <span className="block text-[9px] font-bold text-neutral-500 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                  Active Promo Codes
                </span>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Promo Code</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Type</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Value</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Min Order</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {couponsList.map(cp => (
                      <tr key={cp.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 font-mono font-bold text-white select-all">{cp.code}</td>
                        <td className="p-4 capitalize text-neutral-400">{cp.discount_type}</td>
                        <td className="p-4 text-white font-semibold">
                          {cp.discount_type === 'percentage' ? `${cp.discount_value}%` : `₹${cp.discount_value}`}
                        </td>
                        <td className="p-4 text-right text-neutral-400">₹{cp.min_purchase || 0}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(cp.id)}
                            className="p-1 rounded bg-[#121211] border border-neutral-800 text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Coupon Form */}
              <div className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Create Promo Code</h3>
                <div className="h-[1px] bg-neutral-900" />
                <form onSubmit={handleSaveCoupon} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Promo Code String</label>
                    <input
                      type="text"
                      required
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      placeholder="e.g. FREE999"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Discount Type</label>
                      <select
                        value={couponType}
                        onChange={e => setCouponType(e.target.value as any)}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="fixed">Fixed INR</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Value</label>
                      <input
                        type="number"
                        required
                        value={couponVal}
                        onChange={e => setCouponVal(Number(e.target.value))}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Min Order Requirement (₹)</label>
                    <input
                      type="number"
                      required
                      value={couponMin}
                      onChange={e => setCouponMin(Number(e.target.value))}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-2"
                  >
                    Activate Coupon
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: BANNERS SLIDESHOW */}
          {activeTab === 'banners' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bannersList.map(bn => (
                    <div key={bn.id} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-sm relative group h-52">
                      <HeicImage src={bn.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <div>
                          <h4 className="text-sm font-bold text-white">{bn.title || 'Slideshow Title'}</h4>
                          <span className="text-[10px] text-[#ead2ae] font-semibold block mt-0.5">{bn.subtitle}</span>
                          <span className="text-[8px] text-neutral-400 font-mono mt-1 block">Redirect: {bn.link}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteBanner(bn.id)}
                          className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-rose-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Banner Form */}
              <div className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Add Slideshow Banner</h3>
                <div className="h-[1px] bg-neutral-900" />
                <form onSubmit={handleSaveBanner} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Banner Title</label>
                    <input
                      type="text"
                      value={bannerTitle}
                      onChange={e => setBannerTitle(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Sub-heading</label>
                    <input
                      type="text"
                      value={bannerSub}
                      onChange={e => setBannerSub(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Banner Image URL</label>
                    <input
                      type="text"
                      required
                      value={bannerImg}
                      onChange={e => setBannerImg(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Redirect Query Route</label>
                    <input
                      type="text"
                      value={bannerLink}
                      onChange={e => setBannerLink(e.target.value)}
                      placeholder="/shop?cat=heels"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-2"
                  >
                    Add Slideshow Slide
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <h2 className="text-lg font-bold text-white font-display italic">Reviews Moderation</h2>
                <p className="text-[10px] text-neutral-500 font-medium">Verify customer testimonials before listing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviewsList.map(rev => (
                  <div key={rev.id} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4 border-b border-neutral-900 pb-3.5 mb-3.5">
                        <div>
                          <h4 className="text-xs font-bold text-white">{rev.reviewer_name}</h4>
                          <span className="text-[9px] text-neutral-500 font-mono mt-0.5 block">Product: {rev.product_name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500' : 'text-neutral-800'}`} />
                          ))}
                        </div>
                      </div>
                      <h5 className="text-xs font-bold text-neutral-350">{rev.title}</h5>
                      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed italic">"{rev.body}"</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-neutral-900 pt-4 mt-4 text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-neutral-500">{new Date(rev.created_at).toLocaleDateString('en-IN')}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApproveReview(rev.id, !rev.approved)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-[9px] uppercase tracking-wider transition-colors ${
                            rev.approved
                              ? 'border-emerald-900/40 bg-emerald-500/10 text-emerald-400 hover:bg-neutral-950 hover:text-rose-400 hover:border-neutral-800'
                              : 'border-amber-900/40 bg-amber-500/10 text-amber-400 hover:bg-emerald-500 hover:text-neutral-950 hover:border-transparent'
                          }`}
                        >
                          {rev.approved ? 'Approved' : 'Pending Action'}
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1.5 rounded-lg border border-neutral-800 text-rose-500 hover:text-rose-400 hover:bg-[#121211] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: STATIC POLICY PAGES */}
          {activeTab === 'pages' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              <div className="lg:col-span-8 bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <span className="block text-[9px] font-bold text-neutral-500 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                  Site Policy Pages
                </span>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Page Title</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Slug URL</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {pagesList.map(pg => (
                      <tr key={pg.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 font-semibold text-white">{pg.title}</td>
                        <td className="p-4 font-mono text-neutral-400">/pages/{pg.slug}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeletePage(pg.id)}
                            className="p-1 rounded bg-[#121211] border border-neutral-800 text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Custom page form */}
              <div className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Create Policy Page</h3>
                <div className="h-[1px] bg-neutral-900" />
                <form onSubmit={handleSavePage} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Page Title</label>
                    <input
                      type="text"
                      required
                      value={pageTitle}
                      onChange={e => setPageTitle(e.target.value)}
                      placeholder="e.g. Terms of Service"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Slug path URL</label>
                    <input
                      type="text"
                      required
                      value={pageSlug}
                      onChange={e => setPageSlug(e.target.value)}
                      placeholder="e.g. terms"
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Page Content (HTML/Text)</label>
                    <textarea
                      required
                      value={pageContent}
                      onChange={e => setPageContent(e.target.value)}
                      rows={5}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-2"
                  >
                    Commit Page
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: STAFF ACCOUNTS */}
          {activeTab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              <div className="lg:col-span-8 bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <span className="block text-[9px] font-bold text-neutral-500 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                  Staff Members Directory
                </span>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                      <th className="p-4 font-bold uppercase tracking-wider">Staff Name</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Email Address</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Role Permissions</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60">
                    {staffList.map(st => (
                      <tr key={st.id} className="hover:bg-[#121211]/25 transition-colors">
                        <td className="p-4 font-semibold text-white">{st.first_name} {st.last_name}</td>
                        <td className="p-4 text-neutral-400">{st.email}</td>
                        <td className="p-4 text-neutral-400 capitalize">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            st.role === 'admin' ? 'bg-amber-500/10 text-[#ead2ae]' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            {st.role}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteStaff(st.id)}
                            className="p-1 rounded bg-[#121211] border border-neutral-800 text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Staff Form */}
              <div className="lg:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Create Staff User</h3>
                <div className="h-[1px] bg-neutral-900" />
                <form onSubmit={handleSaveStaff} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={staffFirstName}
                        onChange={e => setStaffFirstName(e.target.value)}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Last Name</label>
                      <input
                        type="text"
                        value={staffLastName}
                        onChange={e => setStaffLastName(e.target.value)}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={staffEmail}
                      onChange={e => setStaffEmail(e.target.value)}
                      className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Role Type</label>
                      <select
                        value={staffRole}
                        onChange={e => setStaffRole(e.target.value as any)}
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="staff">Staff Mode</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Password</label>
                      <input
                        type="password"
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value)}
                        placeholder="Fallback: HeelsUp@2026"
                        className="w-full bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest mt-2"
                  >
                    Create Member
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: DATABASE EDITOR */}
          {activeTab === 'db_editor' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">D1 SQLite Browser</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Read/write raw database values directly.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={selectedDbTable}
                    onChange={e => setSelectedDbTable(e.target.value)}
                    className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {dbTablesList.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Developer SQL Runner */}
              <div className="bg-[#0b0b0a] border border-neutral-900 rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-900/60 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Developer SQL console</h3>
                  <span className="text-[8px] font-bold text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 uppercase tracking-wider">Execute queries directly</span>
                </div>
                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM products WHERE stock < 5;"
                  className="w-full bg-[#050505] border border-neutral-900 rounded-xl p-4 font-mono text-[11px] text-[#ead2ae] focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={executeSQL}
                  disabled={sqlExecuting}
                  className="px-6 py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5"
                >
                  <Activity className="w-4 h-4" /> {sqlExecuting ? 'Running Query...' : 'Execute SQL'}
                </button>

                {sqlError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono">
                    ⚠️ {sqlError}
                  </div>
                )}

                {sqlResults && (
                  <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#070707] space-y-2.5">
                    <span className="block text-[8px] font-bold text-neutral-500 p-3 bg-[#121211]/60 uppercase tracking-wider border-b border-neutral-900">
                      Query Results ({sqlResults.results?.length || 0} rows found)
                    </span>
                    <div className="overflow-x-auto max-h-64 p-3.5">
                      <table className="w-full text-[10px] text-left border-collapse font-mono">
                        <thead>
                          <tr className="border-b border-neutral-850 text-neutral-400">
                            {sqlResults.results?.[0] && Object.keys(sqlResults.results[0]).map(k => (
                              <th key={k} className="p-2 font-bold uppercase tracking-wider">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900/60">
                          {sqlResults.results?.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-[#121211]/30">
                              {Object.keys(row).map(k => (
                                <td key={k} className="p-2 text-neutral-300 max-w-xs truncate">{String(row[k] ?? 'NULL')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Db editor table view */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <span className="block text-[9px] font-bold text-neutral-500 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                  Data Viewer: {selectedDbTable} (Showing last 500 rows)
                </span>
                {dbLoading ? (
                  <div className="py-24 text-center text-xs text-neutral-500">Loading DB rows...</div>
                ) : (
                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[10px] text-left border-collapse font-mono">
                      <thead>
                        <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                          {dbColumns.map(col => (
                            <th key={col} className="p-3 font-bold uppercase tracking-wider">{col}</th>
                          ))}
                          <th className="p-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/60">
                        {dbRows.map((row, i) => (
                          <tr key={i} className="hover:bg-[#121211]/25 transition-colors">
                            {dbColumns.map(col => (
                              <td key={col} className="p-3 text-neutral-300 max-w-xs truncate">{String(row[col] ?? 'NULL')}</td>
                            ))}
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDbRowDelete(row.id)}
                                className="p-1 text-rose-500 hover:bg-[#121211] hover:text-rose-400 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ENTERPRISE REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white font-display italic">Enterprise Reports</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Export sales or inventory summaries.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value as any)}
                    className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="sales">Sales Volume Report</option>
                    <option value="inventory">Inventory Log Summary</option>
                  </select>
                  {reportType === 'sales' && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <input
                        type="date"
                        value={reportFrom}
                        onChange={e => setReportFrom(e.target.value)}
                        className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-1.5 text-white"
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={reportTo}
                        onChange={e => setReportTo(e.target.value)}
                        className="bg-[#121211] border border-neutral-850 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleGenerateReport}
                    className="px-4 py-2 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  >
                    Generate Report
                  </button>
                </div>
              </div>

              {/* Reports tabular data */}
              <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
                <span className="block text-[9px] font-bold text-neutral-500 p-4 bg-[#121211]/80 uppercase tracking-wider border-b border-neutral-900">
                  Compiled Dataset ({reportData.length} entries)
                </span>
                {reportLoading ? (
                  <div className="py-24 text-center text-xs text-neutral-500">Compiling database tables...</div>
                ) : reportData.length === 0 ? (
                  <div className="py-24 text-center text-xs text-neutral-500 border border-dashed border-neutral-850 m-4 rounded-xl">
                    No report generated yet. Choose parameters above and click "Generate".
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-xs text-left border-collapse font-mono">
                      <thead>
                        <tr className="bg-[#121211]/80 text-neutral-400 border-b border-neutral-900">
                          {Object.keys(reportData[0] || {}).map(k => (
                            <th key={k} className="p-3 font-bold uppercase tracking-wider">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/60">
                        {reportData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#121211]/25 transition-colors text-white">
                            {Object.keys(row).map(k => (
                              <td key={k} className="p-3 max-w-xs truncate">{String(row[k] ?? '0')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Gateway config */}
                <div className="md:col-span-8 space-y-6">
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
                        className="px-6 py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors"
                      >
                        Save Credentials
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

                <div className="md:col-span-4 bg-[#0f0f0e] border border-neutral-900 p-6 rounded-2xl space-y-4 shadow-md self-start">
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

      {/* Category CRUD side drawer */}
      {(isAddingCategory || editingCategory) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
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
                    className="rounded border-neutral-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-950"
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
        </div>
      )}

      {/* Collection CRUD side drawer */}
      {(isAddingCollection || editingCollection) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => { setIsAddingCollection(false); setEditingCollection(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="w-full max-w-lg bg-[#0e0e0d] border-l border-neutral-900 shadow-2xl relative z-10 p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
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
                  className="rounded border-neutral-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-950"
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
        </div>
      )}
    </div>
  );
}