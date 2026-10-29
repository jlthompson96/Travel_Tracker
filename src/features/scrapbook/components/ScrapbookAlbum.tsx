import { useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Trip } from '../../../types/travel';
import { ScrapbookSpread } from './ScrapbookSpread';
import { ShareScrapbookButton } from './ShareScrapbookButton';

interface ScrapbookAlbumProps {
  trips: Trip[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const SWIPE_DISTANCE = 50;
const SWIPE_VELOCITY = 300;

export function ScrapbookAlbum({
  trips,
  currentIndex,
  onIndexChange,
}: ScrapbookAlbumProps) {
  const spreadRef = useRef<HTMLDivElement>(null);
  const currentTrip = trips[currentIndex];

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < trips.length - 1;

  const goBack = () => {
    if (canGoBack) onIndexChange(currentIndex - 1);
  };

  const goForward = () => {
    if (canGoForward) onIndexChange(currentIndex + 1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goForward();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    }
  };

  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) < Math.abs(offset.y)) return; // vertical scroll

    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) {
      goForward();
    } else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) {
      goBack();
    }
  };

  if (!currentTrip) return null;

  return (
    <div
      role="region"
      aria-label="Travel Scrapbook Album"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-4 focus:outline-none"
    >
      {/* Top Toolbar: Navigation & Export Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="Previous scrapbook spread"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate/20 bg-paper text-ink transition-colors hover:border-slate/40 hover:bg-surface disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="font-mono text-xs uppercase tracking-wider text-slate/70">
            Page {currentIndex + 1} of {trips.length}
          </span>

          <button
            type="button"
            onClick={goForward}
            disabled={!canGoForward}
            aria-label="Next scrapbook spread"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate/20 bg-paper text-ink transition-colors hover:border-slate/40 hover:bg-surface disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <ShareScrapbookButton targetRef={spreadRef} destination={currentTrip.destination} />
      </div>

      {/* Interactive Spread with Swipe & Animated Transitions */}
      <motion.div onPanEnd={onPanEnd} className="w-full touch-pan-y">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrip.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <ScrapbookSpread
              ref={spreadRef}
              trip={currentTrip}
              tripIndex={currentIndex}
              totalTrips={trips.length}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

