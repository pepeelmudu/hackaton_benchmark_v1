import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import type { Project, Snapshot, LeaderboardRow, AnalysisResult } from "./types";
import { DB_PATH } from "./paths";

export type DB = Database.Database;

const DEFAULT_PATH = DB_PATH;

export function openDb(dbPath: string = DEFAULT_PATH): DB {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      team TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      ts INTEGER NOT NULL,
      commit_sha TEXT NOT NULL,
      overall REAL NOT NULL,
      verdict TEXT NOT NULL,
      is_disguised_llm INTEGER NOT NULL,
      payload TEXT,
      error TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_project_ts ON snapshots(project_id, ts);
  `);
  return db;
}

export function upsertProject(db: DB, p: Project): number {
  const row = db
    .prepare(
      `INSERT INTO projects (url, owner, name, team) VALUES (@url, @owner, @name, @team)
       ON CONFLICT(url) DO UPDATE SET owner=excluded.owner, name=excluded.name, team=excluded.team
       RETURNING id`,
    )
    .get(p) as { id: number };
  return row.id;
}

export function insertSnapshot(db: DB, s: Snapshot): number {
  const info = db
    .prepare(
      `INSERT INTO snapshots (project_id, ts, commit_sha, overall, verdict, is_disguised_llm, payload, error)
       VALUES (@project_id, @ts, @commit_sha, @overall, @verdict, @is_disguised_llm, @payload, @error)`,
    )
    .run({
      project_id: s.project_id,
      ts: s.ts,
      commit_sha: s.commit_sha,
      overall: s.overall,
      verdict: s.verdict,
      is_disguised_llm: s.is_disguised_llm ? 1 : 0,
      payload: s.payload ? JSON.stringify(s.payload) : null,
      error: s.error ?? null,
    });
  return Number(info.lastInsertRowid);
}

export function lastCommitSha(db: DB, projectId: number): string | null {
  const row = db
    .prepare(
      `SELECT commit_sha FROM snapshots WHERE project_id=? AND error IS NULL ORDER BY ts DESC LIMIT 1`,
    )
    .get(projectId) as { commit_sha: string } | undefined;
  return row?.commit_sha ?? null;
}

function parsePayload(p: string | null): AnalysisResult | null {
  if (!p) return null;
  try {
    return JSON.parse(p) as AnalysisResult;
  } catch {
    return null;
  }
}

/** Última nota por proyecto, ordenada de mayor a menor. */
export function getLeaderboard(db: DB): LeaderboardRow[] {
  const rows = db
    .prepare(
      `SELECT p.id, p.url, p.owner, p.name, p.team,
              s.ts, s.commit_sha, s.overall, s.verdict, s.is_disguised_llm, s.payload, s.error
       FROM projects p
       JOIN snapshots s ON s.id = (
         SELECT id FROM snapshots WHERE project_id = p.id ORDER BY ts DESC LIMIT 1
       )
       ORDER BY s.error IS NOT NULL, s.overall DESC`,
    )
    .all() as any[];
  return rows.map((r) => ({
    ...r,
    is_disguised_llm: !!r.is_disguised_llm,
    payload: parsePayload(r.payload),
  }));
}

export function getProject(db: DB, id: number): LeaderboardRow | null {
  const rows = getLeaderboard(db);
  return rows.find((r) => r.id === id) ?? null;
}

/** Histórico de notas globales de un proyecto (para la gráfica de evolución). */
export function getHistory(
  db: DB,
  id: number,
): { ts: number; overall: number; commit_sha: string }[] {
  return db
    .prepare(
      `SELECT ts, overall, commit_sha FROM snapshots
       WHERE project_id=? AND error IS NULL ORDER BY ts ASC`,
    )
    .all(id) as any[];
}

export function getAllProjects(db: DB): Project[] {
  return db.prepare(`SELECT id, url, owner, name, team FROM projects`).all() as Project[];
}
