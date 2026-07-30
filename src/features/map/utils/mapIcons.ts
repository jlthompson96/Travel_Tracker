import L from 'leaflet';
import type { TripStatus } from '../../../types/travel';

// Leaflet's default marker icons reference image paths that don't resolve
// under Vite's bundler by default — build custom colored dot icons instead.
// `count` > 1 renders a bigger badge with the visit count so stacked trips at
// one location read as a single grouped pin instead of overlapping dots.
export function stampIcon(status: TripStatus | null, count = 1) {
  const color = status === 'Been There' ? '#A6392B' : '#1E6E76';

  if (count <= 1) {
    return L.divIcon({
      className: '',
      html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></span>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }

  const size = 22;
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);color:white;font:700 11px/1 ui-monospace,monospace">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Distinct marker for the home-base origin point on the Miles Traveled route map. */
export function homeIcon() {
  const size = 20;
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:6px;background:#14232E;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);transform:rotate(45deg)"><span style="display:block;width:6px;height:6px;border-radius:9999px;background:#F7F2E7;transform:rotate(-45deg)"></span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
