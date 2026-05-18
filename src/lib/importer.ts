import * as XLSX from "xlsx";
import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";
import type { Formula, Lotacao, PesoProfile } from "./types";
import { buildProfilesFromRows } from "./data";
import { deriveAtratividade } from "./deriveAtratividade";
import { computeEstruturaUrbana } from "./estruturaUrbana";

const NUM_FIELDS = ["vagas","vagas_disponiveis","pontuacao_lotacao","atratividade_pontos","saude","educacao","custo_vida",
  "adfron_flag","adfron_pontos","aeroporto","voo_direto_fortaleza","passagem_media","passagem_valor_min",
  "passagem_valor_max","passagem_categoria","score_final","populacao","pib_per_capita",
  "ips_brasil_2025","ips_agua_saneamento","ips_seguranca_pessoal","ifdm_firjan","saude_firjan",
  "emprego_renda_firjan","taxa_homicidios","saude_leitos","fipezap_m2"];

function normalizeRow(r: any): Lotacao {
  const out: any = { ...r };
  for (const f of NUM_FIELDS) if (out[f] != null) out[f] = Number(out[f]);
  // ADFRON: normaliza para 0 ou 2 (qualquer valor > 0 = ativo)
  const adfronAtivo = (Number(out.adfron_pontos) || 0) > 0 || out.adfron_flag === 1 || out.adfron_flag === true;
  out.adfron_flag = adfronAtivo ? 1 : 0;
  out.adfron_pontos = adfronAtivo ? 2 : 0;
  out.atratividade_pontos_calc = deriveAtratividade(out.pontuacao_lotacao).pontos;
  out.estrutura_urbana_pontos = computeEstruturaUrbana(out);
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

export function normalizeKey(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")     // diacríticos
    .toLowerCase()
    .replace(/[–—−]/g, "-")              // padroniza hífens
    .replace(/\s+/g, " ")
    .trim();
}

function parseUnidade(u?: string): { tipo?: string; sigla?: string; uf?: string } {
  if (!u) return {};
  const parts = String(u).split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return { tipo: parts[0], sigla: parts[1], uf: parts[2] };
  if (parts.length === 2) return { tipo: parts[0], uf: parts[1] };
  return { tipo: parts[0] };
}

export interface MergeReport {
  updated: number;
  added: number;
  notFound: Array<{ id_lotacao?: string; unidade?: string; municipio?: string; uf?: string }>;
  matchedByFallback: Array<{ candidate: string; matched: string; via: string }>;
}

export function mergeLotacoesWithReport(prev: Lotacao[], incoming: Lotacao[]): { merged: Lotacao[]; report: MergeReport } {
  const report: MergeReport = { updated: 0, added: 0, notFound: [], matchedByFallback: [] };
  // Indices
  const byId = new Map<string, Lotacao>();
  const byUfMun = new Map<string, Lotacao[]>();
  for (const l of prev) {
    const key = l.id_lotacao || `${l.unidade}-${l.municipio}`;
    byId.set(normalizeKey(key), l);
    const k = `${normalizeKey(l.uf)}|${normalizeKey(l.municipio)}`;
    const arr = byUfMun.get(k) ?? []; arr.push(l); byUfMun.set(k, arr);
  }
  const merged = [...prev];
  const indexOf = (l: Lotacao) => merged.indexOf(l);

  for (const inc of incoming) {
    const candId = inc.id_lotacao || `${inc.unidade}-${inc.municipio}`;
    let match: Lotacao | undefined;
    let via = "id";

    // 1) id normalizado
    match = byId.get(normalizeKey(candId));

    // 2) fallback por (uf + municipio)
    if (!match) {
      const k = `${normalizeKey(inc.uf)}|${normalizeKey(inc.municipio)}`;
      const arr = byUfMun.get(k) ?? [];
      if (arr.length === 1) { match = arr[0]; via = "uf+municipio"; }
      else if (arr.length > 1) {
        // 3) refinar por (tipo + sigla) extraídos do unidade
        const cp = parseUnidade(inc.unidade);
        const refined = arr.filter((x) => {
          const xp = parseUnidade(x.unidade);
          return cp.tipo && xp.tipo && normalizeKey(cp.tipo) === normalizeKey(xp.tipo)
            && (!cp.sigla || !xp.sigla || normalizeKey(cp.sigla) === normalizeKey(xp.sigla));
        });
        if (refined.length === 1) { match = refined[0]; via = "uf+municipio+tipo/sigla"; }
        else {
          // 4) unidade contendo `${tipo}/${sigla}/${uf}`
          const needle = normalizeKey(`${cp.tipo ?? ""}/${cp.sigla ?? ""}/${inc.uf ?? ""}`);
          const sub = arr.filter((x) => normalizeKey(x.unidade).includes(needle.replace(/\/+$/g, "")));
          if (sub.length === 1) { match = sub[0]; via = "unidade-substring"; }
        }
      }
    }

    if (match) {
      const idx = indexOf(match);
      const next = { ...match, ...inc };
      merged[idx] = next;
      // mantém índices atualizados
      byId.set(normalizeKey(next.id_lotacao || candId), next);
      report.updated++;
      if (via !== "id") report.matchedByFallback.push({ candidate: candId, matched: match.id_lotacao || `${match.unidade}-${match.municipio}`, via });
    } else {
      merged.push(inc);
      byId.set(normalizeKey(candId), inc);
      report.added++;
      report.notFound.push({ id_lotacao: candId, unidade: inc.unidade, municipio: inc.municipio, uf: inc.uf });
    }
  }
  return { merged, report };
}

// Mantém assinatura antiga para retrocompatibilidade
export function mergeLotacoes(prev: Lotacao[], incoming: Lotacao[]): Lotacao[] {
  return mergeLotacoesWithReport(prev, incoming).merged;
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
