import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTrips } from '../../../services/notionAdapter';
import type { Trip } from '../../../types/travel';

/**
 * NOTE: the live database has no day-by-day sub-item relation (see README >
 * Schema gaps) — "Date Visited" is a single start/end range per trip, not a
 * linked itinerary. This renders what's real: a chronological timeline of
 * trip date ranges. If a linked "Itinerary Items" data source is added to
 * Notion later, extend `Trip` with a `days` field and render it per-item
 * inside the <li> below instead of the single date-range line.
 */
export function TripTimeline() {
  const { data: trips, isLoading, isError } = useTrips();

  const sorted = useMemo(() => sortByDate(trips ?? []), [trips]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse border border-slate/10 bg-slate/5" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
        Couldn't load the timeline.
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="border border-dashed border-slate/20 p-6 text-center text-sm text-slate/50">
        No trips with a Date Visited yet — add one in Notion to see it here.
      </div>
    );
  }

  return (
    <ol className="relative flex flex-col gap-6 border-l-2 border-dashed border-slate/20 pl-6">
      {sorted.map((trip, index) => (
        <motion.li
          key={trip.id}
          className="relative"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.05 }}
        >
          <motion.span
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: Math.min(index, 6) * 0.05 }}
            className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-paper bg-brass"
          />
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate/60">
            {formatRange(trip)}
          </p>
          <p className="font-display text-base font-semibold text-ink">{trip.destination}</p>
          {trip.dateVisited?.nights != null && (
            <p className="text-xs text-slate/60">{trip.dateVisited.nights} nights</p>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

function sortByDate(trips: Trip[]): Trip[] {
  return trips
    .filter((t) => t.dateVisited?.start)
    .sort((a, b) => (a.dateVisited!.start! < b.dateVisited!.start! ? -1 : 1));
}

function formatRange(trip: Trip): string {
  const dv = trip.dateVisited!;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return dv.end && dv.end !== dv.start ? `${fmt(dv.start!)} – ${fmt(dv.end)}` : fmt(dv.start!);
}
