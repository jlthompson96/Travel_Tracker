import type { Country, Trip, TripType } from '../../../types/travel';
import type { LatLng } from '../../../utils/geo';
import { HOME_LOCATION } from '../../../services/notionAdapter';
import { generateArcPoints, greatCircleDistance } from './flightMath';

export interface FlightLeg {
  id: string;
  legIndex: number;
  fromLabel: string;
  toLabel: string;
  origin: LatLng;
  destination: LatLng;
  trip: Trip | null; // null for the final return-home leg in Grand Tour
  distanceMiles: number;
  arcPoints: [number, number][];
  isReturnHome: boolean;
}

export interface YearReviewStats {
  year: string;
  trips: Trip[];
  totalTrips: number;
  totalMiles: number;
  earthCircumferences: number;
  countriesVisited: Country[];
  countriesCount: number;
  totalNights: number;
  favoriteTrip: Trip | null;
  topTripTypes: { type: TripType; count: number }[];
  photoCount: number;
  firstTrip: Trip | null;
  lastTrip: Trip | null;
  farthestTrip: { trip: Trip; oneWayMiles: number } | null;
}

export type RouteMode = 'grand-tour' | 'from-home';

function hasCoordinates(trip: Trip): trip is Trip & { location: NonNullable<Trip['location']> & { latitude: number; longitude: number } } {
  return trip.location?.latitude != null && trip.location?.longitude != null;
}

/**
 * Extracts all distinct 4-digit years from trips with status "Been There" and a valid dateVisited.start.
 * Returns sorted descending (e.g. ['2026', '2025', '2024']).
 */
export function getAvailableYears(trips: Trip[]): string[] {
  const years = new Set<string>();

  for (const trip of trips) {
    if (trip.status !== 'Been There') continue;
    const start = trip.dateVisited?.start;
    if (!start) continue;

    const match = start.match(/^(\d{4})/);
    if (match) {
      years.add(match[1]);
    }
  }

  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

/**
 * Gets all "Been There" trips for a specific year, sorted chronologically.
 */
export function getTripsForYear(trips: Trip[], year: string): Trip[] {
  return trips
    .filter((trip) => {
      if (trip.status !== 'Been There') return false;
      const start = trip.dateVisited?.start;
      return Boolean(start && start.startsWith(year));
    })
    .sort((a, b) => {
      const dateA = a.dateVisited?.start ?? '';
      const dateB = b.dateVisited?.start ?? '';
      return dateA.localeCompare(dateB);
    });
}

/**
 * Computes recap statistics for the trips in a given year.
 */
export function computeYearReviewStats(
  tripsForYear: Trip[],
  year: string,
  home: LatLng = HOME_LOCATION,
): YearReviewStats {
  const countriesSet = new Set<string>();
  let totalNights = 0;
  let photoCount = 0;
  let totalMiles = 0;

  const tripTypeCounts: Record<string, number> = {};

  let farthestTrip: { trip: Trip; oneWayMiles: number } | null = null;
  let maxOneWay = -1;

  for (const trip of tripsForYear) {
    if (trip.country) {
      countriesSet.add(trip.country);
    }

    if (trip.dateVisited?.nights != null) {
      totalNights += trip.dateVisited.nights;
    }

    photoCount += trip.photos.length;

    for (const tt of trip.tripTypes) {
      tripTypeCounts[tt] = (tripTypeCounts[tt] ?? 0) + 1;
    }

    if (hasCoordinates(trip)) {
      const dest: LatLng = { lat: trip.location.latitude, lng: trip.location.longitude };
      const oneWay = greatCircleDistance(home, dest);
      totalMiles += 2 * oneWay; // round trip

      if (oneWay > maxOneWay) {
        maxOneWay = oneWay;
        farthestTrip = { trip, oneWayMiles: Math.round(oneWay) };
      }
    }
  }

  // Favorite trip: highest rating, then most photos
  const sortedByFavorite = [...tripsForYear].sort((a, b) => {
    const rA = a.ratingStars ?? 0;
    const rB = b.ratingStars ?? 0;
    if (rB !== rA) return rB - rA;
    return b.photos.length - a.photos.length;
  });
  const favoriteTrip = sortedByFavorite[0] ?? null;

  const topTripTypes = Object.entries(tripTypeCounts)
    .map(([type, count]) => ({ type: type as TripType, count }))
    .sort((a, b) => b.count - a.count);

  const roundedMiles = Math.round(totalMiles);
  const earthCircumferences = Number((roundedMiles / 24901).toFixed(1));

  return {
    year,
    trips: tripsForYear,
    totalTrips: tripsForYear.length,
    totalMiles: roundedMiles,
    earthCircumferences,
    countriesVisited: Array.from(countriesSet).sort(),
    countriesCount: countriesSet.size,
    totalNights,
    favoriteTrip,
    topTripTypes,
    photoCount,
    firstTrip: tripsForYear[0] ?? null,
    lastTrip: tripsForYear[tripsForYear.length - 1] ?? null,
    farthestTrip,
  };
}

/**
 * Builds the sequence of flight legs for animation.
 */
export function generateFlightLegs(
  tripsForYear: Trip[],
  mode: RouteMode = 'grand-tour',
  home: LatLng = HOME_LOCATION,
): FlightLeg[] {
  const located = tripsForYear.filter(hasCoordinates);
  if (located.length === 0) return [];

  const legs: FlightLeg[] = [];

  if (mode === 'from-home') {
    // Each leg starts at Home and lands at Destination
    located.forEach((trip, idx) => {
      const dest: LatLng = { lat: trip.location.latitude, lng: trip.location.longitude };
      const dist = Math.round(greatCircleDistance(home, dest));

      legs.push({
        id: `leg-${trip.id}`,
        legIndex: idx,
        fromLabel: 'Home (Fort Mill, SC)',
        toLabel: trip.destination,
        origin: home,
        destination: dest,
        trip,
        distanceMiles: dist,
        arcPoints: generateArcPoints(home, dest, 50),
        isReturnHome: false,
      });
    });
  } else {
    // Grand Tour: Home -> Stop 1 -> Stop 2 -> ... -> Stop N -> Home
    let currentOrigin = home;
    let currentLabel = 'Home (Fort Mill, SC)';

    located.forEach((trip, idx) => {
      const dest: LatLng = { lat: trip.location.latitude, lng: trip.location.longitude };
      const dist = Math.round(greatCircleDistance(currentOrigin, dest));

      legs.push({
        id: `leg-${trip.id}`,
        legIndex: idx,
        fromLabel: currentLabel,
        toLabel: trip.destination,
        origin: currentOrigin,
        destination: dest,
        trip,
        distanceMiles: dist,
        arcPoints: generateArcPoints(currentOrigin, dest, 50),
        isReturnHome: false,
      });

      currentOrigin = dest;
      currentLabel = trip.destination;
    });

    // Return to Home leg
    if (located.length > 0) {
      const lastTrip = located[located.length - 1];
      const origin: LatLng = { lat: lastTrip.location.latitude, lng: lastTrip.location.longitude };
      const returnDist = Math.round(greatCircleDistance(origin, home));

      legs.push({
        id: 'leg-return-home',
        legIndex: located.length,
        fromLabel: lastTrip.destination,
        toLabel: 'Home (Fort Mill, SC)',
        origin,
        destination: home,
        trip: null,
        distanceMiles: returnDist,
        arcPoints: generateArcPoints(origin, home, 50),
        isReturnHome: true,
      });
    }
  }

  return legs;
}
