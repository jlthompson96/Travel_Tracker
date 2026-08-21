import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Route } from 'lucide-react';
import { clusterTrips, DEFAULT_CLUSTER_RADIUS_MILES } from '../utils/clusterTrips';
import type { Trip } from '../../../types/travel';

/**
 * Bucket-list entries are one-per-destination, so a region you want to see
 * shows up as four separate rows that each look like a separate vacation.
 * This points out the ones that are actually a single trip.
 */
export function TripClusters({ trips }: { trips: Trip[] }) {
  const clusters = useMemo(() => clusterTrips(trips), [trips]);

  if (clusters.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
        <Route size={13} className="text-brass" /> Trips you could combine
      </h3>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {clusters.map((cluster, i) => (
          <motion.div
            key={cluster.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex flex-col gap-1.5 border border-brass/40 bg-brass/5 p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-sm font-semibold text-ink">
                {cluster.trips.length} stops
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
                {cluster.spanMiles} mi apart
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {cluster.trips.map((trip) => (
                <span
                  key={trip.id}
                  className="rounded-full bg-ink-navy/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/70 max-sm:text-ink"
                >
                  {trip.destination}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="font-mono text-[10px] text-slate/50 max-sm:text-slate/80">
        Grouped when each stop is within {DEFAULT_CLUSTER_RADIUS_MILES} miles of another in the group.
      </p>
    </div>
  );
}
