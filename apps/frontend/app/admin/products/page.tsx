'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, formatPrice, resolveImageUrl } from '@/lib/api';
import type { Product } from '@/lib/types';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null); // null = create
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function load() {
    try {
      setProducts(await apiFetch<Product[]>('/api/admin/products'));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری محصولات ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/api/admin/products/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <AdminNav />

      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">پنل مدیریت</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">محصولات</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm font-medium text-slate-500 hover:underline">
            ← داشبورد
          </Link>
          <button
            onClick={openCreate}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            + افزودن محصول
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">محصول</th>
              <th className="px-4 py-3">قیمت</th>
              <th className="px-4 py-3">موجودی</th>
              <th className="px-4 py-3">دسته‌بندی</th>
              <th className="px-4 py-3 text-start">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  در حال بارگذاری…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  هنوز محصولی ثبت نشده است. روی «افزودن محصول» بزنید.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {resolveImageUrl(p.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(p.imageUrl) ?? ''}
                          alt={p.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>🛍️</span>
                      )}
                    </div>
                    <span className="font-medium text-slate-800">{p.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatPrice(p.price)}</td>
                <td className="px-4 py-3 text-slate-700">{p.stock.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-3 text-slate-500">{p.category ?? '—'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    className="ms-2 rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <ProductFormModal
          key={editing?.id ?? 'new'}
          product={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        product={deleting}
        deleting={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
