import geoData from "@/data/geo.json";
import type { Lotacao, Origem } from "./types";

export interface GeoPoint { municipio: string; uf: string; lat: number; lon: number; distancia_fortaleza_km: number; }
export const GEO: GeoPoint[] = geoData as GeoPoint[];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function findGeo(municipio: string, uf: string): GeoPoint | undefined {
  const m = norm(municipio); const u = uf.toUpperCase();
  return GEO.find((g) => norm(g.municipio) === m && g.uf === u)
      ?? GEO.find((g) => norm(g.municipio) === m);
}

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10;
}

export function enrichLotacoes(lots: Lotacao[], origem?: Origem): Lotacao[] {
  return lots.map((l) => {
    const g = findGeo(l.municipio, l.uf);
    const enriched = { ...l };
    if (g) {
      enriched.lat = g.lat; enriched.lon = g.lon;
      enriched.distancia_fortaleza_km = g.distancia_fortaleza_km;
    }
    if (origem?.lat != null && origem?.lon != null && enriched.lat != null && enriched.lon != null) {
      enriched.distancia_origem_km = haversine(
        { lat: origem.lat, lon: origem.lon },
        { lat: enriched.lat, lon: enriched.lon },
      );
    }
    return enriched;
  });
}
