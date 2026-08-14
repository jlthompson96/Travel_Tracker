import { useCallback, useMemo, useState } from 'react';
import { motion, useReducedMotion, type PanInfo, type Transition } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PassportLeaf } from './PassportLeaf';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import type { PassportPage } from '../utils/buildPassportPages';

interface Leaf {
  front: PassportPage;
  back: PassportPage;
}

const FLIP_TRANSITION: Transition = { type: 'spring', stiffness: 120, damping: 20 };
/** Reduced motion still needs a state change, just not a visible tumble. */
const INSTANT_TRANSITION: Transition = { duration: 0 };

/** How far, or how fast, a horizontal swipe has to go before it turns a page. */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

/** Tailwind's `sm` — below it the book drops to one page at a time. */
function useIsSpread(): boolean {
  return !useIsMobile();
}

export function PassportBook({ pages }: { pages: PassportPage[] }) {
  const leaves = useMemo<Leaf[]>(() => {
    const result: Leaf[] = [];
    for (let i = 0; i < pages.length; i += 2) {
      result.push({ front: pages[i], back: pages[i + 1] ?? { kind: 'blank' } });
    }
    return result;
  }, [pages]);

  const [turned, setTurned] = useState(0);
  /** The leaf currently in flight — it has to float above both stacks. */
  const [flipping, setFlipping] = useState<number | null>(null);

  const prefersReducedMotion = useReducedMotion();
  const isSpread = useIsSpread();

  const canGoForward = turned < leaves.length;
  const canGoBack = turned > 0;

  const goForward = useCallback(() => {
    setTurned((current) => {
      if (current >= leaves.length) return current;
      setFlipping(current);
      return current + 1;
    });
  }, [leaves.length]);

  const goBack = useCallback(() => {
    setTurned((current) => {
      if (current <= 0) return current;
      setFlipping(current - 1);
      return current - 1;
    });
  }, []);

  // Scoped to the book rather than the document: TripDetailModal installs its
  // own keydown listener while open, and a global one here would fight it.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goForward();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    }
  };

  // Pan rather than drag: it reads swipes without swallowing the clicks that
  // open a stamp's detail modal.
  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) < Math.abs(offset.y)) return; // vertical scroll, not a swipe

    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) goForward();
    else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) goBack();
  };

  const isClosed = turned === 0;
  const isFullyTurned = turned === leaves.length;

  // Closed, the book is a single cover — slide the spread so that cover sits in
  // the middle instead of hanging off to the right. Same trick in reverse once
  // every leaf has been turned and only the back cover is left.
  const spreadOffset = !isSpread ? 0 : isClosed ? '-25%' : isFullyTurned ? '25%' : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full overflow-hidden py-2 [perspective:2000px]">
        <motion.div
          role="group"
          aria-label="Passport book"
          aria-roledescription="book"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPanEnd={onPanEnd}
          animate={{ x: spreadOffset }}
          transition={prefersReducedMotion ? INSTANT_TRANSITION : FLIP_TRANSITION}
          className="relative mx-auto aspect-[3/4] w-full max-w-sm touch-pan-y rounded-md sm:aspect-[1.5/1] sm:max-w-3xl"
        >
          {leaves.map((leaf, index) => {
            const isTurned = index < turned;
            return (
              <PassportLeaf
                key={index}
                index={index}
                front={leaf.front}
                back={leaf.back}
                turned={isTurned}
                // Turned leaves stack in the order they fell; unturned ones stack
                // so the next to flip is on top. The leaf in flight beats both.
                zIndex={flipping === index ? leaves.length + 1 : isTurned ? index : leaves.length - index}
                isClosed={isClosed}
                transition={prefersReducedMotion ? INSTANT_TRANSITION : FLIP_TRANSITION}
                onFlipComplete={() => setFlipping((current) => (current === index ? null : current))}
                // Only the shut cover doubles as a button, so clicking a stamp
                // deeper in the book never turns the page out from under it.
                onClick={isClosed && index === 0 ? goForward : () => {}}
              />
            );
          })}
        </motion.div>
      </div>

      <div className="no-print flex items-center gap-3">
        <NavButton onClick={goBack} disabled={!canGoBack} label="Previous page">
          <ChevronLeft size={14} />
          Prev
        </NavButton>

        <span className="font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80" aria-live="polite">
          {isClosed ? 'Cover' : `${turned} / ${leaves.length}`}
        </span>

        <NavButton onClick={goForward} disabled={!canGoForward} label="Next page">
          Next
          <ChevronRight size={14} />
        </NavButton>
      </div>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-full border border-slate/20 bg-surface/50 px-4 py-2 font-mono text-xs uppercase tracking-wide text-slate/70 max-sm:min-h-touch max-sm:px-5 transition-colors duration-150 hover:border-slate/40 hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-slate/20 disabled:hover:bg-surface/50"
    >
      {children}
    </button>
  );
}
