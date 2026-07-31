import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, StickyNote } from 'lucide-react';
import type { Trip, TripType } from '../../../types/travel';
import { PassportStamp } from './PassportStamp';
import { TripDetailModal } from './TripDetails/TripDetailModal';
import { formatDateRange } from '../utils/formatTrip';

interface TripCardProps {
  /** Every visit to one place, best-ranked first. A single-element array is the
   * ordinary case; more than one renders a combined tile. */
  trips: Trip[];
}

const PRIORITY_DOT: Record<string, string> = {
  High: 'bg-stamp-red',
  Medium: 'bg-brass',
  Low: 'bg-slate/40',
};

/** How many visit dates fit on a tile before we summarise the rest. */
const MAX_VISIBLE_DATES = 3;

export function TripCard({ trips }: TripCardProps) {
  const primary = trips[0];
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState(primary.id);

  const activeTrip = trips.find((trip) => trip.id === activeId) ?? primary;

  const openModal = () => {
    // Always reopen on the primary visit rather than wherever we were left off.
    setActiveId(primary.id);
    setIsOpen(true);
  };

  // A place that's been visited shouldn't wear a Bucket List stamp just because
  // the newest row is a planned return trip.
  const stampTrip = trips.find((trip) => trip.status === 'Been There') ?? primary;

  const tripTypes = Array.from(new Set(trips.flatMap((trip) => trip.tripTypes))) as TripType[];

  const dateLabels = trips
    .map((trip) => formatDateRange(trip))
    .filter((label): label is string => label != null);

  const bestRating = trips.reduce<number | null>(
    (best, trip) => (trip.ratingStars != null && (best == null || trip.ratingStars > best) ? trip.ratingStars : best),
    null,
  );

  const ratingLabel = bestRating
    ? `${bestRating} of 5 stars${trips.length > 1 ? ' (best visit)' : ''}`
    : 'Not rated';

  return (
    <>
    <motion.article
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      onClick={openModal}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      }}
      whileHover={{ y: -4 }}
      whileTap={{ y: -1, scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-perforation group relative flex h-full cursor-pointer flex-col gap-3 border border-slate/15 bg-surface/60 p-5 pl-6 shadow-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-ink-navy/10"
    >
      <span className="absolute inset-y-0 left-0 w-[3px] scale-y-0 bg-brass transition-transform duration-200 ease-out group-hover:scale-y-100" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            {primary.destination}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {primary.country && <p className="text-sm text-slate/70">{primary.country}</p>}
            {trips.length > 1 && (
              <span className="rounded-full bg-brass/15 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-brass">
                {trips.length} visits
              </span>
            )}
          </div>
        </div>
        {stampTrip.status && <PassportStamp trip={stampTrip} size="sm" />}
      </div>

      {tripTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tripTypes.map((type) => (
            <span
              key={type}
              className="rounded-full bg-ink-navy/5 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink/70"
            >
              {type}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-1.5 font-mono text-xs text-slate/80">
        {dateLabels.slice(0, MAX_VISIBLE_DATES).map((label, i) => (
          <div key={label + i} className="flex items-center gap-1.5">
            <CalendarDays size={13} className={i === 0 ? 'text-brass' : 'text-brass/40'} />
            <span>{label}</span>
          </div>
        ))}
        {dateLabels.length > MAX_VISIBLE_DATES && (
          <span className="pl-[19px] text-slate/60">
            +{dateLabels.length - MAX_VISIBLE_DATES} more
          </span>
        )}
        {primary.location?.address && (
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-brass" />
            <span className="truncate">{primary.location.address}</span>
          </div>
        )}
      </div>

      {primary.notes && (
        <p className="flex gap-1.5 border-t border-slate/10 pt-2.5 text-sm text-slate/80">
          <StickyNote size={14} className="mt-0.5 shrink-0 text-slate/40" />
          <span className="line-clamp-2">{primary.notes}</span>
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="flex" aria-label={ratingLabel}>
          {bestRating &&
            Array.from({ length: bestRating }).map((_, i) => (
              <span key={i} className="text-brass">★</span>
            ))}
        </div>
        {primary.priority && (
          <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-slate/60">
            <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[primary.priority]}`} />
            {primary.priority}
          </span>
        )}
      </div>
    </motion.article>
    <TripDetailModal
      trip={activeTrip}
      visits={trips}
      onSelectVisit={(trip) => setActiveId(trip.id)}
      open={isOpen}
      onClose={() => setIsOpen(false)}
    />
    </>
  );
}
