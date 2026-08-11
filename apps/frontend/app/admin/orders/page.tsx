'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, formatPrice } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { Order, OrderStatus } from '@/lib/types';

const FILTERS: Array<{ label: string; value: OrderStatus | 'all' }> = [
  { label: 'همه', value: 'all' },
  { label: 'در انتظار', value: 'pending' },
  { label: 'پرداخت‌شده', value: 'paid' },
  { label: 'ارسال‌شده', value: 'shipped' },
  { label: 'لغو‌شده', value: 'cancelled' },
  { label: 'ناموفق', value: 'failed' },
];

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const path = filter === 'all' ? '/api/admin/orders' : `/api/admin/orders?status=${filter}`;
        const data = await apiFetch<Order[]>(path);
        if (active) setOrders(data);
        setError('');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'بارگذاری سفارش‌ها ناموفق بود.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <AdminNav />

      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">سفارش‌ها</h1>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              filter === f.value
                ? 'bg-brand text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">سفارش</th>
              <th className="px-4 py-3">مشتری</th>
              <th className="px-4 py-3">وضعیت</th>
              <th className="px-4 py-3">مبلغ</th>
              <th className="px-4 py-3">تاریخ</th>
              <th className="px-4 py-3 text-start">مشاهده</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  در حال بارگذاری…
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {filter !== 'all' ? `سفارشی با وضعیت «${FILTERS.find((f) => f.value === filter)?.label}» وجود ندارد.` : 'هنوز سفارشی ثبت نشده است.'}
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">#{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-slate-800">{o.customerName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">{formatPrice(o.totalAmount)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(o.createdAt).toLocaleDateString('fa-IR')}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    مشاهده
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
