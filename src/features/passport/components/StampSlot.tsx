import { useState } from 'react';
import { PassportStamp } from '../../trips/components/PassportStamp';
import { TripDetailModal } from '../../trips/components/TripDetails/TripDetailModal';
import { hashString } from '../../trips/utils/stampRecipe';
import { formatDateRange } from '../../trips/utils/formatTrip';
import type { PassportEntry } from '../utils/buildPassportPages';

/** Border stamps print one arrival date, not a range — and a range doesn't fit
 * under the imprint anyway. The full range still reaches screen readers via the
 * button's label, and the detail modal shows it in full. */
function stampDate(trip: PassportEntry['trip']): string | null {
  const start = trip.dateVisited?.start;
  if (!start) return null;
  return new Date(start)
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(',', '')
    .toUpperCase();
}

/** Nudges each stamp off the grid so a page looks hand-stamped rather than
 * laid out. Derived from the trip id (same hash the stamp's own recipe uses),
 * so a stamp never jumps position between renders or page turns. */
function scatter(id: string) {
  const hash = hashString(`${id}-slot`);
  return {
    x: (hash % 13) - 6,
    y: ((hash >> 4) % 11) - 5,
    rotate: ((hash >> 8) % 9) - 4,
  };
}

export function StampSlot({ entry }: { entry: PassportEntry }) {
  const { trip, visits } = entry;
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState(trip.id);

  const activeTrip = visits.find((visit) => visit.id === activeId) ?? trip;
  const offset = scatter(trip.id);
  const dateLabel = formatDateRange(trip);

  const openModal = () => {
    // Reopen on this stamp's own visit, not wherever the switcher was left.
    setActiveId(trip.id);
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-haspopup="dialog"
        aria-label={`${trip.destination}${dateLabel ? `, ${dateLabel}` : ''}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotate}deg)` }}
        className="group flex flex-col items-center justify-center gap-1 rounded p-1 transition-transform duration-150 hover:z-10 focus-visible:z-10"
      >
        <PassportStamp trip={trip} size="md" />
        <span className="max-w-[8rem] truncate font-mono text-[9px] uppercase tracking-wide text-slate/50 group-hover:text-slate/80">
          {stampDate(trip) ?? trip.destination}
        </span>
      </button>

      <TripDetailModal
        trip={activeTrip}
        visits={visits}
        onSelectVisit={(visit) => setActiveId(visit.id)}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
