'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { User, Store } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await apiFetch<User>('/api/auth/me');
        if (!alive) return;
        setUser(me);
        // The store is owned by this user; best-effort fetch for display.
        try {
          setStore(await apiFetch<Store>('/api/admin/store'));
        } catch {
          /* store fetch is non-fatal */
        }
      } catch {
        router.replace('/login');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Admin panel</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {store ? store.name : 'Your store'}
          </h1>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Log out
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Signed in as</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Email</dt>
            <dd className="font-medium text-slate-800">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Role</dt>
            <dd className="font-medium text-slate-800">{user?.role}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Store</dt>
            <dd className="font-medium text-slate-800">
              {store ? `${store.subdomain}.shopiva.app` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Store ID</dt>
            <dd className="font-mono text-xs text-slate-600">{store?.id ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Catalog</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add, edit, and remove the products in your store.
        </p>
        <Link
          href="/admin/products"
          className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Manage products →
        </Link>
      </section>

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/" className="font-semibold text-brand hover:underline">
          ← Back to storefront
        </Link>
      </p>
    </div>
  );
}
