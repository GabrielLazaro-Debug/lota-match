export type AtratividadeLabel = "Baixa" | "Média" | "Alta";

export function deriveAtratividade(pontuacao_lotacao?: number | null): {
  pontos: 0 | 1 | 2;
  label: AtratividadeLabel;
} {
  if (pontuacao_lotacao == null || Number.isNaN(Number(pontuacao_lotacao))) {
    return { pontos: 1, label: "Média" };
  }
  const p = Number(pontuacao_lotacao);
  if (p < 2.0) return { pontos: 0, label: "Baixa" };
  if (p < 3.25) return { pontos: 1, label: "Média" };
  return { pontos: 2, label: "Alta" };
}
