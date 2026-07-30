# Travel Tracker

A modular React dashboard built directly against the live schema of your
Notion **Travel Tracker** database (data source id
`1b1d8fd9-c723-4201-b1fc-5968d59e658a`), inspected via MCP on 2026-07-22.

## Schema map (as retrieved via MCP)

| Notion property | Type | Options / shape | Maps to |
|---|---|---|---|
| Destination | title | — | `Trip.destination` |
| Country | select | 20 options (USA, Greece, Italy, …) | `Trip.country` — dashboard filter, map grouping |
| Status | select | `Been There`, `Bucket List` | `Trip.status` — status filter, ink-stamp badge |
| Priority | select | `High`, `Medium`, `Low` | `Trip.priority` — card indicator dot |
| Rating | select | `★` … `★★★★★` | `Trip.ratingStars` (parsed to 1–5) |
| Trip Type | multi_select | Beach, City, Hiking, Food, Road Trip, Culture | `Trip.tripTypes` — filter pills, tags |
| Date Visited | date (range) | start / end / is_datetime | `Trip.dateVisited` — card date, year-grouped Timeline tab |
| Location | **place** | name / address / lat / lng | `Trip.location` — map markers, Miles Traveled route lines |
| Notes | rich text | — | `Trip.notes` |
| Photos | files | Notion-hosted or external | `Trip.photos` (gallery use in TripCard) |
| Passport Stamp | formula | opaque result (string/number/bool/date) | `Trip.passportStamp` |

**Schema gaps — read before wiring up Itinerary:**
The spec asked for an Itinerary module for "daily schedules linked to each
trip." That doesn't exist in the live database — there's no linked sub-item
relation for day-by-day plans. Rather than invent fields that aren't there:

- **`features/stats`** ships as `TripStats.tsx`: real aggregate metrics
  (trips taken, countries visited, bucket-list count, round-trip miles
  traveled) computed from data that actually exists.
- **`features/itinerary`** ships as `TripTimeline.tsx`: a chronological
  timeline of each trip's date range (with nights calculated). It's built
  to extend cleanly if you later add a linked "Itinerary Items" data source.

**Also worth knowing:** `Location` and `Passport Stamp` were excluded from
this data source's SQL query interface by Notion itself
(`notAvailableInQuerySql`) — they were read via direct page fetches instead.
`Passport Stamp`'s formula source isn't exposed by the Notion API at all
(only its computed result), so `transformNotionData.ts` reads it
defensively across all four possible result types instead of assuming one.

## Tabs

The app is a single-page shell (`App.tsx`) with six tabs, all reading from
the same `useTrips()` / `useFilteredTrips()` data:

- **Dashboard** — filterable trip card grid (`TripDashboard.tsx`), the
  four-tile stat row (`TripStats.tsx`), plus compact Map and Timeline
  previews in the sidebar.
- **Map** (`MapPage.tsx`) — the full-size Leaflet map. Trips are grouped by
  rounded coordinates (`~111m`) so repeat visits to the same place collapse
  into one pin instead of overlapping markers; a grouped pin's popup lists
  every visit and opens that trip's detail modal on click.
- **Timeline** (`TimelinePage.tsx`) — every dated trip grouped by year, with
  photo thumbnails, trip-type tags, and rating, click-through to the same
  detail modal. Multiple visits to one place simply appear as separate
  entries in their own years.
- **Miles Traveled** (`MilesPage.tsx`) — an infographic built around
  `HOME_LOCATION` (hardcoded to Fort Mill, SC in `notionAdapter.ts` — there's
  no home-base property in Notion): a hero total of round-trip miles to
  every "Been There" trip, farthest/closest callouts, a route map with
  dotted lines from home to each destination, a miles-by-year bar chart, a
  farthest-destinations leaderboard, and a continent/country coverage
  breakdown. Distances are straight-line (haversine, see `utils/geo.ts`),
  not actual road/flight miles.
- **Plan** (`features/planning/`) — the Bucket List as a working plan:
  drag-to-rank ordering, a "when" timeframe chip per trip, and a "Next
  adventure" picker that either picks at random or surfaces the closest
  unvisited destination. **Ranking and timeframes live in `localStorage`
  only** (`useBucketListPlan.ts`) — Notion has no field for either and the
  app has no write path back, so none of it syncs.
- **Compare** (`features/compare/`) — search-and-add up to three trips and
  see them side by side (status, country, trip type, dates, rating,
  priority, distance from home, notes). Aimed at weighing Bucket List
  candidates against each other.

