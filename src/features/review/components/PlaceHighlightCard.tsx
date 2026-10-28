import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Compass, ExternalLink, Home, MapPin, Milestone, Quote, Star } from 'lucide-react';
import { PhotoImage } from '../../../components/PhotoImage';
import { PassportStamp } from '../../trips/components/PassportStamp';
import { formatDateRange } from '../../trips/utils/formatTrip';
import type { Trip } from '../../../types/travel';
import type { FlightLeg } from '../utils/yearStats';
import { PhotoLightbox } from '../../trips/components/TripDetails/PhotoLightbox';

interface PlaceHighlightCardProps {
  leg: FlightLeg | undefined;
  legIndex: number;
  totalStops: number;
  onOpenTripModal?: (trip: Trip) => void;
  onViewRecap?: () => void;
}

export function PlaceHighlightCard({
  leg,
  legIndex,
  totalStops,
  onOpenTripModal,
  onViewRecap,
}: PlaceHighlightCardProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!leg) {
    return null;
  }

  // Special presentation for the Return Home leg
  if (leg.isReturnHome || !leg.trip) {
    return (
      <div className="flex flex-col justify-between gap-5 rounded border border-slate/15 bg-surface/60 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-navy text-brass">
            <Home size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs uppercase tracking-wider text-slate/60 max-sm:text-slate/80">
              Final Leg · Journey Complete
            </p>
            <h3 className="font-display text-2xl font-bold text-ink">Welcome Home!</h3>
            <p className="text-sm text-slate/80">
              Returning to Fort Mill, SC ({leg.distanceMiles.toLocaleString()} miles traveled on this final stretch).
            </p>
          </div>
        </div>

        {onViewRecap && (
          <button
            type="button"
            onClick={onViewRecap}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-brass bg-brass px-5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-navy shadow-sm transition-colors hover:bg-brass/90"
          >
            <Compass size={15} />
            View Complete Year Recap
          </button>
        )}
      </div>
    );
  }

  const trip = leg.trip;
  const dateLabel = formatDateRange(trip);
  const photos = trip.photos ?? [];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={trip.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-5 rounded border border-slate/15 bg-surface/60 p-5 shadow-sm sm:p-6"
      >
        {/* Header: Destination, Country, Stop Badge, Rating */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
              <span className="rounded bg-brass/15 px-2 py-0.5 font-bold text-brass max-sm:text-brass-text">
                Stop {legIndex + 1} of {totalStops}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Milestone size={12} />
                {leg.distanceMiles.toLocaleString()} mi flight
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {trip.destination}
            </h3>

            {trip.country && (
              <p className="flex items-center gap-1 font-body text-sm font-medium text-slate/80">
                <MapPin size={14} className="text-stamp-red" />
                {trip.country}
              </p>
            )}
          </div>

          {/* Stamp Badge */}
          <div className="shrink-0 -mr-2 -mt-2">
            <PassportStamp trip={trip} size="sm" />
          </div>
        </div>

        {/* Date, Nights & Ratings Strip */}
        <div className="flex flex-wrap items-center gap-3 border-y border-dashed border-slate/20 py-2.5 font-mono text-xs text-slate/70 max-sm:text-slate/80">
          {dateLabel && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-brass max-sm:text-brass-text" />
              {dateLabel}
              {trip.dateVisited?.nights != null && (
                <span className="text-slate/50">({trip.dateVisited.nights} nights)</span>
              )}
            </span>
          )}

          {trip.ratingStars != null && (
            <span className="flex items-center gap-1 font-bold text-brass max-sm:text-brass-text">
              <Star size={13} fill="currentColor" />
              {trip.ratingStars} / 5 Stars
            </span>
          )}

          {trip.tripTypes.length > 0 && (
            <div className="flex items-center gap-1">
              {trip.tripTypes.map((t) => (
                <span key={t} className="rounded-full bg-slate/10 px-2 py-0.5 text-[10px] text-slate/80">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes & Memories Quote */}
        {trip.notes && (
          <div className="relative rounded border-l-2 border-brass bg-paper/60 p-3 pl-4 text-sm italic text-ink/90">
            <Quote size={14} className="absolute -left-2 -top-1 rounded-full bg-paper text-brass" />
            <p className="line-clamp-3 font-body">{trip.notes}</p>
          </div>
        )}

        {/* Highlight Photos */}
        {photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate/50 max-sm:text-slate/80">
              Trip Photos ({photos.length})
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.slice(0, 4).map((photo, pIdx) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxIndex(pIdx)}
                  aria-label={`View photo ${pIdx + 1} of ${trip.destination}`}
                  className="group relative h-20 w-full overflow-hidden rounded border border-slate/20 bg-slate/5 transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brass"
                >
                  <PhotoImage
                    photo={photo}
                    alt={photo.name || `${trip.destination} photo ${pIdx + 1}`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                  />
                  {pIdx === 3 && photos.length > 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-navy/70 font-mono text-xs font-bold text-cream">
                      +{photos.length - 4}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action: Open Trip Details Modal */}
        {onOpenTripModal && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onOpenTripModal(trip)}
              className="flex h-11 items-center gap-1.5 rounded-full border border-slate/20 bg-paper px-4 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:border-slate/40 hover:bg-surface"
            >
              <span>Full Trip Details</span>
              <ExternalLink size={13} />
            </button>
          </div>
        )}

        {/* Lightbox for Photos */}
        {lightboxIndex != null && (
          <PhotoLightbox
            photos={photos}
            index={lightboxIndex}
            onNavigate={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
