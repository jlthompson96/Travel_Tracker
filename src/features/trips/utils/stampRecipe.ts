import type { Country, Trip, TripType } from '../../../types/travel';

export type StampShape = 'rings' | 'scallop' | 'hex';

export interface StampRecipe {
  shape: StampShape;
  rotation: number;
  tickCount: number;
  dashPattern: string;
  iconKey: TripType | 'default';
  label: string;
  /** State code for US destinations (parsed from the title), else a country code. */
  abbreviation: string | null;
}

/** ISO 3166-1 alpha-3 codes for the live "Country" select options. */
const COUNTRY_CODES: Record<Country, string> = {
  USA: 'USA',
  Greece: 'GRC',
  Italy: 'ITA',
  France: 'FRA',
  Spain: 'ESP',
  Japan: 'JPN',
  Mexico: 'MEX',
  Portugal: 'PRT',
  Thailand: 'THA',
  'Costa Rica': 'CRI',
  Iceland: 'ISL',
  Ireland: 'IRL',
  Germany: 'DEU',
  Hungary: 'HUN',
  Bulgaria: 'BGR',
  Ukraine: 'UKR',
  'Vatican City': 'VAT',
  'New Zealand': 'NZL',
  'St. Vincent and the Grenadines': 'VCT',
  Australia: 'AUS',
};

/** US destinations are titled "Place Name, ST" in the live data — pull the trailing state code. */
function usStateCode(destination: string): string | null {
  const match = destination.match(/,\s*([A-Z]{2})$/);
  return match ? match[1] : null;
}

function getAbbreviation(destination: string, country: Country | null): string | null {
  if (!country) return null;
  if (country === 'USA') return usStateCode(destination) ?? COUNTRY_CODES.USA;
  return COUNTRY_CODES[country] ?? null;
}

/** djb2 string hash — deterministic, so the same trip always renders the same stamp. */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

function shortLabel(destination: string, max = 14): string {
  const primary = destination.split(',')[0].trim();
  if (primary.length <= max) return primary.toUpperCase();
  return `${primary.slice(0, max - 1).trim()}…`.toUpperCase();
}

const SHAPES: StampShape[] = ['rings', 'scallop', 'hex'];
const DASH_PATTERNS = ['5 1.5 3 2 7 1.5', '4 1 6 1.5 3 1', '6 2 4 1 5 2', '3 1.5 5 1 4 2'];

/** Every trip gets its own stamp — shape, rotation, tick count, and dash pattern are all
 * derived from the trip id, so the same place always stamps the same way but no two
 * places look identical. */
export function getStampRecipe(
  trip: Pick<Trip, 'id' | 'destination' | 'tripTypes' | 'country'>,
): StampRecipe {
  const hash = hashString(trip.id);

  return {
    shape: SHAPES[hash % SHAPES.length],
    rotation: (hash % 17) - 8,
    tickCount: 22 + (hash % 7) * 2,
    dashPattern: DASH_PATTERNS[hash % DASH_PATTERNS.length],
    iconKey: trip.tripTypes[0] ?? 'default',
    label: shortLabel(trip.destination),
    abbreviation: getAbbreviation(trip.destination, trip.country),
  };
}
