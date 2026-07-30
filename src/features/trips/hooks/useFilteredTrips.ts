import { useMemo, useState } from 'react';
import { useTrips, HOME_LOCATION } from '../../../services/notionAdapter';
import { haversineMiles } from '../../../utils/geo';
import { countryMatchesRegion } from '../../../utils/regions';
import type { Country, Trip, TripType } from '../../../types/travel';
import type { TripFilters } from '../components/FilterPills';

const DEFAULT_FILTERS: TripFilters = { status: 'All', countries: [], tripTypes: [], region: 'All' };

export const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'distance', label: 'Distance from home' },
  { value: 'rating', label: 'Rating' },
  { value: 'priority', label: 'Priority' },
  { value: 'alpha', label: 'A–Z' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

const DEFAULT_SORT: SortOption = 'date-desc';

export type UseFilteredTrips = ReturnType<typeof useFilteredTrips>;

export function useFilteredTrips() {
  const query = useTrips();
  const [filters, setFilters] = useState<TripFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT);

  const trips = query.data ?? [];

  const availableCountries = useMemo(
    () => uniqueSorted(trips.map((t) => t.country).filter((c): c is Country => !!c)),
    [trips],
  );

  const availableTripTypes = useMemo(
    () => uniqueSorted(trips.flatMap((t) => t.tripTypes)) as TripType[],
    [trips],
  );

  const filteredTrips = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = trips.filter((trip) => matchesFilters(trip, filters) && matchesSearch(trip, term));
    return sortTrips(matched, sort);
  }, [trips, filters, search, sort]);

  return {
    ...query,
    trips,
    filteredTrips,
    filters,
    setFilters,
    search,
    setSearch,
    sort,
    setSort,
    availableCountries,
    availableTripTypes,
  };
}

function matchesFilters(trip: Trip, filters: TripFilters): boolean {
  if (filters.status !== 'All' && trip.status !== filters.status) return false;
  if (filters.countries.length > 0 && (!trip.country || !filters.countries.includes(trip.country))) return false;
  if (filters.tripTypes.length > 0 && !filters.tripTypes.some((type) => trip.tripTypes.includes(type))) return false;
  if (filters.region !== 'All' && filters.region !== 'World' && !countryMatchesRegion(trip.country, filters.region)) return false;
  return true;
}

function matchesSearch(trip: Trip, term: string): boolean {
  if (!term) return true;
  return (
    trip.destination.toLowerCase().includes(term) ||
    (trip.notes?.toLowerCase().includes(term) ?? false) ||
    (trip.country?.toLowerCase().includes(term) ?? false)
  );
}

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function sortTrips(trips: Trip[], sort: SortOption): Trip[] {
  const withIndex = trips.map((trip, index) => ({ trip, index }));

  const compare = (a: { trip: Trip; index: number }, b: { trip: Trip; index: number }): number => {
    switch (sort) {
      case 'date-desc':
      case 'date-asc': {
        const aDate = a.trip.dateVisited?.start;
        const bDate = b.trip.dateVisited?.start;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return sort === 'date-desc' ? (aDate < bDate ? 1 : -1) : aDate < bDate ? -1 : 1;
      }
      case 'distance': {
        const aDist = tripDistanceMiles(a.trip);
        const bDist = tripDistanceMiles(b.trip);
        if (aDist == null && bDist == null) return 0;
        if (aDist == null) return 1;
        if (bDist == null) return -1;
        return aDist - bDist;
      }
      case 'rating': {
        const aRating = a.trip.ratingStars ?? -1;
        const bRating = b.trip.ratingStars ?? -1;
        return bRating - aRating;
      }
      case 'priority': {
        const aRank = a.trip.priority ? PRIORITY_RANK[a.trip.priority] : 3;
        const bRank = b.trip.priority ? PRIORITY_RANK[b.trip.priority] : 3;
        return aRank - bRank;
      }
      case 'alpha':
        return a.trip.destination.localeCompare(b.trip.destination);
      default:
        return 0;
    }
  };

  return withIndex
    .slice()
    .sort((a, b) => compare(a, b) || a.index - b.index)
    .map(({ trip }) => trip);
}

function tripDistanceMiles(trip: Trip): number | null {
  if (trip.location?.latitude == null || trip.location?.longitude == null) return null;
  return haversineMiles(HOME_LOCATION, { lat: trip.location.latitude, lng: trip.location.longitude });
}

function uniqueSorted<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}
