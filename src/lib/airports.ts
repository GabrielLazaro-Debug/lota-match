import airportsData from "@/data/airports_br.json";
import routesData from "@/data/routes_direct.json";
import iataToIcaoData from "@/data/iata_to_icao.json";
import { haversine } from "./geo";

export interface Airport {
  iata: string;
  name: string;
  municipality: string;
  region: string;
  lat: number;
  lon: number;
  type: string;
}

export const AIRPORTS: Airport[] = airportsData as Airport[];
export const IATA_TO_ICAO: Record<string, string> = iataToIcaoData as Record<string, string>;
export const ROUTES: Record<string, Record<string, boolean>> = routesData as any;

const FORTALEZA_ICAO = "SBFZ";
const FORTALEZA_IATA = "FOR";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function findAirportByMunicipality(municipio: string): Airport | undefined {
  const m = norm(municipio);
  return AIRPORTS.find((a) => norm(a.municipality) === m);
}

const NON_COMMERCIAL_PATTERNS = /(air force base|air base|aeroclube|heliport|helipad|heliponto)/i;

export function isCommercialAirport(a: Airport): boolean {
  if (!a) return false;
  if (a.type === "heliport") return false;
  if (NON_COMMERCIAL_PATTERNS.test(a.name || "")) return false;
  return true;
}

export interface NearestAirportResult { airport: Airport; distance_km: number; }

export function nearestAirports(
  lat: number,
  lon: number,
  topK = 3,
  opts?: { preferMediumLarge?: boolean },
): NearestAirportResult[] {
  const base = AIRPORTS.filter(isCommercialAirport);
  const ranked = base
    .map((a) => ({ airport: a, distance_km: haversine({ lat, lon }, { lat: a.lat, lon: a.lon }) }))
    .sort((x, y) => x.distance_km - y.distance_km);

  if (opts?.preferMediumLarge) {
    const big = ranked.filter((r) => r.airport.type === "medium_airport" || r.airport.type === "large_airport");
    if (big.length >= topK) return big.slice(0, topK);
    // fallback: completa com small mais próximos sem duplicar
    const seen = new Set(big.map((b) => b.airport.iata));
    const fill = ranked.filter((r) => !seen.has(r.airport.iata));
    return [...big, ...fill].slice(0, topK);
  }
  return ranked.slice(0, topK);
}

export function nearestAirport(lat: number, lon: number, opts?: { onlyMediumLarge?: boolean; preferMediumLarge?: boolean }): Airport | undefined {
  const preferMediumLarge = opts?.preferMediumLarge ?? opts?.onlyMediumLarge;
  return nearestAirports(lat, lon, 1, { preferMediumLarge })[0]?.airport;
}

export function hasDirectFlight(fromIcao: string, toIcao: string): boolean {
  return Boolean(ROUTES[fromIcao]?.[toIcao] || ROUTES[toIcao]?.[fromIcao]);
}

export function hasDirectToFortaleza(iataOrIcao: string): boolean {
  const icao = iataOrIcao.length === 3 ? IATA_TO_ICAO[iataOrIcao] : iataOrIcao;
  if (!icao) return false;
  return hasDirectFlight(icao, FORTALEZA_ICAO);
}

export { FORTALEZA_ICAO, FORTALEZA_IATA };
