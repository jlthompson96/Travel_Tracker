import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, FileText, Printer } from 'lucide-react';
import { toSpreads, type PassportPage, type PassportSpread } from '../utils/buildPassportPages';

const PRINTING_CLASS = 'printing-passport';
const PAGE_SIZE_STYLE_ID = 'passport-page-size';

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

function getSpreadLabel(spread: PassportSpread | undefined, index: number, totalSpreads: number): string {
  if (!spread) return `Spread ${index + 1}`;
  if (index === 0) return 'Front Cover';
  if (index === totalSpreads - 1) return 'Back Cover';

  const tags: string[] = [];
  if (spread.left?.kind === 'data') tags.push('ID & Stats');
  else if (spread.left?.kind === 'stamps' && spread.left.year) tags.push(spread.left.year);

  if (spread.right?.kind === 'stamps' && spread.right.year && !tags.includes(spread.right.year)) {
    tags.push(spread.right.year);
  }

  const tagStr = tags.length > 0 ? ` · ${tags.join(', ')}` : '';
  return `Pages ${spread.leftNumber} & ${spread.rightNumber}${tagStr}`;
}

interface PrintPassportButtonProps {
  pages: PassportPage[];
  currentSpreadIndex: number;
  onPrintModeChange: (mode: 'current' | 'all') => void;
  disabled?: boolean;
}

export function PrintPassportButton({
  pages,
  currentSpreadIndex,
  onPrintModeChange,
  disabled = false,
}: PrintPassportButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const spreads = toSpreads(pages);
  const currentSpread = spreads[currentSpreadIndex];
  const currentSpreadTitle = getSpreadLabel(currentSpread, currentSpreadIndex, spreads.length);

  useEffect(() => {
    const handleBeforePrint = () => {
      document.documentElement.classList.add(PRINTING_CLASS);
      withLandscapePage(() => {});
    };

    const cleanup = () => {
      document.documentElement.classList.remove(PRINTING_CLASS);
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

  // Close menu on click outside or Escape
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
    onPrintModeChange(mode);
    setMenuOpen(false);
    document.documentElement.classList.add(PRINTING_CLASS);
    withLandscapePage(() => {
      window.print();
    });
  };

  return (
    <div ref={containerRef} className="no-print relative z-30 inline-flex">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        disabled={disabled || pages.length === 0}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title="Print passport booklet"
        className="flex h-9 items-center gap-1.5 rounded-full border border-slate/20 bg-surface/50 px-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate/70 transition-colors hover:border-slate/40 hover:bg-surface/80 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 max-sm:h-11"
      >
        <Printer size={15} />
        <span className="hidden sm:inline">Print</span>
        <ChevronDown size={13} className={`text-slate/60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Passport print options"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate/20 bg-surface p-1.5 shadow-2xl backdrop-blur-md"
        >
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
                {currentSpreadTitle}
              </p>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => triggerPrint('all')}
            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-navy/5"
          >
            <BookOpen size={16} className="mt-0.5 shrink-0 text-horizon-teal" />
            <div>
              <p className="font-mono text-xs font-semibold text-ink">
                Print Complete Passport
              </p>
              <p className="font-sans text-[11px] text-slate/70">
                All {spreads.length} spreads (full booklet)
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

