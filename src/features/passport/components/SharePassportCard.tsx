import { PassportPageFace } from './PassportPageFace';
import type { PassportPage } from '../utils/buildPassportPages';

/**
 * A flat, fixed-size rendering of the passport for sharing as an image.
 *
 * The obvious approach — rasterize the interactive book — does not work. Each
 * leaf in PassportBook carries `rotateY(180deg)` on its back face with
 * `backface-visibility: hidden`, and html-to-image reproduces the transform but
 * not the backface culling, so every capture of a turned leaf comes out
 * mirror-imaged. The book also has its page controls inside it.
 *
 * So sharing gets its own flat DOM, exactly as printing does (see
 * PassportPrintSheets and the same reasoning there). Content still comes from
 * PassportPageFace, so there's one source of truth for what a page looks like.
 *
 * Positioned off-screen rather than `display: none`: html-to-image needs real
 * layout to measure, and a hidden subtree has none.
 */
export function SharePassportCard({ pages, nodeRef }: { pages: PassportPage[]; nodeRef: React.Ref<HTMLDivElement> }) {
  const cover = pages.find((p) => p.kind === 'cover');
  const data = pages.find((p) => p.kind === 'data');
  if (!cover || !data) return null;

  return (
    <div
      aria-hidden
      className="no-print pointer-events-none fixed left-[-10000px] top-0 z-[-1]"
    >
      {/* Each half lands at 700x900, close to the 0.65 ratio of a print
        * half-sheet. Narrower than this and the data page's longer values
        * ("Travel Record") wrap into the next row. */}
      <div ref={nodeRef} className="flex bg-paper p-6" style={{ width: 1400, height: 900 }}>
        <div className="h-full w-1/2 overflow-hidden rounded-l-md shadow-xl">
          <PassportPageFace page={cover} side="left" pageNumber={1} />
        </div>
        <div className="h-full w-1/2 overflow-hidden rounded-r-md shadow-xl">
          <PassportPageFace page={data} side="right" pageNumber={2} />
        </div>
      </div>
    </div>
  );
}
