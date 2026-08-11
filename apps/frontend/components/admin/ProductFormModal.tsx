'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { apiFetch, apiUpload, resolveImageUrl } from '@/lib/api';
import type { Product } from '@/lib/types';

interface Props {
  product: Product | null; // null => create
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, onClose, onSaved }: Props) {
  const isEdit = product !== null;
  const [title, setTitle] = useState(product?.title ?? '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [category, setCategory] = useState(product?.category ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await apiUpload<{ url: string }>('/api/admin/products/image', file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری تصویر ناموفق بود.');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || price === '') {
      setError('عنوان و قیمت الزامی است.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      title: title.trim(),
      price,
      stock: Number(stock) || 0,
      category: category.trim() || null,
      description: description.trim() || null,
      imageUrl,
    };
    try {
      if (isEdit && product) {
        await apiFetch(`/api/admin/products/${product.id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/admin/products', { method: 'POST', body: payload });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'ویرایش محصول' : 'افزودن محصول'}</h2>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">عنوان</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">قیمت</span>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">موجودی</span>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">دسته‌بندی</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">توضیحات</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="block">
            <span className="text-sm font-medium text-slate-700">تصویر</span>
            <div className="mt-1 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {resolveImageUrl(imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(imageUrl) ?? ''}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🛍️</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  disabled={uploading}
                  className="text-sm text-slate-600 file:ms-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="text-start text-xs text-slate-400 hover:underline"
                  >
                    حذف تصویر
                  </button>
                )}
                {uploading && <span className="text-xs text-slate-400">در حال بارگذاری…</span>}
              </div>
            </div>
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex justify-start gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'در حال ذخیره…' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
