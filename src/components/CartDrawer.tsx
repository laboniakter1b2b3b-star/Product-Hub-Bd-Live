import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/format.ts';

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, products, updateCartQuantity, removeFromCart, navigate } = useStore();

  if (!cartOpen) return null;

  const detailedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = detailedItems.reduce((sum, item) => sum + item.product.effective_price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-md bg-white dark:bg-[#111318] border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full shadow-2xl">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6]" />
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Shopping Bag ({detailedItems.reduce((a, b) => a + b.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close bag"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {detailedItems.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 mx-auto text-zinc-400" />
              <div>
                <p className="font-display text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Your shopping bag is empty
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Explore our curated apparel, watches, leather carry, and studio audio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
              >
                Browse Shop
              </button>
            </div>
          ) : (
            detailedItems.map((item) => (
              <div
                key={`${item.productId}-${item.size}-${item.color}`}
                className="flex gap-3.5 pb-4 border-b border-zinc-100 dark:border-zinc-800/80"
              >
                <img
                  src={item.product.images[0] || ''}
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        navigate(`/product/${item.productId}`);
                      }}
                      className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-[#14B8A6] text-left truncate"
                    >
                      {item.product.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.size, item.color)}
                      aria-label="Remove item"
                      className="text-zinc-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Size: {item.size || 'Std'} · Color: {item.color || 'Default'}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 font-mono text-xs tabular-nums text-zinc-900 dark:text-zinc-100">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                      {formatBDT(item.product.effective_price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {detailedItems.length > 0 && (
          <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0D0F13] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
              <span className="font-mono text-lg font-bold tabular-nums text-zinc-950 dark:text-white">
                {formatBDT(subtotal)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Delivery charges &amp; coupon discounts calculated at checkout.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/cart');
                }}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="px-4 py-2.5 rounded-lg bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <span>Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
