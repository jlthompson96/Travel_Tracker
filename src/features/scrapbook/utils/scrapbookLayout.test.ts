import { describe, expect, it } from 'vitest';
import type { Trip } from '../../../types/travel';
import {
  getPolaroidTilt,
  getScrapbookTrips,
  getTicketData,
  getWashiTapeStyle,
  pseudoRandom,
} from './scrapbookLayout';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: 'trip-1',
    url: 'https://notion.so/test',
    destination: 'Santorini',
    country: 'Greece',
    status: 'Been There',
    priority: 'High',
    ratingStars: 5,
    tripTypes: ['Beach', 'Culture'],
    dateVisited: {
      start: '2026-06-01',
      end: '2026-06-08',
      isDateTime: false,
      nights: 7,
    },
    location: {
      name: 'Santorini',
      address: 'Santorini, Greece',
      latitude: 36.3932,
      longitude: 25.4615,
    },
    notes: 'Incredible sunset over Oia and delicious wine',
    photos: [
      { id: 'p1', name: 'sunset.jpg', url: '/photos/p1.jpg', expiryTime: null },
      { id: 'p2', name: 'oia.jpg', url: '/photos/p2.jpg', expiryTime: null },
    ],
    passportStamp: 'SANTORINI',
    createdTime: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('pseudoRandom', () => {
  it('returns deterministic numbers between 0 and 1', () => {
    const val1 = pseudoRandom('seed-123');
    const val2 = pseudoRandom('seed-123');
    expect(val1).toBe(val2);
    expect(val1).toBeGreaterThanOrEqual(0);
    expect(val1).toBeLessThan(1);
  });
});

describe('getPolaroidTilt', () => {
  it('alternates sign and stays within [-4, 4] degrees', () => {
    const tilt0 = getPolaroidTilt('trip-1', 'p1', 0);
    const tilt1 = getPolaroidTilt('trip-1', 'p2', 1);

    expect(tilt0).toBeLessThan(0); // index 0 is negative
    expect(tilt1).toBeGreaterThan(0); // index 1 is positive
    expect(Math.abs(tilt0)).toBeLessThanOrEqual(4);
    expect(Math.abs(tilt1)).toBeLessThanOrEqual(4);
  });
});

describe('getWashiTapeStyle', () => {
  it('returns valid washi tape color class and rotation', () => {
    const style = getWashiTapeStyle('tape-seed');
    expect(style.bgClass).toMatch(/^bg-/);
    expect(style.rotation).toBeGreaterThanOrEqual(-5);
    expect(style.rotation).toBeLessThanOrEqual(5);
  });
});

describe('getTicketData', () => {
  it('derives ticket attributes from trip', () => {
    const trip = makeTrip({});
    const ticket = getTicketData(trip);

    expect(ticket.destination).toBe('Santorini');
    expect(ticket.origin).toBe('Fort Mill, SC');
    expect(ticket.nights).toBe(7);
    expect(ticket.ticketNumber).toMatch(/^TT-[0-9A-F]{5}$/);
    expect(ticket.oneWayMiles).toBeGreaterThan(4000);
    expect(ticket.classType).toContain('First Class');
  });
});

describe('getScrapbookTrips', () => {
  it('sorts trips with photos first, then by date descending', () => {
    const trips = [
      makeTrip({ id: '1', destination: 'No Photos New', photos: [], dateVisited: { start: '2026-09-01', end: null, isDateTime: false, nights: 1 } }),
      makeTrip({ id: '2', destination: 'With Photos Old', photos: [{ id: 'p', name: '1.jpg', url: '1.jpg', expiryTime: null }], dateVisited: { start: '2025-05-01', end: null, isDateTime: false, nights: 1 } }),
      makeTrip({ id: '3', destination: 'With Photos New', photos: [{ id: 'p', name: '2.jpg', url: '2.jpg', expiryTime: null }], dateVisited: { start: '2026-06-01', end: null, isDateTime: false, nights: 1 } }),
      makeTrip({ id: '4', destination: 'Bucket List Trip', status: 'Bucket List', photos: [] }),
    ];

    const result = getScrapbookTrips(trips);
    expect(result.length).toBe(3); // only Been There
    expect(result.map((t) => t.destination)).toEqual([
      'With Photos New',
      'With Photos Old',
      'No Photos New',
    ]);
  });
});

