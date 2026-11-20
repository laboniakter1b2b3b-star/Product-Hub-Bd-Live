import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CartItem, Category, Product, User } from '../types.ts';
import { apiFetch, getAuthToken, setAuthToken } from '../lib/api.ts';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  route: string;
  navigate: (path: string) => void;
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  settings: Record<string, string>;
  refreshSettings: () => Promise<void>;
  categories: Category[];
  refreshCategories: () => Promise<void>;
  products: Product[];
  refreshProducts: () => Promise<void>;
  loadingCatalog: boolean;
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  updateCartQuantity: (productId: number, size: string, color: string, quantity: number) => void;
  removeFromCart: (productId: number, size: string, color: string) => void;
  clearCart: () => void;
  cartCount: number;
  wishlist: number[];
  toggleWishlist: (productId: number) => Promise<void>;
  compareIds: number[];
  toggleCompare: (productId: number) => void;
  clearCompare: () => void;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  getVariantStock: (product: Product, size: string, color: string) => number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'phb_cart_v1';
const WISHLIST_STORAGE_KEY = 'phb_wishlist_v1';
const COMPARE_STORAGE_KEY = 'phb_compare_v1';
const THEME_STORAGE_KEY = 'phb_theme';
const VISITOR_SESSION_KEY = 'phb_visitor_sid';

