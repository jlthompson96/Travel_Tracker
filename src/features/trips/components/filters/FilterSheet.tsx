import { useId } from 'react';
import { Check } from 'lucide-react';
import { Sheet } from '../../../../components/Sheet';
import type { Country, MapRegion, TripFilters, TripStatus, TripType } from '../../../../types/travel';
import { EMPTY_FILTERS, activeFilterCount, toggleCountry, toggleStatus, toggleTripType } from '../../utils/filterSummary';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: TripFilters;
  onChange: (next: TripFilters) => void;
  availableRegions: MapRegion[];
  availableCountries: Country[];
  availableTripTypes: TripType[];
  /** Live count of what the current filters match, shown on the confirm button. */
  resultCount: number;
  resultNoun: string;
}

const STATUS_OPTIONS: Array<TripStatus | 'All'> = ['All', 'Been There', 'Bucket List'];

export function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  availableRegions,
  availableCountries,
  availableTripTypes,
  resultCount,
  resultNoun,
}: FilterSheetProps) {
  const count = activeFilterCount(filters);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            disabled={count === 0}
            className="flex min-h-touch items-center rounded-full px-4 font-mono text-xs uppercase tracking-wide text-slate transition-colors hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-touch flex-1 items-center justify-center rounded-full bg-ink-navy px-5 font-mono text-xs uppercase tracking-wide text-cream transition-opacity hover:opacity-90 sm:flex-none"
          >
            Show {resultCount} {resultCount === 1 ? resultNoun : `${resultNoun}s`}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Group label="Status">
          {STATUS_OPTIONS.map((status) => (
            <OptionRow
              key={status}
              label={status}
              selected={filters.status === status}
              onClick={() => onChange(toggleStatus(filters, status))}
            />
          ))}
        </Group>

        {availableRegions.length > 0 && (
          <Group label="Region">
            <OptionRow
              label="All"
              selected={filters.region === 'All'}
              onClick={() => onChange({ ...filters, region: 'All' })}
            />
            {availableRegions.map((region) => (
              <OptionRow
                key={region}
                label={region}
                selected={filters.region === region}
                onClick={() => onChange({ ...filters, region })}
              />
            ))}
          </Group>
        )}

        {availableTripTypes.length > 0 && (
          <Group label="Trip type">
            <OptionRow
              label="All"
              selected={filters.tripTypes.length === 0}
              onClick={() => onChange({ ...filters, tripTypes: [] })}
            />
            {availableTripTypes.map((type) => (
              <OptionRow
                key={type}
                label={type}
                selected={filters.tripTypes.includes(type)}
                onClick={() => onChange(toggleTripType(filters, type))}
              />
            ))}
          </Group>
        )}

        {availableCountries.length > 0 && (
          <Group label="Country">
            <OptionRow
              label="All"
              selected={filters.countries.length === 0}
              onClick={() => onChange({ ...filters, countries: [] })}
            />
            {availableCountries.map((country) => (
              <OptionRow
                key={country}
                label={country}
                selected={filters.countries.includes(country)}
                onClick={() => onChange(toggleCountry(filters, country))}
              />
            ))}
          </Group>
        )}
      </div>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section>
      <h3 id={id} className="mb-1 font-mono text-[11px] uppercase tracking-wide text-slate">
        {label}
      </h3>
      <div role="group" aria-labelledby={id} className="flex flex-col">
        {children}
      </div>
    </section>
  );
}

/** Deliberately not the Pill component: these render inside a portal, and a
 * shared `layoutId` between a portaled row and anything in the page would
 * animate the highlight across the whole viewport. */
function OptionRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-lg px-4 text-left font-mono text-sm uppercase tracking-wide transition-colors ${
        selected ? 'bg-ink-navy text-cream' : 'text-slate hover:bg-surface'
      }`}
    >
      <span className="flex-1">{label}</span>
      {selected && <Check size={16} className="shrink-0" />}
    </button>
  );
}
