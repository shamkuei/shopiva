'use client';

import Link from 'next/link';
import { useCart, selectCartTotal } from '@/lib/cartStore';
import { useHydrated } from '@/lib/useHydrated';
import { formatPrice, resolveImageUrl } from '@/lib/api';

export default function CartPage() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const total = useCart(selectCartTotal);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your cart</h1>

      {!hydrated ? (
        <p className="mt-6 text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">Your cart is empty.</p>
          <Link href="/" className="mt-3 inline-block font-semibold text-brand hover:underline">
            ← Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-4 p-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {resolveImageUrl(item.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(item.imageUrl) ?? ''}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🛍️</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500">{formatPrice(item.price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    className="h-8 w-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    className="h-8 w-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div className="w-24 text-right font-semibold text-slate-800">
                  {formatPrice((Number(item.price) * item.quantity).toFixed(2))}
                </div>
                <button
                  onClick={() => remove(item.productId)}
                  className="ml-2 text-xs text-rose-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <Link href="/" className="text-sm font-medium text-slate-500 hover:underline">
              ← Continue shopping
            </Link>
            <div className="text-right">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{formatPrice(total.toFixed(2))}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Link
              href="/checkout"
              className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Proceed to checkout →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
