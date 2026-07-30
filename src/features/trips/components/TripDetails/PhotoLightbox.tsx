import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { TripPhoto } from '../../../../types/travel';

interface PhotoLightboxProps {
  photos: TripPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** Prev/next and Escape are handled by the parent TripDetailModal's single
 * keydown listener (see its `lightboxIndex` state) so the two layers never
 * fight over which one an Escape press should close. */
export function PhotoLightbox({ photos, index, onClose, onNavigate }: PhotoLightboxProps) {
  const photo = photos[index];
  if (!photo) return null;

  const hasMultiple = photos.length > 1;

  return createPortal(
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={photo.name || 'Photo'}
        className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/85 p-4"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <X size={20} />
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate((index - 1 + photos.length) % photos.length);
              }}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate((index + 1) % photos.length);
              }}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        <motion.div
          key={photo.id}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="flex max-h-full max-w-full flex-col items-center gap-3"
        >
          <img
            src={photo.url}
            alt={photo.name || 'Trip photo'}
            className="max-h-[80vh] max-w-full rounded object-contain shadow-2xl"
          />
          <div className="flex items-center gap-3 font-mono text-xs text-white/70">
            {photo.name && <span>{photo.name}</span>}
            {hasMultiple && (
              <span>
                {index + 1} / {photos.length}
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
