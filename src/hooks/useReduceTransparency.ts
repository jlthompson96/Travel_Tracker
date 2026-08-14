import { useEffect, useState } from 'react';
import { prefersReducedTransparencySupported } from './useMediaQuery';

const STORAGE_KEY = 'travel-tracker-reduce-transparency';
const ATTRIBUTE = 'data-reduce-transparency';

/**
 * A manual "reduce transparency" switch, because the OS-level one is out of
 * reach on the browser this app targets.
 *
 * `prefers-reduced-transparency` only shipped in Safari 18, so on iOS 17 — the
 * baseline here — the media query never matches no matter what the user has set
 * in Accessibility settings. index.css honours the query where it exists; this
 * drives the same fallback through a class on <html> so the effect can still be
 * switched off everywhere else.
 *
 * Mirrors useTheme: localStorage-backed, applied to the document element.
 */
export function useReduceTransparency() {
  const [reduced, setReduced] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === 'true',
  );

  useEffect(() => {
    if (reduced) document.documentElement.setAttribute(ATTRIBUTE, 'true');
    else document.documentElement.removeAttribute(ATTRIBUTE);
    localStorage.setItem(STORAGE_KEY, String(reduced));
  }, [reduced]);

  return {
    reduced,
    toggleReduced: () => setReduced((r) => !r),
    /** False on iOS 17 and earlier, where the toggle is the only way to opt out. */
    osControlAvailable: prefersReducedTransparencySupported(),
  };
}
