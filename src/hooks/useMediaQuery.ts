import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query. The initial value is read synchronously in
 * the useState initializer rather than in an effect, so a layout that branches
 * on this never paints the wrong variant first and then snaps.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    // Re-read on subscribe: the query can have changed between the initializer
    // and this effect (a resize during hydration, or a changed `query` arg).
    setMatches(list.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Below Tailwind's `sm`. The one place mobile-only layout branches in JS. */
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 640px)');
}

/**
 * Whether the OS asks for reduced transparency.
 *
 * Note this is always false on iOS 17 — WebKit shipped the query in Safari 18 —
 * so it can't be the only way to turn the glass off. See
 * `usePrefersReducedTransparencySupported` and the in-app toggle.
 */
export function usePrefersReducedTransparency(): boolean {
  return useMediaQuery('(prefers-reduced-transparency: reduce)');
}

/**
 * Whether the browser understands the query at all. An unsupported query
 * reports its `media` as the literal string 'not all', which is how we know to
 * offer the manual toggle instead of trusting a silent `false`.
 */
export function prefersReducedTransparencySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-transparency: reduce)').media !== 'not all';
}
