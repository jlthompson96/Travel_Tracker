import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useIsMobile } from '../hooks/useMediaQuery';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Shown in the header and used as the dialog's accessible name. */
  title: string;
  children: React.ReactNode;
  /** Pinned below the scrolling body; clears the home indicator on iOS. */
  footer?: React.ReactNode;
}

/**
 * One overlay that reads as a bottom sheet on phones and a centered panel on
 * desktop.
 *
 * The breakpoint branch is CSS (`max-sm:`), following TripDetailModal — a JS
 * branch on useIsMobile() would unmount and remount the panel as you cross
 * 640px, which is the same class of bug that once flew a nav pill across the
 * screen. useIsMobile() is used only for drag-to-dismiss, which genuinely has
 * no CSS equivalent.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  useBodyScrollLock(open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Reduced motion collapses both shells to an instant fade — the CSS
  // reduced-motion block can't reach framer's JS-driven springs.
  const panelMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : isMobile
      ? {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '100%' },
          transition: { type: 'spring' as const, stiffness: 380, damping: 36 },
        }
      : {
          initial: { opacity: 0, y: 24, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 12, scale: 0.98 },
          transition: { type: 'spring' as const, stiffness: 320, damping: 30 },
        };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="no-print fixed inset-0 z-modal flex items-center justify-center bg-ink-navy/70 p-4 backdrop-blur-sm max-sm:items-end max-sm:p-0"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            {...panelMotion}
            drag={isMobile && !reduceMotion ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden border border-slate/15 bg-paper shadow-2xl max-sm:max-h-[85svh] max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0"
          >
            <div className="flex justify-center py-3 sm:hidden">
              <span aria-hidden className="h-1 w-9 rounded-full bg-slate/30" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-dashed border-slate/20 px-5 pb-3 max-sm:pt-0 sm:px-6 sm:pt-5">
              <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate/20 bg-surface/50 text-slate transition-colors hover:border-slate/40 hover:bg-surface/80 max-sm:h-11 max-sm:w-11"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-slate/15 bg-paper px-5 py-3 pb-safe-b sm:px-6">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
