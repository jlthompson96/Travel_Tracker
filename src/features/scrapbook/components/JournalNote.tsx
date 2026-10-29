import { useMemo } from 'react';
import { Quote, Star } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { pseudoRandom } from '../utils/scrapbookLayout';

interface JournalNoteProps {
  trip: Trip;
  className?: string;
}

export function JournalNote({ trip, className = '' }: JournalNoteProps) {
  const tilt = useMemo(() => {
    const raw = pseudoRandom(`${trip.id}-journal`);
    return Number((1 - raw * 2.5).toFixed(1)); // -1.5° to +1.0°
  }, [trip.id]);

  if (!trip.notes) return null;

  return (
    <div
      className={`relative select-none transition-transform duration-200 hover:rotate-0 ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {/* Brass Paperclip Element at Top Corner */}
      <div
        aria-hidden="true"
        className="absolute -top-3 left-6 z-10 h-7 w-3 rounded-full border-2 border-brass/80 bg-transparent shadow-sm"
        style={{ transform: 'rotate(-10deg)' }}
      />

      <div className="relative max-w-sm rounded-sm border border-[#E4D9C5] bg-[#FFFDF7] p-5 shadow-md">
        {/* Lined paper texture lines */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, #14232E 0 1px, transparent 1px 24px)',
          }}
        />

        {/* Note Header */}
        <div className="relative mb-2 flex items-center justify-between border-b border-dashed border-slate/20 pb-2">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-brass-text">
            <Quote size={11} /> Field Notes
          </span>

          {trip.ratingStars != null && (
            <div className="flex items-center gap-0.5 text-brass">
              {Array.from({ length: trip.ratingStars }).map((_, i) => (
                <Star key={i} size={11} fill="currentColor" />
              ))}
            </div>
          )}
        </div>

        {/* Note Body */}
        <p className="relative font-body text-sm leading-relaxed text-slate italic sm:text-base">
          "{trip.notes}"
        </p>

        {/* Footer Memo Tag */}
        <div className="relative mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-slate/50">
          <span>{trip.destination} Memories</span>
          {trip.priority && <span>{trip.priority} Priority</span>}
        </div>
      </div>
    </div>
  );
}

