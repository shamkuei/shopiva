import Link from 'next/link';
import { ClearCartIfPaid } from '@/components/ClearCartIfPaid';

// Reached via the backend callback redirect after Zarinpal verification.
// `searchParams` is a Promise in Next 15+/16; awaiting it also tolerates the
// plain-object shape, so this is robust across versions.
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; status?: string; ref?: string }>;
}) {
  const { orderId, status, ref } = await searchParams;
  const paid = status === 'paid';

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <ClearCartIfPaid paid={paid} />

      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
          paid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
        }`}
      >
        {paid ? '✓' : '✕'}
      </div>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {paid ? 'پرداخت موفق' : 'پرداخت ناموفق'}
      </h1>
      <p className="mt-2 text-slate-500">
        {paid
          ? 'سفارش شما با موفقیت ثبت شد و در حال آماده‌سازی است.'
          : 'پرداخت لغو شد یا تأیید نشد. مبلغی کسر نشده است — می‌توانید دوباره تلاش کنید.'}
      </p>

      {orderId && (
        <p className="mt-4 inline-block rounded-lg bg-slate-100 px-4 py-2 font-mono text-sm text-slate-600">
          سفارش #{orderId}
        </p>
      )}
      {paid && ref && <p className="mt-2 text-sm text-slate-400">کد پیگیری: {ref}</p>}

      <div className="mt-8 flex items-center justify-center gap-3">
        {paid ? (
          <Link
            href="/"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            ادامه‌ی خرید
          </Link>
        ) : (
          <>
            <Link
              href="/checkout"
              className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              تلاش مجدد
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              بازگشت به فروشگاه
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
