'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';

const PAGE_SIZE = 12;

type SortKey = 'newest' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'price-asc', label: 'قیمت: کم به زیاد' },
  { value: 'price-desc', label: 'قیمت: زیاد به کم' },
];

/** صفحه‌های قابل نمایش با «…» برای شکستن دنبالهٔ طولانی. */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}

type FilterState = {
  cats: string[];
  min: string;
  max: string;
  inStockOnly: boolean;
  sort: SortKey;
};

const EMPTY_FILTERS: FilterState = { cats: [], min: '', max: '', inStockOnly: false, sort: 'newest' };

const priceInputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25';

/** بدنهٔ فیلترها — مشترک بین سایدبار دسکتاپ و کشوی موبایل. */
function FilterGroups({
  categories,
  state,
  set,
  onClear,
  hasActive,
}: {
  categories: { name: string; count: number }[];
  state: FilterState;
  set: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  hasActive: boolean;
}) {
  function toggleCat(name: string) {
    set({
      cats: state.cats.includes(name)
        ? state.cats.filter((c) => c !== name)
        : [...state.cats, name],
    });
  }

  return (
    <>
      {categories.length > 0 && (
        <div className="border-b border-slate-200 pb-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            دسته‌بندی
          </h3>
          <div className="flex flex-col gap-2">
            {categories.map(({ name, count }) => (
              <label key={name} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={state.cats.includes(name)}
                  onChange={() => toggleCat(name)}
                  className="h-4 w-4 accent-brand"
                />
                {name}
                <span className="ms-auto text-xs text-slate-400">
                  {count.toLocaleString('fa-IR')}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 pb-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          قیمت (تومان)
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="sr-only">حداقل قیمت</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder="از"
              dir="ltr"
              value={state.min}
              onChange={(e) => set({ min: e.target.value })}
              className={priceInputCls}
            />
          </label>
          <span className="text-slate-400">–</span>
          <label className="flex-1">
            <span className="sr-only">حداکثر قیمت</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder="تا"
              dir="ltr"
              value={state.max}
              onChange={(e) => set({ max: e.target.value })}
              className={priceInputCls}
            />
          </label>
        </div>
      </div>

      <div className="border-b border-slate-200 pb-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          موجودی
        </h3>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={state.inStockOnly}
            onChange={(e) => set({ inStockOnly: e.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          فقط کالاهای موجود
        </label>
      </div>

      {hasActive && (
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
        >
          پاک کردن همه فیلترها
        </button>
      )}
    </>
  );
}

/** مرور فروشگاه — فیلتر، مرتب‌سازی و صفحه‌بندی سمت کلاینت روی نتایج سرور. */
export function ShopBrowser({
  products,
  initialSort = 'newest',
  searchQuery = '',
}: {
  products: Product[];
  initialSort?: FilterState['sort'];
  searchQuery?: string;
}) {
  const [state, setState] = useState<FilterState>({ ...EMPTY_FILTERS, sort: initialSort });
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const set = (patch: Partial<FilterState>) => {
    setState((s) => ({ ...s, ...patch }));
    setPage(1);
  };

  // قفل اسکرول هنگام باز بودن کشوی فیلتر موبایل
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.category) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const filtered = useMemo(() => {
    const min = state.min === '' ? null : Number(state.min);
    const max = state.max === '' ? null : Number(state.max);
    const list = products.filter((p) => {
      if (state.cats.length > 0 && !state.cats.includes(p.category ?? '')) return false;
      const price = Number(p.price);
      if (min !== null && !Number.isNaN(min) && price < min) return false;
      if (max !== null && !Number.isNaN(max) && price > max) return false;
      if (state.inStockOnly && p.stock <= 0) return false;
      return true;
    });
    switch (state.sort) {
      case 'price-asc':
        return [...list].sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-desc':
        return [...list].sort((a, b) => Number(b.price) - Number(a.price));
      default:
        return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [products, state]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasActive =
    state.cats.length > 0 || state.min !== '' || state.max !== '' || state.inStockOnly;

  const filterProps = {
    categories,
    state,
    set,
    onClear: () => {
      setState((s) => ({ ...s, cats: [], min: '', max: '', inStockOnly: false }));
      setPage(1);
    },
    hasActive,
  };

  return (
    <div>
      {/* نوار فروشگاه */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-5">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          فیلترها
        </button>

        <span className="text-sm text-slate-500">
          نمایش{' '}
          <strong className="text-slate-900">{filtered.length.toLocaleString('fa-IR')}</strong>{' '}
          محصول
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-slate-500">
            مرتب‌سازی بر اساس
          </label>
          <select
            id="sort"
            value={state.sort}
            onChange={(e) => set({ sort: e.target.value as SortKey })}
            className="min-w-44 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* زمینهٔ جستجو — وقتی از نوار بالا جستجو شده باشد */}
      {searchQuery && (
        <div className="flex items-center gap-3 border-b border-slate-200 py-4 text-sm">
          <span className="text-slate-500">
            نتایج جستجو برای <strong className="text-slate-900">«{searchQuery}»</strong>
          </span>
          <Link
            href="/products"
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand"
          >
            پاک کردن جستجو ✕
          </Link>
        </div>
      )}

      <div className="grid items-start gap-6 py-8 lg:grid-cols-[16rem_1fr]">
        {/* سایدبار دسکتاپ */}
        <aside aria-label="فیلترهای محصولات" className="hidden flex-col gap-5 lg:flex">
          <FilterGroups {...filterProps} />
        </aside>

        <section aria-label="محصولات">
          {visible.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-card">
              <p className="text-slate-500">محصولی با این فیلترها پیدا نشد.</p>
              {hasActive && (
                <button
                  type="button"
                  onClick={filterProps.onClear}
                  className="mt-4 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  پاک کردن فیلترها
                </button>
              )}
            </div>
          )}

          {/* صفحه‌بندی */}
          {totalPages > 1 && (
            <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-1 py-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="صفحه قبل"
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {pageList(safePage, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === safePage ? 'page' : undefined}
                    className={`h-10 min-w-10 rounded-lg px-2 text-sm font-medium transition ${
                      p === safePage
                        ? 'bg-brand text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.toLocaleString('fa-IR')}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="صفحه بعد"
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </nav>
          )}
        </section>
      </div>

      {/* کشوی فیلتر موبایل */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            aria-label="فیلترهای محصولات"
            className="fixed inset-y-0 start-0 z-50 flex w-[min(85vw,20rem)] flex-col gap-5 overflow-y-auto bg-white p-5 shadow-warm-lg lg:hidden"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">فیلترها</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="بستن فیلترها"
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <FilterGroups {...filterProps} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-auto w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-warm transition hover:bg-brand-dark"
            >
              نمایش نتایج
            </button>
          </aside>
        </>
      )}
    </div>
  );
}
