# Mobile Safari (iOS 17+) Enablement — Travel Tracker

> Status: **all six phases implemented and verified.**
> Decisions locked: `max-sm:` override strategy · 5-tab bottom bar + More sheet · mobile-scoped contrast fixes · reduced-transparency media query *plus* in-app toggle.
>
> Verify with `npm run build && npm run audit:mobile` (see `scripts/mobile-audit/`).
> Results at the time of writing: no horizontal scroll at 375/390/393/430 on any
> tab; every control >= 44pt; 0 text nodes below WCAG AA at 375px in either theme
> (baseline: 59); glass surfaces >= 10.02:1 worst case; desktop byte-identical on
> 5 of 7 tabs, with Map and Miles differing only within Leaflet's own render
> nondeterminism (the baseline differs from itself there by the same margin).
>
> **Still needs a real device** (see `scripts/mobile-audit/README.md`): the
> `prefers-reduced-transparency` media query and the `@supports` fallback cannot
> be exercised in the Playwright WebKit build. Also outstanding: the two
> follow-up tickets below (desktop contrast, desktop keyboard reordering).
>
> **Mobile Lighthouse** (median of 3, `--preset` default mobile, local preview,
> password gate unset): Performance **86**, Accessibility **100**,
> Best Practices **96**, SEO **92**.
> All four meet the targets set below. The remaining SEO deduction (`robots-txt`
> "not valid") is an artifact of `vite preview`'s SPA fallback serving HTML for
> `/robots.txt`; on GitHub Pages that path 404s, which Lighthouse reads as "no
> robots.txt" and does not penalise. The Best-Practices deduction is `font-size`,
> flagging the 9-11px mono type the passport/ticket aesthetic depends on — a
> design decision, not a defect.
>
> Crawler policy is deliberately left at the default. If you want this log kept
> out of search results, add `public/robots.txt` with `Disallow: /` — that is the
> correct setting for a private site, and Lighthouse will score it as ~66 for
> "blocked from indexing", which in that case is the metric being wrong, not the
> config.

## Context

Travel Tracker is a React 18 + Vite + Tailwind 3.4 SPA that was built desktop-first. It already ships a PWA manifest, a service worker, and `display: standalone` — so people *can* install it to a home screen — but the UI underneath has never been made to work at phone widths. Concretely, on a 375px iPhone today:

- The 7-item tab nav wraps to three rows of ~34px-tall pills.
- The Miles tab scrolls the whole page sideways once there are 6+ years of data.
- Maps are locked to 480–560px of fixed inline height on a 667px screen, and hijack one-finger scroll.
- Search inputs are 14px, so Safari zooms the page on focus.
- There is no `viewport-fit=cover` and zero `env(safe-area-inset-*)`, so nothing accounts for the notch or home indicator.
- ~72 muted-text sites fail WCAG AA.

The outcome we want: the app is genuinely usable on an iPhone — one-tap navigation, no sideways scroll, thumb-sized targets, safe-area-aware — while the desktop experience stays byte-identical, and the brand reads the same on both. A restrained Apple "Liquid Glass" treatment on two mobile-only chrome surfaces gives the phone build a native feel without touching desktop.

---

## Strategy: `max-sm:` overrides, not mobile-first base

**Every change to an existing element is scoped with `max-sm:` (or `max-[…]:`). Mobile-first base classes are authored only for brand-new mobile-only components.**

Verified emission order through this project's Tailwind 3.4.10:

```
.text-slate\/50                                    (unprefixed)
@media not all and (min-width: 640px) { .max-sm\:… }
@media (max-width: 400px)             { .max-\[400px\]\:… }
@media (min-width: 640px)             { .sm\:… }
```

Tailwind's idiomatic path is mobile-first, but here the existing base classes **are** the shipped desktop design, and "desktop unchanged" is non-negotiable. `max-sm:` makes that requirement mechanically auditable:

> **PR review rule for every phase:** `git diff -U0 -- 'src/**/*.tsx' | grep '^-'` must contain no removed or edited unprefixed utility class on a pre-existing element.

Mobile-first would instead require rewriting each base class and adding an `sm:` twin — and the 49 existing `sm:` usages already encode real desktop intent, so overloading `sm:` with a second meaning ("restores the desktop default") makes the two indistinguishable.

**Two deliberate exceptions**, both flagged for sign-off:
1. `MilesPage.tsx:245` gets `overflow-x-auto` at base — it's a bug fix, and desktop is pixel-identical unless it was already overflowing.
2. `TravelMap.tsx`'s `height` prop becomes a className — an inline `style` can't carry responsive variants. The default preserves today's 420px exactly.

---

## Stack summary (verified)

