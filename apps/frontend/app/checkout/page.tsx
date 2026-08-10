'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useCart, selectCartTotal } from '@/lib/cartStore';
import { useHydrated } from '@/lib/useHydrated';
import { apiStorePost, formatPrice } from '@/lib/api';
import type { Order } from '@/lib/types';

export default function CheckoutPage() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const total = useCart(selectCartTotal);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) return;
    if (!name.trim() || !address.trim()) {
      setError('Name and address are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // 1. Create the order (status: pending).
      const order = await apiStorePost<Order>('/api/orders', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customer: { name: name.trim(), phone: phone.trim() || undefined, address: address.trim() },
      });

      // 2. Start payment and redirect to Zarinpal. The cart is cleared only on
      //    the result page once payment is confirmed, so a failed/cancelled
      //    payment leaves the cart intact for retry.
      const { gatewayUrl } = await apiStorePost<{ gatewayUrl: string }>(
        `/api/orders/${order.id}/pay`,
        {},
      );
      window.location.href = gatewayUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-slate-400">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Checkout</h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">Your cart is empty.</p>
          <Link href="/" className="mt-3 inline-block font-semibold text-brand hover:underline">
            ← Browse products
          </Link>
        </div>
      </div>
    );
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Checkout</h1>
      <p className="mt-1 text-slate-500">No account needed — just your shipping details.</p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="lg:col-span-3 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Phone number</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Shipping address</span>
            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls}
            />
          </label>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? 'Redirecting to payment…' : `Proceed to payment · ${formatPrice(total.toFixed(2))}`}
          </button>
        </form>

        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Order summary</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between text-slate-700">
                  <span className="truncate pr-2">
                    {i.title} <span className="text-slate-400">× {i.quantity}</span>
                  </span>
                  <span>{formatPrice((Number(i.price) * i.quantity).toFixed(2))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 font-semibold text-slate-900">
              <span>Total</span>
              <span>{formatPrice(total.toFixed(2))}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
