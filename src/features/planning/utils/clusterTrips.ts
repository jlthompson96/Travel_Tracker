import { haversineMiles } from '../../../utils/geo';
import type { Trip } from '../../../types/travel';

/**
 * Groups bucket-list trips that are close enough to do in one journey.
 *
 * Distinct from groupTripsByLocation in utils/groupTrips.ts, which buckets by
 * coordinates rounded to ~111m to collapse repeat visits to the SAME place.
 * This needs real distance at a ~150mi scale, and rounding can't express that:
 * two points 3m apart can land in different buckets if they straddle a grid
 * line (see geo.test.ts), which is harmless at 111m and useless at 150mi.
 *
 * Single-link agglomeration: a trip joins a cluster if it's within the radius
 * of ANY member, so a chain of nearby stops becomes one trip. That's the right
 * behavior for "Athens, Delphi, Meteora" and it's why this isn't just a
 * distance-to-centroid test.
 */

export interface TripCluster {
  key: string;
  trips: Trip[];
  /** Widest distance between any two members, in miles. */
  spanMiles: number;
}

export interface Located {
  trip: Trip;
  lat: number;
  lng: number;
}

export const DEFAULT_CLUSTER_RADIUS_MILES = 150;

export function locatedTrips(trips: Trip[]): Located[] {
  return trips.flatMap((trip) => {
    const lat = trip.location?.latitude;
    const lng = trip.location?.longitude;
    return lat != null && lng != null ? [{ trip, lat, lng }] : [];
  });
}

export function clusterTrips(trips: Trip[], radiusMiles = DEFAULT_CLUSTER_RADIUS_MILES): TripCluster[] {
  const points = locatedTrips(trips);
  const assigned = new Set<number>();
  const clusters: TripCluster[] = [];

  for (let i = 0; i < points.length; i += 1) {
    if (assigned.has(i)) continue;

    // Breadth-first over "within radius of something already in the cluster".
    const members = [i];
    assigned.add(i);
    for (let cursor = 0; cursor < members.length; cursor += 1) {
      const from = points[members[cursor]];
      for (let j = 0; j < points.length; j += 1) {
        if (assigned.has(j)) continue;
        if (haversineMiles({ lat: from.lat, lng: from.lng }, { lat: points[j].lat, lng: points[j].lng }) <= radiusMiles) {
          assigned.add(j);
          members.push(j);
        }
      }
    }

    if (members.length < 2) continue; // a cluster of one is just a trip

    let spanMiles = 0;
    for (const a of members) {
      for (const b of members) {
        const d = haversineMiles(
          { lat: points[a].lat, lng: points[a].lng },
          { lat: points[b].lat, lng: points[b].lng },
        );
        if (d > spanMiles) spanMiles = d;
      }
    }

    clusters.push({
      key: points[members[0]].trip.id,
      trips: members.map((m) => points[m].trip),
      spanMiles: Math.round(spanMiles),
    });
  }

  // Biggest opportunities first.
  return clusters.sort((a, b) => b.trips.length - a.trips.length || a.spanMiles - b.spanMiles);
}
