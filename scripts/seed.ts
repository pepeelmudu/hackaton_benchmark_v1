// Siembra datos de DEMO para ver el dashboard sin necesidad de API keys.
// Uso: npm run seed   (NO usar en la demo real; borra con: rm -rf data/)
import { openDb, upsertProject, insertSnapshot } from "../lib/store";
import { computeOverall } from "../lib/rubric";
import type { AnalysisResult, DimensionKey, DimensionScore } from "../lib/types";

const KEYS: DimensionKey[] = [
  "tool_use", "agency_loop", "planning", "memory", "integration", "robustness",
];

const L = (en: string, es: string) => ({ en, es });

function mkResult(base: number[], disguised: boolean): AnalysisResult {
  const dims = {} as Record<DimensionKey, DimensionScore>;
  KEYS.forEach((k, i) => {
    dims[k] = {
      score: base[i],
      justification: L(`Example evidence for ${k}: level ${base[i]}/10.`, `Evidencia ejemplo para ${k}: nivel ${base[i]}/10.`),
    };
  });
  return {
    overall: computeOverall(dims),
    verdict: disguised
      ? L("Disguised LLM: declares tools but never runs them", "LLM disfrazado: declara tools pero no las ejecuta")
      : L("Real agent with loop and tools", "Agente real con loop y tools"),
    is_disguised_llm: disguised,
    dimensions: dims,
    highlights: disguised
      ? [L("Good prompt engineering", "Buen prompt engineering")]
      : [L("Solid retry loop", "Loop de reintentos sólido"), L("3 real tools in use", "3 tools reales en uso")],
    red_flags: disguised
      ? [L("Tools are never invoked", "Las tools nunca se invocan"), L("Fixed linear flow", "Flujo lineal fijo")]
      : [L("No output validation", "Sin validación de salidas")],
  };
}

const SEED = [
  { url: "https://github.com/elevenyellow/cluedo", owner: "elevenyellow", name: "cluedo", team: "Leños y Jose Saez", curve: [[4,3,4,5,3,4],[6,5,6,6,5,5],[8,8,7,7,7,6]], disguised: false },
  { url: "https://github.com/elevenyellow/ai-appraisal-agent", owner: "elevenyellow", name: "ai-appraisal-agent", team: "Agustin y Otto", curve: [[7,6,7,6,7,6],[8,8,8,7,8,7],[9,9,8,8,9,8]], disguised: false },
  { url: "https://github.com/pepeelmudu/rol_hackaton_v1", owner: "pepeelmudu", name: "rol_hackaton_v1", team: "Lucas y Al", curve: [[3,2,3,4,2,3],[3,3,3,4,3,3],[4,2,3,5,3,4]], disguised: true },
];

const db = openDb();
const now = Date.now();
for (const s of SEED) {
  const pid = upsertProject(db, { url: s.url, owner: s.owner, name: s.name, team: s.team });
  s.curve.forEach((base, i) => {
    const last = i === s.curve.length - 1;
    const result = mkResult(base, last && s.disguised);
    insertSnapshot(db, {
      project_id: pid,
      ts: now - (s.curve.length - 1 - i) * 90 * 60 * 1000, // cada 90 min hacia atrás
      commit_sha: `demo${i}${pid}abc`,
      overall: result.overall,
      verdict: result.verdict.en,
      is_disguised_llm: result.is_disguised_llm,
      payload: result,
    });
  });
}
console.log("Datos de demo sembrados. Arranca con: npm run dev");
db.close();
