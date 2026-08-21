import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HorizontalBarChart, VerticalBarChart } from './charts';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Footprints, Globe2, Home, Milestone, Route } from 'lucide-react';
import { computeTripStats, HOME_LOCATION, useTrips } from '../../../services/notionAdapter';
import { haversineMiles } from '../../../utils/geo';
import { ALL_REGIONS, regionForCountry, type Region } from '../../../utils/regions';
import { homeIcon, stampIcon } from '../../map/utils/mapIcons';
import { MapTouchGate } from '../../map/components/MapTouchGate';
import type { Country, Trip } from '../../../types/travel';

const EARTH_CIRCUMFERENCE_MILES = 24_901;

interface Destination {
  key: string;
  lat: number;
  lng: number;
  destination: string;
  country: string | null;
  oneWayMiles: number;
  visits: number;
}

function hasCoordinates(trip: Trip): trip is Trip & { location: NonNullable<Trip['location']> } {
  return trip.location?.latitude != null && trip.location?.longitude != null;
}

function groupDestinations(trips: Array<Trip & { location: NonNullable<Trip['location']> }>): Destination[] {
  const groups = new Map<string, Destination>();
  for (const trip of trips) {
    const lat = trip.location.latitude!;
    const lng = trip.location.longitude!;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.visits += 1;
      continue;
    }
    groups.set(key, {
      key,
      lat,
      lng,
      destination: trip.destination,
      country: trip.country,
      oneWayMiles: haversineMiles(HOME_LOCATION, { lat, lng }),
      visits: 1,
    });
  }
  return Array.from(groups.values());
}

export function MilesPage() {
  const { data: trips, isLoading, isError } = useTrips();

  const beenThere = useMemo(() => (trips ?? []).filter((t) => t.status === 'Been There' && hasCoordinates(t)), [trips]) as Array<
    Trip & { location: NonNullable<Trip['location']> }
  >;
  const destinations = useMemo(() => groupDestinations(beenThere), [beenThere]);
  const stats = useMemo(() => (trips ? computeTripStats(trips) : null), [trips]);

  const milesByYear = useMemo(() => {
    const byYear = new Map<string, number>();
    for (const trip of beenThere) {
      if (!trip.dateVisited?.start) continue;
      const year = trip.dateVisited.start.slice(0, 4);
      const roundTrip = 2 * haversineMiles(HOME_LOCATION, { lat: trip.location.latitude!, lng: trip.location.longitude! });
      byYear.set(year, (byYear.get(year) ?? 0) + roundTrip);
    }
    return Array.from(byYear.entries())
      .map(([year, miles]) => ({ year, miles: Math.round(miles) }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [beenThere]);

  const farthestFirst = useMemo(() => [...destinations].sort((a, b) => b.oneWayMiles - a.oneWayMiles), [destinations]);
  const farthest = farthestFirst[0];
  const closest = farthestFirst[farthestFirst.length - 1];

  const visitedCountries = useMemo(
    () => Array.from(new Set(beenThere.map((t) => t.country).filter((c): c is Country => !!c))),
    [beenThere],
  );

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
        Couldn't load your travel distance data.
      </div>
    );
  }

  const totalMiles = stats.milesTraveled;
  const earthRatio = totalMiles / EARTH_CIRCUMFERENCE_MILES;
  const earthBlurb =
    earthRatio >= 1 ? `${earthRatio.toFixed(1)}× around the Earth` : `${Math.round(earthRatio * 100)}% of the way around the Earth`;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 border-b border-dashed border-slate/20 pb-5">
        <h2 className="font-display text-lg font-semibold text-ink">Miles Traveled</h2>
        <p className="font-mono text-xs text-slate/60 max-sm:text-slate/80">
          Round-trip distance from Fort Mill, SC to every "Been There" destination
        </p>
      </div>

      {destinations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50 max-sm:text-slate/80">
          <Compass size={28} />
          <p className="font-display text-lg text-slate/70">No "Been There" trips with a Location yet</p>
          <p className="text-sm">Mark a trip visited and pin its Location in Notion to see it here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col justify-center gap-1 border border-slate/15 bg-surface/50 p-5 shadow-sm sm:col-span-1"
            >
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
                <Route size={14} /> Total miles traveled
              </div>
              <p className="font-display text-4xl font-semibold text-ink">{totalMiles.toLocaleString()}</p>
              <p className="font-mono text-[11px] text-slate/60 max-sm:text-slate/80">{earthBlurb}</p>
            </motion.div>

            {farthest && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 }}
                className="flex flex-col justify-center gap-1 border border-slate/15 bg-surface/50 p-5 shadow-sm"
              >
                <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
                  <Milestone size={14} /> Farthest trip
                </div>
                <p className="font-display text-xl font-semibold leading-snug text-ink">{farthest.destination}</p>
                <p className="font-mono text-[11px] text-slate/60 max-sm:text-slate/80">{Math.round(farthest.oneWayMiles).toLocaleString()} mi one-way</p>
              </motion.div>
            )}

            {closest && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 }}
                className="flex flex-col justify-center gap-1 border border-slate/15 bg-surface/50 p-5 shadow-sm"
              >
                <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
                  <Footprints size={14} /> Closest trip
                </div>
                <p className="font-display text-xl font-semibold leading-snug text-ink">{closest.destination}</p>
                <p className="font-mono text-[11px] text-slate/60 max-sm:text-slate/80">{Math.round(closest.oneWayMiles).toLocaleString()} mi one-way</p>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
              <Home size={13} /> Routes from home
            </h3>
            <div className="h-[480px] overflow-hidden rounded border border-slate/15 shadow-sm max-sm:h-[min(60svh,360px)]">
              <RouteMap home={HOME_LOCATION} destinations={destinations} />
            </div>
          </div>

          {milesByYear.length >= 2 && (
            <VerticalBarChart
              heading="Miles by year"
              data={milesByYear.map((d) => ({
                key: d.year,
                label: d.year,
                value: d.miles,
                valueLabel: d.miles.toLocaleString(),
              }))}
            />
          )}

          {farthestFirst.length >= 2 && (
            <HorizontalBarChart
              heading="Farthest destinations (one-way)"
              data={farthestFirst.slice(0, 8).map((d) => ({
                key: d.key,
                label: d.destination,
                value: d.oneWayMiles,
                valueLabel: `${Math.round(d.oneWayMiles).toLocaleString()} mi`,
              }))}
            />
          )}

          <WorldCoverage visitedCountries={visitedCountries} />
        </>
      )}
    </section>
  );
}

