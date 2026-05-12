import type { Formula, Lotacao, ScoreResult, Weights } from "./types";

export function computeScore(lot: Lotacao, formula: Formula, weights: Weights): ScoreResult {
  const terms = formula.terms.map((t) => {
    let value = Number((lot as any)[t.field] ?? 0) || 0;
    if (t.field === "pontuacao_lotacao") {
      const raw = Number(lot.pontuacao_lotacao ?? 0) || 0;
      value = raw >= 3 ? 2 : raw >= 2 ? 1 : 0;
    }
    // Voo direto agora é dinâmico (depende da origem do usuário)
    if (t.field === "voo_direto_fortaleza" || t.field === "voo_direto" || t.field === "voo_direto_origem") {
      value = lot.voo_direto_origem === true ? 1 : 0;
    }
    // Distância da origem: quanto menor, melhor (0..2 pts)
    if (t.field === "distancia_origem") {
      const km = Number(lot.distancia_origem_km ?? 0);
      value = km <= 0 ? 0 : km < 500 ? 2 : km < 1500 ? 1.5 : km < 2500 ? 1 : km < 3500 ? 0.5 : 0;
    }
    // Preço (real se disponível e > 0, senão estimado): quanto menor, melhor (0..2 pts)
    // ADFRON: ativo = 2, inativo = 0 (normaliza valores legados como 4)
    if (t.field === "adfron_pontos") {
      const raw = Number(lot.adfron_pontos ?? 0) || 0;
      const ativo = raw > 0 || (lot as any).adfron_flag === 1 || (lot as any).adfron_flag === true;
      value = ativo ? 2 : 0;
    }
    if (t.field === "preco_estimado" || t.field === "preco_real") {
      const real = Number(lot.preco_real ?? 0);
      const p = real > 0 ? real : Number(lot.preco_estimado ?? 0);
      value = p <= 0 ? 0 : p < 500 ? 2 : p < 900 ? 1.5 : p < 1400 ? 1 : p < 2000 ? 0.5 : 0;
    }
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
  voo_direto_fortaleza: "Voo direto da sua origem",
  voo_direto: "Voo direto da sua origem",
  voo_direto_origem: "Voo direto da sua origem",
  passagem_categoria: "Categoria de passagem",
  adfron_pontos: "ADFRON",
  atratividade_pontos: "Atratividade",
  pontuacao_lotacao: "Pontuação da lotação (remoção)",
  distancia_origem: "Distância da sua origem",
  preco_estimado: "Preço estimado da passagem",
  preco_real: "Preço real da passagem",
};
