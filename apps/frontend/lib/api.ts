// API helpers for the frontend.
//
// Auth + admin requests use `credentials: 'include'` so the httpOnly auth
// cookies are sent automatically. Single store — no tenant/subdomain header.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Authenticated JSON request (auth + admin endpoints). */
export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  let payload: { data?: T; error?: { message?: string } } | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error(payload?.error?.message ?? `Request failed (${res.status})`);
  }
  return payload!.data as T;
}

/** Public storefront POST (e.g. checkout). */
export async function apiStorePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let payload: { data?: T; error?: { message?: string } } | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) throw new Error(payload?.error?.message ?? `Request failed (${res.status})`);
  return payload!.data as T;
}

/** Multipart upload (e.g. product image). Returns the parsed `data`. */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  let payload: { data?: T; error?: { message?: string } } | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) throw new Error(payload?.error?.message ?? `Upload failed (${res.status})`);
  return payload!.data as T;
}

/** Resolve an image URL: absolute (https://…) stays as-is, paths are prefixed. */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${API_URL}${url}`;
}

export function formatPrice(price: string): string {
  const amount = Number(price);
  if (Number.isNaN(amount)) return price;
  return `${amount.toLocaleString('fa-IR')} تومان`;
}
