import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { CartBadge } from '@/components/CartBadge';
import type { Product, Store } from '@/lib/types';

// Server-side base URL (resolves to the backend service inside Docker).
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Fetch a storefront resource scoped to `subdomain`. status 404 => store missing. */
async function fetchStoreJson<T>(path: string, subdomain: string): Promise<{ data: T | null; status: number }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'x-store-subdomain': subdomain },
      cache: 'no-store',
    });
    if (!res.ok) return { data: null, status: res.status };
    return { data: (await res.json()).data as T, status: res.status };
  } catch {
    return { data: null, status: 0 }; // backend not reachable
  }
}

export default async function Home() {
  const h = await headers();
  const subdomain = h.get('x-store-subdomain');

  // Apex / www / no subdomain -> marketing landing (login/register/admin).
  if (!subdomain) {
    return <Landing />;
  }

  const storeRes = await fetchStoreJson<Store>('/api/stores/current', subdomain);
  if (storeRes.status === 404) {
    // Subdomain didn't map to a store -> proper 404 page.
    notFound();
  }

  const productsRes = await fetchStoreJson<Product[]>('/api/products', subdomain);
  const store = storeRes.data;
  const products = productsRes.data;
  const backendDown = store === null && products === null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            {store ? `${store.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'shopiva.app'}` : subdomain}
          </p>
          <div className="flex items-center gap-3">
            <CartBadge />
            <Link href="/admin" className="text-sm font-semibold text-brand hover:underline">
              پنل مدیریت
            </Link>
          </div>
        </div>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
          {store ? store.name : 'فروشگاه شما'}
        </h1>
        <p className="mt-2 text-slate-500">
          {store
            ? `به ${store.name} خوش آمدید. این‌ها محصولات موجود هستند.`
            : 'فروشگاه پس از اتصال به سرور نمایش داده می‌شود.'}
        </p>
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

function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">شاپیوا</p>
      <h1 className="mt-2 text-5xl font-bold tracking-tight text-slate-900">
        فروشگاه آنلاین خود را در چند دقیقه راه‌اندازی کنید
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
        شاپیوا یک پلتفرم چندفروشگاهی برای ساخت فروشگاه آنلاین است. هر فروشگاه زیردامنه‌ی اختصاصی
        خود را دارد — همین حالا فروشگاه خود را بسازید و فروش را شروع کنید.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          ساخت فروشگاه
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ورود
        </Link>
      </div>
    </div>
  );
}
