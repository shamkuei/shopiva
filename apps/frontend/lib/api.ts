// API helpers for the frontend.
//
// All requests use `credentials: 'include'` so the httpOnly auth cookies
// (access_token / refresh_token) are sent automatically. The tokens are NEVER
// read by client JS — there's no localStorage involvement.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const DEFAULT_SUBDOMAIN = 'default';

/** Public storefront GET (tenant resolved via the x-store-subdomain header). */
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'x-store-subdomain': DEFAULT_SUBDOMAIN, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return (await res.json()).data as T;
}

/** Public storefront POST (tenant-scoped, e.g. checkout). */
export async function apiStorePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-store-subdomain': DEFAULT_SUBDOMAIN },
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

/** Authenticated JSON request for the auth + admin endpoints. */
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

  // 204 No Content (e.g. DELETE) has no body.
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

export function formatPrice(price: string, currency = 'USD'): string {
  const amount = Number(price);
  if (Number.isNaN(amount)) return price;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
