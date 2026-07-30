import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, Link as LinkIcon, MapPin, StickyNote, X, ExternalLink } from 'lucide-react';
import type { Trip } from '../../../../types/travel';
import { PassportStamp } from '../PassportStamp';
import { formatDateRange } from '../../utils/formatTrip';
import TripPictures from './TripPictures';
import { PhotoLightbox } from './PhotoLightbox';
import { TripLocationMap } from './TripLocationMap';
import { WeatherWidget } from './WeatherWidget';

interface TripDetailModalProps {
  trip: Trip;
  open: boolean;
  onClose: () => void;
}

const PRIORITY_DOT: Record<string, string> = {
  High: 'bg-stamp-red',
  Medium: 'bg-brass',
  Low: 'bg-slate/40',
};

export function TripDetailModal({ trip, open, onClose }: TripDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Reset the lightbox whenever the modal itself closes, so reopening a
  // (possibly different) trip never resumes on a stale photo index.
  useEffect(() => {
    if (!open) setLightboxIndex(null);
  }, [open]);

  // One listener for both layers — Escape closes the lightbox first if it's
  // open, otherwise the modal; arrow keys page through photos. Keeping this
  // unified avoids two independent Escape handlers racing each other.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex != null) setLightboxIndex(null);
        else onClose();
      } else if (lightboxIndex != null && trip.photos.length > 1) {
        if (e.key === 'ArrowRight') setLightboxIndex((i) => (i! + 1) % trip.photos.length);
        if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i! - 1 + trip.photos.length) % trip.photos.length);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose, lightboxIndex, trip.photos.length]);

  // Keeps the address bar a shareable/bookmarkable link to whichever trip is
  // currently open — replaceState so opening/closing modals doesn't spam
  // browser history. Reversed on close via the cleanup below.
  useEffect(() => {
    if (!open) return;
    const url = new URL(window.location.href);
    url.searchParams.set('trip', trip.id);
    window.history.replaceState(null, '', url);

    return () => {
      const cleanupUrl = new URL(window.location.href);
      if (cleanupUrl.searchParams.get('trip') === trip.id) {
        cleanupUrl.searchParams.delete('trip');
        window.history.replaceState(null, '', cleanupUrl);
      }
    };
  }, [open, trip.id]);

  const dateLabel = formatDateRange(trip);
  const closeLightbox = () => setLightboxIndex(null);

  const copyShareLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('trip', trip.id);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modal = createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={trip.destination}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink-navy/70 p-4 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border border-slate/15 bg-paper shadow-2xl"
          >
            <div className="h-2 shrink-0 bg-brass" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-ink-navy/5 text-ink/70 transition hover:bg-ink-navy/10 hover:text-ink"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col gap-5 overflow-y-auto p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3 pr-10">
                <div>
                  <h2 className="font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                    {trip.destination}
                  </h2>
                  {trip.country && <p className="mt-1 text-sm text-slate/70">{trip.country}</p>}
                </div>
                {trip.status && <PassportStamp trip={trip} size="lg" />}
              </div>

              {trip.tripTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {trip.tripTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-ink-navy/5 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink/70"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 border-y border-dashed border-slate/20 py-4 font-mono text-sm text-slate/80">
                {dateLabel && (
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="shrink-0 text-brass" />
                    <span>{dateLabel}</span>
                  </div>
                )}
                {trip.location?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="shrink-0 text-brass" />
                    <span>{trip.location.address}</span>
                  </div>
                )}
              </div>

              <TripLocationMap trip={trip} />

              <WeatherWidget latitude={trip.location?.latitude} longitude={trip.location?.longitude} />

              <TripPictures trip={trip} onSelect={setLightboxIndex} />

              {trip.notes && (
                <p className="flex gap-2 text-sm leading-relaxed text-slate/80">
                  <StickyNote size={16} className="mt-0.5 shrink-0 text-slate/40" />
                  <span>{trip.notes}</span>
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div aria-label={trip.ratingStars ? `${trip.ratingStars} of 5 stars` : 'Not rated'}>
                    {trip.ratingStars &&
                      Array.from({ length: trip.ratingStars }).map((_, i) => (
                        <span key={i} className="text-brass">★</span>
                      ))}
                  </div>
                  {trip.priority && (
                    <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-slate/60">
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[trip.priority]}`} />
                      {trip.priority}
                    </span>
                  )}
                </div>

                <div className="no-print flex items-center gap-4">
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-slate/60 hover:text-ink"
                  >
                    {copied ? <Check size={12} className="text-horizon-teal" /> : <LinkIcon size={12} />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>

                  <a
                    href={trip.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-horizon-teal hover:underline"
                  >
                    View in Notion
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );

  return (
    <>
      {modal}
      {lightboxIndex != null && (
        <PhotoLightbox photos={trip.photos} index={lightboxIndex} onClose={closeLightbox} onNavigate={setLightboxIndex} />
      )}
    </>
  );
}
