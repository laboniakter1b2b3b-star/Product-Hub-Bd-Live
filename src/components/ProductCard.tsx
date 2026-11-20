import React, { useState } from 'react';
import { Heart, ShoppingBag, Star, GitCompare, Package, ExternalLink } from 'lucide-react';
import type { Product } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/format.ts';

export function ProductCard({ product }: { product: Product }) {
  const { navigate, addToCart, wishlist, toggleWishlist, compareIds, toggleCompare, getVariantStock } = useStore();
  const [imgError, setImgError] = useState(false);

  const isAffiliate = product.product_type === 'aliexpress_affiliate';
  const isWishlisted = wishlist.includes(product.id);
  const isCompared = compareIds.includes(product.id);
  const outOfStock = !isAffiliate && (product.stock_quantity <= 0 || product.status === 'Out of Stock');

  const handleTrackAffiliateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sid = localStorage.getItem('phb_visitor_sid') || '';
    fetch(`/api/products/${product.id}/affiliate-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, referrerPage: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAffiliate || outOfStock) return;
    // Find first in-stock size + color combination
    let chosenSize = product.sizes[0] || '';
    let chosenColor = product.colors[0]?.name || '';
    const keys = Object.keys(product.variant_stock || {});
    if (keys.length > 0) {
      const firstAvail = keys.find((k) => (product.variant_stock[k] || 0) > 0);
      if (firstAvail) {
        const [s, c] = firstAvail.split('|');
        chosenSize = s || chosenSize;
        chosenColor = c || chosenColor;
      }
    }
    if (getVariantStock(product, chosenSize, chosenColor) > 0) {
      addToCart(product, chosenSize, chosenColor, 1);
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  return (
    <article
      onClick={() => navigate(`/product/${product.id}`)}
      className="group cursor-pointer rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800/90 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0F6E56]/50 dark:hover:border-[#14B8A6]/40 hover:shadow-lg dark:hover:shadow-black/40"
    >
      {/* Image Frame (65-75% visual area) */}
      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-[#1A1D24] overflow-hidden">
        {!imgError && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 p-4 text-center">
            <Package className="w-8 h-8 text-zinc-500 mb-2" />
            <span className="text-xs font-medium text-zinc-500">{product.name}</span>
          </div>
        )}

        {/* Quick Utility Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`p-2 rounded-lg backdrop-blur-md border transition-colors ${
              isWishlisted
                ? 'bg-[#0F6E56] dark:bg-[#14B8A6] border-transparent text-white dark:text-zinc-950'
                : 'bg-white/85 dark:bg-zinc-950/75 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:text-[#14B8A6]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(product.id);
            }}
            aria-label="Compare product"
            className={`p-2 rounded-lg backdrop-blur-md border transition-colors ${
              isCompared
                ? 'bg-[#0F6E56] dark:bg-[#14B8A6] border-transparent text-white dark:text-zinc-950'
                : 'bg-white/85 dark:bg-zinc-950/75 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:text-[#14B8A6]'
            }`}
          >
            <GitCompare className="w-4 h-4" />
          </button>
        </div>

        {/* Discount / Out of Stock / AliExpress minimal corner text */}
        {isAffiliate ? (
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded bg-orange-600/95 text-white text-[11px] font-semibold">
            AliExpress{product.discount_percent > 0 ? ` · -${product.discount_percent}%` : ''}
          </div>
        ) : outOfStock ? (
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-zinc-950/85 text-zinc-200 text-[11px] font-medium">
            Out of Stock
          </div>
        ) : product.discount_percent > 0 ? (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-mono text-[11px] font-semibold tabular-nums">
            -{product.discount_percent}%
          </div>
        ) : null}
      </div>

      {/* Product Metadata Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="truncate">
              {product.brand} · {product.category}
            </span>
            {product.review_count > 0 && (
              <span className="flex items-center gap-1 shrink-0 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {product.rating}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 font-display text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-[#0F6E56] dark:group-hover:text-[#14B8A6] transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-semibold tabular-nums text-zinc-950 dark:text-white">
                {formatBDT(product.effective_price)}
              </span>
              {product.discount_percent > 0 && (
                <span className="font-mono text-xs tabular-nums line-through text-zinc-400 dark:text-zinc-500">
                  {formatBDT(product.regular_price)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {isAffiliate
                ? 'Official AliExpress link'
                : outOfStock
                  ? 'Unavailable'
                  : product.stock_quantity <= product.low_stock_threshold
                    ? `Low stock (${product.stock_quantity} left)`
                    : 'In stock'}
            </p>
          </div>

          {isAffiliate ? (
            <a
              href={product.affiliate_url || `/api/affiliate/go/${product.id}`}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={handleTrackAffiliateClick}
              className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <span>Buy Now</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              disabled={outOfStock}
              onClick={handleQuickAdd}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                outOfStock
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-[#0F6E56] dark:bg-zinc-800 dark:hover:bg-[#14B8A6] text-white dark:text-zinc-100 dark:hover:text-zinc-950'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
