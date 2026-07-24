import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Compass, MapPin } from 'lucide-react';
import type { UseFilteredTrips } from '../../trips/hooks/useFilteredTrips';
import { FilterPills } from '../../trips/components/FilterPills';
import { TripDetailModal } from '../../trips/components/TripDetails/TripDetailModal';
import { formatDateRange } from '../../trips/utils/formatTrip';
import type { Trip } from '../../../types/travel';

type TimelinePageProps = UseFilteredTrips;

const PRIORITY_DOT: Record<string, string> = {
  High: 'bg-stamp-red',
  Medium: 'bg-brass',
  Low: 'bg-slate/40',
};

interface YearGroup {
  year: string;
  trips: Trip[];
}

export function TimelinePage({
  filteredTrips,
  isLoading,
  isError,
  filters,
  setFilters,
  availableCountries,
  availableTripTypes,
}: TimelinePageProps) {
  const dated = useMemo(() => sortByDate(filteredTrips), [filteredTrips]);
  const groups = useMemo(() => groupByYear(dated), [dated]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-dashed border-slate/20 pb-5">
        <h2 className="font-display text-lg font-semibold text-ink-navy">Timeline</h2>
        {!isLoading && !isError && (
          <p className="font-mono text-xs text-slate/60">
            {dated.length} dated {dated.length === 1 ? 'trip' : 'trips'} across {groups.length}{' '}
            {groups.length === 1 ? 'year' : 'years'}
          </p>
        )}
      </div>

      <FilterPills
        filters={filters}
        onChange={setFilters}
        availableCountries={availableCountries}
        availableTripTypes={availableTripTypes}
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse border border-slate/10 bg-slate/5" />
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
          Couldn't load the timeline.
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isLoading && !isError && dated.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50"
          >
            <Compass size={28} />
            <p className="font-display text-lg text-slate/70">No dated trips match these filters</p>
            <p className="text-sm">Try clearing a filter, or add a Date Visited in Notion.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && !isError && groups.length > 0 && (
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <YearSection key={group.year} group={group} />
          ))}
        </div>
      )}
    </section>
  );
}

function YearSection({ group }: { group: YearGroup }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl font-semibold text-ink-navy">{group.year}</span>
        <span className="h-px flex-1 bg-slate/15" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate/50">
          {group.trips.length} {group.trips.length === 1 ? 'trip' : 'trips'}
        </span>
      </div>

      <ol className="relative flex flex-col gap-5 border-l-2 border-dashed border-slate/20 pl-6">
        {group.trips.map((trip, index) => (
          <TimelineEntry key={trip.id} trip={trip} index={index} />
        ))}
      </ol>
    </div>
  );
}

function TimelineEntry({ trip, index }: { trip: Trip; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const dateLabel = formatDateRange(trip);
  const thumbnail = trip.photos[0];

  return (
    <>
      <motion.li
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className="group relative flex cursor-pointer flex-col gap-2 rounded border border-transparent p-2 -m-2 transition-colors duration-150 hover:border-slate/15 hover:bg-white/60 sm:flex-row sm:items-start sm:gap-4"
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.05 }}
      >
        <motion.span
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: Math.min(index, 6) * 0.05 }}
          className={`absolute -left-[33px] top-3 h-3 w-3 rounded-full border-2 border-paper ${
            trip.status === 'Bucket List' ? 'bg-horizon-teal' : 'bg-brass'
          }`}
        />

        {thumbnail && (
          <div className="h-20 w-full shrink-0 overflow-hidden rounded border border-slate/15 sm:h-16 sm:w-24">
            <img
              src={thumbnail.url}
              alt={thumbnail.name || `${trip.destination} photo`}
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="font-display text-base font-semibold text-ink-navy">{trip.destination}</p>
            {dateLabel && (
              <p className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">
                <CalendarDays size={12} className="text-brass" />
                {dateLabel}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate/70">
            {trip.country && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-brass" />
                {trip.country}
              </span>
            )}
            {trip.ratingStars && (
              <span aria-label={`${trip.ratingStars} of 5 stars`} className="text-brass">
                {'★'.repeat(trip.ratingStars)}
              </span>
            )}
            {trip.priority && (
              <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[trip.priority]}`} />
                {trip.priority}
              </span>
            )}
          </div>

          {trip.tripTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {trip.tripTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-ink-navy/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-navy/70"
                >
                  {type}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.li>
      <TripDetailModal trip={trip} open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

function sortByDate(trips: Trip[]): Trip[] {
  return trips
    .filter((t) => t.dateVisited?.start)
    .sort((a, b) => (a.dateVisited!.start! < b.dateVisited!.start! ? -1 : 1));
}

function groupByYear(trips: Trip[]): YearGroup[] {
  const map = new Map<string, Trip[]>();
  for (const trip of trips) {
    const year = new Date(trip.dateVisited!.start!).getFullYear().toString();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(trip);
  }
  return Array.from(map.entries())
    .map(([year, yearTrips]) => ({ year, trips: yearTrips }))
    .sort((a, b) => Number(a.year) - Number(b.year));
}
