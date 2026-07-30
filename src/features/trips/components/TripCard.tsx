import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, StickyNote } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { PassportStamp } from './PassportStamp';
import { TripDetailModal } from './TripDetails/TripDetailModal';
import { formatDateRange } from '../utils/formatTrip';

interface TripCardProps {
  trip: Trip;
}

const PRIORITY_DOT: Record<string, string> = {
  High: 'bg-stamp-red',
  Medium: 'bg-brass',
  Low: 'bg-slate/40',
};

export function TripCard({ trip }: TripCardProps) {
  const dateLabel = formatDateRange(trip);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
    <motion.article
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      onClick={() => setIsOpen(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
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
            {trip.destination}
          </h3>
          {trip.country && (
            <p className="mt-0.5 text-sm text-slate/70">{trip.country}</p>
          )}
        </div>
        {trip.status && <PassportStamp trip={trip} size="sm" />}
      </div>

      {trip.tripTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trip.tripTypes.map((type) => (
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
        {dateLabel && (
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-brass" />
            <span>{dateLabel}</span>
          </div>
        )}
        {trip.location?.address && (
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-brass" />
            <span className="truncate">{trip.location.address}</span>
          </div>
        )}
      </div>

      {trip.notes && (
        <p className="flex gap-1.5 border-t border-slate/10 pt-2.5 text-sm text-slate/80">
          <StickyNote size={14} className="mt-0.5 shrink-0 text-slate/40" />
          <span className="line-clamp-2">{trip.notes}</span>
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="flex" aria-label={trip.ratingStars ? `${trip.ratingStars} of 5 stars` : 'Not rated'}>
          {trip.ratingStars &&
            Array.from({ length: trip.ratingStars }).map((_, i) => (
              <span key={i} className="text-brass">★</span>
            ))}
        </div>
        {trip.priority && (
          <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-slate/60">
            <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[trip.priority]}`} />
            {trip.priority}
          </span>
        )}
      </div>
    </motion.article>
    <TripDetailModal trip={trip} open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
