// Tiny client-side helper for calling the backend from browser components.
// Server components fetch directly (see app/page.tsx) using the server-side
// API_URL, which resolves to the internal docker hostname.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const DEFAULT_SLUG = 'default';

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'x-store-slug': DEFAULT_SLUG, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return (await res.json()).data as T;
}

export function formatPrice(price: string, currency: string): string {
  const amount = Number(price);
  if (Number.isNaN(amount)) return price;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
