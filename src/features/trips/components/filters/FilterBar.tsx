import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Country, MapRegion, TripFilters, TripType } from '../../../../types/travel';
import type { SortOption } from '../../hooks/useFilteredTrips';
import { EMPTY_FILTERS, activeFilterCount, filterChips } from '../../utils/filterSummary';
import { SearchBar } from '../SearchBar';
import { FilterSheet } from './FilterSheet';
import { SortMenu } from './SortMenu';

interface FilterBarProps {
  filters: TripFilters;
  onChange: (next: TripFilters) => void;
  availableRegions: MapRegion[];
  availableCountries: Country[];
  availableTripTypes: TripType[];
  /** Live match count for the sheet's confirm button. */
  resultCount: number;
  /** Singular noun for that count — "trip", "location", … */
  resultNoun?: string;
  /** Omit to hide the search field entirely (map and timeline don't have one). */
  search?: { value: string; onChange: (next: string) => void };
  /** Omit to hide the sort control (the timeline sorts itself by date). */
  sort?: { value: SortOption; onChange: (next: SortOption) => void };
}

/**
 * The filter surface for every tab: search, a Filters button that opens the
 * sheet, sort, and a chip per active filter.
 *
 * Kept as one component rather than per-page composition specifically because
 * the three pages had already drifted apart when they each assembled their own
 * filter row.
 */
export function FilterBar({
  filters,
  onChange,
  availableRegions,
  availableCountries,
  availableTripTypes,
  resultCount,
  resultNoun = 'trip',
  search,
  sort,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const count = activeFilterCount(filters);
  const chips = filterChips(filters);

  return (
    // A div, not a nav: the mobile audit asserts exactly one nav landmark.
    <div className="no-print flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <div className="min-w-0 flex-1 basis-64">
            <SearchBar value={search.value} onChange={search.onChange} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          aria-label={count > 0 ? `Filters, ${count} active` : 'Filters'}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors max-sm:min-h-touch ${
            count > 0
              ? 'border-ink-navy bg-ink-navy text-cream'
              : 'border-slate/20 bg-surface/50 text-slate hover:border-slate/40 hover:bg-surface/80'
          }`}
        >
          <SlidersHorizontal size={13} aria-hidden />
          <span aria-hidden>Filters</span>
          {count > 0 && (
            <span
              aria-hidden
              className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-cream px-1 text-[11px] text-ink-navy"
            >
              {count}
            </span>
          )}
        </button>

        {sort && <SortMenu value={sort.value} onChange={sort.onChange} />}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <AnimatePresence initial={false}>
            {chips.map((chip) => (
              <motion.button
                key={chip.key}
                type="button"
                layout={false}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={() => onChange(chip.next)}
                aria-label={`Remove ${chip.group} filter ${chip.label}`}
                className="flex items-center gap-1.5 rounded-full border border-ink-navy bg-ink-navy px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-cream max-sm:min-h-touch"
              >
                {chip.label}
                {/* Negative margin + padding grows the hit area to 44pt without
                  * moving the glyph or inflating the chip. */}
                <X size={13} aria-hidden className="max-sm:-m-2 max-sm:p-2" />
              </motion.button>
            ))}
          </AnimatePresence>

          {count >= 2 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-slate underline decoration-slate/40 underline-offset-4 transition-colors hover:text-ink max-sm:min-h-touch"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={onChange}
        availableRegions={availableRegions}
        availableCountries={availableCountries}
        availableTripTypes={availableTripTypes}
        resultCount={resultCount}
        resultNoun={resultNoun}
      />
    </div>
  );
}
