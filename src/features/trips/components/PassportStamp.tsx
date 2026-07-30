import { useId, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Car, Compass, Landmark, Mountain, Umbrella, UtensilsCrossed } from 'lucide-react';
import type { Trip, TripStatus, TripType } from '../../../types/travel';
import { getStampRecipe } from '../utils/stampRecipe';

interface PassportStampProps {
  trip: Pick<Trip, 'id' | 'destination' | 'tripTypes' | 'status' | 'country'>;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_INK: Record<TripStatus, string> = {
  'Been There': 'text-stamp-red',
  'Bucket List': 'text-horizon-teal',
};

const STATUS_LABEL: Record<TripStatus, string> = {
  'Been There': 'BEEN THERE',
  'Bucket List': 'BUCKET LIST',
};

const TRIP_ICONS: Record<TripType | 'default', typeof Compass> = {
  Beach: Umbrella,
  City: Building2,
  Hiking: Mountain,
  Food: UtensilsCrossed,
  'Road Trip': Car,
  Culture: Landmark,
  default: Compass,
};

const BOX_CLASS = { sm: 'h-16 w-16', md: 'h-24 w-24', lg: 'h-36 w-36' };
const ICON_SIZE = { sm: 18, md: 27, lg: 40 };

const CX = 50;
const CY = 50;
const OUTER_R = 41;
// Text-on-a-path grows outward from the top arc but inward from the bottom
// arc (opposite sweep directions), so the top arc needs a smaller radius to
// keep its glyphs clear of the outer ring and ticks, which start at OUTER_R + 5.
const TOP_ARC_R = 30;
const BOTTOM_ARC_R = 35;

function arcPath(r: number, throughTop: boolean): string {
  const left = `${CX - r} ${CY}`;
  const right = `${CX + r} ${CY}`;
  const sweep = throughTop ? 1 : 0;
  return `M ${left} A ${r} ${r} 0 0 ${sweep} ${right}`;
}

/**
 * A unique-per-trip "passport stamp": shape, rotation, ticks, and icon all
 * come from the trip's own id (see stampRecipe.ts), so every place gets its
 * own imprint instead of one generic badge. Ink color still maps to status
 * so Been There / Bucket List stay instantly distinguishable.
 */
export function PassportStamp({ trip, size = 'md' }: PassportStampProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const status = trip.status;
  const recipe = useMemo(() => getStampRecipe(trip), [trip]);

  if (!status) return null;

  const Icon = TRIP_ICONS[recipe.iconKey] ?? Compass;
  const inkClass = STATUS_INK[status];

  const ticks = Array.from({ length: recipe.tickCount }, (_, i) => {
    const angle = (i / recipe.tickCount) * Math.PI * 2;
    const r1 = OUTER_R + 5;
    const r2 = OUTER_R + 9;
    return {
      x1: CX + r1 * Math.cos(angle),
      y1: CY + r1 * Math.sin(angle),
      x2: CX + r2 * Math.cos(angle),
      y2: CY + r2 * Math.sin(angle),
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: recipe.rotation + 14 }}
      animate={{ opacity: 1, scale: 1, rotate: recipe.rotation }}
      whileHover={{ rotate: 0, scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 260, damping: 15 }}
      // multiply sinks the ink into the paper in light mode, but on a dark
      // surface it darkens the stamp into invisibility — screen is its
      // inverse and keeps the same "printed on" feel against dark.
      className={`${BOX_CLASS[size]} ${inkClass} relative shrink-0 [mix-blend-mode:multiply] dark:[mix-blend-mode:screen]`}
      role="img"
      aria-label={`${STATUS_LABEL[status]} stamp: ${trip.destination}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <path id={`arc-top-${uid}`} d={arcPath(TOP_ARC_R, true)} fill="none" />
          <path id={`arc-bottom-${uid}`} d={arcPath(BOTTOM_ARC_R, false)} fill="none" />
        </defs>

        {recipe.shape === 'rings' && (
          <>
            <circle
              cx={CX}
              cy={CY}
              r={OUTER_R}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeDasharray={recipe.dashPattern}
            />
            {ticks.map((t, i) => (
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            ))}
          </>
        )}

        {recipe.shape === 'scallop' && <ScallopRing bumps={recipe.tickCount} />}

        {recipe.shape === 'hex' && <HexRing dashPattern={recipe.dashPattern} />}

        <text
          fontSize={7.6}
          letterSpacing="0.04em"
          fontWeight={700}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={0.4}
        >
          <textPath href={`#arc-top-${uid}`} startOffset="50%" textAnchor="middle">
            {recipe.label}
          </textPath>
        </text>
        {recipe.abbreviation && (
          <text
            x={CX}
            y={71}
            fontSize={8.5}
            fontWeight={700}
            letterSpacing="0.06em"
            textAnchor="middle"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={0.3}
          >
            {recipe.abbreviation}
          </text>
        )}
        <text
          fontSize={6.8}
          letterSpacing="0.05em"
          fontWeight={700}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={0.35}
        >
          <textPath href={`#arc-bottom-${uid}`} startOffset="50%" textAnchor="middle">
            {`• ${STATUS_LABEL[status]} •`}
          </textPath>
        </text>
      </svg>

      <Icon
        size={ICON_SIZE[size]}
        strokeWidth={1.75}
        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 ${
          recipe.abbreviation ? 'top-[39%]' : 'top-1/2'
        }`}
      />
    </motion.div>
  );
}

function ScallopRing({ bumps }: { bumps: number }) {
  const amplitude = 2.4;
  const count = bumps * 2;
  const points = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = OUTER_R + (i % 2 === 0 ? amplitude : -amplitude);
    return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
  });
  return <polygon points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />;
}

function HexRing({ dashPattern }: { dashPattern: string }) {
  const points = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    return `${CX + OUTER_R * Math.cos(angle)},${CY + OUTER_R * Math.sin(angle)}`;
  });
  return (
    <polygon
      points={points.join(' ')}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeDasharray={dashPattern}
    />
  );
}
