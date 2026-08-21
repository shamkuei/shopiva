'use client';

import { useState, type FormEvent } from 'react';
import { apiStorePost } from '@/lib/api';

/**
 * کارت خبرنامه — گرادیان برند با دایره‌های تزئینی و فرم ایمیل.
 * ایمیل‌ها از طریق POST /api/newsletter/subscribe ذخیره می‌شوند
 * (عضویت تکراری خطا نیست — idempotent است).
 */
export function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setError('');
    try {
      await apiStorePost('/api/newsletter/subscribe', { email });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عضویت ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="newsletter-title" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-brand to-accent px-6 py-14 text-center text-white shadow-warm-lg">
        {/* دایره‌های تزئینی */}
        <div
          className="pointer-events-none absolute -top-28 right-[-3.75rem] h-[17.5rem] w-[17.5rem] rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[-6.25rem] left-[-2.5rem] h-[12.5rem] w-[12.5rem] rounded-full bg-white/10"
          aria-hidden
        />

        <div className="relative">
          <span className="text-sm font-semibold text-white/90">به باشگاه بپیوندید</span>
          <h2 id="newsletter-title" className="mt-2 font-display text-display-lg text-white">
            از محصولات جدید و پیشنهادهای ویژه زودتر باخبر شوید
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            برای دسترسی زودهنگام به محصولات جدید و پیشنهادهای ویژهٔ اعضا عضو شوید. هرگز اسپم
            نمی‌فرستیم.
          </p>

          {done ? (
            <p className="mx-auto mt-8 max-w-md rounded-2xl bg-white/15 px-6 py-4 font-medium text-white">
              ممنون! ایمیل شما ثبت شد. ✓
            </p>
          ) : (
            <div className="mx-auto mt-8 max-w-[30rem]">
              <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                  آدرس ایمیل
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ایمیل شما"
                  autoComplete="email"
                  className="min-w-[13.75rem] flex-1 rounded-xl border-none bg-white/95 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-950 disabled:opacity-60"
                >
                  {sending ? '…' : 'عضویت'}
                </button>
              </form>
              {error && <p className="mt-3 text-sm text-white">{error}</p>}
            </div>
          )}
          <p className="mt-5 text-xs text-white/80">
            با عضویت با سیاست حریم خصوصی ما موافقت می‌کنید. هر زمان می‌توانید لغو عضویت کنید.
          </p>
        </div>
      </div>
    </section>
  );
}
