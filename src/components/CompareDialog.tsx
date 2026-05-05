import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Lotacao, ScoreResult } from "@/lib/types";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { FIELD_LABELS } from "@/lib/scoring";

interface Props {
  open: boolean; onClose: () => void;
  a?: { lot: Lotacao; score: ScoreResult }; b?: { lot: Lotacao; score: ScoreResult };
}

export default function CompareDialog({ open, onClose, a, b }: Props) {
  if (!a || !b) return null;

  const data = a.score.terms.map((t, i) => ({
    name: FIELD_LABELS[t.field] ?? t.field,
    [a.lot.municipio]: t.contribution,
    [b.lot.municipio]: b.score.terms[i]?.contribution ?? 0,
  }));

  const insights: string[] = [];
  const dScore = a.score.total - b.score.total;
  insights.push(`${dScore >= 0 ? a.lot.municipio : b.lot.municipio} tem score ${Math.abs(dScore).toFixed(2)} maior.`);
  if ((a.lot.passagem_media ?? 0) && (b.lot.passagem_media ?? 0)) {
    const dP = (a.lot.passagem_media! - b.lot.passagem_media!);
    insights.push(`Diferença média de passagem: R$ ${Math.abs(dP).toFixed(0)} (${dP >= 0 ? a.lot.municipio + " mais cara" : b.lot.municipio + " mais cara"}).`);
  }
  if ((a.lot.distancia_origem_km ?? 0) && (b.lot.distancia_origem_km ?? 0)) {
    const dD = (a.lot.distancia_origem_km! - b.lot.distancia_origem_km!);
    insights.push(`Distância da sua origem: ${dD >= 0 ? b.lot.municipio + " mais perto" : a.lot.municipio + " mais perto"} por ${Math.abs(dD)} km.`);
  }
  if ((a.lot.adfron_pontos ?? 0) !== (b.lot.adfron_pontos ?? 0))
    insights.push(`ADFRON: ${(a.lot.adfron_pontos ?? 0) > (b.lot.adfron_pontos ?? 0) ? a.lot.municipio : b.lot.municipio} pontua mais (impacto remoção).`);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Comparação inteligente</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[a, b].map((x) => (
            <div key={x.lot.id_lotacao} className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <div className="font-display text-base font-semibold">{x.lot.municipio} / {x.lot.uf}</div>
              <div className="text-xs text-muted-foreground">{x.lot.unidade}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span>Score: <b className="text-primary">{x.score.total.toFixed(2)}</b></span>
                <span>Vagas: {x.lot.vagas}</span>
                <span>Saúde: {x.lot.saude}</span>
                <span>Educ.: {x.lot.educacao}</span>
                <span>C.Vida: {x.lot.custo_vida}</span>
                <span>Passagem: R$ {x.lot.passagem_media ?? "—"}</span>
                <span>ADFRON: {x.lot.adfron_pontos ?? 0}</span>
                <span>Origem: {x.lot.distancia_origem_km ?? "—"} km</span>
              </div>
            </div>
          ))}
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey={a.lot.municipio} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey={b.lot.municipio} fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Análise automática</div>
          <ul className="space-y-1">{insights.map((i, idx) => <li key={idx}>· {i}</li>)}</ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
