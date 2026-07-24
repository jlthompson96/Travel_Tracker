import { AnimatePresence, motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import type { UseFilteredTrips } from '../hooks/useFilteredTrips';
import { SearchBar } from './SearchBar';
import { FilterPills } from './FilterPills';
import { TripCard } from './TripCard';

type TripDashboardProps = UseFilteredTrips;

export function TripDashboard({
  filteredTrips,
  isLoading,
  isError,
  error,
  search,
  setSearch,
  filters,
  setFilters,
  availableCountries,
  availableTripTypes,
}: TripDashboardProps) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 border-b border-dashed border-slate/20 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-navy">All Trips</h2>
          {!isLoading && !isError && (
            <p className="mt-0.5 font-mono text-xs text-slate/60">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'} shown
            </p>
          )}
        </div>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <FilterPills
        filters={filters}
        onChange={setFilters}
        availableCountries={availableCountries}
        availableTripTypes={availableTripTypes}
      />

      {isLoading && <SkeletonGrid />}

      {isError && (
        <div className="rounded border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
          Couldn't load your Travel Tracker: {error instanceof Error ? error.message : 'unknown error'}.
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isLoading && !isError && filteredTrips.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50"
          >
            <motion.div
              animate={{ rotate: [0, -12, 12, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.5 }}
            >
              <Compass size={28} />
            </motion.div>
            <p className="font-display text-lg text-slate/70">No trips match these filters</p>
            <p className="text-sm">Try clearing a filter or search term.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && !isError && filteredTrips.length > 0 && (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: 'easeOut' }}
              >
                <TripCard trip={trip} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded border border-slate/10 bg-slate/5" />
      ))}
    </div>
  );
}
