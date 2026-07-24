import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search destinations or notes…"
        className="w-full rounded-full border border-slate/20 bg-white/60 py-2 pl-9 pr-4 text-sm text-slate placeholder:text-slate/40 focus:border-brass"
      />
    </div>
  );
}
