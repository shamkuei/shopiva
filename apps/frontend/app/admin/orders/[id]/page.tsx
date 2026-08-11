'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, formatPrice } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { StatusBadge, STATUS_LABELS } from '@/components/admin/StatusBadge';
import type { OrderDetail, OrderStatus } from '@/lib/types';

const STATUSES: OrderStatus[] = ['pending', 'paid', 'failed', 'shipped', 'cancelled'];

export default function OrderDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  async function load() {
    try {
      setOrder(await apiFetch<OrderDetail>(`/api/admin/orders/${id}`));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری سفارش ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status: OrderStatus) {
    setUpdating(true);
    try {
      const updated = await apiFetch<OrderDetail>(`/api/admin/orders/${id}/status`, {
        method: 'PUT',
        body: { status },
      });
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <AdminNav />
        <p className="text-slate-400">در حال بارگذاری…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <AdminNav />
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error || 'سفارش پیدا نشد.'}
        </p>
        <Link href="/admin/orders" className="mt-4 inline-block font-semibold text-brand hover:underline">
          ← بازگشت به سفارش‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav />

      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            <Link href="/admin/orders" className="hover:underline">
              ← سفارش‌ها
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            سفارش #{order.id.slice(0, 8)}
          </h1>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">اطلاعات مشتری</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div><dt className="inline text-slate-400">نام: </dt><dd className="inline font-medium text-slate-800">{order.customerName}</dd></div>
            {order.customerPhone && (
              <div><dt className="inline text-slate-400">شماره تماس: </dt><dd className="inline font-medium text-slate-800">{order.customerPhone}</dd></div>
            )}
            {order.customerAddress && (
              <div><dt className="inline text-slate-400">آدرس: </dt><dd className="inline font-medium text-slate-800">{order.customerAddress}</dd></div>
            )}
            {order.refId && (
              <div><dt className="inline text-slate-400">کد پیگیری: </dt><dd className="inline font-mono text-xs text-slate-600">{order.refId}</dd></div>
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">وضعیت</h2>
          <p className="mt-3 text-sm text-slate-500">وضعیت سفارش را تغییر دهید (مثلاً پرداخت‌شده ← ارسال‌شده).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={updating || s === order.status}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
                  s === order.status
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {new Date(order.createdAt).toLocaleString('fa-IR')}
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          اقلام
        </h2>
        <table className="w-full text-right text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-2">محصول</th>
              <th className="px-5 py-2">تعداد</th>
              <th className="px-5 py-2">قیمت واحد</th>
              <th className="px-5 py-2 text-start">مبلغ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((it) => (
              <tr key={it.id}>
                <td className="px-5 py-3 font-medium text-slate-800">{it.productTitle ?? it.productId}</td>
                <td className="px-5 py-3 text-slate-600">{it.quantity.toLocaleString('fa-IR')}</td>
                <td className="px-5 py-3 text-slate-600">{formatPrice(it.unitPrice)}</td>
                <td className="px-5 py-3 text-slate-800">
                  {formatPrice((Number(it.unitPrice) * it.quantity).toFixed(2))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td colSpan={3} className="px-5 py-3 text-start font-semibold text-slate-700">مجموع</td>
              <td className="px-5 py-3 font-bold text-slate-900">{formatPrice(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
