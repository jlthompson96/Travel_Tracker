import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Hand } from 'lucide-react';

/**
 * Keeps an embedded map from eating the page scroll on touch.
 *
 * A one-finger drag over a Leaflet map pans the map, which on a phone means the
 * page stops scrolling the moment your thumb crosses a map — and both the Map
 * and Miles tabs put a tall map in the middle of a scrolling page. The usual fix
 * is the leaflet-gesture-handling plugin; this is the same idea without the
 * dependency: the map starts inert behind a scrim, and one tap hands it over.
 *
 * Coarse pointers only, so the desktop map keeps its normal drag and wheel zoom.
 */
export function MapTouchGate({ label = 'Tap to explore the map' }: { label?: string }) {
  const map = useMap();
  const [gated, setGated] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false,
  );

  useEffect(() => {
    if (!gated) return;
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    return () => {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
    };
  }, [map, gated]);

  if (!gated) return null;

  return (
    <button
      type="button"
      onClick={() => setGated(false)}
      // Above Leaflet's own panes and controls (which top out around 1000) but
      // below the bottom tab bar, so tapping it can't reach the map underneath.
      className="absolute inset-0 z-[1000] flex items-end justify-center bg-ink-navy/10 pb-4 transition-colors active:bg-ink-navy/20"
    >
      <span className="flex items-center gap-1.5 rounded-full bg-ink-navy/85 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-cream shadow-lg">
        <Hand size={13} />
        {label}
      </span>
    </button>
  );
}
