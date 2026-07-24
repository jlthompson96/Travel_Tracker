import { motion } from 'framer-motion';
import type { Country, MapRegion, TripStatus, TripType } from '../../../types/travel';

export interface TripFilters {
  status: TripStatus | 'All';
  country: Country | 'All';
  tripType: TripType | 'All';
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

function Pill({
  active,
  onClick,
  children,
  group,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  group: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-150 ${
        active
          ? 'border-ink-navy text-paper'
          : 'border-slate/20 bg-white/50 text-slate/70 hover:border-slate/40 hover:bg-white/80'
      }`}
    >
      {active && (
        <motion.span
          layoutId={`pill-active-${group}`}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute inset-0 z-0 rounded-full bg-ink-navy"
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
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
          <Pill group="tripType" active={filters.tripType === 'All'} onClick={() => onChange({ ...filters, tripType: 'All' })}>
            All
          </Pill>
          {availableTripTypes.map((type) => (
            <Pill key={type} group="tripType" active={filters.tripType === type} onClick={() => onChange({ ...filters, tripType: type })}>
              {type}
            </Pill>
          ))}
        </div>
      )}

      {availableCountries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">Country</span>
          <Pill group="country" active={filters.country === 'All'} onClick={() => onChange({ ...filters, country: 'All' })}>
            All
          </Pill>
          {availableCountries.map((country) => (
            <Pill key={country} group="country" active={filters.country === country} onClick={() => onChange({ ...filters, country })}>
              {country}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}