| | |
|---|---|
| Framework | React 18.3 + TypeScript 5.5, Vite 5.4. **No router** — tabs are `useState<Tab>` in `App.tsx:66` |
| CSS | Tailwind 3.4.10, `darkMode: 'class'`, **no `screens` override**. One authored stylesheet: `src/index.css` |
| Component library | **None.** Every widget is hand-rolled — modal, lightbox, pills, charts |
| Variants in use | Only `sm:` (49×) and `lg:` (9×). The `md:` hits are object keys in `PassportStamp.tsx:32`, not variants |
| Tokens | Fixed `ink-navy #14232E` / `cream #F7F2E7` / `brass #B98B3E`; theme-aware `ink/paper/surface/stamp-red/horizon-teal/slate` as `rgb(var(--color-*) / <alpha-value>)`, defined as RGB triplets at `index.css:9-25` |
| Type | Fraunces (display), Inter (body), IBM Plex Mono (mono) |
| Maps / charts | Leaflet 1.9.4 + react-leaflet 4.2.1, OSM tiles. **No chart library** — bars are hand-rolled divs |
| Motion | framer-motion 12.42, `useReducedMotion` already used in `PassportBook.tsx` |
| Existing blur | Exactly one: `TripDetailModal.tsx:99` overlay `backdrop-blur-sm` |
| Mobile handling | `viewport` lacks `viewport-fit=cover`; **zero** `env(safe-area-inset-*)`; `min-h-screen` (=`100vh`) at `App.tsx:74` + `PasswordGate.tsx:44` |

**New dependencies: zero.** Three hand-rolled hooks replace what would otherwise be packages — see Phase 1 and Phase 4.

---

## New breakpoints

`sm: 640` already separates every iPhone width (375–430) from desktop, so `max-sm:` is the workhorse and needs no config. Add one named screen for the 375-vs-430 split, which recurs in ≥3 places:

```ts
// tailwind.config.ts — theme.screens, NOT theme.extend.screens
theme: {
  screens: { xs: '400px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
  extend: { /* existing colors / fontFamily / backgroundImage untouched */ },
}
```

⚠️ **Must be a full `theme.screens` replacement with `xs` first.** Under `theme.extend.screens`, Tailwind appends `xs` *after* `2xl` and emits min-width variants in declaration order — `xs:` would then beat `sm:` and `lg:` at every width. Document this in a config comment.

`400px` (not 390) puts iPhone SE / 12-mini / 13-mini (375) below it and 390 / 393 / 430 above — one clean split at the real device cluster boundary. `max-xs:` comes free.

---

## New design tokens

All derived from the existing palette — **no new hues**.

### `src/index.css` — extend `:root` (after `:15`) and `:root.dark` (after `:24`)

```css
:root {
  /* …existing --color-* … */
  --glass-tint: var(--color-paper);   /* the page's own paper, blurred */
  --glass-alpha: 0.72;
  --glass-blur: 20px;
  --glass-saturate: 180%;
  --glass-border: var(--color-slate);
  --glass-border-alpha: 0.18;
  --tabbar-h: 3.5rem;
  --tabbar-total: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
}
:root.dark { --glass-alpha: 0.80; --glass-border-alpha: 0.22; }
```

**The alphas are derived, not eyeballed** — worst-case contrast of `ink` text on paper-tinted glass across *any* backdrop luminance (0–255):

| alpha | light | dark |
|---|---|---|
| 0.60 | 5.11 ✓ | 3.28 ✗ |
| 0.70 | 6.87 ✓ | 5.34 ✓ |
| **0.72** | **7.27 ✓** | 5.71 ✓ |
| **0.80** | 8.99 ✓ | **7.68 ✓** |

0.72 / 0.80 holds ≥7:1 in both themes against a black photo or a busy OSM tile — headroom for the blur being disabled entirely.

### `src/index.css` — new `@layer components` (insert after `@layer base` ends at `:58`, before the reduced-motion block at `:60`)

```css
@layer components {
  /* Byte-identical to today's `px-6 sm:px-10` where env() resolves to 0px */
  .px-edge { padding-left: calc(1.5rem + env(safe-area-inset-left));
             padding-right: calc(1.5rem + env(safe-area-inset-right)); }
  @media (min-width: 640px) {
    .px-edge { padding-left: calc(2.5rem + env(safe-area-inset-left));
               padding-right: calc(2.5rem + env(safe-area-inset-right)); }
  }

  .glass {
    background-color: rgb(var(--glass-tint) / var(--glass-alpha));
    border-color: rgb(var(--glass-border) / var(--glass-border-alpha));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
            backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  }

  /* CRITICAL for iOS 17: Safari did not support UNPREFIXED backdrop-filter until
     Safari 18, so `@supports (backdrop-filter: …)` alone is FALSE on the target
     OS. The `or` clause is mandatory — and this is why Tailwind's
     `supports-[backdrop-filter]:` variant must NOT be used (it emits the
     unprefixed-only query). */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .glass { --glass-alpha: 1; }
  }
  @media (prefers-reduced-transparency: reduce) {
    .glass { --glass-alpha: 1; -webkit-backdrop-filter: none; backdrop-filter: none; }
  }
  :root[data-reduce-transparency='true'] .glass {
    --glass-alpha: 1; -webkit-backdrop-filter: none; backdrop-filter: none;
  }
}
```

