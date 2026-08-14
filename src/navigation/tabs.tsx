import { BookOpen, Clock, LayoutGrid, ListOrdered, Map as MapIcon, Milestone, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Tab = 'dashboard' | 'map' | 'timeline' | 'passport' | 'miles' | 'plan' | 'compare';

export interface TabDef {
  id: Tab;
  /** Full label — the desktop pill row, where there's room for it. */
  label: string;
  /** Bottom-bar label. At ~75px per column and 10px type, "Miles Traveled"
   * can't render; anything longer than one short word has to be shortened. */
  short: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Trips', icon: LayoutGrid },
  { id: 'map', label: 'Map', short: 'Map', icon: MapIcon },
  { id: 'timeline', label: 'Timeline', short: 'Timeline', icon: Clock },
  { id: 'passport', label: 'Passport', short: 'Passport', icon: BookOpen },
  { id: 'miles', label: 'Miles Traveled', short: 'Miles', icon: Milestone },
  { id: 'plan', label: 'Plan', short: 'Plan', icon: ListOrdered },
  { id: 'compare', label: 'Compare', short: 'Compare', icon: Scale },
];

/**
 * The four that get a permanent home on the bottom bar. Apple's HIG caps a tab
 * bar at five items, and the fifth slot here is "More" — so the three left over
 * (Timeline, Plan, Compare) live in the sheet behind it.
 */
export const PRIMARY_TAB_IDS: Tab[] = ['dashboard', 'map', 'passport', 'miles'];

export const PRIMARY_TABS = PRIMARY_TAB_IDS.map(
  (id) => TABS.find((t) => t.id === id)!,
);

export const SECONDARY_TABS = TABS.filter((t) => !PRIMARY_TAB_IDS.includes(t.id));
