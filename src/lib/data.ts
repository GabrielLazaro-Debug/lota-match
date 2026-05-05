import lotacoesRaw from "@/data/lotacoes.json";
import perfisRaw from "@/data/perfis.json";
import formulasRaw from "@/data/formulas.json";
import type { Formula, Lotacao, PesoProfile } from "./types";

export const DEFAULT_LOTACOES: Lotacao[] = (lotacoesRaw as any[]).map((r) => ({
  ...r,
  vagas: Number(r.vagas) || 0,
}));

interface PerfilRow { profile_id: string; profile_nome: string; criterio_key: string; peso: number; }
export function buildProfilesFromRows(rows: PerfilRow[]): PesoProfile[] {
  const map = new Map<string, PesoProfile>();
  for (const r of rows) {
    if (!r.profile_id) continue;
    if (!map.has(r.profile_id)) {
      map.set(r.profile_id, { id: r.profile_id, nome: r.profile_nome, pesos: {}, builtin: true });
    }
    map.get(r.profile_id)!.pesos[r.criterio_key] = Number(r.peso) || 0;
  }
  return [...map.values()];
}

export const DEFAULT_PROFILES: PesoProfile[] = buildProfilesFromRows(perfisRaw as PerfilRow[]);

export const DEFAULT_FORMULAS: Formula[] = (formulasRaw as any[]).map((r) => {
  const j = typeof r.formula_json === "string" ? JSON.parse(r.formula_json) : r.formula_json;
  return {
    id: r.formula_id,
    nome: r.formula_nome,
    type: j.type,
    terms: j.terms,
    versao: r.versao,
    descricao: r.descricao,
  };
});

export const SCENARIOS: { id: string; nome: string; emoji: string; weights: Record<string, number>; descricao: string }[] = [
  { id: "money", nome: "Maximizar dinheiro", emoji: "💰", descricao: "Prioriza custo de vida baixo, atratividade e ADFRON.",
    weights: { saude: 1, educacao: 1, custo_vida: 3, aeroporto: 1, voo_direto_fortaleza: 1, passagem_categoria: 1, adfron_pontos: 3, atratividade_pontos: 3 } },
  { id: "fortaleza", nome: "Visitar Fortaleza", emoji: "✈️", descricao: "Prioriza voo direto e categoria de passagem.",
    weights: { saude: 1, educacao: 1, custo_vida: 1, aeroporto: 2, voo_direto_fortaleza: 4, passagem_categoria: 3, adfron_pontos: 1, atratividade_pontos: 1 } },
  { id: "familia", nome: "Família", emoji: "👨‍👩‍👧", descricao: "Saúde, educação e qualidade de vida em alta.",
    weights: { saude: 3, educacao: 3, custo_vida: 2, aeroporto: 1, voo_direto_fortaleza: 1, passagem_categoria: 1, adfron_pontos: 0, atratividade_pontos: 1 } },
  { id: "rapida", nome: "Remoção rápida", emoji: "🚀", descricao: "Foca atratividade alta e ADFRON para acelerar saída.",
    weights: { saude: 1, educacao: 1, custo_vida: 1, aeroporto: 1, voo_direto_fortaleza: 1, passagem_categoria: 1, adfron_pontos: 4, atratividade_pontos: 4 } },
  { id: "tranquila", nome: "Cidade tranquila", emoji: "🌿", descricao: "Cidades menores, custo equilibrado.",
    weights: { saude: 2, educacao: 2, custo_vida: 2, aeroporto: 1, voo_direto_fortaleza: 1, passagem_categoria: 1, adfron_pontos: 1, atratividade_pontos: 2 } },
];
