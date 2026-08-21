import { Compass, Stamp } from 'lucide-react';
import { StampSlot } from './StampSlot';
import { UNDATED_YEAR, type PassportPage } from '../utils/buildPassportPages';

interface PassportPageFaceProps {
  page: PassportPage;
  /** Which half of the spread this face lands on — drives the gutter shading
   * and which corner the page number sits in. */
  side: 'left' | 'right';
  /** 1-based, for the printed corner number. */
  pageNumber: number;
  /** The front cover shows its "tap to open" hint only while the book is shut. */
  isClosed?: boolean;
}

/** Faint printed-paper tooth, reused from the site header's dot field. */
const PAPER_TEXTURE = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(var(--color-ink)) 1px, transparent 0)',
  backgroundSize: '18px 18px',
};

/** Layered hairlines standing in for the guilloché on an identity page. */
const GUILLOCHE = {
  backgroundImage: [
    'repeating-linear-gradient(45deg, #B98B3E 0 1px, transparent 1px 9px)',
    'repeating-linear-gradient(-45deg, #B98B3E 0 1px, transparent 1px 11px)',
  ].join(','),
};

export function PassportPageFace({ page, side, pageNumber, isClosed }: PassportPageFaceProps) {
  if (page.kind === 'cover' || page.kind === 'back') {
    return <CoverFace kind={page.kind} isClosed={isClosed} />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface">
      {/* Screen-only: the dot field is atmosphere, not worth the ink. */}
      <div aria-hidden className="no-print pointer-events-none absolute inset-0 opacity-[0.05]" style={PAPER_TEXTURE} />

      {/* The book's inner shadow: paper curving down into the spine. Screen
        * only — printed flat there's no curvature to suggest, and a 20% navy
        * wash over the page edge just greys out the text under it. */}
      <div
        aria-hidden
        className={`no-print pointer-events-none absolute inset-y-0 w-10 ${
          side === 'left'
            ? 'right-0 bg-gradient-to-l from-ink-navy/20 to-transparent'
            : 'left-0 bg-gradient-to-r from-ink-navy/20 to-transparent'
        }`}
      />

      <div className="relative flex h-full w-full flex-col p-5 sm:p-6">
        {page.kind === 'data' && <DataPage page={page} />}
        {page.kind === 'stamps' && <StampsPage page={page} />}
      </div>

      <span
        aria-hidden
        className={`absolute bottom-3 font-mono text-[10px] text-slate/40 ${side === 'left' ? 'left-4' : 'right-4'} max-sm:text-slate/80`}
      >
        {pageNumber}
      </span>
    </div>
  );
}

function CoverFace({ kind, isClosed }: { kind: 'cover' | 'back'; isClosed?: boolean }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-ink-navy text-cream">
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-sm border-2 border-brass/40" />
      <div aria-hidden className="no-print pointer-events-none absolute inset-0 opacity-[0.06]" style={PAPER_TEXTURE} />

      {kind === 'cover' ? (
        <div className="relative flex flex-col items-center gap-3 px-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-brass/80 max-sm:text-brass">Been There</p>
          <Compass size={64} strokeWidth={0.9} className="text-brass/70" />
          <h3 className="font-display text-2xl font-semibold tracking-[0.18em] text-brass sm:text-3xl">PASSPORT</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/70">Joey &amp; Sarah</p>
          {isClosed && (
            <p className="mt-4 animate-pulse font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 max-sm:text-cream/75">
              Tap to open
            </p>
          )}
        </div>
      ) : (
        <Compass size={44} strokeWidth={0.9} aria-hidden className="relative text-brass/25" />
      )}
    </div>
  );
}

function DataPage({ page }: { page: Extract<PassportPage, { kind: 'data' }> }) {
  const rows: Array<[string, string]> = [
    ['Type', 'Travel Record'],
    ['Holders', 'Joey & Sarah'],
    ['Stamps', String(page.stampCount)],
    ['Countries', String(page.countryCount)],
    ['Miles Travelled', Math.round(page.milesTraveled).toLocaleString()],
    ['Travelling Since', page.firstYear ?? '—'],
  ];

  return (
    <>
      <div className="mb-4 border-b border-dashed border-slate/25 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass max-sm:text-brass-text">Travel Tracker</p>
        <h3 className="font-display text-xl font-semibold text-ink">Holder Details</h3>
      </div>

      <div className="relative flex-1">
        {/* Screen only: at 7% it's a whisper on a backlit page, but printed it
          * lands as a solid grey crosshatch block over half the page. */}
        <div aria-hidden className="no-print pointer-events-none absolute inset-0 opacity-[0.07]" style={GUILLOCHE} />

        <dl className="relative flex flex-col gap-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b border-slate/10 pb-1.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate/50 max-sm:text-slate/80">{label}</dt>
              {/* nowrap: these values are short and belong on the label's line.
                * Without it, html-to-image's clone (see SharePassportButton)
                * re-flows "Travel Record" onto two lines, which then collides
                * with the row beneath it in the shared image. */}
              <dd className="whitespace-nowrap font-display text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Decorative chevron strip — the shape of a machine-readable zone, filled
       * with nothing but the travel stats above it. */}
      <div
        aria-hidden
        className="mt-4 overflow-hidden whitespace-nowrap border-t border-slate/15 pt-2 font-mono text-[9px] leading-relaxed tracking-[0.12em] text-slate/35 max-sm:text-slate/80"
      >
        <p>{`TRAVEL<<JOEY<<SARAH<<${'<'.repeat(24)}`}</p>
        <p>{`STAMPS${page.stampCount}<COUNTRIES${page.countryCount}<${'<'.repeat(24)}`}</p>
      </div>
    </>
  );
}

function StampsPage({ page }: { page: Extract<PassportPage, { kind: 'stamps' }> }) {
  if (page.entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded border border-dashed border-slate/20 text-center text-slate/50 max-sm:text-slate/80">
        <Stamp size={26} />
        <p className="font-display text-base text-slate/70">No stamps yet</p>
        <p className="px-6 text-xs">Mark a trip as “Been There” in Notion to ink this page.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <span className="font-display text-2xl font-semibold text-ink">
          {page.year === UNDATED_YEAR ? 'Undated' : page.year}
        </span>
        {page.continued && (
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate/45 max-sm:text-slate/80">cont.</span>
        )}
        <span className="h-px flex-1 bg-slate/15" />
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate/45 max-sm:text-slate/80">
          {page.entries.length} {page.entries.length === 1 ? 'stamp' : 'stamps'}
        </span>
      </div>

      <div className="grid flex-1 grid-cols-2 place-items-center gap-1">
        {page.entries.map((entry) => (
          <StampSlot key={entry.trip.id} entry={entry} />
        ))}
      </div>
    </>
  );
}
