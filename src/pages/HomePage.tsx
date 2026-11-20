import React, { useState, useMemo } from 'react';
import { ArrowRight, Truck, ShieldCheck, RefreshCw, CreditCard } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { formatBDT } from '../lib/format.ts';

export function HomePage() {
  const { settings, categories, products, loadingCatalog, navigate } = useStore();
  const [collectionTab, setCollectionTab] = useState<'featured' | 'latest' | 'bestsellers' | 'offers'>('featured');

  const activeProducts = useMemo(() => products.filter((p) => p.status !== 'Draft'), [products]);

  const displayedProducts = useMemo(() => {
    switch (collectionTab) {
      case 'featured':
        return activeProducts.filter((p) => p.is_featured).slice(0, 8);
      case 'bestsellers':
        return [...activeProducts]
          .sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0) || b.sales_count - a.sales_count)
          .slice(0, 8);
      case 'offers':
        return activeProducts.filter((p) => p.is_special_offer || p.discount_percent > 0).slice(0, 8);
      case 'latest':
      default:
        return activeProducts.slice(0, 8);
    }
  }, [activeProducts, collectionTab]);

  const heroImage = settings.hero_banner || '/src/assets/images/hero_flagship_banner_1795097542425.jpg';
  const secondaryImage = settings.secondary_banner || '/src/assets/images/banner_craft_atelier_1795097543302.jpg';

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Flagship Hero Showcase */}
      <section className="relative bg-[#0B0D10] overflow-hidden border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="relative rounded-2xl overflow-hidden min-h-[460px] lg:min-h-[540px] flex items-end border border-zinc-800/80">
            <img
              src={heroImage}
              alt={settings.hero_title || 'PRODUCT HUB BD Collection'}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/15" />

            <div className="relative z-10 p-6 sm:p-10 lg:p-14 max-w-2xl space-y-5">
              <p className="text-xs sm:text-sm font-medium text-[#14B8A6] tracking-wide">
                {settings.site_name || 'PRODUCT HUB BD'}
                {settings.site_tagline ? ` · ${settings.site_tagline}` : ''}
              </p>
              <h1 className="font-display text-3xl sm:text-5xl font-bold text-white leading-[1.1] tracking-tight text-balance">
                {settings.hero_title || 'Curated Essentials for Modern Living'}
              </h1>
              <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-xl">
                {settings.hero_subtitle ||
                  'Architectural apparel, brushed steel timepieces, full-grain leather carry, and studio audio engineered for daily life in Bangladesh.'}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
                  className="px-6 py-3 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-zinc-950 font-semibold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <span>{settings.hero_cta_text || 'Shop Collection'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium text-sm transition-colors"
                >
                  Explore Categories
                </button>
              </div>
            </div>
          </div>

          {/* 4-Column Store Assurance Strip */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800/80 flex items-start gap-3">
              <Truck className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nationwide Dispatch</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {Number(settings.free_delivery_threshold ?? 5000) > 0
                    ? `Free over ${formatBDT(settings.free_delivery_threshold ?? 5000)}`
                    : `Dhaka ${formatBDT(settings.delivery_charge_dhaka ?? 70)} · Outside ${formatBDT(settings.delivery_charge_outside ?? 130)}`}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800/80 flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  bKash, Nagad{settings.cod_enabled === 'true' ? ' & COD' : ''}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Verified Send Money checkout</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800/80 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">7-Day Returns</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Easy size &amp; item exchange</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quality Inspected</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Checked in our Banani studio</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop by Category */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Shop by Category
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Explore curated departments engineered for durability and daily function.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="text-sm font-semibold text-[#0F6E56] dark:text-[#14B8A6] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>All Categories</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.name)}`)}
              className="group text-left rounded-xl overflow-hidden bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800/90 hover:border-[#0F6E56]/50 dark:hover:border-[#14B8A6]/40 transition-all"
            >
              <div className="aspect-[4/3] bg-zinc-100 dark:bg-[#1A1D24] overflow-hidden">
                <img
                  src={cat.image || '/src/assets/images/product_oxford_shirt_1795097543187.jpg'}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3.5">
                <p className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-[#0F6E56] dark:group-hover:text-[#14B8A6]">
                  {cat.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums mt-0.5">
                  {cat.product_count} products
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Curated Collection Grid (Featured / Latest / Bestsellers / Special Offers) */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Curated Storefront
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Real-time stock synced with our Dhaka warehouse.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            {(
              [
                { id: 'featured', label: 'Featured' },
                { id: 'latest', label: 'Latest Drops' },
                { id: 'bestsellers', label: 'Best Sellers' },
                { id: 'offers', label: 'Special Offers' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCollectionTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  collectionTab === tab.id
                    ? 'bg-white dark:bg-[#14B8A6] text-zinc-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-80 rounded-xl bg-zinc-200 dark:bg-zinc-900 animate-pulse border border-zinc-200 dark:border-zinc-800"
              />
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14171D]">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No products match this collection yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#0F6E56] dark:hover:border-[#14B8A6] text-sm font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-2 transition-colors"
          >
            <span>Browse All Products &amp; Filters</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 4. Craftsmanship & Atelier Story Banner */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 min-h-[280px] lg:min-h-[380px] relative">
            <img
              src={secondaryImage}
              alt={settings.secondary_title || 'Dhaka Design Atelier'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 flex flex-col justify-center space-y-5">
            <p className="text-xs font-medium text-[#0F6E56] dark:text-[#14B8A6]">Our Craftsmanship</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight text-balance">
              {settings.secondary_title || 'Dhaka Design Atelier'}
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {settings.secondary_subtitle ||
                'Small-batch production using breathable organic textiles, vegetable-tanned hides, and precision hardware.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
              >
                Read Our Story
              </button>
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Visit Banani Studio
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
