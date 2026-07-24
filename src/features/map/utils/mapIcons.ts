import L from 'leaflet';
import type { TripStatus } from '../../../types/travel';

// Leaflet's default marker icons reference image paths that don't resolve
// under Vite's bundler by default — build custom colored dot icons instead.
export function stampIcon(status: TripStatus | null) {
  const color = status === 'Been There' ? '#A6392B' : '#1E6E76';
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
