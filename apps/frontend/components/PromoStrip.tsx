'use client';

import { useState } from 'react';

/**
 * Campaign coupon band shown above the hero.
 * Purely presentational — no discount logic is wired in the backend.
 */
export function PromoStrip({ code, text }: { code: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (e.g. insecure context) — code stays readable/selectable
    }
  }

  return (
    <div className="bg-brand text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-2.5 text-sm">
        <span aria-hidden>🎁</span>
        <span className="font-medium">{text}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/60 bg-white/10 px-2.5 py-0.5 transition hover:bg-white/20"
          aria-label={`کپی کد تخفیف ${code}`}
        >
          <span className="font-mono text-xs font-bold tracking-widest">{code}</span>
          <span className="text-xs text-white/80">{copied ? 'کپی شد ✓' : 'کپی'}</span>
        </button>
      </div>
    </div>
  );
}
