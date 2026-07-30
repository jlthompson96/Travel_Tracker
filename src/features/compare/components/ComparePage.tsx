import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { HOME_LOCATION, useTrips } from '../../../services/notionAdapter';
import { haversineMiles } from '../../../utils/geo';
import { formatDateRange } from '../../trips/utils/formatTrip';
import { PassportStamp } from '../../trips/components/PassportStamp';
import type { Trip } from '../../../types/travel';

const MAX_TRIPS = 3;

export function ComparePage() {
  const { data: trips, isLoading, isError } = useTrips();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const tripsById = useMemo(() => new Map((trips ?? []).map((t) => [t.id, t])), [trips]);
  const selected = selectedIds.map((id) => tripsById.get(id)).filter((t): t is Trip => !!t);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return (trips ?? [])
      .filter((t) => !selectedIds.includes(t.id) && t.destination.toLowerCase().includes(term))
      .slice(0, 8);
  }, [trips, search, selectedIds]);

  const addTrip = (id: string) => {
    if (selectedIds.length >= MAX_TRIPS) return;
    setSelectedIds((prev) => [...prev, id]);
    setSearch('');
  };

  const removeTrip = (id: string) => {
    setSelectedIds((prev) => prev.filter((tripId) => tripId !== id));
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse border border-slate/10 bg-slate/5" />;
  }

  if (isError || !trips) {
    return (
      <div className="border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
        Couldn't load trips to compare.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-dashed border-slate/20 pb-5">
        <h2 className="font-display text-lg font-semibold text-ink">Compare</h2>
        <p className="font-mono text-xs text-slate/60">Pick up to {MAX_TRIPS} trips to see them side by side</p>
      </div>

      <div className="flex flex-col gap-3">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((trip) => (
              <span
                key={trip.id}
                className="flex items-center gap-1.5 rounded-full border border-ink-navy bg-ink-navy px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-cream"
              >
                {trip.destination}
                <button type="button" onClick={() => removeTrip(trip.id)} aria-label={`Remove ${trip.destination}`}>
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {selected.length < MAX_TRIPS && (
          <div className="relative w-full max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a destination to add…"
              className="w-full rounded-full border border-slate/20 bg-surface/60 py-2 pl-9 pr-4 text-sm text-slate placeholder:text-slate/40 focus:border-brass"
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-slate/15 bg-paper shadow-lg">
                {results.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => addTrip(trip.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-navy/5"
                  >
                    <span>{trip.destination}</span>
                    {trip.country && <span className="text-xs text-slate/50">{trip.country}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selected.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50"
          >
            <p className="font-display text-lg text-slate/70">Search above to start comparing</p>
            <p className="text-sm">Good for weighing two or three Bucket List candidates against each other.</p>
          </motion.div>
        ) : (
          <ComparisonGrid trips={selected} />
        )}
      </AnimatePresence>
    </section>
  );
}

interface ComparisonRow {
  label: string;
  render: (trip: Trip, distanceMiles: number | null) => React.ReactNode;
}

const ROWS: ComparisonRow[] = [
  { label: 'Status', render: (trip) => trip.status ?? '—' },
  { label: 'Country', render: (trip) => trip.country ?? '—' },
  {
    label: 'Trip type',
    render: (trip) =>
      trip.tripTypes.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {trip.tripTypes.map((type) => (
            <span key={type} className="rounded-full bg-ink-navy/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/70">
              {type}
            </span>
          ))}
        </div>
      ) : (
        '—'
      ),
  },
  { label: 'Date visited', render: (trip) => formatDateRange(trip) ?? '—' },
  { label: 'Rating', render: (trip) => (trip.ratingStars ? '★'.repeat(trip.ratingStars) : '—') },
  { label: 'Priority', render: (trip) => trip.priority ?? '—' },
  {
    label: 'Distance from home',
    render: (_trip, distance) => (distance != null ? `${Math.round(distance).toLocaleString()} mi` : '—'),
  },
  { label: 'Notes', render: (trip) => trip.notes ?? '—' },
];

function ComparisonGrid({ trips }: { trips: Trip[] }) {
  const distanceFor = (trip: Trip): number | null =>
    trip.location?.latitude != null && trip.location?.longitude != null
      ? haversineMiles(HOME_LOCATION, { lat: trip.location.latitude, lng: trip.location.longitude })
      : null;

  return (
    <motion.div
      key="grid"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-x-auto"
    >
      <div className="grid min-w-[560px] gap-px overflow-hidden rounded border border-slate/15 bg-slate/15" style={gridStyle(trips.length)}>
        <div className="bg-paper p-3" />
        {trips.map((trip) => (
          <div key={trip.id} className="flex flex-col items-center gap-2 bg-surface/70 p-4 text-center">
            <PassportStamp trip={trip} size="sm" />
            <p className="font-display text-base font-semibold text-ink">{trip.destination}</p>
          </div>
        ))}

        {ROWS.map((row) => (
          <RowCells key={row.label} row={row} trips={trips} distanceFor={distanceFor} />
        ))}
      </div>
    </motion.div>
  );
}

function RowCells({
  row,
  trips,
  distanceFor,
}: {
  row: ComparisonRow;
  trips: Trip[];
  distanceFor: (trip: Trip) => number | null;
}) {
  return (
    <>
      <div className="bg-paper p-3 font-mono text-[11px] uppercase tracking-wide text-slate/50">{row.label}</div>
      {trips.map((trip) => (
        <div key={trip.id} className="bg-surface/70 p-3 text-center text-sm text-ink">
          {row.render(trip, distanceFor(trip))}
        </div>
      ))}
    </>
  );
}

function gridStyle(count: number): React.CSSProperties {
  return { gridTemplateColumns: `140px repeat(${count}, 1fr)` };
}
