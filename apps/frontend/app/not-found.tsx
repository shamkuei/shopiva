import Link from 'next/link';

// Rendered both for unknown routes and for an unknown store subdomain
// (the home page calls notFound() when the subdomain maps to no store).
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-6xl font-bold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        Store or page not found
      </h1>
      <p className="mt-2 text-slate-500">
        There&apos;s no store at this address, or the page doesn&apos;t exist. Check the subdomain and
        try again.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        Go home
      </Link>
    </div>
  );
}