### `tailwind.config.ts` — under `theme.extend`

```ts
spacing: { 'safe-t': 'env(safe-area-inset-top)', 'safe-b': 'env(safe-area-inset-bottom)',
           'safe-l': 'env(safe-area-inset-left)', 'safe-r': 'env(safe-area-inset-right)',
           tabbar: 'var(--tabbar-total)' },
minHeight: { touch: '44px' },
minWidth:  { touch: '44px' },
zIndex: { nav: '1100', modal: '2000', lightbox: '2100' },
```

`z-nav: 1100` is chosen against Leaflet, whose panes and controls occupy 200–1000 (`leaflet.css:100-141`) — a `z-40` bar would sit *under* map controls. Modals stay at 2000/2100, above the bar.

---

# Phases

Each phase is independently shippable and separately testable.

## Phase 1 — Foundation: viewport, safe areas, iOS base CSS

The app renders identically at every width; the primitives now exist. The one visible change is that notched devices in landscape stop clipping — which is why `viewport-fit` and the safe-area padding **must ship atomically in one commit**.

**`index.html`**
- `:5` → `content="width=device-width, initial-scale=1.0, viewport-fit=cover"`. Do **not** add `maximum-scale=1` / `user-scalable=no` — pinch-zoom is a WCAG 1.4.4 requirement and Lighthouse flags it.
- After `:9` add `<meta name="apple-mobile-web-app-status-bar-style" content="default">`. Use `default`, **not** `black-translucent` — the latter starts content under the status bar and would force `pt-safe-t` on the header immediately.

**`tailwind.config.ts`** — add `theme.screens` (full replacement, `xs` first) and the `theme.extend` additions above.

**`src/index.css`** — glass + metric tokens; the new `@layer components` block; and extend `@layer base` (`:27-58`):
```css
html { @apply scroll-smooth; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
       -webkit-tap-highlight-color: transparent; }
button, [role='button'], a, label, select, summary { touch-action: manipulation; }
```

**`src/App.tsx`** — `:74` `min-h-screen` → add `max-sm:min-h-dvh`; `:75`, `:122`, `:146` `px-6 … sm:px-10` → `px-edge`; `:80` theme toggle → add `max-sm:right-4 max-sm:top-4` to clear the landscape notch corner.

**`src/components/PasswordGate.tsx`** — `:44` same `min-h-dvh` + `px-edge`; `:61` input `text-sm` → add `max-sm:text-base` (**16px prevents iOS focus-zoom**).

**New `src/hooks/useMediaQuery.ts`** — generalizes the two existing matchMedia patterns (`PassportBook.tsx:21-34`, `useTheme.ts:10`). Synchronous `useState` initializer so there's no first-paint flash. Refactor `useIsSpread()` to use it, deleting the duplicated `'(min-width: 640px)'` literal. Adds `useIsMobile()` and `usePrefersReducedTransparency()`.

**Print safety:** nothing here touches the `@media print` blocks (`:75-165`, `:176-186`). `main { padding: 0 !important }` (`:98`) still beats `.px-edge`, and `env()` resolves to `0px` in print.

---

## Phase 2 — Bottom tab bar (the biggest single win)

**Decision: 5 items + More sheet** — `Trips · Map · Passport · Miles · More`, with Timeline / Plan / Compare behind More. 75px per item at 375px, comfortably over 44pt; matches Apple HIG's 5-item cap.

**New `src/navigation/tabs.tsx`** — extract `type Tab` (`App.tsx:25`) and the tab metadata (`App.tsx:123-143`) so both navs share one source. Each entry carries `label` *and* `short` — "Miles Traveled" cannot render at `text-[10px]` in a 75px column.

**New `src/components/BottomTabBar.tsx`**
```
<nav aria-label="Main" class="fixed inset-x-0 bottom-0 z-nav
     h-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] pb-safe-b border-t bg-paper">
```
- Items: `flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5`, 20px icon, `font-mono text-[10px] uppercase tracking-wide`.
- Active state reuses the existing token pair — `bg-ink-navy text-cream` pill, matching `App.tsx:53`.
- ⚠️ **`layoutId` must be `"mobile-tab-active"`, not `"main-tab-active"`** (`App.tsx:51`). A resize can briefly mount both navs, and framer-motion will fly the pill across the screen between them.
- Being a `<nav>` element means `index.css:84`'s `nav { display: none !important }` hides it in print for free.

**New `src/components/MoreSheet.tsx`** — `createPortal` bottom sheet following the `TripDetailModal.tsx:92` pattern. `z-modal`, `max-h-[70svh]`, rows `min-h-[56px]`.

