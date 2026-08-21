import { describe, expect, it } from 'vitest';
import { haversineMiles } from './geo';
import { groupTripsByLocation, locationKey } from './groupTrips';
import type { Trip } from '../types/travel';

function trip(overrides: Partial<Trip> & { id: string }): Trip {
  return {
    url: '',
    destination: 'Somewhere',
    country: null,
    status: null,
    priority: null,
    ratingStars: null,
    tripTypes: [],
    dateVisited: null,
    location: null,
    notes: null,
    photos: [],
    passportStamp: null,
    createdTime: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function at(latitude: number, longitude: number) {
  return { name: '', address: null, latitude, longitude };
}

describe('haversineMiles', () => {
  it('is zero for a point against itself', () => {
    expect(haversineMiles({ lat: 35, lng: -80 }, { lat: 35, lng: -80 })).toBe(0);
  });

  it('matches a known great-circle distance (Fort Mill SC -> Athens, ~5460mi)', () => {
    const miles = haversineMiles({ lat: 35.0072, lng: -80.9451 }, { lat: 37.9838, lng: 23.7275 });
    expect(miles).toBeGreaterThan(5400);
    expect(miles).toBeLessThan(5520);
  });

  it('is symmetric', () => {
    const a = { lat: 51.5, lng: -0.13 };
    const b = { lat: 35.68, lng: 139.65 };
    expect(haversineMiles(a, b)).toBeCloseTo(haversineMiles(b, a), 6);
  });

  it('handles crossing the antimeridian without inflating the distance', () => {
    // 2 degrees of longitude apart at the equator, not 358.
    const miles = haversineMiles({ lat: 0, lng: 179 }, { lat: 0, lng: -179 });
    expect(miles).toBeLessThan(200);
  });
});

describe('locationKey', () => {
  it('collapses coordinates that differ by less than ~111m', () => {
    expect(locationKey(trip({ id: 'a', location: at(37.98311, 23.72712) }))).toBe(
      locationKey(trip({ id: 'b', location: at(37.98338, 23.72741) })),
    );
  });

  it('separates points that straddle a rounding boundary, close as they are', () => {
    // A known limitation of bucketing by rounded coordinates rather than by
    // distance: these are ~3m apart but land either side of the 3-decimal grid.
    // Harmless here (it shows two cards instead of one), but worth pinning so
    // nobody mistakes locationKey for a proximity clusterer — the Plan tab's
    // trip clustering needs real distance, not this.
    expect(locationKey(trip({ id: 'a', location: at(37.98349, 23.7275) }))).not.toBe(
      locationKey(trip({ id: 'b', location: at(37.98351, 23.7275) })),
    );
  });

  it('falls back to a normalized destination name when coordinates are missing', () => {
    expect(locationKey(trip({ id: 'a', destination: '  Athens ' }))).toBe(
      locationKey(trip({ id: 'b', destination: 'athens' })),
    );
  });

  it('does not collide a named trip with a coordinate key', () => {
    expect(locationKey(trip({ id: 'a', destination: 'Athens' }))).not.toBe(
      locationKey(trip({ id: 'b', location: at(37.98, 23.72) })),
    );
  });
});

describe('groupTripsByLocation', () => {
  it('groups repeat visits and keeps the first as primary', () => {
    const first = trip({ id: 'first', location: at(37.98, 23.72) });
    const second = trip({ id: 'second', location: at(37.98, 23.72) });
    const other = trip({ id: 'other', location: at(48.85, 2.35) });

    const groups = groupTripsByLocation([first, second, other]);

    expect(groups).toHaveLength(2);
    expect(groups[0].trips.map((t) => t.id)).toEqual(['first', 'second']);
    expect(groups[0].primary.id).toBe('first');
  });

  it('preserves input order, so an already-sorted list stays sorted', () => {
    const groups = groupTripsByLocation([
      trip({ id: 'c', location: at(1, 1) }),
      trip({ id: 'a', location: at(2, 2) }),
      trip({ id: 'c2', location: at(1, 1) }),
    ]);

    expect(groups.map((g) => g.primary.id)).toEqual(['c', 'a']);
  });

  it('returns an empty array for no trips', () => {
    expect(groupTripsByLocation([])).toEqual([]);
  });
});
