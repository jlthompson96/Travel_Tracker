import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, Compass, Layers, MapPinned, Plane, Sparkles, Star } from 'lucide-react';
import { computeTripStats, useTrips } from '../../../services/notionAdapter';
import { ALL_REGIONS, regionForCountry } from '../../../utils/regions';
import { HorizontalBarChart, StatTile, VerticalBarChart } from './charts';
import type { RatingStars, Trip } from '../../../types/travel';

/**
 * computeTripStats() has always returned byYear, byTripType, byRating and
 * countriesOnBucketList, and until now only byCountry ever reached the screen.
 * This tab renders the rest — no new data fetching, no new derivation, just the
 * numbers the app was already computing on every load and discarding.
 */
export function InsightsPage() {
  const { data: trips, isLoading, isError } = useTrips();

  const stats = useMemo(() => (trips ? computeTripStats(trips) : null), [trips]);

  const tripsByYear = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byYear)
      .map(([year, count]) => ({ key: year, label: year, value: count, valueLabel: String(count) }))
      .sort((a, b) => Number(a.key) - Number(b.key));
  }, [stats]);

  const tripTypes = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byTripType)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ key: type, label: type, value: count, valueLabel: String(count) }));
  }, [stats]);

  // Note: stats.byCountry counts every trip regardless of status, so this is
  // "where your list points", not "where you've been" — the heading says so.
  // With 46 of 62 trips still on the bucket list, a visited-only chart would be
  // a single bar.
  const topCountries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byCountry)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([country, count]) => ({ key: country, label: country, value: count, valueLabel: String(count) }));
  }, [stats]);

  /** Countries that exist only on the bucket list — nowhere else in the app says this. */
  const unreachedCountries = useMemo(() => {
    if (!trips) return [];
    const visited = new Set(trips.filter((t) => t.status === 'Been There').map((t) => t.country).filter(Boolean));
    const wanted = new Set(trips.filter((t) => t.status === 'Bucket List').map((t) => t.country).filter(Boolean));
    return [...wanted].filter((c) => !visited.has(c)).sort() as string[];
  }, [trips]);

  const continentsWanted = useMemo(() => {
    if (!trips) return [];
    const visited = new Set(
      trips.filter((t) => t.status === 'Been There').map((t) => regionForCountry(t.country)).filter(Boolean),
    );
    return ALL_REGIONS.filter((r) => !visited.has(r));
  }, [trips]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-32 animate-pulse border border-slate/10 bg-slate/5" />
        <div className="h-96 animate-pulse border border-slate/10 bg-slate/5" />
      </div>
    );
  }

  if (isError || !trips || !stats) {
    return (
      <div className="border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
        Couldn't load your travel insights.
      </div>
    );
  }

  const totalTrips = stats.totalBeenThere + stats.totalBucketList;
  const visitedShare = totalTrips > 0 ? Math.round((stats.totalBeenThere / totalTrips) * 100) : 0;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 border-b border-dashed border-slate/20 pb-5">
        <h2 className="font-display text-lg font-semibold text-ink">Insights</h2>
        <p className="font-mono text-xs text-slate/60 max-sm:text-slate/80">
          Patterns across every trip you've logged and every one you still want
        </p>
      </div>

      {totalTrips === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              icon={<Plane size={14} />}
              label="Trips logged"
              value={stats.totalBeenThere}
              sub={`${visitedShare}% of everything on your list`}
            />
            <StatTile
              icon={<Compass size={14} />}
              label="Still on the list"
              value={stats.totalBucketList}
              sub={`across ${stats.countriesOnBucketList} countries`}
              delay={0.06}
            />
            <StatTile
              icon={<MapPinned size={14} />}
              label="Countries visited"
              value={stats.countriesVisited}
              sub={
                unreachedCountries.length > 0
                  ? `${unreachedCountries.length} more waiting`
                  : "you've been everywhere on your list"
              }
              delay={0.12}
            />
          </div>

          {tripsByYear.length >= 2 && (
            <VerticalBarChart
              heading={
                <>
                  <CalendarRange size={13} className="text-brass" /> Trips by year
                </>
              }
              data={tripsByYear}
            />
          )}

          {tripTypes.length > 0 && (
            <HorizontalBarChart
              heading={
                <>
                  <Layers size={13} className="text-brass" /> What kind of trips you take
                </>
              }
              data={tripTypes}
            />
          )}

          {topCountries.length > 0 && (
            <HorizontalBarChart
              heading={
                <>
                  <MapPinned size={13} className="text-brass" /> Trips by country (visited and wishlist)
                </>
              }
              data={topCountries}
            />
          )}

          <RatingBreakdown byRating={stats.byRating} totalBeenThere={stats.totalBeenThere} />

          {unreachedCountries.length > 0 && (
            <UnreachedCountries countries={unreachedCountries} continents={continentsWanted} />
          )}

          <UndatedNotice trips={trips} />
        </>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50 max-sm:text-slate/80">
      <Compass size={28} />
      <p className="font-display text-lg text-slate/70">Nothing to chart yet</p>
      <p className="text-sm">Add a trip in Notion and its patterns will show up here.</p>
    </div>
  );
}

