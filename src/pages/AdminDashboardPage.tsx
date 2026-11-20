import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  ShoppingCart,
  Package,
  Layers,
  Warehouse,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Copy,
  Edit3,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Menu,
  X,
  Sun,
  Moon,
  ExternalLink,
  Upload,
  Archive,
  RotateCcw,
  Link2,
} from 'lucide-react';
import type {
  ActivityLog,
  Category,
  ContactMessage,
  Coupon,
  DashboardData,
  Expense,
  Order,
  Product,
  StockHistoryItem,
} from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, downloadAuthenticatedBlob, uploadImageFile } from '../lib/api.ts';
import { downloadJsonFile, exportToCsv, formatBDT, formatDateShort, formatDateTime } from '../lib/format.ts';
import { AdminProductModal } from '../components/AdminProductModal.tsx';
import { OfflineIndicator, PWAInstallButton } from '../components/PWAInstallButton.tsx';

type AdminTab =
  | 'overview'
  | 'payments'
  | 'orders'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'reports'
  | 'settings';

export function AdminDashboardPage() {
  const {
    user,
    logout,
    navigate,
    theme,
    toggleTheme,
    settings,
    refreshSettings,
    categories,
    refreshCategories,
    refreshProducts,
    toast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const saved = localStorage.getItem('phb_admin_tab') as AdminTab | null;
    const valid: AdminTab[] = ['overview', 'payments', 'orders', 'products', 'categories', 'inventory', 'customers', 'reports', 'settings'];
    return saved && valid.includes(saved) ? saved : 'overview';
  });
  useEffect(() => {
    localStorage.setItem('phb_admin_tab', activeTab);
  }, [activeTab]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [chartRange, setChartRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printMode, setPrintMode] = useState<'invoice' | 'packing' | null>(null);
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);

  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [productBrandFilter, setProductBrandFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'Active' | 'Draft' | 'Out of Stock'>('all');
  const [productSort, setProductSort] = useState<'newest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'>('newest');
  const [productPage, setProductPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deletingProductLoading, setDeletingProductLoading] = useState(false);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImg, setNewCatImg] = useState('');

  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percent' | 'fixed'>('percent');
  const [newCouponVal, setNewCouponVal] = useState('10');
  const [newCouponMin, setNewCouponMin] = useState('1000');

  const [stockHistory, setStockHistory] = useState<StockHistoryItem[]>([]);
  const [adjustProdId, setAdjustProdId] = useState<number>(0);
  const [adjustVariantKey, setAdjustVariantKey] = useState('');
  const [adjustQty, setAdjustQty] = useState('0');
  const [adjustReason, setAdjustReason] = useState('Warehouse Restock');

  const [customers, setCustomers] = useState<
    {
      id: number;
      name: string;
      email: string;
      phone: string;
      district: string;
      area: string;
      status: string;
      order_count: number;
      total_spent: number;
      created_at: string;
    }[]
  >([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('Courier & Logistics');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));

  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportData, setReportData] = useState<{
    summary: {
      totalOrders: number;
      validOrders: number;
      cancelledOrReturned: number;
      revenue: number;
      cogs: number;
      expenses: number;
      netProfit: number;
    };
    paymentBreakdown: Record<string, number>;
  } | null>(null);

  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [downloadingFullWebsite, setDownloadingFullWebsite] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');

  const loadAllAdminData = useCallback(async () => {
    try {
      const [dash, ords, prods, coups, hist, custs, msgs, exps, logs] = await Promise.all([
        apiFetch<DashboardData>('/api/admin/dashboard'),
        apiFetch<Order[]>('/api/admin/orders'),
        apiFetch<{ products: Product[] }>('/api/products?includeDrafts=1&limit=100'),
        apiFetch<Coupon[]>('/api/admin/coupons'),
        apiFetch<StockHistoryItem[]>('/api/admin/inventory/history'),
        apiFetch<typeof customers>('/api/admin/customers'),
        apiFetch<ContactMessage[]>('/api/admin/messages'),
        apiFetch<Expense[]>('/api/admin/expenses'),
        apiFetch<ActivityLog[]>('/api/admin/activity-logs'),
      ]);
      setDashboard(dash);
      setOrders(ords);
      setAdminProducts(prods.products);
      setCoupons(coups);
      setStockHistory(hist);
      setCustomers(custs);
      setMessages(msgs);
      setExpenses(exps);
      setActivityLogs(logs);
      if (prods.products.length > 0 && adjustProdId === 0) {
        const first = prods.products[0];
        setAdjustProdId(first.id);
        const firstKey = Object.keys(first.variant_stock || {})[0] || '';
        setAdjustVariantKey(firstKey);
        setAdjustQty(String(firstKey ? first.variant_stock[firstKey] : first.stock_quantity));
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load admin data', 'error');
    }
  }, [adjustProdId, toast]);

  useEffect(() => {
    if (user?.role === 'admin' && !user.must_change_password) {
      loadAllAdminData();
    }
  }, [user, loadAllAdminData]);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const loadReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (reportFrom) params.set('from', reportFrom);
      if (reportTo) params.set('to', reportTo);
      const data = await apiFetch<typeof reportData>(`/api/admin/reports?${params.toString()}`);
      setReportData(data);
    } catch {
      // ignore
    }
  }, [reportFrom, reportTo]);

  useEffect(() => {
    if (activeTab === 'reports' && user?.role === 'admin') {
      loadReports();
    }
  }, [activeTab, loadReports, user]);

  // Redirect guard if not authenticated admin
  if (!user || user.role !== 'admin' || user.must_change_password) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Administrator Access Required</h1>
        <p className="text-sm text-zinc-500">Sign in via the secure Admin Portal to continue.</p>
        <button
          type="button"
          onClick={() => navigate('/admin/login')}
          className="px-6 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
        >
          Go to Admin Login
        </button>
      </div>
    );
  }

  const handleVerifyPayment = async (orderId: number, action: 'approve' | 'reject') => {
    try {
      const updated = await apiFetch<Order>(`/api/admin/orders/${orderId}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
      toast(action === 'approve' ? 'Payment approved and marked Verified.' : 'Payment rejected.');
      loadAllAdminData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Verification failed', 'error');
    }
  };

  const handleUpdateOrder = async (
    orderId: number,
    patch: { order_status?: string; courier_name?: string; tracking_number?: string; admin_note?: string; refund_status?: string }
  ) => {
    try {
      const updated = await apiFetch<Order>(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
      toast('Order updated.');
      loadAllAdminData();
      refreshProducts();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleDuplicateProduct = async (id: number) => {
    try {
      await apiFetch(`/api/admin/products/${id}/duplicate`, { method: 'POST' });
      toast('Product duplicated as Draft.');
      await Promise.all([loadAllAdminData(), refreshProducts()]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Duplicate failed', 'error');
    }
  };

  const handleToggleProductStatus = async (p: Product) => {
    try {
      const next = p.status === 'Draft' ? 'Active' : 'Draft';
      await apiFetch(`/api/admin/products/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      });
      toast(`Product ${next === 'Active' ? 'published' : 'set to Draft (Inactive)'}.`);
      await Promise.all([loadAllAdminData(), refreshProducts()]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      setDeletingProductLoading(true);
      const removedName = deletingProduct.name;
      await apiFetch(`/api/admin/products/${deletingProduct.id}`, { method: 'DELETE' });
      setDeletingProduct(null);
      setProductPage(1);
      toast(`"${removedName}" deleted from catalog.`);
      await Promise.all([loadAllAdminData(), refreshProducts()]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeletingProductLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const saved = await apiFetch<Record<string, string>>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      setSettingsForm(saved);
      await refreshSettings();
      toast('All website & payment settings saved.');
      loadAllAdminData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      const data = await apiFetch<Record<string, unknown>>('/api/admin/backup');
      downloadJsonFile(`product-hub-bd-full-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
      toast('Complete store database backup (.JSON) downloaded.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Backup failed', 'error');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleDownloadFullWebsite = async () => {
    try {
      setDownloadingFullWebsite(true);
      const filename = await downloadAuthenticatedBlob(
        '/api/admin/full-website-archive',
        `product-hub-bd-complete-website-${new Date().toISOString().slice(0, 10)}.zip`
      );
      toast(`Complete website archive (${filename}) downloaded!`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Full website download failed', 'error');
    } finally {
      setDownloadingFullWebsite(false);
    }
  };

  const handleRestoreBackup = async (file: File) => {
    try {
      setRestoringBackup(true);
      let payload: unknown;
      if (file.name.toLowerCase().endsWith('.zip')) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Failed to read ZIP file'));
          reader.readAsDataURL(file);
        });
        payload = { zipBase64: base64 };
      } else {
        const text = await file.text();
        payload = JSON.parse(text);
      }

      const res = await apiFetch<{
        ok: boolean;
        restored: { settings: number; categories: number; products: number; orders: number; uploadedFiles: number };
      }>('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await Promise.all([refreshSettings(), refreshCategories(), refreshProducts(), loadAllAdminData()]);
      toast(
        `Restored ${res.restored.products} products, ${res.restored.categories} categories, ${res.restored.orders} orders, ${res.restored.settings} settings.`
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Restore failed', 'error');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleCopyWebsiteLink = async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      toast(`Store link copied: ${url}`);
    } catch {
      toast(`Bookmark this address: ${url}`, 'info');
    }
  };

  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'payments',
      label: 'Payment Verify',
      icon: CreditCard,
      badge: dashboard?.orders.pendingPaymentsCount || 0,
    },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories & Coupons', icon: Layers },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Warehouse,
      badge: (dashboard?.catalog.lowStockCount || 0) + (dashboard?.catalog.outOfStockCount || 0),
    },
    { id: 'customers', label: 'Customers & Inbox', icon: Users },
    { id: 'reports', label: 'Reports & Profit', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Security', icon: SettingsIcon },
  ];

  const manualPaymentOrders = orders.filter((o) => o.payment_method === 'bKash' || o.payment_method === 'Nagad');

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.order_status !== orderStatusFilter) return false;
    if (paymentStatusFilter !== 'all' && o.payment_status !== paymentStatusFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      return (
        o.order_id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        (o.transaction_id || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const productBrands = Array.from(new Set(adminProducts.map((p) => p.brand).filter(Boolean))).sort();
  const productCategoryOptions = Array.from(
    new Set([...categories.map((c) => c.name), ...adminProducts.map((p) => p.category)].filter(Boolean))
  ).sort();

  const filteredProducts = adminProducts
    .filter((p) => {
      if (productCatFilter !== 'all' && p.category !== productCatFilter) return false;
      if (productBrandFilter !== 'all' && p.brand !== productBrandFilter) return false;
      if (productStatusFilter !== 'all' && p.status !== productStatusFilter) return false;
      if (productStockFilter === 'out_of_stock' && p.stock_quantity > 0) return false;
      if (
        productStockFilter === 'low_stock' &&
        (p.stock_quantity <= 0 || p.stock_quantity > (p.low_stock_threshold || 5))
      ) {
        return false;
      }
      if (productStockFilter === 'in_stock' && p.stock_quantity <= (p.low_stock_threshold || 5)) return false;

      if (productSearch.trim()) {
        const q = productSearch.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.product_code || '').toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (productSort === 'price_asc') return a.effective_price - b.effective_price;
      if (productSort === 'price_desc') return b.effective_price - a.effective_price;
      if (productSort === 'stock_asc') return a.stock_quantity - b.stock_quantity;
      if (productSort === 'stock_desc') return b.stock_quantity - a.stock_quantity;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id;
    });

  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / 10));
  const safeProductPage = Math.min(productPage, productTotalPages);
  const paginatedAdminProducts = filteredProducts.slice((safeProductPage - 1) * 10, safeProductPage * 10);

  const activeChartSeries = dashboard?.charts[chartRange] || [];
  const maxChartRev = Math.max(1, ...activeChartSeries.map((c) => Number(c.revenue || 0)));

  return (
    <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#0B0D10] text-zinc-900 dark:text-zinc-100 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white dark:bg-[#111318] border-r border-zinc-200 dark:border-zinc-800 no-print">
        <div className="h-16 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} className="font-display font-bold text-sm tracking-tight">
            PRODUCT HUB BD
          </button>
          <span className="text-[11px] font-mono text-[#0F6E56] dark:text-[#14B8A6]">Admin</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                  active
                    ? 'bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                      active ? 'bg-black/20 text-white dark:text-zinc-950' : 'bg-amber-500/20 text-amber-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> View Storefront
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 w-64 bg-white dark:bg-[#111318] h-full p-4 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="font-display font-bold text-sm">Admin Menu</span>
              <button type="button" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    activeTab === item.id
                      ? 'bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-16 py-2 px-4 sm:px-8 bg-white dark:bg-[#111318] border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-zinc-200 dark:border-zinc-800"
            >
              <Menu className="w-4 h-4" />
            </button>
            <p className="text-xs sm:text-sm text-zinc-500">
              Admin / <span className="font-semibold text-zinc-950 dark:text-white capitalize">{activeTab}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden xl:inline text-xs text-zinc-500 mr-1">Signed in as {user.username || user.name}</span>
            <PWAInstallButton />
            <button
              type="button"
              onClick={handleCopyWebsiteLink}
              title="Copy your store URL for bookmarking"
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </button>
            <button
              type="button"
              disabled={downloadingFullWebsite}
              onClick={handleDownloadFullWebsite}
              title="Download entire website: Database (.sqlite + .json), Excel CSVs, All Uploaded Images/Videos & Source Code (.zip)"
              className="px-3.5 py-1.5 rounded-lg border border-[#0F6E56] dark:border-[#14B8A6] bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15 text-[#0F6E56] dark:text-[#14B8A6] hover:bg-[#0F6E56] hover:text-white dark:hover:bg-[#14B8A6] dark:hover:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                {downloadingFullWebsite ? 'Packaging Website...' : 'Download Full Website (.ZIP)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Product
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={loadAllAdminData}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
            >
              Refresh
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-8 space-y-8 flex-1 overflow-x-hidden no-print">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && dashboard && (
            <div className="space-y-8">
              <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-950 dark:text-white">
                    Complete Website Backup, Restore &amp; Quick Access
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Download everything (.ZIP), restore saved backups (.JSON / .ZIP) anytime, or install &amp; bookmark the store.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{restoringBackup ? 'Restoring...' : 'Restore Backup (.JSON / .ZIP)'}</span>
                    <input
                      type="file"
                      accept=".json,.zip,application/json,application/zip"
                      className="hidden"
                      disabled={restoringBackup}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleRestoreBackup(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={downloadingBackup}
                    onClick={handleDownloadBackup}
                    className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingBackup ? 'Exporting...' : 'Data Only (.JSON)'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={downloadingFullWebsite}
                    onClick={handleDownloadFullWebsite}
                    className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{downloadingFullWebsite ? 'Packaging...' : 'Download Full Website (.ZIP)'}</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500">Live Active Visitors</p>
                  <p className="font-mono text-2xl font-bold tabular-nums text-[#0F6E56] dark:text-[#14B8A6] mt-1">
                    {dashboard.visitors.liveActive}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Today: {dashboard.visitors.today} · Total: {dashboard.visitors.total}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500">Total Page Views</p>
                  <p className="font-mono text-2xl font-bold tabular-nums mt-1">{dashboard.visitors.pageViews}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Customers: {dashboard.customers.totalCustomers} · Products: {dashboard.catalog.totalProducts}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500">Total Sales</p>
                  <p className="font-mono text-2xl font-bold tabular-nums mt-1">
                    {formatBDT(dashboard.financials.totalSales)}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Estimated Profit: {formatBDT(dashboard.financials.estimatedProfit)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500">Total Orders</p>
                  <p className="font-mono text-2xl font-bold tabular-nums mt-1">{dashboard.orders.totalOrders}</p>
                  <p className="text-[11px] text-amber-500 mt-1">
                    Pending Payment Verify: {dashboard.orders.pendingPaymentsCount}
                  </p>
                </div>
              </div>

              {/* Order Status Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {Object.entries(dashboard.orders.statusCounts).map(([st, count]) => (
                  <div
                    key={st}
                    className="p-3 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800"
                  >
                    <p className="text-[11px] text-zinc-500">{st}</p>
                    <p className="font-mono text-lg font-bold tabular-nums mt-0.5">{count}</p>
                  </div>
                ))}
              </div>

              {/* Real Database Sales Chart */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">Sales &amp; Order Analytics</h2>
                    <p className="text-xs text-zinc-500">Calculated directly from live database order records.</p>
                  </div>
                  <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setChartRange(r)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold capitalize ${
                          chartRange === r ? 'bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950' : ''
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {activeChartSeries.length === 0 ? (
                  <p className="py-10 text-center text-xs text-zinc-500">
                    No orders recorded in this period yet. Place a test order in checkout to see real-time analytics.
                  </p>
                ) : (
                  <div className="flex items-end gap-4 h-48 pt-6 overflow-x-auto">
                    {activeChartSeries.map((pt) => {
                      const pct = Math.max(8, Math.round((Number(pt.revenue) / maxChartRev) * 100));
                      return (
                        <div key={pt.label} className="flex-1 min-w-[60px] flex flex-col items-center gap-2 h-full justify-end">
                          <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                            {formatBDT(pt.revenue)}
                          </span>
                          <div
                            className="w-full max-w-[44px] rounded-t-md bg-[#0F6E56] dark:bg-[#14B8A6]"
                            style={{ height: `${pct}%` }}
                            title={`${pt.label}: ${pt.orders} orders (${formatBDT(pt.revenue)})`}
                          />
                          <span className="font-mono text-[10px] text-zinc-500 truncate max-w-full">{pt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Low Stock & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h3 className="font-display text-base font-bold">Low &amp; Out-of-Stock Alerts</h3>
                  {dashboard.catalog.lowStockProducts.length === 0 &&
                  dashboard.catalog.outOfStockProducts.length === 0 ? (
                    <p className="text-xs text-zinc-500">All products have healthy inventory levels.</p>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      {[...dashboard.catalog.outOfStockProducts, ...dashboard.catalog.lowStockProducts]
                        .slice(0, 6)
                        .map((p) => (
                          <div key={p.id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{p.name}</p>
                              <p className="font-mono text-zinc-500">{p.sku}</p>
                            </div>
                            <span
                              className={`font-mono font-bold ${
                                p.stock_quantity === 0 ? 'text-red-500' : 'text-amber-500'
                              }`}
                            >
                              {p.stock_quantity} left
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h3 className="font-display text-base font-bold">Top Performing Products</h3>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    {dashboard.topProducts.map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={p.image} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{p.name}</p>
                            <p className="font-mono text-zinc-500">{p.sku}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-semibold">{p.sales_count} sold</p>
                          <p className="font-mono text-zinc-500">{formatBDT(p.effective_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. MANUAL PAYMENT VERIFICATION CENTER */}
          {activeTab === 'payments' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold">Manual bKash &amp; Nagad Verification</h1>
                  <p className="text-xs text-zinc-500 mt-1">
                    Inspect customer sender numbers, Transaction IDs, and payment screenshots before approving orders.
                  </p>
                </div>
                <div className="text-xs font-mono text-zinc-500">
                  Configured bKash: <strong>{settings.bkash_number}</strong> · Nagad:{' '}
                  <strong>{settings.nagad_number}</strong>
                </div>
              </div>

              {manualPaymentOrders.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
                  No manual bKash or Nagad payment orders submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {manualPaymentOrders.map((o) => (
                    <div
                      key={o.id}
                      className="p-5 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm font-bold">{o.order_id}</span>
                          <span className="font-semibold text-[#0F6E56] dark:text-[#14B8A6]">{o.payment_method}</span>
                          <span
                            className={`font-semibold ${
                              o.payment_status === 'Payment Verified'
                                ? 'text-[#14B8A6]'
                                : o.payment_status === 'Payment Rejected'
                                  ? 'text-red-500'
                                  : 'text-amber-500'
                            }`}
                          >
                            {o.payment_status}
                          </span>
                        </div>
                        <p className="text-zinc-500">
                          Customer: <strong>{o.customer_name}</strong> ({o.customer_phone}) ·{' '}
                          {formatDateTime(o.created_at)}
                        </p>
                        <p className="font-mono">
                          Sender: <strong>{o.sender_number || '—'}</strong> · TrxID:{' '}
                          <strong className="text-zinc-950 dark:text-white">{o.transaction_id || '—'}</strong> · Paid to:{' '}
                          {o.payment_number}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-base font-bold tabular-nums mr-2">
                          {formatBDT(o.total_amount)}
                        </span>
                        {o.payment_screenshot && (
                          <button
                            type="button"
                            onClick={() => setScreenshotModalUrl(o.payment_screenshot)}
                            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-medium inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Proof
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={o.payment_status === 'Payment Verified'}
                          onClick={() => handleVerifyPayment(o.id, 'approve')}
                          className="px-3.5 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={o.payment_status === 'Payment Rejected'}
                          onClick={() => handleVerifyPayment(o.id, 'reject')}
                          className="px-3.5 py-2 rounded-lg bg-red-600/15 text-red-500 border border-red-500/30 font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. ORDERS & INVOICES */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-2xl font-bold">Order Management</h1>
                <button
                  type="button"
                  onClick={() =>
                    exportToCsv(
                      'orders-report.csv',
                      ['Order ID', 'Date', 'Customer', 'Phone', 'Payment', 'Payment Status', 'Order Status', 'Total'],
                      filteredOrders.map((o) => [
                        o.order_id,
                        o.created_at,
                        o.customer_name,
                        o.customer_phone,
                        o.payment_method,
                        o.payment_status,
                        o.order_status,
                        o.total_amount,
                      ])
                    )
                  }
                  className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order ID, customer name, phone, or TrxID..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700"
                >
                  <option value="all">All Order Statuses</option>
                  {['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Payment Verified">Payment Verified</option>
                  <option value="Payment Rejected">Payment Rejected</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14171D]">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Order Status</th>
                      <th className="p-3.5 text-right">Total</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          No orders match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                          <td className="p-3.5 font-mono font-semibold">{o.order_id}</td>
                          <td className="p-3.5">
                            <p className="font-medium">{o.customer_name}</p>
                            <p className="font-mono text-zinc-500">{o.customer_phone}</p>
                          </td>
                          <td className="p-3.5">
                            <p>{o.payment_method}</p>
                            <p
                              className={
                                o.payment_status === 'Payment Verified'
                                  ? 'text-[#14B8A6]'
                                  : o.payment_status === 'Pending Verification'
                                    ? 'text-amber-500'
                                    : o.payment_status === 'Payment Rejected'
                                      ? 'text-red-500'
                                      : 'text-zinc-500'
                              }
                            >
                              {o.payment_status}
                            </p>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={o.order_status}
                              onChange={(e) => handleUpdateOrder(o.id, { order_status: e.target.value })}
                              className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                            >
                              {[
                                'Pending',
                                'Confirmed',
                                'Processing',
                                'Packed',
                                'Shipped',
                                'Delivered',
                                'Cancelled',
                                'Returned',
                              ].map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold tabular-nums">
                            {formatBDT(o.total_amount)}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(o)}
                              className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-medium"
                            >
                              Manage
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(o);
                                setPrintMode('invoice');
                                setTimeout(() => window.print(), 120);
                              }}
                              className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-medium inline-flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" /> Print
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. PRODUCTS MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-bold">
                    Product Catalog ({filteredProducts.length}
                    {filteredProducts.length !== adminProducts.length ? ` of ${adminProducts.length}` : ''})
                  </h1>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Add, edit, duplicate, inspect, or delete products with instant storefront sync.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      exportToCsv(
                        'products-catalog.csv',
                        ['Product ID', 'SKU', 'Name', 'Category', 'Brand', 'Regular Price', 'Discount Price', 'Stock', 'Status', 'Date Added'],
                        filteredProducts.map((p) => [
                          p.product_code || `PHB-${p.id}`,
                          p.sku,
                          p.name,
                          p.category,
                          p.brand,
                          p.regular_price,
                          p.sale_price ?? '',
                          p.stock_quantity,
                          p.status,
                          p.created_at,
                        ])
                      )
                    }
                    className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add New Product
                  </button>
                </div>
              </div>

              {/* Search, Filter & Sort Toolbar */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductPage(1);
                    }}
                    placeholder="Search by Product Name, Product ID, or SKU..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>

                <select
                  value={productCatFilter}
                  onChange={(e) => {
                    setProductCatFilter(e.target.value);
                    setProductPage(1);
                  }}
                  aria-label="Filter by category"
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                >
                  <option value="all">All Categories</option>
                  {productCategoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={productBrandFilter}
                  onChange={(e) => {
                    setProductBrandFilter(e.target.value);
                    setProductPage(1);
                  }}
                  aria-label="Filter by brand"
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                >
                  <option value="all">All Brands</option>
                  {productBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                <select
                  value={productStockFilter}
                  onChange={(e) => {
                    setProductStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock');
                    setProductPage(1);
                  }}
                  aria-label="Filter by stock status"
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                >
                  <option value="all">All Stock Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>

                <select
                  value={productStatusFilter}
                  onChange={(e) => {
                    setProductStatusFilter(e.target.value as 'all' | 'Active' | 'Draft' | 'Out of Stock');
                    setProductPage(1);
                  }}
                  aria-label="Filter by product status"
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                >
                  <option value="all">Active &amp; Inactive</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Inactive (Draft)</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>

                <div className="flex gap-2">
                  <select
                    value={productSort}
                    onChange={(e) => {
                      setProductSort(
                        e.target.value as 'newest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'
                      );
                      setProductPage(1);
                    }}
                    aria-label="Sort products"
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="stock_asc">Stock: Low to High</option>
                    <option value="stock_desc">Stock: High to Low</option>
                  </select>
                  {(productSearch ||
                    productCatFilter !== 'all' ||
                    productBrandFilter !== 'all' ||
                    productStockFilter !== 'all' ||
                    productStatusFilter !== 'all' ||
                    productSort !== 'newest') && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setProductCatFilter('all');
                        setProductBrandFilter('all');
                        setProductStockFilter('all');
                        setProductStatusFilter('all');
                        setProductSort('newest');
                        setProductPage(1);
                      }}
                      title="Reset filters"
                      className="px-2.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14171D]">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-zinc-50/70 dark:bg-zinc-900/40">
                    <tr>
                      <th className="p-3.5">Product Image</th>
                      <th className="p-3.5">Product Name</th>
                      <th className="p-3.5">Product ID</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5 text-right">Regular Price</th>
                      <th className="p-3.5 text-right">Discount Price</th>
                      <th className="p-3.5 text-right">Stock</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Date Added</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {paginatedAdminProducts.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-10 text-center text-zinc-500">
                          No products match your search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedAdminProducts.map((p) => {
                        const hasDiscount = p.sale_price !== null && p.sale_price < p.regular_price;
                        const lowLimit = p.low_stock_threshold || 5;
                        const stockClass =
                          p.stock_quantity <= 0
                            ? 'text-red-500'
                            : p.stock_quantity <= lowLimit
                              ? 'text-amber-500'
                              : 'text-[#0F6E56] dark:text-[#14B8A6]';
                        return (
                          <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                            <td className="p-3.5">
                              {p.images[0] ? (
                                <img
                                  src={p.images[0]}
                                  alt={p.name}
                                  className="w-11 h-11 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">
                                  No Img
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 max-w-[220px]">
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{p.name}</p>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {p.brand}
                                {p.pieces_info ? ` · ${p.pieces_info}` : ''}
                              </p>
                            </td>
                            <td className="p-3.5 font-mono whitespace-nowrap">
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {p.product_code || `PHB-${p.id}`}
                              </p>
                              <p className="text-[11px] text-zinc-500">{p.sku}</p>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <p>{p.category}</p>
                              {p.subcategory && <p className="text-[11px] text-zinc-500">{p.subcategory}</p>}
                            </td>
                            <td className="p-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                              <span className={hasDiscount ? 'line-through text-zinc-400' : 'font-semibold'}>
                                {formatBDT(p.regular_price)}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                              {hasDiscount ? (
                                <span className="font-bold text-[#0F6E56] dark:text-[#14B8A6]">
                                  {formatBDT(p.sale_price!)}
                                </span>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                            <td className={`p-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap ${stockClass}`}>
                              {p.stock_quantity}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleProductStatus(p)}
                                title="Click to toggle Active / Inactive (Draft)"
                                className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                  p.status === 'Active'
                                    ? 'bg-[#14B8A6]/15 text-[#0F6E56] dark:text-[#14B8A6]'
                                    : p.status === 'Out of Stock'
                                      ? 'bg-red-500/15 text-red-500'
                                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                {p.status === 'Draft' ? 'Inactive (Draft)' : p.status}
                              </button>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                              {formatDateShort(p.created_at)}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/product/${p.id}`)}
                                  title="View product on storefront"
                                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] inline-flex items-center gap-1 text-[11px] font-medium"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct(p)}
                                  title="Edit product"
                                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] inline-flex items-center gap-1 text-[11px] font-medium"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateProduct(p.id)}
                                  title="Duplicate product"
                                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] inline-flex items-center gap-1 text-[11px] font-medium"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingProduct(p)}
                                  title="Delete product"
                                  className="px-2 py-1 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 inline-flex items-center gap-1 text-[11px] font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {productTotalPages > 1 && (
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    disabled={safeProductPage <= 1}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1.5 font-mono">
                    {safeProductPage} / {productTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeProductPage >= productTotalPages}
                    onClick={() => setProductPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. CATEGORIES & COUPONS */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Categories */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5">
                <h2 className="font-display text-lg font-bold">Categories Management</h2>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {categories.map((c: Category) => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-zinc-500">{c.subcategories.join(', ') || 'No subcategories'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                          toast('Category deleted.');
                          refreshCategories();
                        }}
                        className="p-1.5 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/categories', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: newCatName,
                        subcategories: newCatSubs
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                        description: newCatDesc,
                        image: newCatImg || '/src/assets/images/product_oxford_shirt_1795097543187.jpg',
                      }),
                    });
                    setNewCatName('');
                    setNewCatSubs('');
                    setNewCatDesc('');
                    setNewCatImg('');
                    toast('Category created.');
                    refreshCategories();
                  }}
                  className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 text-xs"
                >
                  <p className="font-semibold">Add Category</p>
                  <input
                    type="text"
                    required
                    placeholder="Category Name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    placeholder="Subcategories (comma separated)"
                    value={newCatSubs}
                    onChange={(e) => setNewCatSubs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
                  >
                    Create Category
                  </button>
                </form>
              </div>

              {/* Coupons */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5">
                <h2 className="font-display text-lg font-bold">Discount Coupons</h2>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {coupons.map((cp) => (
                    <div key={cp.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono font-bold text-sm">{cp.code}</p>
                        <p className="text-zinc-500">
                          {cp.discount_type === 'percent' ? `${cp.discount_value}% off` : `${formatBDT(cp.discount_value)} off`} ·
                          Min {formatBDT(cp.min_order)} · Used {cp.usage_count}x
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/coupons/${cp.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ is_active: !cp.is_active }),
                            });
                            loadAllAdminData();
                          }}
                          className={`px-2.5 py-1 rounded font-semibold ${
                            cp.is_active ? 'bg-[#14B8A6]/15 text-[#14B8A6]' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {cp.is_active ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/coupons/${cp.id}`, { method: 'DELETE' });
                            loadAllAdminData();
                          }}
                          className="p-1 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/coupons', {
                      method: 'POST',
                      body: JSON.stringify({
                        code: newCouponCode,
                        discount_type: newCouponType,
                        discount_value: Number(newCouponVal),
                        min_order: Number(newCouponMin),
                      }),
                    });
                    setNewCouponCode('');
                    toast('Coupon created.');
                    loadAllAdminData();
                  }}
                  className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 text-xs"
                >
                  <p className="font-semibold">Create Coupon</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Code (e.g. EID20)"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value as 'percent' | 'fixed')}
                      className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    >
                      <option value="percent">Percent (%)</option>
                      <option value="fixed">Fixed (৳)</option>
                    </select>
                    <input
                      type="number"
                      required
                      placeholder="Value"
                      value={newCouponVal}
                      onChange={(e) => setNewCouponVal(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Min Order (৳)"
                      value={newCouponMin}
                      onChange={(e) => setNewCouponMin(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
                  >
                    Add Coupon
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 6. INVENTORY & STOCK HISTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
                <h2 className="font-display text-lg font-bold">Adjust Size / Color Stock</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/inventory/adjust', {
                      method: 'POST',
                      body: JSON.stringify({
                        productId: adjustProdId,
                        variantKey: adjustVariantKey,
                        newVariantQty: Number(adjustQty),
                        reason: adjustReason,
                      }),
                    });
                    toast('Stock updated and logged.');
                    loadAllAdminData();
                    refreshProducts();
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
                >
                  <div>
                    <label className="block text-zinc-500 mb-1">Product</label>
                    <select
                      value={adjustProdId}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        setAdjustProdId(pid);
                        const prod = adminProducts.find((p) => p.id === pid);
                        const firstKey = prod ? Object.keys(prod.variant_stock || {})[0] || '' : '';
                        setAdjustVariantKey(firstKey);
                        if (prod) {
                          setAdjustQty(String(firstKey ? prod.variant_stock[firstKey] : prod.stock_quantity));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    >
                      {adminProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Size / Color Variant</label>
                    <select
                      value={adjustVariantKey}
                      onChange={(e) => {
                        setAdjustVariantKey(e.target.value);
                        const prod = adminProducts.find((p) => p.id === adjustProdId);
                        if (prod) setAdjustQty(String(prod.variant_stock[e.target.value] ?? 0));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    >
                      {Object.keys(adminProducts.find((p) => p.id === adjustProdId)?.variant_stock || {}).map((k) => (
                        <option key={k} value={k}>
                          {k.replace('|', ' / ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">New Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="Reason"
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold shrink-0"
                    >
                      Update
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14171D] overflow-x-auto">
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 font-display font-bold text-sm">
                  Stock Adjustment Audit History
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Product / SKU</th>
                      <th className="p-3">Variant</th>
                      <th className="p-3 text-right">Change</th>
                      <th className="p-3 text-right">New Stock</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {stockHistory.map((h) => (
                      <tr key={h.id}>
                        <td className="p-3 font-mono text-zinc-500">{formatDateTime(h.created_at)}</td>
                        <td className="p-3">
                          {h.product_name} <span className="font-mono text-zinc-500">({h.sku})</span>
                        </td>
                        <td className="p-3 font-mono">{h.variant_key.replace('|', ' / ')}</td>
                        <td
                          className={`p-3 text-right font-mono font-bold tabular-nums ${
                            h.change_amount > 0 ? 'text-[#14B8A6]' : 'text-red-500'
                          }`}
                        >
                          {h.change_amount > 0 ? `+${h.change_amount}` : h.change_amount}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums">{h.new_stock}</td>
                        <td className="p-3">{h.reason}</td>
                        <td className="p-3 font-mono">{h.admin_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. CUSTOMERS & INBOX */}
          {activeTab === 'customers' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="font-display text-2xl font-bold">Customers ({customers.length})</h1>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer..."
                    className="px-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                </div>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14171D]">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                      <tr>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Phone</th>
                        <th className="p-3.5">Location</th>
                        <th className="p-3.5 text-right">Orders</th>
                        <th className="p-3.5 text-right">Total Spent</th>
                        <th className="p-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {customers
                        .filter(
                          (c) =>
                            !customerSearch.trim() ||
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.email.toLowerCase().includes(customerSearch.toLowerCase())
                        )
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="p-3.5">
                              <p className="font-semibold">{c.name}</p>
                              <p className="text-zinc-500">{c.email}</p>
                            </td>
                            <td className="p-3.5 font-mono">{c.phone || '—'}</td>
                            <td className="p-3.5">{[c.area, c.district].filter(Boolean).join(', ') || '—'}</td>
                            <td className="p-3.5 text-right font-mono tabular-nums">{c.order_count}</td>
                            <td className="p-3.5 text-right font-mono tabular-nums">{formatBDT(c.total_spent)}</td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  const next = c.status === 'active' ? 'suspended' : 'active';
                                  await apiFetch(`/api/admin/customers/${c.id}/status`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ status: next }),
                                  });
                                  loadAllAdminData();
                                }}
                                className={`px-2.5 py-1 rounded font-semibold ${
                                  c.status === 'active' ? 'text-[#14B8A6]' : 'text-red-500'
                                }`}
                              >
                                {c.status}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Support Inquiries */}
              <div className="space-y-3">
                <h2 className="font-display text-lg font-bold">Customer Support Inquiries ({messages.length})</h2>
                {messages.length === 0 ? (
                  <p className="text-xs text-zinc-500">No support messages received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{m.subject}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/messages/${m.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ status: m.status === 'Open' ? 'Resolved' : 'Open' }),
                              });
                              loadAllAdminData();
                            }}
                            className={`px-2.5 py-1 rounded font-semibold ${
                              m.status === 'Resolved' ? 'text-[#14B8A6]' : 'text-amber-500'
                            }`}
                          >
                            {m.status}
                          </button>
                        </div>
                        <p className="text-zinc-500">
                          From: {m.name} ({m.email} {m.phone ? `· ${m.phone}` : ''}) · {formatDateTime(m.created_at)}
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. REPORTS & EXPENSES */}
          {activeTab === 'reports' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-bold">Financial Reports &amp; Profit</h1>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={reportFrom}
                    onChange={(e) => setReportFrom(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={reportTo}
                    onChange={(e) => setReportTo(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / PDF
                  </button>
                </div>
              </div>

              {reportData && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">Gross Revenue</p>
                    <p className="font-mono text-2xl font-bold tabular-nums mt-1">
                      {formatBDT(reportData.summary.revenue)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">Cost of Goods (COGS)</p>
                    <p className="font-mono text-2xl font-bold tabular-nums mt-1">
                      {formatBDT(reportData.summary.cogs)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">Operational Expenses</p>
                    <p className="font-mono text-2xl font-bold tabular-nums mt-1">
                      {formatBDT(reportData.summary.expenses)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">Net Estimated Profit</p>
                    <p className="font-mono text-2xl font-bold tabular-nums text-[#14B8A6] mt-1">
                      {formatBDT(reportData.summary.netProfit)}
                    </p>
                  </div>
                </div>
              )}

              {/* Expenses Ledger */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5">
                <h2 className="font-display text-lg font-bold">Operational Expenses Ledger</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/expenses', {
                      method: 'POST',
                      body: JSON.stringify({
                        title: expTitle,
                        category: expCategory,
                        amount: Number(expAmount),
                        expense_date: expDate,
                      }),
                    });
                    setExpTitle('');
                    setExpAmount('');
                    toast('Expense recorded.');
                    loadAllAdminData();
                    loadReports();
                  }}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs"
                >
                  <input
                    type="text"
                    required
                    placeholder="Expense title"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    placeholder="Category"
                    className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Amount (৳)"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="flex-1 px-2 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </form>

                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {expenses.map((ex) => (
                    <div key={ex.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{ex.title}</p>
                        <p className="text-zinc-500">
                          {ex.category} · {ex.expense_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold tabular-nums">{formatBDT(ex.amount)}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/expenses/${ex.id}`, { method: 'DELETE' });
                            loadAllAdminData();
                            loadReports();
                          }}
                          className="text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. SETTINGS, PAYMENT NUMBERS, BACKUP & SECURITY */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Complete Data Export & Backup Center */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">Download, Restore &amp; Save Website</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Download everything at once (.ZIP), restore from any saved .JSON or .ZIP backup, or copy your direct store URL.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
                      <RotateCcw className="w-4 h-4" />
                      <span>{restoringBackup ? 'Restoring...' : 'Restore (.JSON / .ZIP)'}</span>
                      <input
                        type="file"
                        accept=".json,.zip,application/json,application/zip"
                        className="hidden"
                        disabled={restoringBackup}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleRestoreBackup(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={downloadingBackup}
                      onClick={handleDownloadBackup}
                      className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloadingBackup ? 'Preparing JSON...' : 'Download Data (.JSON)'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={downloadingFullWebsite}
                      onClick={handleDownloadFullWebsite}
                      className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>{downloadingFullWebsite ? 'Packaging Website...' : 'Download Full Website (.ZIP)'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      exportToCsv(
                        `products-${new Date().toISOString().slice(0, 10)}.csv`,
                        ['ID', 'Code', 'SKU', 'Name', 'Category', 'Brand', 'Regular Price', 'Sale Price', 'Stock', 'Status'],
                        adminProducts.map((p) => [
                          p.id,
                          p.product_code,
                          p.sku,
                          p.name,
                          p.category,
                          p.brand,
                          p.regular_price,
                          p.sale_price ?? '',
                          p.stock_quantity,
                          p.status,
                        ])
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] font-medium inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Products (.CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportToCsv(
                        `orders-${new Date().toISOString().slice(0, 10)}.csv`,
                        ['Order ID', 'Customer', 'Phone', 'District', 'Total', 'Method', 'Payment Status', 'Order Status', 'TrxID', 'Date'],
                        orders.map((o) => [
                          o.order_id,
                          o.customer_name,
                          o.customer_phone,
                          o.district,
                          o.total_amount,
                          o.payment_method,
                          o.payment_status,
                          o.order_status,
                          o.transaction_id || '',
                          o.created_at,
                        ])
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] font-medium inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Orders (.CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportToCsv(
                        `customers-${new Date().toISOString().slice(0, 10)}.csv`,
                        ['ID', 'Name', 'Email', 'Phone', 'District', 'Area', 'Orders', 'Total Spent', 'Status', 'Joined'],
                        customers.map((c) => [
                          c.id,
                          c.name,
                          c.email,
                          c.phone,
                          c.district,
                          c.area,
                          c.order_count,
                          c.total_spent,
                          c.status,
                          c.created_at,
                        ])
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] font-medium inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Customers (.CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportToCsv(
                        `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
                        ['ID', 'Title', 'Category', 'Amount', 'Date', 'Note'],
                        expenses.map((ex) => [ex.id, ex.title, ex.category, ex.amount, ex.expense_date, ex.note])
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] font-medium inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Expenses (.CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportToCsv(
                        `stock-history-${new Date().toISOString().slice(0, 10)}.csv`,
                        ['ID', 'SKU', 'Product', 'Variant', 'Change', 'Prev Stock', 'New Stock', 'Reason', 'Actor', 'Date'],
                        stockHistory.map((h) => [
                          h.id,
                          h.sku,
                          h.product_name,
                          h.variant_key,
                          h.change_amount,
                          h.previous_stock,
                          h.new_stock,
                          h.reason,
                          h.admin_name,
                          h.created_at,
                        ])
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] font-medium inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Stock History (.CSV)
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h1 className="font-display text-2xl font-bold">Website &amp; Payment Settings</h1>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Every storefront branding, payment, delivery, SEO, contact, and policy setting is managed here.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold"
                  >
                    {savingSettings ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>

                {/* 1. Personal bKash / Nagad & COD + Delivery & Tax */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <h2 className="font-display font-bold text-base text-[#0F6E56] dark:text-[#14B8A6]">
                    Payments, Delivery Charges &amp; Tax
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-500 mb-1">Personal bKash Number (Send Money)</label>
                      <input
                        type="text"
                        value={settingsForm.bkash_number ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, bkash_number: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Personal Nagad Number (Send Money)</label>
                      <input
                        type="text"
                        value={settingsForm.nagad_number ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, nagad_number: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <input
                        id="cod_toggle"
                        type="checkbox"
                        checked={settingsForm.cod_enabled === 'true'}
                        onChange={(e) =>
                          setSettingsForm((p) => ({ ...p, cod_enabled: e.target.checked ? 'true' : 'false' }))
                        }
                      />
                      <label htmlFor="cod_toggle" className="font-semibold cursor-pointer">
                        Enable Cash on Delivery
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-500 mb-1">Delivery Inside Dhaka (৳)</label>
                      <input
                        type="number"
                        min={0}
                        value={settingsForm.delivery_charge_dhaka ?? '70'}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, delivery_charge_dhaka: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Delivery Outside Dhaka (৳)</label>
                      <input
                        type="number"
                        min={0}
                        value={settingsForm.delivery_charge_outside ?? '130'}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, delivery_charge_outside: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Free Delivery Over (৳, 0 = Off)</label>
                      <input
                        type="number"
                        min={0}
                        value={settingsForm.free_delivery_threshold ?? '5000'}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, free_delivery_threshold: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Tax / VAT Rate (%)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={settingsForm.tax_rate_percent ?? '0'}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, tax_rate_percent: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Brand Identity, Logo, Favicon & Promo Strip */}
                <div className="space-y-3">
                  <h2 className="font-display font-bold text-base">Brand Identity &amp; Header</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-500 mb-1">Website Name</label>
                      <input
                        type="text"
                        value={settingsForm.site_name ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, site_name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Site Tagline</label>
                      <input
                        type="text"
                        value={settingsForm.site_tagline ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, site_tagline: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Logo Image URL or Upload</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsForm.site_logo ?? ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, site_logo: e.target.value }))}
                          placeholder="Optional custom logo URL"
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                        />
                        <label className="cursor-pointer px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 inline-flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const url = await uploadImageFile(f, 'logo');
                              setSettingsForm((p) => ({ ...p, site_logo: url }));
                              toast('Logo uploaded. Click Save All Settings to apply.');
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Favicon URL or Upload</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsForm.favicon_url ?? ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, favicon_url: e.target.value }))}
                          placeholder="Optional browser tab icon URL"
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                        />
                        <label className="cursor-pointer px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 inline-flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const url = await uploadImageFile(f, 'favicon');
                              setSettingsForm((p) => ({ ...p, favicon_url: url }));
                              toast('Favicon uploaded. Click Save All Settings to apply.');
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-zinc-500 mb-1">Top Announcement Strip (Leave empty to hide)</label>
                      <input
                        type="text"
                        value={settingsForm.promo_banner_text ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, promo_banner_text: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Homepage Banners & Copy */}
                <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="font-display font-bold text-base">Homepage Hero &amp; Secondary Banners</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-500 mb-1">Hero Banner Image URL or Upload</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsForm.hero_banner ?? ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, hero_banner: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                        />
                        <label className="cursor-pointer px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 inline-flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const url = await uploadImageFile(f, 'hero');
                              setSettingsForm((p) => ({ ...p, hero_banner: url }));
                              toast('Hero banner uploaded. Click Save All Settings to apply.');
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Hero CTA Button Text</label>
                      <input
                        type="text"
                        value={settingsForm.hero_cta_text ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, hero_cta_text: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Hero Headline</label>
                      <input
                        type="text"
                        value={settingsForm.hero_title ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, hero_title: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Hero Subtitle</label>
                      <input
                        type="text"
                        value={settingsForm.hero_subtitle ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, hero_subtitle: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Secondary Banner Image URL or Upload</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsForm.secondary_banner ?? ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, secondary_banner: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                        />
                        <label className="cursor-pointer px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 inline-flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const url = await uploadImageFile(f, 'secondary-banner');
                              setSettingsForm((p) => ({ ...p, secondary_banner: url }));
                              toast('Secondary banner uploaded. Click Save All Settings to apply.');
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Secondary Banner Headline</label>
                      <input
                        type="text"
                        value={settingsForm.secondary_title ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, secondary_title: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-zinc-500 mb-1">Secondary Banner Subtitle</label>
                      <input
                        type="text"
                        value={settingsForm.secondary_subtitle ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, secondary_subtitle: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Contact, Store Address, Social Links & Footer */}
                <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="font-display font-bold text-base">Contact, Social Links &amp; Footer</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-500 mb-1">WhatsApp Number</label>
                      <input
                        type="text"
                        value={settingsForm.whatsapp_number ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, whatsapp_number: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Support Phone</label>
                      <input
                        type="text"
                        value={settingsForm.support_phone ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, support_phone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Support Email</label>
                      <input
                        type="email"
                        value={settingsForm.support_email ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, support_email: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Store Address</label>
                      <input
                        type="text"
                        value={settingsForm.store_address ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, store_address: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Facebook Page URL</label>
                      <input
                        type="url"
                        value={settingsForm.social_facebook ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, social_facebook: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Instagram Profile URL</label>
                      <input
                        type="url"
                        value={settingsForm.social_instagram ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, social_instagram: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">YouTube Channel URL</label>
                      <input
                        type="url"
                        value={settingsForm.social_youtube ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, social_youtube: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Footer Description Text</label>
                      <input
                        type="text"
                        value={settingsForm.footer_text ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, footer_text: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. SEO Metadata */}
                <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="font-display font-bold text-base">SEO &amp; Browser Metadata</h2>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div>
                      <label className="block text-zinc-500 mb-1">SEO Page Title</label>
                      <input
                        type="text"
                        value={settingsForm.seo_title ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, seo_title: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">SEO Meta Description</label>
                      <textarea
                        rows={2}
                        value={settingsForm.seo_description ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, seo_description: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Store Pages & Policies */}
                <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="font-display font-bold text-base">About &amp; Store Policy Pages</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-zinc-500 mb-1">About Us Content (/about)</label>
                      <textarea
                        rows={3}
                        value={settingsForm.about_content ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, about_content: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Shipping Policy (/shipping-policy)</label>
                      <textarea
                        rows={3}
                        value={settingsForm.shipping_policy ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, shipping_policy: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Return &amp; Refund Policy (/return-policy)</label>
                      <textarea
                        rows={3}
                        value={settingsForm.return_policy ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, return_policy: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Privacy Policy (/privacy-policy)</label>
                      <textarea
                        rows={3}
                        value={settingsForm.privacy_policy ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, privacy_policy: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Terms &amp; Conditions (/terms)</label>
                      <textarea
                        rows={3}
                        value={settingsForm.terms_conditions ?? ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, terms_conditions: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold"
                  >
                    {savingSettings ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </form>

              {/* Password Change & Activity Logs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (pwNew !== pwConfirm) {
                      toast('Passwords do not match.', 'error');
                      return;
                    }
                    try {
                      await apiFetch('/api/auth/admin/change-password', {
                        method: 'POST',
                        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
                      });
                      setPwCurrent('');
                      setPwNew('');
                      setPwConfirm('');
                      toast('Administrator password changed.');
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Password change failed', 'error');
                    }
                  }}
                  className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs"
                >
                  <h2 className="font-display text-base font-bold">Change Admin Password</h2>
                  <input
                    type="password"
                    required
                    placeholder="Current Password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="New Password"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Confirm New Password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
                  >
                    Update Password
                  </button>
                </form>

                <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <h2 className="font-display text-base font-bold">Recent Activity Logs</h2>
                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    {activityLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="py-2 flex justify-between gap-2">
                        <span>
                          <strong>{log.actor}</strong> · {log.action} {log.target && `(${log.target})`}
                        </span>
                        <span className="font-mono text-zinc-500 shrink-0">{formatDateTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Product Editor Modal */}
      {editingProduct !== undefined && (
        <AdminProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(undefined)}
          onSaved={() => {
            setEditingProduct(undefined);
            loadAllAdminData();
            refreshProducts();
          }}
          toast={toast}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && !printMode && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="font-mono text-lg font-bold">{selectedOrder.order_id}</h2>
                <p className="text-zinc-500">{formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 font-semibold">Customer &amp; Delivery</p>
                <p className="font-semibold text-sm mt-1">{selectedOrder.customer_name}</p>
                <p className="font-mono">{selectedOrder.customer_phone}</p>
                <p>{selectedOrder.customer_email}</p>
                <p className="text-zinc-500 mt-1">
                  {selectedOrder.full_address}, {selectedOrder.area}, {selectedOrder.district}, {selectedOrder.country}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 font-semibold">Payment</p>
                <p>Method: {selectedOrder.payment_method}</p>
                <p>Status: <strong>{selectedOrder.payment_status}</strong></p>
                {selectedOrder.transaction_id && <p className="font-mono">TrxID: {selectedOrder.transaction_id}</p>}
                {selectedOrder.payment_screenshot && (
                  <button
                    type="button"
                    onClick={() => setScreenshotModalUrl(selectedOrder.payment_screenshot)}
                    className="text-[#14B8A6] underline"
                  >
                    View Payment Screenshot
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              {selectedOrder.items.map((it, idx) => (
                <div key={idx} className="p-3 flex justify-between">
                  <span>
                    {it.name} ({it.size}/{it.color}) × {it.quantity}
                  </span>
                  <span className="font-mono font-semibold">{formatBDT(it.unitPrice * it.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 mb-1">Courier Name</label>
                <input
                  type="text"
                  defaultValue={selectedOrder.courier_name}
                  onBlur={(e) => handleUpdateOrder(selectedOrder.id, { courier_name: e.target.value })}
                  placeholder="e.g. Steadfast / Pathao / RedX"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Tracking Number</label>
                <input
                  type="text"
                  defaultValue={selectedOrder.tracking_number}
                  onBlur={(e) => handleUpdateOrder(selectedOrder.id, { tracking_number: e.target.value })}
                  placeholder="Courier consignment ID"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrintMode('invoice');
                    setTimeout(() => window.print(), 100);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintMode('packing');
                    setTimeout(() => window.print(), 100);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Packing Slip
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screenshot Lightbox */}
      {screenshotModalUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 no-print"
          onClick={() => setScreenshotModalUrl(null)}
        >
          <img
            src={screenshotModalUrl}
            alt="Payment screenshot proof"
            className="max-w-lg max-h-[85vh] rounded-xl object-contain"
          />
        </div>
      )}

      {/* Print-Only Invoice / Packing Slip */}
      {selectedOrder && printMode && (
        <div className="hidden print-only p-10 bg-white text-black w-full">
          <div className="flex justify-between items-start border-b pb-4 mb-6">
            <div>
              {settings.site_logo && (
                <img src={settings.site_logo} alt={settings.site_name || 'Logo'} className="h-9 w-auto mb-2 object-contain" />
              )}
              <h1 className="text-2xl font-bold">{settings.site_name || 'PRODUCT HUB BD'}</h1>
              <p className="text-xs">{settings.store_address}</p>
              <p className="text-xs">{settings.support_phone}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold uppercase">{printMode === 'packing' ? 'Packing Slip' : 'Tax Invoice'}</p>
              <p className="font-mono text-sm">{selectedOrder.order_id}</p>
              <p className="text-xs">{formatDateTime(selectedOrder.created_at)}</p>
            </div>
          </div>
          <div className="mb-6 text-sm">
            <p className="font-bold">Ship To: {selectedOrder.customer_name}</p>
            <p>Phone: {selectedOrder.customer_phone}</p>
            <p>
              Address: {selectedOrder.full_address}, {selectedOrder.area}, {selectedOrder.district}
            </p>
            {selectedOrder.courier_name && (
              <p>
                Courier: {selectedOrder.courier_name} · Tracking: {selectedOrder.tracking_number}
              </p>
            )}
          </div>
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-left">Variant</th>
                <th className="py-2 text-right">Qty</th>
                {printMode === 'invoice' && <th className="py-2 text-right">Total</th>}
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items.map((it, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{it.name}</td>
                  <td className="py-2">
                    {it.size} / {it.color}
                  </td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  {printMode === 'invoice' && <td className="py-2 text-right">{formatBDT(it.unitPrice * it.quantity)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {printMode === 'invoice' && (
            <div className="text-right space-y-1 text-sm">
              <p>Subtotal: {formatBDT(selectedOrder.subtotal)}</p>
              <p>Delivery: {formatBDT(selectedOrder.delivery_charge)}</p>
              <p className="text-lg font-bold">Total: {formatBDT(selectedOrder.total_amount)}</p>
              <p className="text-xs">
                Payment: {selectedOrder.payment_method} ({selectedOrder.payment_status})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delete Product Confirmation Popup */}
      {deletingProduct && (
        <div
          className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/15 text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 id="delete-product-title" className="font-display text-lg font-bold">
                  Delete Product
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-zinc-950 dark:text-white">&ldquo;{deletingProduct.name}&rdquo;</strong>? This
                  action removes it from the storefront and cannot be undone.
                </p>
                <p className="text-[11px] font-mono text-zinc-500">
                  ID: {deletingProduct.product_code || `PHB-${deletingProduct.id}`} · SKU: {deletingProduct.sku}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <button
                type="button"
                disabled={deletingProductLoading}
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingProductLoading}
                onClick={confirmDeleteProduct}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
              >
                {deletingProductLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <OfflineIndicator />
    </div>
  );
}
