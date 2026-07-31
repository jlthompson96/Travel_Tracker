import type { Trip } from '../types/travel';

/** Generic over the trip type so callers that have already narrowed their trips
 * (e.g. to "has coordinates") keep that narrowing through the grouping. */
export interface TripGroup<T extends Trip = Trip> {
  key: string;
  /** Every visit to this place, in the order the caller supplied them. */
  trips: T[];
  /** trips[0] — the best-ranked visit under whatever sort produced the input. */
  primary: T;
}

/** Rounds to ~111m so trips pinned to "the same place" collapse into one entry
 * even if their Notion Location was picked independently each time. Trips with
 * no coordinates fall back to their destination title. */
export function locationKey(trip: Trip): string {
  const lat = trip.location?.latitude;
  const lng = trip.location?.longitude;
  if (lat != null && lng != null) return `${lat.toFixed(3)},${lng.toFixed(3)}`;
  return `name:${trip.destination.trim().toLowerCase()}`;
}

/** Groups repeat visits to one place together, preserving input order: a group
 * takes the position of its first member, so an already-sorted list stays sorted. */
export function groupTripsByLocation<T extends Trip>(trips: T[]): TripGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const trip of trips) {
    const key = locationKey(trip);
    const existing = groups.get(key);
    if (existing) existing.push(trip);
    else groups.set(key, [trip]);
  }

  return Array.from(groups, ([key, groupTrips]) => ({
    key,
    trips: groupTrips,
    primary: groupTrips[0],
  }));
}
