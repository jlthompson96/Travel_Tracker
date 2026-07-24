import type { Trip } from '../../../types/travel';

export function formatDateRange(trip: Trip): string | null {
  const dv = trip.dateVisited;
  if (!dv?.start) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!dv.end || dv.end === dv.start) return fmt(dv.start);
  return `${fmt(dv.start)} – ${fmt(dv.end)}${dv.nights ? ` · ${dv.nights} nights` : ''}`;
}
