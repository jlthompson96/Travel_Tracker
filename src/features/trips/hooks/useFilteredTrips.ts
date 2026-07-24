import { useMemo, useState } from 'react';
import { useTrips } from '../../../services/notionAdapter';
import type { Country, Trip, TripType } from '../../../types/travel';
import type { TripFilters } from '../components/FilterPills';

const DEFAULT_FILTERS: TripFilters = { status: 'All', country: 'All', tripType: 'All', region: 'All' };

export type UseFilteredTrips = ReturnType<typeof useFilteredTrips>;

export function useFilteredTrips() {
  const query = useTrips();
  const [filters, setFilters] = useState<TripFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');

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
    return trips.filter((trip) => matchesFilters(trip, filters) && matchesSearch(trip, term));
  }, [trips, filters, search]);

  return {
    ...query,
    trips,
    filteredTrips,
    filters,
    setFilters,
    search,
    setSearch,
    availableCountries,
    availableTripTypes,
  };
}

function matchesFilters(trip: Trip, filters: TripFilters): boolean {
  if (filters.status !== 'All' && trip.status !== filters.status) return false;
  if (filters.country !== 'All' && trip.country !== filters.country) return false;
  if (filters.tripType !== 'All' && !trip.tripTypes.includes(filters.tripType)) return false;
  if (filters.region !== 'All' && filters.region !== 'World' && !matchesRegion(trip, filters.region)) return false;
  return true;
}

function matchesRegion(trip: Trip, region: Exclude<TripFilters['region'], 'All' | 'World'>): boolean {
  const country = trip.country?.toLowerCase() ?? '';
  const regionMap: Record<Exclude<TripFilters['region'], 'All' | 'World'>, string[]> = {
    Europe: ['greece', 'italy', 'france', 'spain', 'portugal', 'germany', 'iceland', 'ireland', 'hungary', 'bulgaria', 'ukraine', 'vatican city'],
    'North America': ['usa', 'mexico', 'canada'],
    'South America': ['argentina', 'brazil', 'chile', 'peru', 'colombia', 'ecuador', 'uruguay', 'paraguay', 'bolivia'],
    Asia: ['japan', 'thailand', 'india', 'china', 'singapore', 'malaysia', 'taiwan', 'south korea', 'vietnam'],
    Africa: ['morocco', 'egypt', 'south africa', 'kenya', 'tanzania', 'nigeria', 'ethiopia'],
    Oceania: ['australia', 'new zealand', 'fiji', 'papua new guinea'],
  };

  return regionMap[region].some((name) => country.includes(name));
}

function matchesSearch(trip: Trip, term: string): boolean {
  if (!term) return true;
  return (
    trip.destination.toLowerCase().includes(term) ||
    (trip.notes?.toLowerCase().includes(term) ?? false) ||
    (trip.country?.toLowerCase().includes(term) ?? false)
  );
}

function uniqueSorted<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}
