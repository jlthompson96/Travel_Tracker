/**
 * services/notionAdapter.ts
 *
 * IMPORTANT ARCHITECTURE NOTE
 * ----------------------------------------------------------------------------
 * MCP (the tool that inspected your live schema) only runs inside an
 * Anthropic/Claude session — a deployed browser app can't call it, and it
 * can't call the Notion API directly either: Notion requires a secret
 * integration token and blocks browser CORS requests. So a real deployment
 * needs a thin backend (Node/Express route, or a serverless function) that:
 *   1. holds the Notion integration token server-side
 *   2. calls `POST https://api.notion.com/v1/data_sources/{id}/query`
 *      (data source id: 1b1d8fd9-c723-4201-b1fc-5968d59e658a)
 *   3. returns the raw JSON to this adapter unchanged
 *
 * This file is written against that contract: `fetchTravelTrackerData()` calls
 * "/api/notion/travel-tracker" and hands the response to the pure transformer.
 * That one URL works in both environments — vite.config.ts serves it from
 * api/notion/travel-tracker.ts in dev, and Vercel deploys the same file as a
 * function in production. Data is therefore live on every load; the old
 * build-time JSON snapshot (and the weekly cron that refreshed it) is gone.
 * Swap the fetch body for a mock/fixture in tests or Storybook without
 * touching any component.
 * ----------------------------------------------------------------------------
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  NotionQueryResponse,
  RatingStars,
  Trip,
  TripDateRange,
  TripPriority,
  TripStats,
  TripStatus,
  TripType,
} from '../types/travel';
import { transformNotionPages } from '../utils/transformNotionData';
import { haversineMiles, type LatLng } from '../utils/geo';
import { readWriteToken } from '../lib/writeToken';

/** Origin point for the "Miles Traveled" stat — no home-base property exists in Notion, so this is hardcoded. */
export const HOME_LOCATION: LatLng = { lat: 35.0072, lng: -80.9451 }; // Fort Mill, SC

const PROXY_URL = import.meta.env.VITE_NOTION_PROXY_URL ?? '/api/notion/travel-tracker';
const WRITE_URL = '/api/notion/trip';

/** The query key every read goes through — writes invalidate exactly this. */
export const TRIPS_QUERY_KEY = ['notion', 'travel-tracker'] as const;

export class NotionFetchError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'NotionFetchError';
  }
}

export async function fetchTravelTrackerData(): Promise<Trip[]> {
  const res = await fetch(PROXY_URL, { headers: { Accept: 'application/json' } });

  if (!res.ok) {
    throw new NotionFetchError(`Failed to load Travel Tracker (${res.status})`, res.status);
  }

  const text = await res.text();
  let data: NotionQueryResponse;

  try {
    data = JSON.parse(text) as NotionQueryResponse;
  } catch {
    throw new NotionFetchError('Travel Tracker proxy returned invalid JSON', res.status);
  }

  if (!Array.isArray(data.results)) {
    throw new NotionFetchError('Travel Tracker proxy response was missing results', res.status);
  }

  return transformNotionPages(data.results);
}

/** TanStack Query hook — the one place components should read trip data from. */
export function useTrips() {
  return useQuery({
    queryKey: TRIPS_QUERY_KEY,
    queryFn: fetchTravelTrackerData,
    staleTime: 5 * 60 * 1000, // Notion data doesn't change every second — 5 min is a fair default
    retry: 1,
  });
}

// ---------------------------------------------------------------------------
// Writes — see api/notion/trip.ts for the server side.
// ---------------------------------------------------------------------------

/** The fields a trip can be edited through. Mirrors TripPatch in api/notion/trip.ts. */
export interface TripPatch {
  status?: TripStatus | null;
  ratingStars?: RatingStars | null;
  priority?: TripPriority | null;
  notes?: string | null;
  dateVisited?: { start: string; end?: string | null } | null;
}

export class TripUpdateError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'TripUpdateError';
  }
}

