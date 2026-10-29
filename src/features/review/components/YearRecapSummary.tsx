import { useRef, useState } from 'react';
import { Award, Check, Globe2, Loader2, Milestone, Moon, Plane, Play, Share2, Sparkles, Star } from 'lucide-react';
import { PassportStamp } from '../../trips/components/PassportStamp';
import type { YearReviewStats } from '../utils/yearStats';
import type { Trip } from '../../../types/travel';

interface YearRecapSummaryProps {
  stats: YearReviewStats;
  onReplayJourney: () => void;
  onOpenTripModal?: (trip: Trip) => void;
}

type ExportState = 'idle' | 'working' | 'done' | 'error';

export function YearRecapSummary({
  stats,
  onReplayJourney,
  onOpenTripModal,
}: YearRecapSummaryProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  const handleExportImage = async () => {
    const node = cardRef.current;
    if (!node) return;

    setExportState('working');
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: '#14232E', // Solid ink-navy backdrop
        skipFonts: true,
      });

      if (!blob) throw new Error('Could not render recap image');

      const file = new File([blob], `travel-review-${stats.year}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${stats.year} Travel Review` });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `travel-review-${stats.year}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
      setExportState('done');
      setTimeout(() => setExportState('idle'), 2500);
    } catch (err) {
      console.error('Failed to export image', err);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold text-ink">
            {stats.year} Travel Wrapped
          </h3>
          <p className="font-mono text-xs text-slate/60 max-sm:text-slate/80">
            A celebration of your travels, passport stamps, and milestones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReplayJourney}
            className="flex h-11 items-center gap-1.5 rounded-full border border-slate/20 bg-paper px-4 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:border-slate/40 hover:bg-surface"
          >
            <Play size={13} fill="currentColor" />
            Watch Flight Map
          </button>

          <button
            type="button"
            onClick={handleExportImage}
            disabled={exportState === 'working'}
            className="flex h-11 items-center gap-2 rounded-full border border-brass bg-brass px-5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-navy shadow-sm transition-colors hover:bg-brass/90 disabled:opacity-50"
          >
            {exportState === 'working' ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : exportState === 'done' ? (
              <>
                <Check size={15} />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Share2 size={15} />
                <span>Share Review Card</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* The Printable / Exportable Boarding Pass Recap Card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-xl border-4 border-brass bg-ink-navy p-6 text-cream shadow-xl sm:p-8"
      >
        {/* Subtle background grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #F7F2E7 1.5px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Card Header Strip */}
        <div className="relative border-b-2 border-dashed border-cream/20 pb-5">
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-brass">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} />
              Boarding Pass · Year in Review
            </span>
            <span>{stats.year} Edition</span>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
            Joey & Sarah's Travel Review
          </h2>
        </div>

        {/* Big Numbers Stat Grid */}
        <div className="relative grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
          <div className="flex flex-col gap-1 border-r border-cream/10 pr-2">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-brass">
              <Plane size={13} />
              Trips
            </span>
            <p className="font-display text-3xl font-bold text-cream sm:text-4xl">
              {stats.totalTrips}
            </p>
            <span className="font-mono text-[10px] text-cream/60">Destinations logged</span>
          </div>

          <div className="flex flex-col gap-1 border-r border-cream/10 pr-2 max-sm:border-r-0">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-brass">
              <Milestone size={13} />
              Distance
            </span>
            <p className="font-display text-3xl font-bold text-cream sm:text-4xl">
              {stats.totalMiles.toLocaleString()}
            </p>
            <span className="font-mono text-[10px] text-cream/60">
              {stats.earthCircumferences}x around Earth
            </span>
          </div>

          <div className="flex flex-col gap-1 border-r border-cream/10 pr-2">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-brass">
              <Globe2 size={13} />
              Countries
            </span>
            <p className="font-display text-3xl font-bold text-cream sm:text-4xl">
              {stats.countriesCount}
            </p>
            <span className="font-mono text-[10px] text-cream/60">New stamps earned</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-brass">
              <Moon size={13} />
              Nights
            </span>
            <p className="font-display text-3xl font-bold text-cream sm:text-4xl">
              {stats.totalNights}
            </p>
            <span className="font-mono text-[10px] text-cream/60">Nights away from home</span>
          </div>
        </div>

        {/* Highlights Row */}
        <div className="relative grid grid-cols-1 gap-4 border-t border-dashed border-cream/20 py-6 sm:grid-cols-3">
          {stats.favoriteTrip && (
            <div className="rounded border border-cream/15 bg-cream/5 p-3.5">
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-brass">
                <Star size={12} fill="currentColor" /> Top Rated Journey
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-cream">
                {stats.favoriteTrip.destination}
              </p>
              <p className="text-xs text-cream/70">
                {stats.favoriteTrip.country} · {stats.favoriteTrip.ratingStars ?? 5} Stars
              </p>
            </div>
          )}

          {stats.farthestTrip && (
            <div className="rounded border border-cream/15 bg-cream/5 p-3.5">
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-brass">
                <Award size={12} /> Farthest Destination
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-cream">
                {stats.farthestTrip.trip.destination}
              </p>
              <p className="text-xs text-cream/70">
                {stats.farthestTrip.oneWayMiles.toLocaleString()} miles from Fort Mill
              </p>
            </div>
          )}

          {stats.topTripTypes.length > 0 && (
            <div className="rounded border border-cream/15 bg-cream/5 p-3.5">
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-brass">
                <Globe2 size={12} /> Travel Style
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-cream">
                {stats.topTripTypes[0].type} Explorer
              </p>
              <p className="text-xs text-cream/70">
                {stats.topTripTypes.map((t) => `${t.type} (${t.count})`).join(' · ')}
              </p>
            </div>
          )}
        </div>

        {/* The Year's Passport Stamps Collection */}
        <div className="relative border-t border-dashed border-cream/20 pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-brass">
            Official Passport Stamp Collection ({stats.year})
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-lg border border-cream/10 bg-cream/5 p-4 sm:gap-6">
            {stats.trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => onOpenTripModal?.(trip)}
                className="cursor-pointer transition-transform hover:scale-105"
                title={`${trip.destination} (${trip.country ?? ''})`}
              >
                <PassportStamp trip={trip} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Barcode & Footer Ticket Stamp */}
        <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-cream/20 pt-4 font-mono text-[10px] uppercase tracking-widest text-cream/50">
          <span>DESTINATIONS: {stats.countriesVisited.join(' · ') || 'WORLDWIDE'}</span>
          <span>ORIGIN: FORT MILL, SC (USA)</span>
          <span>PASSENGER: JOEY & SARAH</span>
        </div>
      </div>
    </div>
  );
}
