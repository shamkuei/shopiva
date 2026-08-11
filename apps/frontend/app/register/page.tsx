'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

function toPersianError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('ubdomain')) return 'این زیردامنه قبلاً گرفته شده است.';
  if (m.includes('mail')) return 'این ایمیل قبلاً ثبت شده است.';
  if (m.includes('password')) return 'رمز عبور باید حداقل ۸ کاراکتر باشد.';
  return 'ثبت‌نام ناموفق بود. دوباره تلاش کنید.';
}

export default function RegisterPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { storeName, subdomain, email, password },
      });
      // ثبت‌نام انجام شد و کوکی احراز هویت تنظیم شد -> ورود به پنل مدیریت.
      router.replace('/admin');
    } catch (err) {
      setError(toPersianError(err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">ساخت فروشگاه</h1>
      <p className="mt-1 text-slate-500">یک فروشگاه و حساب کاربری مالک بسازید.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">نام فروشگاه</span>
          <input
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">زیردامنه</span>
          <div className="mt-1 flex items-center rounded-lg border border-slate-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <input
              required
              pattern="[a-z0-9-]+"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              className="w-full bg-transparent px-3 py-2 outline-none"
              placeholder="my-store"
            />
            <span className="px-3 text-sm text-slate-400">.shopiva.app</span>
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">ایمیل</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">رمز عبور</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <span className="mt-1 block text-xs text-slate-400">حداقل ۸ کاراکتر.</span>
        </label>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? 'در حال ساخت…' : 'ساخت فروشگاه'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        قبلاً فروشگاه ساخته‌اید؟{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          ورود
        </Link>
      </p>
    </div>
  );
}
