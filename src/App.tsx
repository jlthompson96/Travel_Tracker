import { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { TripDashboard } from './features/trips/components/TripDashboard';
import { TravelMap } from './features/map/components/TravelMap';
import { MapPage } from './features/map/components/MapPage';
import { TripStats } from './features/budget/components/TripStats';
import { TripTimeline } from './features/itinerary/components/TripTimeline';
import { useFilteredTrips } from './features/trips/hooks/useFilteredTrips';

type Tab = 'dashboard' | 'map';

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
          ? 'border-ink-navy text-paper'
          : 'border-slate/20 bg-white/50 text-slate/70 hover:border-slate/40 hover:bg-white/80'
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

  return (
    <div className="min-h-screen bg-paper">
      <header className="relative overflow-hidden border-b-4 border-brass bg-ink-navy px-6 py-10 text-paper sm:px-10 sm:py-12">
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

      <nav className="mx-auto flex max-w-6xl gap-2 px-6 pt-6 sm:px-10">
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<LayoutGrid size={14} />}>
          Dashboard
        </TabButton>
        <TabButton active={tab === 'map'} onClick={() => setTab('map')} icon={<MapIcon size={14} />}>
          Map
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
                  <h2 className="mb-3 font-display text-lg font-semibold text-ink-navy">Map</h2>
                  <TravelMap
                    data={filtering.filteredTrips}
                    isLoading={filtering.isLoading}
                    isError={filtering.isError}
                    filters={filtering.filters}
                  />
                </section>
                <section>
                  <h2 className="mb-3 font-display text-lg font-semibold text-ink-navy">Timeline</h2>
                  <TripTimeline />
                </section>
              </aside>
            </div>
          </>
        ) : (
          <MapPage {...filtering} />
        )}
      </main>
    </div>
  );
}
