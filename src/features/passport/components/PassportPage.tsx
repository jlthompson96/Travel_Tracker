import { useMemo, useRef, useState } from 'react';
import { useTrips, computeTripStats } from '../../../services/notionAdapter';
import { PassportBook } from './PassportBook';
import { PassportPrintSheets } from './PassportPrintSheets';
import { SharePassportButton } from './SharePassportButton';
import { SharePassportCard } from './SharePassportCard';
import { PrintPassportButton } from './PrintPassportButton';
import { buildPassportPages } from '../utils/buildPassportPages';

/**
 * The payoff view: every place we've actually been, inked into a book you open
 * and page through. Deliberately ignores the shared filter state — a passport
 * is the complete record or it isn't a passport.
 */
export function PassportPage() {
  // Points at the flat SharePassportCard, not the book — see that file for why.
  const shareRef = useRef<HTMLDivElement>(null);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [printMode, setPrintMode] = useState<'current' | 'all'>('all');

  const { data, isLoading, isError } = useTrips();
  const trips = useMemo(() => data ?? [], [data]);
  const stats = useMemo(() => computeTripStats(trips), [trips]);

  const pages = useMemo(
    () =>
      buildPassportPages(trips, {
        countryCount: stats.countriesVisited,
        milesTraveled: stats.milesTraveled,
      }),
    [trips, stats],
  );

  return (
    <section className="flex flex-col gap-5">
      {/* Screen chrome only — on paper the cover sheet is the title page, and
        * leaving this in overflows sheet 1 onto a second page. */}
      <div className="no-print flex flex-col gap-4 border-b border-dashed border-slate/20 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Passport</h2>
          {!isLoading && !isError && (
            <p className="mt-0.5 font-mono text-xs text-slate/60 max-sm:text-slate/80">
              {stats.totalBeenThere} {stats.totalBeenThere === 1 ? 'stamp' : 'stamps'} across{' '}
              {stats.countriesVisited} {stats.countriesVisited === 1 ? 'country' : 'countries'} · click the cover to
              open, then swipe or use the arrow keys
            </p>
          )}
        </div>
        <div className="relative z-20 flex shrink-0 items-center gap-2">
          {!isLoading && !isError && <SharePassportButton targetRef={shareRef} />}
          <PrintPassportButton
            pages={pages}
            currentSpreadIndex={currentSpreadIndex}
            onPrintModeChange={setPrintMode}
            disabled={isLoading || isError}
          />
        </div>
      </div>

      {isLoading && (
        <div className="mx-auto aspect-[3/4] w-full max-w-sm animate-pulse rounded-md border border-slate/10 bg-slate/5 sm:aspect-[1.5/1] sm:max-w-3xl" />
      )}

      {isError && (
        <div className="border border-stamp-red/30 bg-stamp-red/5 p-4 text-sm text-stamp-red">
          Couldn't load the passport.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="no-print">
            <PassportBook pages={pages} onTurnedChange={setCurrentSpreadIndex} />
          </div>
          <PassportPrintSheets
            pages={pages}
            currentSpreadIndex={currentSpreadIndex}
            mode={printMode}
          />
          <SharePassportCard pages={pages} nodeRef={shareRef} />
        </>
      )}
    </section>
  );
}