function RouteMap({ home, destinations }: { home: { lat: number; lng: number }; destinations: Destination[] }) {
  return (
    <MapContainer center={[home.lat, home.lng]} zoom={3} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitRoutes home={home} destinations={destinations} />
      <MapTouchGate />

      {destinations.map((d) => (
        <Polyline
          key={d.key}
          positions={[
            [home.lat, home.lng],
            [d.lat, d.lng],
          ]}
          pathOptions={{ color: '#B98B3E', weight: 2.5, opacity: 0.75, dashArray: '1 6', lineCap: 'round' }}
        />
      ))}

      {destinations.map((d) => (
        <Marker
          key={d.key}
          position={[d.lat, d.lng]}
          icon={stampIcon('Been There', d.visits)}
          title={`${d.destination} — ${Math.round(d.oneWayMiles).toLocaleString()} mi one-way`}
        >
          <LeafletTooltip direction="top" offset={[0, -8]}>
            <span className="font-body">
              {d.destination} · {Math.round(d.oneWayMiles).toLocaleString()} mi
              {d.visits > 1 ? ` · ${d.visits} visits` : ''}
            </span>
          </LeafletTooltip>
        </Marker>
      ))}

      <Marker position={[home.lat, home.lng]} icon={homeIcon()} title="Home — Fort Mill, SC">
        <LeafletTooltip direction="top" offset={[0, -8]}>
          <span className="font-body">Home · Fort Mill, SC</span>
        </LeafletTooltip>
      </Marker>
    </MapContainer>
  );
}

function FitRoutes({ home, destinations }: { home: { lat: number; lng: number }; destinations: Destination[] }) {
  const map = useMap();

  // An effect rather than a call in render — see MapViewportController in
  // TravelMap.tsx for why fitting bounds during render fights the user's pan.
  const points = useMemo<[number, number][]>(
    () => (destinations.length > 0 ? [[home.lat, home.lng], ...destinations.map((d): [number, number] => [d.lat, d.lng])] : []),
    [home.lat, home.lng, destinations],
  );

  useEffect(() => {
    if (points.length > 0) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

function WorldCoverage({ visitedCountries }: { visitedCountries: Country[] }) {
  const byRegion = useMemo(() => {
    const map = new Map<Region, Country[]>();
    for (const region of ALL_REGIONS) map.set(region, []);
    for (const country of visitedCountries) {
      const region = regionForCountry(country);
      if (region) map.get(region)!.push(country);
    }
    return map;
  }, [visitedCountries]);

  const continentsVisited = ALL_REGIONS.filter((region) => (byRegion.get(region)?.length ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
        <Globe2 size={13} /> World coverage
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col justify-center gap-1 border border-slate/15 bg-surface/50 p-5 shadow-sm"
        >
          <p className="font-display text-4xl font-semibold text-ink">
            {continentsVisited}
            <span className="text-lg text-slate/40 max-sm:text-slate/80"> / {ALL_REGIONS.length}</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">Continents visited</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="flex flex-col justify-center gap-1 border border-slate/15 bg-surface/50 p-5 shadow-sm"
        >
          <p className="font-display text-4xl font-semibold text-ink">{visitedCountries.length}</p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">Countries &amp; regions visited</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_REGIONS.map((region, index) => {
          const countries = byRegion.get(region) ?? [];
          const visited = countries.length > 0;

          return (
            <motion.div
              key={region}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className={`flex flex-col gap-1.5 border p-3 ${visited ? 'border-brass/40 bg-brass/5' : 'border-slate/15 bg-surface/40'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-ink">{region}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${visited ? 'bg-brass' : 'bg-slate/20'}`} />
              </div>
              {visited ? (
                <div className="flex flex-wrap gap-1">
                  {countries.map((country) => (
                    <span
                      key={country}
                      className="rounded-full bg-ink-navy/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/70 max-sm:text-ink"
                    >
                      {country}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate/40 max-sm:text-slate/80">Not yet</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
