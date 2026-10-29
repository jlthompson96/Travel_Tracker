import { forwardRef, useState } from 'react';
import { Camera, MapPin, Sparkles } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { formatDateRange } from '../../trips/utils/formatTrip';
import { PolaroidPhoto } from './PolaroidPhoto';
import { TicketStub } from './TicketStub';
import { JournalNote } from './JournalNote';
import { TravelStickers } from './TravelStickers';
import { PhotoLightbox } from '../../trips/components/TripDetails/PhotoLightbox';

interface ScrapbookSpreadProps {
  trip: Trip;
  tripIndex: number;
  totalTrips: number;
}

export const ScrapbookSpread = forwardRef<HTMLDivElement, ScrapbookSpreadProps>(
  ({ trip, tripIndex, totalTrips }, ref) => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const dateRange = formatDateRange(trip);
    const photos = trip.photos ?? [];

    return (
      <div
        ref={ref}
        className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-xl border-4 border-[#DCD3C1] bg-[#F7F2E7] p-6 shadow-xl sm:p-10"
      >
        {/* Subtle Paper Grain Texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #14232E 1.2px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Vintage Spiral / Scrapbook Left Margin Perforation on Desktop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-3 hidden w-4 flex-col justify-around opacity-30 lg:flex"
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-3 w-3 rounded-full border-2 border-slate/50 bg-[#E8DFC8]" />
          ))}
        </div>

        {/* Spread Header */}
        <div className="relative mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-dashed border-slate/20 pb-5 lg:pl-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-brass-text">
              <Sparkles size={13} />
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

            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {trip.destination}
            </h2>

            {trip.country && (
              <p className="flex items-center gap-1 font-body text-sm font-semibold text-slate/70">
                <MapPin size={14} className="text-stamp-red" />
                {trip.country}
                {trip.dateVisited?.nights != null && (
                  <span className="font-mono text-xs font-normal text-slate/50">
                    ({trip.dateVisited.nights} nights)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Stickers & Stamp Header Strip */}
          <TravelStickers trip={trip} showStamp={true} />
        </div>

        {/* Main Spread Content: Photos & Ephemera Collage */}
        <div className="relative flex flex-col gap-8 lg:pl-6">
          {photos.length === 0 ? (
            /* Empty State for trips with no photos */
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-slate/20 bg-surface/40 py-12 text-center text-slate/60">
              <Camera size={36} className="text-slate/40" />
              <div className="flex flex-col gap-1">
                <p className="font-display text-lg font-bold text-ink">No photos attached yet</p>
                <p className="text-xs text-slate/70">
                  Add photos to this trip in Notion to see them pinned here as Polaroids!
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
                <TicketStub trip={trip} />
                {trip.notes && <JournalNote trip={trip} />}
              </div>
            </div>
          ) : (
            <>
              {/* Photo Collage Row */}
              <div className="flex flex-wrap items-center justify-center gap-6 py-2 sm:gap-8">
                {photos.map((photo, index) => (
                  <PolaroidPhoto
                    key={photo.id}
                    photo={photo}
                    index={index}
                    tripId={trip.id}
                    destination={trip.destination}
                    onSelect={setLightboxIndex}
                    size={photos.length <= 2 ? 'lg' : photos.length <= 4 ? 'md' : 'sm'}
                  />
                ))}
              </div>

              {/* Ephemera Row: Ticket Stub & Journal Field Notes */}
              <div className="mt-4 flex flex-wrap items-start justify-center gap-6 border-t border-dashed border-slate/20 pt-6 sm:justify-between">
                <TicketStub trip={trip} className="shrink-0" />
                {trip.notes && <JournalNote trip={trip} className="shrink-0" />}
              </div>
            </>
          )}
        </div>

        {/* Spread Footer Tag */}
        <div className="relative mt-8 flex items-center justify-between border-t border-slate/20 pt-4 font-mono text-[10px] uppercase tracking-widest text-slate/40 lg:pl-6">
          <span>Joey & Sarah's Travel Archive</span>
          <span>{trip.id.slice(0, 8)}</span>
        </div>

        {/* Lightbox for full photo viewing */}
        {lightboxIndex != null && (
          <PhotoLightbox
            photos={photos}
            index={lightboxIndex}
            onNavigate={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    );
  },
);

ScrapbookSpread.displayName = 'ScrapbookSpread';

