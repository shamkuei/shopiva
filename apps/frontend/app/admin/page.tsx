'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, formatPrice } from '@/lib/api';
import { useAdminUser } from '@/app/admin/layout';
import { AdminNav } from '@/components/admin/AdminNav';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'مالک',
  ADMIN: 'مدیر',
  STAFF: 'کارمند',
};

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'فروشگاه شاپیوا';

type Stats = {
  revenue: string;
  ordersByStatus: Record<'pending' | 'paid' | 'failed' | 'shipped' | 'cancelled', number>;
  productCount: number;
  lowStock: { id: string; title: string; stock: number }[];
};

function StatCard({
  label,
  value,
  hint,
  href,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  accent?: boolean;
}) {
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-brand' : 'text-slate-900'}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/30"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">{body}</div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAdminUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    apiFetch<Stats>('/api/admin/stats')
      .then((s) => alive && setStats(s))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'خطا'));
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
  }

  const o = stats?.ordersByStatus;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <AdminNav />

      <header className="mb-8 flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-l from-brand to-brand-dark p-6 shadow-warm sm:p-8">
        <div>
          <p className="text-sm font-medium text-white/80">پنل مدیریت</p>
          <h1 className="mt-1 text-display-lg text-white">{STORE_NAME}</h1>
          {user && (
            <p className="mt-1 text-sm text-white/80">
              {user.email} · {ROLE_LABELS[user.role] ?? user.role}
            </p>
          )}
        </div>
        <button
          onClick={logout}
          className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
        >
          خروج
        </button>
      </header>

      {error && (
        <p className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      {stats ? (
        <>
          {/* کارت‌های آماری */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="درآمد (پرداخت‌شده)"
              value={formatPrice(stats.revenue)}
              hint="جمع سفارش‌های پرداخت‌شده و ارسال‌شده"
              accent
            />
            <StatCard
              label="در انتظار پرداخت"
              value={(o?.pending ?? 0).toLocaleString('fa-IR')}
              hint="نیازمند پیگیری"
              href="/admin/orders"
            />
            <StatCard
              label="ارسال‌شده"
              value={(o?.shipped ?? 0).toLocaleString('fa-IR')}
              href="/admin/orders"
            />
            <StatCard
              label="محصولات"
              value={stats.productCount.toLocaleString('fa-IR')}
              hint={`${stats.lowStock.length.toLocaleString('fa-IR')} مورد کم‌موجود`}
              href="/admin/products"
            />
          </div>

          {/* موجودی کم */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">موجودی کم</h2>
              <span className="text-xs text-slate-400">۵ عدد یا کمتر</span>
            </div>
            {stats.lowStock.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                موجودی همهٔ محصولات در وضعیت خوبی است. ✓
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {stats.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link
                      href="/admin/products"
                      className="font-medium text-slate-800 hover:text-brand"
                    >
                      {p.title}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.stock === 0
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {p.stock === 0
                        ? 'ناموجود'
                        : `${p.stock.toLocaleString('fa-IR')} عدد`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        !error && <p className="text-slate-500">در حال بارگذاری آمار…</p>
      )}

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/" className="font-semibold text-brand hover:underline">
          ← بازگشت به فروشگاه
        </Link>
      </p>
    </div>
  );
}
