import type { Trip, TripType } from '../../../types/travel';

export type StampShape = 'rings' | 'scallop' | 'hex';

export interface StampRecipe {
  shape: StampShape;
  rotation: number;
  tickCount: number;
  dashPattern: string;
  iconKey: TripType | 'default';
  label: string;
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
export function getStampRecipe(trip: Pick<Trip, 'id' | 'destination' | 'tripTypes'>): StampRecipe {
  const hash = hashString(trip.id);

  return {
    shape: SHAPES[hash % SHAPES.length],
    rotation: (hash % 17) - 8,
    tickCount: 22 + (hash % 7) * 2,
    dashPattern: DASH_PATTERNS[hash % DASH_PATTERNS.length],
    iconKey: trip.tripTypes[0] ?? 'default',
    label: shortLabel(trip.destination),
  };
}
