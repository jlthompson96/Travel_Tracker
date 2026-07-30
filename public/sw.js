/*
 * Travel Tracker service worker.
 *
 * The site redeploys weekly via cron (see .github/workflows/deploy.yml) purely
 * to refresh Notion data, so a naive cache-first worker would happily serve
 * months-old trips. Strategy per request type:
 *
 *   - navigations + trip JSON -> network-first (fresh wins; cache is the
 *     offline fallback), so a redeploy is picked up on the next online load.
 *   - hashed build assets     -> cache-first (Vite content-hashes filenames,
 *     so a given URL's bytes never change).
 *   - cross-origin (OSM tiles, open-meteo) -> network-only, uncached. Map tiles
 *     are unbounded in size and not worth evicting real app data for.
 */

const VERSION = 'v1';
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

  // Seed the trip data too, so a first-ever offline load still has trips.
  try {
    const data = await caches.open(DATA_CACHE);
    await data.add('./data/travel-tracker.json');
  } catch {
    // dev/proxy setups won't have the static snapshot — not fatal.
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
  return url.pathname.includes('/data/travel-tracker.json') || url.pathname.includes('/api/notion/');
}

function isHashedAsset(url) {
  return url.pathname.includes('/assets/');
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

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, SHELL_CACHE));
});
