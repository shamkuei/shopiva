'use client';

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
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(product.imageUrl) ?? ''}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl">🛍️</span>
        )}
      </div>

      {product.category && (
        <span className="mb-1 inline-block w-fit rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-brand">
          {product.category}
        </span>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{product.title}</h3>
      {product.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-brand">{formatPrice(product.price)}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            product.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {product.stock > 0 ? `${product.stock.toLocaleString('fa-IR')} موجود` : 'ناموجود'}
        </span>
      </div>

      <button
        onClick={onAdd}
        disabled={product.stock <= 0}
        className="mt-4 w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {product.stock <= 0 ? 'ناموجود' : justAdded ? '✓ به سبد افزوده شد' : 'افزودن به سبد'}
      </button>
    </article>
  );
}
