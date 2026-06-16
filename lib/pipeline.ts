import * as fs from "fs";
import { parseRepos } from "./ingest";
import { fetchRepo } from "./fetcher";
import { packRepo } from "./packer";
import { analyze } from "./analyzer";
import {
  openDb,
  upsertProject,
  insertSnapshot,
  lastCommitSha,
  type DB,
} from "./store";

const REPOS_FILE = "repos.txt";

export interface PipelineOptions {
  force?: boolean; // re-analiza aunque no haya commits nuevos
}

// Presupuesto de caracteres del digest. Calibrado para caber bajo el límite de
// 10k tokens de entrada/min de la org (~3.5 chars/token + overhead del prompt).
const DIGEST_BUDGET = 22_000;
// Pausa entre repos para no superar el límite por minuto.
const REPO_DELAY_MS = 65_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta el ciclo completo para todos los repos de repos.txt.
 * Un fallo en un repo no detiene el resto (se guarda un snapshot con error).
 */
export async function runPipeline(db: DB, opts: PipelineOptions = {}): Promise<void> {
  const text = fs.readFileSync(REPOS_FILE, "utf8");
  const projects = parseRepos(text);
  console.log(`[pipeline] ${projects.length} proyectos a analizar`);

  let analyzed = 0;
  for (const p of projects) {
    const projectId = upsertProject(db, p);
    const label = `${p.owner}/${p.name} (${p.team})`;
    try {
      console.log(`[pipeline] fetch ${label}`);
      const { dir, commitSha } = fetchRepo(p);

      if (!opts.force && lastCommitSha(db, projectId) === commitSha) {
        console.log(`[pipeline] sin cambios (${commitSha.slice(0, 7)}), salto ${label}`);
        continue;
      }

      // Pausa entre análisis para respetar el límite por minuto de la API.
      if (analyzed > 0) {
        console.log(`[pipeline] esperando ${REPO_DELAY_MS / 1000}s (rate limit)…`);
        await sleep(REPO_DELAY_MS);
      }
      analyzed++;

      console.log(`[pipeline] pack + analyze ${label}`);
      const digest = packRepo(dir, DIGEST_BUDGET);
      const result = await analyze(digest, `${p.owner}/${p.name}`);

      insertSnapshot(db, {
        project_id: projectId,
        ts: Date.now(),
        commit_sha: commitSha,
        overall: result.overall,
        verdict: result.verdict,
        is_disguised_llm: result.is_disguised_llm,
        payload: result,
      });
      console.log(
        `[pipeline] OK ${label} -> ${result.overall}/10 ${result.is_disguised_llm ? "[LLM DISFRAZADO]" : ""}`,
      );
    } catch (err: any) {
      const msg = (err?.message || String(err)).slice(0, 300);
      console.error(`[pipeline] ERROR ${label}: ${msg}`);
      insertSnapshot(db, {
        project_id: projectId,
        ts: Date.now(),
        commit_sha: "",
        overall: 0,
        verdict: "Error al analizar",
        is_disguised_llm: false,
        payload: null,
        error: msg,
      });
    }
  }
  console.log("[pipeline] terminado");
}

export function runPipelineStandalone(opts: PipelineOptions = {}) {
  const db = openDb();
  return runPipeline(db, opts).finally(() => db.close());
}
