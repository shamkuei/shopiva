'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';
import { apiFetch, formatPrice } from '@/lib/api';
import type { OrderStatus } from '@/lib/types';

/** پاسخ امنِ اندپوینت عمومی /api/orders/track/:id — بدون اطلاعات مشتری. */
type TrackedOrder = {
  id: string;
  status: OrderStatus;
  totalAmount: string;
  discountAmount?: string;
  discountCode?: string | null;
  createdAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  refId: string | null;
  items: { productId: string; title: string; quantity: number; unitPrice: string }[];
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  failed: 'پرداخت ناموفق',
  shipped: 'ارسال‌شده',
  cancelled: 'لغو‌شده',
};

/** گام‌های نوار پیشرفت — وضعیت‌های پایانی مثبت به «تحویل» ختم نمی‌شوند،
 *  چون سیستم تأیید تحویل جدا از «ارسال‌شده» ندارد. */
const STEPS = ['ثبت سفارش', 'پرداخت', 'ارسال'] as const;

function stepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 0; // ثبت شده، در انتظار پرداخت
    case 'paid':
      return 1;
    case 'shipped':
      return 2;
    default:
      return 1; // failed/cancelled: تا لحظهٔ آخرین رویداد معتبر
  }
}

function LookupForm({
  initialId,
  onFound,
  onError,
}: {
  initialId: string;
  onFound: (o: TrackedOrder) => void;
  onError: (msg: string) => void;
}) {
  const [orderId, setOrderId] = useState(initialId);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) return;
    setLoading(true);
    onError('');
    try {
      const data = await apiFetch<TrackedOrder>(`/api/orders/track/${encodeURIComponent(id)}`);
      onFound(data);
    } catch {
      onError('سفارشی با این شماره پیدا نشد. شماره سفارش را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="پیگیری سفارش"
      className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"
    >
      <h2 className="text-lg font-bold text-slate-900">شماره سفارش خود را وارد کنید</h2>
      <p className="mt-1 text-sm text-slate-500">
        شماره سفارش پس از پرداخت موفق در صفحهٔ نتیجه نمایش داده می‌شود.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          required
          dir="ltr"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="مثلاً 123e4567-e89b…"
          aria-label="شماره سفارش"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand px-7 py-3 font-semibold text-white shadow-warm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? 'در حال جستجو…' : 'پیگیری'}
        </button>
      </div>
    </form>
  );
}

function StatusStepper({ status }: { status: OrderStatus }) {
  const current = stepIndex(status);
  return (
    <div role="list" aria-label="پیشرفت سفارش" className="flex items-start py-6">
      {STEPS.map((label, i) => (
        <div key={label} role="listitem" className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {i > 0 && (
              <span
                className={`h-0.5 flex-1 ${i <= current ? 'bg-brand' : 'bg-slate-200'}`}
                aria-hidden
              />
            )}
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                i < current
                  ? 'bg-emerald-500 text-white'
                  : i === current
                    ? 'bg-brand text-white'
                    : 'border-2 border-slate-300 bg-white text-slate-400'
              }`}
            >
              {i < current ? '✓' : (i + 1).toLocaleString('fa-IR')}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`h-0.5 flex-1 ${i < current ? 'bg-brand' : 'bg-slate-200'}`}
                aria-hidden
              />
            )}
          </div>
          <span
            className={`mt-2 text-xs font-medium ${
              i <= current ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** رویدادها فقط از زمان‌های واقعی دیتابیس ساخته می‌شوند — هیچ زمانی جعل نمی‌شود. */
function Timeline({ order }: { order: TrackedOrder }) {
  const events: { title: string; time: Date }[] = [
    { title: 'ثبت سفارش', time: new Date(order.createdAt) },
  ];
  if (order.paidAt) events.push({ title: 'پرداخت تأیید شد', time: new Date(order.paidAt) });
  if (order.shippedAt) events.push({ title: 'ارسال شد', time: new Date(order.shippedAt) });

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">رویدادها</h2>
      <ul className="mt-4">
        {events.map((ev, i) => (
          <li key={ev.title} className="relative grid grid-cols-6 gap-3 pb-4">
            {i < events.length - 1 && (
              <span
                className="absolute start-[11px] top-6 bottom-0 w-0.5 bg-slate-200"
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 col-span-1 grid h-6 w-6 place-items-center rounded-full text-white ${
                i === 0 ? 'bg-emerald-500' : 'bg-brand'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="col-span-5">
              <div className="text-sm font-semibold text-slate-900">{ev.title}</div>
              <div className="text-xs text-slate-400">
                {ev.time.toLocaleDateString('fa-IR')} — {ev.time.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackPageInner />
    </Suspense>
  );
}

function TrackPageInner() {
  // شماره سفارش از لینک «پیگیری سفارش» در صفحهٔ نتیجهٔ پرداخت می‌آید.
  const initialId = useSearchParams().get('order') ?? '';
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');

  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6">
        <div className="pt-10">
          <span className="text-sm font-semibold text-brand">پیگیری سفارش</span>
          <h1 className="mt-1 font-display text-display-lg text-slate-900">سفارش من کجاست؟</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            با شمارهٔ سفارش، وضعیت پرداخت و ارسال آن را همین‌جا ببینید.
          </p>
        </div>

        <div className="py-10">
          {!order && (
            <>
              <LookupForm initialId={initialId} onFound={setOrder} onError={setError} />
              {error && (
                <p className="mx-auto mt-4 max-w-xl rounded-xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
                  {error}
                </p>
              )}
            </>
          )}

          {order && (
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-mono text-lg font-bold text-slate-900" dir="ltr">
                    #{order.id}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === 'shipped'
                        ? 'bg-emerald-50 text-emerald-700'
                        : order.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>

                <StatusStepper status={order.status} />
                <div className="border-t border-slate-200 pt-5">
                  <Timeline order={order} />
                </div>
                <button
                  type="button"
                  onClick={() => setOrder(null)}
                  className="mt-2 text-sm font-medium text-brand hover:underline"
                >
                  پیگیری سفارش دیگر ←
                </button>
              </section>

              <aside className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                  <h3 className="mb-3 text-base font-bold text-slate-900">اقلام این سفارش</h3>
                  <ul className="space-y-2">
                    {order.items.map((it) => (
                      <li key={it.productId} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700">
                          {it.title}{' '}
                          <span className="text-slate-400">× {it.quantity.toLocaleString('fa-IR')}</span>
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatPrice((Number(it.unitPrice) * it.quantity).toFixed(2))}
                      </span>
                      </li>
                    ))}
                  </ul>
                  {order.discountCode && Number(order.discountAmount ?? 0) > 0 && (
                    <div className="mt-3 flex justify-between text-sm text-emerald-700">
                      <span>تخفیف ({order.discountCode})</span>
                      <span>−{formatPrice(order.discountAmount!)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-900">
                    <span>مجموع</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                  {order.discountCode && Number(order.discountAmount ?? 0) > 0 && (
                    <div className="mt-1 flex justify-between text-sm text-slate-500">
                      <span>مبلغ قابل پرداخت</span>
                      <span>
                        {formatPrice(
                          (Number(order.totalAmount) - Number(order.discountAmount ?? 0)).toFixed(
                            2,
                          ),
                        )}
                      </span>
                    </div>
                  )}
                  {order.refId && (
                    <p className="mt-3 text-xs text-slate-400" dir="ltr">
                      ref: {order.refId}
                    </p>
                  )}
                </div>

                <Link
                  href="/contact"
                  className="block rounded-2xl border border-slate-300 bg-white p-4 text-center text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
                >
                  برای این سفارش کمک نیاز دارید؟
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
