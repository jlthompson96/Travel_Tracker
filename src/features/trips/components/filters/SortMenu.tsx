import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { SORT_OPTIONS, type SortOption } from '../../hooks/useFilteredTrips';

interface SortMenuProps {
  value: SortOption;
  onChange: (next: SortOption) => void;
}

/**
 * A native <select> wearing the pill costume.
 *
 * Native buys keyboard nav, type-ahead, the iOS wheel picker, and correct
 * screen-reader semantics for nothing; a hand-rolled listbox would re-litigate
 * focus management that Sheet already solves for the modal case.
 */
export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <div className="relative inline-flex shrink-0 items-center">
      <ArrowUpDown
        size={13}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate"
      />
      <select
        value={value}
        aria-label="Sort trips"
        onChange={(e) => onChange(e.target.value as SortOption)}
        // 16px on phones, like SearchBar — Safari zooms the page on select
        // focus too, not just text inputs.
        className="appearance-none rounded-full border border-slate/20 bg-surface/50 py-1.5 pl-9 pr-8 font-mono text-xs uppercase tracking-wide text-slate transition-colors hover:border-slate/40 hover:bg-surface/80 max-sm:min-h-touch max-sm:text-base"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate"
      />
    </div>
  );
}
