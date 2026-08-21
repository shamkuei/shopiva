'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartBadge } from '@/components/CartBadge';
import { BrandMark } from '@/components/BrandMark';

const NAV_LINKS = [
  { href: '/', label: 'خانه' },
  { href: '/products', label: 'محصولات' },
  { href: '/contact', label: 'تماس' },
] as const;

/** جستجوی محصولات — به /products?search=… می‌رود (جستجوی واقعی سمت سرور). */
function SearchBox({
  autoFocus = false,
  fullWidth = false,
  onSubmitted,
}: {
  autoFocus?: boolean;
  fullWidth?: boolean;
  onSubmitted?: () => void;
}) {
  const [q, setQ] = useState('');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmitted?.();
    const query = q.trim();
    window.location.href = query
      ? `/products?search=${encodeURIComponent(query)}`
      : '/products';
  }

  return (
    <form onSubmit={onSubmit} role="search" aria-label="جستجوی محصولات" className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="جستجوی محصول…"
        aria-label="جستجوی محصول"
        autoFocus={autoFocus}
        className={`rounded-lg border border-slate-200 bg-white/80 py-1.5 pe-8 ps-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25 ${
          fullWidth ? 'w-full' : 'w-44 focus:w-56'
        }`}
      />
      <button
        type="submit"
        aria-label="جستجو"
        className="absolute end-1.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-brand"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}

/**
 * نوار بالای فروشگاه — چسبان، با پس‌زمینهٔ مات‌شده، لینک‌های اصلی،
 * جستجو، دکمه‌های آیکونی (حساب و سبد خرید) و منوی کشویی موبایل.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // قفل اسکرول بدنه هنگام باز بودن منوی موبایل
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-[68px] max-w-6xl items-center gap-6 px-6">
        {/* نشان برند */}
        <Link href="/" aria-label="صفحهٔ اصلی" className="shrink-0">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white shadow-warm transition hover:bg-brand-dark">
            <BrandMark />
          </span>
        </Link>

        {/* لینک‌های اصلی (دسکتاپ) */}
        <nav aria-label="اصلی" className="ms-auto hidden md:block">
          <ul className="flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => {
              const current =
                href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={`relative inline-block py-2 text-sm font-medium transition hover:text-brand ${
                      current ? 'text-brand' : 'text-slate-700'
                    }`}
                  >
                    {label}
                    {current && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* جستجو (دسکتاپ) */}
        <div className="hidden md:block">
          <SearchBox />
        </div>

        {/* دکمه‌های آیکونی */}
        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <Link
            href="/login"
            aria-label="حساب کاربری"
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-brand"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
          </Link>

          <CartBadge />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={open}
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 md:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* منوی کشویی موبایل */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            aria-label="اصلی"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(80vw,20rem)] flex-col border-r border-slate-200 bg-white shadow-warm-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                <BrandMark />
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن منو"
                className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="p-3 pb-0">
              <SearchBox autoFocus fullWidth onSubmitted={() => setOpen(false)} />
            </div>
            <ul className="flex flex-col gap-1 p-3">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-brand"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
