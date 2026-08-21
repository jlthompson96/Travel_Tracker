import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import {
  bestMonthIndexes,
  climateKey,
  loadClimateIndex,
  MONTH_LABELS,
  scoreMonth,
  type ClimateIndex,
} from '../../../utils/weather';
import type { Trip } from '../../../types/travel';

/**
 * "What should I book for March?"
 *
 * The trip modal already scored one destination's best months; this runs the
 * same scoreMonth over the whole bucket list at once, which is the question you
 * actually have when planning. Climate comes from the build-time index
 * (scripts/fetch-climate.mjs) — scoring 46 destinations by fetching 46 times on
 * mount would be slow and would break offline.
 *
 * Encoding is deliberately the same binary brass/slate the WeatherWidget uses
 * for "best months" rather than a new sequential colour scale: the two views
 * answer the same question and should look like they agree.
 */
export function SeasonsPlanner({ trips }: { trips: Trip[] }) {
  const [index, setIndex] = useState<ClimateIndex | null>(null);
  const [month, setMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    let alive = true;
    loadClimateIndex().then((i) => {
      if (alive) setIndex(i);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!index) return [];
    return trips
      .flatMap((trip) => {
        const lat = trip.location?.latitude;
        const lng = trip.location?.longitude;
        if (lat == null || lng == null) return [];
        const climate = index[climateKey(lat, lng)];
        if (!climate) return [];
        return [{ trip, climate, best: bestMonthIndexes(climate), scores: climate.map(scoreMonth) }];
      })
      .sort((a, b) => b.scores[month] - a.scores[month]);
  }, [index, trips, month]);

  const inSeason = rows.filter((r) => r.best.has(month));

  if (index && rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
        <CalendarClock size={13} className="text-brass" /> Best time to go
      </h3>

      <div className="flex flex-col gap-4 border border-slate/15 bg-surface/50 p-4 shadow-sm">
        {/* Horizontal scroller: 12 chips at a 44pt tap target don't fit 375px. */}
        <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1" data-allow-x-scroll>
          <div className="flex min-w-full gap-1.5" role="tablist" aria-label="Month">
            {MONTH_LABELS.map((label, i) => {
              const active = i === month;
              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMonth(i)}
                  className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors max-sm:inline-flex max-sm:min-h-touch max-sm:items-center max-sm:px-4 ${
                    active
                      ? 'border-ink-navy bg-ink-navy text-cream'
                      : 'border-slate/20 bg-surface/50 text-slate/70 hover:border-slate/40 hover:bg-surface/80'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {!index ? (
          <div className="h-24 animate-pulse rounded bg-slate/5" />
        ) : (
          <>
            <p className="text-xs text-slate/60 max-sm:text-slate/80">
              {inSeason.length > 0 ? (
                <>
                  <strong className="text-ink">{inSeason.length}</strong> of your bucket-list trips are at their best in{' '}
                  {MONTH_LABELS[month]}.
                </>
              ) : (
                <>Nothing on your list peaks in {MONTH_LABELS[month]} — these are just the least-bad options.</>
              )}
            </p>

            <ul className="flex flex-col gap-2">
              {rows.slice(0, 8).map(({ trip, climate, best }) => (
                <li key={trip.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{trip.destination}</span>
                  <MonthStrip best={best} current={month} />
                  <span className="shrink-0 font-mono text-[11px] text-slate/60 max-sm:text-slate/80">
                    {Number.isNaN(climate[month].avgHighF) ? '—' : `${Math.round(climate[month].avgHighF)}°F`}
                  </span>
                </li>
              ))}
            </ul>

            <p className="font-mono text-[10px] text-slate/50 max-sm:text-slate/80">
              Based on last year's observed weather, not a forecast.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Twelve cells; brass marks a peak month, and the selected month gets a ring. */
function MonthStrip({ best, current }: { best: Set<number>; current: number }) {
  return (
    <span className="flex shrink-0 gap-[2px]" aria-hidden>
      {MONTH_LABELS.map((label, i) => (
        <motion.span
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: i * 0.015 }}
          title={label}
          className={`h-3 w-[6px] rounded-sm ${best.has(i) ? 'bg-brass' : 'bg-slate/20'} ${
            i === current ? 'outline outline-1 outline-offset-1 outline-ink/40' : ''
          }`}
        />
      ))}
    </span>
  );
}
