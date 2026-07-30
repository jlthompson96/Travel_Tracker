import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe2, MapPinned, PlaneTakeoff, Route } from 'lucide-react';
import { useTrips } from '../../../services/notionAdapter';
import { computeTripStats } from '../../../services/notionAdapter';

export function TripStats() {
  const { data: trips, isLoading, isError } = useTrips();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse border border-slate/10 bg-slate/5" />
        ))}
      </div>
    );
  }

  if (isError || !trips) {
    return (
      <div className="border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
        Couldn't load trip stats.
      </div>
    );
  }

  const stats = computeTripStats(trips);
  const topCountry = Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard index={0} icon={<PlaneTakeoff size={16} />} label="Trips taken" value={stats.totalBeenThere} />
      <StatCard index={1} icon={<Globe2 size={16} />} label="Countries visited" value={stats.countriesVisited} />
      <StatCard
        index={2}
        icon={<MapPinned size={16} />}
        label="Bucket list"
        value={stats.totalBucketList}
        sub={topCountry ? `Top: ${topCountry[0]}` : undefined}
      />
      <StatCard
        index={3}
        icon={<Route size={16} />}
        label="Miles traveled"
        value={stats.milesTraveled}
        sub="Round-trip from Fort Mill, SC"
        format={(n) => n.toLocaleString()}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  index,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  index: number;
  format?: (n: number) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -2 }}
      className="flex flex-col gap-1 border border-slate/15 bg-surface/50 p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate/60">
        {icon} {label}
      </div>
      <p className="font-display text-2xl font-semibold text-ink">
        {typeof value === 'number' ? <CountUp value={value} format={format} /> : value}
      </p>
      {sub && <p className="font-mono text-[11px] text-slate/60">{sub}</p>}
    </motion.div>
  );
}

function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 700;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{format ? format(display) : display}</>;
}
