export interface Lotacao {
  id_lotacao: string;
  unidade: string;
  uf: string;
  municipio: string;
  vagas: number;
  pontuacao_lotacao?: number;
  atratividade_pontos?: number;
  saude?: number;
  educacao?: number;
  custo_vida?: number;
  custo_vida_justificativa?: string;
  adfron_flag?: number;
  adfron_pontos?: number;
  aeroporto?: number;
  voo_direto_fortaleza?: number;
  passagem_media?: number;
  passagem_valor_min?: number;
  passagem_valor_max?: number;
  passagem_categoria?: number;
  passagem_obs?: string;
  score_final?: number;
  indicacao?: string;
  // enriched
  lat?: number;
  lon?: number;
  distancia_fortaleza_km?: number;
  distancia_origem_km?: number;
  // logística calculada a partir da origem do usuário
  voo_direto_origem?: boolean | null;
  origem_iata?: string;
  destino_iata?: string;
  preco_estimado?: number | null;
  preco_real?: number | null;
  preco_real_updated_at?: string;
}

export type Weights = Record<string, number>;

export interface PesoProfile {
  id: string;
  nome: string;
  pesos: Weights;
  builtin?: boolean;
}

export interface FormulaTerm { field: string; weightKey: string; coef: number; }
export interface Formula {
  id: string;
  nome: string;
  type: "weighted_sum";
  terms: FormulaTerm[];
  versao?: number;
  descricao?: string;
}

export interface Origem { municipio: string; uf: string; lat?: number; lon?: number; }

export interface ScoreBreakdownTerm {
  field: string; weightKey: string; value: number; weight: number; coef: number; contribution: number;
}
export interface ScoreResult {
  total: number;
  terms: ScoreBreakdownTerm[];
  excelScore?: number;
  diff?: number;
}