function getOrCreateVisitorSid(): string {
  let sid = localStorage.getItem(VISITOR_SESSION_KEY);
  if (!sid) {
    sid = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_SESSION_KEY, sid);
  }
  return sid;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [route, setRoute] = useState<string>(() => window.location.pathname || '/');
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  const [compareIds, setCompareIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Theme class sync
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Navigation sync
  const navigate = useCallback((path: string) => {
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
    }
    setRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Visitor analytics heartbeat
  useEffect(() => {
    const sid = getOrCreateVisitorSid();
    apiFetch('/api/visitors/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: sid, pagePath: route, isPageView: true }),
    }).catch(() => {});

    const interval = setInterval(() => {
      apiFetch('/api/visitors/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: sid, pagePath: window.location.pathname, isPageView: false }),
      }).catch(() => {});
    }, 45000);

    return () => clearInterval(interval);
  }, [route]);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await apiFetch<Record<string, string>>('/api/settings');
      setSettings(data);
      if (data.seo_title) {
        document.title = data.seo_title;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', data.seo_title);
      } else if (data.site_name) {
        document.title = data.site_name;
      }
      if (data.seo_description) {
        const desc = document.querySelector('meta[name="description"]');
        if (desc) desc.setAttribute('content', data.seo_description);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', data.seo_description);
      }
      if (data.favicon_url) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.favicon_url;
      }
    } catch {
      // ignore initial failure
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const data = await apiFetch<Category[]>('/api/categories');
      setCategories(data);
    } catch {
      // ignore
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      setLoadingCatalog(true);
      const data = await apiFetch<{ products: Product[] }>('/api/products?limit=100');
      setProducts(data.products);
    } catch {
      // ignore
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await apiFetch<User>('/api/auth/me');
      setUser(me);
      if (me.role === 'customer') {
        const [serverCart, serverWish] = await Promise.all([
          apiFetch<{ product_id: number; size: string; color: string; quantity: number }[]>('/api/cart').catch(
            () => []
          ),
          apiFetch<number[]>('/api/wishlist').catch(() => []),
        ]);
        if (serverCart.length > 0) {
          setCart((prev) => {
            const merged = [...prev];
            for (const sc of serverCart) {
              const idx = merged.findIndex(
                (i) => i.productId === sc.product_id && i.size === sc.size && i.color === sc.color
              );
              if (idx === -1) {
                merged.push({
                  productId: sc.product_id,
                  size: sc.size,
                  color: sc.color,
                  quantity: sc.quantity,
                });
              }
            }
            return merged;
          });
        }
        if (serverWish.length > 0) {
          setWishlist((prev) => Array.from(new Set([...prev, ...serverWish])));
        }
      }
    } catch {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshCategories();
    refreshProducts();
    refreshUser();
  }, [refreshSettings, refreshCategories, refreshProducts, refreshUser]);

  // Persist cart to localStorage and sync to server when logged in
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    if (user && user.role === 'customer') {
      apiFetch('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({ items: cart }),
      }).catch(() => {});
    }
  }, [cart, user]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareIds));
  }, [compareIds]);

  const getVariantStock = useCallback((product: Product, size: string, color: string): number => {
    const keys = Object.keys(product.variant_stock || {});
    if (keys.length === 0) return product.stock_quantity;
    const key = `${size}|${color}`;
    if (key in product.variant_stock) return product.variant_stock[key];
    return 0;
  }, []);

  const addToCart = useCallback(
    (product: Product, size: string, color: string, quantity = 1) => {
      const avail = getVariantStock(product, size, color);
      if (avail <= 0 || product.status === 'Out of Stock') {
        toast('Selected size/color is currently out of stock.', 'error');
        return;
      }
      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.productId === product.id && item.size === size && item.color === color
        );
        if (idx > -1) {
          const nextQty = Math.min(avail, prev[idx].quantity + quantity);
          if (nextQty === prev[idx].quantity && prev[idx].quantity >= avail) {
            toast(`Maximum available stock (${avail}) already in cart.`, 'info');
            return prev;
          }
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: nextQty };
          toast(`Updated ${product.name} quantity in cart.`);
          return copy;
        }
        toast(`Added ${product.name} to cart.`);
        return [...prev, { productId: product.id, size, color, quantity: Math.min(avail, quantity) }];
      });
    },
    [getVariantStock, toast]
  );

  const updateCartQuantity = useCallback(
    (productId: number, size: string, color: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) =>
          prev.filter((item) => !(item.productId === productId && item.size === size && item.color === color))
        );
        return;
      }
      const prod = products.find((p) => p.id === productId);
      const maxAvail = prod ? getVariantStock(prod, size, color) : quantity;
      const clamped = Math.min(quantity, Math.max(1, maxAvail));
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId && item.size === size && item.color === color
            ? { ...item, quantity: clamped }
            : item
        )
      );
    },
    [getVariantStock, products]
  );

  const removeFromCart = useCallback((productId: number, size: string, color: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.size === size && item.color === color))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: number) => {
      const exists = wishlist.includes(productId);
      setWishlist((prev) => (exists ? prev.filter((id) => id !== productId) : [...prev, productId]));
      toast(exists ? 'Removed from wishlist.' : 'Saved to wishlist.');
      if (user && user.role === 'customer') {
        apiFetch('/api/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ productId }),
        }).catch(() => {});
      }
    },
    [toast, user, wishlist]
  );

  const toggleCompare = useCallback(
    (productId: number) => {
      setCompareIds((prev) => {
        if (prev.includes(productId)) {
          toast('Removed from comparison.');
          return prev.filter((id) => id !== productId);
        }
        if (prev.length >= 4) {
          toast('You can compare up to 4 products at a time.', 'info');
          return prev;
        }
        toast('Added to comparison.');
        return [...prev, productId];
      });
    },
    [toast]
  );

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthToken(null);
    setUser(null);
    toast('Signed out successfully.');
  }, [toast]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        theme,
        toggleTheme,
        route,
        navigate,
        user,
        setUser,
        logout,
        refreshUser,
        settings,
        refreshSettings,
        categories,
        refreshCategories,
        products,
        refreshProducts,
        loadingCatalog,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        wishlist,
        toggleWishlist,
        compareIds,
        toggleCompare,
        clearCompare,
        toast,
        getVariantStock,
      }}
    >
      {children}

      {/* Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm no-print pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg border text-sm font-medium shadow-lg transition-all ${
              t.type === 'error'
                ? 'bg-red-950/95 border-red-700 text-red-100'
                : t.type === 'info'
                  ? 'bg-zinc-900/95 border-zinc-700 text-zinc-100'
                  : 'bg-[#0B2926]/95 border-[#14B8A6]/40 text-teal-50'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
