'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';
import { useCart, selectCartTotal } from '@/lib/cartStore';
import { useHydrated } from '@/lib/useHydrated';
import { apiStorePost, apiFetch, formatPrice, resolveImageUrl } from '@/lib/api';
import type { Order } from '@/lib/types';

/** Preview response of GET /api/coupons/:code. */
type CouponView = { code: string; percentOff: number };

const inputCls =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25';

/** مراحل بالای صفحه — سبد انجام شده، در این صفحه هستیم، پرداخت در درگاه انجام می‌شود. */
function StepsMini() {
  return (
    <div className="flex items-center gap-2 pt-8 text-sm" aria-label="مراحل خرید">
      <Link href="/cart" className="font-medium text-brand">
        ✓ سبد
      </Link>
      <span className="text-slate-400">‹</span>
      <span className="font-bold text-slate-900">جزئیات</span>
      <span className="text-slate-400">‹</span>
      <span className="text-slate-400">پرداخت</span>
      <span className="text-slate-400">‹</span>
      <span className="text-slate-400">انجام</span>
    </div>
  );
}

function BlockHead({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm font-bold text-white">
        {num}
      </span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

export default function CheckoutPage() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const total = useCart(selectCartTotal);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Coupon state ──
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponView | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);

  const discount = coupon ? Math.floor((total * coupon.percentOff) / 100) : 0;
  const payable = Math.max(0, total - discount);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const view = await apiFetch<CouponView>(`/api/coupons/${encodeURIComponent(code)}`);
      setCoupon(view);
    } catch (err) {
      setCoupon(null);
      setCouponError(
        err instanceof Error ? err.message : 'اعتبارسنجی کد تخفیف ناموفق بود.',
      );
    } finally {
      setCouponChecking(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) return;
    if (!name.trim() || !address.trim()) {
      setError('نام و آدرس الزامی است.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // ۱. ثبت سفارش (وضعیت: در انتظار). کد تخفیف در سرور اعتبارسنجی و
      //    اعمال می‌شود — این فقط ارسال آن است.
      const order = await apiStorePost<Order>('/api/orders', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customer: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: postalCode.trim()
            ? `${address.trim()} — کدپستی: ${postalCode.trim()}`
            : address.trim(),
        },
        discountCode: coupon?.code,
      });

      // ۲. شروع پرداخت و انتقال به درگاه زرین‌پال. سبد فقط پس از تأیید پرداخت
      //    در صفحه‌ی نتیجه خالی می‌شود تا در صورت شکست، برای تلاش مجدد باقی بماند.
      const { gatewayUrl } = await apiStorePost<{ gatewayUrl: string }>(
        `/api/orders/${order.id}/pay`,
        {},
      );
      window.location.href = gatewayUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت سفارش ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div>
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-12 text-slate-400">در حال بارگذاری…</div>
        <SiteFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="font-display text-display-lg text-slate-900">تسویه حساب</h1>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
            <p className="text-slate-500">سبد خرید شما خالی است.</p>
            <Link
              href="/"
              className="mt-3 inline-block font-semibold text-brand hover:underline"
            >
              مشاهده‌ی محصولات ←
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6">
        <StepsMini />
        <h1 className="mt-2 font-display text-display-lg text-slate-900">تسویه حساب</h1>
        <p className="mt-1 text-slate-500">
          نیازی به حساب کاربری نیست — فقط اطلاعات ارسال را وارد کنید.
        </p>

        <div className="grid items-start gap-6 py-10 lg:grid-cols-[1fr_25rem]">
          <form onSubmit={onSubmit} className="space-y-8">
            {/* بلوک ۱ — اطلاعات تماس */}
            <section className="border-b border-slate-200 pb-8">
              <BlockHead num="۱" title="اطلاعات تماس" />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">نام و نام خانوادگی</span>
                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">شماره تماس</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                />
              </label>
            </section>

            {/* بلوک ۲ — آدرس ارسال */}
            <section className="border-b border-slate-200 pb-8">
              <BlockHead num="۲" title="آدرس ارسال" />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">آدرس کامل</span>
                <textarea
                  required
                  rows={3}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`${inputCls} resize-y`}
                />
              </label>
              <label className="mt-4 block sm:max-w-64">
                <span className="text-sm font-medium text-slate-700">
                  کد پستی <span className="text-slate-400">(اختیاری)</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={inputCls}
                />
              </label>
            </section>

            {/* بلوک ۳ — پرداخت */}
            <section>
              <BlockHead num="۳" title="پرداخت" />
              <div className="flex items-center gap-4 rounded-xl border-[1.5px] border-brand bg-brand/5 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <div className="flex-1 text-sm">
                  <strong className="text-slate-900">پرداخت امن زرین‌پال</strong>
                  <br />
                  <span className="text-slate-500">
                    پس از ثبت سفارش به درگاه بانکی منتقل می‌شوید.
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                با ثبت سفارش با قوانین و سیاست حریم خصوصی ما موافقت می‌کنید.
              </p>
            </section>

            {error && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-base font-semibold text-white shadow-warm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:translate-y-0 disabled:opacity-60"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              {submitting
                ? 'در حال انتقال به درگاه…'
                : `پرداخت ${formatPrice(payable.toFixed(2))}`}
            </button>
          </form>

          {/* خلاصه سفارش — چسبان روی دسکتاپ */}
          <aside aria-label="خلاصه سفارش" className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <h2 className="mb-4 text-lg font-bold text-slate-900">خلاصه سفارش</h2>
              <ul>
                {items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-2">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-accent/15">
                      {resolveImageUrl(i.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(i.imageUrl) ?? ''}
                          alt={i.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-xl">🛍️</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{i.title}</div>
                      <div className="text-xs text-slate-400">
                        × {i.quantity.toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatPrice((Number(i.price) * i.quantity).toFixed(2))}
                    </span>
                  </li>
                ))}
              </ul>

              {/* کد تخفیف */}
              {coupon ? (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-emerald-700">
                    <strong className="font-mono">{coupon.code}</strong>
                    ({coupon.percentOff.toLocaleString('fa-IR')}٪ تخفیف)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCoupon(null);
                      setCouponInput('');
                    }}
                    className="text-xs text-emerald-700 underline"
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="کد تخفیف"
                      aria-label="کد تخفیف"
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm uppercase outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponChecking || !couponInput.trim()}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      {couponChecking ? '…' : 'اعمال'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="mt-2 text-xs text-rose-600">{couponError}</p>
                  )}
                </div>
              )}

              {/* جمع‌بندی */}
              <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>جمع کل</span>
                  <span>{formatPrice(total.toFixed(2))}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-emerald-700">
                    <span>تخفیف ({coupon.code})</span>
                    <span>−{formatPrice(discount.toFixed(2))}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-between border-t-2 border-slate-900 pt-3 text-lg font-bold text-slate-900">
                <span>مبلغ قابل پرداخت</span>
                <span>{formatPrice(payable.toFixed(2))}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
