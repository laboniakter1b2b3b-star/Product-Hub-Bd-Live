import React, { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { formatBDT } from '../lib/format.ts';

export function CartPage() {
  const { cart, products, updateCartQuantity, removeFromCart, navigate, settings, toast, getVariantStock } =
    useStore();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const detailedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const maxStock = getVariantStock(product, item.size, item.color);
      return { ...item, product, maxStock };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = detailedItems.reduce((sum, i) => sum + i.product.effective_price * i.quantity, 0);
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const freeThreshold =
    settings.free_delivery_threshold !== undefined && settings.free_delivery_threshold !== ''
      ? Number(settings.free_delivery_threshold)
      : 5000;
  const dhakaDelivery =
    settings.delivery_charge_dhaka !== undefined && settings.delivery_charge_dhaka !== ''
      ? Number(settings.delivery_charge_dhaka)
      : 70;
  const taxRate =
    settings.tax_rate_percent !== undefined && settings.tax_rate_percent !== ''
      ? Number(settings.tax_rate_percent)
      : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const estimatedTax = Math.round((afterDiscount * taxRate) / 100);
  const estimatedShipping = freeThreshold > 0 && afterDiscount >= freeThreshold ? 0 : dhakaDelivery;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    try {
      setApplyingCoupon(true);
      const res = await apiFetch<{ code: string; discount_amount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput, subtotal }),
      });
      setAppliedCoupon(res);
      toast(`Coupon ${res.code} applied (-${formatBDT(res.discount_amount)}).`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Invalid coupon', 'error');
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (detailedItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-5">
        <ShoppingBag className="w-12 h-12 mx-auto text-zinc-400" />
        <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Your Shopping Cart is Empty</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Browse our catalog to add apparel, watches, leather bags, footwear, or studio audio.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-6 py-3 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-8 space-y-4">
          {detailedItems.map((item) => (
            <div
              key={`${item.productId}-${item.size}-${item.color}`}
              className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
            >
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={item.product.images[0] || ''}
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 shrink-0 cursor-pointer"
                  onClick={() => navigate(`/product/${item.productId}`)}
                />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/product/${item.productId}`)}
                    className="font-display text-base font-semibold text-zinc-950 dark:text-white hover:text-[#14B8A6] text-left truncate block max-w-md"
                  >
                    {item.product.name}
                  </button>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    SKU: {item.product.sku} · Size: {item.size || 'Std'} · Color: {item.color || 'Default'}
                  </p>
                  <p className="font-mono text-sm font-semibold text-[#0F6E56] dark:text-[#14B8A6] mt-1 tabular-nums">
                    {formatBDT(item.product.effective_price)} each
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                    className="p-2 text-zinc-700 dark:text-zinc-300"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 font-mono text-sm tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= item.maxStock}
                    onClick={() => updateCartQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                    className="p-2 text-zinc-700 dark:text-zinc-300 disabled:opacity-30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="font-mono text-base font-bold tabular-nums text-zinc-950 dark:text-white min-w-[85px] text-right">
                  {formatBDT(item.product.effective_price * item.quantity)}
                </span>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId, item.size, item.color)}
                  aria-label="Remove item"
                  className="p-2 text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-4 p-6 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5">
          <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">Order Summary</h2>

          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon (e.g. WELCOME10)"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={applyingCoupon}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:border-[#14B8A6]"
            >
              Apply
            </button>
          </form>

          <div className="space-y-2.5 text-sm border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-mono font-medium tabular-nums">{formatBDT(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#0F6E56] dark:text-[#14B8A6]">
                <span>Discount ({appliedCoupon?.code})</span>
                <span className="font-mono tabular-nums">-{formatBDT(discount)}</span>
              </div>
            )}
            {estimatedTax > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Tax ({taxRate}%)</span>
                <span className="font-mono tabular-nums">{formatBDT(estimatedTax)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Estimated Dhaka Shipping</span>
              <span className="font-mono tabular-nums">
                {estimatedShipping === 0 ? 'Free' : formatBDT(estimatedShipping)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800 text-base font-bold text-zinc-950 dark:text-white">
              <span>Estimated Total</span>
              <span className="font-mono tabular-nums">{formatBDT(afterDiscount + estimatedTax + estimatedShipping)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(appliedCoupon ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.code)}` : '/checkout')
            }
            className="w-full py-3 rounded-lg bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
