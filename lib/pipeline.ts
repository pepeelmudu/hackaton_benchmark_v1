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

// Presupuesto de caracteres del digest. Con el tier alto (580k tokens/min) los
// tokens ya no son el cuello de botella, así que mandamos más código (mejor análisis).
const DIGEST_BUDGET = 20_000;

// Cuántos repos analizar EN PARALELO. El tier permite ~1000 req/min y 580k
// tokens/min, así que 8 concurrentes va de sobra y deja margen.
const CONCURRENCY = 8;

/** Ejecuta `fn` sobre `items` con un máximo de `limit` en paralelo. */
async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

/**
 * Ejecuta el ciclo completo para todos los repos de repos.txt, EN PARALELO.
 * Un fallo en un repo no detiene el resto (se guarda un snapshot con error).
 */
export async function runPipeline(db: DB, opts: PipelineOptions = {}): Promise<void> {
  const text = fs.readFileSync(REPOS_FILE, "utf8");
  const projects = parseRepos(text);
  console.log(`[pipeline] ${projects.length} proyectos · concurrencia ${CONCURRENCY}`);
  const started = Date.now();

  await mapPool(projects, CONCURRENCY, async (p) => {
    const projectId = upsertProject(db, p);
    const label = `${p.owner}/${p.name} (${p.team})`;
    try {
      const { dir, commitSha } = fetchRepo(p);

      if (!opts.force && lastCommitSha(db, projectId) === commitSha) {
        console.log(`[pipeline] sin cambios (${commitSha.slice(0, 7)}), salto ${label}`);
        return;
      }

      console.log(`[pipeline] analizando ${label}…`);
      const digest = packRepo(dir, DIGEST_BUDGET);
      const result = await analyze(digest, `${p.owner}/${p.name}`);

      insertSnapshot(db, {
        project_id: projectId,
        ts: Date.now(),
        commit_sha: commitSha,
        overall: result.overall,
        verdict: result.verdict.en, // resumen para la columna; el payload lleva en+es
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
  });

  console.log(`[pipeline] terminado en ${Math.round((Date.now() - started) / 1000)}s`);
}

export function runPipelineStandalone(opts: PipelineOptions = {}) {
  const db = openDb();
  return runPipeline(db, opts).finally(() => db.close());
}
