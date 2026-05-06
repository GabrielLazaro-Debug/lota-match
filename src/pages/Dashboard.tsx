import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { rank } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import WeightsPanel from "@/components/WeightsPanel";
import LotacaoCard from "@/components/LotacaoCard";
import LotacaoDetail from "@/components/LotacaoDetail";
import CompareDialog from "@/components/CompareDialog";
import BrazilMap from "@/components/BrazilMap";
import { Download, FileSpreadsheet, MapPinned, Search, Settings, Shield, Upload, Layers, GitCompare, X, Lock, LogOut, ShieldCheck, Home } from "lucide-react";
import { importKmlOrKmz, importXlsx, mergeLotacoes } from "@/lib/importer";
import { toast } from "sonner";
import { exportRankingPdf, exportRankingXlsx } from "@/lib/exporters";
import type { Lotacao, ScoreResult } from "@/lib/types";
import AdminGate, { useAdmin } from "@/components/AdminGate";
import { endSession } from "@/lib/admin";

export default function Dashboard() {
  const store = useStore();
  const formula = store.formulas.find((f) => f.id === store.activeFormulaId)!;
  const ranked = useMemo(() => rank(store.lotacoes, formula, store.weights),
    [store.lotacoes, formula, store.weights]);
  const max = ranked[0]?.score.total ?? 1;

  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [adfron, setAdfron] = useState(false);
  const [direct, setDirect] = useState(false);
  const [topOnly, setTopOnly] = useState(false);

  const filtered = useMemo(() => ranked.filter(({ lot }) => {
    if (q && !`${lot.municipio} ${lot.unidade}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (uf && lot.uf !== uf.toUpperCase()) return false;
    if (adfron && (lot.adfron_pontos ?? 0) === 0) return false;
    if (direct && lot.voo_direto_origem !== true) return false;
    return true;
  }).slice(0, topOnly ? 10 : undefined), [ranked, q, uf, adfron, direct, topOnly]);

  const [detail, setDetail] = useState<{ lot: Lotacao; score: ScoreResult } | undefined>();
  const [cmpA, setCmpA] = useState<{ lot: Lotacao; score: ScoreResult } | undefined>();
  const [cmpB, setCmpB] = useState<{ lot: Lotacao; score: ScoreResult } | undefined>();
  const [cmpOpen, setCmpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ranking");

  const xlsxRef = useRef<HTMLInputElement>(null);
  const kmlRef = useRef<HTMLInputElement>(null);
  const { admin, refresh } = useAdmin();
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "xlsx" | "kml">(null);

  function requireAdmin(action: "xlsx" | "kml") {
    if (admin) {
      if (action === "xlsx") xlsxRef.current?.click();
      else kmlRef.current?.click();
      return;
    }
    setPendingAction(action);
    setGateOpen(true);
  }

  useEffect(() => { store.reenrich(); /* eslint-disable-next-line */ }, []);

  const ufs = Array.from(new Set(store.lotacoes.map((l) => l.uf))).sort();

  function pickForCompare(item: { lot: Lotacao; score: ScoreResult }) {
    if (!cmpA) setCmpA(item);
    else if (!cmpB && item.lot.id_lotacao !== cmpA.lot.id_lotacao) { setCmpB(item); setCmpOpen(true); }
    else { setCmpA(item); setCmpB(undefined); }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-grad-primary"><Shield className="h-4 w-4 text-primary-foreground" /></div>
            Lotação<span className="text-grad">PF</span>
          </Link>
          <div className="ml-4 hidden text-xs text-muted-foreground md:block">
            Origem: <b className="text-foreground">{store.origem ? `${store.origem.municipio}/${store.origem.uf}` : "—"}</b>
            <Link to="/onboarding" className="ml-1 underline hover:text-primary">editar</Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" title="Voltar para a tela inicial">
              <Link to="/"><Home className="mr-1 h-4 w-4" />Início</Link>
            </Button>
            <Button size="sm" variant={admin ? "secondary" : "ghost"}
              onClick={() => admin ? (endSession(), refresh(), toast.success("Sessão admin encerrada")) : setGateOpen(true)}
              title={admin ? "Encerrar sessão admin" : "Entrar como administrador"}>
              {admin ? <><ShieldCheck className="mr-1 h-4 w-4 text-primary" />Admin<LogOut className="ml-1 h-3 w-3" /></> : <><Lock className="mr-1 h-4 w-4" />Admin</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => requireAdmin("xlsx")}><Upload className="mr-1 h-4 w-4" />Excel{!admin && <Lock className="ml-1 h-3 w-3 opacity-60" />}</Button>
            <Button size="sm" variant="ghost" onClick={() => requireAdmin("kml")}><MapPinned className="mr-1 h-4 w-4" />KML/KMZ{!admin && <Lock className="ml-1 h-3 w-3 opacity-60" />}</Button>
            <Button size="sm" variant="ghost" onClick={() => exportRankingPdf(filtered, store.weights)}><Download className="mr-1 h-4 w-4" />PDF</Button>
            <Button size="sm" variant="ghost" onClick={() => exportRankingXlsx(filtered, store.weights)}><FileSpreadsheet className="mr-1 h-4 w-4" />XLSX</Button>
            <input ref={xlsxRef} type="file" accept=".xlsx" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return;
                if (!admin) { toast.error("Acesso negado"); e.target.value = ""; return; }
                try { const r = await importXlsx(f);
                  if (r.lotacoes) store.setLotacoes(mergeLotacoes(store.lotacoes, r.lotacoes));
                  if (r.profiles) r.profiles.forEach(store.saveProfile);
                  toast.success(`${r.lotacoes?.length ?? 0} lotações importadas`);
                } catch (err: any) { toast.error(err.message); } finally { e.target.value = ""; } }} />
            <input ref={kmlRef} type="file" accept=".kml,.kmz" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return;
                if (!admin) { toast.error("Acesso negado"); e.target.value = ""; return; }
                try { const g = await importKmlOrKmz(f); store.setKml(g); toast.success("KML importado"); }
                catch (err: any) { toast.error(err.message); } finally { e.target.value = ""; } }} />
          </div>
        </div>
      </header>

      <AdminGate open={gateOpen} onClose={() => { setGateOpen(false); setPendingAction(null); }}
        onSuccess={() => { refresh(); if (pendingAction === "xlsx") setTimeout(() => xlsxRef.current?.click(), 50);
          else if (pendingAction === "kml") setTimeout(() => kmlRef.current?.click(), 50); setPendingAction(null); }} />

      <div className="container grid gap-6 py-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2 scrollbar-thin">
          <div className="rounded-2xl border border-border/60 bg-grad-card p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Settings className="h-4 w-4 text-primary" />Pesos & Fórmula</div>
            <WeightsPanel />
          </div>
          <div className="rounded-2xl border border-border/60 bg-grad-card p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4 text-primary" />Filtros</div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cidade ou unidade" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <select value={uf} onChange={(e) => setUf(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Todas</option>
                  {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between"><Label className="text-xs">Apenas ADFRON</Label><Switch checked={adfron} onCheckedChange={setAdfron} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Com voo direto da sua origem</Label><Switch checked={direct} onCheckedChange={setDirect} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Top 10 apenas</Label><Switch checked={topOnly} onCheckedChange={setTopOnly} /></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="space-y-4">
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Kpi label="Lotações" value={String(store.lotacoes.length)} />
            <Kpi label="Filtradas" value={String(filtered.length)} />
            <Kpi label="Top score" value={ranked[0]?.score.total.toFixed(2) ?? "0"} accent />
            <Kpi label="Sua origem" value={store.origem ? `${store.origem.municipio}/${store.origem.uf}` : "—"} />
          </div>

          {(cmpA || cmpB) && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
              <GitCompare className="h-4 w-4 text-primary" />
              <span>Comparando: <b>{cmpA?.lot.municipio ?? "—"}</b> vs <b>{cmpB?.lot.municipio ?? "selecione outra"}</b></span>
              <button onClick={() => { setCmpA(undefined); setCmpB(undefined); }}
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />limpar
              </button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="map">Mapa</TabsTrigger>
              <TabsTrigger value="layers">Camadas</TabsTrigger>
            </TabsList>

            <TabsContent value="ranking" className="mt-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((r, i) => (
                  <div key={r.lot.id_lotacao} className="relative">
                    <LotacaoCard lot={r.lot} score={r.score} rank={i + 1} maxScore={max}
                      onClick={() => setDetail(r)}
                      selected={cmpA?.lot.id_lotacao === r.lot.id_lotacao || cmpB?.lot.id_lotacao === r.lot.id_lotacao} />
                    <button onClick={() => pickForCompare(r)}
                      className="absolute right-2 top-2 rounded-md bg-background/80 p-1 text-xs text-muted-foreground hover:text-primary"
                      title="Adicionar à comparação">
                      <GitCompare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {filtered.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma lotação encontrada com os filtros atuais.</div>}
            </TabsContent>

            <TabsContent value="map" className="mt-4">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-grad-card p-2 shadow-soft">
                <BrazilMap rows={filtered} max={max} active={activeTab === "map"} />
              </div>
            </TabsContent>

            <TabsContent value="layers" className="mt-4">
              <div className="rounded-2xl border border-border/60 bg-grad-card p-4 shadow-soft">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Camada de Lotações (heatmap por score)</Label>
                    <Switch checked={store.showLayerLot} onCheckedChange={() => store.toggleLayer("lot")} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Camada do usuário (KML/KMZ importado)</Label>
                    <Switch checked={store.showLayerKml} onCheckedChange={() => store.toggleLayer("kml")} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {store.userKmlGeoJson ? `KML carregado (${store.userKmlGeoJson.features?.length ?? 0} marcadores).` : "Nenhum KML importado ainda."}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <LotacaoDetail open={!!detail} onClose={() => setDetail(undefined)} lot={detail?.lot} score={detail?.score} />
      <CompareDialog open={cmpOpen} onClose={() => setCmpOpen(false)} a={cmpA} b={cmpB} />
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-grad-card p-4 shadow-soft">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-semibold ${accent ? "text-grad" : ""}`}>{value}</div>
    </div>
  );
}
