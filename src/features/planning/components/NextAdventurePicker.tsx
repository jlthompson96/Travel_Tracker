import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Shuffle, Signpost } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { PassportStamp } from '../../trips/components/PassportStamp';
import { TripDetailModal } from '../../trips/components/TripDetails/TripDetailModal';

interface NextAdventurePickerProps {
  trips: Trip[];
  distances: Map<string, number>;
}

export function NextAdventurePicker({ trips, distances }: NextAdventurePickerProps) {
  const [pick, setPick] = useState<Trip | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [spinKey, setSpinKey] = useState(0);

  if (trips.length === 0) return null;

  const closest = [...trips].sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity))[0];

  const surpriseMe = () => {
    const next = trips[Math.floor(Math.random() * trips.length)];
    setPick(next);
    setSpinKey((k) => k + 1);
  };

  const pickClosest = () => {
    setPick(closest);
    setSpinKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-3 border border-dashed border-brass/40 bg-brass/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60">
          <Signpost size={14} className="text-brass" /> Next adventure
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pickClosest}
            className="flex items-center gap-1.5 rounded-full border border-slate/20 bg-surface/60 px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide text-slate/70 transition-colors hover:border-slate/40 hover:bg-surface/90"
          >
            <MapPin size={13} /> Closest option
          </button>
          <button
            type="button"
            onClick={surpriseMe}
            className="flex items-center gap-1.5 rounded-full border border-ink-navy bg-ink-navy px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide text-cream transition-opacity hover:opacity-90"
          >
            <Shuffle size={13} /> Surprise me
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {pick ? (
          <motion.button
            key={spinKey}
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="flex items-center gap-4 border border-slate/15 bg-surface/70 p-4 text-left shadow-sm"
          >
            <PassportStamp trip={pick} size="md" />
            <div className="flex flex-col gap-1">
              <p className="font-display text-xl font-semibold text-ink">{pick.destination}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate/70">
                {pick.country && <span>{pick.country}</span>}
                {distances.has(pick.id) && <span>{Math.round(distances.get(pick.id)!).toLocaleString()} mi away</span>}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-horizon-teal">Tap to see details</p>
            </div>
          </motion.button>
        ) : (
          <p className="text-sm text-slate/60">
            {trips.length} places on the list — let us pick one, or jump straight to whichever is closest.
          </p>
        )}
      </AnimatePresence>

      {pick && <TripDetailModal trip={pick} open={isOpen} onClose={() => setIsOpen(false)} />}
    </div>
  );
}
