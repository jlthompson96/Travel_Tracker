import { motion, useReducedMotion } from 'framer-motion';

export function Pill({
  active,
  onClick,
  children,
  group,
  /** Multi-select pills can be active simultaneously, so they can't share one
   * animated background — each gets its own static fill instead of the
   * single-select groups' sliding `layoutId` highlight. */
  multi = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  group: string;
  multi?: boolean;
}) {
  // The global prefers-reduced-motion block in index.css can't reach framer's
  // JS-driven springs, so the fill has to opt out here rather than in CSS.
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // inline-flex + items-center is what lets min-height actually take on a
      // button whose content is a single inline span.
      className={`relative whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-150 max-sm:inline-flex max-sm:min-h-touch max-sm:items-center max-sm:px-4 ${
        active
          ? 'border-ink-navy text-cream'
          : 'border-slate/20 bg-surface/50 text-slate/70 hover:border-slate/40 hover:bg-surface/80'
      }`}
    >
      {active &&
        (reduceMotion ? (
          <span className="absolute inset-0 z-0 rounded-full bg-ink-navy" />
        ) : multi ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-0 rounded-full bg-ink-navy"
          />
        ) : (
          <motion.span
            layoutId={`pill-active-${group}`}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="absolute inset-0 z-0 rounded-full bg-ink-navy"
          />
        ))}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
