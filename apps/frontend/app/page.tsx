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
              Admin →
            </Link>
          </div>
        </div>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
          {store ? store.name : 'Your storefront'}
        </h1>
        <p className="mt-2 text-slate-500">
          {store
            ? `Welcome to ${store.name}. Here's what's on the shelves.`
            : 'The storefront will appear here once the backend is reachable.'}
        </p>
      </header>

      {backendDown && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-semibold">Backend not reachable</p>
          <p className="mt-1 text-sm">
            The frontend couldn&apos;t reach <code className="font-mono">{API_URL}</code>. If you just
            started the stack, the backend may still be booting &mdash; refresh in a few seconds.
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
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">No products yet.</p>
      )}
    </div>
  );
}

function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">Shopiva</p>
      <h1 className="mt-2 text-5xl font-bold tracking-tight text-slate-900">
        Launch your own storefront in minutes
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
        Shopiva is a multi-tenant storefront builder. Each store lives on its own
        subdomain &mdash; create yours and start selling.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Create your store
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
