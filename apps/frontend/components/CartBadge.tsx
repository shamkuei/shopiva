'use client';

import Link from 'next/link';
import { useCart, selectCartCount } from '@/lib/cartStore';
import { useHydrated } from '@/lib/useHydrated';

export function CartBadge() {
  const hydrated = useHydrated();
  const count = useCart(selectCartCount);
  const items = hydrated ? count : 0;

  return (
    <Link
      href="/cart"
      aria-label={`سبد خرید${items > 0 ? `، ${items.toLocaleString('fa-IR')} کالا` : ''}`}
      className="relative grid h-11 w-11 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-brand"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
        <path d="M3 4h2l2.4 12h11l2-8H6.2" />
      </svg>
      {items > 0 && (
        <span className="absolute left-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-none text-white">
          {items.toLocaleString('fa-IR')}
        </span>
      )}
    </Link>
  );
}
