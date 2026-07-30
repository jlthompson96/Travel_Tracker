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
      className={`relative whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-150 ${
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

export function FilterPills({ filters, onChange, availableCountries, availableTripTypes }: FilterPillsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">Status</span>
        {STATUS_OPTIONS.map((status) => (
          <Pill key={status} group="status" active={filters.status === status} onClick={() => onChange({ ...filters, status })}>
            {status}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">Region</span>
        {REGION_OPTIONS.map((region) => (
          <Pill key={region} group="region" active={filters.region === region} onClick={() => onChange({ ...filters, region })}>
            {region}
          </Pill>
        ))}
      </div>

      {availableTripTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">Trip type</span>
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
        </div>
      )}

      {availableCountries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">Country</span>
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
        </div>
      )}
    </div>
  );
}
