import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookImage, BookOpen, Camera, LayoutGrid, Sparkles } from 'lucide-react';
import { useTrips } from '../../../services/notionAdapter';
import { getScrapbookTrips } from '../utils/scrapbookLayout';
import { ScrapbookAlbum } from './ScrapbookAlbum';
import { ScrapbookGrid } from './ScrapbookGrid';

type ViewMode = 'album' | 'grid';

export function ScrapbookPage() {
  const { data: allTrips, isLoading, isError } = useTrips();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('album');

  const trips = useMemo(() => {
    return allTrips ? getScrapbookTrips(allTrips) : [];
  }, [allTrips]);

  const tripIdParam = searchParams.get('trip');

  const currentIndex = useMemo(() => {
    if (!tripIdParam || trips.length === 0) return 0;
    const foundIdx = trips.findIndex((t) => t.id === tripIdParam);
    return foundIdx >= 0 ? foundIdx : 0;
  }, [tripIdParam, trips]);

  const handleIndexChange = (newIndex: number) => {
    const target = trips[newIndex];
    if (target) {
      setSearchParams({ trip: target.id });
    }
  };

  const handleSelectTrip = (tripId: string) => {
    setSearchParams({ trip: tripId });
    setViewMode('album');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-20 animate-pulse rounded border border-slate/10 bg-slate/5" />
        <div className="h-96 animate-pulse rounded border border-slate/10 bg-slate/5" />
      </div>
    );
  }

  if (isError || !allTrips) {
    return (
      <div className="rounded border border-stamp-red/30 bg-stamp-red/5 p-6 text-stamp-red">
        <h3 className="font-display text-lg font-bold">Couldn't load Scrapbook memories</h3>
        <p className="mt-1 text-sm">Please check your connection and try again.</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded border border-dashed border-slate/20 bg-surface/30 py-16 text-center text-slate/60">
        <Camera size={36} className="text-slate/40" />
        <h3 className="font-display text-xl font-bold text-ink">No travel memories yet</h3>
        <p className="max-w-md text-sm text-slate/70">
          Trips marked "Been There" will automatically create your personalized photo scrapbook album!
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-b border-dashed border-slate/20 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-brass-text">
              <Sparkles size={14} className="text-brass" />
              Memory Keepsake
            </div>
            <h2 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">
              Travel Scrapbook
            </h2>
          </div>

          {/* View Mode Toggle: Album Spread vs Collage Grid */}
          <div className="flex items-center rounded-full border border-slate/20 bg-surface/70 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('album')}
              aria-pressed={viewMode === 'album'}
              className={`flex h-10 items-center gap-1.5 rounded-full px-4 font-mono text-xs font-semibold uppercase tracking-wider transition-colors max-sm:h-11 ${
                viewMode === 'album'
                  ? 'bg-ink-navy text-cream shadow-sm'
                  : 'text-slate/70 hover:text-ink'
              }`}
            >
              <BookOpen size={14} />
              Album Spreads
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className={`flex h-10 items-center gap-1.5 rounded-full px-4 font-mono text-xs font-semibold uppercase tracking-wider transition-colors max-sm:h-11 ${
                viewMode === 'grid'
                  ? 'bg-ink-navy text-cream shadow-sm'
                  : 'text-slate/70 hover:text-ink'
              }`}
            >
              <LayoutGrid size={14} />
              Memory Wall
            </button>
          </div>
        </div>

        {/* Quick Trip Selector Pills (Filmstrip) */}
        {viewMode === 'album' && trips.length > 1 && (
          <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pt-2">
            {trips.map((trip, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => handleIndexChange(idx)}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition-colors max-sm:h-11 ${
                    isSelected
                      ? 'border-brass bg-brass text-ink-navy font-semibold shadow-sm'
                      : 'border-slate/20 bg-paper text-slate/70 hover:border-slate/40 hover:text-ink'
                  }`}
                >
                  {trip.photos.length > 0 && <BookImage size={11} />}
                  <span>{trip.destination}</span>
                  {trip.photos.length > 0 && (
                    <span className="text-[10px] opacity-70">({trip.photos.length})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      {viewMode === 'album' ? (
        <ScrapbookAlbum
          trips={trips}
          currentIndex={currentIndex}
          onIndexChange={handleIndexChange}
        />
      ) : (
        <ScrapbookGrid trips={trips} onSelectTrip={handleSelectTrip} />
      )}
    </section>
  );
}

