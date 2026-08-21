/**
 * types/travel.ts
 *
 * Types derived from the LIVE schema of the "Travel Tracker" Notion database
 * (data source id: 1b1d8fd9-c723-4201-b1fc-5968d59e658a), inspected via MCP.
 *
 * Two layers live in this file:
 *  1. "Notion*" raw types — shape of the official Notion REST API v1 response
 *     (`properties.<Name>.<type>.<value>`), which is what a server-side
 *     integration receives.
 *  2. Domain types (Trip, etc.) — the clean, normalized shape the React app
 *     actually consumes. transformNotionData.ts converts (1) -> (2).
 */

// ---------------------------------------------------------------------------
// Domain enums — values copied verbatim from the live Select/Multi-select
// option lists so the UI can't drift from what's actually configured in Notion.
// ---------------------------------------------------------------------------

export type TripStatus = 'Been There' | 'Bucket List';

export type TripPriority = 'High' | 'Medium' | 'Low';

export type TripType = 'Beach' | 'City' | 'Hiking' | 'Food' | 'Road Trip' | 'Culture';

/** Continents only. There is deliberately no 'World' member — it used to exist as a
 * pseudo-region that every consumer had to special-case back into meaning 'All'. */
export type MapRegion = 'Europe' | 'North America' | 'South America' | 'Asia' | 'Africa' | 'Oceania';

/**
 * The trip filter state, shared by the dashboard, map, and timeline through the
 * single `useFilteredTrips` instance in App.tsx.
 */
export interface TripFilters {
  status: TripStatus | 'All';
  /** Empty array means "All" — multiple countries can be selected at once. */
  countries: Country[];
  /** Empty array means "All" — multiple trip types can be selected at once. */
  tripTypes: TripType[];
  region: MapRegion | 'All';
}

/**
 * Countries known to be on the "Country" select property when this was written,
 * in the order Notion returns them.
 *
 * This is a display-ordering hint, NOT the set of valid values. It used to be a
 * closed union (`type Country = (typeof COUNTRY_OPTIONS)[number]`), which was
 * safe only while data arrived through a snapshot rebuilt from this same list.
 * Now that api/notion/travel-tracker.ts queries Notion live, adding a country in
 * Notion surfaces it immediately — and a closed union would have silently
 * dropped it from filters with no error anywhere. `useFilteredTrips` derives its
 * country list from the data at runtime, so nothing depends on this being complete.
 */
export const COUNTRY_OPTIONS = [
  'USA', 'Greece', 'Italy', 'France', 'Spain', 'Japan', 'Mexico', 'Portugal',
  'Thailand', 'Costa Rica', 'Iceland', 'Ireland', 'Germany', 'Hungary',
  'Bulgaria', 'Ukraine', 'Vatican City', 'New Zealand', 'Scotland', 'England',
  'St. Vincent and the Grenadines', 'Australia',
] as const;

/** Any country name Notion returns. See COUNTRY_OPTIONS for the known set. */
export type Country = string;

/** 1–5, parsed from the "★".."★★★★★" select options. */
export type RatingStars = 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Domain shapes
// ---------------------------------------------------------------------------

export interface TripLocation {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface TripPhoto {
  id: string;
  name: string;
  url: string;
  /** Notion-hosted file URLs expire; re-fetch the page if this is stale. */
  expiryTime: string | null;
}

export interface TripDateRange {
  start: string | null; // ISO date, e.g. "2026-01-17"
  end: string | null; // ISO date, present only for multi-day ranges
  isDateTime: boolean;
  /** Convenience: end - start in nights, or null if incomplete. */
  nights: number | null;
}

/**
 * NOTE ON "Itinerary" (see README "Schema gaps"):
 * The live database has no day-by-day sub-item relation — "Date Visited" is
 * a single start/end range per trip, not a linked itinerary.
 */
export interface Trip {
  id: string;
  url: string;
  destination: string;
  country: Country | null;
  status: TripStatus | null;
  priority: TripPriority | null;
  ratingStars: RatingStars | null;
  tripTypes: TripType[];
  dateVisited: TripDateRange | null;
  location: TripLocation | null;
  notes: string | null;
  photos: TripPhoto[];
  /** Opaque computed value from the "Passport Stamp" formula property. */
  passportStamp: string | null;
  createdTime: string;
}

export interface TripStats {
  totalBeenThere: number;
  totalBucketList: number;
  countriesVisited: number;
  countriesOnBucketList: number;
  byCountry: Record<string, number>;
  byTripType: Record<TripType, number>;
  byRating: Record<RatingStars, number>;
  byYear: Record<string, number>;
  /** Straight-line round-trip miles from HOME_LOCATION to every "Been There" trip, summed. */
  milesTraveled: number;
}

// ---------------------------------------------------------------------------
// Raw Notion API v1 property shapes (server-side integration target)
// ---------------------------------------------------------------------------

export interface NotionSelectOption {
  id: string;
  name: string;
  color: string;
}

export interface NotionSelectProperty {
  type: 'select';
  select: NotionSelectOption | null;
}

export interface NotionMultiSelectProperty {
  type: 'multi_select';
  multi_select: NotionSelectOption[];
}

export interface NotionTitleProperty {
  type: 'title';
  title: Array<{ plain_text: string }>;
}

export interface NotionRichTextProperty {
  type: 'rich_text';
  rich_text: Array<{ plain_text: string }>;
}

export interface NotionDateProperty {
  type: 'date';
  date: { start: string; end: string | null; time_zone: string | null } | null;
}

/** Notion's "Place" property type (address/lat/lng picker). */
export interface NotionPlaceProperty {
  type: 'place';
  place: {
    name: string | null;
    address: string | null;
    latitude?: number | null;
    longitude?: number | null;
    lat?: number | null;
    lon?: number | null;
    google_place_id: string | null;
  } | null;
}

export interface NotionFilesProperty {
  type: 'files';
  files: Array<{
    name: string;
    type: 'file' | 'external';
    // expiry_time is absent on photos the build script has mirrored locally.
    file?: { url: string; expiry_time?: string };
    external?: { url: string };
  }>;
}

export interface NotionFormulaProperty {
  type: 'formula';
  formula:
    | { type: 'string'; string: string | null }
    | { type: 'number'; number: number | null }
    | { type: 'boolean'; boolean: boolean | null }
    | { type: 'date'; date: { start: string; end: string | null } | null };
}

/** Raw `properties` bag for one row of the Travel Tracker data source. */
export interface NotionTravelPageProperties {
  Destination: NotionTitleProperty;
  Country: NotionSelectProperty;
  Status: NotionSelectProperty;
  Priority: NotionSelectProperty;
  Rating: NotionSelectProperty;
  'Trip Type': NotionMultiSelectProperty;
  'Date Visited': NotionDateProperty;
  Location: NotionPlaceProperty;
  Notes: NotionRichTextProperty;
  Photos: NotionFilesProperty;
  'Passport Stamp': NotionFormulaProperty;
}

export interface NotionTravelPage {
  id: string;
  url: string;
  created_time: string;
  properties: NotionTravelPageProperties;
}

export interface NotionQueryResponse {
  results: NotionTravelPage[];
  has_more: boolean;
  next_cursor: string | null;
}
