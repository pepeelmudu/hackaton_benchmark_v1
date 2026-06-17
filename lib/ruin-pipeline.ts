import * as fs from "fs";
import { parseRepos } from "./ingest";
import { fetchRepo } from "./fetcher";
import { packRepo } from "./packer";
import { analyzeRuin } from "./ruin";
import { openDb, upsertProject, insertRuin, lastRuinCommit, type DB } from "./store";

const REPOS_FILE = "repos.txt";
const DIGEST_BUDGET = 20_000;
const CONCURRENCY = 8;

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  });
  await Promise.all(workers);
}

export interface RuinPipelineOptions {
  force?: boolean;
}

/** Audita el coste/derroche de todos los repos, en paralelo. */
export async function runRuinPipeline(db: DB, opts: RuinPipelineOptions = {}): Promise<void> {
  const projects = parseRepos(fs.readFileSync(REPOS_FILE, "utf8"));
  console.log(`[ruin] ${projects.length} proyectos · concurrencia ${CONCURRENCY}`);
  const started = Date.now();

  await mapPool(projects, CONCURRENCY, async (p) => {
    const projectId = upsertProject(db, p);
    const label = `${p.owner}/${p.name} (${p.team})`;
    try {
      const { dir, commitSha } = fetchRepo(p);
      if (!opts.force && lastRuinCommit(db, projectId) === commitSha) {
        console.log(`[ruin] sin cambios, salto ${label}`);
        return;
      }
      console.log(`[ruin] auditando ${label}…`);
      const digest = packRepo(dir, DIGEST_BUDGET);
      const result = await analyzeRuin(digest, `${p.owner}/${p.name}`);
      insertRuin(db, {
        project_id: projectId,
        ts: Date.now(),
        commit_sha: commitSha,
        overall: result.overall,
        payload: result,
      });
      console.log(`[ruin] OK ${label} -> ${result.overall}/10 🔥`);
    } catch (err: any) {
      const msg = (err?.message || String(err)).slice(0, 300);
      console.error(`[ruin] ERROR ${label}: ${msg}`);
      insertRuin(db, {
        project_id: projectId, ts: Date.now(), commit_sha: "",
        overall: 0, payload: null, error: msg,
      });
    }
  });

  console.log(`[ruin] terminado en ${Math.round((Date.now() - started) / 1000)}s`);
}

export function runRuinStandalone(opts: RuinPipelineOptions = {}) {
  const db = openDb();
  return runRuinPipeline(db, opts).finally(() => db.close());
}
