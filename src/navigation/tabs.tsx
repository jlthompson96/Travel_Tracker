import {
  BarChart3,
  BookOpen,
  Clock,
  LayoutGrid,
  ListOrdered,
  Map as MapIcon,
  Milestone,
  Scale,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Tab =
  | 'dashboard'
  | 'map'
  | 'timeline'
  | 'passport'
  | 'miles'
  | 'insights'
  | 'plan'
  | 'compare'
  | 'review';

export interface TabDef {
  id: Tab;
  /** Full label — the desktop pill row, where there's room for it. */
  label: string;
  /** Bottom-bar label. At ~75px per column and 10px type, "Miles Traveled"
   * can't render; anything longer than one short word has to be shortened. */
  short: string;
  /** URL path. Tabs are real routes, so back/forward and sharing work. */
  path: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Trips', path: '/', icon: LayoutGrid },
  { id: 'map', label: 'Map', short: 'Map', path: '/map', icon: MapIcon },
  { id: 'timeline', label: 'Timeline', short: 'Timeline', path: '/timeline', icon: Clock },
  { id: 'passport', label: 'Passport', short: 'Passport', path: '/passport', icon: BookOpen },
  { id: 'miles', label: 'Miles Traveled', short: 'Miles', path: '/miles', icon: Milestone },
  { id: 'insights', label: 'Insights', short: 'Insights', path: '/insights', icon: BarChart3 },
  { id: 'plan', label: 'Plan', short: 'Plan', path: '/plan', icon: ListOrdered },
  { id: 'compare', label: 'Compare', short: 'Compare', path: '/compare', icon: Scale },
  { id: 'review', label: 'Year Review', short: 'Review', path: '/review', icon: Sparkles },
];

/**
 * The four that get a permanent home on the bottom bar. Apple's HIG caps a tab
 * bar at five items, and the fifth slot here is "More" — so the rest
 * (Timeline, Insights, Plan, Compare) live in the sheet behind it.
 */
export const PRIMARY_TAB_IDS: Tab[] = ['dashboard', 'map', 'passport', 'miles'];

export const PRIMARY_TABS = PRIMARY_TAB_IDS.map(
  (id) => TABS.find((t) => t.id === id)!,
);

export const SECONDARY_TABS = TABS.filter((t) => !PRIMARY_TAB_IDS.includes(t.id));

/**
 * Which tab a URL belongs to. Unknown paths fall back to the dashboard, which
 * is also what the catch-all route in App.tsx renders — so a stale bookmark
 * lands somewhere sensible with the nav in a matching state.
 */
export function tabForPath(pathname: string): Tab {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return TABS.find((t) => t.path === normalized)?.id ?? 'dashboard';
}