### Cross-cutting features

- **Filtering & sorting** (`useFilteredTrips.ts`, `FilterPills.tsx`,
  `SortControl.tsx`) — Status/Region are single-select; Country and Trip type
  are **multi-select** (empty array means "All"). Sort by date, distance from
  home, rating, priority, or A–Z.
- **Trip detail modal** (`TripDetails/`) — adds a photo lightbox with
  keyboard/arrow navigation (`PhotoLightbox.tsx`), a "best time to visit"
  climate chart (`WeatherWidget.tsx`, backed by the free keyless Open-Meteo
  archive API — see `utils/weather.ts`), and a **Copy link** button. The
  modal syncs `?trip=<id>` into the URL, and `App.tsx` reads that param on
  load, so a copied link deep-links straight to that trip.
- **Dark mode** (`hooks/useTheme.ts`) — toggle in the header, respects
  `prefers-color-scheme` on first visit, persists to `localStorage`.
- **Print / PWA** — a print stylesheet in `index.css` strips nav and filter
  chrome (anything `.no-print`) and always prints the light palette; a
  manifest + service worker (`public/manifest.webmanifest`, `public/sw.js`)
  make the app installable and usable offline.

## Architecture note: MCP vs. the deployed app

MCP (what inspected this schema) only runs inside a Claude session — a
browser app can't call it, and it can't call the Notion API directly either
(Notion requires a secret token and blocks browser CORS). `api/notion/travel-tracker.ts`
is an example serverless route that holds the token server-side and proxies
the query; `services/notionAdapter.ts` fetches from that route. Point
`VITE_NOTION_PROXY_URL` at wherever you deploy it.

## File hierarchy

