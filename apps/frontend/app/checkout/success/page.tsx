import Link from 'next/link';

// `searchParams` is a Promise in Next 15+/16; awaiting it also handles the
// plain-object shape, so this is robust across versions.
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
        ✓
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Order placed!</h1>
      <p className="mt-2 text-slate-500">
        Thank you for your order. We&apos;ve received it and will contact you shortly.
      </p>
      {id && (
        <p className="mt-4 inline-block rounded-lg bg-slate-100 px-4 py-2 font-mono text-sm text-slate-600">
          Order #{id}
        </p>
      )}
      <div className="mt-8">
        <Link
          href="/"
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