**`src/App.tsx`**
- `:122-144` — `const isDesktop = useMediaQuery('(min-width: 640px)')`; render the existing `<nav>` when desktop, else `<BottomTabBar>`. **Conditional render, not `sm:hidden` CSS** — avoids a duplicate `<nav>` landmark for VoiceOver, duplicated buttons in the a11y tree, and `layoutId` double-registration.
- `:146` main → add `max-sm:pb-[calc(var(--tabbar-total)+2.5rem)]` so the last card clears the bar.
- `:75` header → `max-sm:py-6`; `:116` h1 → `max-sm:text-2xl`. Today's header eats 190px of a 667px screen before any content.
- `:80` theme toggle `h-9 w-9` → add `max-sm:h-11 max-sm:w-11`.

**iOS keyboard handling** — a `position: fixed` bar collides with the software keyboard: iOS shifts the *visual* viewport but not the *layout* viewport, so the bar floats mid-screen and `env(safe-area-inset-bottom)` collapses to 0. Listen for `focusin`/`focusout` on `document` inside `BottomTabBar` and hide it while an input has focus. Affects `SearchBar.tsx:12`, `ComparePage.tsx:77`, `PasswordGate.tsx:53`.

---

## Phase 3 — Overflow and density → zero horizontal scroll at 375–430px

**`MilesPage.tsx` — the one element that actually scrolls the page today.** At 375px, content width is 327px; each `YearBar`'s min-content width is set by its value label (`"12,345"` at 11px mono ≈ 40px), not the 28px bar. 6 years = 6×40 + 5×24 + 16 = **376px > 327px**.
- `:245` → add `overflow-x-auto overscroll-x-contain max-sm:gap-3`, wrapping bars in a `min-w-full` inner row so sparse charts still fill the width. *(base-level — the sanctioned exception)*
- `:282` inline `style={{ width: 28 }}` → `className="w-7 max-sm:w-5"` (`w-7` = 28px, identical).
- `:276` value label → `max-sm:text-[10px]`.
- `:171` `style={{ height: 480 }}` → `h-[480px] max-sm:h-[min(60svh,360px)]`. **`svh`, not `vh`/`dvh`** — `svh` is the viewport with toolbars *shown*, so the map can never exceed what's visible.
- `:316` `w-36 … sm:w-48` → add `max-sm:w-24 max-sm:text-[11px]`; `:325` `w-16` → `max-sm:w-12`. Recovers ~65px for the bar (95px → ~160px).
- `:227-236` `FitRoutes` → move `map.fitBounds(…)` into `useEffect`. **This is a correctness bug, not just polish**: a side effect in render re-runs on every parent render, undoing the user's pan mid-gesture.

**`TravelMap.tsx`** — inline `style={{ height }}` can't carry variants, so replace `height?: number` with `heightClassName?: string`, defaulting to `'h-[420px]'` (byte-equal to today).
- `:33-38` signature; drop `style={{ height }}` at `:58, :65, :82, :87`.
- `MapPage.tsx:48` `height={560}` → `heightClassName="h-[560px] max-sm:h-[min(65svh,420px)]"`.
- `App.tsx:156` dashboard instance passes nothing — keeps the 420px default.
- `:109` popup `min-w-[180px]` → `max-sm:min-w-[150px] max-w-[60vw]`.
- `:142-160` `MapViewportController` → `useEffect`, same fix as `FitRoutes`.

**`TripStats.tsx`** — `:32` and `:12` (skeleton, must match) → add `max-xs:grid-cols-1`; `:75` `p-4` → `max-sm:p-3`; `:80` `text-2xl` → `max-sm:text-xl`.

