// Store identity + contact details, driven by env vars so a real store owner
// configures them per deployment instead of editing components.
//
//   NEXT_PUBLIC_STORE_NAME  — display name (already used by home/admin heroes)
//   NEXT_PUBLIC_STORE_EMAIL — support email shown on the contact page
//   NEXT_PUBLIC_STORE_PHONE — support phone (Persian digits expected as typed)
//   NEXT_PUBLIC_STORE_ADDRESS
//   NEXT_PUBLIC_STORE_HOURS
//   NEXT_PUBLIC_SOCIAL_INSTAGRAM / NEXT_PUBLIC_SOCIAL_TELEGRAM — full URLs;
//   when unset the footer simply hides that icon (no dead links).

const env = (name: string): string | null => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
};

export const storeInfo = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? 'فروشگاه شاپیوا',
  email: env('NEXT_PUBLIC_STORE_EMAIL'),
  phone: env('NEXT_PUBLIC_STORE_PHONE'),
  address: env('NEXT_PUBLIC_STORE_ADDRESS'),
  hours: env('NEXT_PUBLIC_STORE_HOURS'),
  socials: [
    { label: 'Instagram', url: env('NEXT_PUBLIC_SOCIAL_INSTAGRAM') },
    { label: 'Telegram', url: env('NEXT_PUBLIC_SOCIAL_TELEGRAM') },
  ].filter((s): s is { label: string; url: string } => s.url !== null),
} as const;
