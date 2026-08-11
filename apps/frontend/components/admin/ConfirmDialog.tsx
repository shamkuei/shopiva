'use client';

import type { Product } from '@/lib/types';

interface Props {
  product: Product | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ product, deleting, onCancel, onConfirm }: Props) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">حذف محصول</h2>
        <p className="mt-2 text-sm text-slate-600">
          آیا از حذف «<span className="font-semibold">{product.title}</span>» مطمئن هستید؟ این عمل قابل
          بازگشت نیست.
        </p>
        <div className="mt-6 flex justify-start gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting ? 'در حال حذف…' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  );
}
