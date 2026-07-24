# Travel Tracker

A modular React dashboard built directly against the live schema of your
Notion **Travel Tracker** database (23 entries, data source id
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
| Date Visited | date (range) | start / end / is_datetime | `Trip.dateVisited` — card date, timeline |
| Location | **place** | name / address / lat / lng | `Trip.location` — map markers |
| Notes | rich text | — | `Trip.notes` |
| Photos | files | Notion-hosted or external | `Trip.photos` (gallery use in TripCard) |
| Passport Stamp | formula | opaque result (string/number/bool/date) | `Trip.passportStamp` |

**Schema gaps — read before wiring up Budget or Itinerary:**
The spec asked for a Budget module mapped to "cost/expense properties" and
an Itinerary module for "daily schedules linked to each trip." Neither
exists in the live database — there's no Number/currency property and no
linked sub-item relation for day-by-day plans. Rather than invent fields
that aren't there:

- **`features/budget`** ships as `TripStats.tsx`: real aggregate metrics
  (trips taken, countries visited, bucket-list count) computed from data
  that actually exists. `computeTripStats()` also checks for an optional
  `Budget` number property and will render a spend total automatically the
  moment you add one in Notion — no code changes needed.
- **`features/itinerary`** ships as `TripTimeline.tsx`: a chronological
  timeline of each trip's date range (with nights calculated). It's built
  to extend cleanly if you later add a linked "Itinerary Items" data source.

**Also worth knowing:** `Location` and `Passport Stamp` were excluded from
this data source's SQL query interface by Notion itself
(`notAvailableInQuerySql`) — they were read via direct page fetches instead.
`Passport Stamp`'s formula source isn't exposed by the Notion API at all
(only its computed result), so `transformNotionData.ts` reads it
defensively across all four possible result types instead of assuming one.

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
├── src/
│   ├── types/
│   │   └── travel.ts                # domain types + raw Notion API types
│   ├── utils/
│   │   └── transformNotionData.ts   # pure Notion JSON -> Trip parsers
│   ├── services/
│   │   └── notionAdapter.ts         # fetch + TanStack Query hook + stats
│   ├── lib/
│   │   └── queryClient.ts
│   ├── features/
│   │   ├── trips/
│   │   │   ├── components/
│   │   │   │   ├── TripDashboard.tsx
│   │   │   │   ├── TripCard.tsx
│   │   │   │   ├── FilterPills.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── StampBadge.tsx   # shared signature element
│   │   │   └── hooks/
│   │   │       └── useFilteredTrips.ts
│   │   ├── map/
│   │   │   └── components/
│   │   │       └── TravelMap.tsx    # react-leaflet, no API key required
│   │   ├── budget/
│   │   │   └── components/
│   │   │       └── TripStats.tsx    # see "Schema gaps" above
│   │   └── itinerary/
│   │       └── components/
│   │           └── TripTimeline.tsx # see "Schema gaps" above
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Design notes

Palette and type are drawn from the subject itself — the database already
has a `Passport Stamp` formula and a "🛂 Passport" gallery view — so the UI
leans into a passport/ticket-stub identity rather than a generic travel-blue
theme: ink-navy + brass foil + a stamp-red/horizon-teal status pair, Fraunces
for display type, Inter for body copy, IBM Plex Mono for dates/data (see
`tailwind.config.ts`). The recurring rotated dashed-circle stamp badge
(`StampBadge.tsx`) is the one signature element, reused in trip cards and
map markers rather than scattered across the UI.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks (tsc -b) then builds — verified passing
```

Without a live `VITE_NOTION_PROXY_URL` backend deployed, `TripDashboard`
will show its error state — that's expected; wire up `api/notion/travel-tracker.ts`
(or your own equivalent) to see real data.
