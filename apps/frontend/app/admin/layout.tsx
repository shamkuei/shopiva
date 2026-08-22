'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { User } from '@/lib/types';

/** The authenticated admin user, available to any admin page. */
export const AdminUserContext = createContext<User | null>(null);

export function useAdminUser(): User | null {
  return useContext(AdminUserContext);
}

/**
 * Auth gate for EVERY admin page (products, orders, subpages included).
 * Redirects to /login when unauthenticated — no admin shell ever renders
 * for a logged-out visitor. The real authorization check stays server-side
 * on the API; this is the UI-side guard.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await apiFetch<User>('/api/auth/me');
        if (!alive) return;
        setUser(me);
        setState('ok');
      } catch {
        if (!alive) return;
        setState('denied');
        router.replace('/login');
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  if (state !== 'ok') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-slate-500">
        {state === 'loading' ? 'در حال بارگذاری…' : 'در حال انتقال به ورود…'}
      </div>
    );
  }

  return <AdminUserContext.Provider value={user}>{children}</AdminUserContext.Provider>;
}
