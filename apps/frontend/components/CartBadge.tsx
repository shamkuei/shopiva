'use client';

import Link from 'next/link';
import { useCart, selectCartCount } from '@/lib/cartStore';
import { useHydrated } from '@/lib/useHydrated';

export function CartBadge() {
  const hydrated = useHydrated();
  const count = useCart(selectCartCount);
  return (
    <Link
      href="/cart"
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      سبد خرید {hydrated && count > 0 ? `(${count.toLocaleString('fa-IR')})` : ''}
    </Link>
  );
}
