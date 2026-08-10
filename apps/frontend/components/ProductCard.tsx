import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/api';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 text-4xl">
        🛍️
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
      {product.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-brand">
          {formatPrice(product.price, product.currency)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            product.stock > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}
        </span>
      </div>
    </article>
  );
}
