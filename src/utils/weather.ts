/**
 * Open-Meteo's archive API is free, keyless, and CORS-friendly — a good fit for
 * a static, client-only app with no server to hide a weather API key behind.
 * We pull one full past calendar year of daily highs/lows/precipitation and
 * aggregate it into monthly averages ourselves; it's a rough "typical weather"
 * picture from real observed data, not a multi-year climate normal.
 */
export interface MonthlyClimate {
  /** 1–12 */
  month: number;
  avgHighF: number;
  avgLowF: number;
  totalPrecipIn: number;
}

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Precomputed climate for every trip location, keyed by climateKey. */
export type ClimateIndex = Record<string, MonthlyClimate[]>;

/**
 * Rounded to 2dp (~1.1km) — climate doesn't vary at street level, and this
 * makes repeat visits to one place share an entry.
 * MUST match climateKey() in scripts/fetch-climate.mjs.
 */
export function climateKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

let climateIndexPromise: Promise<ClimateIndex> | null = null;

/**
 * Loads the build-time climate index once per session. A missing or malformed
 * file resolves to {} rather than throwing: every caller falls back to fetching
 * live, which is what the app did before the index existed.
 */
export function loadClimateIndex(): Promise<ClimateIndex> {
  climateIndexPromise ??= fetch(`${import.meta.env.BASE_URL}data/climate.json`)
    .then((res) => (res.ok ? (res.json() as Promise<ClimateIndex>) : {}))
    .catch(() => ({}));
  return climateIndexPromise;
}

/** Precomputed entry if we have one, otherwise a live Open-Meteo fetch. */
export async function getMonthlyClimate(lat: number, lng: number): Promise<MonthlyClimate[]> {
  const index = await loadClimateIndex();
  return index[climateKey(lat, lng)] ?? fetchMonthlyClimate(lat, lng);
}

/**
 * Comfort score: closer to a mild 75°F and drier scores higher. Purely a rough
 * "best months" heuristic from one past year of data — not a forecast.
 *
 * Lives here rather than in WeatherWidget because the Seasons planner scores
 * every bucket-list destination with it. If the two ever disagreed, a trip
 * could be "best in April" on the Plan tab and "best in June" in its own modal.
 */
export function scoreMonth(m: MonthlyClimate): number {
  if (Number.isNaN(m.avgHighF)) return -Infinity;
  return -Math.abs(m.avgHighF - 75) - m.totalPrecipIn * 3;
}

/** Indexes (0-11) of the `count` most comfortable months, unordered. */
export function bestMonthIndexes(climate: MonthlyClimate[], count = 3): Set<number> {
  const scored = climate
    .map((m, i) => ({ i, score: scoreMonth(m) }))
    .filter((m) => Number.isFinite(m.score))
    .sort((a, b) => b.score - a.score);
  return new Set(scored.slice(0, count).map((m) => m.i));
}

export async function fetchMonthlyClimate(lat: number, lng: number): Promise<MonthlyClimate[]> {
  const year = new Date().getFullYear() - 1;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${year}-01-01&end_date=${year}-12-31` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);

  const data = (await res.json()) as {
    daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[] };
  };

  const days = data.daily?.time ?? [];
  const highs = data.daily?.temperature_2m_max ?? [];
  const lows = data.daily?.temperature_2m_min ?? [];
  const precip = data.daily?.precipitation_sum ?? [];

  const buckets = Array.from({ length: 12 }, () => ({ highs: [] as number[], lows: [] as number[], precip: [] as number[] }));

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

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : NaN;
}
