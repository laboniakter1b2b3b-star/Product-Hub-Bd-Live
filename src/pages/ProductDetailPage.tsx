import React, { useState, useEffect } from 'react';
import {
  Star,
  Heart,
  GitCompare,
  ShoppingBag,
  Zap,
  ZoomIn,
  X,
  Play,
  Truck,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  ArrowLeft,
  ExternalLink,
  Info,
} from 'lucide-react';
import type { Product, Review } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { formatBDT, formatDateShort } from '../lib/format.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export function ProductDetailPage({ productId }: { productId: number }) {
  const {
    navigate,
    addToCart,
    setCartOpen,
    wishlist,
    toggleWishlist,
    compareIds,
    toggleCompare,
    settings,
    user,
    toast,
    getVariantStock,
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review form
  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setActiveImageIdx(0);
    setShowVideo(false);
    apiFetch<{ product: Product; reviews: Review[]; related: Product[] }>(`/api/products/${productId}`)
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setReviews(res.reviews);
        setRelated(res.related);
        setSelectedSize(res.product.sizes[0] || '');
        setSelectedColor(res.product.colors[0]?.name || '');
        setQuantity(1);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Product not found');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 aspect-[4/3] rounded-2xl bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-8 w-2/3 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse" />
            <div className="h-24 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Product Not Found</h1>
        <p className="text-sm text-zinc-500">{error || 'This product may have been removed.'}</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const isAffiliate = product.product_type === 'aliexpress_affiliate';
  const availableVariantStock = getVariantStock(product, selectedSize, selectedColor);
  const canBuy = !isAffiliate && availableVariantStock > 0 && product.status !== 'Out of Stock' && product.status !== 'Draft';
  const isWishlisted = wishlist.includes(product.id);
  const isCompared = compareIds.includes(product.id);
  const activeImg = product.images[activeImageIdx] || product.images[0] || '';

  const handleTrackAffiliateClick = () => {
    const sid = localStorage.getItem('phb_visitor_sid') || '';
    fetch(`/api/products/${product.id}/affiliate-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, referrerPage: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  };

  const handleBuyNow = () => {
    if (!canBuy) return;
    addToCart(product, selectedSize, selectedColor, quantity);
    setCartOpen(false);
    navigate('/checkout');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingRev(true);
      const created = await apiFetch<Review>(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          customer_name: user?.name || revName,
          rating: revRating,
          comment: revComment,
        }),
      });
      setReviews((prev) => [created, ...prev]);
      setRevComment('');
      setRevName('');
      toast('Thank you for your review.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not post review', 'error');
    } finally {
      setSubmittingRev(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="inline-flex items-center gap-1 hover:text-[#14B8A6]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Shop</span>
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category)}`)}
          className="hover:text-[#14B8A6]"
        >
          {product.category}
        </button>
        <span>/</span>
        <span className="text-zinc-800 dark:text-zinc-200 truncate">{product.name}</span>
      </div>

      {/* Main Split: Gallery Left + Contiguous Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 cursor-zoom-in"
            onMouseEnter={() => !showVideo && setZoomActive(true)}
            onMouseLeave={() => setZoomActive(false)}
            onMouseMove={handleMouseMove}
            onClick={() => !showVideo && setLightboxOpen(true)}
          >
            {showVideo && product.video_url ? (
              <video src={product.video_url} controls className="w-full h-full object-cover" />
            ) : (
              <img
                src={activeImg}
                alt={product.name}
                referrerPolicy="no-referrer"
                style={
                  zoomActive
                    ? { transform: 'scale(1.65)', transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }
                    : undefined
                }
                className="w-full h-full object-cover transition-transform duration-150"
              />
            )}
            {!showVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                aria-label="Open full-screen viewer"
                className="absolute bottom-3 right-3 p-2.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-md"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setShowVideo(false);
                  setActiveImageIdx(idx);
                }}
                className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                  !showVideo && activeImageIdx === idx
                    ? 'border-[#0F6E56] dark:border-[#14B8A6]'
                    : 'border-zinc-200 dark:border-zinc-800 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </button>
            ))}
            {product.video_url && (
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className={`w-20 h-16 rounded-lg border-2 shrink-0 flex flex-col items-center justify-center gap-1 text-xs font-medium ${
                  showVideo
                    ? 'border-[#0F6E56] dark:border-[#14B8A6] text-[#14B8A6]'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Purchase Module */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {product.brand} · {product.category}
                {product.subcategory ? ` / ${product.subcategory}` : ''}
              </span>
              <span className="font-mono">SKU: {product.sku}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {product.name}
            </h1>

            <p className="text-sm text-zinc-600 dark:text-zinc-400">{product.short_description}</p>

            {/* Rating */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(product.rating) ? 'fill-current' : 'opacity-30'}`} />
                ))}
              </div>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {product.rating || '5.0'}
              </span>
              <span className="text-zinc-500">({product.review_count} reviews)</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold tabular-nums text-zinc-950 dark:text-white">
              {formatBDT(product.effective_price)}
            </span>
            {product.discount_percent > 0 && (
              <>
                <span className="font-mono text-base line-through tabular-nums text-zinc-400">
                  {formatBDT(product.regular_price)}
                </span>
                <span className="font-mono text-xs font-semibold text-[#0F6E56] dark:text-[#14B8A6]">
                  Save {product.discount_percent}%
                </span>
              </>
            )}
          </div>

          {/* Color Selector (Direct Products Only) */}
          {!isAffiliate && product.colors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Color</span>
                <span className="text-zinc-500 dark:text-zinc-400">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c.name);
                      setQuantity(1);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      selectedColor === c.name
                        ? 'border-[#0F6E56] dark:border-[#14B8A6] bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15 text-zinc-950 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-zinc-400/50"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector (Direct Products Only) */}
          {!isAffiliate && product.sizes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Size</span>
                <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  {availableVariantStock > 0 ? `${availableVariantStock} in stock` : 'Out of stock'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sz) => {
                  const stockForSz = getVariantStock(product, sz, selectedColor);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        setSelectedSize(sz);
                        setQuantity(1);
                      }}
                      className={`min-w-[46px] px-3 py-2 rounded-lg border font-mono text-xs font-semibold transition-all ${
                        selectedSize === sz
                          ? 'bg-[#0F6E56] dark:bg-[#14B8A6] border-transparent text-white dark:text-zinc-950'
                          : stockForSz === 0
                            ? 'border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50 line-through'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + Stock Alert (Direct Products Only) */}
          {!isAffiliate && (
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-lg">
                <button
                  type="button"
                  disabled={!canBuy || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-zinc-700 dark:text-zinc-300 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-mono text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={!canBuy || quantity >= availableVariantStock}
                  onClick={() => setQuantity((q) => Math.min(availableVariantStock, q + 1))}
                  className="p-2.5 text-zinc-700 dark:text-zinc-300 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs font-medium">
                {canBuy ? (
                  <span className="text-[#0F6E56] dark:text-[#14B8A6] inline-flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Ready to ship ({availableVariantStock} available)
                  </span>
                ) : (
                  <span className="text-red-500">Out of stock for this selection</span>
                )}
              </p>
            </div>
          )}

          {/* Primary CTAs */}
          <div className="space-y-2.5 pt-2">
            {isAffiliate ? (
              <a
                href={product.affiliate_url || `/api/affiliate/go/${product.id}`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={handleTrackAffiliateClick}
                className="w-full px-4 py-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Buy Now on Official AliExpress</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => addToCart(product, selectedSize, selectedColor, quantity)}
                  className="px-4 py-3 rounded-lg border border-[#0F6E56] dark:border-[#14B8A6] text-[#0F6E56] dark:text-[#14B8A6] hover:bg-[#0F6E56]/10 dark:hover:bg-[#14B8A6]/10 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={handleBuyNow}
                  className="px-4 py-3 rounded-lg bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy Now</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 hover:border-zinc-400"
              >
                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-[#14B8A6] text-[#14B8A6]' : ''}`} />
                <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleCompare(product.id)}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 hover:border-zinc-400"
              >
                <GitCompare className={`w-3.5 h-3.5 ${isCompared ? 'text-[#14B8A6]' : ''}`} />
                <span>{isCompared ? 'In Compare' : 'Compare'}</span>
              </button>
            </div>
          </div>

          {/* Delivery & Payment Methods OR Affiliate Disclosure */}
          {isAffiliate ? (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25 space-y-1.5">
                <p className="font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>AliExpress Affiliate Partner Notice</span>
                </p>
                <p className="leading-relaxed">
                  {settings.aliexpress_disclosure ||
                    'Affiliate Disclosure: As an AliExpress Affiliate, PRODUCT HUB BD may earn a commission from qualifying purchases made through links on this site at no extra cost to you.'}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Clicking &ldquo;Buy Now&rdquo; redirects you to the official AliExpress product page. PRODUCT HUB BD does not collect your delivery address or payment details for AliExpress purchases.
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-200">
                    Dhaka: {formatBDT(settings.delivery_charge_dhaka ?? 70)} · Outside Dhaka:{' '}
                    {formatBDT(settings.delivery_charge_outside ?? 130)}
                  </p>
                  {Number(settings.free_delivery_threshold ?? 5000) > 0 && (
                    <p>Free nationwide delivery on orders over {formatBDT(settings.free_delivery_threshold ?? 5000)}.</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                <p>
                  Accepted payments: bKash (Send Money), Nagad (Send Money)
                  {settings.cod_enabled === 'true' ? ', and Cash on Delivery' : ''}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Description, Features & Technical Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">Product Overview</h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {product.features.length > 0 && (
            <div>
              <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-white mb-3">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                    <Check className="w-4 h-4 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <h3 className="font-display text-xl font-bold text-zinc-950 dark:text-white mb-4">Specifications</h3>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#14171D] divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            {product.pieces_info && (
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Quantity / Pieces</span>
                <span className="font-medium text-right text-zinc-900 dark:text-zinc-100">{product.pieces_info}</span>
              </div>
            )}
            {product.weight && (
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Weight</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{product.weight}</span>
              </div>
            )}
            {product.material && (
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Material</span>
                <span className="font-medium text-right text-zinc-900 dark:text-zinc-100">{product.material}</span>
              </div>
            )}
            {product.warranty_info && (
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Warranty</span>
                <span className="font-medium text-right text-zinc-900 dark:text-zinc-100">{product.warranty_info}</span>
              </div>
            )}
            {product.barcode && (
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Barcode</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{product.barcode}</span>
              </div>
            )}
            {product.specifications.map((spec, idx) => (
              <div key={idx} className="px-4 py-3 flex justify-between gap-4">
                <span className="text-zinc-500">{spec.label}</span>
                <span className="font-medium text-right text-zinc-900 dark:text-zinc-100">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-5">
          <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
            Customer Reviews ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">No reviews yet. Be the first to review this product.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{r.customer_name}</span>
                    <span className="text-xs text-zinc-500">{formatDateShort(r.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-current' : 'opacity-30'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmitReview}
          className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4 h-fit"
        >
          <h3 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">Write a Review</h3>
          {!user && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Rating</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRevRating(n)}
                  className="p-1"
                >
                  <Star
                    className={`w-5 h-5 ${n <= revRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Review</label>
            <textarea
              rows={3}
              required
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="Share fit, material quality, and delivery experience..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submittingRev}
            className="w-full py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
          >
            {submittingRev ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-6">
          <h2 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
            className="absolute top-5 right-5 p-2.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={activeImg}
            alt={product.name}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
