import Link from 'next/link';

// Generic 404 — unknown route.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-6xl font-bold text-brand">۴۰۴</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">صفحه پیدا نشد</h1>
      <p className="mt-2 text-slate-500">صفحه‌ی موردنظر وجود ندارد یا جابجا شده است.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        بازگشت به خانه
      </Link>
    </div>
  );
}
