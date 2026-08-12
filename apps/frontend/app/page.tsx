import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { CartBadge } from '@/components/CartBadge';
import type { Product } from '@/lib/types';

// Server-side base URL (resolves to the backend service inside Docker).
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'فروشگاه شاپیوا';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data as T;
  } catch {
    return null; // backend not reachable
  }
}

export default async function Home() {
  const products = await fetchJson<Product[]>('/api/products');
  const backendDown = products === null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{STORE_NAME}</p>
          <div className="flex items-center gap-3">
            <CartBadge />
            <Link href="/admin" className="text-sm font-semibold text-brand hover:underline">
              پنل مدیریت
            </Link>
          </div>
        </div>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">{STORE_NAME}</h1>
        <p className="mt-2 text-slate-500">به فروشگاه ما خوش آمدید. این‌ها محصولات موجود هستند.</p>
      </header>

      {backendDown && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-semibold">ارتباط با سرور برقرار نشد</p>
          <p className="mt-1 text-sm">
            امکان اتصال به <code className="font-mono">{API_URL}</code> وجود ندارد. اگر تازه استارت
            زده‌اید، ممکن است سرور در حال راه‌اندازی باشد — چند ثانیه بعد دوباره تلاش کنید.
          </p>
        </div>
      )}

      {!backendDown && products && products.length > 0 && (
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </section>
      )}

      {!backendDown && products && products.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          هنوز محصولی ثبت نشده است.
        </p>
      )}
    </div>
  );
}
