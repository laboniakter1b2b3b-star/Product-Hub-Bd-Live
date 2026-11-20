import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  User as UserIcon,
  Sun,
  Moon,
  Menu,
  X,
  GitCompare,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/format.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export function Navbar({ onSearchSelect }: { onSearchSelect?: (q: string) => void }) {
  const {
    theme,
    toggleTheme,
    route,
    navigate,
    user,
    settings,
    products,
    cartCount,
    setCartOpen,
    wishlist,
    compareIds,
  } = useStore();

  const [promoDismissed, setPromoDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.status !== 'Draft' &&
          (p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [products, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSelect) {
      onSearchSelect(searchQuery.trim());
    }
    setSearchOpen(false);
    navigate(`/shop${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop' },
    { label: 'Categories', path: '/categories' },
    { label: 'Track Order', path: '/track-order' },
    { label: 'Admin', path: user?.role === 'admin' ? '/admin' : '/admin/login' },
  ];

  const siteName = settings.site_name || 'PRODUCT HUB BD';
  const promoText = settings.promo_banner_text;

  return (
    <div className="sticky top-0 z-40 no-print">
      {/* Slim dismissible announcement strip */}
      {!promoDismissed && promoText && (
        <div className="bg-[#0D1F1D] dark:bg-[#0B2220] border-b border-teal-900/40 text-teal-100 text-xs px-4 py-1.5 flex items-center justify-center relative">
          <p className="truncate pr-6 text-center font-medium">{promoText}</p>
          <button
            type="button"
            onClick={() => setPromoDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 p-1 text-teal-300/80 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary Header: 3-zone layout */}
      <header className="bg-white/95 dark:bg-[#0B0D10]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/90">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus:outline-none"
            >
              {settings.site_logo ? (
                <img
                  src={settings.site_logo}
                  alt={siteName}
                  className="h-8 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg
                  className="w-7 h-7 text-[#0F6E56] dark:text-[#14B8A6] shrink-0"
                  viewBox="0 0 32 32"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M9 11h14M9 16h10M9 21h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
              <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0">
                {siteName}
              </span>
            </button>
          </div>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            {navLinks.map((item) => {
              const active =
                route === item.path || (item.path === '/shop' && (route === '/products' || route.startsWith('/shop')));
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'border-[#0F6E56] dark:border-[#14B8A6] text-zinc-950 dark:text-white'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions & Bag */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search products"
              className="p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            <PWAInstallButton compact />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            {compareIds.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/compare')}
                aria-label="Compare products"
                className="hidden sm:flex items-center gap-1 p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors relative"
              >
                <GitCompare className="w-[18px] h-[18px]" />
                <span className="font-mono text-[11px] tabular-nums text-[#0F6E56] dark:text-[#14B8A6] font-semibold">
                  {compareIds.length}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/wishlist')}
              aria-label="Wishlist"
              className="hidden sm:flex items-center gap-1 p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors relative"
            >
              <Heart className="w-[18px] h-[18px]" />
              {wishlist.length > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-[#0F6E56] dark:text-[#14B8A6] font-semibold">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(user ? (user.role === 'admin' ? '/admin' : '/account') : '/login')}
              aria-label="Account"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors whitespace-nowrap shrink-0"
            >
              {user?.role === 'admin' ? (
                <ShieldCheck className="w-[18px] h-[18px] text-[#14B8A6]" />
              ) : (
                <UserIcon className="w-[18px] h-[18px]" />
              )}
              <span className="hidden md:inline max-w-[90px] truncate">
                {user ? (user.role === 'admin' ? 'Admin' : user.name.split(' ')[0]) : 'Sign In'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              <span className="font-mono tabular-nums">({cartCount})</span>
            </button>
          </div>
        </div>

        {/* Live Search Expandable Bar */}
        {searchOpen && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111318]">
            <div className="max-w-3xl mx-auto px-4 py-3 relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by product name, SKU, brand, or category..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0F6E56] dark:focus:border-[#14B8A6]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 whitespace-nowrap shrink-0"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="p-2.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>

              {suggestions.length > 0 && (
                <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16181D] divide-y divide-zinc-100 dark:divide-zinc-800 shadow-xl overflow-hidden">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                        navigate(`/product/${p.id}`);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <img
                        src={p.images[0] || ''}
                        alt={p.name}
                        className="w-10 h-10 rounded object-cover bg-zinc-200 dark:bg-zinc-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {p.brand} · {p.category} · {p.sku}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#0F6E56] dark:text-[#14B8A6] shrink-0">
                        {formatBDT(p.effective_price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0E1014] px-4 py-4 space-y-1">
            {navLinks.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  route === item.path
                    ? 'bg-teal-500/10 text-[#0F6E56] dark:text-[#14B8A6]'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/wishlist');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4" /> Wishlist ({wishlist.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate(user ? (user.role === 'admin' ? '/admin' : '/account') : '/login');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-2"
              >
                <UserIcon className="w-4 h-4" /> {user ? 'Account' : 'Sign In'}
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
