import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';
import { ShopBrowser } from '@/components/ShopBrowser';
import type { Product } from '@/lib/types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export const metadata: Metadata = {
  title: 'همه محصولات | شاپیوا',
  description: 'مرور کامل محصولات فروشگاه شاپیوا — جستجو، فیلتر بر اساس دسته‌بندی، قیمت و موجودی.',
};

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data as T;
  } catch {
    return null;
  }
}

// Sort keys ShopBrowser understands; anything else falls back to 'newest'.
const SORTS = ['newest', 'price-asc', 'price-desc'] as const;
type SortKey = (typeof SORTS)[number];

type PageProps = {
  searchParams: Promise<{ search?: string; sort?: string }>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const { search, sort } = await searchParams;
  const q = search?.trim() ?? '';
  const initialSort: SortKey =
    sort && (SORTS as readonly string[]).includes(sort) ? (sort as SortKey) : 'newest';

  // Search runs server-side against the API's ?search= filter.
  const products = await fetchJson<Product[]>(
    q ? `/api/products?search=${encodeURIComponent(q)}` : '/api/products',
  );

  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6">
        <div className="pt-10">
          <span className="text-sm font-semibold text-brand">مجموعه</span>
          <h1 className="mt-1 font-display text-display-lg text-slate-900">
            {q ? `نتایج جستجو برای «${q}»` : 'همه محصولات'}
          </h1>
        </div>

        {products === null ? (
          <div className="my-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <p className="font-semibold">ارتباط با سرور برقرار نشد</p>
            <p className="mt-1 text-sm">
              امکان اتصال به <code className="font-mono">{API_URL}</code> وجود ندارد. اگر تازه
              استارت زده‌اید، ممکن است سرور در حال راه‌اندازی باشد — چند ثانیه بعد دوباره تلاش
              کنید.
            </p>
          </div>
        ) : (
          <ShopBrowser products={products} initialSort={initialSort} searchQuery={q} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
