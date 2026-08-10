import { motion, type Transition } from 'framer-motion';
import { PassportPageFace } from './PassportPageFace';
import type { PassportPage } from '../utils/buildPassportPages';

interface PassportLeafProps {
  /** Right-hand face — page 2i. */
  front: PassportPage;
  /** Left-hand face once turned — page 2i+1. */
  back: PassportPage;
  /** 0-based index of this leaf within the book. */
  index: number;
  turned: boolean;
  zIndex: number;
  isClosed: boolean;
  transition: Transition;
  /** Turning is disabled mid-flight so a fast click can't desync the stack. */
  onFlipComplete: () => void;
  onClick: () => void;
}

/**
 * One physical sheet of the book: two faces printed back to back, rotating
 * about the spine. `preserve-3d` keeps both faces in the same 3D space and
 * `backface-visibility: hidden` hides whichever one is pointing away, so the
 * paper reads as genuinely two-sided instead of a cross-fade.
 */
export function PassportLeaf({
  front,
  back,
  index,
  turned,
  zIndex,
  isClosed,
  transition,
  onFlipComplete,
  onClick,
}: PassportLeafProps) {
  return (
    <motion.div
      className="absolute right-0 top-0 h-full w-full origin-left [transform-style:preserve-3d] sm:w-1/2"
      style={{ zIndex }}
      animate={{ rotateY: turned ? -180 : 0 }}
      transition={transition}
      onAnimationComplete={onFlipComplete}
      onClick={onClick}
    >
      <div className="absolute inset-0 overflow-hidden rounded-r-md shadow-xl [backface-visibility:hidden]">
        <PassportPageFace page={front} side="right" pageNumber={index * 2 + 1} isClosed={isClosed} />
      </div>

      <div className="absolute inset-0 overflow-hidden rounded-l-md shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <PassportPageFace page={back} side="left" pageNumber={index * 2 + 2} />
      </div>
    </motion.div>
  );
}
