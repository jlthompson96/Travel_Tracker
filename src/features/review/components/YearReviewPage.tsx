import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, MapPin, Plane, Sparkles } from 'lucide-react';
import { HOME_LOCATION, useTrips } from '../../../services/notionAdapter';
import { TripDetailModal } from '../../trips/components/TripDetails/TripDetailModal';
import type { Trip } from '../../../types/travel';
import {
  computeYearReviewStats,
  generateFlightLegs,
  getAvailableYears,
  getTripsForYear,
  type RouteMode,
} from '../utils/yearStats';
import { FlightReviewMap } from './FlightReviewMap';
import { FlightControls } from './FlightControls';
import { PlaceHighlightCard } from './PlaceHighlightCard';
import { YearRecapSummary } from './YearRecapSummary';

type ViewMode = 'journey' | 'recap';

const BASE_LEG_DURATION_MS = 3800;
const ARRIVAL_PAUSE_MS = 3500;

export function YearReviewPage() {
  const { data: allTrips, isLoading, isError } = useTrips();
  const [searchParams, setSearchParams] = useSearchParams();

  const availableYears = useMemo(() => {
    return allTrips ? getAvailableYears(allTrips) : [];
  }, [allTrips]);

  const yearParam = searchParams.get('year');
  const selectedYear = useMemo(() => {
    if (yearParam && availableYears.includes(yearParam)) {
      return yearParam;
    }
    return availableYears[0] ?? '2026';
  }, [yearParam, availableYears]);

  const handleSelectYear = (year: string) => {
    setSearchParams({ year });
    setActiveLegIndex(0);
    setLegProgress(0);
    setIsPlaying(false);
  };

  const tripsForYear = useMemo(() => {
    return allTrips ? getTripsForYear(allTrips, selectedYear) : [];
  }, [allTrips, selectedYear]);

  const stats = useMemo(() => {
    return computeYearReviewStats(tripsForYear, selectedYear, HOME_LOCATION);
  }, [tripsForYear, selectedYear]);

  const [routeMode, setRouteMode] = useState<RouteMode>('grand-tour');
  const [viewMode, setViewMode] = useState<ViewMode>('journey');

  const legs = useMemo(() => {
    return generateFlightLegs(tripsForYear, routeMode, HOME_LOCATION);
  }, [tripsForYear, routeMode]);

  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [legProgress, setLegProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [modalTrip, setModalTrip] = useState<Trip | null>(null);

  // Animation ticker using requestAnimationFrame
  const lastTimeRef = useRef<number | null>(null);
  const pauseUntilRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animId: number;

    const tick = (now: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = now;
      }
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Handle pause on arrival at destination
      if (pauseUntilRef.current != null) {
        if (now < pauseUntilRef.current) {
          animId = requestAnimationFrame(tick);
          return;
        }
        pauseUntilRef.current = null;
        // Advance to next leg
        setActiveLegIndex((prevIdx) => {
          if (prevIdx < legs.length - 1) {
            setLegProgress(0);
            return prevIdx + 1;
          } else {
            // Completed all legs!
            setIsPlaying(false);
            setViewMode('recap');
            return prevIdx;
          }
        });
        animId = requestAnimationFrame(tick);
        return;
      }

      const legDuration = BASE_LEG_DURATION_MS / playbackSpeed;
      const progressIncrement = delta / legDuration;

      setLegProgress((prev) => {
        const next = prev + progressIncrement;
        if (next >= 1) {
          // Reached destination, pause to show highlights
          const pauseDuration = ARRIVAL_PAUSE_MS / playbackSpeed;
          pauseUntilRef.current = now + pauseDuration;
          return 1;
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, legs.length]);

  const handleTogglePlay = () => {
    if (activeLegIndex >= legs.length - 1 && legProgress >= 0.99) {
      // Replay from beginning
      setActiveLegIndex(0);
      setLegProgress(0);
    }
    pauseUntilRef.current = null;
    setIsPlaying((prev) => !prev);
  };

  const handlePreviousLeg = () => {
    setIsPlaying(false);
    pauseUntilRef.current = null;
    setActiveLegIndex((prev) => Math.max(0, prev - 1));
    setLegProgress(1);
  };

  const handleNextLeg = () => {
    setIsPlaying(false);
    pauseUntilRef.current = null;
    setActiveLegIndex((prev) => Math.min(legs.length - 1, prev + 1));
    setLegProgress(1);
  };

  const handleSelectLeg = (index: number) => {
    setIsPlaying(false);
    pauseUntilRef.current = null;
    setActiveLegIndex(index);
    setLegProgress(1);
  };

  const handleReplay = () => {
    setActiveLegIndex(0);
    setLegProgress(0);
    pauseUntilRef.current = null;
    setIsPlaying(true);
    setViewMode('journey');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 animate-pulse rounded border border-slate/10 bg-slate/5" />
        <div className="h-96 animate-pulse rounded border border-slate/10 bg-slate/5" />
      </div>
    );
  }

  if (isError || !allTrips) {
    return (
      <div className="rounded border border-stamp-red/30 bg-stamp-red/5 p-6 text-stamp-red">
        <h3 className="font-display text-lg font-bold">Couldn't load Year End Review</h3>
        <p className="mt-1 text-sm">Please check your connection and try again.</p>
      </div>
    );
  }

  const currentLeg = legs[activeLegIndex];

  return (
    <section className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-b border-dashed border-slate/20 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-brass">
              <Sparkles size={14} />
              Year End Review
            </div>
            <h2 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">
              {selectedYear} Travel Wrapped
            </h2>
          </div>

          {/* View Mode Toggle: Map Journey vs Boarding Pass Recap */}
          <div className="flex items-center rounded-full border border-slate/20 bg-surface/70 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('journey')}
              aria-pressed={viewMode === 'journey'}
              className={`flex h-10 items-center gap-1.5 rounded-full px-4 font-mono text-xs font-semibold uppercase tracking-wider transition-colors max-sm:h-11 ${
                viewMode === 'journey'
                  ? 'bg-ink-navy text-cream shadow-sm'
                  : 'text-slate/70 hover:text-ink'
              }`}
            >
              <Plane size={14} />
              Flight Journey
            </button>
            <button
              type="button"
              onClick={() => setViewMode('recap')}
              aria-pressed={viewMode === 'recap'}
              className={`flex h-10 items-center gap-1.5 rounded-full px-4 font-mono text-xs font-semibold uppercase tracking-wider transition-colors max-sm:h-11 ${
                viewMode === 'recap'
                  ? 'bg-ink-navy text-cream shadow-sm'
                  : 'text-slate/70 hover:text-ink'
              }`}
            >
              <Sparkles size={14} />
              Year Recap
            </button>
          </div>
        </div>

        {/* Year Pills Navigation */}
        {availableYears.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="font-mono text-xs uppercase tracking-wider text-slate/50 max-sm:text-slate/80">
              Select Year:
            </span>
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => handleSelectYear(year)}
                aria-current={selectedYear === year ? 'page' : undefined}
                className={`flex h-9 items-center rounded-full border px-4 font-mono text-xs font-semibold transition-colors max-sm:h-11 ${
                  selectedYear === year
                    ? 'border-brass bg-brass text-ink-navy shadow-sm'
                    : 'border-slate/20 bg-paper text-slate/70 hover:border-slate/40 hover:text-ink'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State if No Trips in Selected Year */}
      {tripsForYear.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded border border-dashed border-slate/20 bg-surface/30 py-16 text-center text-slate/60">
          <Compass size={36} className="text-slate/40" />
          <h3 className="font-display text-xl font-bold text-ink">No trips recorded for {selectedYear}</h3>
          <p className="max-w-md text-sm text-slate/70">
            Trips marked "Been There" with a Date Visited in {selectedYear} will automatically appear in your Year End Review!
          </p>
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs">Try viewing:</span>
              {availableYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleSelectYear(y)}
                  className="rounded border border-slate/20 bg-paper px-3 py-1 font-mono text-xs text-ink hover:border-slate/40"
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : viewMode === 'recap' ? (
        <YearRecapSummary
          stats={stats}
          onReplayJourney={handleReplay}
          onOpenTripModal={setModalTrip}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Main Flight Stage: Map & Controls */}
          <div className="flex flex-col gap-3">
            <FlightReviewMap
              home={HOME_LOCATION}
              legs={legs}
              activeLegIndex={activeLegIndex}
              legProgress={legProgress}
              onSelectLeg={handleSelectLeg}
              heightClassName="h-[460px] max-sm:h-[340px]"
            />

            <FlightControls
              legs={legs}
              activeLegIndex={activeLegIndex}
              legProgress={legProgress}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              routeMode={routeMode}
              onTogglePlay={handleTogglePlay}
              onPreviousLeg={handlePreviousLeg}
              onNextLeg={handleNextLeg}
              onSelectLeg={handleSelectLeg}
              onChangeSpeed={setPlaybackSpeed}
              onChangeRouteMode={(mode) => {
                setRouteMode(mode);
                setActiveLegIndex(0);
                setLegProgress(0);
                setIsPlaying(false);
              }}
              onReplay={handleReplay}
            />
          </div>

          {/* Destination Spotlight & Highlights */}
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-slate/60 max-sm:text-slate/80">
              <MapPin size={13} className="text-stamp-red" />
              Destination Highlights
            </h3>

            <PlaceHighlightCard
              leg={currentLeg}
              legIndex={activeLegIndex}
              totalStops={legs.filter((l) => !l.isReturnHome).length}
              onOpenTripModal={setModalTrip}
              onViewRecap={() => setViewMode('recap')}
            />
          </div>
        </div>
      )}

      {/* Modal for full trip details if clicked */}
      {modalTrip && (
        <TripDetailModal
          trip={modalTrip}
          open={Boolean(modalTrip)}
          onClose={() => setModalTrip(null)}
        />
      )}
    </section>
  );
}
