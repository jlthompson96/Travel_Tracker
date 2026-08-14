import { useEffect, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useTrips, computeTripStats } from '../../../services/notionAdapter';
import { PassportBook } from './PassportBook';
import { PassportPrintSheets } from './PassportPrintSheets';
import { buildPassportPages } from '../utils/buildPassportPages';

/** Scopes the passport's print rules to this tab's button, so printing from the
 * Dashboard stays as it was. */
const PRINTING_CLASS = 'printing-passport';

const PAGE_SIZE_STYLE_ID = 'passport-page-size';

/**
 * `@page` accepts no selector, so orientation can't live in index.css beside the
 * rest of the passport's print styles without forcing every other print in the
 * app to landscape too. Injecting it for the duration of this one print call is
 * the only way to scope it.
 */
function withLandscapePage(print: () => void) {
  if (!document.getElementById(PAGE_SIZE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = PAGE_SIZE_STYLE_ID;
    style.media = 'print';
    style.textContent = '@page { size: letter landscape; margin: 0.45in; }';
    document.head.append(style);
  }
  print();
}

function removeLandscapePage() {
  document.getElementById(PAGE_SIZE_STYLE_ID)?.remove();
}

/**
 * The payoff view: every place we've actually been, inked into a book you open
 * and page through. Deliberately ignores the shared filter state — a passport
 * is the complete record or it isn't a passport.
 */
export function PassportPage() {
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

  // Safari returns from window.print() before the dialog closes, so the class
  // has to come off on 'afterprint' rather than on the next line.
  useEffect(() => {
    const cleanup = () => {
      document.documentElement.classList.remove(PRINTING_CLASS);
      removeLandscapePage();
    };
    window.addEventListener('afterprint', cleanup);
    // Also runs on unmount, so switching tabs mid-dialog can't leave the app
    // stuck in landscape.
    return () => {
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, []);

  const print = () => {
    document.documentElement.classList.add(PRINTING_CLASS);
    withLandscapePage(() => window.print());
  };

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
        <button
          type="button"
          onClick={print}
          disabled={isLoading || isError}
          aria-label="Print the passport"
          title="Print the passport — or Save as PDF from the print dialog"
          className="no-print flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate/20 bg-surface/50 text-slate/70 transition-colors hover:border-slate/40 hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-35 max-sm:h-11 max-sm:w-11"
        >
          <Printer size={15} />
        </button>
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
            <PassportBook pages={pages} />
          </div>
          <PassportPrintSheets pages={pages} />
        </>
      )}
    </section>
  );
}
