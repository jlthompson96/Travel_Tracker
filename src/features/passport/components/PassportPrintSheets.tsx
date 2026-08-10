import { PassportPageFace } from './PassportPageFace';
import { toSpreads, type PassportPage, type PassportSpread } from '../utils/buildPassportPages';

/**
 * The book laid out flat: one landscape sheet per spread, gutter down the
 * middle. The interactive book stacks its leaves with absolute positioning and
 * 3D rotation, none of which paginates — so print gets its own DOM rather than
 * a stylesheet trying to unpick those transforms.
 *
 * Page content still comes from the same `PassportPageFace`, so the stamps keep
 * their scatter and there's one source of truth for what a page looks like.
 *
 * Hidden on screen but always mounted: `PassportStamp` animates in from
 * `opacity: 0`, and mounting at load lets that settle long before anyone hits
 * Print.
 *
 * Deliberately not `aria-hidden` despite duplicating the book: `display: none`
 * already keeps it out of the accessibility tree on screen, and the print
 * stylesheet hides `[aria-hidden='true']` outright — the attribute would erase
 * these sheets from the very medium they exist for.
 */
export function PassportPrintSheets({ pages }: { pages: PassportPage[] }) {
  return (
    <div className="print-only">
      {toSpreads(pages).map((spread, index) => (
        <PrintSheet key={index} spread={spread} />
      ))}
    </div>
  );
}

function PrintSheet({ spread }: { spread: PassportSpread }) {
  // The covers stand alone rather than facing a blank half-sheet.
  const isSingle = spread.left == null || spread.right == null;

  if (isSingle) {
    const page = spread.left ?? spread.right!;
    const pageNumber = spread.left ? spread.leftNumber : spread.rightNumber;
    return (
      <div className="passport-sheet passport-sheet--single">
        <div className="passport-sheet__page">
          <PassportPageFace page={page} side="right" pageNumber={pageNumber} />
        </div>
      </div>
    );
  }

  return (
    <div className="passport-sheet">
      <div className="passport-sheet__page">
        <PassportPageFace page={spread.left!} side="left" pageNumber={spread.leftNumber} />
      </div>
      <div className="passport-sheet__page">
        <PassportPageFace page={spread.right!} side="right" pageNumber={spread.rightNumber} />
      </div>
    </div>
  );
}
