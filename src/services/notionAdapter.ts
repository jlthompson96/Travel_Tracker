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
 * This file is written against that contract: `fetchTravelTrackerData()`
 * calls `VITE_NOTION_PROXY_URL` (defaults to "/api/notion/travel-tracker" in
 * dev, where vite.config.ts proxies it to api/notion/travel-tracker.ts) and
 * hands the response to the pure transformer. GitHub Pages can't run that
 * proxy or hold the token, so production builds instead default to a static
 * JSON snapshot written by scripts/fetch-notion-data.mjs during `npm run
 * build` — same response shape, so the transformer doesn't know the
 * difference. Swap the fetch body for a mock/fixture in tests or Storybook
 * without touching any component.
 * ----------------------------------------------------------------------------
 */

import { useQuery } from '@tanstack/react-query';
import type { NotionQueryResponse, RatingStars, Trip, TripStats, TripType } from '../types/travel';
import { transformNotionPages } from '../utils/transformNotionData';
import { haversineMiles, type LatLng } from '../utils/geo';

/** Origin point for the "Miles Traveled" stat — no home-base property exists in Notion, so this is hardcoded. */
export const HOME_LOCATION: LatLng = { lat: 35.0072, lng: -80.9451 }; // Fort Mill, SC

const PROXY_URL =
  import.meta.env.VITE_NOTION_PROXY_URL ??
  (import.meta.env.DEV ? '/api/notion/travel-tracker' : `${import.meta.env.BASE_URL}data/travel-tracker.json`);

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
    queryKey: ['notion', 'travel-tracker'],
    queryFn: fetchTravelTrackerData,
    staleTime: 5 * 60 * 1000, // Notion data doesn't change every second — 5 min is a fair default
    retry: 1,
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
