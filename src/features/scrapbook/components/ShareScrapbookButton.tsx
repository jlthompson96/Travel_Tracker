import { useState } from 'react';
import { Check, Loader2, Share2 } from 'lucide-react';

interface ShareScrapbookButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  destination: string;
}

type State = 'idle' | 'working' | 'done' | 'error';

export function ShareScrapbookButton({ targetRef, destination }: ShareScrapbookButtonProps) {
  const [state, setState] = useState<State>('idle');

  const share = async () => {
    const node = targetRef.current;
    if (!node) return;

    setState('working');
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: '#F7F2E7',
        skipFonts: true,
      });

      if (!blob) throw new Error('Could not render scrapbook page');

      const slug = destination.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `scrapbook-${slug}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${destination} Scrapbook` });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      console.error('Failed to export scrapbook page', err);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={state === 'working'}
      aria-label="Share or download this scrapbook spread"
      className="flex h-11 items-center gap-2 rounded-full border border-brass bg-brass px-4 font-mono text-xs font-semibold uppercase tracking-wider text-ink-navy shadow-sm transition-colors hover:bg-brass/90 disabled:opacity-50"
    >
      {state === 'working' ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Saving...</span>
        </>
      ) : state === 'done' ? (
        <>
          <Check size={14} />
          <span>Saved!</span>
        </>
      ) : (
        <>
          <Share2 size={14} />
          <span>Share Spread</span>
        </>
      )}
    </button>
  );
}

