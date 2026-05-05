import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON } from "react-leaflet";
import { useMemo } from "react";
import type { Lotacao, ScoreResult } from "@/lib/types";
import { useStore } from "@/lib/store";

interface Props { rows: { lot: Lotacao; score: ScoreResult }[]; max: number; }

function colorFor(pct: number) {
  // 0..1 — red to green via primary
  const h = Math.round(0 + pct * 158);
  return `hsl(${h}, 80%, 55%)`;
}

export default function BrazilMap({ rows, max }: Props) {
  const { userKmlGeoJson, showLayerLot, showLayerKml, origem } = useStore();
  const points = useMemo(() => rows.filter((r) => r.lot.lat != null && r.lot.lon != null), [rows]);

  return (
    <MapContainer center={[-14.5, -52]} zoom={4} className="h-full min-h-[500px] w-full" scrollWheelZoom>
      <TileLayer attribution="© OSM" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {showLayerLot && points.map(({ lot, score }) => {
        const pct = score.total / Math.max(max, 1);
        return (
          <CircleMarker key={lot.id_lotacao} center={[lot.lat!, lot.lon!]}
            radius={6 + pct * 10} pathOptions={{ color: colorFor(pct), fillColor: colorFor(pct), fillOpacity: 0.75 }}>
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold">{lot.municipio} / {lot.uf}</div>
                <div>{lot.unidade}</div>
                <div>Score: <b>{score.total.toFixed(2)}</b></div>
                {lot.distancia_origem_km != null && <div>{lot.distancia_origem_km} km de você</div>}
                {lot.distancia_fortaleza_km != null && <div>{lot.distancia_fortaleza_km} km de Fortaleza</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
      {showLayerKml && userKmlGeoJson && (
        <GeoJSON data={userKmlGeoJson} style={{ color: "#3b82f6", weight: 2 }} />
      )}
      {origem?.lat != null && (
        <CircleMarker center={[origem.lat, origem.lon!]} radius={8}
          pathOptions={{ color: "#fff", fillColor: "#fff", fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -8]}>Você está aqui ({origem.municipio})</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
