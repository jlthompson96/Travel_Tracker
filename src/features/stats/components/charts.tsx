import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * The two bar-chart shapes this app uses, factored out of MilesPage so the
 * Insights tab doesn't grow a second, subtly different implementation.
 *
 * Deliberately hand-rolled rather than pulling in a charting library: these are
 * brass bars in the app's own type and spacing, and every responsive tweak here
 * (the horizontal scroller, the trimmed label columns) came out of the mobile
 * audit at 375px. A generic library would have to be fought back to this.
 */
export interface BarDatum {
  key: string;
  /** Axis label under (or beside) the bar. */
  label: string;
  value: number;
  /** Pre-formatted value, e.g. "12,345" or "12,345 mi". */
  valueLabel: string;
}

function ChartFrame({ heading, children }: { heading: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
        {heading}
      </h3>
      {children}
    </div>
  );
}

export function VerticalBarChart({
  heading,
  data,
  chartHeight = 140,
}: {
  heading: React.ReactNode;
  data: BarDatum[];
  chartHeight?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);

  return (
    <ChartFrame heading={heading}>
      {/* Each column's min width is set by its value label ("12,345"), not the
        * bar, so enough columns will outgrow a phone's content box. Scroll rather
        * than squeeze; min-w-full keeps a sparse chart full-bleed. */}
      <div className="overflow-x-auto overscroll-x-contain" data-allow-x-scroll>
        <div
          className="flex min-w-full items-end gap-6 border-b border-slate/15 px-2 pb-0 max-sm:gap-3"
          style={{ height: chartHeight + 44 }}
        >
          {data.map((d, i) => (
            <VerticalBar key={d.key} datum={d} max={max} chartHeight={chartHeight} index={i} />
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function VerticalBar({
  datum,
  max,
  chartHeight,
  index,
}: {
  datum: BarDatum;
  max: number;
  chartHeight: number;
  index: number;
}) {
  const [hover, setHover] = useState(false);
  const barHeight = max > 0 ? Math.max((datum.value / max) * chartHeight, 3) : 0;

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-1.5"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <p className="font-mono text-[11px] text-ink max-sm:text-[10px]">{datum.valueLabel}</p>
      <motion.div
        title={`${datum.label}: ${datum.valueLabel}`}
        initial={{ height: 0 }}
        animate={{ height: barHeight }}
        transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
        className={`w-7 rounded-t transition-colors duration-150 max-sm:w-5 ${hover ? 'bg-brass' : 'bg-brass/80'}`}
      />
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">{datum.label}</p>
    </div>
  );
}

export function HorizontalBarChart({ heading, data }: { heading: React.ReactNode; data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 0);

  return (
    <ChartFrame heading={heading}>
      <div className="flex flex-col gap-2.5">
        {data.map((d, i) => (
          <HorizontalBar key={d.key} datum={d} max={max} index={i} />
        ))}
      </div>
    </ChartFrame>
  );
}

function HorizontalBar({ datum, max, index }: { datum: BarDatum; max: number; index: number }) {
  const [hover, setHover] = useState(false);
  const widthPct = max > 0 ? Math.max((datum.value / max) * 100, 3) : 0;

  return (
    <div
      className="flex items-center gap-3"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      title={`${datum.label}: ${datum.valueLabel}`}
    >
      {/* At 375px the fixed label + value columns left only ~95px for the bar
        * itself; trimming both recovers roughly 65px of it. */}
      <p className="w-36 shrink-0 truncate text-right text-xs text-slate/70 max-sm:w-24 max-sm:text-[11px] sm:w-48">
        {datum.label}
      </p>
      <div className="h-4 flex-1">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.5, delay: index * 0.06, ease: 'easeOut' }}
          className={`h-full rounded-r transition-colors duration-150 ${hover ? 'bg-brass' : 'bg-brass/80'}`}
        />
      </div>
      <p className="w-16 shrink-0 font-mono text-[11px] text-ink max-sm:w-12 max-sm:text-[10px]">{datum.valueLabel}</p>
    </div>
  );
}

/** The stat tile used across Miles and Insights. */
export function StatTile({
  icon,
  label,
  value,
  sub,
  delay = 0,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="flex flex-col justify-center gap-1 border border-slate/15 bg-surface/50 p-5 shadow-sm"
    >
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
        {icon} {label}
      </div>
      <p className="font-display text-4xl font-semibold text-ink">{value}</p>
      {sub && <p className="font-mono text-[11px] text-slate/60 max-sm:text-slate/80">{sub}</p>}
    </motion.div>
  );
}
