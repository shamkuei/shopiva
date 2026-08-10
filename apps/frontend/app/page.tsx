import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import type { Product, Store } from '@/lib/types';

// Server-side base URL. Inside Docker this resolves to the backend service;
// outside Docker it falls back to localhost.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const STORE_SUBDOMAIN = 'default';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'x-store-subdomain': STORE_SUBDOMAIN },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()).data as T;
  } catch {
    return null; // backend not reachable yet
  }
}

export default async function Home() {
  const [store, products] = await Promise.all([
    fetchJson<Store>('/api/stores/current'),
    fetchJson<Product[]>('/api/products'),
  ]);

  const backendDown = store === null && products === null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            {store ? `${store.subdomain}.shopiva.app` : 'Shopiva'}
          </p>
          <Link
            href="/admin"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Admin →
          </Link>
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
            The frontend couldn&apos;t reach <code className="font-mono">{API_URL}</code>.
            If you just started the stack, the backend may still be booting &mdash; refresh in
            a few seconds. Otherwise check <code className="font-mono">npm run logs</code>.
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
          No products yet.
        </p>
      )}
    </div>
  );
}
