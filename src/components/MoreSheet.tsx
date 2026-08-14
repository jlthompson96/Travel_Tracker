import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SECONDARY_TABS, type Tab } from '../navigation/tabs';

interface MoreSheetProps {
  open: boolean;
  active: Tab;
  onSelect: (tab: Tab) => void;
  onClose: () => void;
}

/**
 * The overflow half of the bottom tab bar — the tabs that didn't fit the
 * five-slot budget. Mobile-only; the desktop pill row shows all seven.
 *
 * Gets a real focus trap in a later pass; for now Escape and the backdrop
 * close it, matching TripDetailModal's keyboard behavior.
 */
export function MoreSheet({ open, active, onSelect, onClose }: MoreSheetProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-end bg-ink-navy/70"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="More sections"
            onClick={(e) => e.stopPropagation()}
            // Under reduced motion the sheet fades rather than sliding — the
            // CSS reduced-motion block can't reach framer's JS-driven springs.
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
            className="glass max-h-[70svh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border-t pb-safe-b shadow-2xl"
          >
            <div className="flex justify-center py-3">
              <span aria-hidden className="h-1 w-9 rounded-full bg-slate/30" />
            </div>

            <ul className="flex flex-col px-2 pb-3">
              {SECONDARY_TABS.map(({ id, label, icon: Icon }) => {
                const isActive = id === active;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(id);
                        onClose();
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex min-h-[56px] w-full items-center gap-3 rounded-lg px-4 text-left font-mono text-sm uppercase tracking-wide transition-colors ${
                        isActive ? 'bg-ink-navy text-cream' : 'text-slate hover:bg-surface'
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="flex-1">{label}</span>
                      {isActive && <Check size={16} className="shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
