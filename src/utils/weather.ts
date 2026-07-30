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
