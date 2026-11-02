import { Camera, MapPin, Sparkles } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { formatDateRange } from '../../trips/utils/formatTrip';
import { PolaroidPhoto } from './PolaroidPhoto';
import { TicketStub } from './TicketStub';
import { JournalNote } from './JournalNote';
import { TravelStickers } from './TravelStickers';

interface ScrapbookPrintSpreadProps {
  trip: Trip;
  tripIndex: number;
  totalTrips: number;
  isLast?: boolean;
}

export function ScrapbookPrintSpread({
  trip,
  tripIndex,
  totalTrips,
}: ScrapbookPrintSpreadProps) {
  const dateRange = formatDateRange(trip);
  const photos = trip.photos ?? [];

  return (
    <article className="scrapbook-print-sheet">
      {/* Paper Grain Texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #14232E 1.2px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Vintage Left Margin Binder Holes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 bottom-4 left-3 flex w-4 flex-col justify-around opacity-40"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-2.5 w-2.5 rounded-full border border-slate/40 bg-[#E8DFC8]" />
        ))}
      </div>

      <div className="relative flex h-full flex-col justify-between pl-6">
        {/* Spread Header */}
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-dashed border-slate/20 pb-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brass-text">
              <Sparkles size={12} className="text-brass" />
              <span>
                Memory {tripIndex + 1} of {totalTrips}
              </span>
              {dateRange && (
                <>
                  <span>·</span>
                  <span>{dateRange}</span>
                </>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {trip.destination}
            </h2>
            {trip.country && (
              <p className="flex items-center gap-1 font-body text-xs font-semibold text-slate/70">
                <MapPin size={12} className="text-stamp-red" />
                {trip.country}
                {trip.dateVisited?.nights != null && (
                  <span className="font-mono text-[11px] font-normal text-slate/50">
                    ({trip.dateVisited.nights} nights)
                  </span>
                )}
              </p>
            )}
          </div>

          <TravelStickers trip={trip} showStamp={true} />
        </div>

        {/* Content: Photos & Ephemera */}
        <div className="my-auto flex flex-col justify-center gap-4 py-2">
          {photos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center text-slate/60">
              <Camera size={32} className="text-slate/40" />
              <p className="font-display text-base font-bold text-ink">
                Memories of {trip.destination}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
                <TicketStub trip={trip} />
                {trip.notes && <JournalNote trip={trip} />}
              </div>
            </div>
          ) : (
            <>
              {/* Photo Collage Row */}
              <div className="flex flex-wrap items-center justify-center gap-5 py-1">
                {photos.map((photo, pIdx) => (
                  <PolaroidPhoto
                    key={photo.id}
                    photo={photo}
                    index={pIdx}
                    tripId={trip.id}
                    destination={trip.destination}
                    size={photos.length <= 2 ? 'md' : 'sm'}
                    loading="eager"
                  />
                ))}
              </div>

              {/* Ephemera Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-slate/20 pt-3">
                <TicketStub trip={trip} className="shrink-0" />
                {trip.notes && <JournalNote trip={trip} className="shrink-0" />}
              </div>
            </>
          )}
        </div>

        {/* Spread Footer Tag */}
        <div className="flex items-center justify-between border-t border-slate/20 pt-2 font-mono text-[9px] uppercase tracking-widest text-slate/40">
          <span>Joey &amp; Sarah's Travel Archive</span>
          <span>
            Page {tripIndex + 1} of {totalTrips} · ID: {trip.id.slice(0, 8)}
          </span>
        </div>
      </div>
    </article>
  );
}

interface ScrapbookPrintDocumentProps {
  trips: Trip[];
  currentIndex?: number;
  mode: 'current' | 'all';
}

export function ScrapbookPrintDocument({
  trips,
  currentIndex = 0,
  mode,
}: ScrapbookPrintDocumentProps) {
  const tripsToPrint =
    mode === 'current' ? [trips[currentIndex]].filter(Boolean) : trips;

  return (
    <div className="scrapbook-print-container">
      {tripsToPrint.map((trip, idx) => (
        <ScrapbookPrintSpread
          key={trip.id}
          trip={trip}
          tripIndex={mode === 'current' ? currentIndex : idx}
          totalTrips={trips.length}
          isLast={idx === tripsToPrint.length - 1}
        />
      ))}
    </div>
  );
}

