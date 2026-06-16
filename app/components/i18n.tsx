"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { DimensionKey } from "@/lib/types";

export type Lang = "en" | "es";

export const DIM_KEYS: DimensionKey[] = [
  "tool_use", "agency_loop", "planning", "memory", "integration", "robustness",
];

interface Strings {
  subtitle: string;
  projects: string;
  lastUpdate: string;
  rankingTitle: string;
  colProject: string;
  colScore: string;
  colNota: string;
  disguised: string;
  noData: string;
  reanalyze: string;
  reanalyzing: string;
  passPrompt: string;
  wrongPass: string;
  started: string;
  netError: string;
  cantStart: string;
  verdict: string;
  highlights: string;
  redFlags: string;
  noValid: string;
  commit: string;
  evolutionTitle: string;
  noHistory: string;
  footer: string;
  dimsShort: Record<DimensionKey, string>;
  dimsFull: Record<DimensionKey, string>;
}

const STRINGS: Record<Lang, Strings> = {
  en: {
    subtitle: "Real agent or disguised LLM? · 0–10 scoring · hackathon",
    projects: "PROJECTS",
    lastUpdate: "LAST UPDATE",
    rankingTitle: "╠══ AGENTIC RANKING ══╣",
    colProject: "Project / Team",
    colScore: "Agentic score",
    colNota: "Score",
    disguised: "⚠ DISGUISED LLM",
    noData: "No data yet. Run the analysis:",
    reanalyze: "▶ RE-ANALYZE NOW",
    reanalyzing: "RE-ANALYZING",
    passPrompt: "Password to re-analyze:",
    wrongPass: "wrong password",
    started: "analysis started…",
    netError: "network error",
    cantStart: "Couldn't start.",
    verdict: "VERDICT",
    highlights: "Highlights",
    redFlags: "Red flags",
    noValid: "No valid analysis for",
    commit: "commit",
    evolutionTitle: "╠══ EVOLUTION · AGENTIC SCORE ══╣",
    noHistory: "No history yet. It fills in with each analysis.",
    footer: "elevenyellow · agentic-benchmark · static analysis with Claude",
    dimsShort: {
      tool_use: "Tool", agency_loop: "Loop", planning: "Planning",
      memory: "Memory", integration: "Integration", robustness: "Robustness",
    },
    dimsFull: {
      tool_use: "Tool Use / Real action", agency_loop: "Agency Loop",
      planning: "Planning / Autonomy", memory: "Memory / State",
      integration: "External integration", robustness: "Robustness",
    },
  },
  es: {
    subtitle: "¿Agente de verdad o LLM disfrazado? · evaluación 0–10 · hackathon",
    projects: "PROYECTOS",
    lastUpdate: "ÚLT. ACTUALIZACIÓN",
    rankingTitle: "╠══ RANKING AGÉNTICO ══╣",
    colProject: "Proyecto / Equipo",
    colScore: "Agentic score",
    colNota: "Nota",
    disguised: "⚠ LLM DISFRAZADO",
    noData: "Sin datos todavía. Ejecuta el análisis:",
    reanalyze: "▶ RE-ANALIZAR AHORA",
    reanalyzing: "RE-ANALIZANDO",
    passPrompt: "Contraseña para re-analizar:",
    wrongPass: "contraseña incorrecta",
    started: "análisis lanzado…",
    netError: "fallo de red",
    cantStart: "No se pudo iniciar.",
    verdict: "VEREDICTO",
    highlights: "Highlights",
    redFlags: "Red flags",
    noValid: "Sin análisis válido para",
    commit: "commit",
    evolutionTitle: "╠══ EVOLUCIÓN · AGENTIC SCORE ══╣",
    noHistory: "Aún no hay histórico. Se irá llenando con cada análisis.",
    footer: "elevenyellow · agentic-benchmark · análisis estático con Claude",
    dimsShort: {
      tool_use: "Tool", agency_loop: "Loop", planning: "Plan",
      memory: "Memoria", integration: "Integr.", robustness: "Robustez",
    },
    dimsFull: {
      tool_use: "Tool Use / Acción real", agency_loop: "Agency Loop",
      planning: "Planificación / Autonomía", memory: "Memoria / Estado",
      integration: "Integración externa", robustness: "Robustez",
    },
  },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Strings;
}

const LanguageContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: STRINGS.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "es" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: STRINGS[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);

/** Botón pequeño para cambiar de idioma. Muestra el idioma al que cambiarás. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "es" : "en")}
      aria-label="Toggle language"
      className="border border-[var(--phosphor-dim)] px-2 py-0.5 text-xs text-[var(--phosphor)] transition-colors hover:bg-[rgba(51,255,102,0.12)]"
    >
      {lang === "en" ? "ES" : "EN"}
    </button>
  );
}
