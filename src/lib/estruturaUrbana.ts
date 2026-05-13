import type { Lotacao } from "./types";

/** Pontuação 0..2 a partir de população + IFDM (qualidade urbana). Neutro = 1 se faltarem dados. */
export function computeEstruturaUrbana(lot: Partial<Lotacao>): number {
  const pop = Number(lot.populacao ?? 0);
  const ifdm = Number(lot.ifdm_firjan ?? 0);
  const ips = Number(lot.ips_brasil_2025 ?? 0);
  const hasPop = pop > 0;
  const hasQual = ifdm > 0 || ips > 0;
  if (!hasPop && !hasQual) return 1; // neutro
  const popScore = pop >= 500_000 ? 1 : pop >= 100_000 ? 0.5 : pop > 0 ? 0.25 : 0.5;
  const qual = ifdm > 0 ? ifdm : ips > 0 ? ips / 100 : 0;
  const qualScore = qual >= 0.7 ? 1 : qual >= 0.55 ? 0.5 : qual > 0 ? 0.25 : 0.5;
  return Math.round((popScore + qualScore) * 100) / 100;
}