/** Applies a patch to the cached Trip so the UI can update before Notion confirms. */
function applyPatch(trip: Trip, patch: TripPatch): Trip {
  const next: Trip = { ...trip };
  if ('status' in patch) next.status = patch.status ?? null;
  if ('ratingStars' in patch) next.ratingStars = patch.ratingStars ?? null;
  if ('priority' in patch) next.priority = patch.priority ?? null;
  if ('notes' in patch) next.notes = patch.notes || null;
  if ('dateVisited' in patch) {
    next.dateVisited = patch.dateVisited
      ? toDateRange(patch.dateVisited.start, patch.dateVisited.end ?? null)
      : null;
  }
  return next;
}

/** Mirrors parseDateRange's nights math so the optimistic value matches the refetch. */
function toDateRange(start: string, end: string | null): TripDateRange {
  const nights = end
    ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  return { start, end, isDateTime: start.includes('T'), nights: nights !== null && nights >= 0 ? nights : null };
}

/**
 * Edits one trip in Notion.
 *
 * Optimistic: the cache updates immediately and rolls back if the request
 * fails, because a star rating that waits ~800ms on a Notion round-trip feels
 * broken. The settle-time invalidate is what reconciles anything Notion
 * normalized differently from our guess.
 */
export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TripPatch }) => {
      const token = readWriteToken();
      if (!token) throw new TripUpdateError('Unlock the site before editing.', 401);

      const res = await fetch(WRITE_URL, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-tt-token': token },
        body: JSON.stringify({ id, patch }),
      });

      if (!res.ok) {
        const message = await res
          .json()
          .then((b: { error?: string }) => b.error)
          .catch(() => null);
        throw new TripUpdateError(message ?? `Update failed (${res.status})`, res.status);
      }
      return res.json();
    },

    onMutate: async ({ id, patch }) => {
      // Stop an in-flight refetch from landing on top of the optimistic value.
      await queryClient.cancelQueries({ queryKey: TRIPS_QUERY_KEY });
      const previous = queryClient.getQueryData<Trip[]>(TRIPS_QUERY_KEY);

      queryClient.setQueryData<Trip[]>(TRIPS_QUERY_KEY, (trips) =>
        trips?.map((trip) => (trip.id === id ? applyPatch(trip, patch) : trip)),
      );

      return { previous };
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TRIPS_QUERY_KEY, context.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Derived stats — powers features/stats.
// ---------------------------------------------------------------------------

const ALL_TRIP_TYPES: TripType[] = ['Beach', 'City', 'Hiking', 'Food', 'Road Trip', 'Culture'];
const ALL_RATINGS: RatingStars[] = [1, 2, 3, 4, 5];

export function computeTripStats(trips: Trip[]): TripStats {
  const byCountry: Record<string, number> = {};
  const byTripType = Object.fromEntries(ALL_TRIP_TYPES.map((t) => [t, 0])) as Record<TripType, number>;
  const byRating = Object.fromEntries(ALL_RATINGS.map((r) => [r, 0])) as Record<RatingStars, number>;
  const byYear: Record<string, number> = {};

  let totalBeenThere = 0;
  let totalBucketList = 0;
  const visitedCountries = new Set<string>();
  const bucketCountries = new Set<string>();
  let milesTraveled = 0;

  for (const trip of trips) {
    if (trip.status === 'Been There') {
      totalBeenThere += 1;
      if (trip.country) visitedCountries.add(trip.country);
      if (trip.location?.latitude != null && trip.location?.longitude != null) {
        milesTraveled += 2 * haversineMiles(HOME_LOCATION, { lat: trip.location.latitude, lng: trip.location.longitude });
      }
    } else if (trip.status === 'Bucket List') {
      totalBucketList += 1;
      if (trip.country) bucketCountries.add(trip.country);
    }

    if (trip.country) byCountry[trip.country] = (byCountry[trip.country] ?? 0) + 1;
    for (const type of trip.tripTypes) byTripType[type] += 1;
    if (trip.ratingStars) byRating[trip.ratingStars] += 1;

    if (trip.dateVisited?.start) {
      const year = trip.dateVisited.start.slice(0, 4);
      byYear[year] = (byYear[year] ?? 0) + 1;
    }
  }

  return {
    totalBeenThere,
    totalBucketList,
    countriesVisited: visitedCountries.size,
    countriesOnBucketList: bucketCountries.size,
    byCountry,
    byTripType,
    byRating,
    byYear,
    milesTraveled: Math.round(milesTraveled),
  };
}
