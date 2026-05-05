import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GEO } from "@/lib/geo";
import { useStore } from "@/lib/store";
import { Shield } from "lucide-react";

export default function Onboarding() {
  const nav = useNavigate();
  const { setOrigem, setOnboarded, origem } = useStore();
  const [muni, setMuni] = useState(origem?.municipio ?? "");
  const [uf, setUf] = useState(origem?.uf ?? "");
  const filtered = muni.length >= 2
    ? GEO.filter((g) => g.municipio.toLowerCase().includes(muni.toLowerCase())).slice(0, 6)
    : [];

  function go() {
    setOrigem({ municipio: muni, uf: uf.toUpperCase() });
    setOnboarded(true);
    nav("/dashboard");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-hero p-6">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-grad-card p-8 shadow-soft">
        <div className="mb-4 flex items-center gap-2 font-display text-lg">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-grad-primary"><Shield className="h-5 w-5 text-primary-foreground" /></div>
          <span>Onboarding</span>
        </div>
        <h2 className="font-display text-2xl font-semibold">Onde você mora atualmente?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usamos sua origem para calcular distâncias e impacto logístico em cada cenário.
        </p>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label>Cidade</Label>
            <Input value={muni} onChange={(e) => setMuni(e.target.value)} placeholder="Ex: Fortaleza" />
            {filtered.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-secondary/40">
                {filtered.map((g) => (
                  <button key={g.municipio + g.uf}
                    onClick={() => { setMuni(g.municipio); setUf(g.uf); }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary">
                    <span>{g.municipio}</span><span className="text-xs text-muted-foreground">{g.uf}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>UF</Label>
            <Input value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} placeholder="CE" />
          </div>
          <Button disabled={!muni || !uf} onClick={go} className="mt-2">Continuar</Button>
          <button onClick={() => { setOnboarded(true); nav("/dashboard"); }}
            className="text-xs text-muted-foreground hover:text-foreground">Pular por enquanto</button>
        </div>
      </div>
    </div>
  );
}
