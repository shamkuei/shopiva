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
        {paid ? 'Payment successful' : 'Payment failed'}
      </h1>
      <p className="mt-2 text-slate-500">
        {paid
          ? 'Thank you! Your order has been confirmed and is now being prepared.'
          : 'Your payment was cancelled or could not be verified. No charge was made — you can try again.'}
      </p>

      {orderId && (
        <p className="mt-4 inline-block rounded-lg bg-slate-100 px-4 py-2 font-mono text-sm text-slate-600">
          Order #{orderId}
        </p>
      )}
      {paid && ref && <p className="mt-2 text-sm text-slate-400">Reference: {ref}</p>}

      <div className="mt-8 flex items-center justify-center gap-3">
        {paid ? (
          <Link
            href="/"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Continue shopping
          </Link>
        ) : (
          <>
            <Link
              href="/checkout"
              className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Try again
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to store
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
