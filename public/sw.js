/*
 * Travel Tracker service worker.
 *
 * Trip data is now live from Notion via /api/notion/travel-tracker, and it's
 * editable in-app, so a naive cache-first worker would happily serve a rating
 * you changed a minute ago. Strategy per request type:
 *
 *   - navigations + trip data -> network-first (fresh wins; cache is the
 *     offline fallback), so edits and Notion changes show up immediately.
 *   - hashed build assets     -> cache-first (Vite content-hashes filenames,
 *     so a given URL's bytes never change).
 *   - mirrored photos         -> cache-first. scripts/mirror-photos.mjs gives
 *     them stable per-block-id names, which is the whole reason they're
 *     mirrored rather than served from Notion's expiring signed URLs.
 *   - cross-origin (OSM tiles, open-meteo) -> network-only, uncached. Map tiles
 *     are unbounded in size and not worth evicting real app data for.
 */

// Bumped to v2 when the app moved off the build-time JSON snapshot onto the
// live API — old caches hold a URL that no longer exists.
const VERSION = 'v2';
const SHELL_CACHE = `tt-shell-${VERSION}`;
const ASSET_CACHE = `tt-assets-${VERSION}`;
const DATA_CACHE = `tt-data-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, DATA_CACHE];

/*
 * On the very first visit the page's JS/CSS are requested before this worker
 * takes control, so they'd never land in a cache and a later offline load
 * would boot to a blank page. Vite content-hashes those filenames, which a
 * static sw.js can't know ahead of time — so read them out of index.html at
 * install time and precache them explicitly.
 */
async function precacheAll() {
  const shell = await caches.open(SHELL_CACHE);
  await shell.addAll(['./', './manifest.webmanifest', './icon-192.png', './icon-512.png']);

  const html = await shell.match('./').then((res) => res?.text());
  if (html) {
    const assetPaths = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map((m) => m[1]);
    if (assetPaths.length) {
      const assets = await caches.open(ASSET_CACHE);
      await assets.addAll(assetPaths);
    }
  }

  // Seed the trip data too, so a first-ever offline load still has trips. This
  // costs one Notion query at install time, which is worth it: without it, a
  // visitor who installs and immediately loses signal boots to an empty app.
  const data = await caches.open(DATA_CACHE);
  await Promise.allSettled([
    data.add('./api/notion/travel-tracker'),
    // Precomputed climate for the Seasons planner and every trip's weather chart.
    data.add('./data/climate.json'),
  ]);

  // Mirrored photos, listed by scripts/mirror-photos.mjs. Resized to a 1600px
  // long edge there precisely so this is a reasonable thing to do over cellular.
  // allSettled throughout: a single missing file must not abort the install and
  // leave the worker with no cache at all.
  try {
    const names = await fetch('./photos/manifest.json').then((res) => (res.ok ? res.json() : []));
    if (Array.isArray(names) && names.length) {
      const photos = await caches.open(ASSET_CACHE);
      await Promise.allSettled(names.map((name) => photos.add(`./photos/${name}`)));
    }
  } catch {
    // No manifest (uncredentialed build) — photos just cache on first view.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAll().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isTripData(url) {
  return url.pathname.includes('/api/notion/') || url.pathname.includes('/data/');
}

function isHashedAsset(url) {
  return url.pathname.includes('/assets/');
}

/** Mirrored trip photos: stable names, immutable bytes — same deal as assets. */
function isMirroredPhoto(url) {
  return url.pathname.startsWith('/photos/');
}

/*
 * ignoreVary matters: static hosts (Vite preview, GitHub Pages) send
 * `Vary: Origin` on assets, and a `<script type="module" crossorigin>` request
 * carries an Origin header that the install-time precache request did not.
 * Strict Vary matching would therefore miss every precached asset and fall
 * through to the network — which is exactly what breaks offline.
 */
const MATCH_OPTS = { ignoreVary: true };

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, MATCH_OPTS);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, MATCH_OPTS);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // OSM tiles / weather API: straight to network

  if (request.mode === 'navigate') {
    // Fall back to the cached app shell so a hard refresh offline still boots.
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(() =>
        caches.open(SHELL_CACHE).then((cache) => cache.match('./', MATCH_OPTS)),
      ),
    );
    return;
  }

  if (isTripData(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (isHashedAsset(url) || isMirroredPhoto(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, SHELL_CACHE));
});
