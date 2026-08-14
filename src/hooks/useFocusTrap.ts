import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps Tab focus inside an open overlay and hands it back to whatever opened
 * it on close.
 *
 * Hand-rolled rather than pulling in focus-trap-react: the whole behavior is
 * about forty lines, and the app has no other use for the dependency.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;

    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the container itself rather than its first control, so opening an
    // overlay doesn't immediately look like a button is pressed.
    if (!container.contains(document.activeElement)) {
      container.setAttribute('tabindex', '-1');
      container.focus({ preventScroll: true });
    }

    const items = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );

    let goingBackwards = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      goingBackwards = e.shiftKey;

      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }

      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement;

      if (e.shiftKey && (current === first || current === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    /**
     * The backstop, and in practice the part that does the work.
     *
     * Predicting "which element is last" is not reliable: an embedded Leaflet
     * map contributes its own tabbable container, markers and attribution
     * links, and WebKit's tab order walks out of the overlay from places the
     * keydown handler above can't anticipate. Catching focus after it lands
     * outside works no matter how it got there.
     */
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (!target || container.contains(target)) return;

      const list = items();
      if (list.length === 0) {
        container.focus({ preventScroll: true });
        return;
      }
      (goingBackwards ? list[list.length - 1] : list[0]).focus({ preventScroll: true });
    };

    /**
     * Covers the one case focusin misses: tabbing past the end of the document
     * hands focus to the browser's own chrome, which lands `activeElement` on
     * <body> and fires no focusin at all. Re-entry has to be deferred because
     * at focusout time the browser has not moved focus yet.
     */
    let disposed = false;
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && container.contains(next)) return;
      setTimeout(() => {
        if (disposed || container.contains(document.activeElement)) return;
        const list = items();
        const target = goingBackwards ? list[list.length - 1] : list[0];
        (target ?? container).focus({ preventScroll: true });
      }, 0);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);
    return () => {
      disposed = true;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [ref, active]);
}
