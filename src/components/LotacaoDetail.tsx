import { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import type { Lotacao, ScoreResult } from "@/lib/types";
import { FIELD_LABELS } from "@/lib/scoring";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Heart, GraduationCap, Wallet, Plane, Mountain, MapPin, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildSkyscannerDayViewUrl, buildGoogleFlightsUrl, buildSearchHintText } from "@/lib/flightLinks";
import { deriveAtratividade } from "@/lib/deriveAtratividade";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean; onClose: () => void;
  lot?: Lotacao; score?: ScoreResult;
}

export default function LotacaoDetail({ open, onClose, lot, score }: Props) {
  if (!lot || !score) return null;
  const radarData = [
    { k: "Saúde", v: lot.saude ?? 0, max: 5 },
    { k: "Educação", v: lot.educacao ?? 0, max: 5 },
    { k: "Custo vida", v: (lot.custo_vida ?? 0) * 2.5, max: 5 },
    { k: "Atratividade", v: (lot.atratividade_pontos ?? 0) * 2.5, max: 5 },
    { k: "Aeroporto", v: (lot.aeroporto ?? 0) * 5, max: 5 },
    { k: "ADFRON", v: (lot.adfron_pontos ?? 0) * 1.25, max: 5 },
  ];
  const contrib = score.terms.filter((t) => t.contribution !== 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const fortes: string[] = [];
  const fracos: string[] = [];
  if ((lot.saude ?? 0) >= 4) fortes.push("Saúde excelente");
  if ((lot.educacao ?? 0) >= 4) fortes.push("Educação forte");
  if (lot.aeroporto === 1) fortes.push("Aeroporto comercial");
  if (lot.voo_direto_origem === true) fortes.push("Voo direto da sua origem");
  if ((lot.adfron_pontos ?? 0) > 0) fortes.push("Conta como ADFRON");
  if ((lot.custo_vida ?? 0) >= 2) fortes.push("Custo de vida abaixo da média");
  if ((lot.saude ?? 0) <= 2) fracos.push("Saúde limitada");
  if ((lot.educacao ?? 0) <= 2) fracos.push("Educação limitada");
  if (lot.aeroporto !== 1) fracos.push("Sem aeroporto comercial");
  if ((lot.passagem_categoria ?? 0) === 0) fracos.push("Passagens caras / logística difícil");
  if ((lot.distancia_origem_km ?? 0) > 2500) fracos.push("Muito longe da sua origem");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display">
            {lot.municipio} <span className="text-sm font-normal text-muted-foreground">/ {lot.uf}</span>
          </SheetTitle>
          <div className="text-sm text-muted-foreground">{lot.unidade} · {lot.vagas} vagas</div>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Score" value={score.total.toFixed(2)} accent />
          <Stat label="Match" value={`${Math.round((score.total / Math.max(...contrib.map(()=>score.total),1)) * 100)}%`} />
          <Stat label="Vagas" value={String(lot.vagas)} />
        </div>

        <div className="mt-6 grid gap-2 text-xs">
          <Row icon={Heart} label="Saúde" v={`${lot.saude ?? "-"} / 5`} />
          <Row icon={GraduationCap} label="Educação" v={`${lot.educacao ?? "-"} / 5`} />
          <Row icon={Wallet} label="Custo vida" v={`${lot.custo_vida ?? "-"} / 2`} sub={lot.custo_vida_justificativa} />
          <Row icon={Plane} label="Aeroporto" v={lot.aeroporto === 1 ? "Sim" : "Não"} />
          <Row icon={Plane} label="Voo direto da sua origem"
            v={lot.voo_direto_origem === true ? "Sim" : lot.voo_direto_origem === false ? "Não" : "indisponível"}
            sub={lot.origem_iata && lot.destino_iata ? `${lot.origem_iata} → ${lot.destino_iata}` : undefined} />
          <Row icon={Mountain} label="ADFRON" v={(lot.adfron_pontos ?? 0) > 0 ? "Sim" : "Não"} />
          <Row icon={MapPin} label="Distância da sua origem" v={lot.distancia_origem_km != null ? `${lot.distancia_origem_km.toLocaleString("pt-BR")} km` : "—"} />
          <Row icon={MapPin} label="Distância de Fortaleza" v={lot.distancia_fortaleza_km != null ? `${lot.distancia_fortaleza_km.toLocaleString("pt-BR")} km` : "—"} />
          <PriceRow lot={lot} />
        </div>

        <div className="mt-6">
          <div className="mb-2 text-sm font-medium">Perfil radar</div>
          <div className="h-56">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="k" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <PolarRadiusAxis tick={false} domain={[0, 5]} />
                <Radar dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-sm font-medium">Contribuição ao score</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={contrib.map((c) => ({ name: FIELD_LABELS[c.field] ?? c.field, v: c.contribution }))} layout="vertical">
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={120} />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="v" radius={[0, 6, 6, 0]}>
                  {contrib.map((c, i) => (
                    <Cell key={i} fill={c.contribution >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
            {score.terms.map((t) => (
              <div key={t.field}>
                {FIELD_LABELS[t.field] ?? t.field}: {t.value} × peso {t.weight} × {t.coef} = <span className="text-foreground">{t.contribution.toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-1 text-foreground">Total: <b>{score.total.toFixed(2)}</b>{score.diff != null && Math.abs(score.diff) > 0.01 && (
              <span className="ml-2 text-warning">⚠ diferença vs Excel: {score.diff > 0 ? "+" : ""}{score.diff}</span>
            )}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <List title="Pontos fortes" tone="success" icon={CheckCircle2} items={fortes} />
          <List title="Pontos fracos" tone="warning" icon={AlertCircle} items={fracos} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
function Row({ icon: Icon, label, v, sub }: { icon: any; label: string; v: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-secondary/30 px-3 py-2">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="text-right">
        <div className="font-medium">{v}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
function List({ title, items, tone, icon: Icon }: { title: string; items: string[]; tone: "success" | "warning"; icon: any }) {
  const cls = tone === "success" ? "border-success/30 text-success" : "border-warning/30 text-warning";
  return (
    <div className={`rounded-xl border ${cls} bg-secondary/30 p-3`}>
      <div className="mb-1 flex items-center gap-1 text-xs font-semibold"><Icon className="h-3.5 w-3.5" /> {title}</div>
      {items.length === 0 ? <div className="text-xs text-muted-foreground">—</div> :
        <ul className="ml-1 space-y-0.5 text-xs text-foreground/90">{items.map((i) => <li key={i}>· {i}</li>)}</ul>}
    </div>
  );
}

function PriceRow({ lot }: { lot: Lotacao }) {
  const value = lot.preco_estimado != null && lot.preco_estimado > 0
    ? `R$ ${lot.preco_estimado.toLocaleString("pt-BR")}`
    : "—";

  function ensureAirports(): boolean {
    if (!lot.origem_iata || !lot.destino_iata) {
      toast.error("Aeroporto de origem/destino indisponível");
      return false;
    }
    return true;
  }

  function openSkyscanner() {
    if (!ensureAirports()) return;
    window.open(buildSkyscannerDayViewUrl(lot.origem_iata!, lot.destino_iata!), "_blank");
  }

  async function openGoogleFlights() {
    if (!ensureAirports()) return;
    const hint = buildSearchHintText(lot.origem_iata!, lot.destino_iata!);
    try {
      await navigator.clipboard.writeText(hint);
      toast.success("Rota copiada — cole no Google Flights");
    } catch {
      toast.message(hint);
    }
    window.open(buildGoogleFlightsUrl(), "_blank");
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-secondary/30 px-3 py-2">
      <div className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-3.5 w-3.5" />Passagem</div>
      <div className="text-right">
        <div className="font-medium">{value}</div>
        <div className="text-[10px] text-muted-foreground">ESTIMADO</div>
        <div className="mt-1 flex flex-col items-end gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={openGoogleFlights}>
            <ExternalLink className="mr-1 h-3 w-3" />
            Ver no Google Flights
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={openSkyscanner}>
            <ExternalLink className="mr-1 h-3 w-3" />
            Ver no Skyscanner
          </Button>
        </div>
      </div>
    </div>
  );
}
