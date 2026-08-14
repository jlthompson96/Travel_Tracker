import type { Country, TripFilters, TripStatus, TripType } from '../../../types/travel';

/**
 * Derived, read-only views of TripFilters for the filter bar: how many filters
 * are active, and one removable chip per active value.
 *
 * Everything here is a pure `TripFilters -> ...` transform. Chips carry the
 * whole `next` filter object rather than an `onRemove` closure, which keeps
 * this module free of React and of the setter.
 *
 * Note that the free-text search is deliberately *not* counted or chipped: it
 * lives in the bar where you can already see it, so folding it into the badge
 * would make the count lie about what the Filters button is hiding.
 */

export const EMPTY_FILTERS: TripFilters = { status: 'All', countries: [], tripTypes: [], region: 'All' };

export type FilterGroup = 'Status' | 'Region' | 'Trip type' | 'Country';

export interface FilterChip {
  key: string;
  group: FilterGroup;
  label: string;
  /** The filter state with just this value removed. */
  next: TripFilters;
}

export function activeFilterCount(filters: TripFilters): number {
  return (
    (filters.status !== 'All' ? 1 : 0) +
    (filters.region !== 'All' ? 1 : 0) +
    filters.countries.length +
    filters.tripTypes.length
  );
}

export function filterChips(filters: TripFilters): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.status !== 'All') {
    chips.push({
      key: `status:${filters.status}`,
      group: 'Status',
      label: filters.status,
      next: { ...filters, status: 'All' },
    });
  }

  if (filters.region !== 'All') {
    chips.push({
      key: `region:${filters.region}`,
      group: 'Region',
      label: filters.region,
      next: { ...filters, region: 'All' },
    });
  }

  for (const type of filters.tripTypes) {
    chips.push({
      key: `tripType:${type}`,
      group: 'Trip type',
      label: type,
      next: { ...filters, tripTypes: filters.tripTypes.filter((t) => t !== type) },
    });
  }

  for (const country of filters.countries) {
    chips.push({
      key: `country:${country}`,
      group: 'Country',
      label: country,
      next: { ...filters, countries: filters.countries.filter((c) => c !== country) },
    });
  }

  return chips;
}

export function toggleStatus(filters: TripFilters, status: TripStatus | 'All'): TripFilters {
  return { ...filters, status };
}

export function toggleTripType(filters: TripFilters, type: TripType): TripFilters {
  return { ...filters, tripTypes: toggleValue(filters.tripTypes, type) };
}

export function toggleCountry(filters: TripFilters, country: Country): TripFilters {
  return { ...filters, countries: toggleValue(filters.countries, country) };
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
