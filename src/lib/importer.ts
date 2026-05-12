import * as XLSX from "xlsx";
import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";
import type { Formula, Lotacao, PesoProfile } from "./types";
import { buildProfilesFromRows } from "./data";

const NUM_FIELDS = ["vagas","pontuacao_lotacao","atratividade_pontos","saude","educacao","custo_vida",
  "adfron_flag","adfron_pontos","aeroporto","voo_direto_fortaleza","passagem_media","passagem_valor_min",
  "passagem_valor_max","passagem_categoria","score_final"];

function normalizeRow(r: any): Lotacao {
  const out: any = { ...r };
  for (const f of NUM_FIELDS) if (out[f] != null) out[f] = Number(out[f]);
  // ADFRON: normaliza para 0 ou 2 (qualquer valor > 0 = ativo)
  const adfronAtivo = (Number(out.adfron_pontos) || 0) > 0 || out.adfron_flag === 1 || out.adfron_flag === true;
  out.adfron_pontos = adfronAtivo ? 2 : 0;
  if (!out.id_lotacao && out.unidade && out.municipio) out.id_lotacao = `${out.unidade}-${out.municipio}`;
  return out as Lotacao;
}

export interface ImportResult {
  lotacoes?: Lotacao[];
  profiles?: PesoProfile[];
  formulas?: Formula[];
  errors: string[];
}

export async function importXlsx(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const result: ImportResult = { errors: [] };

  const lot = wb.Sheets["LOTACOES"];
  if (lot) {
    const rows = XLSX.utils.sheet_to_json<any>(lot, { defval: null });
    result.lotacoes = rows.map(normalizeRow).filter((r) => r.unidade && r.municipio);
  } else result.errors.push("Aba LOTACOES não encontrada.");

  const pf = wb.Sheets["PERFIS_DE_PESO"];
  if (pf) {
    const rows = XLSX.utils.sheet_to_json<any>(pf, { defval: null });
    result.profiles = buildProfilesFromRows(rows as any);
  }

  const fm = wb.Sheets["FORMULAS"];
  if (fm) {
    const rows = XLSX.utils.sheet_to_json<any>(fm, { defval: null });
    result.formulas = rows.map((r) => {
      const j = typeof r.formula_json === "string" ? JSON.parse(r.formula_json) : r.formula_json;
      return { id: r.formula_id, nome: r.formula_nome, type: j.type, terms: j.terms, versao: r.versao, descricao: r.descricao };
    });
  }
  return result;
}

export function mergeLotacoes(prev: Lotacao[], incoming: Lotacao[]): Lotacao[] {
  const map = new Map<string, Lotacao>();
  for (const l of prev) map.set(l.id_lotacao || `${l.unidade}-${l.municipio}`, l);
  for (const l of incoming) {
    const k = l.id_lotacao || `${l.unidade}-${l.municipio}`;
    map.set(k, { ...map.get(k), ...l });
  }
  return [...map.values()];
}

export async function importKmlOrKmz(file: File): Promise<any> {
  const name = file.name.toLowerCase();
  let kmlText: string;
  if (name.endsWith(".kmz")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const kmlFile = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith(".kml"));
    if (!kmlFile) throw new Error("KML não encontrado dentro do KMZ");
    kmlText = await kmlFile.async("string");
  } else {
    kmlText = await file.text();
  }
  const dom = new DOMParser().parseFromString(kmlText, "text/xml");
  return kml(dom);
}
