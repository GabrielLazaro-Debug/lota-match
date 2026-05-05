import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_FORMULAS, DEFAULT_LOTACOES, DEFAULT_PROFILES } from "./data";
import { enrichLotacoes, findGeo } from "./geo";
import type { Formula, Lotacao, Origem, PesoProfile, Weights } from "./types";

interface State {
  lotacoes: Lotacao[];
  profiles: PesoProfile[];
  formulas: Formula[];
  activeFormulaId: string;
  activeProfileId: string;
  weights: Weights;
  origem?: Origem;
  onboarded: boolean;
  userKmlGeoJson?: any;
  showLayerLot: boolean;
  showLayerKml: boolean;
  setLotacoes: (l: Lotacao[]) => void;
  setOrigem: (o: Origem) => void;
  setWeights: (w: Weights) => void;
  setActiveFormula: (id: string) => void;
  setActiveProfile: (id: string) => void;
  saveProfile: (p: PesoProfile) => void;
  setOnboarded: (v: boolean) => void;
  setKml: (g: any) => void;
  toggleLayer: (k: "lot" | "kml") => void;
  reenrich: () => void;
}

const initialWeights = DEFAULT_PROFILES.find((p) => p.id === "padrao_planilha")?.pesos
  ?? Object.fromEntries(DEFAULT_FORMULAS[0].terms.map((t) => [t.weightKey, 1]));

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      lotacoes: enrichLotacoes(DEFAULT_LOTACOES),
      profiles: DEFAULT_PROFILES,
      formulas: DEFAULT_FORMULAS,
      activeFormulaId: DEFAULT_FORMULAS[0].id,
      activeProfileId: "padrao_planilha",
      weights: initialWeights,
      onboarded: false,
      showLayerLot: true,
      showLayerKml: true,
      setLotacoes: (l) => set({ lotacoes: enrichLotacoes(l, get().origem) }),
      setOrigem: (o) => {
        const g = findGeo(o.municipio, o.uf);
        const origem = { ...o, lat: g?.lat, lon: g?.lon };
        set({ origem, lotacoes: enrichLotacoes(get().lotacoes, origem) });
      },
      setWeights: (w) => set({ weights: w }),
      setActiveFormula: (id) => set({ activeFormulaId: id }),
      setActiveProfile: (id) => {
        const p = get().profiles.find((x) => x.id === id);
        if (p) set({ activeProfileId: id, weights: { ...p.pesos } });
      },
      saveProfile: (p) => {
        const profs = get().profiles.filter((x) => x.id !== p.id);
        set({ profiles: [...profs, p], activeProfileId: p.id });
      },
      setOnboarded: (v) => set({ onboarded: v }),
      setKml: (g) => set({ userKmlGeoJson: g }),
      toggleLayer: (k) => set(k === "lot" ? { showLayerLot: !get().showLayerLot } : { showLayerKml: !get().showLayerKml }),
      reenrich: () => set({ lotacoes: enrichLotacoes(get().lotacoes, get().origem) }),
    }),
    {
      name: "pf-simulador-v1",
      partialize: (s) => ({
        profiles: s.profiles, weights: s.weights, activeFormulaId: s.activeFormulaId,
        activeProfileId: s.activeProfileId, origem: s.origem, onboarded: s.onboarded,
        formulas: s.formulas, userKmlGeoJson: s.userKmlGeoJson,
        showLayerLot: s.showLayerLot, showLayerKml: s.showLayerKml,
      }),
    },
  ),
);

export function useActiveFormula(): Formula {
  const { formulas, activeFormulaId } = useStore();
  return formulas.find((f) => f.id === activeFormulaId) ?? formulas[0];
}
