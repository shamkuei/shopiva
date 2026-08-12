import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { CartBadge } from '@/components/CartBadge';
import type { Product } from '@/lib/types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'فروشگاه شاپیوا';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data as T;
  } catch {
    return null;
  }
}

export default async function Home() {
  const products = await fetchJson<Product[]>('/api/products');
  const backendDown = products === null;

  return (
    <div>
      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden">
        {/* warm gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-slate-50 to-accent/10" />
        {/* decorative animated blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-brand/20 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl animate-blob [animation-delay:3s]" />

        <div className="mx-auto max-w-6xl px-6 pt-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
              <span className="h-2 w-2 rounded-full bg-brand" /> شاپیوا
            </span>
            <div className="flex items-center gap-3">
              <CartBadge />
              <Link href="/admin" className="text-sm font-semibold text-brand hover:underline">
                پنل مدیریت
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <h1
            className="text-display-2xl text-slate-900 animate-fade-up"
            style={{ animationDelay: '0.05s' }}
          >
            {STORE_NAME}
          </h1>
          <p
            className="mx-auto mt-4 max-w-xl text-lg text-slate-600 animate-fade-up"
            style={{ animationDelay: '0.18s' }}
          >
            بهترین‌هایتان را اینجا کشف کنید — محصولات انتخاب‌شده، قیمت منصفانه و
            ارسال سریع تا دست شما.
          </p>
          <div
            className="mt-9 flex items-center justify-center gap-3 animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            <a
              href="#products"
              className="rounded-full bg-brand px-7 py-3 text-base font-semibold text-white shadow-warm transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              شروع خرید
            </a>
            <Link
              href="/cart"
              className="rounded-full border border-slate-200 bg-white/60 px-6 py-3 text-base font-medium text-slate-700 backdrop-blur transition hover:bg-white"
            >
              سبد خرید
            </Link>
          </div>

          {/* trust row */}
          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            <span>🚚 ارسال سریع</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>🔒 پرداخت امن</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>✨ ضمانت اصالت</span>
          </div>
        </div>
      </section>

      {/* ───────────── Products ───────────── */}
      <section id="products" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-display-lg text-slate-900">محصولات</h2>
            <p className="mt-1 text-slate-500">منتخبی از بهترین کالاهای فروشگاه</p>
          </div>
        </div>

        {backendDown && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <p className="font-semibold">ارتباط با سرور برقرار نشد</p>
            <p className="mt-1 text-sm">
              امکان اتصال به <code className="font-mono">{API_URL}</code> وجود ندارد. اگر تازه استارت
              زده‌اید، ممکن است سرور در حال راه‌اندازی باشد — چند ثانیه بعد دوباره تلاش کنید.
            </p>
          </div>
        )}

        {!backendDown && products && products.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {!backendDown && products && products.length === 0 && (
          <p className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500">
            هنوز محصولی ثبت نشده است.
          </p>
        )}
      </section>
    </div>
  );
}
