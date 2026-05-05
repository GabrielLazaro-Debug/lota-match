import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Lotacao, ScoreResult, Weights } from "./types";

export function exportRankingPdf(rows: { lot: Lotacao; score: ScoreResult }[], weights: Weights) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Ranking — Simulador de Lotação PF", 14, 16);
  doc.setFontSize(10);
  doc.text(`Pesos: ${Object.entries(weights).map(([k,v])=>`${k}=${v}`).join(", ")}`, 14, 24);
  autoTable(doc, {
    startY: 30,
    head: [["#", "Unidade", "Município", "UF", "Vagas", "Score"]],
    body: rows.map((r, i) => [
      i + 1, r.lot.unidade, r.lot.municipio, r.lot.uf, r.lot.vagas, r.score.total.toFixed(2),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 200, 150] },
  });
  doc.save("ranking-lotacoes-pf.pdf");
}

export function exportRankingXlsx(rows: { lot: Lotacao; score: ScoreResult }[], weights: Weights) {
  const data = rows.map((r, i) => ({
    rank: i + 1,
    unidade: r.lot.unidade, municipio: r.lot.municipio, uf: r.lot.uf, vagas: r.lot.vagas,
    score: r.score.total, score_excel: r.lot.score_final,
    saude: r.lot.saude, educacao: r.lot.educacao, custo_vida: r.lot.custo_vida,
    aeroporto: r.lot.aeroporto, voo_direto_fortaleza: r.lot.voo_direto_fortaleza,
    passagem_media: r.lot.passagem_media, adfron_pontos: r.lot.adfron_pontos,
    distancia_origem_km: r.lot.distancia_origem_km, distancia_fortaleza_km: r.lot.distancia_fortaleza_km,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "RANKING");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(weights).map(([k,v])=>({criterio:k,peso:v}))), "PESOS");
  XLSX.writeFile(wb, "ranking-lotacoes-pf.xlsx");
}
