import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store";
import { computeScore, rank } from "../scoring";
import type { Formula, Lotacao, Weights } from "../types";

const formula: Formula = {
  id: "t",
  nome: "test",
  versao: 1,
  scoreField: "score_final",
  terms: [
    { field: "preco_estimado", weightKey: "preco_estimado", coef: 1 },
  ],
} as any;

const weights: Weights = { preco_estimado: 1 } as any;

function lot(id: string, preco_estimado?: number, preco_real?: number): Lotacao {
  return {
    id_lotacao: id,
    municipio: "X", uf: "CE", unidade: "U", vagas: 1,
    preco_estimado, preco_real,
  } as any;
}

describe("computeScore preco_real fallback", () => {
  it("uses preco_estimado when preco_real is missing", () => {
    const s = computeScore(lot("a", 1500), formula, weights);
    // 1500 -> < 2000 -> 0.5
    expect(s.terms[0].value).toBe(0.5);
  });

  it("uses preco_real when present and > 0", () => {
    const s = computeScore(lot("a", 1500, 400), formula, weights);
    // 400 -> < 500 -> 2
    expect(s.terms[0].value).toBe(2);
  });

  it("falls back to estimado when preco_real is 0", () => {
    const s = computeScore(lot("a", 1500, 0), formula, weights);
    expect(s.terms[0].value).toBe(0.5);
  });

  it("ranking reorders when preco_real changes", () => {
    const lots = [lot("a", 1000), lot("b", 1000)];
    const before = rank(lots, formula, weights);
    expect(before[0].score.total).toBe(before[1].score.total);

    lots[1].preco_real = 300; // makes b cheaper
    const after = rank(lots, formula, weights);
    expect(after[0].lot.id_lotacao).toBe("b");
    expect(after[0].score.total).toBeGreaterThan(after[1].score.total);
  });
});

describe("setPrecoReal store action", () => {
  beforeEach(() => {
    useStore.setState({
      lotacoes: [lot("L1", 1200), lot("L2", 1200)] as Lotacao[],
    });
  });

  it("persists preco_real and updatedAt on the matching lotacao", () => {
    useStore.getState().setPrecoReal("L1", 450);
    const after = useStore.getState().lotacoes.find((l) => l.id_lotacao === "L1");
    expect(after?.preco_real).toBe(450);
    expect(after?.preco_real_updated_at).toBeTruthy();

    const other = useStore.getState().lotacoes.find((l) => l.id_lotacao === "L2");
    expect(other?.preco_real).toBeUndefined();
  });

  it("changes ranking after preco_real update", () => {
    const before = rank(useStore.getState().lotacoes, formula, weights);
    expect(before[0].score.total).toBe(before[1].score.total);

    useStore.getState().setPrecoReal("L2", 300);
    const after = rank(useStore.getState().lotacoes, formula, weights);
    expect(after[0].lot.id_lotacao).toBe("L2");
  });
});
