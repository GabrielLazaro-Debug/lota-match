import { useEffect, useState } from "react";
import { ExternalLink, Copy, CloudRain, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  buildOpenMeteoClimateUrl,
  fetchClimateSummary,
  monthLabel,
  type ClimateSummary,
} from "@/lib/clima";

interface Props { lat?: number; lon?: number; }

export default function ClimateSection({ lat, lon }: Props) {
  const [data, setData] = useState<ClimateSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (lat == null || lon == null) return;
    setLoading(true);
    setError(null);
    fetchClimateSummary(lat, lon)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lon]);

  if (lat == null || lon == null) return null;
  const url = buildOpenMeteoClimateUrl(lat, lon);

  const fmt1 = (n: number | null | undefined, suf = "") =>
    n == null || Number.isNaN(n) ? "—" : `${n.toFixed(1)}${suf}`;
  const fmt0 = (n: number | null | undefined, suf = "") =>
    n == null || Number.isNaN(n) ? "—" : `${Math.round(n).toLocaleString("pt-BR")}${suf}`;

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Clima (2001–2020)</div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
            onClick={async () => {
              try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
              catch { toast.message(url); }
            }}>
            <Copy className="mr-1 h-3 w-3" /> Copiar link
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
            onClick={() => window.open(url, "_blank")}>
            <ExternalLink className="mr-1 h-3 w-3" /> Open-Meteo
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="text-xs text-muted-foreground">Carregando clima…</div>
        </div>
      )}
      {error && !loading && (
        <div className="rounded-lg border border-warning/30 bg-secondary/30 p-3 text-xs text-warning">
          Não foi possível carregar o clima ({error}).
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
              <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Thermometer className="h-3 w-3" /> Temperatura
              </div>
              <div className="text-xs">Média anual: <b>{fmt1(data.annual_tmean, " °C")}</b></div>
              <div className="text-xs">Máx. diária (média): <b>{fmt1(data.annual_tmax_mean, " °C")}</b></div>
              <div className="text-xs">Mín. diária (média): <b>{fmt1(data.annual_tmin_mean, " °C")}</b></div>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
              <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CloudRain className="h-3 w-3" /> Chuva
              </div>
              <div className="text-xs">Anual média: <b>{fmt0(data.annual_precip_mm, " mm")}</b></div>
              <div className="text-xs">
                Mais chuvoso: <b>{data.wettest_month ? monthLabel(data.wettest_month) : "—"}</b>
                {data.wettest_month && (
                  <span className="text-muted-foreground"> ({fmt0(data.monthly[data.wettest_month - 1]?.precip_mm, " mm")})</span>
                )}
              </div>
              <div className="text-xs">
                Mais seco: <b>{data.driest_month ? monthLabel(data.driest_month) : "—"}</b>
                {data.driest_month && (
                  <span className="text-muted-foreground"> ({fmt0(data.monthly[data.driest_month - 1]?.precip_mm, " mm")})</span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground break-words">
                Chuvosa: {data.wet_season_months.length ? data.wet_season_months.map(monthLabel).join(", ") : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground break-words">
                Seca: {data.dry_season_months.length ? data.dry_season_months.map(monthLabel).join(", ") : "—"}
              </div>
            </div>
          </div>

          <div className="mt-3 -mx-1 overflow-x-auto ios-scroll">
            <table className="w-full min-w-[480px] text-[11px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-2 py-1 text-left font-normal">Mês</th>
                  <th className="px-2 py-1 text-right font-normal">T máx</th>
                  <th className="px-2 py-1 text-right font-normal">T méd</th>
                  <th className="px-2 py-1 text-right font-normal">T mín</th>
                  <th className="px-2 py-1 text-right font-normal">Chuva</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((m) => (
                  <tr key={m.month} className="border-t border-border/40">
                    <td className="px-2 py-1">{monthLabel(m.month)}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmt1(m.tmax)}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmt1(m.tmean)}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmt1(m.tmin)}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmt0(m.precip_mm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
