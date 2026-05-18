import { motion } from "framer-motion";
import { ArrowRight, Compass, FileSpreadsheet, MapPinned, Shield, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { rank } from "@/lib/scoring";
import { importKmlOrKmz, importXlsx, mergeLotacoes } from "@/lib/importer";
import { toast } from "sonner";

export default function Landing() {
  const nav = useNavigate();
  const { setLotacoes, lotacoes, saveProfile, profiles, formulas, activeFormulaId, setKml } = useStore();
  const xlsxRef = useRef<HTMLInputElement>(null);

  const isDisponivel = (lot: any) => Number(lot?.vagas_disponiveis ?? lot?.vagas ?? 0) > 0;
  const familiaProfile = profiles.find((p) => /famil/i.test(p.id) || /famil/i.test(p.nome));
  const familiaWeights = familiaProfile?.pesos ?? {};
  const formula = formulas.find((f) => f.id === activeFormulaId) ?? formulas[0];
  const topFamilia = formula
    ? rank(lotacoes.filter(isDisponivel), formula, familiaWeights).slice(0, 4)
    : [];
  const kmlRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleXlsx(file: File) {
    setBusy(true);
    try {
      const r = await importXlsx(file);
      if (r.lotacoes) setLotacoes(mergeLotacoes(lotacoes, r.lotacoes));
      if (r.profiles) r.profiles.forEach(saveProfile);
      toast.success(`Importado: ${r.lotacoes?.length ?? 0} lotações, ${r.profiles?.length ?? 0} perfis`);
    } catch (e: any) {
      toast.error("Falha na importação: " + e.message);
    } finally { setBusy(false); }
  }

  async function handleKml(file: File) {
    try {
      const g = await importKmlOrKmz(file);
      setKml(g);
      toast.success(`Mapa do usuário importado (${g.features?.length ?? 0} marcadores)`);
    } catch (e: any) { toast.error("Falha KML/KMZ: " + e.message); }
  }

  return (
    <div className="relative min-h-screen bg-hero">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-grad-primary shadow-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          Lotação<span className="text-grad">PF</span>
        </div>
        <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Como funciona</a>
      </header>

      <main className="container">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 glass px-3 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Simulador inteligente de escolha de lotação
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
              Encontre a <span className="text-grad">melhor cidade</span> para a sua lotação na PF.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Compare 69 lotações com pesos personalizados, mapa interativo, ranking dinâmico e
              explicabilidade completa do score. Importe sua planilha e simule cenários em segundos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => nav("/onboarding")}>
                Iniciar simulação <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => xlsxRef.current?.click()} disabled={busy}>
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Importar Excel
              </Button>
              <Button size="lg" variant="outline" onClick={() => kmlRef.current?.click()}>
                <MapPinned className="mr-1 h-4 w-4" /> Importar KML/KMZ
              </Button>
              <input ref={xlsxRef} type="file" accept=".xlsx,.xls" hidden
                onChange={(e) => e.target.files && handleXlsx(e.target.files[0])} />
              <input ref={kmlRef} type="file" accept=".kml,.kmz" hidden
                onChange={(e) => e.target.files && handleKml(e.target.files[0])} />
            </div>
            <div className="mt-6 flex gap-6 text-sm text-muted-foreground">
              <span><b className="text-foreground">{lotacoes.length}</b> lotações</span>
              <span><b className="text-foreground">{profiles.length}</b> perfis</span>
              <span><b className="text-foreground">100%</b> offline</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-grad-primary opacity-20 blur-3xl" />
            <div className="rounded-3xl border border-border/60 bg-grad-card p-6 shadow-soft">
              <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Top lotações para o perfil "Família"</span>
                <span className="font-mono">score</span>
              </div>
              <div className="space-y-2">
                {[
                  { c: "Brasília / DF", s: 18.4, t: "Saúde 5 · Educ. 5" },
                  { c: "Curitiba / PR", s: 16.9, t: "Voo direto · Custo OK" },
                  { c: "Foz do Iguaçu / PR", s: 16.2, t: "ADFRON · Atratividade" },
                  { c: "Boa Vista / RR", s: 15.5, t: "ADFRON · Remoção rápida" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-grad-primary text-sm font-semibold text-primary-foreground">{i + 1}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{r.c}</div>
                      <div className="text-xs text-muted-foreground">{r.t}</div>
                    </div>
                    <div className="font-mono text-sm text-primary">{r.s.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="grid gap-4 pb-20 md:grid-cols-3">
          {[
            { icon: Compass, t: "Pesos personalizados", d: "Sliders, perfis salvos e cenários (família, financeiro, remoção rápida)." },
            { icon: MapPinned, t: "Mapa offline do Brasil", d: "Heatmap por score, camadas KML/KMZ e ícones de aeroporto/fronteira." },
            { icon: Upload, t: "Excel plug-and-play", d: "Reconhece LOTACOES, PERFIS_DE_PESO e FORMULAS automaticamente." },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-grad-card p-6 shadow-soft">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <div className="font-display text-lg font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