```
travel-tracker/
├── api/
│   └── notion/
│       └── travel-tracker.ts        # example backend proxy (see note above)
├── public/
│   ├── manifest.webmanifest         # PWA manifest
│   ├── sw.js                        # service worker — see "Offline / PWA" below
│   └── icon-192.png / icon-512.png / icon.svg
├── src/
│   ├── types/
│   │   └── travel.ts                # domain types + raw Notion API types
│   ├── utils/
│   │   ├── transformNotionData.ts   # pure Notion JSON -> Trip parsers
│   │   ├── geo.ts                   # haversine distance
│   │   ├── regions.ts               # single source of truth: country -> continent
│   │   └── weather.ts               # Open-Meteo archive -> monthly climate averages
│   ├── services/
│   │   └── notionAdapter.ts         # fetch + TanStack Query hook + stats + HOME_LOCATION
│   ├── hooks/
│   │   └── useTheme.ts              # light/dark toggle + persistence
│   ├── lib/
│   │   └── queryClient.ts
│   ├── components/
│   │   └── PasswordGate.tsx         # client-side deterrent, not real auth — see file header
│   ├── features/
│   │   ├── trips/
│   │   │   ├── components/
│   │   │   │   ├── TripDashboard.tsx
│   │   │   │   ├── TripCard.tsx
│   │   │   │   ├── FilterPills.tsx  # also exports the shared <Pill>
│   │   │   │   ├── SortControl.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── PassportStamp.tsx      # shared signature element
│   │   │   │   └── TripDetails/
│   │   │   │       ├── TripDetailModal.tsx
│   │   │   │       ├── TripLocationMap.tsx
│   │   │   │       ├── TripPictures.tsx
│   │   │   │       ├── PhotoLightbox.tsx
│   │   │   │       └── WeatherWidget.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useFilteredTrips.ts     # filter + search + sort
│   │   │   │   └── useDestinationClimate.ts
│   │   │   └── utils/
│   │   │       ├── formatTrip.ts
│   │   │       └── stampRecipe.ts         # per-trip stamp shape/rotation/label
│   │   ├── map/
│   │   │   ├── components/
│   │   │   │   ├── TravelMap.tsx    # react-leaflet, no API key required
│   │   │   │   └── MapPage.tsx      # full-page Map tab
│   │   │   └── utils/
│   │   │       └── mapIcons.ts      # divIcon markers: status dot, visit-count badge, home
│   │   ├── stats/
│   │   │   └── components/
│   │   │       ├── TripStats.tsx    # dashboard stat row
│   │   │       └── MilesPage.tsx    # Miles Traveled tab + world coverage
│   │   ├── planning/               # Plan tab — localStorage-only, never syncs
│   │   │   ├── components/
│   │   │   │   ├── PlanPage.tsx
│   │   │   │   ├── BucketListPlanCard.tsx
│   │   │   │   └── NextAdventurePicker.tsx
│   │   │   └── hooks/
│   │   │       └── useBucketListPlan.ts
│   │   ├── compare/
│   │   │   └── components/
│   │   │       └── ComparePage.tsx
│   │   └── itinerary/
│   │       └── components/
│   │           ├── TripTimeline.tsx # dashboard sidebar preview — see "Schema gaps" above
│   │           └── TimelinePage.tsx # full-page Timeline tab
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                    # theme tokens, print + reduced-motion rules
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Offline / PWA

`public/sw.js` is hand-rolled (no build plugin) and deliberately **not**
cache-first across the board: the site redeploys weekly via cron purely to
refresh Notion data, so a naive cache would serve months-old trips. It uses
network-first for navigations and the trip JSON (fresh wins, cache is the
offline fallback) and cache-first only for Vite's content-hashed
`/assets/` files, whose bytes never change for a given URL.

Two non-obvious details, both learned by actually testing offline:

- **Install-time precache reads `index.html`.** On a first visit the page's
  JS/CSS are requested before the worker takes control, so they'd never be
  cached and a later offline load would boot blank. Since Vite hashes those
  filenames, the worker parses them out of the cached `index.html` and
  precaches them explicitly.
- **All cache lookups pass `ignoreVary: true`.** Static hosts send
  `Vary: Origin` on assets, and a `<script type="module" crossorigin>`
  request carries an `Origin` header the precache request didn't — strict
  Vary matching misses every precached asset and silently breaks offline.

Bump `VERSION` in `sw.js` when changing caching behavior; old caches are
dropped on activate.

## Design notes

Palette and type are drawn from the subject itself — the database already
has a `Passport Stamp` formula and a "🛂 Passport" gallery view — so the UI
leans into a passport/ticket-stub identity rather than a generic travel-blue
theme: ink-navy + brass foil + a stamp-red/horizon-teal status pair, Fraunces
for display type, Inter for body copy, IBM Plex Mono for dates/data (see
`tailwind.config.ts`). The recurring rotated stamp badge (`PassportStamp.tsx`,
shape/rotation/tick-count/label derived per-trip in `stampRecipe.ts`) is the
one signature element, reused in trip cards, the detail modal, and the
Timeline tab rather than scattered across the UI.

The Miles Traveled charts (bar chart, ranked leaderboard) stick to the app's
existing palette rather than introducing new chart colors: brass as the
single sequential hue for every bar, with every value direct-labeled in
ink so the (sub-3:1) brass-on-paper contrast never has to carry a value
on its own.

### Theming (light / dark)

Colors split into two groups in `tailwind.config.ts`:

- **Fixed in both themes:** `ink-navy`, `cream`, `brass`. Together
  ink-navy + cream are the "always dark chrome and its light foreground"
  pair — the header, active tabs, and active filter pills look identical in
  either theme, which keeps the passport-stamp identity stable.
- **Theme-aware:** `ink`, `paper`, `surface`, `slate`, `stamp-red`,
  `horizon-teal`. Each resolves to an `rgb(var(--color-…) / <alpha-value>)`
  custom property defined under `:root` and `:root.dark` in `index.css`, so
  the whole palette swaps without touching component classNames.

`surface` is the card/panel color (it replaced hardcoded `bg-white/NN`): a
step lighter than `paper` in each mode, so `ink` text always has something to
stand against. The dark steps for `stamp-red` and `horizon-teal` are
lightened versions of the light-mode hues chosen to clear 4.5:1 against the
dark surface — not the same values dimmed. One gotcha worth knowing: the
passport stamp uses `mix-blend-mode: multiply` to sink ink into paper, which
on a dark surface darkens it into invisibility — it switches to `screen` in
dark mode for the equivalent effect.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks (tsc -b) then builds — verified passing
```

Without a live `VITE_NOTION_PROXY_URL` backend deployed, `TripDashboard`
will show its error state — that's expected; wire up `api/notion/travel-tracker.ts`
(or your own equivalent) to see real data.

`PasswordGate` (wraps the whole app in `main.tsx`) only activates if
`VITE_SITE_PASSWORD_HASH` is set — leave it unset for local dev. It's a
client-side deterrent for the static GitHub Pages deploy, not real access
control (see the file's own header comment).

The service worker registers **in production builds only** — in dev it would
shadow Vite's HMR and the Notion proxy. To exercise offline behavior locally:

```bash
npm run build && npx vite preview   # http://localhost:4173
```
