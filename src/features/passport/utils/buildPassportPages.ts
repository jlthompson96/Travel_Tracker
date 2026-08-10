import type { Trip } from '../../../types/travel';
import { groupTripsByLocation, locationKey } from '../../../utils/groupTrips';

/** How many stamps fit on one passport page before it spills onto the next. */
export const STAMPS_PER_PAGE = 4;

/** Bucket for trips with no Date Visited — they still earned a stamp, they just
 * can't be filed under a year. */
export const UNDATED_YEAR = 'UNDATED';

export interface PassportEntry {
  /** The single visit this stamp represents. */
  trip: Trip;
  /** Every visit to the same place, so the detail modal's visit switcher works. */
  visits: Trip[];
}

export type PassportPage =
  | { kind: 'cover' }
  | {
      kind: 'data';
      stampCount: number;
      countryCount: number;
      milesTraveled: number;
      firstYear: string | null;
    }
  | {
      kind: 'stamps';
      year: string;
      entries: PassportEntry[];
      /** True on the 2nd+ page of a year that spilled, so the header can say so
       * instead of looking like the same year started over. */
      continued: boolean;
    }
  | { kind: 'blank' }
  | { kind: 'back' };

interface BuildOptions {
  countryCount: number;
  milesTraveled: number;
}

/**
 * Turns the trip list into the physical pages of a passport book.
 *
 * Every *visit* gets its own stamp, the way a real passport collects one imprint
 * per border crossing — going back to the same place twice fills two slots. The
 * location grouping is used only to hand each stamp the full visit list, so
 * clicking any of them opens the detail modal on the right place with its
 * switcher intact.
 */
export function buildPassportPages(trips: Trip[], options: BuildOptions): PassportPage[] {
  const beenThere = trips.filter((trip) => trip.status === 'Been There');

  // key -> every visit to that place, so a stamp can carry its siblings.
  const visitsByPlace = new Map<string, Trip[]>();
  for (const group of groupTripsByLocation(beenThere)) {
    visitsByPlace.set(group.key, group.trips);
  }

  const ordered = sortChronologically(beenThere);
  const entries: PassportEntry[] = ordered.map((trip) => ({
    trip,
    visits: visitsByPlace.get(locationKey(trip)) ?? [trip],
  }));

  const stampPages = entries.length > 0 ? paginate(entries) : [emptyStampPage()];

  const firstDated = ordered.find((trip) => trip.dateVisited?.start);

  const pages: PassportPage[] = [
    { kind: 'cover' },
    {
      kind: 'data',
      stampCount: entries.length,
      countryCount: options.countryCount,
      milesTraveled: options.milesTraveled,
      firstYear: firstDated?.dateVisited?.start?.slice(0, 4) ?? null,
    },
    ...stampPages,
    { kind: 'back' },
  ];

  // Leaves are two-sided, so an odd page count would leave the back cover
  // sharing a leaf with a stamp page. Pad in front of it instead.
  if (pages.length % 2 !== 0) pages.splice(pages.length - 1, 0, { kind: 'blank' });

  return pages;
}

export interface PassportSpread {
  left: PassportPage | null;
  right: PassportPage | null;
  /** 1-based, so printed corner numbers match the ones in the book. */
  leftNumber: number;
  rightNumber: number;
}

/**
 * The book as a reader actually sees it: the cover on its own, then facing
 * pairs, then the back cover on its own. `buildPassportPages` always returns an
 * even page count, so every interior pair lands cleanly as (1,2), (3,4), …
 *
 * The interactive book doesn't need this — it thinks in two-sided leaves — but
 * anything laying the book out flat (printing) needs the spreads.
 */
export function toSpreads(pages: PassportPage[]): PassportSpread[] {
  if (pages.length === 0) return [];

  const last = pages.length - 1;
  const spreads: PassportSpread[] = [{ left: null, right: pages[0], leftNumber: 0, rightNumber: 1 }];

  for (let i = 1; i < last; i += 2) {
    spreads.push({
      left: pages[i],
      right: pages[i + 1] ?? null,
      leftNumber: i + 1,
      rightNumber: i + 2,
    });
  }

  spreads.push({ left: pages[last], right: null, leftNumber: last + 1, rightNumber: 0 });

  return spreads;
}

function emptyStampPage(): PassportPage {
  return { kind: 'stamps', year: '', entries: [], continued: false };
}

/** Oldest first — you page forward through the book the way the trips happened.
 * Undated trips sink to the back rather than being dropped. */
function sortChronologically(trips: Trip[]): Trip[] {
  return trips.slice().sort((a, b) => {
    const aStart = a.dateVisited?.start;
    const bStart = b.dateVisited?.start;
    if (!aStart && !bStart) return a.destination.localeCompare(b.destination);
    if (!aStart) return 1;
    if (!bStart) return -1;
    if (aStart === bStart) return a.destination.localeCompare(b.destination);
    return aStart < bStart ? -1 : 1;
  });
}

/** Groups into years, then splits each year across as many pages as it needs, so
 * a page never mixes two years and a year never silently truncates. */
function paginate(entries: PassportEntry[]): PassportPage[] {
  const byYear = new Map<string, PassportEntry[]>();

  for (const entry of entries) {
    const start = entry.trip.dateVisited?.start;
    const year = start ? start.slice(0, 4) : UNDATED_YEAR;
    const bucket = byYear.get(year);
    if (bucket) bucket.push(entry);
    else byYear.set(year, [entry]);
  }

  const pages: PassportPage[] = [];
  for (const [year, yearEntries] of byYear) {
    for (let i = 0; i < yearEntries.length; i += STAMPS_PER_PAGE) {
      pages.push({
        kind: 'stamps',
        year,
        entries: yearEntries.slice(i, i + STAMPS_PER_PAGE),
        continued: i > 0,
      });
    }
  }

  return pages;
}
