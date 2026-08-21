/**
 * utils/photoNaming.ts
 *
 * Notion's `file` URLs are pre-signed S3 links that expire after an hour, so
 * they can't be cached — the service worker would store a URL that is dead by
 * the time anyone goes offline. scripts/fetch-notion-data.mjs therefore mirrors
 * every photo into public/photos/ under a name derived from the block id, which
 * is stable across builds. This derives that same name so api/notion/travel-tracker.ts
 * can rewrite live Notion responses to point at the mirror.
 *
 * KEEP IN SYNC with downloadPhoto() in scripts/fetch-notion-data.mjs. The two
 * must agree on the filename or the rewrite points at a 404. There is no shared
 * module because that script is plain .mjs run by node before the bundler exists;
 * the duplication is ~10 lines and is covered by photoNaming.test.ts.
 */

/** Browsers other than Safari can't decode HEIC, so the mirror transcodes those to JPEG. */
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

/** Last dot-suffix of a filename, lowercased. Avoids node:path so this stays browser-safe. */
function extname(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

/**
 * Maps a Notion file URL to its mirrored filename, or null when the URL isn't
 * shaped like one (`/<workspace-id>/<block-id>/<original name>`). Returning null
 * means "not mirrored" — callers keep the original URL, which still works online.
 */
export function localPhotoName(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  const originalName = decodeURIComponent(segments.at(-1) ?? '');
  const stableId = segments.at(-2);
  if (!stableId || !originalName) return null;

  const ext = extname(originalName) || '.jpg';
  return `${stableId}${HEIC_EXTENSIONS.has(ext) ? '.jpg' : ext}`;
}
