import { Plane, Mountain, Heart, GraduationCap, Wallet, MapPin, Star, Sparkles, Target } from "lucide-react";
import type { Lotacao, ScoreResult } from "@/lib/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { deriveAtratividade } from "@/lib/deriveAtratividade";

interface Props {
  lot: Lotacao; score: ScoreResult; rank: number; maxScore: number;
  onClick?: () => void; selected?: boolean;
}

export default function LotacaoCard({ lot, score, rank, maxScore, onClick, selected }: Props) {
  const match = Math.round((score.total / Math.max(maxScore, 1)) * 100);
  const vagasAtuais = Number(lot.vagas_disponiveis ?? lot.vagas ?? 0);
  if (vagasAtuais <= 0) return null;
  const atratividade = deriveAtratividade(lot.pontuacao_lotacao);
  const atratTone: "default" | "accent" | "warning" =
    atratividade.label === "Alta" ? "accent" : atratividade.label === "Baixa" ? "warning" : "default";
  const pontLot = lot.pontuacao_lotacao != null
    ? Number(lot.pontuacao_lotacao).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;
  const indic = (lot.indicacao ?? "").toLowerCase();
  const indicColor =
    indic.includes("excelente") || indic.includes("ótimo") ? "bg-success/20 text-success border-success/30"
    : indic.includes("regular") ? "bg-warning/20 text-warning border-warning/30"
    : indic.includes("ruim") ? "bg-destructive/20 text-destructive border-destructive/30"
    : "bg-secondary text-muted-foreground border-border";

  return (
    <motion.button layout onClick={onClick}
      whileHover={{ y: -2 }}
      className={cn("group w-full rounded-2xl border bg-grad-card p-4 text-left shadow-soft transition-all",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40")}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-grad-primary text-sm font-bold text-primary-foreground shadow-glow">
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-display text-base font-semibold">{lot.municipio}</div>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{lot.uf}</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{lot.unidade} · {vagasAtuais} vagas</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold text-primary">{score.total.toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground">match {match}%</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <Stat icon={Heart} v={lot.saude} label="Saúde" />
        <Stat icon={GraduationCap} v={lot.educacao} label="Educ" />
        <Stat icon={Wallet} v={lot.custo_vida} label="C.Vida" />
        {lot.aeroporto === 1 && <Badge icon={Plane}>Aeroporto</Badge>}
        {lot.voo_direto_origem === true && <Badge icon={Plane} tone="accent">Voo direto</Badge>}
        {lot.voo_direto_origem === false && <Badge icon={Plane}>Sem voo direto</Badge>}
        {lot.voo_direto_origem == null && lot.distancia_origem_km != null && <Badge icon={Plane}>Voo: indisponível</Badge>}
        {Number(lot.adfron_pontos ?? 0) > 0 && <Badge icon={Mountain} tone="warning">ADFRON</Badge>}
        <Badge icon={Sparkles} tone={atratTone}>Atratividade: {atratividade.label}</Badge>
        {lot.distancia_origem_km != null && (
          <Badge icon={MapPin}>{lot.distancia_origem_km.toLocaleString("pt-BR")} km de você</Badge>
        )}
        {lot.preco_estimado != null && lot.preco_estimado > 0 && (
          <Badge icon={Wallet}>R$ {lot.preco_estimado.toLocaleString("pt-BR")} <span className="opacity-60">est.</span></Badge>
        )}
      </div>

      {lot.indicacao && (
        <div className={cn("mt-3 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]", indicColor)}>
          <Star className="h-3 w-3" /> {lot.indicacao}
        </div>
      )}
    </motion.button>
  );
}

function Stat({ icon: Icon, v, label }: { icon: any; v?: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-0.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium">{label}</span>
      <span className="font-mono text-primary">{v ?? "-"}</span>
    </span>
  );
}
function Badge({ icon: Icon, children, tone = "default" }: { icon: any; children: any; tone?: "default" | "accent" | "warning" }) {
  const cls = tone === "accent" ? "bg-accent/20 text-accent border-accent/30"
    : tone === "warning" ? "bg-warning/20 text-warning border-warning/30"
    : "bg-secondary border-border";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5", cls)}>
      <Icon className="h-3 w-3" />{children}
    </span>
  );
}
