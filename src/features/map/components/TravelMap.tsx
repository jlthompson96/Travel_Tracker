import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { UseFilteredTrips } from '../../trips/hooks/useFilteredTrips';
import type { MapRegion, Trip, TripStatus } from '../../../types/travel';
import { countryMatchesRegion } from '../../../utils/regions';
import { groupTripsByLocation } from '../../../utils/groupTrips';
import { stampIcon } from '../utils/mapIcons';
import { MapTouchGate } from './MapTouchGate';
import { TripDetailModal } from '../../trips/components/TripDetails/TripDetailModal';
import { formatDateRange } from '../../trips/utils/formatTrip';

function hasCoordinates(trip: Trip): trip is Trip & { location: NonNullable<Trip['location']> } {
  return trip.location?.latitude != null && trip.location?.longitude != null;
}

function dominantStatus(trips: Trip[]): TripStatus | null {
  if (trips.some((t) => t.status === 'Been There')) return 'Been There';
  if (trips.some((t) => t.status === 'Bucket List')) return 'Bucket List';
  return null;
}

const DEFAULT_CENTER: [number, number] = [20, 0];
const REGION_BOUNDS: Record<MapRegion, [[number, number], [number, number]]> = {
  Europe: [[35, -25], [70, 40]],
  'North America': [[7, -170], [83, -52]],
  'South America': [[-56, -82], [13, -34]],
  Asia: [[-10, 60], [80, 150]],
  Africa: [[-35, -20], [38, 55]],
  Oceania: [[-50, 110], [0, 180]],
};

type TravelMapProps = Pick<UseFilteredTrips, 'data' | 'isLoading' | 'isError' | 'filters'> & {
  /**
   * Map height, as a class rather than an inline style so it can carry
   * responsive variants — a fixed pixel height swallows a phone screen whole.
   * The default matches the compact dashboard-sidebar map.
   */
  heightClassName?: string;
};

export function TravelMap({
  data: trips,
  isLoading,
  isError,
  filters,
  heightClassName = 'h-[420px]',
}: TravelMapProps) {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openTripDetail = (trip: Trip) => {
    setSelectedTrip(trip);
    setModalOpen(true);
  };

  const located = (trips ?? []).filter(hasCoordinates).filter((trip) => {
    if (filters.status !== 'All' && trip.status !== filters.status) return false;
    if (filters.countries.length > 0 && (!trip.country || !filters.countries.includes(trip.country))) return false;
    if (filters.tripTypes.length > 0 && !filters.tripTypes.some((type) => trip.tripTypes.includes(type))) return false;
    if (filters.region !== 'All' && !countryMatchesRegion(trip.country, filters.region)) return false;
    return true;
  });

  const locationGroups = groupTripsByLocation(located);

  if (isLoading) {
    return <div className={`animate-pulse rounded border border-slate/10 bg-slate/5 ${heightClassName}`} />;
  }

  if (isError) {
    return (
      <div
        className={`flex items-center justify-center border border-stamp-red/30 bg-stamp-red/5 text-sm text-stamp-red ${heightClassName}`}
      >
        Couldn't load map data.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-3"
    >
      {located.length === 0 ? (
        <div
          className={`flex items-center justify-center border border-dashed border-slate/20 text-sm text-slate/50 ${heightClassName} max-sm:text-slate/80`}
        >
          No trips have a Location set yet.
        </div>
      ) : (
        <div className={`overflow-hidden rounded border border-slate/15 shadow-sm ${heightClassName}`}>
          <MapContainer center={DEFAULT_CENTER} zoom={2} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewportController filters={filters} located={located} />
            <MapTouchGate />
            {locationGroups.map((group) => (
              <Marker
                key={group.key}
                position={[group.primary.location.latitude!, group.primary.location.longitude!]}
                icon={stampIcon(dominantStatus(group.trips), group.trips.length)}
                // Leaflet gives every interactive marker role="button" and
                // tabindex=0; without a title they reach screen readers as
                // unnamed buttons.
                title={
                  group.trips.length === 1
                    ? group.trips[0].destination
                    : `${group.primary.destination} — ${group.trips.length} trips`
                }
              >
                <Popup>
                  {group.trips.length === 1 ? (
                    <div className="font-body">
                      <p className="font-semibold">{group.trips[0].destination}</p>
                      {group.trips[0].status && (
                        <p className="text-xs text-slate/60 max-sm:text-slate/80">{group.trips[0].status}</p>
                      )}
                    </div>
                  ) : (
                    <div className="font-body flex min-w-[180px] max-w-[60vw] flex-col gap-1 max-sm:min-w-[150px]">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">
                        {group.trips.length} trips here
                      </p>
                      {group.trips.map((trip) => (
                        <button
                          key={trip.id}
                          type="button"
                          onClick={() => openTripDetail(trip)}
                          className="flex flex-col items-start rounded px-1.5 py-1 text-left transition-colors hover:bg-ink-navy/5"
                        >
                          <span className="font-semibold">{trip.destination}</span>
                          <span className="text-xs text-slate/60 max-sm:text-slate/80">
                            {formatDateRange(trip) ?? trip.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {selectedTrip && (
        <TripDetailModal trip={selectedTrip} open={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </motion.div>
  );
}

function MapViewportController({ filters, located }: { filters: { region: MapRegion | 'All' }; located: Trip[] }) {
  const map = useMap();

  // Deliberately an effect, not a bare call in render: fitBounds is a side
  // effect on the Leaflet instance, so running it during render re-fires on
  // every parent re-render and snaps the viewport back mid-gesture — which on
  // touch reads as the map fighting your finger.
  const region = filters.region;
  const points = useMemo(
    () =>
      located
        .map((trip) => trip.location)
        .filter(
          (location): location is NonNullable<typeof location> =>
            location?.latitude != null && location?.longitude != null,
        )
        .map((location) => [location.latitude!, location.longitude!] as [number, number]),
    [located],
  );

  useEffect(() => {
    if (region !== 'All') {
      map.fitBounds(REGION_BOUNDS[region], { padding: [30, 30] });
      return;
    }
    if (points.length > 0) map.fitBounds(points, { padding: [30, 30] });
  }, [map, region, points]);

  return null;
}
