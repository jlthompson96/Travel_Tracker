import { describe, expect, it } from 'vitest';
import {
  calculateBearing,
  evaluateFlightPosition,
  generateArcPoints,
  greatCircleDistance,
  intermediatePoint,
  normalizeLngDiff,
} from './flightMath';

describe('normalizeLngDiff', () => {
  it('keeps differences within [-180, 180]', () => {
    expect(normalizeLngDiff(45)).toBe(45);
    expect(normalizeLngDiff(-45)).toBe(-45);
    expect(normalizeLngDiff(200)).toBe(-160);
    expect(normalizeLngDiff(-200)).toBe(160);
  });
});

describe('calculateBearing', () => {
  it('calculates cardinal directions accurately', () => {
    // Due North
    expect(calculateBearing({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBeCloseTo(0, 1);
    // Due East
    expect(calculateBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBeCloseTo(90, 1);
    // Due South
    expect(calculateBearing({ lat: 10, lng: 0 }, { lat: 0, lng: 0 })).toBeCloseTo(180, 1);
    // Due West
    expect(calculateBearing({ lat: 0, lng: 10 }, { lat: 0, lng: 0 })).toBeCloseTo(270, 1);
  });
});

describe('greatCircleDistance', () => {
  it('returns 0 for identical points', () => {
    const pt = { lat: 35.0072, lng: -80.9451 };
    expect(greatCircleDistance(pt, pt)).toBe(0);
  });

  it('calculates realistic flight distances', () => {
    // New York to London ~ 3,450 miles
    const nyc = { lat: 40.7128, lng: -74.006 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const dist = greatCircleDistance(nyc, london);
    expect(dist).toBeGreaterThan(3400);
    expect(dist).toBeLessThan(3500);
  });
});

describe('intermediatePoint', () => {
  const start = { lat: 35.0, lng: -80.0 };
  const end = { lat: 40.0, lng: -70.0 };

  it('returns start at fraction 0 and end at fraction 1', () => {
    const at0 = intermediatePoint(start, end, 0);
    expect(at0.lat).toBeCloseTo(start.lat, 4);
    expect(at0.lng).toBeCloseTo(start.lng, 4);

    const at1 = intermediatePoint(start, end, 1);
    expect(at1.lat).toBeCloseTo(end.lat, 4);
    expect(at1.lng).toBeCloseTo(end.lng, 4);
  });

  it('returns midpoint at fraction 0.5', () => {
    const mid = intermediatePoint(start, end, 0.5);
    expect(mid.lat).toBeGreaterThan(start.lat);
    expect(mid.lat).toBeLessThan(end.lat);
    expect(mid.lng).toBeGreaterThan(start.lng);
    expect(mid.lng).toBeLessThan(end.lng);
  });
});

describe('generateArcPoints', () => {
  it('produces the requested number of points including start and end', () => {
    const pts = generateArcPoints({ lat: 10, lng: 10 }, { lat: 20, lng: 20 }, 10);
    expect(pts.length).toBe(11);
    expect(pts[0][0]).toBeCloseTo(10, 4);
    expect(pts[10][0]).toBeCloseTo(20, 4);
  });
});

describe('evaluateFlightPosition', () => {
  it('returns valid coordinates and heading between 0 and 360', () => {
    const start = { lat: 35.0072, lng: -80.9451 };
    const end = { lat: 41.9028, lng: 12.4964 }; // Rome

    const mid = evaluateFlightPosition(start, end, 0.5);
    expect(mid.position[0]).toBeGreaterThan(30);
    expect(mid.heading).toBeGreaterThanOrEqual(0);
    expect(mid.heading).toBeLessThan(360);
  });
});

