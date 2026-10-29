import { useState } from 'react';
import { Camera, MapPin, Quote, Star } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { formatDateRange } from '../../trips/utils/formatTrip';
import { PolaroidPhoto } from './PolaroidPhoto';
import { TravelStickers } from './TravelStickers';
import { PhotoLightbox } from '../../trips/components/TripDetails/PhotoLightbox';

interface ScrapbookGridProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
}

export function ScrapbookGrid({ trips, onSelectTrip }: ScrapbookGridProps) {
  const [lightboxData, setLightboxData] = useState<{
    photos: Trip['photos'];
    index: number;
  } | null>(null);

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate/20 py-16 text-center text-slate/50">
        <Camera size={32} className="mb-2 text-slate/40" />
        <p className="font-display text-lg text-slate/70">No trips with scrapbook memories found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {trips.map((trip) => {
        const dateRange = formatDateRange(trip);
        const photos = trip.photos ?? [];

        return (
          <div
            key={trip.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border-2 border-[#DCD3C1] bg-[#F7F2E7] p-6 shadow-md transition-all duration-200 hover:shadow-xl"
          >
            {/* Paper Texture */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #14232E 1.2px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Top Bar: Title, Date, Stickers */}
            <div className="relative mb-4 flex items-start justify-between gap-3 border-b border-dashed border-slate/20 pb-3">
              <div>
                <button
                  type="button"
                  onClick={() => onSelectTrip(trip.id)}
                  className="text-left font-display text-xl font-bold text-ink transition-colors hover:text-brass"
                >
                  {trip.destination}
                </button>
                {trip.country && (
                  <p className="flex items-center gap-1 font-body text-xs font-semibold text-slate/70">
                    <MapPin size={12} className="text-stamp-red" />
                    {trip.country}
                    {dateRange && <span className="font-mono text-slate/50">· {dateRange}</span>}
                  </p>
                )}
              </div>

              <TravelStickers trip={trip} showStamp={false} />
            </div>

            {/* Photos Strip */}
            <div className="relative my-2 flex flex-wrap items-center justify-center gap-4 py-2">
              {photos.slice(0, 3).map((photo, pIdx) => (
                <PolaroidPhoto
                  key={photo.id}
                  photo={photo}
                  index={pIdx}
                  tripId={trip.id}
                  destination={trip.destination}
                  onSelect={(idx) => setLightboxData({ photos, index: idx })}
                  size="sm"
                />
              ))}
              {photos.length === 0 && (
                <div className="flex h-32 w-full items-center justify-center rounded border border-dashed border-slate/20 font-mono text-xs text-slate/50">
                  No photos attached
                </div>
              )}
            </div>

            {/* Note Snippet if available */}
            {trip.notes && (
              <div className="relative mt-3 flex items-start gap-2 border-t border-dashed border-slate/20 pt-3 text-xs italic text-slate/80">
                <Quote size={12} className="shrink-0 text-brass" />
                <p className="line-clamp-2">{trip.notes}</p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="relative mt-4 flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 text-brass">
                {trip.ratingStars != null &&
                  Array.from({ length: trip.ratingStars }).map((_, i) => (
                    <Star key={i} size={12} fill="currentColor" />
                  ))}
              </div>

              <button
                type="button"
                onClick={() => onSelectTrip(trip.id)}
                className="flex h-9 items-center rounded-full border border-slate/20 bg-paper px-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:border-brass hover:bg-surface max-sm:h-11"
              >
                Open Album Page ➔
              </button>
            </div>
          </div>
        );
      })}

      {/* Lightbox for Grid Photos */}
      {lightboxData != null && (
        <PhotoLightbox
          photos={lightboxData.photos}
          index={lightboxData.index}
          onNavigate={(newIdx) => setLightboxData({ ...lightboxData, index: newIdx })}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
}

