import React, { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, X, Search, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';

export function ShopPage() {
  const { products, categories, loadingCatalog } = useStore();

  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  const initialCategory = urlParams.get('category') || 'all';

  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'special_offer'>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating'>('newest');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const pageSize = 8;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const c = params.get('category');
    if (q !== null) setSearch(q);
    if (c !== null) setSelectedCategory(c);
  }, [window.location.search]);

  const activeProducts = useMemo(() => products.filter((p) => p.status !== 'Draft'), [products]);

  const brands = useMemo(
    () => Array.from(new Set(activeProducts.map((p) => p.brand).filter(Boolean))).sort(),
    [activeProducts]
  );

  const allSizes = useMemo(
    () => Array.from(new Set(activeProducts.flatMap((p) => p.sizes))),
    [activeProducts]
  );

  const allColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of activeProducts) {
      for (const c of p.colors) {
        if (!map.has(c.name)) map.set(c.name, c.hex);
      }
    }
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [activeProducts]);

  const filtered = useMemo(() => {
    let list = [...activeProducts];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (selectedBrand !== 'all') {
      list = list.filter((p) => p.brand === selectedBrand);
    }
    if (selectedSize !== 'all') {
      list = list.filter((p) => p.sizes.includes(selectedSize));
    }
    if (selectedColor !== 'all') {
      list = list.filter((p) => p.colors.some((c) => c.name === selectedColor));
    }
    if (availability === 'in_stock') {
      list = list.filter((p) => p.stock_quantity > 0 && p.status !== 'Out of Stock');
    } else if (availability === 'special_offer') {
      list = list.filter((p) => p.is_special_offer || p.discount_percent > 0);
    }
    if (minRating > 0) {
      list = list.filter((p) => p.rating >= minRating);
    }
    if (minPrice !== '' && !Number.isNaN(Number(minPrice))) {
      list = list.filter((p) => p.effective_price >= Number(minPrice));
    }
    if (maxPrice !== '' && !Number.isNaN(Number(maxPrice))) {
      list = list.filter((p) => p.effective_price <= Number(maxPrice));
    }

    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.effective_price - b.effective_price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.effective_price - a.effective_price);
        break;
      case 'popular':
        list.sort((a, b) => b.sales_count + b.views_count - (a.sales_count + a.views_count));
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
      default:
        list.sort((a, b) => b.id - a.id);
        break;
    }
    return list;
  }, [
    activeProducts,
    search,
    selectedCategory,
    selectedBrand,
    selectedSize,
    selectedColor,
    availability,
    minRating,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedSize('all');
    setSelectedColor('all');
    setAvailability('all');
    setMinRating(0);
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const filterPanelContent = (
    <div className="space-y-6 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-zinc-950 dark:text-white">Filters</h2>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-medium text-[#0F6E56] dark:text-[#14B8A6] hover:underline"
        >
          Reset all
        </button>
      </div>

      {/* Category */}
      <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Category</p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setPage(1);
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15 text-[#0F6E56] dark:text-[#14B8A6]'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCategory(c.name);
                setPage(1);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                selectedCategory.toLowerCase() === c.name.toLowerCase()
                  ? 'bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15 text-[#0F6E56] dark:text-[#14B8A6]'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span>{c.name}</span>
              <span className="font-mono text-[11px] tabular-nums opacity-70">{c.product_count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand */}
      <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Brand</label>
        <select
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
        >
          <option value="all">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Price Range (৳ BDT)</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-xs tabular-nums text-zinc-900 dark:text-zinc-100"
          />
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-xs tabular-nums text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Size */}
      <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {['all', ...allSizes].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => {
                setSelectedSize(sz);
                setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-md font-mono text-xs font-medium border transition-colors ${
                selectedSize === sz
                  ? 'bg-[#0F6E56] dark:bg-[#14B8A6] border-transparent text-white dark:text-zinc-950'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
              }`}
            >
              {sz === 'all' ? 'All' : sz}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Color</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedColor('all');
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs border ${
              selectedColor === 'all'
                ? 'border-[#0F6E56] dark:border-[#14B8A6] text-[#0F6E56] dark:text-[#14B8A6] font-semibold'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            All
          </button>
          {allColors.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={() => {
                setSelectedColor(selectedColor === c.name ? 'all' : c.name);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border ${
                selectedColor === c.name
                  ? 'border-[#0F6E56] dark:border-[#14B8A6] text-zinc-950 dark:text-white font-semibold'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-zinc-400/50 shrink-0"
                style={{ backgroundColor: c.hex }}
              />
              <span className="truncate max-w-[85px]">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Availability &amp; Deals</p>
        <div className="space-y-1">
          {[
            { id: 'all', label: 'All Products' },
            { id: 'in_stock', label: 'In Stock Only' },
            { id: 'special_offer', label: 'On Sale / Offers' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setAvailability(opt.id as typeof availability);
                setPage(1);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                availability === opt.id
                  ? 'bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15 text-[#0F6E56] dark:text-[#14B8A6]'
                  : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Minimum Rating */}
      <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Customer Rating</p>
        <div className="flex flex-wrap gap-1.5">
          {[0, 4, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setMinRating(r);
                setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1 ${
                minRating === r
                  ? 'bg-[#0F6E56] dark:bg-[#14B8A6] border-transparent text-white dark:text-zinc-950'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {r === 0 ? (
                'Any'
              ) : (
                <>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{r}+ Stars</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Controls */}
      <div className="pb-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
            {selectedCategory === 'all' ? 'All Products' : selectedCategory}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 font-mono tabular-nums">
            Showing {filtered.length} product{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by keyword or SKU..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0F6E56] dark:focus:border-[#14B8A6]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort products"
            className="px-3 py-2 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
          </select>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#14171D] text-sm font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Content: Left Filter Sidebar + Product Grid */}
      <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="hidden lg:block lg:col-span-3 p-5 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800/90 sticky top-24">
          {filterPanelContent}
        </aside>

        <div className="lg:col-span-9 space-y-8">
          {loadingCatalog ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 rounded-xl bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
              <p className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                No products match your selected filters
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Try clearing one or more filters or searching for another keyword.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginated.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <p className="text-xs font-mono tabular-nums text-zinc-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-semibold tabular-nums ${
                      n === currentPage
                        ? 'bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950'
                        : 'border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative z-10 w-80 max-w-full bg-white dark:bg-[#111318] h-full overflow-y-auto p-5 shadow-2xl">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterPanelContent}
          </div>
        </div>
      )}
    </div>
  );
}
