import { useEffect } from 'react';

/**
 * Freezes the page behind an overlay, and restores the exact scroll offset on
 * release.
 *
 * `body { overflow: hidden }` alone is not enough on iOS: the page still
 * rubber-bands, and reopening leaves you at the top of the document instead of
 * where you were. Pinning the body with `position: fixed` and a negative `top`
 * is the behavior people expect, at the cost of having to put the scroll
 * position back by hand.
 *
 * The count is module-level on purpose. TripDetailModal is mounted at seven
 * call sites and PhotoLightbox nests inside it, so more than one lock can be
 * live at once; without a shared count the inner overlay's release would
 * unfreeze the page while the outer one is still open.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyles: { position: string; top: string; left: string; right: string; width: string; overflow: string } | null = null;

function acquire() {
  lockCount += 1;
  if (lockCount > 1) return;

  savedScrollY = window.scrollY;
  const { style } = document.body;
  savedStyles = {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    overflow: style.overflow,
  };

  style.position = 'fixed';
  style.top = `-${savedScrollY}px`;
  style.left = '0';
  style.right = '0';
  style.width = '100%';
  style.overflow = 'hidden';
}

function release() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedStyles) return;

  const { style } = document.body;
  style.position = savedStyles.position;
  style.top = savedStyles.top;
  style.left = savedStyles.left;
  style.right = savedStyles.right;
  style.width = savedStyles.width;
  style.overflow = savedStyles.overflow;
  savedStyles = null;

  // Synchronous with the style restore, or the page paints at 0 first — and
  // explicitly instant, because `html { scroll-behavior: smooth }` (index.css)
  // would otherwise animate the restore and the page would visibly glide back
  // into place every time a sheet closes.
  window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' as ScrollBehavior });
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquire();
    return release;
  }, [active]);
}
