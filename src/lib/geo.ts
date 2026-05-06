import municipiosData from "@/data/municipios_latlon.json";


export interface GeoPoint {
  municipio: string;
  uf: string;
  lat: number;
  lon: number;
  distancia_fortaleza_km: number;
}

// Fortaleza (capital CE) coordinates - reference for distance calculations
export const FORTALEZA = { lat: -3.7172, lon: -38.5433 };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

interface RawMuni { municipio: string; uf: string; lat: number; lon: number; }

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10;
}

export const GEO: GeoPoint[] = (municipiosData as RawMuni[]).map((m) => ({
  ...m,
  distancia_fortaleza_km: haversine(FORTALEZA, { lat: m.lat, lon: m.lon }),
}));

// Index for fast lookup
const GEO_INDEX = new Map<string, GeoPoint>();
for (const g of GEO) {
  GEO_INDEX.set(`${norm(g.municipio)}|${g.uf}`, g);
  const k = norm(g.municipio);
  if (!GEO_INDEX.has(k)) GEO_INDEX.set(k, g);
}

export function findGeo(municipio: string, uf: string): GeoPoint | undefined {
  const m = norm(municipio); const u = (uf || "").toUpperCase();
  return GEO_INDEX.get(`${m}|${u}`) ?? GEO_INDEX.get(m);
}

// enrichLotacoes vive em ./logistics para evitar ciclo de import.
export { enrichLotacoes } from "./logistics";

