/**
 * api/notion/trip.ts
 *
 * The one write path into Notion. Vercel deploys this as a function; vite.config.ts
 * serves the same module in dev and preview.
 *
 * Security shape (see also src/lib/writeToken.ts):
 *   - Requires an `x-tt-token` header matching TT_WRITE_SECRET, compared in
 *     constant time. That's a single shared secret, not per-user auth: anyone
 *     who knows the site password can write. Deliberate for a two-person log.
 *   - The client sends DOMAIN fields (status, rating, notes...), never Notion
 *     property JSON. This handler builds the properties object itself, so there
 *     is no path for a caller to touch a property this file doesn't name —
 *     an allowlist by construction rather than by filtering.
 */
import { Client } from '@notionhq/client';

/** Domain-level patch the client is allowed to request. Everything else is ignored. */
interface TripPatch {
  status?: 'Been There' | 'Bucket List' | null;
  ratingStars?: 1 | 2 | 3 | 4 | 5 | null;
  priority?: 'High' | 'Medium' | 'Low' | null;
  notes?: string | null;
  dateVisited?: { start: string; end?: string | null } | null;
}

const STATUSES = new Set(['Been There', 'Bucket List']);
const PRIORITIES = new Set(['High', 'Medium', 'Low']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Length-independent comparison so a wrong token can't be discovered byte by byte. */
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * Translates the domain patch into Notion property JSON, skipping anything the
 * caller didn't explicitly include. `null` means "clear this field", which is
 * distinct from omitting it.
 */
function buildProperties(patch: TripPatch): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  if ('status' in patch) {
    if (patch.status === null) properties.Status = { select: null };
    else if (typeof patch.status === 'string' && STATUSES.has(patch.status)) {
      properties.Status = { select: { name: patch.status } };
    }
  }

  if ('ratingStars' in patch) {
    if (patch.ratingStars === null) properties.Rating = { select: null };
    else if (Number.isInteger(patch.ratingStars) && patch.ratingStars! >= 1 && patch.ratingStars! <= 5) {
      // The select options are star strings ("★★★"), which is what
      // parseRatingStars reads back. Notion creates the option if it's missing,
      // so a fresh database won't reject this.
      properties.Rating = { select: { name: '★'.repeat(patch.ratingStars!) } };
    }
  }

  if ('priority' in patch) {
    if (patch.priority === null) properties.Priority = { select: null };
    else if (typeof patch.priority === 'string' && PRIORITIES.has(patch.priority)) {
      properties.Priority = { select: { name: patch.priority } };
    }
  }

  if ('notes' in patch) {
    const text = typeof patch.notes === 'string' ? patch.notes : '';
    // Notion caps a single rich-text run at 2000 characters.
    properties.Notes = text ? { rich_text: [{ text: { content: text.slice(0, 2000) } }] } : { rich_text: [] };
  }

  if ('dateVisited' in patch) {
    if (patch.dateVisited === null) properties['Date Visited'] = { date: null };
    else if (patch.dateVisited && ISO_DATE.test(patch.dateVisited.start)) {
      const end = patch.dateVisited.end;
      properties['Date Visited'] = {
        date: { start: patch.dateVisited.start, end: end && ISO_DATE.test(end) ? end : null },
      };
    }
  }

  return properties;
}

export async function PATCH(request: Request) {
  // Read inside the handler, not at module scope: vite.config.ts imports this
  // module statically and only then copies .env onto process.env, so a
  // module-scope read would capture undefined and 503 every local request.
  const WRITE_SECRET = process.env.TT_WRITE_SECRET;

  if (!WRITE_SECRET) {
    return json({ error: 'Editing is not configured on this deployment (TT_WRITE_SECRET unset).' }, 503);
  }
  if (!process.env.NOTION_TOKEN) {
    return json({ error: 'No NOTION_TOKEN configured.' }, 503);
  }

  const token = request.headers.get('x-tt-token');
  if (!token || !secretsMatch(token, WRITE_SECRET)) {
    return json({ error: 'Not authorized to edit.' }, 401);
  }

  let body: { id?: string; patch?: TripPatch };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  if (!body?.id || typeof body.id !== 'string') {
    return json({ error: 'Missing trip id.' }, 400);
  }

  const properties = buildProperties(body.patch ?? {});
  if (Object.keys(properties).length === 0) {
    return json({ error: 'No editable fields in patch.' }, 400);
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  try {
    const page = await notion.pages.update({ page_id: body.id, properties: properties as never });
    return json({ ok: true, page }, 200);
  } catch (error) {
    console.error('Notion update error', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to update Notion' }, 502);
  }
}
