import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { Navbar } from '@/components/Navbar';
import { Newsletter } from '@/components/Newsletter';
import { SiteFooter } from '@/components/SiteFooter';
import { PromoStrip } from '@/components/PromoStrip';
import { HeroProductRail } from '@/components/HeroProductRail';
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

// ── Campaign content (edit per promotion) ─────────────────────
const PROMO_CODE = 'WELCOME20';
const PROMO_TEXT = '۲۰٪ تخفیف اولین خرید — کد:';
const HERO_HEADLINE = 'جشنوارهٔ فروش ویژه';
const HERO_SUBLINE =
  'محصولات انتخاب‌شده با قیمت منصفانه، پرداخت امن و ارسال سریع — فقط تا پایان این هفته.';

// How many products make it into the hero rail.
const RAIL_SIZE = 8;

export default async function Home() {
  const products = await fetchJson<Product[]>('/api/products');
  const backendDown = products === null;
  // Featured rail: in-stock first, newest first.
  const railProducts = (products ?? [])
    .filter((p) => p.stock > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RAIL_SIZE);

  return (
    <div>
      {/* ───────────── Campaign band ───────────── */}
      <PromoStrip code={PROMO_CODE} text={PROMO_TEXT} />

      {/* ───────────── Navbar ───────────── */}
      <Navbar />

      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden">
        {/* warm gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-slate-50 to-accent/10" />
        {/* decorative animated blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-brand/20 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl animate-blob [animation-delay:3s]" />

        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          {/* campaign eyebrow */}
          <span
            className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand backdrop-blur animate-fade-up"
            style={{ animationDelay: '0.02s' }}
          >
            <span aria-hidden>🔥</span> تخفیف تا ۲۰٪ — پایان در آخر هفته
          </span>

          <h1
            className="mt-5 text-display-2xl text-slate-900 animate-fade-up"
            style={{ animationDelay: '0.08s' }}
          >
            {HERO_HEADLINE}{' '}
            <span className="relative inline-block text-brand">
              {STORE_NAME}
              {/* saffron marker swoosh under the highlighted word */}
              <svg
                className="absolute -bottom-2 right-0 w-full text-accent"
                viewBox="0 0 200 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 9c40-5 120-7 194-3"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p
            className="mx-auto mt-6 max-w-xl text-lg text-slate-600 animate-fade-up"
            style={{ animationDelay: '0.18s' }}
          >
            {HERO_SUBLINE}
          </p>
          <div
            className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-fade-up"
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

        {/* ───────────── Featured product rail ───────────── */}
        <div className="relative mx-auto max-w-6xl px-6 pb-14">
          <HeroProductRail products={railProducts} />
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

      {/* ───────────── Newsletter ───────────── */}
      <Newsletter />

      {/* ───────────── Footer ───────────── */}
      <SiteFooter />
    </div>
  );
}
