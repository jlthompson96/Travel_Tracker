/**
 * utils/transformNotionData.ts
 *
 * Pure, side-effect-free parsing of raw Notion API v1 page objects into the
 * app's normalized `Trip` shape. No network calls live here — see
 * services/notionAdapter.ts for fetching. Keeping this pure makes it trivial
 * to unit test with fixture JSON pulled straight from the Notion API.
 */

import type {
  Country,
  NotionDateProperty,
  NotionFilesProperty,
  NotionFormulaProperty,
  NotionMultiSelectProperty,
  NotionPlaceProperty,
  NotionRichTextProperty,
  NotionSelectProperty,
  NotionTitleProperty,
  NotionTravelPage,
  RatingStars,
  Trip,
  TripDateRange,
  TripLocation,
  TripPhoto,
  TripPriority,
  TripStatus,
  TripType,
} from '../types/travel';

// ---------------------------------------------------------------------------
// Field-level parsers — one per Notion property type actually used in the DB
// ---------------------------------------------------------------------------

export function parseTitle(prop: NotionTitleProperty | undefined): string {
  if (!prop?.title?.length) return 'Untitled trip';
  return prop.title.map((t) => t.plain_text).join('').trim() || 'Untitled trip';
}

export function parseRichText(prop: NotionRichTextProperty | undefined): string | null {
  if (!prop?.rich_text?.length) return null;
  const text = prop.rich_text.map((t) => t.plain_text).join('');
  return text.trim() ? text : null;
}

export function parseSelect<T extends string>(prop: NotionSelectProperty | undefined): T | null {
  return (prop?.select?.name as T) ?? null;
}

export function parseMultiSelect<T extends string>(
  prop: NotionMultiSelectProperty | undefined,
): T[] {
  return (prop?.multi_select ?? []).map((opt) => opt.name as T);
}

/** "★★★" -> 3. Falls back to null for anything that isn't a star string. */
export function parseRatingStars(prop: NotionSelectProperty | undefined): RatingStars | null {
  const name = prop?.select?.name;
  if (!name) return null;
  const count = [...name].filter((ch) => ch === '★').length;
  return count >= 1 && count <= 5 ? (count as RatingStars) : null;
}

export function parseDateRange(prop: NotionDateProperty | undefined): TripDateRange | null {
  const date = prop?.date;
  if (!date?.start) return null;

  const nights = date.end
    ? Math.round(
        (new Date(date.end).getTime() - new Date(date.start).getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  return {
    start: date.start,
    end: date.end,
    isDateTime: date.start.includes('T'),
    nights: nights !== null && nights >= 0 ? nights : null,
  };
}

export function parseLocation(prop: NotionPlaceProperty | undefined): TripLocation | null {
  const place = prop?.place;
  const latitude = place?.latitude ?? place?.lat ?? null;
  const longitude = place?.longitude ?? place?.lon ?? null;

  if (!place || (latitude == null && longitude == null && !place.name)) return null;

  return {
    name: place.name ?? '',
    address: place.address ?? null,
    latitude,
    longitude,
  };
}

export function parsePhotos(prop: NotionFilesProperty | undefined): TripPhoto[] {
  if (!prop?.files?.length) return [];
  return prop.files.map((f, i) => ({
    id: `${f.name}-${i}`,
    name: f.name,
    url: f.type === 'file' ? f.file?.url ?? '' : f.external?.url ?? '',
    expiryTime: f.type === 'file' ? f.file?.expiry_time ?? null : null,
  })).filter((p) => p.url);
}

/**
 * The formula's *result* type isn't knowable from the schema alone (Notion
 * doesn't expose formula source via the public API). We defensively read
 * whichever result variant is present rather than assuming "string".
 */
export function parsePassportStamp(prop: NotionFormulaProperty | undefined): string | null {
  const formula = prop?.formula;
  if (!formula) return null;
  switch (formula.type) {
    case 'string':
      return formula.string;
    case 'number':
      return formula.number != null ? String(formula.number) : null;
    case 'boolean':
      return formula.boolean != null ? String(formula.boolean) : null;
    case 'date':
      return formula.date?.start ?? null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Row-level transform
// ---------------------------------------------------------------------------

export function transformNotionPage(page: NotionTravelPage): Trip {
  const props = page.properties;

  return {
    id: page.id,
    url: page.url,
    destination: parseTitle(props.Destination),
    country: parseSelect<Country>(props.Country),
    status: parseSelect<TripStatus>(props.Status),
    priority: parseSelect<TripPriority>(props.Priority),
    ratingStars: parseRatingStars(props.Rating),
    tripTypes: parseMultiSelect<TripType>(props['Trip Type']),
    dateVisited: parseDateRange(props['Date Visited']),
    location: parseLocation(props.Location),
    notes: parseRichText(props.Notes),
    photos: parsePhotos(props.Photos),
    passportStamp: parsePassportStamp(props['Passport Stamp']),
    budget: props.Budget?.number ?? null,
    createdTime: page.created_time,
  };
}

export function transformNotionPages(pages: NotionTravelPage[]): Trip[] {
  return pages.map(transformNotionPage);
}
