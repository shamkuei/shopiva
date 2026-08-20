import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

/** آیکون‌های شبکه‌های اجتماعی — فعلاً لینک placeholder دارند. */
const SOCIALS = [
  {
    label: 'Instagram',
    path: 'M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
  },
  {
    label: 'Telegram',
    path: 'M21.94 4.6a1 1 0 0 0-1.4-.28l-2.53 1.7a16.5 16.5 0 0 0-5.51-1.02c-4.83 0-9.53 2.86-9.53 6.6 0 1.5.66 2.87 1.86 3.96l-1.2 2.3a.75.75 0 0 0 1.03.99l2.62-1.5c1.1.42 2.62.75 5.22.75 4.83 0 9.53-2.86 9.53-6.6 0-1.42-.58-2.72-1.6-3.78l2.3-1.72a1 1 0 0 0 .27-1.4h-.06Z',
  },
] as const;

const FOOTER_COLS = [
  {
    heading: 'فروشگاه',
    links: [
      { href: '/products', label: 'همه محصولات' },
      { href: '/products', label: 'جدیدترین‌ها' },
      { href: '/cart', label: 'سبد خرید' },
    ],
  },
  {
    heading: 'حساب',
    links: [
      { href: '/login', label: 'ورود' },
      { href: '/admin', label: 'مدیریت فروشگاه' },
      { href: '/contact', label: 'تماس با ما' },
    ],
  },
  {
    heading: 'پشتیبانی',
    links: [{ href: '/track', label: 'پیگیری سفارش' }],
  },
] as const;

/** پابرگ سایت — ستون‌های لینک، شبکه‌های اجتماعی و ردیف پایانی. */
export function SiteFooter() {
  const year = new Date().getFullYear().toLocaleString('fa-IR');

  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* برند */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="صفحهٔ اصلی">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                <BrandMark />
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-slate-400">
              کالاهای انتخابی با قیمت منصفانه، پرداخت امن و ارسال سریع — مستقیم به دست شما.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map(({ label, path }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-brand"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* ستون‌های لینک */}
          {FOOTER_COLS.map(({ heading, links }) => (
            <nav key={heading} aria-label={heading}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                {heading}
              </h4>
              <ul className="flex flex-col gap-2">
                {links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-slate-400 transition hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* اعتماد */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              خرید مطمئن
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-slate-400">
              <li>🔒 پرداخت امن</li>
              <li>🚚 ارسال سریع</li>
              <li>✨ ضمانت اصالت</li>
            </ul>
          </div>
        </div>

        {/* ردیف پایانی */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-slate-400">
          <span>© {year} شاپیوا — تمام حقوق محفوظ است.</span>
          <div className="flex flex-wrap gap-2" aria-label="روش‌های پرداخت">
            {['زرین‌پال', 'شاپرک'].map((p) => (
              <span
                key={p}
                className="rounded-md bg-white/10 px-2.5 py-0.5 text-xs text-slate-300"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
