import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { FIELD_LABELS } from "@/lib/scoring";
import { SCENARIOS } from "@/lib/data";
import { Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function WeightsPanel() {
  const { weights, setWeights, profiles, activeProfileId, setActiveProfile, saveProfile, formulas, activeFormulaId, setActiveFormula } = useStore();
  const formula = formulas.find((f) => f.id === activeFormulaId)!;
  const keys = Array.from(new Set(formula.terms.map((t) => t.weightKey)));
  const [name, setName] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs uppercase text-muted-foreground">Fórmula ativa</Label>
        <Select value={activeFormulaId} onValueChange={setActiveFormula}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {formulas.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs uppercase text-muted-foreground">Perfil de pesos</Label>
        <Select value={activeProfileId} onValueChange={setActiveProfile}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1 text-xs uppercase text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Cenários rápidos
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => { setWeights(s.weights); toast.success(`Cenário: ${s.nome}`); }}
              className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs hover:bg-secondary">
              {s.emoji} {s.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {keys.map((k) => (
          <div key={k}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-foreground">{FIELD_LABELS[k] ?? k}</span>
              <span className="font-mono text-primary">{(weights[k] ?? 0).toFixed(1)}</span>
            </div>
            <Slider min={0} max={5} step={0.5}
              value={[weights[k] ?? 0]}
              onValueChange={(v) => setWeights({ ...weights, [k]: v[0] })} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
        <Label className="text-xs uppercase text-muted-foreground">Salvar perfil atual</Label>
        <div className="mt-2 flex gap-2">
          <Input placeholder="Nome do perfil" value={name} onChange={(e) => setName(e.target.value)} />
          <Button size="icon" disabled={!name}
            onClick={() => {
              const id = "custom_" + Date.now();
              saveProfile({ id, nome: name, pesos: { ...weights } });
              setName(""); toast.success("Perfil salvo");
            }}><Save className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
