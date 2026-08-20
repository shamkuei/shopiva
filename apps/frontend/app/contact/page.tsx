import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';
import { ContactForm } from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'تماس با ما | شاپیوا',
  description: 'سؤال، بازخورد یا نیاز به پشتیبانی دارید؟ با تیم شاپیوا در تماس باشید.',
};

/** کارت‌های اطلاعات تماس — آیکون + برچسب + مقدار */
const INFO_CARDS = [
  {
    label: 'ایمیل',
    value: 'support@shopiva.ir',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
  },
  {
    label: 'تلفن',
    value: '۰۲۱-۱۲۳۴۵۶۷۸',
    icon: <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  },
  {
    label: 'نشانی',
    value: 'تهران، خیابان ولیعصر، مرکز نوآوری',
    icon: (
      <>
        <path
          d="M12 22s8-5 8-12a8 8 0 0 0-16 0c0 7 8 12 8 12z"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  },
  {
    label: 'ساعات کاری',
    value: 'شنبه تا پنجشنبه، ۹ تا ۱۸',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </>
    ),
  },
] as const;

const FAQS = [
  {
    q: 'ارسال چقدر طول می‌کشد؟',
    a: 'سفارش‌ها پس از تأیید پرداخت آماده و ارسال می‌شوند و معمولاً ظرف ۲ تا ۵ روز کاری به دست شما می‌رسند.',
  },
  {
    q: 'چطور سفارشم را پیگیری کنم؟',
    a: 'پس از پرداخت موفق، شمارهٔ سفارش را دریافت می‌کنید و می‌توانید وضعیت آن را از پنل مدیریت فروشگاه بررسی کنید.',
  },
  {
    q: 'سیاست بازگشت کالا چیست؟',
    a: 'اگر کالا با سفارش شما مطابقت نداشت یا ایراد فنی داشت، برای بازگشت و عودت مبلغ با پشتیبانی در ارتباط باشید.',
  },
  {
    q: 'چه روش‌های پرداختی پشتیبانی می‌شود؟',
    a: 'پرداخت به‌صورت آنلاین و امن از طریق درگاه بانکی انجام می‌شود.',
  },
] as const;

export default function ContactPage() {
  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6">
        {/* سربرگ */}
        <div className="pt-10">
          <span className="text-sm font-semibold text-brand">اینجا هستیم تا کمک کنیم</span>
          <h1 className="mt-1 font-display text-display-lg text-slate-900">تماس با ما</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            سؤال، بازخورد یا فقط می‌خواهید سلام کنید؟ با ما در تماس باشید — تیم ما ظرف یک روز
            کاری پاسخ می‌دهد.
          </p>
        </div>

        {/* اطلاعات + فرم */}
        <div className="grid items-start gap-6 py-10 lg:grid-cols-[20rem_1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            {INFO_CARDS.map(({ label, value, icon }, i) => (
              <div
                key={label}
                className={`flex gap-3 py-4 ${i > 0 ? 'border-t border-slate-200' : ''}`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    {icon}
                  </svg>
                </span>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {label}
                  </div>
                  <div className="mt-0.5 font-semibold text-slate-900">{value}</div>
                </div>
              </div>
            ))}
          </aside>

          <ContactForm />
        </div>

        {/* نقشه (جای‌نگهدار) */}
        <div
          role="img"
          aria-label="نقشهٔ موقعیت فروشگاه در تهران"
          className="relative grid aspect-[21/8] place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand/10 to-accent/20"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-warm">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
          </span>
        </div>

        {/* سؤالات متداول */}
        <section aria-labelledby="faq-title" className="max-w-3xl pb-24 pt-14">
          <span className="text-sm font-semibold text-brand">سؤالات متداول</span>
          <h2 id="faq-title" className="mt-1 font-display text-display-md text-slate-900">
            سؤالات پرتکرار
          </h2>
          <div className="mt-6">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="border-b border-slate-200 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-xl text-brand transition" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="pt-3 text-sm leading-7 text-slate-500">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
