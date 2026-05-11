import { AIRPORTS, IATA_TO_ICAO, ROUTES, type Airport } from "./airports";
import { findGeo, haversine } from "./geo";
import type { Lotacao, Origem } from "./types";

export function enrichLotacoes(lots: Lotacao[], origem?: Origem): Lotacao[] {
  return lots.map((l) => {
    const g = findGeo(l.municipio, l.uf);
    const enriched: Lotacao = { ...l };
    if (g) {
      enriched.lat = g.lat; enriched.lon = g.lon;
      enriched.distancia_fortaleza_km = g.distancia_fortaleza_km;
    }
    if (origem) {
      const log = computeLogistics(enriched, origem);
      enriched.voo_direto_origem = log.voo_direto;
      enriched.origem_iata = log.origem_iata;
      enriched.destino_iata = log.destino_iata;
      enriched.preco_estimado = log.preco_estimado;
      if (log.distancia_origem_km != null) enriched.distancia_origem_km = log.distancia_origem_km;
    }
    return enriched;
  });
}

// ============================================================
// Logistics service (singleton, in-memory cache)
// - Origem dinâmica (depende da Moradia Atual do usuário)
// - Distância e voo direto sempre calculados a partir da origem
// - Preço estimado calculado offline; preço real sob demanda
// ============================================================

interface OriginInfo {
  municipio: string; uf: string;
  lat: number; lon: number;
  airport?: Airport;
  iata?: string;
  icao?: string;
}

const airportCache = new Map<string, Airport | undefined>(); // key: "lat,lon"
const originCache = new Map<string, OriginInfo>();

function nearestAirport(lat: number, lon: number): Airport | undefined {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (airportCache.has(key)) return airportCache.get(key);
  let best: Airport | undefined; let bestD = Infinity;
  for (const a of AIRPORTS) {
    const d = haversine({ lat, lon }, { lat: a.lat, lon: a.lon });
    if (d < bestD) { bestD = d; best = a; }
  }
  airportCache.set(key, best);
  return best;
}

export function resolveOrigin(o: Origem): OriginInfo | undefined {
  const key = `${o.municipio}|${o.uf}`.toLowerCase();
  if (originCache.has(key)) return originCache.get(key);
  const lat = o.lat, lon = o.lon;
  if (lat == null || lon == null) {
    const g = findGeo(o.municipio, o.uf);
    if (!g) return undefined;
    return resolveOrigin({ ...o, lat: g.lat, lon: g.lon });
  }
  const ap = nearestAirport(lat, lon);
  const iata = ap?.iata;
  const icao = iata ? IATA_TO_ICAO[iata] : undefined;
  const info: OriginInfo = { municipio: o.municipio, uf: o.uf, lat, lon, airport: ap, iata, icao };
  originCache.set(key, info);
  return info;
}

export function hasDirectRoute(originIcao?: string, destIcao?: string): boolean | null {
  if (!originIcao || !destIcao) return null;
  if (originIcao === destIcao) return true;
  return Boolean(ROUTES[originIcao]?.[destIcao] || ROUTES[destIcao]?.[originIcao]);
}

// Preço estimado (offline) baseado em distância. Heurística simples e transparente.
export function estimatePrice(km: number, voo_direto: boolean | null): number {
  if (!isFinite(km) || km <= 0) return 0;
  const base = 280;
  const perKm = voo_direto === false ? 0.62 : 0.48; // conexões ficam mais caras
  const raw = base + perKm * km;
  return Math.round(raw / 10) * 10;
}

export interface LogisticsResult {
  distancia_origem_km: number | null;
  voo_direto: boolean | null;
  origem_iata?: string;
  destino_iata?: string;
  preco_estimado: number | null;
}

export function computeLogistics(lot: Lotacao, origem?: Origem): LogisticsResult {
  if (!origem) return { distancia_origem_km: null, voo_direto: null, preco_estimado: null };
  const origin = resolveOrigin(origem);
  if (!origin) return { distancia_origem_km: null, voo_direto: null, preco_estimado: null };

  let lat = lot.lat, lon = lot.lon;
  if (lat == null || lon == null) {
    const g = findGeo(lot.municipio, lot.uf);
    if (g) { lat = g.lat; lon = g.lon; }
  }
  if (lat == null || lon == null) {
    return { distancia_origem_km: null, voo_direto: null, origem_iata: origin.iata, preco_estimado: null };
  }
  const km = haversine({ lat: origin.lat, lon: origin.lon }, { lat, lon });
  const destAp = nearestAirport(lat, lon);
  const destIata = destAp?.iata;
  const destIcao = destIata ? IATA_TO_ICAO[destIata] : undefined;
  const direct = hasDirectRoute(origin.icao, destIcao);
  const preco = estimatePrice(km, direct);
  return {
    distancia_origem_km: km,
    voo_direto: direct,
    origem_iata: origin.iata,
    destino_iata: destIata,
    preco_estimado: preco,
  };
}

// Preço real sob demanda via edge function flight-price (proxy seguro p/ Kiwi Tequila).
import { supabase } from "@/integrations/supabase/client";

export interface RealPriceResult { preco: number | null; updatedAt: string; ok: boolean; error?: string; }
export async function fetchRealPrice(origem_iata?: string, destino_iata?: string): Promise<RealPriceResult> {
  try {
    if (!origem_iata || !destino_iata) {
      return { preco: null, updatedAt: new Date().toISOString(), ok: false, error: "IATA ausente" };
    }
    const { data, error } = await supabase.functions.invoke("flight-price", {
      body: { origem_iata, destino_iata },
    });
    if (error) throw error;
    const preco = data?.preco != null ? Number(data.preco) : null;
    return { preco, updatedAt: data?.updatedAt ?? new Date().toISOString(), ok: preco != null };
  } catch (e: any) {
    return { preco: null, updatedAt: new Date().toISOString(), ok: false, error: e?.message ?? "indisponível" };
  }
}
