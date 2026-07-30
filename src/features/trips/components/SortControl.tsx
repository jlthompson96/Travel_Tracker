import { ArrowUpDown } from 'lucide-react';
import { SORT_OPTIONS, type SortOption } from '../hooks/useFilteredTrips';
import { Pill } from './FilterPills';

interface SortControlProps {
  sort: SortOption;
  onChange: (next: SortOption) => void;
}

export function SortControl({ sort, onChange }: SortControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-slate/60">
        <ArrowUpDown size={12} /> Sort
      </span>
      {SORT_OPTIONS.map((option) => (
        <Pill key={option.value} group="sort" active={sort === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </Pill>
      ))}
    </div>
  );
}
