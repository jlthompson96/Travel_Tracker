import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, FileText, Printer } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { ScrapbookPrintDocument } from './ScrapbookPrintDocument';

const PRINTING_SCRAPBOOK_CLASS = 'printing-scrapbook';
const PAGE_SIZE_STYLE_ID = 'scrapbook-page-size';

function withLandscapePage(print: () => void) {
  if (!document.getElementById(PAGE_SIZE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = PAGE_SIZE_STYLE_ID;
    style.media = 'print';
    style.textContent = '@page { size: letter landscape; margin: 0.35in; }';
    document.head.append(style);
  }
  print();
}

function removeLandscapePage() {
  document.getElementById(PAGE_SIZE_STYLE_ID)?.remove();
}

interface PrintScrapbookButtonProps {
  trips: Trip[];
  currentIndex: number;
}

export function PrintScrapbookButton({
  trips,
  currentIndex,
}: PrintScrapbookButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'current' | 'all'>('current');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTrip = trips[currentIndex];

  useEffect(() => {
    const handleBeforePrint = () => {
      document.documentElement.classList.add(PRINTING_SCRAPBOOK_CLASS);
      withLandscapePage(() => {});
    };

    const cleanup = () => {
      document.documentElement.classList.remove(PRINTING_SCRAPBOOK_CLASS);
      removeLandscapePage();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', cleanup);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, []);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const triggerPrint = (mode: 'current' | 'all') => {
    setPrintMode(mode);
    setMenuOpen(false);
    document.documentElement.classList.add(PRINTING_SCRAPBOOK_CLASS);
    withLandscapePage(() => {
      window.print();
    });
  };

  return (
    <div ref={containerRef} className="no-print relative z-30 inline-flex">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title="Print printable scrapbook"
        className="flex h-11 items-center gap-1.5 rounded-full border border-slate/20 bg-paper px-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink shadow-sm transition-colors hover:border-slate/40 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brass"
      >
        <Printer size={15} />
        <span>Print</span>
        <ChevronDown size={13} className={`text-slate/60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Scrapbook print options"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate/20 bg-surface p-1.5 shadow-2xl backdrop-blur-md"
        >
          {currentTrip && (
            <button
              type="button"
              role="menuitem"
              onClick={() => triggerPrint('current')}
              className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-navy/5"
            >
              <FileText size={16} className="mt-0.5 shrink-0 text-brass" />
              <div>
                <p className="font-mono text-xs font-semibold text-ink">
                  Print Current Spread
                </p>
                <p className="truncate font-sans text-[11px] text-slate/70">
                  {currentTrip.destination} (Page {currentIndex + 1})
                </p>
              </div>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => triggerPrint('all')}
            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-navy/5"
          >
            <BookOpen size={16} className="mt-0.5 shrink-0 text-horizon-teal" />
            <div>
              <p className="font-mono text-xs font-semibold text-ink">
                Print Complete Album
              </p>
              <p className="font-sans text-[11px] text-slate/70">
                All {trips.length} spreads (1 spread per page)
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Scoped print DOM rendered directly into document.body */}
      {createPortal(
        <ScrapbookPrintDocument
          trips={trips}
          currentIndex={currentIndex}
          mode={printMode}
        />,
        document.body,
      )}
    </div>
  );
}
