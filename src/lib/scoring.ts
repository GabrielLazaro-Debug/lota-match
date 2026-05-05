import type { Formula, Lotacao, ScoreResult, Weights } from "./types";

export function computeScore(lot: Lotacao, formula: Formula, weights: Weights): ScoreResult {
  const terms = formula.terms.map((t) => {
    const value = Number((lot as any)[t.field] ?? 0) || 0;
    const weight = Number(weights[t.weightKey] ?? 0) || 0;
    const coef = Number(t.coef ?? 1);
    return {
      field: t.field, weightKey: t.weightKey, value, weight, coef,
      contribution: value * weight * coef,
    };
  });
  const total = terms.reduce((s, t) => s + t.contribution, 0);
  const excelScore = lot.score_final;
  return {
    total: Math.round(total * 100) / 100,
    terms,
    excelScore,
    diff: excelScore != null ? Math.round((total - excelScore) * 100) / 100 : undefined,
  };
}

export function rank(lots: Lotacao[], formula: Formula, weights: Weights) {
  return lots
    .map((l) => ({ lot: l, score: computeScore(l, formula, weights) }))
    .sort((a, b) => b.score.total - a.score.total);
}

export function matchPercent(score: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}

export const FIELD_LABELS: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  custo_vida: "Custo de vida",
  aeroporto: "Aeroporto",
  voo_direto_fortaleza: "Voo direto p/ Fortaleza",
  passagem_categoria: "Categoria de passagem",
  adfron_pontos: "Pontos ADFRON",
  atratividade_pontos: "Atratividade",
};
