'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { formatPrice, resolveImageUrl } from '@/lib/api';
import { useCart } from '@/lib/cartStore';

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const [justAdded, setJustAdded] = useState(false);

  function onAdd() {
    add({
      productId: product.id,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  const soldOut = product.stock <= 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-brand/20 hover:shadow-warm-lg">
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-100 to-accent/15">
        {resolveImageUrl(product.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(product.imageUrl) ?? ''}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🛍️</div>
        )}

        {product.category && (
          <span className="absolute right-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-brand backdrop-blur">
            {product.category}
          </span>
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            ناموجود
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-slate-900">
          <Link href={`/products/${product.id}`} className="transition hover:text-brand">
            {product.title}
          </Link>
        </h3>
        {product.description && (
          <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{product.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl font-bold text-brand">{formatPrice(product.price)}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              soldOut ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {soldOut ? 'ناموجود' : `${product.stock.toLocaleString('fa-IR')} عدد موجود`}
          </span>
        </div>

        <button
          onClick={onAdd}
          disabled={soldOut || justAdded}
          className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {soldOut ? 'ناموجود' : justAdded ? '✓ افزوده شد' : 'افزودن به سبد'}
        </button>
      </div>
    </article>
  );
}
