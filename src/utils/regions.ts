import type { Country, MapRegion } from '../types/travel';

/** Alias kept for readability at call sites; MapRegion is continents-only. */
export type Region = MapRegion;

/** Single source of truth for country -> region/continent, covering every value in
 * COUNTRY_OPTIONS. Previously this list was duplicated (and out of sync) across
 * useFilteredTrips.ts and TravelMap.tsx.
 *
 * Deliberately typed as a partial lookup: `Country` is now an open string (data
 * is live from Notion, so a country can appear here that this map has never
 * heard of). An unmapped country falls out of region filtering rather than
 * crashing — see regionForCountry. Add new entries here when they show up. */
export const COUNTRY_REGIONS: Partial<Record<Country, Region>> = {
  USA: 'North America',
  Mexico: 'North America',
  'Costa Rica': 'North America',
  'St. Vincent and the Grenadines': 'North America',
  Greece: 'Europe',
  Italy: 'Europe',
  France: 'Europe',
  Spain: 'Europe',
  Portugal: 'Europe',
  Germany: 'Europe',
  Iceland: 'Europe',
  Ireland: 'Europe',
  Hungary: 'Europe',
  Bulgaria: 'Europe',
  Ukraine: 'Europe',
  'Vatican City': 'Europe',
  Scotland: 'Europe',
  England: 'Europe',
  Japan: 'Asia',
  Thailand: 'Asia',
  'New Zealand': 'Oceania',
  Australia: 'Oceania',
};

export const ALL_REGIONS: Region[] = ['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania'];

export function regionForCountry(country: Country | null | undefined): Region | null {
  return country ? COUNTRY_REGIONS[country] ?? null : null;
}

export function countryMatchesRegion(country: Country | null | undefined, region: Region): boolean {
  return regionForCountry(country) === region;
}
