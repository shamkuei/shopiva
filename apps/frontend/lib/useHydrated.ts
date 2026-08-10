import { useEffect, useState } from 'react';

/**
 * Returns false during SSR and the first client render, true after mount.
 * Used to gate persisted (localStorage) cart state so server/client markup
 * matches and we avoid hydration mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
