import { CalendarDays, MapPin, Tag, StickyNote, Camera, Star } from 'lucide-react';
import type { Trip } from '../../../../types/travel';
import { formatDateRange, formatVisitLabel } from '../../utils/formatTrip';
import { PassportStamp } from '../PassportStamp';
import { PhotoImage } from '../../../../components/PhotoImage';

interface TripPrintDocumentProps {
  trip: Trip;
  visits?: Trip[];
}

export function TripPrintDocument({ trip, visits }: TripPrintDocumentProps) {
  const dateLabel = formatDateRange(trip);
  const otherVisits = visits?.filter((v) => v.id !== trip.id) ?? [];
  const printDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="trip-print-sheet mx-auto max-w-4xl bg-white p-8 font-sans text-ink">
      {/* Top Header Ledger Bar */}
      <header className="flex items-center justify-between border-b-2 border-brass pb-3 font-mono text-[11px] uppercase tracking-wider text-slate/70">
        <span>Travel Tracker // Expedition Brief &amp; Itinerary</span>
        <span>Printed: {printDate}</span>
      </header>

      {/* Hero Section: Destination, Metadata & Passport Stamp */}
      <div className="mt-6 flex items-start justify-between gap-6 border-b border-dashed border-slate/30 pb-6">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            {trip.destination}
          </h1>
          {trip.country && (
            <p className="mt-1 font-mono text-sm uppercase tracking-wide text-slate/70">
              {trip.country}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {trip.ratingStars && (
              <div
                className="flex items-center gap-0.5 text-brass"
                aria-label={`${trip.ratingStars} of 5 stars`}
              >
                {Array.from({ length: trip.ratingStars }).map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
            )}

            {trip.priority && (
              <span className="rounded border border-slate/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate/80">
                Priority: {trip.priority}
              </span>
            )}

            {trip.status && (
              <span className="rounded bg-ink-navy/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink">
                Status: {trip.status}
              </span>
            )}
          </div>
        </div>

        {trip.status && (
          <div className="shrink-0">
            <PassportStamp trip={trip} size="lg" />
          </div>
        )}
      </div>

      {/* Core Details Grid */}
      <section className="mt-6 grid grid-cols-2 gap-4 border-b border-dashed border-slate/30 pb-6 text-sm">
        <div className="rounded border border-slate/20 bg-slate/5 p-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/70">
            <CalendarDays size={13} className="text-brass" />
            <span>Dates &amp; Duration</span>
          </div>
          <p className="mt-1 font-semibold text-ink">
            {dateLabel || 'Dates not specified'}
          </p>
        </div>

        <div className="rounded border border-slate/20 bg-slate/5 p-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/70">
            <MapPin size={13} className="text-brass" />
            <span>Location &amp; Coordinates</span>
          </div>
          <p className="mt-1 text-ink">
            {trip.location?.address || trip.location?.name || 'No address logged'}
          </p>
          {trip.location?.latitude != null && trip.location?.longitude != null && (
            <p className="mt-0.5 font-mono text-xs text-slate/60">
              {trip.location.latitude.toFixed(4)}°, {trip.location.longitude.toFixed(4)}°
            </p>
          )}
        </div>

        {trip.tripTypes.length > 0 && (
          <div className="col-span-2 rounded border border-slate/20 bg-slate/5 p-3">
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/70">
              <Tag size={13} className="text-brass" />
              <span>Trip Categories</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {trip.tripTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-slate/30 bg-white px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Multiple Visits Record */}
      {otherVisits.length > 0 && (
        <section className="mt-6 border-b border-dashed border-slate/30 pb-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-slate/70">
            All Recorded Visits ({visits?.length ?? 1})
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {visits?.map((visit) => (
              <span
                key={visit.id}
                className={`rounded border px-2.5 py-1 font-mono text-xs uppercase tracking-wide ${
                  visit.id === trip.id
                    ? 'border-ink bg-ink text-white font-semibold'
                    : 'border-slate/30 bg-slate/5 text-slate/80'
                }`}
              >
                {formatVisitLabel(visit)} {visit.id === trip.id && '(This Record)'}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Field Notes & Itinerary */}
      {trip.notes && (
        <section className="notes-card mt-6 border-b border-dashed border-slate/30 pb-6">
          <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-slate/70">
            <StickyNote size={14} className="text-brass" />
            <span>Field Notes &amp; Itinerary</span>
          </div>
          <div className="mt-3 whitespace-pre-wrap rounded border border-slate/20 bg-slate/5 p-4 text-sm leading-relaxed text-slate/90">
            {trip.notes}
          </div>
        </section>
      )}

      {/* Photo Gallery / Visual Memories */}
      {trip.photos.length > 0 && (
        <section className="photo-gallery-section mt-6">
          <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-slate/70">
            <Camera size={14} className="text-brass" />
            <span>Photographs &amp; Memories ({trip.photos.length})</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {trip.photos.map((photo, i) => (
              <div
                key={photo.id || i}
                className="photo-card flex flex-col overflow-hidden rounded border border-slate/20 bg-slate/5 p-1.5 shadow-sm"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-slate/10">
                  <PhotoImage
                    photo={photo}
                    alt={`${trip.destination} photo ${i + 1}`}
                    loading="eager"
                    className="h-full w-full object-cover"
                  />
                </div>
                {photo.name && (
                  <p className="mt-1 truncate px-1 font-mono text-[10px] text-slate/60">
                    {photo.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer Colophon */}
      <footer className="mt-10 flex items-center justify-between border-t border-slate/20 pt-4 font-mono text-[10px] uppercase tracking-wider text-slate/50">
        <span>Travel Tracker Archive</span>
        <span>ID: {trip.id.slice(0, 12)}</span>
      </footer>
    </article>
  );
}

