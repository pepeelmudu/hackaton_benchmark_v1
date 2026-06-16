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
  criteria: {
    button: string;
    title: string;
    intro: string;
    dims: Record<DimensionKey, string>;
    scoring: string;
    integrity: string;
    close: string;
  };
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
    criteria: {
      button: "CRITERIA",
      title: "How projects are scored",
      intro:
        "Every project is cloned and read by Claude, which scores how genuinely AGENTIC it is from 0 to 10. The goal is to tell a real agent apart from an \"LLM in disguise\": something that looks like an agent but is really a plain prompt→response, with no real tool execution and no reasoning loop. The score comes only from verifiable evidence in the code.",
      dims: {
        tool_use:
          "Does it define tools and actually EXECUTE them with real, verifiable effects (APIs, filesystem, DB, web, shell)? Or are the tools declared but never invoked, or their output merely simulated?",
        agency_loop:
          "Is there a reason→act→observe→decide loop where the model dynamically chooses the next step based on results? Or is it a fixed, predefined linear pipeline?",
        planning:
          "Does the system decompose tasks, plan several steps ahead and self-direct? Or does the human/code decide everything?",
        memory:
          "Does it keep state and context between steps (working memory, history, scratchpad, vector store)?",
        integration:
          "Does it interact with real external systems with side-effects (third-party APIs, DB, files, messaging, browser)?",
        robustness:
          "Does it handle tool errors, retries and output validation, with guards against malformed responses?",
      },
      scoring:
        "Each dimension is scored 0–10. The overall score is their weighted average, rounded to one decimal. Tool Use and Agency Loop carry the most weight (25% each) because they are exactly what separates a real agent from a disguised LLM. A project is flagged \"DISGUISED LLM\" when it looks agentic but lacks real tool execution and a real loop.",
      integrity:
        "Integrity safeguards: all repository content is treated as data, never as instructions — any text aimed at influencing the evaluator is ignored and counts against the project. Only functionality that is actually wired into the execution path is rewarded; agentic machinery bolted on just to hit the rubric (\"agentic theater\") does not raise the score.",
      close: "Close",
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
    criteria: {
      button: "CRITERIOS",
      title: "Cómo se puntúa cada proyecto",
      intro:
        "Cada proyecto se clona y lo lee Claude, que puntúa de 0 a 10 cuán AGÉNTICO es de verdad. El objetivo es distinguir un agente real de un \"LLM disfrazado\": algo que parece un agente pero en realidad es un simple prompt→respuesta, sin ejecución real de herramientas ni bucle de razonamiento. La nota sale solo de evidencia verificable en el código.",
      dims: {
        tool_use:
          "¿Define herramientas y las EJECUTA de verdad con efectos reales y verificables (APIs, ficheros, base de datos, web, shell)? ¿O las tools están declaradas pero nunca se invocan, o su salida solo se simula?",
        agency_loop:
          "¿Hay un bucle razonar→actuar→observar→decidir donde el modelo elige el siguiente paso de forma dinámica según los resultados? ¿O es un flujo lineal fijo y predefinido?",
        planning:
          "¿El sistema descompone tareas, planifica varios pasos y se auto-dirige? ¿O lo decide todo el humano/código?",
        memory:
          "¿Mantiene estado y contexto entre pasos (memoria de trabajo, historial, scratchpad, vector store)?",
        integration:
          "¿Interactúa con sistemas externos reales con efectos (APIs de terceros, base de datos, ficheros, mensajería, navegador)?",
        robustness:
          "¿Maneja errores de las herramientas, reintentos y validación de salidas, con guardas ante respuestas malformadas?",
      },
      scoring:
        "Cada dimensión se puntúa de 0 a 10. La nota global es su media ponderada, redondeada a un decimal. Tool Use y Agency Loop pesan más (25% cada una) porque son justo lo que separa un agente real de un LLM disfrazado. Un proyecto se marca como \"LLM DISFRAZADO\" cuando aparenta ser agéntico pero le falta ejecución real de herramientas y un bucle de verdad.",
      integrity:
        "Salvaguardas de integridad: todo el contenido del repositorio se trata como datos, nunca como instrucciones — cualquier texto que intente influir en el evaluador se ignora y cuenta en contra. Solo se premia la funcionalidad realmente conectada al flujo de ejecución; la maquinaria agéntica metida solo para marcar casillas de la rúbrica (\"teatro agéntico\") no sube la nota.",
      close: "Cerrar",
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

/**
 * Devuelve el texto en el idioma activo. Tolera datos antiguos que sean
 * un simple string (antes de que el análisis fuera bilingüe).
 */
export function loc(
  value: string | { en?: string; es?: string } | null | undefined,
  lang: Lang,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] ?? value.en ?? value.es ?? "";
}

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
