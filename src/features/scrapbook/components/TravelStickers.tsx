import { Building2, Car, Compass, Landmark, Mountain, Umbrella, UtensilsCrossed } from 'lucide-react';
import type { Trip, TripType } from '../../../types/travel';
import { PassportStamp } from '../../trips/components/PassportStamp';
import { pseudoRandom } from '../utils/scrapbookLayout';

const STICKER_CONFIG: Record<
  TripType | 'default',
  { icon: typeof Compass; label: string; bg: string; text: string }
> = {
  Beach: { icon: Umbrella, label: 'Beach Life', bg: 'bg-horizon-teal/15 border-horizon-teal/40', text: 'text-horizon-teal' },
  City: { icon: Building2, label: 'City Explorer', bg: 'bg-ink-navy/10 border-ink-navy/30', text: 'text-ink-navy' },
  Hiking: { icon: Mountain, label: 'Trail Blazer', bg: 'bg-[#3D5A45]/15 border-[#3D5A45]/40', text: 'text-[#3D5A45]' },
  Food: { icon: UtensilsCrossed, label: 'Foodie Find', bg: 'bg-stamp-red/15 border-stamp-red/40', text: 'text-stamp-red' },
  'Road Trip': { icon: Car, label: 'Road Trip', bg: 'bg-brass/20 border-brass/50', text: 'text-brass-text' },
  Culture: { icon: Landmark, label: 'Historic Site', bg: 'bg-ink-navy/15 border-ink-navy/40', text: 'text-ink-navy' },
  default: { icon: Compass, label: 'Adventure', bg: 'bg-brass/15 border-brass/40', text: 'text-brass-text' },
};

interface TravelStickersProps {
  trip: Trip;
  className?: string;
  showStamp?: boolean;
}

export function TravelStickers({ trip, className = '', showStamp = true }: TravelStickersProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 select-none ${className}`}>
      {/* Official Rotating Passport Stamp Badge */}
      {showStamp && (
        <div className="shrink-0 transition-transform duration-200 hover:scale-105">
          <PassportStamp trip={trip} size="sm" />
        </div>
      )}

      {/* Travel Vibe Die-Cut Stickers */}
      {trip.tripTypes.map((type, idx) => {
        const config = STICKER_CONFIG[type] ?? STICKER_CONFIG.default;
        const Icon = config.icon;
        const tilt = (-3 + pseudoRandom(`${trip.id}-${type}-${idx}`) * 6).toFixed(1);

        return (
          <div
            key={type}
            style={{ transform: `rotate(${tilt}deg)` }}
            className={`flex items-center gap-1.5 rounded-full border-2 border-white px-3 py-1 font-mono text-xs font-bold shadow-md transition-transform duration-150 hover:scale-105 ${config.bg} ${config.text}`}
          >
            <Icon size={13} />
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

