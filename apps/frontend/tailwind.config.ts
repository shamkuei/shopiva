import type { Config } from 'tailwindcss';

/**
 * Shopiva design system — "Warm Artisan".
 *
 * The whole UI is driven from these tokens:
 *  - `slate.*` is OVERRIDDEN to a warm cream→ink neutral scale, so every
 *    existing `bg-slate-50` / `text-slate-900` / `border-slate-200` etc.
 *    becomes warm without touching components.
 *  - `brand` = terracotta, `accent` = saffron (no Tailwind defaults).
 *  - `display`/`sans` both resolve to Shabnam (self-hosted, weights 400/500/700);
 *    headings differentiate by weight (Bold), not by family.
 *  - coordinated type scale + warm shadows + entrance animations.
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutral scale (replaces cool slate app-wide).
        slate: {
          50: '#FBF7F1', // cream — page background
          100: '#F5EDE1',
          200: '#EADFCC', // sand — borders
          300: '#DCC9B0',
          400: '#B6A28A',
          500: '#8E7B66', // muted text
          600: '#705F4D',
          700: '#4E4034',
          800: '#322619',
          900: '#241C17', // ink — headings / strong text
          950: '#17110B',
        },
        // Brand identity.
        brand: { DEFAULT: '#C8472B', dark: '#A53A22', light: '#E07155' },
        accent: { DEFAULT: '#E5B25D', dark: '#D49A3F' },
      },
      fontFamily: {
        sans: ['Shabnam', 'Vazirmatn', 'system-ui', 'Tahoma', 'sans-serif'],
        // No separate display face — headings use Shabnam Bold via `font-bold`.
        display: ['Shabnam', 'Vazirmatn', 'sans-serif'],
      },
      fontSize: {
        // Coordinated display scale (tuned when headings used Lalezar).
        'display-2xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15' }],
        'display-md': ['1.75rem', { lineHeight: '1.2' }],
      },
      boxShadow: {
        warm: '0 12px 32px -12px rgba(124, 58, 30, 0.28)',
        'warm-lg': '0 28px 56px -20px rgba(124, 58, 30, 0.38)',
        card: '0 6px 20px -8px rgba(60, 30, 15, 0.16)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(24px,-22px) scale(1.06)' },
          '66%': { transform: 'translate(-18px,12px) scale(0.96)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.9s ease both',
        blob: 'blob 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
