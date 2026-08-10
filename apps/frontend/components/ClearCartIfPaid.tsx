'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cartStore';

/**
 * Clears the cart once, on mount, when the payment succeeded. Rendered from the
 * (server) payment result page so a successful checkout empties the cart.
 */
export function ClearCartIfPaid({ paid }: { paid: boolean }) {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);
  return null;
}
