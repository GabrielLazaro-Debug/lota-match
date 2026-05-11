import { describe, it, expect } from "vitest";
import { nearestAirports, isCommercialAirport, AIRPORTS } from "../airports";

describe("nearestAirports", () => {
  it("never returns heliports or non-commercial airports", () => {
    // Sample several locations across Brazil
    const points = [
      { lat: -3.73, lon: -38.52 },   // Fortaleza
      { lat: -23.55, lon: -46.63 },  // São Paulo
      { lat: -15.78, lon: -47.93 },  // Brasília
      { lat: -8.05, lon: -34.88 },   // Recife
      { lat: 0.03, lon: -51.06 },    // Macapá
    ];
    for (const p of points) {
      const top = nearestAirports(p.lat, p.lon, 5);
      expect(top.length).toBeGreaterThan(0);
      for (const r of top) {
        expect(r.airport.type).not.toBe("heliport");
        expect(/air force base|air base|aeroclube|heliport|helipad|heliponto/i.test(r.airport.name)).toBe(false);
        expect(isCommercialAirport(r.airport)).toBe(true);
      }
    }
  });

  it("respects topK", () => {
    const r = nearestAirports(-3.73, -38.52, 3);
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it("isCommercialAirport rejects known patterns", () => {
    expect(isCommercialAirport({ iata: "X", name: "Foo Air Base", municipality: "", region: "", lat: 0, lon: 0, type: "small_airport" } as any)).toBe(false);
    expect(isCommercialAirport({ iata: "X", name: "Aeroclube de Tal", municipality: "", region: "", lat: 0, lon: 0, type: "small_airport" } as any)).toBe(false);
    expect(isCommercialAirport({ iata: "X", name: "Heliport Centro", municipality: "", region: "", lat: 0, lon: 0, type: "small_airport" } as any)).toBe(false);
    expect(isCommercialAirport({ iata: "X", name: "Whatever", municipality: "", region: "", lat: 0, lon: 0, type: "heliport" } as any)).toBe(false);
    expect(isCommercialAirport({ iata: "GRU", name: "Guarulhos Intl", municipality: "São Paulo", region: "", lat: 0, lon: 0, type: "large_airport" } as any)).toBe(true);
  });

  it("dataset contains commercial airports", () => {
    expect(AIRPORTS.filter(isCommercialAirport).length).toBeGreaterThan(10);
  });
});
