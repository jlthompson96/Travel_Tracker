import { describe, expect, it } from 'vitest';
import { clusterTrips } from './clusterTrips';
import type { Trip } from '../../../types/travel';

function trip(id: string, latitude: number | null, longitude: number | null): Trip {
  return {
    id,
    url: '',
    destination: id,
    country: null,
    status: 'Bucket List',
    priority: null,
    ratingStars: null,
    tripTypes: [],
    dateVisited: null,
    location: latitude == null ? null : { name: '', address: null, latitude, longitude },
    notes: null,
    photos: [],
    passportStamp: null,
    createdTime: '2024-01-01T00:00:00.000Z',
  };
}

// Athens / Delphi / Meteora are a real chain: Delphi is ~100mi from Athens and
// Meteora ~110mi from Delphi, but Athens to Meteora is ~180mi — further apart
// than the radius. Single-link clustering is what keeps them one trip.
const ATHENS = trip('Athens', 37.98, 23.73);
const DELPHI = trip('Delphi', 38.48, 22.5);
const METEORA = trip('Meteora', 39.72, 21.63);
const TOKYO = trip('Tokyo', 35.68, 139.65);

describe('clusterTrips', () => {
  it('chains nearby stops into one cluster even when the ends exceed the radius', () => {
    const clusters = clusterTrips([ATHENS, DELPHI, METEORA], 150);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].trips.map((t) => t.id).sort()).toEqual(['Athens', 'Delphi', 'Meteora']);
    // The reported span is the widest pair, which is larger than the radius.
    expect(clusters[0].spanMiles).toBeGreaterThan(150);
  });

  it('leaves distant trips out entirely rather than making a cluster of one', () => {
    const clusters = clusterTrips([ATHENS, DELPHI, TOKYO], 150);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].trips.map((t) => t.id).sort()).toEqual(['Athens', 'Delphi']);
  });

  it('ignores trips with no coordinates', () => {
    const clusters = clusterTrips([ATHENS, DELPHI, trip('Nowhere', null, null)], 150);
    expect(clusters[0].trips.map((t) => t.id)).not.toContain('Nowhere');
  });

  it('returns nothing when every trip is far from every other', () => {
    expect(clusterTrips([ATHENS, TOKYO], 150)).toEqual([]);
    expect(clusterTrips([], 150)).toEqual([]);
  });

  it('respects a tighter radius', () => {
    // Athens->Delphi is ~100mi, so a 50mi radius must split them.
    expect(clusterTrips([ATHENS, DELPHI], 50)).toEqual([]);
  });

  it('orders the biggest cluster first', () => {
    const a = trip('a', 10, 10);
    const b = trip('b', 10.1, 10.1);
    const clusters = clusterTrips([a, b, ATHENS, DELPHI, METEORA], 150);
    expect(clusters[0].trips).toHaveLength(3);
  });
});
