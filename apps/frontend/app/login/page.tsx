'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
      // کوکی احراز هویت httpOnly توسط مرورگر تنظیم شد -> رفتن به پنل مدیریت.
      router.replace('/admin');
    } catch {
      setError('ایمیل یا رمز عبور نادرست است.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">ورود</h1>
      <p className="mt-1 text-slate-500">برای ورود به پنل مدیریت فروشگاه خود، وارد شوید.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        هنوز فروشگاه نساخته‌اید؟{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          ساخت فروشگاه
        </Link>
      </p>
    </div>
  );
}
