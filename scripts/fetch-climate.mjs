/**
 * scripts/fetch-climate.mjs
 *
 * Precomputes monthly climate for every trip location into
 * public/data/climate.json, keyed by rounded coordinate.
 *
 * The trip modal has always fetched Open-Meteo live for the one destination
 * you opened, which is fine. The Seasons planner scores the WHOLE bucket list
 * at once — ~46 destinations — and firing 46 requests on tab open is both slow
 * and rude to a free keyless API. Doing it once per build is neither.
 *
 * Open-Meteo's archive API needs no key and allows generous daily volume, so
 * ~60 requests per deploy is nothing. Concurrency is capped anyway.
 *
 * Without NOTION_TOKEN this writes an empty map rather than failing: the
 * WeatherWidget falls back to fetching live, so the app degrades to exactly
 * the behavior it had before this script existed.
 */
import { Client } from '@notionhq/client';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'));
} catch {
  // no .env file — fine, e.g. in CI
}

const TRAVEL_TRACKER_DATA_SOURCE_ID = '1b1d8fd9-c723-4201-b1fc-5968d59e658a';
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'data', 'climate.json');
const CONCURRENCY = 5;

/**
 * Rounded to 2dp (~1.1km). Coarser than groupTrips' 3dp because climate does
 * not vary at street level, and it means repeat visits to one place share a
 * single entry. MUST match climateKey() in src/utils/weather.ts.
 */
function climateKey(lat, lng) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

async function pool(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

function average(values) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : NaN;
}

/** Mirrors fetchMonthlyClimate() in src/utils/weather.ts — same API call, same aggregation. */
async function fetchMonthlyClimate(lat, lng) {
  const year = new Date().getFullYear() - 1;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${year}-01-01&end_date=${year}-12-31` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const days = data.daily?.time ?? [];
  const highs = data.daily?.temperature_2m_max ?? [];
  const lows = data.daily?.temperature_2m_min ?? [];
  const precip = data.daily?.precipitation_sum ?? [];

  const buckets = Array.from({ length: 12 }, () => ({ highs: [], lows: [], precip: [] }));
  days.forEach((date, i) => {
    const monthIndex = Number(date.slice(5, 7)) - 1;
    if (highs[i] != null) buckets[monthIndex].highs.push(highs[i]);
    if (lows[i] != null) buckets[monthIndex].lows.push(lows[i]);
    if (precip[i] != null) buckets[monthIndex].precip.push(precip[i]);
  });

  return buckets.map((bucket, i) => ({
    month: i + 1,
    avgHighF: average(bucket.highs),
    avgLowF: average(bucket.lows),
    totalPrecipIn: bucket.precip.reduce((sum, v) => sum + v, 0),
  }));
}

async function main() {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  if (!process.env.NOTION_TOKEN) {
    console.warn('[fetch-climate] No NOTION_TOKEN set; writing empty climate map.');
    await writeFile(OUTPUT_PATH, '{}', 'utf-8');
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
    console.error('[fetch-climate] Failed to query Notion; writing empty climate map:', error);
    await writeFile(OUTPUT_PATH, '{}', 'utf-8');
    return;
  }

  // Deduplicate by rounded coordinate before fetching anything.
  const wanted = new Map();
  for (const page of results ?? []) {
    const place = page.properties?.Location?.place;
    const lat = place?.latitude ?? place?.lat;
    const lng = place?.longitude ?? place?.lon;
    if (lat == null || lng == null) continue;
    const key = climateKey(lat, lng);
    if (!wanted.has(key)) wanted.set(key, { lat, lng, key });
  }

  const climate = {};
  let failures = 0;

  await pool([...wanted.values()], CONCURRENCY, async ({ lat, lng, key }) => {
    try {
      climate[key] = await fetchMonthlyClimate(lat, lng);
    } catch (error) {
      failures += 1;
      console.warn(`[fetch-climate] ${key} failed:`, error instanceof Error ? error.message : error);
    }
  });

  await writeFile(OUTPUT_PATH, JSON.stringify(climate), 'utf-8');
  console.log(
    `[fetch-climate] Wrote ${Object.keys(climate).length}/${wanted.size} location(s) to ${OUTPUT_PATH}` +
      (failures ? ` (${failures} failed, they'll fetch live in the browser)` : ''),
  );
}

main();
