'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import type { User } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'مالک',
  ADMIN: 'مدیر',
  STAFF: 'کارمند',
};

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'فروشگاه شاپیوا';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await apiFetch<User>('/api/auth/me');
        if (!alive) return;
        setUser(me);
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
    return <div className="mx-auto max-w-3xl px-6 py-16 text-slate-500">در حال بارگذاری…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav />

      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">پنل مدیریت</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{STORE_NAME}</h1>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          خروج
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">اطلاعات کاربر</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">ایمیل</dt>
            <dd className="font-medium text-slate-800">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-slate-400">نقش</dt>
            <dd className="font-medium text-slate-800">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">محصولات</h2>
        <p className="mt-1 text-sm text-slate-500">افزودن، ویرایش و حذف محصولات فروشگاه.</p>
        <Link
          href="/admin/products"
          className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          مدیریت محصولات ←
        </Link>
      </section>

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/" className="font-semibold text-brand hover:underline">
          ← بازگشت به فروشگاه
        </Link>
      </p>
    </div>
  );
}
