import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'شاپیوا | فروشگاه آنلاین',
  description: 'فروشگاه آنلاین شاپیوا — بهترین‌هایتان را اینجا پیدا کنید.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>{/* Fonts are self-hosted in public/fonts — see globals.css */}</head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
