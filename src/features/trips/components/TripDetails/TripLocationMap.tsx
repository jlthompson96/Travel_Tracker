import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip } from '../../../../types/travel';
import { stampIcon } from '../../../map/utils/mapIcons';

interface TripLocationMapProps {
  trip: Trip;
}

export function TripLocationMap({ trip }: TripLocationMapProps) {
  const { latitude, longitude } = trip.location ?? {};
  if (latitude == null || longitude == null) return null;

  const position: [number, number] = [latitude, longitude];

  return (
    <div className="h-48 overflow-hidden rounded border border-slate/15">
      <MapContainer
        center={position}
        zoom={10}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={stampIcon(trip.status)} />
      </MapContainer>
    </div>
  );
}
