'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

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
      // Registered + auth cookie set -> straight to the admin panel.
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create your store</h1>
      <p className="mt-1 text-slate-500">Register a store and owner account.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Store name</span>
          <input
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Subdomain</span>
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
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <span className="mt-1 block text-xs text-slate-400">At least 8 characters.</span>
        </label>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create store'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        Already have a store?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
