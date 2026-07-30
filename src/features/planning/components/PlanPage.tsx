import { useMemo } from 'react';
import { Reorder } from 'framer-motion';
import { Compass } from 'lucide-react';
import { HOME_LOCATION, useTrips } from '../../../services/notionAdapter';
import { haversineMiles } from '../../../utils/geo';
import { useBucketListPlan } from '../hooks/useBucketListPlan';
import { BucketListPlanCard } from './BucketListPlanCard';
import { NextAdventurePicker } from './NextAdventurePicker';
import type { Trip } from '../../../types/travel';

export function PlanPage() {
  const { data: trips, isLoading, isError } = useTrips();

  const bucketList = useMemo(() => (trips ?? []).filter((t) => t.status === 'Bucket List'), [trips]);
  const bucketListIds = useMemo(() => bucketList.map((t) => t.id), [bucketList]);
  const tripsById = useMemo(() => new Map(bucketList.map((t) => [t.id, t])), [bucketList]);

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    for (const trip of bucketList) {
      if (trip.location?.latitude != null && trip.location?.longitude != null) {
        map.set(trip.id, haversineMiles(HOME_LOCATION, { lat: trip.location.latitude, lng: trip.location.longitude }));
      }
    }
    return map;
  }, [bucketList]);

  const { orderedIds, timeframes, reorder, setTimeframe } = useBucketListPlan(bucketListIds);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse border border-slate/10 bg-slate/5" />
        ))}
      </div>
    );
  }

  if (isError || !trips) {
    return (
      <div className="border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
        Couldn't load your Bucket List.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-dashed border-slate/20 pb-5">
        <h2 className="font-display text-lg font-semibold text-ink">Plan</h2>
        <p className="font-mono text-xs text-slate/60">
          {bucketList.length} bucket-list {bucketList.length === 1 ? 'trip' : 'trips'} — drag to rank, tag a timeframe
        </p>
        <p className="text-xs text-slate/50">
          This ranking is saved in this browser only — Notion has no field for it, so it never syncs back.
        </p>
      </div>

      {bucketList.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50">
          <Compass size={28} />
          <p className="font-display text-lg text-slate/70">No Bucket List trips yet</p>
          <p className="text-sm">Mark a trip "Bucket List" in Notion to plan it here.</p>
        </div>
      ) : (
        <>
          <NextAdventurePicker trips={bucketList} distances={distances} />

          <Reorder.Group axis="y" values={orderedIds} onReorder={reorder} className="flex flex-col gap-2">
            {orderedIds.map((id, index) => {
              const trip = tripsById.get(id) as Trip;

              return (
                <BucketListPlanCard
                  key={id}
                  trip={trip}
                  rank={index + 1}
                  distanceMiles={distances.get(id) ?? null}
                  timeframe={timeframes[id] ?? 'Someday'}
                  onTimeframeChange={(timeframe) => setTimeframe(id, timeframe)}
                />
              );
            })}
          </Reorder.Group>
        </>
      )}
    </section>
  );
}
