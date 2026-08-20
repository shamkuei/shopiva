'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/api';
import { useCart } from '@/lib/cartStore';

type Spec = { label: string; value: string };

/** آیکون‌های ردیف مزایا */
const PERKS = [
  {
    icon: (
      <path
        d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    text: 'ارسال سریع به سراسر کشور',
  },
  {
    icon: (
      <>
        <path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5" strokeLinecap="round" />
        <path d="M18 4v3h-3M6 20v-3h3" strokeLinecap="round" />
      </>
    ),
    text: 'امکان بازگشت کالا',
  },
  {
    icon: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
      </>
    ),
    text: 'پرداخت امن',
  },
] as const;

const TABS = ['توضیحات', 'مشخصات', 'ارسال'] as const;

/**
 * پنل تعاملی صفحهٔ محصول — انتخاب تعداد، افزودن به سبد و تب‌های اطلاعات.
 * مقادیر مشخصات در سرور ساخته و به‌صورت پراپ پاس داده می‌شوند تا
 * تاریخ‌ها بین سرور و کلاینت یکسان بمانند.
 */
export function ProductDetailPanel({
  product,
  specs,
}: {
  product: Product;
  specs: Spec[];
}) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>('توضیحات');

  const soldOut = product.stock <= 0;
  const total = Number(product.price) * qty;

  function onAdd() {
    add(
      {
        productId: product.id,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
      },
      qty,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <div>
      {/* تعداد + افزودن به سبد */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center overflow-hidden rounded-xl border-[1.5px] border-slate-300" aria-label="تعداد">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="کاهش تعداد"
            className="h-11 w-11 text-xl text-slate-700 transition hover:bg-slate-100"
          >
            −
          </button>
          <span aria-live="polite" className="min-w-11 text-center font-semibold text-slate-900">
            {qty.toLocaleString('fa-IR')}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
            aria-label="افزایش تعداد"
            className="h-11 w-11 text-xl text-slate-700 transition hover:bg-slate-100"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={soldOut || justAdded}
          className="flex min-w-52 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-warm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
            <path d="M3 4h2l2.4 12h11l2-8H6.2" />
          </svg>
          {soldOut
            ? 'ناموجود'
            : justAdded
              ? '✓ افزوده شد'
              : `افزودن به سبد · ${total.toLocaleString('fa-IR')} تومان`}
        </button>
      </div>

      {/* مزایا */}
      <div className="mt-8 flex flex-col gap-2.5 border-t border-slate-200 pt-6">
        {PERKS.map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2 text-sm text-slate-500">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-brand"
              aria-hidden
            >
              {icon}
            </svg>
            {text}
          </div>
        ))}
      </div>

      {/* تب‌ها */}
      <div className="mt-10 border-t border-slate-200 pt-6">
        <div role="tablist" className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === t
                  ? 'bg-brand/10 text-brand'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'توضیحات' && (
            <div role="tabpanel" className="max-w-[70ch] leading-7 text-slate-600">
              {product.description ?? 'توضیحات این محصول هنوز ثبت نشده است.'}
            </div>
          )}

          {tab === 'مشخصات' && (
            <table role="tabpanel" className="max-w-md text-sm">
              <tbody className="divide-y divide-slate-200">
                {specs.map(({ label, value }) => (
                  <tr key={label}>
                    <th scope="row" className="py-2.5 pe-6 text-start font-medium text-slate-500">
                      {label}
                    </th>
                    <td className="py-2.5 text-slate-900">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'ارسال' && (
            <div role="tabpanel" className="max-w-[70ch] space-y-3 leading-7 text-slate-600">
              <p>
                سفارش‌ها پس از تأیید پرداخت در سریع‌ترین زمان ممکن ارسال می‌شوند. وضعیت ارسال از
                طریق شمارهٔ سفارش قابل پیگیری است.
              </p>
              <p>
                اگر کالا با سفارش شما مطابقت نداشت، برای بازگشت و عودت مبلغ با پشتیبانی در ارتباط
                باشید.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
