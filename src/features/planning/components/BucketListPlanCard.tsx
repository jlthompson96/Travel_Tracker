import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, MapPin } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { PassportStamp } from '../../trips/components/PassportStamp';
import { Pill } from '../../trips/components/FilterPills';
import { TripDetailModal } from '../../trips/components/TripDetails/TripDetailModal';
import type { Timeframe } from '../hooks/useBucketListPlan';

const TIMEFRAMES: Timeframe[] = ['This year', 'Next year', 'Someday'];

interface BucketListPlanCardProps {
  trip: Trip;
  rank: number;
  distanceMiles: number | null;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export function BucketListPlanCard({ trip, rank, distanceMiles, timeframe, onTimeframeChange }: BucketListPlanCardProps) {
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
          <button
            type="button"
            onPointerDown={(e) => dragControls.start(e)}
            className="shrink-0 cursor-grab touch-none text-slate/30 hover:text-slate/60 active:cursor-grabbing"
            aria-label={`Reorder ${trip.destination}`}
          >
            <GripVertical size={18} />
          </button>

          <span className="w-6 shrink-0 text-center font-mono text-sm text-slate/40">{rank}</span>

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
                  className="rounded-full bg-ink-navy/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/70"
                >
                  {type}
                </span>
              ))}
            </div>
          )}
        </button>

        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate/50">When</span>
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
