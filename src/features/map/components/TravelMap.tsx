import { motion } from 'framer-motion';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { UseFilteredTrips } from '../../trips/hooks/useFilteredTrips';
import type { MapRegion, Trip } from '../../../types/travel';
import { stampIcon } from '../utils/mapIcons';

function hasCoordinates(trip: Trip): trip is Trip & { location: NonNullable<Trip['location']> } {
  return trip.location?.latitude != null && trip.location?.longitude != null;
}

const DEFAULT_CENTER: [number, number] = [20, 0];
const REGION_BOUNDS: Record<Exclude<MapRegion, 'World' | 'All'>, [[number, number], [number, number]]> = {
  Europe: [[35, -25], [70, 40]],
  'North America': [[7, -170], [83, -52]],
  'South America': [[-56, -82], [13, -34]],
  Asia: [[-10, 60], [80, 150]],
  Africa: [[-35, -20], [38, 55]],
  Oceania: [[-50, 110], [0, 180]],
};

type TravelMapProps = Pick<UseFilteredTrips, 'data' | 'isLoading' | 'isError' | 'filters'> & {
  /** Map height in pixels — bigger on the dedicated Map page, compact in the dashboard sidebar. */
  height?: number;
};

export function TravelMap({ data: trips, isLoading, isError, filters, height = 420 }: TravelMapProps) {
  const located = (trips ?? []).filter(hasCoordinates).filter((trip) => {
    if (filters.status !== 'All' && trip.status !== filters.status) return false;
    if (filters.country !== 'All' && trip.country !== filters.country) return false;
    if (filters.tripType !== 'All' && !trip.tripTypes.includes(filters.tripType)) return false;
    if (filters.region !== 'All' && filters.region !== 'World' && !matchesRegion(trip, filters.region)) return false;
    return true;
  });

  if (isLoading) {
    return <div className="animate-pulse rounded border border-slate/10 bg-slate/5" style={{ height }} />;
  }

  if (isError) {
    return (
      <div
        className="flex items-center justify-center border border-stamp-red/30 bg-stamp-red/5 text-sm text-stamp-red"
        style={{ height }}
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
          className="flex items-center justify-center border border-dashed border-slate/20 text-sm text-slate/50"
          style={{ height }}
        >
          No trips have a Location set yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-slate/15 shadow-sm" style={{ height }}>
          <MapContainer center={DEFAULT_CENTER} zoom={2} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewportController filters={filters} located={located} />
            {located.map((trip) => (
              <Marker
                key={trip.id}
                position={[trip.location.latitude!, trip.location.longitude!]}
                icon={stampIcon(trip.status)}
              >
                <Popup>
                  <div className="font-body">
                    <p className="font-semibold">{trip.destination}</p>
                    {trip.status && <p className="text-xs text-slate/60">{trip.status}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </motion.div>
  );
}

function matchesRegion(trip: Trip, region: Exclude<MapRegion, 'World' | 'All'>): boolean {
  const country = trip.country?.toLowerCase() ?? '';
  const regionMap: Record<Exclude<MapRegion, 'World' | 'All'>, string[]> = {
    Europe: ['greece', 'italy', 'france', 'spain', 'portugal', 'germany', 'iceland', 'ireland', 'hungary', 'bulgaria', 'ukraine', 'vatican city'],
    'North America': ['usa', 'mexico', 'canada'],
    'South America': ['argentina', 'brazil', 'chile', 'peru', 'colombia', 'ecuador', 'uruguay', 'paraguay', 'bolivia'],
    Asia: ['japan', 'thailand', 'india', 'china', 'singapore', 'malaysia', 'taiwan', 'south korea', 'vietnam'],
    Africa: ['morocco', 'egypt', 'south africa', 'kenya', 'tanzania', 'nigeria', 'ethiopia'],
    Oceania: ['australia', 'new zealand', 'fiji', 'papua new guinea'],
  };

  return regionMap[region].some((name) => country.includes(name));
}

function MapViewportController({ filters, located }: { filters: { region: MapRegion | 'All' }; located: Trip[] }) {
  const map = useMap();

  if (filters.region !== 'All' && filters.region !== 'World') {
    const bounds = REGION_BOUNDS[filters.region];
    map.fitBounds(bounds, { padding: [30, 30] });
    return null;
  }

  if (located.length > 0) {
    const points = located
      .map((trip) => trip.location)
      .filter((location): location is NonNullable<typeof location> => location?.latitude != null && location?.longitude != null)
      .map((location) => [location.latitude!, location.longitude!] as [number, number]);

    if (points.length > 0) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }

  return null;
}
