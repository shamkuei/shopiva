import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailPanel } from '@/components/ProductDetailPanel';
import { formatPrice, resolveImageUrl } from '@/lib/api';
import type { Product } from '@/lib/types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data as T;
  } catch {
    return null;
  }
}

// تعداد محصولات مرتبط زیر صفحهٔ محصول.
const RELATED_COUNT = 4;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchJson<Product>(`/api/products/${id}`);
  if (!product) return { title: 'محصول پیدا نشد | شاپیوا' };
  return {
    title: `${product.title} | شاپیوا`,
    description:
      product.description?.slice(0, 160) ?? `خرید ${product.title} از فروشگاه شاپیوا.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const [product, allProducts] = await Promise.all([
    fetchJson<Product>(`/api/products/${id}`),
    fetchJson<Product[]>('/api/products'),
  ]);
  if (!product) notFound();

  const soldOut = product.stock <= 0;
  const img = resolveImageUrl(product.imageUrl);
  const related = (allProducts ?? [])
    .filter((p) => p.id !== product.id && p.stock > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RELATED_COUNT);

  // مشخصات — مقادیر وابسته به دادهٔ سرور اینجا ساخته می‌شوند.
  const specs = [
    { label: 'دسته‌بندی', value: product.category ?? '—' },
    { label: 'موجودی', value: soldOut ? 'ناموجود' : `${product.stock.toLocaleString('fa-IR')} عدد` },
    {
      label: 'تاریخ ثبت',
      value: new Date(product.createdAt).toLocaleDateString('fa-IR'),
    },
  ];

  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6">
        {/* مسیر */}
        <nav aria-label="مسیر" className="pt-6 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-brand">
            خانه
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <Link href="/#products" className="transition hover:text-brand">
            محصولات
          </Link>
          {product.category && (
            <>
              <span className="mx-2 text-slate-300">/</span>
              <span>{product.category}</span>
            </>
          )}
          <span className="mx-2 text-slate-300">/</span>
          <span aria-current="page" className="font-medium text-slate-900">
            {product.title}
          </span>
        </nav>

        {/* مشخصات اصلی محصول */}
        <div className="grid gap-8 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          {/* تصویر */}
          <div>
            <div className="grid aspect-square place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 to-accent/15 shadow-card">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <span className="text-7xl">🛍️</span>
              )}
            </div>
          </div>

          {/* اطلاعات */}
          <div>
            {product.category && (
              <span className="text-sm uppercase tracking-wider text-slate-500">
                {product.category}
              </span>
            )}
            <h1 className="mt-1 font-display text-display-lg text-slate-900">{product.title}</h1>

            <div className="mt-3 flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  soldOut ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {soldOut ? 'ناموجود' : `${product.stock.toLocaleString('fa-IR')} عدد موجود`}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-brand">{formatPrice(product.price)}</span>
            </div>

            {product.description && (
              <p className="mt-5 leading-7 text-slate-600">{product.description}</p>
            )}

            <ProductDetailPanel product={product} specs={specs} />
          </div>
        </div>

        {/* محصولات مرتبط */}
        {related.length > 0 && (
          <section aria-labelledby="related-title" className="border-t border-slate-200 py-14">
            <div className="mb-8">
              <h2 id="related-title" className="font-display text-display-md text-slate-900">
                شاید بپسندید
              </h2>
              <p className="mt-1 text-slate-500">محصولات دیگر فروشگاه</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
