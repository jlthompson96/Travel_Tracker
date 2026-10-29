import type { Trip } from '../../../types/travel';
import { haversineMiles, type LatLng } from '../../../utils/geo';
import { HOME_LOCATION } from '../../../services/notionAdapter';
import { formatDateRange } from '../../trips/utils/formatTrip';

/**
 * Deterministic pseudo-random number generator in [0, 1) based on a string seed.
 * Guarantees that Polaroid tilts and washi tape angles stay stable across re-renders.
 */
export function pseudoRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  return (positive % 10000) / 10000;
}

/**
 * Derives an organic rotation angle between -3.5° and +3.5° for a polaroid card.
 * Alternates polarity based on index to create a natural collage aesthetic.
 */
export function getPolaroidTilt(tripId: string, photoId: string, index: number): number {
  const seed = `${tripId}-${photoId}-${index}`;
  const raw = pseudoRandom(seed);
  // Base magnitude between 0.8° and 3.5°
  const magnitude = 0.8 + raw * 2.7;
  const sign = index % 2 === 0 ? -1 : 1;
  const jitter = (pseudoRandom(photoId) - 0.5) * 0.8;
  return Number(((magnitude * sign) + jitter).toFixed(1));
}

export type WashiTapeColor = 'brass' | 'teal' | 'red' | 'navy';

export interface WashiTapeStyle {
  colorKey: WashiTapeColor;
  bgClass: string;
  rotation: number;
}

const WASHI_VARIANTS: { key: WashiTapeColor; bgClass: string }[] = [
  { key: 'brass', bgClass: 'bg-brass/45' },
  { key: 'teal', bgClass: 'bg-horizon-teal/40' },
  { key: 'red', bgClass: 'bg-stamp-red/35' },
  { key: 'navy', bgClass: 'bg-ink-navy/30' },
];

/**
 * Returns a stable washi tape color and slight rotation angle.
 */
export function getWashiTapeStyle(seedStr: string): WashiTapeStyle {
  const rand = pseudoRandom(seedStr);
  const variantIndex = Math.floor(rand * WASHI_VARIANTS.length) % WASHI_VARIANTS.length;
  const variant = WASHI_VARIANTS[variantIndex];
  const rot = -4 + pseudoRandom(`${seedStr}-rot`) * 8; // -4° to +4°

  return {
    colorKey: variant.key,
    bgClass: variant.bgClass,
    rotation: Number(rot.toFixed(1)),
  };
}

export interface TicketData {
  ticketNumber: string;
  origin: string;
  destination: string;
  country: string | null;
  dateRange: string | null;
  nights: number | null;
  oneWayMiles: number | null;
  passenger: string;
  classType: string;
}

/**
 * Derives vintage ticket stub metadata from a trip.
 */
export function getTicketData(trip: Trip, home: LatLng = HOME_LOCATION): TicketData {
  const dateRange = formatDateRange(trip);
  const nights = trip.dateVisited?.nights ?? null;

  let oneWayMiles: number | null = null;
  if (trip.location?.latitude != null && trip.location?.longitude != null) {
    const dest = { lat: trip.location.latitude, lng: trip.location.longitude };
    oneWayMiles = Math.round(haversineMiles(home, dest));
  }

  // Generate deterministic serial string
  const hash = Math.abs(trip.id.split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0));
  const hexPart = hash.toString(16).slice(-5).toUpperCase().padStart(5, '0');
  const ticketNumber = `TT-${hexPart}`;

  return {
    ticketNumber,
    origin: 'Fort Mill, SC',
    destination: trip.destination,
    country: trip.country,
    dateRange,
    nights,
    oneWayMiles,
    passenger: 'Joey & Sarah',
    classType: trip.ratingStars === 5 ? 'First Class · ★★★★★' : 'Explorer Class',
  };
}

/**
 * Filters and sorts trips for the Scrapbook.
 * Visited ("Been There") trips with photos are prioritized first, then other visited trips.
 */
export function getScrapbookTrips(trips: Trip[]): Trip[] {
  const beenThere = trips.filter((t) => t.status === 'Been There');

  return [...beenThere].sort((a, b) => {
    // Trips with photos first
    const aHasPhotos = a.photos.length > 0;
    const bHasPhotos = b.photos.length > 0;
    if (aHasPhotos !== bHasPhotos) return aHasPhotos ? -1 : 1;

    // Then newest date first
    const dateA = a.dateVisited?.start ?? '';
    const dateB = b.dateVisited?.start ?? '';
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;

    return a.destination.localeCompare(b.destination);
  });
}