**`ComparePage.tsx`** — the `min-w-[560px]` inner scroller (`:170`) is contained correctly and does **not** propagate to the page; it just needs hardening.
- `:168` add `overscroll-x-contain` (stops chaining into Safari's back-swipe).
- `:170` add `max-sm:min-w-[440px]`; `:208-210` `gridStyle` → `var(--compare-label-w, 140px)`, set to `96px` under `max-sm`.
- `:198` label cells → `max-sm:sticky max-sm:left-0 max-sm:z-10` so row labels stay visible while scrolling columns.
- `:82` input → `max-sm:text-base` (**focus-zoom fix**).

**`SearchBar.tsx`** — `:17` → `max-sm:text-base` (**focus-zoom fix**) + `max-sm:py-2.5`.

**Leaflet chrome** — new mobile-only block in `src/index.css` overriding `leaflet.css:324-327` (30×30 zoom buttons), `:527-538` (24×24 popup close), `:487` (popup margins) to 44×44.

**`mapIcons.ts:12-39`** — marker hit targets are **14×14px** (`iconSize: [14,14]`), the primary interactive element on two whole tabs. Keep the visible mark, wrap it in a transparent 44×44 box, `iconAnchor: [22,22]`. Cluster overlap is already mitigated by `groupTripsByLocation` and Leaflet's `tapTolerance: 15`.

---

## Phase 4 — Touch targets, modal-as-sheet, focus, gestures

**Tap targets** (all `max-sm:`-scoped):

| File:line | Now | Add |
|---|---|---|
| `FilterPills.tsx:45` (`Pill`, reused by `SortControl`) | `px-3.5 py-1.5` ≈30px | `max-sm:inline-flex max-sm:items-center max-sm:min-h-touch max-sm:px-4` |
| `PassportBook.tsx:175` NavButton | `px-4 py-2` ≈34px | `max-sm:min-h-touch max-sm:px-5` |
| `TripDashboard.tsx:49`, `PassportPage.tsx:96` print | `h-9 w-9` | `max-sm:h-11 max-sm:w-11` |
| `TripDetailModal.tsx:116` close | `h-8 w-8` | `max-sm:h-11 max-sm:w-11 max-sm:right-2 max-sm:top-3` |
| `TripDetailModal.tsx:150` visit pills | `px-3 py-1` | `max-sm:min-h-touch max-sm:inline-flex max-sm:items-center` |
| `PhotoLightbox.tsx:39` close | `h-10 w-10` | `max-sm:h-11 max-sm:w-11` |
| `ComparePage.tsx:66` chip remove | bare 13px icon | `max-sm:-m-2 max-sm:p-2` (expands hit area without moving the glyph) |

*(`PhotoLightbox.tsx:53,64` arrows are already `h-11 w-11` — they pass.)*

**Filter row density — `FilterPills.tsx`.** The Region row alone (`:22`, 8 options) stacks 3–4 lines at 375px and, once pills are 44pt, consumes ~190px. For `:88` / `:98` / `:118` add `max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:-mx-6 max-sm:px-6` — the negative margin lets the scroller bleed to the screen edge (standard iOS affordance) without breaking `main`'s `px-edge`. Keep `:79` (Status, 3 options) wrapped.

**`BucketListPlanCard.tsx` — drag ergonomics.** `:33-40` grip → `max-sm:h-11 max-sm:w-11`; `touch-none` at `:36` stays (it's required by `dragControls`). Add explicit **Move up / Move down** buttons (`max-sm:` visible, `sm:hidden`) calling a new `move(id, delta)` in `useBucketListPlan.ts` — this is both the accessible path (drag is keyboard-inoperable today) and the reliable touch path, and it's cheaper than fighting `Reorder` on touch.

**Modal → bottom sheet — `TripDetailModal.tsx`**
- `:99` overlay → `max-sm:items-end max-sm:p-0`.
- `:112` → `max-sm:max-h-[92svh] max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0`. **`svh` is deliberate**: `85vh` with the URL bar showing puts the bottom action row (`:204-240`, Copy link / View in Notion) *behind* the toolbar.
- `:114` the `h-2 bg-brass` strip becomes the grabber — `max-sm:h-6` with a centred `w-9 h-1 rounded-full bg-cream/40` pill.
- Drag-to-dismiss via existing framer-motion: `drag="y"`, `dragElastic={{top:0,bottom:0.4}}`, dismiss past 100px / 500 velocity — mirroring `PassportBook.tsx:17-18`'s thresholds. Gated on `useIsMobile()`, skipped under `useReducedMotion()`.
- `:125` scroll body → `overscroll-contain max-sm:p-5`.

**New `src/hooks/useBodyScrollLock.ts`** — replaces `TripDetailModal.tsx:54-59`'s `body.style.overflow = 'hidden'` with fixed-body + scrollY restore. **A module-level refcount is mandatory**: `TripDetailModal` is mounted at **7** call sites (`TripCard.tsx:148`, `TravelMap.tsx:136`, `TimelinePage.tsx:205`, `StampSlot.tsx:64`, `BucketListPlanCard.tsx:84`, `NextAdventurePicker.tsx:86`, `App.tsx:186`) and `PhotoLightbox` nests inside it — without one, the nested lightbox's unlock releases the modal's lock.

**New `src/hooks/useFocusTrap.ts`** (~40 lines, vs. adding `focus-trap-react`) — applied to `TripDetailModal.tsx:106`, `PhotoLightbox.tsx:24`, and `MoreSheet`. Also set `inert` on `#root` while open (safe: both portals target `document.body`). Restore focus to the opener.

**New `src/features/map/components/MapTouchGate.tsx`** — one-finger drag on an embedded map hijacks page scroll on `TravelMap.tsx:88` and `MilesPage.tsx:189` (`TripLocationMap.tsx:21` already sets `dragging={false}`). Zero-dep approach, avoiding `leaflet-gesture-handling`: on `(pointer: coarse)`, init with `dragging={false} touchZoom={false}` and render a scrim reading "Tap to explore the map"; tap enables both and hides the scrim. `scrollWheelZoom` untouched for desktop.

---

## Phase 5 — Liquid Glass (2 surfaces + 1 free)

| Surface | Verdict | Why |
|---|---|---|
| **Bottom tab bar** | ✅ **Primary** | Highest-visibility mobile chrome; content genuinely scrolls beneath it, so translucency communicates real depth. Mobile-only ⇒ zero desktop risk |
| **Mobile sheet header** (`TripDetailModal.tsx:114` grabber + title block `:126-134`, made `sticky top-0`) | ✅ | Photos, map, and weather chart scroll under it; the sheet is the app's most-used surface. `max-sm:`-scoped ⇒ zero desktop risk |
| **More sheet** | ✅ Free | Same class, same component family — counts as part of surface 1 |
| Sticky top app bar | ⏸ Defer | Would mean restructuring `App.tsx:75`, whose navy fill is already opaque and identity-critical |
| **Photo lightbox controls** | ❌ **Explicitly reject** | Backdrop is an arbitrary user photo — contrast is unbounded and untestable. Keep `bg-white/10` over `bg-black/85` (`:28`), a solid predictable base |
| Modal overlay `backdrop-blur-sm` (`:99`) | ❌ Don't touch | The app's only existing blur, shared with desktop |

**Contrast test matrix** — 2 surfaces × 2 themes × 4 backdrops = 16 measurements:

| Backdrop | Concrete test |
|---|---|
| Light page | Dashboard scrolled so a `TripCard` sits under the bar |
| Dark page | Same with `.dark` |
| Busy map raster | Map tab, OSM tiles + route polylines under the bar |
| Photograph | Trip with photos, scroll `TripPictures.tsx:12` grid under the sheet header |

**Pass criterion:** ≥4.5:1 measured for every label. Computed worst case at the chosen alphas: **light 7.27:1, dark 7.68:1**.

**Text rule on glass:** active = `text-ink`, inactive = `text-slate` at **full opacity, no `/NN` alpha**. Do not carry `text-slate/70` (`App.tsx:46`) onto glass — its light-theme ratio on solid paper is already only 4.60:1, and glass only lowers it.

**Documented solid fallback**, in priority order: (1) the `@supports not (… or -webkit-…)` query — the load-bearing one on iOS 17; (2) `prefers-reduced-transparency`; (3) the `[data-reduce-transparency]` toggle; (4) if any photo-backdrop test fails, raise `--glass-alpha` to `0.90` (light 11.48:1) **before** going fully opaque — glass survives, legibility wins.

**`prefers-reduced-transparency` — the honest status: iOS 17 Safari does not support it** (WebKit shipped it in Safari 18.0). On the stated target OS the media query never matches. **Decision: ship the media query *and* an in-app toggle** — probe support via `matchMedia('(prefers-reduced-transparency: reduce)').media !== 'not all'`, and expose a "Reduce transparency" control persisted to `localStorage` using the exact `useTheme.ts` pattern (`STORAGE_KEY` at `:5`, `classList.toggle` at `:18-21`), setting `data-reduce-transparency` on `<html>`. Do **not** proxy it off `prefers-reduced-motion` — different user needs.

**Reduced motion:** `index.css:60-69` neutralizes CSS transitions globally, but framer-motion springs and `layoutId` are JS-driven and unaffected. Every new motion consults `useReducedMotion()` (pattern already at `PassportBook.tsx:49,112,128`): tab-bar pill → `{duration:0}`; sheet drag-to-dismiss → disabled (close button remains); `MoreSheet` → fade only. **Also gate `TripStats.tsx:88-108`'s `CountUp`** — it's a raw `requestAnimationFrame` loop that the CSS block cannot touch.

---

## Phase 6 — Contrast (mobile-scoped) + verification harness

**Measured ratios from the actual tokens at `index.css:9-25`.**

Light theme on `bg-paper` (247,242,231): `ink` 14.36 ✓ · `slate` 11.01 ✓ · `slate/80` 6.09 ✓ · `slate/70` **4.60 ✓ marginal** · `slate/60` **3.52 ✗ (37 sites)** · `slate/50` **2.73 ✗ (24)** · `slate/40` **2.16 ✗ (11)** · `brass` **2.76 ✗** · `stamp-red` 5.80 ✓ · `horizon-teal` 5.30 ✓.

Dark theme on `bg-paper` (27,23,18): `slate/70` 5.61 ✓ · `slate/60` **4.46 ✗ (just under)** · `slate/50` **3.51 ✗** · `slate/40` **2.69 ✗** · `brass` 5.79 ✓.

Fixed pairs: `cream` on `ink-navy` 14.36 ✓ · `brass` on `ink-navy` 5.21 ✓ · `cream/40` on `ink-navy` (`PassportPageFace.tsx:80`) **3.46 ✗**.

**⚠️ Retinting the token cannot rescue `/50` and `/40` in light mode.** Solving for a mobile-only `--color-slate` override:

| alpha | light | dark |
|---|---|---|
| `/60` | `22 24 20` → 4.51 ✓ | `202 197 183` → 4.50 ✓ |
| `/50` | **impossible** — pure black at 50% over cream is only **3.89:1** | `234 233 227` → 4.52 ✓ |
| `/40` | **impossible** — pure black at 40% is **2.81:1** | **impossible** — pure white at 40% is **3.82:1** |

So the "one CSS block, zero component churn" fix is mathematically unavailable. The alpha must change at the call sites.

**Plan — `max-sm:`-scoped, per your decision:**
- `text-slate/60` → add `max-sm:text-slate/80` (37 sites). Pattern repeats across `MilesPage.tsx:109,129,133,143,147,158,162,360,369`, `FilterPills.tsx:80,89,99,119`, `TimelinePage.tsx:40,164,184`, `TripCard.tsx:114,141`, `TripDetailModal.tsx:213,224`, and others.
- `text-slate/50` → add `max-sm:text-slate/80` (24 sites), incl. all six empty-state blocks (`TripDashboard.tsx:83`, `MapPage.tsx:64`, `TimelinePage.tsx:76`, `MilesPage.tsx:115`, `PlanPage.tsx:61`, `ComparePage.tsx:110`).
- `text-slate/40` (11 sites) — audit individually; most are decorative icons/page numbers (`SearchBar.tsx:11`, `TripCard.tsx:128`, `PassportPageFace.tsx:59`, `WeatherWidget.tsx:126`). Where it's real text, `max-sm:text-slate/80`.
- `PassportPageFace.tsx:80` `text-cream/40` (3.46) → `text-cream/70` (7.68) — it's an instruction, not decoration.
- `TripCard.tsx:84` `text-brass` on `bg-brass/15` (**2.41 light**) → `text-ink/70` on `bg-brass/20`. Light-theme-only failure; the fix is visible on desktop, so **flag for sign-off**.

**Follow-up ticket (agreed, out of scope here):** all 72 sites fail on *desktop* too. Recommend a `text-muted` / `text-faint` semantic pair in `@layer components` raised globally, once you've seen a side-by-side — a global change is a visible desktop shift.

---

## iOS Safari gotchas — full checklist

| Gotcha | Where | Handling |
|---|---|---|
| `100vh` ≠ visible height | `App.tsx:74`, `PasswordGate.tsx:44` | `max-sm:min-h-dvh` |
| `vh` clips chrome under the toolbar | `TripDetailModal.tsx:112` (85vh), `PhotoLightbox.tsx:83` (80vh) | `svh` for "must always fit", `dvh` for "should fill" |
| **Unprefixed `backdrop-filter` is Safari 18+** | any `@supports` | Query must be `(backdrop-filter:…) or (-webkit-backdrop-filter:…)`. Tailwind's `backdrop-blur-*` utilities emit both properties, but its `supports-[backdrop-filter]:` variant does not |
| `-webkit-overflow-scrolling: touch` | — | No-op since iOS 13. **Don't add it** |
| Scroll chaining / rubber-band | `TripDetailModal.tsx:125`, `ComparePage.tsx:168`, filter scrollers, `MilesPage.tsx:245` | `overscroll-contain` / `overscroll-x-contain` |
| Body lock loses scroll position | `TripDetailModal.tsx:54-59` | `useBodyScrollLock` — fixed-body + restore, refcounted over 7 mount sites |
| `touch-action` | `BucketListPlanCard.tsx:36`, `PassportBook.tsx:113` (both already correct) | Add `touch-action: manipulation` to buttons in `@layer base` to kill double-tap-zoom |
| Grey tap flash | every button | `-webkit-tap-highlight-color: transparent` |
| **Focus zoom (<16px inputs)** | `SearchBar.tsx:17`, `ComparePage.tsx:82`, `PasswordGate.tsx:61` — all 14px | `max-sm:text-base`. Never `maximum-scale=1` |
| `position: fixed` + keyboard | new `BottomTabBar` | Hide on `focusin`; `env(safe-area-inset-bottom)` collapses to 0 with the keyboard up |
| Landscape text inflation | everywhere | `-webkit-text-size-adjust: 100%` |
| Leaflet gesture hijack | `TravelMap.tsx:88`, `MilesPage.tsx:189` | `MapTouchGate` scrim |
| Leaflet z-index vs fixed bar | `leaflet.css:100-141` (up to 1000) | Bar at `z-nav` 1100 |
| Leaflet control + marker sizes | 30×30, 24×24, 14×14 | Mobile CSS override + 44×44 transparent hit box |
| `fitBounds` during render | `TravelMap.tsx:142-160`, `MilesPage.tsx:227-236` | Move to `useEffect` |
| `viewport-fit=cover` clips full-bleed | `App.tsx:75,122,146`, `PasswordGate.tsx:44` | `.px-edge` + `pb-safe-b`; **same commit as the meta change** |
| Print regression | `index.css:75-165,176-186` | Bar is a `<nav>` ⇒ hidden by `:84`; `env()`=0 in print; `main{padding:0!important}` still wins |

---

## Verification

### A. Automated — no horizontal scroll (run every phase)
Widths **375, 390, 393, 430** × 7 tabs × light + dark:
```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```
Plus per-element: flag anything whose `getBoundingClientRect().right > window.innerWidth + 1`, excluding descendants of `[data-allow-x-scroll]` (tag `ComparePage.tsx:168`, `MilesPage.tsx:245`, the filter scrollers). Drive with **Playwright `webkit`** (`npx playwright`, dev-only) so it's real WebKit, not Chromium.

### B. Automated — tap targets
Assert every `button, a[href], [role="button"], input` has `rect.width >= 44 && rect.height >= 44`, with an explicit allow-list (prose links, Leaflet attribution). Run per tab, and with `TripDetailModal` + `PhotoLightbox` + `MoreSheet` open.

### C. Automated — contrast
Extract computed `color` and effective background for every text node; assert ≥4.5:1 (≥3:1 for ≥24px or ≥19px-bold). Run at 375px in both themes. Baseline today's failures so Phase 6 burns them down measurably.

### D. Mobile Lighthouse
Run against `npm run build && npm run preview` **without** `VITE_SITE_PASSWORD_HASH` — it's unset in `.env` and CI sets it at `deploy.yml:35`, which would gate the audit at `PasswordGate.tsx:28`. Mobile preset, simulated throttling.

| Category | Target |
|---|---|
| Performance | ≥ 85 (audit Dashboard; record Map separately — Leaflet + OSM tiles are the ceiling) |
| **Accessibility** | **100** (blocked until Phase 6) |
| Best Practices | ≥ 95 |
| SEO | ≥ 90 |
| PWA / installability | passing — re-check after the `viewport-fit` edit |

Audits that must pass: `viewport` (no `user-scalable=no`), `tap-targets`, `color-contrast`, `content-width`.

### E. Manual on a real iPhone (Safari 17+), both themes

1. **Widths** — Simulator: SE 3rd gen (375), 13 mini (375), 14 (390), 15 Pro (393), 15 Pro Max (430). **Real device for at least one notched model** — the Simulator does not faithfully reproduce URL-bar collapse or keyboard avoidance.
2. **Notch / home indicator** — portrait: bar labels clear the 34px inset. **Rotate to landscape**: header, nav, and cards clear the notch; the sheet close button is reachable.
3. **URL-bar collapse** — scroll until the toolbar collapses, open a trip; the bottom action row (`TripDetailModal.tsx:204-240`) must be visible without scrolling, and still visible after scrolling back up. *(the `svh` check)*
4. **Zoom on focus** — tap the Dashboard search, Compare search, and password field. The page must **not** zoom.
5. **Keyboard + fixed bar** — with Compare search focused, the bar is hidden, not floating over the keyboard. Dismiss → it returns.
6. **Scroll lock** — open a trip from mid-page, scroll the sheet to its bottom and keep dragging: the page behind must not move. Close → back at the exact offset.
7. **Nested modal** — trip → photo → lightbox. Close lightbox, then sheet; background stays locked throughout. *(the refcount test)*
8. **Maps** — a one-finger vertical flick over the map scrolls the *page*. Tap the scrim, then drag: the map pans and does **not** snap back. *(the `fitBounds` fix.)* Pinch-zoom; tap a marker (opens first try); tap popup close and zoom buttons.
9. **Passport** — swipe to turn pages; vertical scroll still works; single-page below 640px; Prev/Next ≥44pt.
10. **Plan** — drag by the grip on touch, then use Move up/down; both persist through `useBucketListPlan`.
11. **Reduced motion** — Settings → Accessibility → Motion. Tab pill jumps instantly, sheet doesn't slide, drag-to-dismiss off, `CountUp` doesn't animate.
12. **Reduced transparency** — Settings → Display & Text Size. **On iOS 17 this has no effect** (unsupported); verify the in-app toggle instead. On iOS 18+, verify the media-query path. Both produce fully opaque `paper` chrome with visible borders.
13. **Glass contrast** — the 16-measurement matrix from Phase 5. Screenshot each, measure with a colour picker, record the numbers.
14. **Both themes** — repeat 1–13 with the toggle flipped; watch `TripCard.tsx:84` and `PassportPageFace.tsx:80`.
15. **Print regression** — desktop Chrome + Safari: Dashboard print and Passport print. Landscape sheets, no bottom bar, no blank trailing page, stamps sharp. **Re-run at the end of every phase** — `index.css` is touched in Phases 1, 3, and 5.
16. **PWA standalone** — Add to Home Screen, launch. Safe areas correct with no browser chrome; service worker still serves offline; bar sits above the home indicator.
