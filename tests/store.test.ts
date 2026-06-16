import {
  openDb,
  upsertProject,
  insertSnapshot,
  getLeaderboard,
  getHistory,
  lastCommitSha,
} from "@/lib/store";
import { test, expect } from "vitest";
import type { AnalysisResult } from "@/lib/types";

const fakePayload = { overall: 0 } as unknown as AnalysisResult;

test("upsert + leaderboard devuelve la última nota por proyecto", () => {
  const db = openDb(":memory:");
  const pid = upsertProject(db, { url: "u", owner: "o", name: "n", team: "t" });
  insertSnapshot(db, {
    project_id: pid, ts: 1, commit_sha: "a", overall: 5,
    verdict: "v", is_disguised_llm: false, payload: fakePayload,
  });
  insertSnapshot(db, {
    project_id: pid, ts: 2, commit_sha: "b", overall: 8,
    verdict: "v2", is_disguised_llm: false, payload: fakePayload,
  });
  const lb = getLeaderboard(db);
  expect(lb).toHaveLength(1);
  expect(lb[0].overall).toBe(8);
  expect(lb[0].team).toBe("t");
});

test("upsert es idempotente por url", () => {
  const db = openDb(":memory:");
  const a = upsertProject(db, { url: "x", owner: "o", name: "n", team: "t1" });
  const b = upsertProject(db, { url: "x", owner: "o", name: "n", team: "t2" });
  expect(a).toBe(b);
});

test("lastCommitSha ignora snapshots con error", () => {
  const db = openDb(":memory:");
  const pid = upsertProject(db, { url: "u", owner: "o", name: "n", team: "t" });
  insertSnapshot(db, {
    project_id: pid, ts: 1, commit_sha: "good", overall: 5,
    verdict: "v", is_disguised_llm: false, payload: fakePayload,
  });
  insertSnapshot(db, {
    project_id: pid, ts: 2, commit_sha: "", overall: 0,
    verdict: "err", is_disguised_llm: false, payload: null, error: "boom",
  });
  expect(lastCommitSha(db, pid)).toBe("good");
});

test("getHistory devuelve solo snapshots válidos en orden ascendente", () => {
  const db = openDb(":memory:");
  const pid = upsertProject(db, { url: "u", owner: "o", name: "n", team: "t" });
  insertSnapshot(db, {
    project_id: pid, ts: 10, commit_sha: "a", overall: 6,
    verdict: "v", is_disguised_llm: false, payload: fakePayload,
  });
  insertSnapshot(db, {
    project_id: pid, ts: 5, commit_sha: "b", overall: 4,
    verdict: "v", is_disguised_llm: false, payload: fakePayload,
  });
  const h = getHistory(db, pid);
  expect(h.map((x) => x.ts)).toEqual([5, 10]);
});
