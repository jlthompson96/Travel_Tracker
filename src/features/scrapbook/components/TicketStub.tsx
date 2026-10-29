import { useMemo } from 'react';
import { Calendar, MapPin, Milestone, Plane } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { getTicketData, pseudoRandom } from '../utils/scrapbookLayout';

interface TicketStubProps {
  trip: Trip;
  className?: string;
}

export function TicketStub({ trip, className = '' }: TicketStubProps) {
  const ticket = useMemo(() => getTicketData(trip), [trip]);
  const tilt = useMemo(() => {
    const raw = pseudoRandom(`${trip.id}-ticket`);
    return Number((-2 + raw * 4).toFixed(1)); // -2° to +2°
  }, [trip.id]);

  return (
    <div
      className={`relative select-none transition-transform duration-200 hover:rotate-0 ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="relative flex max-w-sm flex-col overflow-hidden rounded-md border-2 border-dashed border-brass/50 bg-[#FBF7EE] p-4 text-ink-navy shadow-md sm:flex-row sm:p-0">
        {/* Left / Main Boarding Pass Section */}
        <div className="flex flex-1 flex-col justify-between gap-3 p-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dashed border-slate/20 pb-2">
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-text">
              <Plane size={11} /> Boarding Pass
            </span>
            <span className="font-mono text-[10px] font-bold text-slate/70">
              {ticket.ticketNumber}
            </span>
          </div>

          {/* Route: Fort Mill -> Destination */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-slate/50">Origin</span>
              <span className="font-display text-sm font-bold text-ink-navy">Fort Mill, SC</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-brass">✈</span>
              <div className="h-0.5 w-10 bg-brass/40" />
            </div>
            <div className="text-right">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-slate/50">Destination</span>
              <span className="font-display text-base font-bold text-ink-navy">{ticket.destination}</span>
            </div>
          </div>

          {/* Details Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate/20 pt-2 font-mono text-[10px] text-slate/70">
            {ticket.dateRange && (
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-brass" />
                {ticket.dateRange}
              </span>
            )}
            {ticket.oneWayMiles != null && (
              <span className="flex items-center gap-1">
                <Milestone size={11} className="text-brass" />
                {ticket.oneWayMiles.toLocaleString()} mi
              </span>
            )}
          </div>
        </div>

        {/* Perforation Line between Main & Stub on Desktop */}
        <div
          aria-hidden="true"
          className="relative hidden w-0 border-r-2 border-dashed border-slate/30 sm:block"
        >
          {/* Top & Bottom Notch Cutouts */}
          <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-paper" />
          <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-paper" />
        </div>

        {/* Right / Stub Section */}
        <div className="flex flex-col justify-between gap-2 bg-[#F5EEDC] p-3 text-center sm:w-28">
          <div>
            <span className="block font-mono text-[8px] uppercase tracking-widest text-slate/50">Passenger</span>
            <span className="font-mono text-[11px] font-bold text-ink-navy">{ticket.passenger}</span>
          </div>

          {ticket.country && (
            <div className="flex items-center justify-center gap-1 font-mono text-[10px] text-slate/70">
              <MapPin size={10} className="text-stamp-red" />
              <span>{ticket.country}</span>
            </div>
          )}

          {/* Vintage Faux Barcode */}
          <div
            aria-hidden="true"
            className="mx-auto h-7 w-20 opacity-75"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #14232E 0 2px, transparent 2px 4px, #14232E 4px 5px, transparent 5px 8px)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

