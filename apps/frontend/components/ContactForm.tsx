'use client';

import { useState, type FormEvent } from 'react';

const SUBJECTS = ['سؤال عمومی', 'پشتیبانی سفارش', 'بازگشت و بازپرداخت', 'فروش عمده'] as const;

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

/**
 * فرم تماس — صرفاً نمایشی است؛ هیچ منطقی در بک‌اند وصل نیست
 * و پس از ارسال فقط پیام تأیید نشان می‌دهد.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-card">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">
          ✓
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">پیام شما ارسال شد</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          ممنون از تماس‌تان! تیم پشتیبانی معمولاً ظرف یک روز کاری پاسخ می‌دهد.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
        >
          ارسال پیام دیگر
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="فرم تماس"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"
    >
      <h2 className="text-xl font-bold text-slate-900">برای ما پیام بفرستید</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">نام</span>
          <input id="c-name" type="text" autoComplete="name" required className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">ایمیل</span>
          <input
            id="c-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className={inputCls}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">موضوع</span>
        <select id="c-subject" className={inputCls} defaultValue={SUBJECTS[0]}>
          {SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">پیام</span>
        <textarea
          id="c-message"
          required
          rows={5}
          placeholder="چطور می‌توانیم کمک کنیم؟"
          className={`${inputCls} resize-y`}
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-500">معمولاً ظرف ۲۴ ساعت پاسخ می‌دهیم.</span>
        <button
          type="submit"
          className="rounded-xl bg-brand px-7 py-3 text-base font-semibold text-white shadow-warm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          ارسال پیام
        </button>
      </div>
    </form>
  );
}
