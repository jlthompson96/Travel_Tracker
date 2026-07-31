import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass } from 'lucide-react';
import type { UseFilteredTrips } from '../../trips/hooks/useFilteredTrips';
import { FilterPills } from '../../trips/components/FilterPills';
import { SortControl } from '../../trips/components/SortControl';
import { TripCard } from '../../trips/components/TripCard';
import { TravelMap } from './TravelMap';

type MapPageProps = UseFilteredTrips;

export function MapPage({
  filteredTrips,
  isLoading,
  isError,
  filters,
  setFilters,
  sort,
  setSort,
  availableCountries,
  availableTripTypes,
}: MapPageProps) {
  const locatedTrips = useMemo(
    () => filteredTrips.filter((trip) => trip.location?.latitude != null && trip.location?.longitude != null),
    [filteredTrips],
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-dashed border-slate/20 pb-5">
        <h2 className="font-display text-lg font-semibold text-ink">Map</h2>
        {!isLoading && !isError && (
          <p className="font-mono text-xs text-slate/60">
            {locatedTrips.length} pinned {locatedTrips.length === 1 ? 'location' : 'locations'}
          </p>
        )}
      </div>

      <FilterPills
        filters={filters}
        onChange={setFilters}
        availableCountries={availableCountries}
        availableTripTypes={availableTripTypes}
      />

      <SortControl sort={sort} onChange={setSort} />

      <TravelMap data={filteredTrips} isLoading={isLoading} isError={isError} filters={filters} height={560} />

      {isError && (
        <div className="rounded border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
          Couldn't load your Travel Tracker.
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isLoading && !isError && locatedTrips.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50"
          >
            <Compass size={28} />
            <p className="font-display text-lg text-slate/70">No pinned locations match these filters</p>
            <p className="text-sm">Try clearing a filter or search term.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && !isError && locatedTrips.length > 0 && (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {locatedTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: 'easeOut' }}
              >
                <TripCard trips={[trip]} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
