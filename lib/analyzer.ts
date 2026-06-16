import Anthropic from "@anthropic-ai/sdk";
import { RUBRIC_PROMPT, computeOverall } from "./rubric";
import type { AnalysisResult, DimensionKey, DimensionScore } from "./types";

const MODEL = "claude-sonnet-4-6";

const DIMENSION_KEYS: DimensionKey[] = [
  "tool_use", "agency_loop", "planning", "memory", "integration", "robustness",
];

const dimensionProp = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 10 },
    justification: { type: "string", description: "Justificación concreta citando el código." },
  },
  required: ["score", "justification"],
} as const;

const SCORE_TOOL: Anthropic.Tool = {
  name: "submit_score",
  description: "Envía la evaluación agéntica estructurada del proyecto.",
  input_schema: {
    type: "object",
    properties: {
      verdict: { type: "string", description: "Veredicto de una frase." },
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
      highlights: { type: "array", items: { type: "string" } },
      red_flags: { type: "array", items: { type: "string" } },
    },
    required: ["verdict", "is_disguised_llm", "dimensions", "highlights", "red_flags"],
  },
};

function clampDims(raw: any): Record<DimensionKey, DimensionScore> {
  const dims = {} as Record<DimensionKey, DimensionScore>;
  for (const k of DIMENSION_KEYS) {
    const d = raw?.[k] ?? {};
    const score = Math.max(0, Math.min(10, Number(d.score) || 0));
    dims[k] = { score, justification: String(d.justification ?? "") };
  }
  return dims;
}

/** Analiza el digest de un repo con Claude y devuelve el resultado validado. */
export async function analyze(digest: string, projectName: string): Promise<AnalysisResult> {
  const client = new Anthropic();
  let lastErr: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2500,
        tools: [SCORE_TOOL],
        tool_choice: { type: "tool", name: "submit_score" },
        messages: [
          {
            role: "user",
            content: `${RUBRIC_PROMPT}\n\n=============================\nPROYECTO: ${projectName}\n=============================\n\nCÓDIGO DEL REPOSITORIO:\n${digest}`,
          },
        ],
      });

      const toolUse = res.content.find((b) => b.type === "tool_use") as
        | Anthropic.ToolUseBlock
        | undefined;
      if (!toolUse) throw new Error("El modelo no devolvió tool_use");

      const input = toolUse.input as any;
      const dimensions = clampDims(input.dimensions);
      const overall = computeOverall(dimensions); // calculado por nosotros, no por el modelo

      return {
        overall,
        verdict: String(input.verdict ?? ""),
        is_disguised_llm: !!input.is_disguised_llm,
        dimensions,
        highlights: Array.isArray(input.highlights) ? input.highlights.map(String) : [],
        red_flags: Array.isArray(input.red_flags) ? input.red_flags.map(String) : [],
      };
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Fallo al analizar");
}
