'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders', badge: true },
];

/**
 * Admin top nav. The Orders link carries a badge with the number of pending
 * orders, polled every 30s and refreshed on window focus — a lightweight "new
 * order" notification.
 */
export function AdminNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState<number | null>(null);

  async function loadPending() {
    try {
      const { count } = await apiFetch<{ count: number }>('/api/admin/orders/pending-count');
      setPending(count);
    } catch {
      /* ignore — badge is best-effort */
    }
  }

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 30_000);
    const onFocus = () => loadPending();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <nav className="mb-8 flex gap-1 border-b border-slate-200">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {link.label}
            {link.badge && pending !== null && pending > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">
                {pending}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
