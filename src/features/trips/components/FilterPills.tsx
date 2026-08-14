import { motion } from 'framer-motion';
import type { Country, MapRegion, TripStatus, TripType } from '../../../types/travel';

export interface TripFilters {
  status: TripStatus | 'All';
  /** Empty array means "All" — multiple countries can be selected at once. */
  countries: Country[];
  /** Empty array means "All" — multiple trip types can be selected at once. */
  tripTypes: TripType[];
  region: MapRegion | 'All';
}

interface FilterPillsProps {
  filters: TripFilters;
  onChange: (next: TripFilters) => void;
  /** Countries actually present in the current data set, in frequency order. */
  availableCountries: Country[];
  availableTripTypes: TripType[];
}

const STATUS_OPTIONS: Array<TripStatus | 'All'> = ['All', 'Been There', 'Bucket List'];
const REGION_OPTIONS: Array<MapRegion | 'All'> = ['All', 'World', 'Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania'];

export function Pill({
  active,
  onClick,
  children,
  group,
  /** Multi-select pills can be active simultaneously, so they can't share one
   * animated background — each gets its own static fill instead of the
   * single-select groups' sliding `layoutId` highlight. */
  multi = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  group: string;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // inline-flex + items-center is what lets min-height actually take on a
      // button whose content is a single inline span.
      className={`relative whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-150 max-sm:inline-flex max-sm:min-h-touch max-sm:items-center max-sm:px-4 ${
        active
          ? 'border-ink-navy text-cream'
          : 'border-slate/20 bg-surface/50 text-slate/70 hover:border-slate/40 hover:bg-surface/80'
      }`}
    >
      {active &&
        (multi ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-0 rounded-full bg-ink-navy"
          />
        ) : (
          <motion.span
            layoutId={`pill-active-${group}`}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="absolute inset-0 z-0 rounded-full bg-ink-navy"
          />
        ))}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * A long option row: wraps on desktop exactly as before, scrolls sideways on
 * phones.
 *
 * `contents` is what keeps desktop untouched — the wrapper disappears from
 * layout entirely, so the pills stay direct flex children of the row and wrap
 * against the label the way they always have. Below `sm` it becomes a real flex
 * container, and the negative margin plus matching padding lets the scroll
 * track bleed to the screen edge (the usual iOS affordance) without fighting
 * the page's own edge padding.
 */
function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-allow-x-scroll
      className="contents max-sm:-mx-6 max-sm:flex max-sm:min-w-0 max-sm:flex-1 max-sm:flex-nowrap max-sm:items-center max-sm:gap-2 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:px-6 max-sm:pb-1"
    >
      {children}
    </div>
  );
}

export function FilterPills({ filters, onChange, availableCountries, availableTripTypes }: FilterPillsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">Status</span>
        {STATUS_OPTIONS.map((status) => (
          <Pill key={status} group="status" active={filters.status === status} onClick={() => onChange({ ...filters, status })}>
            {status}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">Region</span>
        <ScrollRow>
          {REGION_OPTIONS.map((region) => (
            <Pill key={region} group="region" active={filters.region === region} onClick={() => onChange({ ...filters, region })}>
              {region}
            </Pill>
          ))}
        </ScrollRow>
      </div>

      {availableTripTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">Trip type</span>
          <ScrollRow>
            <Pill group="tripType" active={filters.tripTypes.length === 0} onClick={() => onChange({ ...filters, tripTypes: [] })}>
              All
            </Pill>
            {availableTripTypes.map((type) => (
              <Pill
                key={type}
                group="tripType"
                multi
                active={filters.tripTypes.includes(type)}
                onClick={() => onChange({ ...filters, tripTypes: toggleValue(filters.tripTypes, type) })}
              >
                {type}
              </Pill>
            ))}
          </ScrollRow>
        </div>
      )}

      {availableCountries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">Country</span>
          <ScrollRow>
            <Pill group="country" active={filters.countries.length === 0} onClick={() => onChange({ ...filters, countries: [] })}>
              All
            </Pill>
            {availableCountries.map((country) => (
              <Pill
                key={country}
                group="country"
                multi
                active={filters.countries.includes(country)}
                onClick={() => onChange({ ...filters, countries: toggleValue(filters.countries, country) })}
              >
                {country}
              </Pill>
            ))}
          </ScrollRow>
        </div>
      )}
    </div>
  );
}
