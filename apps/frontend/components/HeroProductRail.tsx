'use client';

import Link from 'next/link';
import { useRef } from 'react';
import type { Product } from '@/lib/types';
import { formatPrice, resolveImageUrl } from '@/lib/api';
import { useCart } from '@/lib/cartStore';

/**
 * Horizontally-scrolling strip of featured products inside the hero.
 * Native scroll on touch; arrow buttons (RTL-aware) on desktop.
 */
export function HeroProductRail({ products }: { products: Product[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollByCards(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    // In RTL, scrollLeft is negative — a fixed delta keeps direction intuitive.
    rail.scrollBy({ left: direction * 256, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative mt-12 animate-fade-up" style={{ animationDelay: '0.45s' }}>
      <div className="mb-4 flex items-end justify-between px-1">
        <div>
          <h2 className="text-display-md text-slate-900">پیشنهاد ویژه</h2>
          <p className="mt-0.5 text-sm text-slate-500">منتخبِ این هفته فروشگاه</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="اسکرول به راست"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand/30 hover:text-brand disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="اسکرول به چپ"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand/30 hover:text-brand disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <RailCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function RailCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const soldOut = product.stock <= 0;
  const img = resolveImageUrl(product.imageUrl);

  return (
    <article className="group flex w-48 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-warm sm:w-56">
      <Link href={`/products/${product.id}`} className="relative block h-36 overflow-hidden bg-gradient-to-br from-slate-100 to-accent/15">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-4xl">🛍️</span>
        )}
        {product.category && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-brand backdrop-blur">
            {product.category}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/products/${product.id}`} className="line-clamp-1 text-sm font-semibold text-slate-900 hover:text-brand">
          {product.title}
        </Link>
        <span className="mt-1 text-base font-extrabold text-brand">{formatPrice(product.price)}</span>

        <button
          type="button"
          onClick={() =>
            add({
              productId: product.id,
              title: product.title,
              price: product.price,
              imageUrl: product.imageUrl,
            })
          }
          disabled={soldOut}
          className="mt-3 w-full rounded-xl bg-brand/10 py-2 text-xs font-bold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {soldOut ? 'ناموجود' : 'افزودن به سبد'}
        </button>
      </div>
    </article>
  );
}
