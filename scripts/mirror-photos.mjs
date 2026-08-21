/**
 * scripts/mirror-photos.mjs
 *
 * Downloads every Notion-hosted trip photo into public/photos/ at build time.
 *
 * Notion's `file` URLs are pre-signed S3 links carrying `X-Amz-Expires=3600`,
 * and Notion mints a different one on every query. Serving them directly works
 * while online — api/notion/travel-tracker.ts queries Notion live, so a URL is
 * seconds old by the time the browser sees it — but it makes photos impossible
 * to cache and therefore impossible to show offline. Mirroring gives every
 * photo a stable path that the service worker can precache.
 *
 * The API route rewrites live responses to point here; the filename rule is
 * shared with src/utils/photoNaming.ts and the two MUST agree.
 *
 * Without NOTION_TOKEN this is a no-op so `npm run build` still succeeds
 * uncredentialed — photos simply fall back to whatever the API returns.
 */
import { Client } from '@notionhq/client';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import convertHeic from 'heic-convert';
import sharp from 'sharp';

// CI sets NOTION_TOKEN directly; locally, pick it up from .env like the Vite
// dev server does, so `npm run build` mirrors real photos without extra steps.
try {
  process.loadEnvFile(path.join(process.cwd(), '.env'));
} catch {
  // no .env file — fine, e.g. in CI
}

const TRAVEL_TRACKER_DATA_SOURCE_ID = '1b1d8fd9-c723-4201-b1fc-5968d59e658a';
const PHOTO_DIR = path.join(process.cwd(), 'public', 'photos');

/** Browsers other than Safari can't decode HEIC, so those get transcoded. */
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

/** Notion tolerates bursts, but there's no reason to open 60 sockets at once. */
const CONCURRENCY = 5;

/**
 * Derives the mirrored filename from a Notion file URL, whose path is shaped
 * `/<workspace-id>/<block-id>/<original name>`. The block id is stable across
 * builds, so local names stay cache-friendly.
 *
 * KEEP IN SYNC with localPhotoName() in src/utils/photoNaming.ts — the API
 * route uses that to rewrite response URLs, and a mismatch means a 404. Returns
 * null for URLs that aren't shaped like a Notion file, which are left unmirrored.
 */
function localPhotoName(url) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  const originalName = decodeURIComponent(segments.at(-1) ?? '');
  const stableId = segments.at(-2);
  if (!stableId || !originalName) return null;

  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  return `${stableId}${HEIC_EXTENSIONS.has(ext) ? '.jpg' : ext}`;
}

/** Runs `worker` over `items` with at most `limit` in flight. */
async function pool(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

/** Original extension as Notion stores it — decides whether transcoding is needed. */
function sourceExtension(url) {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '');
    return path.extname(name).toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Straight from Notion these are ~1MB each at full camera resolution, which is
 * absurd for a 400px grid thumbnail and unacceptable for the service worker to
 * precache onto a phone. Cap the long edge and re-encode.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 82;

async function downloadPhoto({ url, localName, transcode }) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  let bytes = Buffer.from(await res.arrayBuffer());
  if (transcode) {
    // sharp is not built with HEIC support in the prebuilt binaries, so this
    // still goes through heic-convert first; sharp only handles the resize.
    bytes = Buffer.from(await convertHeic({ buffer: bytes, format: 'JPEG', quality: 0.9 }));
  }

  const original = bytes.length;
  try {
    const pipeline = sharp(bytes)
      .rotate() // honour EXIF orientation before we strip the metadata
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });

    // Only re-encode as JPEG when the filename says JPEG. Writing JPEG bytes
    // into a .png would leave the file's Content-Type lying about its contents;
    // for anything else sharp keeps the input format.
    const ext = path.extname(localName).toLowerCase();
    bytes = await (ext === '.jpg' || ext === '.jpeg'
      ? pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      : pipeline
    ).toBuffer();
  } catch (error) {
    // A photo sharp can't parse is still better served at full size than not
    // at all — keep the original bytes and carry on.
    console.warn(`[mirror-photos] Could not resize ${localName}; keeping original:`, error.message);
  }

  await writeFile(path.join(PHOTO_DIR, localName), bytes);
  return { original, final: bytes.length };
}

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.warn('[mirror-photos] No NOTION_TOKEN set; skipping photo mirror.');
    return;
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  let results;
  try {
    ({ results } = await notion.dataSources.query({
      data_source_id: TRAVEL_TRACKER_DATA_SOURCE_ID,
      page_size: 100,
    }));
  } catch (error) {
    // A failed mirror must not fail the build: the API route still serves live
    // signed URLs, so the site works online — it just won't have offline photos.
    console.error('[mirror-photos] Failed to query Notion; skipping mirror:', error);
    return;
  }

  const entries = [];
  for (const page of results ?? []) {
    for (const file of page.properties?.Photos?.files ?? []) {
      if (file.type !== 'file' || !file.file?.url) continue;
      const localName = localPhotoName(file.file.url);
      if (!localName) {
        console.warn(`[mirror-photos] Unrecognized photo URL shape for ${file.name ?? '(unnamed)'}; leaving it live.`);
        continue;
      }
      entries.push({
        url: file.file.url,
        localName,
        name: file.name,
        transcode: HEIC_EXTENSIONS.has(sourceExtension(file.file.url)),
      });
    }
  }

  // Rebuilt from scratch each run so photos deleted in Notion don't linger.
  await rm(PHOTO_DIR, { recursive: true, force: true });
  await mkdir(PHOTO_DIR, { recursive: true });

  if (entries.length === 0) {
    await writeFile(path.join(PHOTO_DIR, 'manifest.json'), '[]', 'utf-8');
    console.log('[mirror-photos] No Notion-hosted photos to mirror.');
    return;
  }

  const mirrored = [];
  let originalBytes = 0;
  let finalBytes = 0;

  await pool(entries, CONCURRENCY, async (entry) => {
    try {
      const { original, final } = await downloadPhoto(entry);
      mirrored.push(entry.localName);
      originalBytes += original;
      finalBytes += final;
    } catch (error) {
      console.warn(
        `[mirror-photos] Could not mirror ${entry.name ?? '(unnamed)'}:`,
        error instanceof Error ? error.message : error,
      );
    }
  });

  // Read by public/sw.js at install time to precache photos for offline use.
  // Only names that actually downloaded go in, so the worker never precaches a
  // 404. Lives inside public/photos/ (gitignored) because it is a build output.
  await writeFile(path.join(PHOTO_DIR, 'manifest.json'), JSON.stringify(mirrored.sort()), 'utf-8');

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;
  console.log(
    `[mirror-photos] Mirrored ${mirrored.length}/${entries.length} photo(s) into public/photos/ ` +
      `(${mb(originalBytes)} -> ${mb(finalBytes)}).`,
  );
}

main();
