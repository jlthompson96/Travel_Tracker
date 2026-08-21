import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Droplet, Moon, Sun } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useReduceTransparency } from './hooks/useReduceTransparency';
import { useMediaQuery } from './hooks/useMediaQuery';
import { BottomTabBar } from './components/BottomTabBar';
import { TABS, tabForPath } from './navigation/tabs';
import { InsightsPage } from './features/stats/components/InsightsPage';
import { TripDashboard } from './features/trips/components/TripDashboard';
import { TravelMap } from './features/map/components/TravelMap';
import { MapPage } from './features/map/components/MapPage';
import { TripStats } from './features/stats/components/TripStats';
import { MilesPage } from './features/stats/components/MilesPage';
import { TripTimeline } from './features/itinerary/components/TripTimeline';
import { TimelinePage } from './features/itinerary/components/TimelinePage';
import { PassportPage } from './features/passport/components/PassportPage';
import { PlanPage } from './features/planning/components/PlanPage';
import { ComparePage } from './features/compare/components/ComparePage';
import { TripDetailModal } from './features/trips/components/TripDetails/TripDetailModal';
import { useFilteredTrips } from './features/trips/hooks/useFilteredTrips';

/** Read once at mount: a `?trip=<id>` in the URL means someone opened a shared
 * link (see TripDetailModal's share-link/URL-sync behavior). */
function useDeepLinkedTripId(): string | null {
  const [id] = useState(() => new URLSearchParams(window.location.search).get('trip'));
  return id;
}

function TabButton({
  active,
  to,
  icon,
  children,
}: {
  active: boolean;
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors duration-150 ${
        active
          ? 'border-ink-navy text-cream'
          : 'border-slate/20 bg-surface/50 text-slate/70 hover:border-slate/40 hover:bg-surface/80'
      }`}
    >
      {active && (
        <motion.span
          layoutId="main-tab-active"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute inset-0 z-0 rounded-full bg-ink-navy"
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        {children}
      </span>
    </Link>
  );
}

export default function App() {
  const filtering = useFilteredTrips();
  // Tabs are routes now, so the active one is derived from the URL rather than
  // held in state — that's what makes back/forward and shared links work.
  const tab = tabForPath(useLocation().pathname);
  const { theme, toggleTheme } = useTheme();
  const { reduced, toggleReduced } = useReduceTransparency();
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const deepLinkedTripId = useDeepLinkedTripId();
  const [deepLinkOpen, setDeepLinkOpen] = useState(true);
  const deepLinkedTrip = deepLinkedTripId ? filtering.trips.find((t) => t.id === deepLinkedTripId) : undefined;

  return (
    <div className="min-h-screen bg-paper max-sm:min-h-dvh">
      <header className="px-edge relative overflow-hidden border-b-4 border-brass bg-ink-navy py-10 text-cream max-sm:py-6 sm:py-12">
        {/* The theme toggle is last in the row and the row is right-anchored, so
          * with the transparency button hidden on desktop it lands on exactly
          * the same pixel it always has. */}
        <div className="no-print absolute right-6 top-6 z-10 flex items-center gap-2 max-sm:right-4 max-sm:top-4 sm:right-10 sm:top-8">
          {/* Glass only exists on phones, so this control does too. It is the
            * only way to turn the effect off on iOS 17, where the OS-level
            * prefers-reduced-transparency query does not exist. */}
          <button
            type="button"
            onClick={toggleReduced}
            aria-pressed={reduced}
            aria-label={reduced ? 'Turn translucency back on' : 'Reduce translucency'}
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-cream/20 bg-cream/10 text-cream transition-colors hover:bg-cream/20 max-sm:flex"
          >
            <Droplet size={16} className={reduced ? 'opacity-40' : undefined} />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 bg-cream/10 text-cream transition-colors hover:bg-cream/20 max-sm:h-11 max-sm:w-11"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #F7F2E7 1.5px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 text-brass/10 sm:-right-4 sm:-top-6"
          initial={{ rotate: -18, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <Compass size={180} strokeWidth={0.75} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative font-mono text-xs uppercase tracking-[0.2em] text-brass"
        >
          Travel Tracker
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="relative mt-1 max-w-xl font-display text-3xl font-semibold leading-tight max-sm:text-2xl sm:text-4xl"
        >
          Joey and Sarah's Travel Tracker
        </motion.h1>
      </header>

      {/* One nav or the other, never both — rendering both and hiding one with
        * `sm:hidden` would duplicate the nav landmark and every tab button in
        * the accessibility tree, and would register `layoutId` twice. */}
      {isDesktop ? (
        <nav aria-label="Main" className="px-edge no-print mx-auto flex max-w-6xl flex-wrap gap-2 pt-6">
          {TABS.map(({ id, label, path, icon: Icon }) => (
            <TabButton key={id} active={tab === id} to={path} icon={<Icon size={14} />}>
              {label}
            </TabButton>
          ))}
        </nav>
      ) : (
        <BottomTabBar tab={tab} />
      )}

      {/* The extra bottom padding clears the fixed tab bar so the last card in
        * any tab isn't trapped underneath it. */}
      <main className="px-edge mx-auto flex max-w-6xl flex-col gap-10 py-10 max-sm:pb-[calc(var(--tabbar-total)_+_2.5rem)]">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <TripStats />

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
                  <TripDashboard {...filtering} />
                  <aside className="flex flex-col gap-10">
                    <section>
                      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Map</h2>
                      <TravelMap
                        data={filtering.filteredTrips}
                        isLoading={filtering.isLoading}
                        isError={filtering.isError}
                        filters={filtering.filters}
                      />
                    </section>
                    <section>
                      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Timeline</h2>
                      <TripTimeline />
                    </section>
                  </aside>
                </div>
              </>
            }
          />
          <Route path="/map" element={<MapPage {...filtering} />} />
          <Route path="/timeline" element={<TimelinePage {...filtering} />} />
          <Route path="/passport" element={<PassportPage />} />
          <Route path="/miles" element={<MilesPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/compare" element={<ComparePage />} />
          {/* Stale bookmarks land on the dashboard rather than a blank page.
            * `replace` so back doesn't bounce straight into the dead URL. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {deepLinkedTrip && (
        <TripDetailModal trip={deepLinkedTrip} open={deepLinkOpen} onClose={() => setDeepLinkOpen(false)} />
      )}
    </div>
  );
}
