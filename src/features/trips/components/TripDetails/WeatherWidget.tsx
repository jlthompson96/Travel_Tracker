import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CloudSun } from 'lucide-react';
import { useDestinationClimate } from '../../hooks/useDestinationClimate';
import type { MonthlyClimate } from '../../../../utils/weather';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_HEIGHT = 64;

interface WeatherWidgetProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

/** Comfort score: closer to a mild 75°F and drier scores higher. Purely a rough
 * "best months" heuristic from one past year of data — not a forecast. */
function scoreMonth(m: MonthlyClimate): number {
  if (Number.isNaN(m.avgHighF)) return -Infinity;
  return -Math.abs(m.avgHighF - 75) - m.totalPrecipIn * 3;
}

export function WeatherWidget({ latitude, longitude }: WeatherWidgetProps) {
  const { data, isLoading, isError } = useDestinationClimate(latitude, longitude);

  const bestMonthIndexes = useMemo(() => {
    if (!data) return new Set<number>();
    const scored = data.map((m, i) => ({ i, score: scoreMonth(m) })).filter((m) => Number.isFinite(m.score));
    const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 3);
    return new Set(top.map((m) => m.i));
  }, [data]);

  if (latitude == null || longitude == null) return null;
  if (isError) return null; // quiet no-op — this is a bonus, not core trip data

  const bestMonthNames = data ? MONTH_LABELS.filter((_, i) => bestMonthIndexes.has(i)).join(', ') : '';
  const validHighs = (data ?? []).map((m) => m.avgHighF).filter((v) => !Number.isNaN(v));
  const minHigh = validHighs.length ? Math.min(...validHighs) : 0;
  const maxHigh = validHighs.length ? Math.max(...validHighs) : 1;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50">
        <CloudSun size={13} className="text-brass" /> Weather &amp; best time to visit
      </h3>

      {isLoading && <WeatherSkeleton />}

      {data && (
        <>
          <div className="flex items-end justify-between gap-1 border-b border-slate/15 pb-0" style={{ height: CHART_HEIGHT + 32 }}>
            {data.map((m, i) => (
              <MonthBar
                key={m.month}
                climate={m}
                label={MONTH_LABELS[i]}
                isBest={bestMonthIndexes.has(i)}
                min={minHigh}
                max={maxHigh}
              />
            ))}
          </div>
          <p className="text-xs text-slate/60">
            {bestMonthNames ? (
              <>
                Best months to visit (based on last year's weather): <strong className="text-ink">{bestMonthNames}</strong>
              </>
            ) : (
              'Not enough weather data to suggest a best time to visit.'
            )}
          </p>
        </>
      )}
    </div>
  );
}

// Rough seasonal curve (low → high → low) so the skeleton previews the shape
// of a climate chart rather than reading as a generic loading block.
const SKELETON_RATIOS = [0.28, 0.32, 0.42, 0.58, 0.72, 0.88, 1, 0.94, 0.78, 0.56, 0.38, 0.3];

function WeatherSkeleton() {
  return (
    <div className="flex items-end justify-between gap-1 border-b border-slate/15 pb-0" style={{ height: CHART_HEIGHT + 32 }}>
      {MONTH_LABELS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full animate-pulse rounded-t bg-slate/10"
            style={{ height: SKELETON_RATIOS[i] * CHART_HEIGHT, animationDelay: `${i * 60}ms` }}
          />
          <span className="font-mono text-[9px] uppercase tracking-wide text-slate/20">{label}</span>
        </div>
      ))}
    </div>
  );
}

function MonthBar({
  climate,
  label,
  isBest,
  min,
  max,
}: {
  climate: MonthlyClimate;
  label: string;
  isBest: boolean;
  min: number;
  max: number;
}) {
  const hasData = !Number.isNaN(climate.avgHighF);
  const range = max - min || 1;
  const barHeight = hasData ? Math.max(((climate.avgHighF - min) / range) * CHART_HEIGHT, 4) : 2;

  const title = hasData
    ? `${label}: ${Math.round(climate.avgHighF)}°F high / ${Math.round(climate.avgLowF)}°F low, ${climate.totalPrecipIn.toFixed(1)}" precip`
    : `${label}: no data`;

  return (
    <div className="flex flex-1 flex-col items-center gap-1" title={title}>
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: barHeight }}
        transition={{ duration: 0.4, delay: 0.02 * climate.month, ease: 'easeOut' }}
        className={`w-full rounded-t ${isBest ? 'bg-brass' : 'bg-slate/20'}`}
      />
      <span className={`font-mono text-[9px] uppercase tracking-wide ${isBest ? 'text-ink' : 'text-slate/40'}`}>{label}</span>
    </div>
  );
}
