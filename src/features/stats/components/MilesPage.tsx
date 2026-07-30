import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Footprints, Home, Milestone, Route } from 'lucide-react';
import { computeTripStats, HOME_LOCATION, useTrips } from '../../../services/notionAdapter';
import { haversineMiles } from '../../../utils/geo';
import { homeIcon, stampIcon } from '../../map/utils/mapIcons';
import type { Trip } from '../../../types/travel';

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
        <h2 className="font-display text-lg font-semibold text-ink-navy">Miles Traveled</h2>
        <p className="font-mono text-xs text-slate/60">
          Round-trip distance from Fort Mill, SC to every "Been There" destination
        </p>
      </div>

      {destinations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded border border-dashed border-slate/20 py-16 text-center text-slate/50">
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
              className="flex flex-col justify-center gap-1 border border-slate/15 bg-white/50 p-5 shadow-sm sm:col-span-1"
            >
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60">
                <Route size={14} /> Total miles traveled
              </div>
              <p className="font-display text-4xl font-semibold text-ink-navy">{totalMiles.toLocaleString()}</p>
              <p className="font-mono text-[11px] text-slate/60">{earthBlurb}</p>
            </motion.div>

            {farthest && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 }}
                className="flex flex-col justify-center gap-1 border border-slate/15 bg-white/50 p-5 shadow-sm"
              >
                <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60">
                  <Milestone size={14} /> Farthest trip
                </div>
                <p className="font-display text-xl font-semibold leading-snug text-ink-navy">{farthest.destination}</p>
                <p className="font-mono text-[11px] text-slate/60">{Math.round(farthest.oneWayMiles).toLocaleString()} mi one-way</p>
              </motion.div>
            )}

            {closest && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 }}
                className="flex flex-col justify-center gap-1 border border-slate/15 bg-white/50 p-5 shadow-sm"
              >
                <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60">
                  <Footprints size={14} /> Closest trip
                </div>
                <p className="font-display text-xl font-semibold leading-snug text-ink-navy">{closest.destination}</p>
                <p className="font-mono text-[11px] text-slate/60">{Math.round(closest.oneWayMiles).toLocaleString()} mi one-way</p>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/50">
              <Home size={13} /> Routes from home
            </h3>
            <div className="overflow-hidden rounded border border-slate/15 shadow-sm" style={{ height: 480 }}>
              <RouteMap home={HOME_LOCATION} destinations={destinations} />
            </div>
          </div>

          {milesByYear.length >= 2 && <MilesByYearChart data={milesByYear} />}

          {farthestFirst.length >= 2 && <FarthestDestinationsChart destinations={farthestFirst.slice(0, 8)} />}
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
        <Marker key={d.key} position={[d.lat, d.lng]} icon={stampIcon('Been There', d.visits)}>
          <LeafletTooltip direction="top" offset={[0, -8]}>
            <span className="font-body">
              {d.destination} · {Math.round(d.oneWayMiles).toLocaleString()} mi
              {d.visits > 1 ? ` · ${d.visits} visits` : ''}
            </span>
          </LeafletTooltip>
        </Marker>
      ))}

      <Marker position={[home.lat, home.lng]} icon={homeIcon()}>
        <LeafletTooltip direction="top" offset={[0, -8]}>
          <span className="font-body">Home · Fort Mill, SC</span>
        </LeafletTooltip>
      </Marker>
    </MapContainer>
  );
}

function FitRoutes({ home, destinations }: { home: { lat: number; lng: number }; destinations: Destination[] }) {
  const map = useMap();

  if (destinations.length > 0) {
    const points: [number, number][] = [[home.lat, home.lng], ...destinations.map((d): [number, number] => [d.lat, d.lng])];
    map.fitBounds(points, { padding: [30, 30] });
  }

  return null;
}

function MilesByYearChart({ data }: { data: Array<{ year: string; miles: number }> }) {
  const max = Math.max(...data.map((d) => d.miles));
  const chartHeight = 140;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-[11px] uppercase tracking-wide text-slate/50">Miles by year</h3>
      <div className="flex items-end gap-6 border-b border-slate/15 px-2 pb-0" style={{ height: chartHeight + 44 }}>
        {data.map((d, i) => (
          <YearBar key={d.year} year={d.year} miles={d.miles} max={max} chartHeight={chartHeight} index={i} />
        ))}
      </div>
    </div>
  );
}

function YearBar({
  year,
  miles,
  max,
  chartHeight,
  index,
}: {
  year: string;
  miles: number;
  max: number;
  chartHeight: number;
  index: number;
}) {
  const [hover, setHover] = useState(false);
  const barHeight = max > 0 ? Math.max((miles / max) * chartHeight, 3) : 0;

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <p className="font-mono text-[11px] text-ink-navy">{miles.toLocaleString()}</p>
      <motion.div
        title={`${year}: ${miles.toLocaleString()} mi`}
        initial={{ height: 0 }}
        animate={{ height: barHeight }}
        transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
        style={{ width: 28 }}
        className={`rounded-t transition-colors duration-150 ${hover ? 'bg-brass' : 'bg-brass/80'}`}
      />
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate/60">{year}</p>
    </div>
  );
}

function FarthestDestinationsChart({ destinations }: { destinations: Destination[] }) {
  const max = Math.max(...destinations.map((d) => d.oneWayMiles));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-[11px] uppercase tracking-wide text-slate/50">Farthest destinations (one-way)</h3>
      <div className="flex flex-col gap-2.5">
        {destinations.map((d, i) => (
          <DestinationBar key={d.key} destination={d} max={max} index={i} />
        ))}
      </div>
    </div>
  );
}

function DestinationBar({ destination, max, index }: { destination: Destination; max: number; index: number }) {
  const [hover, setHover] = useState(false);
  const widthPct = max > 0 ? Math.max((destination.oneWayMiles / max) * 100, 3) : 0;

  return (
    <div
      className="flex items-center gap-3"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      title={`${destination.destination}: ${Math.round(destination.oneWayMiles).toLocaleString()} mi one-way`}
    >
      <p className="w-36 shrink-0 truncate text-right text-xs text-slate/70 sm:w-48">{destination.destination}</p>
      <div className="h-4 flex-1">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.5, delay: index * 0.06, ease: 'easeOut' }}
          className={`h-full rounded-r transition-colors duration-150 ${hover ? 'bg-brass' : 'bg-brass/80'}`}
        />
      </div>
      <p className="w-16 shrink-0 font-mono text-[11px] text-ink-navy">{Math.round(destination.oneWayMiles).toLocaleString()} mi</p>
    </div>
  );
}
