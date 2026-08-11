import type { OrderStatus } from '@/lib/types';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در انتظار',
  paid: 'پرداخت‌شده',
  failed: 'ناموفق',
  shipped: 'ارسال‌شده',
  cancelled: 'لغو‌شده',
};

const STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-slate-200 text-slate-600',
  failed: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STYLES[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