/**
 * computeTripStats has always returned byRating and nothing ever rendered it,
 * because with 1 of 62 trips rated the chart was a single bar. Now that trips
 * are rateable in the modal (see TripEditor), it earns its place — and when
 * ratings are still sparse it says so rather than drawing a misleading chart.
 */
function RatingBreakdown({
  byRating,
  totalBeenThere,
}: {
  byRating: Record<RatingStars, number>;
  totalBeenThere: number;
}) {
  const rated = Object.values(byRating).reduce((sum, n) => sum + n, 0);

  if (rated === 0) {
    return (
      <p className="border-l-2 border-slate/20 pl-3 text-xs text-slate/60 max-sm:text-slate/80">
        None of your trips are rated yet. Open any trip and tap the stars to start — the breakdown appears here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
        <Star size={13} className="text-brass" /> How you rated them
      </h3>

      <HorizontalBarChart
        heading={<span className="sr-only">Trips by star rating</span>}
        data={([5, 4, 3, 2, 1] as RatingStars[]).map((stars) => ({
          key: String(stars),
          label: '★'.repeat(stars),
          value: byRating[stars] ?? 0,
          valueLabel: String(byRating[stars] ?? 0),
        }))}
      />

      {rated < totalBeenThere && (
        <p className="text-xs text-slate/60 max-sm:text-slate/80">
          {rated} of {totalBeenThere} visited trips rated so far.
        </p>
      )}
    </div>
  );
}

function UnreachedCountries({ countries, continents }: { countries: string[]; continents: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
        <Sparkles size={13} className="text-brass" /> Countries you want but haven't reached
      </h3>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-3 border border-brass/40 bg-brass/5 p-4"
      >
        <div className="flex flex-wrap gap-1.5">
          {countries.map((country) => (
            <span
              key={country}
              className="rounded-full bg-ink-navy/5 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink/70 max-sm:text-ink"
            >
              {country}
            </span>
          ))}
        </div>
        {continents.length > 0 && (
          <p className="font-mono text-[11px] text-slate/60 max-sm:text-slate/80">
            Continents still untouched: {continents.join(', ')}
          </p>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Trips with no Date Visited are invisible to the Timeline, the Passport's year
 * pages, and the by-year chart above. That's a data gap rather than a bug, so
 * say so plainly instead of silently charting a fraction of the trips.
 */
function UndatedNotice({ trips }: { trips: Trip[] }) {
  const beenThere = trips.filter((t) => t.status === 'Been There');
  const undated = beenThere.filter((t) => !t.dateVisited?.start);
  if (undated.length === 0) return null;

  return (
    <p className="border-l-2 border-slate/20 pl-3 text-xs text-slate/60 max-sm:text-slate/80">
      {undated.length} of {beenThere.length} visited trips have no date yet, so they're missing from the year chart,
      the Timeline, and the Passport's year pages.
    </p>
  );
}
