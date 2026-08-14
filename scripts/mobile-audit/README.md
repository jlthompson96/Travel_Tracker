# Mobile audit

Automated checks behind the mobile Safari work described in `PLAN_MOBILE.md`.
They run against **real WebKit** (via Playwright) rather than Chromium, because
the behaviours that matter here — `backdrop-filter` prefixes, `svh`, tab order,
scroll locking — are exactly the ones that differ between engines.

```sh
npm run build
npm run audit:mobile
```

To point at a deployed URL instead of a local preview:

```sh
BASE_URL=https://example.com/ npm run audit:mobile
```

## Checks

| script | what it proves |
|---|---|
| `overflow.mjs` | No horizontal page scroll on any tab at 375 / 390 / 393 / 430; exactly one `<nav>` landmark on mobile; all seven tabs still in the desktop pill row |
| `touch.mjs` | Every control ≥ 44×44pt; the trip sheet is bottom-anchored; the body is pinned while it is open and the scroll offset is restored; the map touch gate exists on coarse pointers and *not* on desktop |
| `focus.mjs` | Focus stays inside the sheet across 25 tabs; the nested lightbox does not release the scroll lock (refcount); focus returns to the opener |
| `contrast.mjs` | Every text node meets WCAG AA at 375px in both themes, compositing alpha colours over their real backgrounds |
| `glass.mjs` | The two glass surfaces clear AA over page, map-raster and photo backdrops, in both themes — measured from screenshot pixels, since a `backdrop-filter` result cannot be read from the DOM |

## Notes

- `png.mjs` is a tiny zlib-based PNG reader. `glass.mjs` needs real pixels and
  this avoids an image dependency.
- Two things **cannot** be exercised here and still need a real device:
  - `prefers-reduced-transparency` — Playwright's emulation is inert in this
    WebKit build (the query parses but never matches). The in-app
    "Reduce translucency" toggle drives byte-identical declarations and *is*
    covered.
  - The `@supports not (... or -webkit-...)` fallback — this WebKit is newer
    than the iOS 17 target and supports unprefixed `backdrop-filter`, so the
    fallback never fires.
- `artifacts/` holds screenshots from the last run and is gitignored.
