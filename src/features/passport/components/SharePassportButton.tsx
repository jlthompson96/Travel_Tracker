import { useState } from 'react';
import { Check, Loader2, Share2 } from 'lucide-react';

/**
 * Renders the currently-open passport spread to a PNG and hands it to the OS
 * share sheet, falling back to a download on desktop.
 *
 * The passport is the app's signature view and until now the only way to get it
 * out was the print dialog, which is a poor fit for "show someone this".
 *
 * Safe to rasterize because passport pages are pure CSS, type and inline SVG —
 * no cross-origin images, so nothing taints the canvas. Do NOT reuse this on
 * any view containing a Leaflet map: OSM tiles are cross-origin and would
 * either taint the canvas or silently drop out of the image.
 *
 * html-to-image is loaded on demand so its ~40KB stays out of the initial bundle.
 */

type State = 'idle' | 'working' | 'done' | 'error';

async function renderPng(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(node, {
    pixelRatio: 2, // legible when someone opens it full-screen on a phone
    // The node is transparent over the page background; without this the PNG
    // gets a black backdrop in most viewers.
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    // The page's web fonts are already loaded and render correctly in the
    // capture, so inlining them again only costs a slow refetch of the whole
    // Google Fonts CSS. (Text that wrapped differently here was a missing
    // white-space rule on the passport data page, not a font problem.)
    skipFonts: true,
  });
  if (!blob) throw new Error('Could not render the passport');
  return blob;
}

export function SharePassportButton({ targetRef }: { targetRef: React.RefObject<HTMLElement> }) {
  const [state, setState] = useState<State>('idle');

  const share = async () => {
    const node = targetRef.current;
    if (!node) return;

    setState('working');
    try {
      const blob = await renderPng(node);
      const file = new File([blob], 'passport.png', { type: 'image/png' });

      // canShare({files}) is the only reliable check — Safari exposes share()
      // but rejects file payloads on some versions.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My travel passport' });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'passport.png';
        link.click();
        URL.revokeObjectURL(url);
      }
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      // A user dismissing the OS share sheet throws AbortError; that isn't a failure.
      if (error instanceof Error && error.name === 'AbortError') setState('idle');
      else {
        console.error('Passport share failed', error);
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={state === 'working'}
      aria-label="Share the passport as an image"
      title={state === 'error' ? "Couldn't render the passport" : 'Share the passport as an image'}
      className={`no-print flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-surface/50 transition-colors hover:border-slate/40 hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-35 max-sm:h-11 max-sm:w-11 ${
        state === 'error' ? 'border-stamp-red/40 text-stamp-red' : 'border-slate/20 text-slate/70'
      }`}
    >
      {state === 'working' ? (
        <Loader2 size={15} className="animate-spin" />
      ) : state === 'done' ? (
        <Check size={15} className="text-horizon-teal" />
      ) : (
        <Share2 size={15} />
      )}
    </button>
  );
}
