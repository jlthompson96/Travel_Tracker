import type { LatLng } from '../../../utils/geo';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

const EARTH_RADIUS_MILES = 3958.8;

/**
 * Great-circle distance between two points in statute miles.
 */
export function greatCircleDistance(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLng = toRad(normalizeLngDiff(b.lng - a.lng));

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Normalizes longitude difference in degrees to range [-180, 180]
 * so flights take the shortest path across the globe (e.g. Pacific crossings).
 */
export function normalizeLngDiff(diffDeg: number): number {
  let diff = diffDeg % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Calculates initial bearing from start to end in degrees [0, 360).
 * 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function calculateBearing(start: LatLng, end: LatLng): number {
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const dLng = toRad(normalizeLngDiff(end.lng - start.lng));

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const rad = Math.atan2(y, x);
  return (toDeg(rad) + 360) % 360;
}

/**
 * Spherical linear interpolation between two points on the globe.
 * @param start Start point
 * @param end End point
 * @param fraction Progress fraction between 0 and 1
 */
export function intermediatePoint(start: LatLng, end: LatLng, fraction: number): LatLng {
  if (fraction <= 0) return { lat: start.lat, lng: start.lng };
  if (fraction >= 1) return { lat: end.lat, lng: end.lng };

  const lat1 = toRad(start.lat);
  const lng1 = toRad(start.lng);
  const lat2 = toRad(end.lat);
  const lng2 = toRad(start.lng + normalizeLngDiff(end.lng - start.lng));

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const delta = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  if (delta < 1e-6) {
    return { lat: start.lat, lng: start.lng };
  }

  const sinDelta = Math.sin(delta);
  const aWeight = Math.sin((1 - fraction) * delta) / sinDelta;
  const bWeight = Math.sin(fraction * delta) / sinDelta;

  const x = aWeight * Math.cos(lat1) * Math.cos(lng1) + bWeight * Math.cos(lat2) * Math.cos(lng2);
  const y = aWeight * Math.cos(lat1) * Math.sin(lng1) + bWeight * Math.cos(lat2) * Math.sin(lng2);
  const z = aWeight * Math.sin(lat1) + bWeight * Math.sin(lat2);

  const latRad = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lngRad = Math.atan2(y, x);

  // Normalize lng back to [-180, 180]
  let lng = toDeg(lngRad);
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;

  return {
    lat: toDeg(latRad),
    lng,
  };
}

/**
 * Generates an array of [lat, lng] tuples tracing the great-circle curve.
 */
export function generateArcPoints(start: LatLng, end: LatLng, numPoints = 50): [number, number][] {
  const points: [number, number][] = [];
  const count = Math.max(2, numPoints);

  for (let i = 0; i <= count; i++) {
    const fraction = i / count;
    const pt = intermediatePoint(start, end, fraction);
    points.push([pt.lat, pt.lng]);
  }

  return points;
}

/**
 * Returns current position and flight heading at a given progress fraction [0, 1].
 */
export function evaluateFlightPosition(
  start: LatLng,
  end: LatLng,
  progress: number,
): { position: [number, number]; heading: number } {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const current = intermediatePoint(start, end, clampedProgress);

  // For heading, look ahead slightly (or behind if at the end)
  const lookAheadFrac = clampedProgress < 0.99 ? clampedProgress + 0.01 : clampedProgress;
  const lookBehindFrac = clampedProgress >= 0.99 ? clampedProgress - 0.01 : clampedProgress;

  const p1 = intermediatePoint(start, end, lookBehindFrac);
  const p2 = intermediatePoint(start, end, lookAheadFrac);

  const heading = calculateBearing(p1, p2);

  return {
    position: [current.lat, current.lng],
    heading,
  };
}

