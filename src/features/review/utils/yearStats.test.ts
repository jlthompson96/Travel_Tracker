import { describe, expect, it } from 'vitest';
import type { Trip } from '../../../types/travel';
import {
  computeYearReviewStats,
  generateFlightLegs,
  getAvailableYears,
  getTripsForYear,
} from './yearStats';

const mockHome = { lat: 35.0072, lng: -80.9451 };

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: 'test-1',
    url: 'https://notion.so/test',
    destination: 'Paris',
    country: 'France',
    status: 'Been There',
    priority: 'High',
    ratingStars: 5,
    tripTypes: ['City', 'Culture'],
    dateVisited: {
      start: '2026-05-10',
      end: '2026-05-15',
      isDateTime: false,
      nights: 5,
    },
    location: {
      name: 'Paris',
      address: 'Paris, France',
      latitude: 48.8566,
      longitude: 2.3522,
    },
    notes: 'Amazing pastries and museums',
    photos: [{ id: 'p1', name: 'eiffel.jpg', url: '/photos/p1.jpg', expiryTime: null }],
    passportStamp: 'PARIS-2026',
    createdTime: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

describe('getAvailableYears', () => {
  it('extracts years from Been There trips only', () => {
    const trips = [
      makeTrip({ id: '1', dateVisited: { start: '2026-04-01', end: null, isDateTime: false, nights: 1 } }),
      makeTrip({ id: '2', dateVisited: { start: '2025-08-15', end: null, isDateTime: false, nights: 3 } }),
      makeTrip({ id: '3', status: 'Bucket List', dateVisited: { start: '2027-01-01', end: null, isDateTime: false, nights: null } }),
      makeTrip({ id: '4', dateVisited: { start: '2026-11-20', end: null, isDateTime: false, nights: 2 } }),
    ];

    expect(getAvailableYears(trips)).toEqual(['2026', '2025']);
  });

  it('handles empty or missing dateVisited', () => {
    const trips = [
      makeTrip({ id: '1', dateVisited: null }),
      makeTrip({ id: '2', dateVisited: { start: null, end: null, isDateTime: false, nights: null } }),
    ];
    expect(getAvailableYears(trips)).toEqual([]);
  });
});

describe('getTripsForYear', () => {
  it('filters by year and sorts chronologically', () => {
    const trips = [
      makeTrip({ id: '1', destination: 'Late', dateVisited: { start: '2026-10-01', end: null, isDateTime: false, nights: 1 } }),
      makeTrip({ id: '2', destination: 'Early', dateVisited: { start: '2026-03-01', end: null, isDateTime: false, nights: 1 } }),
      makeTrip({ id: '3', destination: 'Other Year', dateVisited: { start: '2025-05-01', end: null, isDateTime: false, nights: 1 } }),
    ];

    const result = getTripsForYear(trips, '2026');
    expect(result.map((t) => t.destination)).toEqual(['Early', 'Late']);
  });
});

describe('computeYearReviewStats', () => {
  it('computes totals accurately', () => {
    const trips = [
      makeTrip({
        id: '1',
        destination: 'Paris',
        country: 'France',
        ratingStars: 5,
        tripTypes: ['City', 'Culture'],
        photos: [{ id: 'p1', name: '1.jpg', url: '1.jpg', expiryTime: null }],
        dateVisited: { start: '2026-04-01', end: '2026-04-05', isDateTime: false, nights: 4 },
      }),
      makeTrip({
        id: '2',
        destination: 'Tokyo',
        country: 'Japan',
        ratingStars: 4,
        tripTypes: ['City', 'Food'],
        photos: [
          { id: 'p2', name: '2.jpg', url: '2.jpg', expiryTime: null },
          { id: 'p3', name: '3.jpg', url: '3.jpg', expiryTime: null },
        ],
        location: { name: 'Tokyo', address: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
        dateVisited: { start: '2026-09-01', end: '2026-09-10', isDateTime: false, nights: 9 },
      }),
    ];

    const stats = computeYearReviewStats(trips, '2026', mockHome);

    expect(stats.year).toBe('2026');
    expect(stats.totalTrips).toBe(2);
    expect(stats.countriesCount).toBe(2);
    expect(stats.totalNights).toBe(13);
    expect(stats.photoCount).toBe(3);
    expect(stats.favoriteTrip?.destination).toBe('Paris');
    expect(stats.topTripTypes[0].type).toBe('City');
    expect(stats.totalMiles).toBeGreaterThan(10000);
    expect(stats.earthCircumferences).toBeGreaterThan(0.5);
    expect(stats.farthestTrip?.trip.destination).toBe('Tokyo');
  });
});

describe('generateFlightLegs', () => {
  const trips = [
    makeTrip({ id: '1', destination: 'Paris', location: { name: 'Paris', address: 'Paris', latitude: 48.8566, longitude: 2.3522 } }),
    makeTrip({ id: '2', destination: 'Tokyo', location: { name: 'Tokyo', address: 'Tokyo', latitude: 35.6762, longitude: 139.6503 } }),
  ];

  it('generates hub-and-spoke legs in from-home mode', () => {
    const legs = generateFlightLegs(trips, 'from-home', mockHome);
    expect(legs.length).toBe(2);
    expect(legs[0].fromLabel).toContain('Home');
    expect(legs[0].toLabel).toBe('Paris');
    expect(legs[1].fromLabel).toContain('Home');
    expect(legs[1].toLabel).toBe('Tokyo');
  });

  it('generates sequential connected legs plus return in grand-tour mode', () => {
    const legs = generateFlightLegs(trips, 'grand-tour', mockHome);
    expect(legs.length).toBe(3);
    expect(legs[0].fromLabel).toContain('Home');
    expect(legs[0].toLabel).toBe('Paris');
    expect(legs[1].fromLabel).toBe('Paris');
    expect(legs[1].toLabel).toBe('Tokyo');
    expect(legs[2].fromLabel).toBe('Tokyo');
    expect(legs[2].toLabel).toContain('Home');
    expect(legs[2].isReturnHome).toBe(true);
  });
});

