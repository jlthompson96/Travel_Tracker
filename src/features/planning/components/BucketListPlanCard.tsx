import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical, MapPin } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { PassportStamp } from '../../trips/components/PassportStamp';
import { Pill } from '../../../components/Pill';
import { TripDetailModal } from '../../trips/components/TripDetails/TripDetailModal';
import type { Timeframe } from '../hooks/useBucketListPlan';

const TIMEFRAMES: Timeframe[] = ['This year', 'Next year', 'Someday'];

interface BucketListPlanCardProps {
  trip: Trip;
  rank: number;
  distanceMiles: number | null;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  /** Negative moves the entry up the ranking, positive moves it down. */
  onMove: (delta: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function BucketListPlanCard({
  trip,
  rank,
  distanceMiles,
  timeframe,
  onTimeframeChange,
  onMove,
  canMoveUp,
  canMoveDown,
}: BucketListPlanCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dragControls = useDragControls();

  return (
    <>
      <Reorder.Item
        value={trip.id}
        dragListener={false}
        dragControls={dragControls}
        className="flex flex-col gap-3 border border-slate/15 bg-surface/60 p-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4"
      >
        <div className="flex items-center gap-3 sm:contents">
          {/* Drag stays the desktop gesture; touch-none is what lets
            * dragControls claim the pointer instead of the page scrolling. */}
          <button
            type="button"
            onPointerDown={(e) => dragControls.start(e)}
            className="shrink-0 cursor-grab touch-none text-slate/30 hover:text-slate/60 active:cursor-grabbing max-sm:hidden"
            aria-label={`Reorder ${trip.destination}`}
          >
            <GripVertical size={18} />
          </button>

          {/* Phones get buttons instead of the grip. Dragging from an 18px
            * handle while the page wants to scroll is a losing fight on touch,
            * and unlike drag these work from a keyboard too. */}
          <div className="hidden shrink-0 max-sm:-ml-1.5 max-sm:flex">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={!canMoveUp}
              aria-label={`Move ${trip.destination} up`}
              className="flex h-11 w-11 items-center justify-center text-slate/50 disabled:opacity-25 max-sm:text-slate/80"
            >
              <ChevronUp size={18} />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={!canMoveDown}
              aria-label={`Move ${trip.destination} down`}
              className="flex h-11 w-11 items-center justify-center text-slate/50 disabled:opacity-25 max-sm:text-slate/80"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <span className="w-6 shrink-0 text-center font-mono text-sm text-slate/40 max-sm:text-slate/80">{rank}</span>

          <PassportStamp trip={trip} size="sm" />
        </div>

        <button type="button" onClick={() => setIsOpen(true)} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          <p className="truncate font-display text-base font-semibold text-ink">{trip.destination}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate/70">
            {trip.country && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-brass" />
                {trip.country}
              </span>
            )}
            {distanceMiles != null && <span>{Math.round(distanceMiles).toLocaleString()} mi away</span>}
          </div>
          {trip.tripTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trip.tripTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-ink-navy/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/70 max-sm:text-ink"
                >
                  {type}
                </span>
              ))}
            </div>
          )}
        </button>

        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">When</span>
          <div className="flex flex-wrap gap-1.5">
            {TIMEFRAMES.map((option) => (
              <Pill key={option} group={`timeframe-${trip.id}`} active={timeframe === option} onClick={() => onTimeframeChange(option)}>
                {option}
              </Pill>
            ))}
          </div>
        </div>
      </Reorder.Item>

      <TripDetailModal trip={trip} open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
