import Anthropic from "@anthropic-ai/sdk";
import { RUBRIC_PROMPT, computeOverall } from "./rubric";
import type { AnalysisResult, DimensionKey, DimensionScore, Localized } from "./types";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const XAI_MODEL = process.env.XAI_MODEL || "grok-4";
const XAI_BASE_URL = "https://api.x.ai";
const MAX_ATTEMPTS = 4;

/**
 * Elige el proveedor del LLM. Prioridad: Anthropic primero, luego xAI (Grok).
 * xAI es compatible con el SDK de Anthropic, así que solo cambia baseURL/apiKey/modelo.
 */
function makeClient(): { client: Anthropic; model: string; provider: string } {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;

  if (anthropicKey) {
    return {
      client: new Anthropic({ apiKey: anthropicKey }),
      model: ANTHROPIC_MODEL,
      provider: "anthropic",
    };
  }

  if (xaiKey) {
    return {
      client: new Anthropic({ apiKey: xaiKey, baseURL: XAI_BASE_URL }),
      model: XAI_MODEL,
      provider: "xai",
    };
  }

  throw new Error(
    "Falta ANTHROPIC_API_KEY o XAI_API_KEY en el entorno (.env.local)",
  );
}

const DIMENSION_KEYS: DimensionKey[] = [
  "tool_use", "agency_loop", "planning", "memory", "integration", "robustness",
];

const localizedProp = {
  type: "object",
  description: "Texto en inglés (en) y español (es), mismo significado.",
  properties: {
    en: { type: "string" },
    es: { type: "string" },
  },
  required: ["en", "es"],
} as const;

const dimensionProp = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 10 },
    justification: localizedProp,
  },
  required: ["score", "justification"],
} as const;

const SCORE_TOOL: Anthropic.Tool = {
  name: "submit_score",
  description: "Envía la evaluación agéntica estructurada del proyecto.",
  input_schema: {
    type: "object",
    properties: {
      verdict: { ...localizedProp, description: "Veredicto de una frase (en/es)." },
      is_disguised_llm: {
        type: "boolean",
        description: "true si en realidad es un LLM disfrazado de agente (no ejecuta tools reales / sin loop).",
      },
      dimensions: {
        type: "object",
        properties: {
          tool_use: dimensionProp,
          agency_loop: dimensionProp,
          planning: dimensionProp,
          memory: dimensionProp,
          integration: dimensionProp,
          robustness: dimensionProp,
        },
        required: DIMENSION_KEYS,
      },
      highlights: { type: "array", items: localizedProp },
      red_flags: { type: "array", items: localizedProp },
    },
    required: ["verdict", "is_disguised_llm", "dimensions", "highlights", "red_flags"],
  },
};

function toLocalized(v: any): Localized {
  if (v && typeof v === "object") {
    return { en: String(v.en ?? v.es ?? ""), es: String(v.es ?? v.en ?? "") };
  }
  const s = String(v ?? "");
  return { en: s, es: s };
}

function clampDims(raw: any): Record<DimensionKey, DimensionScore> {
  const dims = {} as Record<DimensionKey, DimensionScore>;
  for (const k of DIMENSION_KEYS) {
    const d = raw?.[k] ?? {};
    const score = Math.max(0, Math.min(10, Number(d.score) || 0));
    dims[k] = { score, justification: toLocalized(d.justification) };
  }
  return dims;
}

/** Analiza el digest de un repo con Claude y devuelve el resultado validado. */
export async function analyze(digest: string, projectName: string): Promise<AnalysisResult> {
  const { client, model, provider } = makeClient();
  let lastErr: unknown;

  if (process.env.BENCHMARK_VERBOSE) {
    console.log(`[analyzer] proveedor=${provider} modelo=${model}`);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 5000, // bilingüe (en+es) x 6 dims + verdict + listas: necesita holgura
        temperature: 0, // máxima consistencia: misma versión de código -> misma nota
        tools: [SCORE_TOOL],
        tool_choice: { type: "tool", name: "submit_score" },
        messages: [
          {
            role: "user",
            content: `${RUBRIC_PROMPT}\n\n=============================\nPROYECTO: ${projectName}\n=============================\n\nCÓDIGO DEL REPOSITORIO:\n${digest}`,
          },
        ],
      });

      // Guarda anti-truncado: si la respuesta se cortó por longitud, el JSON
      // de la tool puede venir incompleto (notas a 0). Mejor reintentar.
      if (res.stop_reason === "max_tokens") {
        throw new Error("respuesta truncada (max_tokens), reintentando");
      }

      const toolUse = res.content.find((b) => b.type === "tool_use") as
        | Anthropic.ToolUseBlock
        | undefined;
      if (!toolUse) throw new Error("El modelo no devolvió tool_use");

      const input = toolUse.input as any;
      const dimensions = clampDims(input.dimensions);
      // Sanidad: veredicto positivo pero todas las dimensiones a 0 = datos corruptos.
      const allZero = Object.values(dimensions).every((d) => d.score === 0);
      if (allZero && !input.is_disguised_llm) {
        throw new Error("dimensiones todas a 0 con veredicto no-disfrazado (datos corruptos)");
      }
      const overall = computeOverall(dimensions); // calculado por nosotros, no por el modelo

      return {
        overall,
        verdict: toLocalized(input.verdict),
        is_disguised_llm: !!input.is_disguised_llm,
        dimensions,
        highlights: Array.isArray(input.highlights) ? input.highlights.map(toLocalized) : [],
        red_flags: Array.isArray(input.red_flags) ? input.red_flags.map(toLocalized) : [],
      };
    } catch (err: any) {
      lastErr = err;
      const is429 = err?.status === 429 || /rate_limit/.test(String(err?.message));
      // El límite es por minuto: ante 429 esperamos a que se renueve la cuota.
      const waitMs = is429 ? 65_000 : 1500 * (attempt + 1);
      if (attempt < MAX_ATTEMPTS - 1) {
        console.warn(
          `[analyzer] intento ${attempt + 1} falló (${is429 ? "rate limit" : "error"}), espero ${Math.round(waitMs / 1000)}s`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Fallo al analizar");
}
