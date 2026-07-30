import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Compass, LayoutGrid, ListOrdered, Map as MapIcon, Milestone, Moon, Scale, Sun } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { TripDashboard } from './features/trips/components/TripDashboard';
import { TravelMap } from './features/map/components/TravelMap';
import { MapPage } from './features/map/components/MapPage';
import { TripStats } from './features/stats/components/TripStats';
import { MilesPage } from './features/stats/components/MilesPage';
import { TripTimeline } from './features/itinerary/components/TripTimeline';
import { TimelinePage } from './features/itinerary/components/TimelinePage';
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

type Tab = 'dashboard' | 'map' | 'timeline' | 'miles' | 'plan' | 'compare';

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
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
    </button>
  );
}

export default function App() {
  const filtering = useFilteredTrips();
  const [tab, setTab] = useState<Tab>('dashboard');
  const { theme, toggleTheme } = useTheme();

  const deepLinkedTripId = useDeepLinkedTripId();
  const [deepLinkOpen, setDeepLinkOpen] = useState(true);
  const deepLinkedTrip = deepLinkedTripId ? filtering.trips.find((t) => t.id === deepLinkedTripId) : undefined;

  return (
    <div className="min-h-screen bg-paper">
      <header className="relative overflow-hidden border-b-4 border-brass bg-ink-navy px-6 py-10 text-cream sm:px-10 sm:py-12">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="no-print absolute right-6 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 bg-cream/10 text-cream transition-colors hover:bg-cream/20 sm:right-10 sm:top-8"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

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
          className="relative mt-1 max-w-xl font-display text-3xl font-semibold leading-tight sm:text-4xl"
        >
          Joey and Sarah's Travel Tracker
        </motion.h1>
      </header>

      <nav className="no-print mx-auto flex max-w-6xl flex-wrap gap-2 px-6 pt-6 sm:px-10">
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<LayoutGrid size={14} />}>
          Dashboard
        </TabButton>
        <TabButton active={tab === 'map'} onClick={() => setTab('map')} icon={<MapIcon size={14} />}>
          Map
        </TabButton>
        <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')} icon={<Clock size={14} />}>
          Timeline
        </TabButton>
        <TabButton active={tab === 'miles'} onClick={() => setTab('miles')} icon={<Milestone size={14} />}>
          Miles Traveled
        </TabButton>
        <TabButton active={tab === 'plan'} onClick={() => setTab('plan')} icon={<ListOrdered size={14} />}>
          Plan
        </TabButton>
        <TabButton active={tab === 'compare'} onClick={() => setTab('compare')} icon={<Scale size={14} />}>
          Compare
        </TabButton>
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10">
        {tab === 'dashboard' ? (
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
        ) : tab === 'map' ? (
          <MapPage {...filtering} />
        ) : tab === 'timeline' ? (
          <TimelinePage {...filtering} />
        ) : tab === 'miles' ? (
          <MilesPage />
        ) : tab === 'plan' ? (
          <PlanPage />
        ) : (
          <ComparePage />
        )}
      </main>

      {deepLinkedTrip && (
        <TripDetailModal trip={deepLinkedTrip} open={deepLinkOpen} onClose={() => setDeepLinkOpen(false)} />
      )}
    </div>
  );
}
