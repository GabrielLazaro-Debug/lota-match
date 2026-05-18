export interface ClimateMonthly {
  month: number; // 1..12
  tmax: number | null;
  tmin: number | null;
  tmean: number | null;
  precip_mm: number | null;
}

export interface ClimateSummary {
  annual_tmax_mean: number | null;
  annual_tmin_mean: number | null;
  annual_tmean: number | null;
  annual_precip_mm: number | null;
  wet_season_months: number[];
  dry_season_months: number[];
  wettest_month: number | null;
  driest_month: number | null;
  monthly: ClimateMonthly[];
}

export const CLIMATE_PERIOD = { start: "2001-01-01", end: "2020-12-31" } as const;

export function buildOpenMeteoClimateUrl(
  lat: number,
  lon: number,
  start: string = CLIMATE_PERIOD.start,
  end: string = CLIMATE_PERIOD.end,
): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: start,
    end_date: end,
    daily: "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,rain_sum",
    timezone: "auto",
  });
  return `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function aggregate(daily: {
  time: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  temperature_2m_mean?: (number | null)[];
  precipitation_sum?: (number | null)[];
  rain_sum?: (number | null)[];
}): ClimateSummary {
  const byMonth: Record<number, { tmax: number[]; tmin: number[]; tmean: number[]; precip: number[] }> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = { tmax: [], tmin: [], tmean: [], precip: [] };
  const n = daily.time?.length ?? 0;
  for (let i = 0; i < n; i++) {
    const d = daily.time[i];
    const m = Number(d.slice(5, 7));
    if (!m) continue;
    const tx = daily.temperature_2m_max?.[i];
    const tn = daily.temperature_2m_min?.[i];
    const tm = daily.temperature_2m_mean?.[i];
    const ps = daily.precipitation_sum?.[i] ?? daily.rain_sum?.[i];
    if (tx != null) byMonth[m].tmax.push(tx);
    if (tn != null) byMonth[m].tmin.push(tn);
    if (tm != null) byMonth[m].tmean.push(tm);
    if (ps != null) byMonth[m].precip.push(ps);
  }
  const yearsSpan = 20;
  const monthly: ClimateMonthly[] = [];
  for (let m = 1; m <= 12; m++) {
    const b = byMonth[m];
    monthly.push({
      month: m,
      tmax: mean(b.tmax),
      tmin: mean(b.tmin),
      tmean: mean(b.tmean),
      precip_mm: b.precip.length ? sum(b.precip) / yearsSpan : null,
    });
  }
  const validPrecip = monthly.map((x) => x.precip_mm).filter((x): x is number => x != null);
  const annual_precip_mm = validPrecip.length ? sum(validPrecip) : null;
  const avg = annual_precip_mm != null ? annual_precip_mm / 12 : null;
  const wet_season_months = avg != null ? monthly.filter((x) => (x.precip_mm ?? -1) >= avg).map((x) => x.month) : [];
  const dry_season_months = avg != null ? monthly.filter((x) => (x.precip_mm ?? Infinity) < avg).map((x) => x.month) : [];
  let wettest_month: number | null = null;
  let driest_month: number | null = null;
  let maxP = -Infinity, minP = Infinity;
  for (const m of monthly) {
    if (m.precip_mm == null) continue;
    if (m.precip_mm > maxP) { maxP = m.precip_mm; wettest_month = m.month; }
    if (m.precip_mm < minP) { minP = m.precip_mm; driest_month = m.month; }
  }
  return {
    annual_tmax_mean: mean(monthly.map((x) => x.tmax).filter((x): x is number => x != null)),
    annual_tmin_mean: mean(monthly.map((x) => x.tmin).filter((x): x is number => x != null)),
    annual_tmean: mean(monthly.map((x) => x.tmean).filter((x): x is number => x != null)),
    annual_precip_mm,
    wet_season_months,
    dry_season_months,
    wettest_month,
    driest_month,
    monthly,
  };
}

const memCache = new Map<string, ClimateSummary>();
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LS_PREFIX = "clima:";

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}|2001-2020`;
}

function readLS(key: string): ClimateSummary | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (Date.now() - t > TTL_MS) return null;
    return v as ClimateSummary;
  } catch { return null; }
}

function writeLS(key: string, v: ClimateSummary) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify({ t: Date.now(), v })); } catch {}
}

export async function fetchClimateSummary(lat: number, lon: number): Promise<ClimateSummary> {
  const key = cacheKey(lat, lon);
  if (memCache.has(key)) return memCache.get(key)!;
  const ls = readLS(key);
  if (ls) { memCache.set(key, ls); return ls; }
  const url = buildOpenMeteoClimateUrl(lat, lon);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();
  const summary = aggregate(json.daily ?? {});
  memCache.set(key, summary);
  writeLS(key, summary);
  return summary;
}

export const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const monthLabel = (m: number) => MONTH_LABELS[m - 1] ?? String(m);
