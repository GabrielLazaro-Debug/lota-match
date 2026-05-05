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

export function nearestAirport(lat: number, lon: number, opts?: { onlyMediumLarge?: boolean }): Airport | undefined {
  const pool = opts?.onlyMediumLarge
    ? AIRPORTS.filter((a) => a.type === "medium_airport" || a.type === "large_airport")
    : AIRPORTS;
  let best: Airport | undefined; let bestD = Infinity;
  for (const a of pool) {
    const d = haversine({ lat, lon }, { lat: a.lat, lon: a.lon });
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
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
