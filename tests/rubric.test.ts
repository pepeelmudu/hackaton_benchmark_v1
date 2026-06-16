import { WEIGHTS, computeOverall } from "@/lib/rubric";
import { test, expect } from "vitest";
import type { DimensionKey, DimensionScore } from "@/lib/types";

test("la suma de pesos es 1", () => {
  expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
});

function dimsAll(score: number): Record<DimensionKey, DimensionScore> {
  const keys: DimensionKey[] = [
    "tool_use", "agency_loop", "planning", "memory", "integration", "robustness",
  ];
  return Object.fromEntries(
    keys.map((k) => [k, { score, justification: "" }]),
  ) as Record<DimensionKey, DimensionScore>;
}

test("todo 10 => global 10", () => {
  expect(computeOverall(dimsAll(10))).toBe(10);
});

test("todo 0 => global 0", () => {
  expect(computeOverall(dimsAll(0))).toBe(0);
});

test("ponderación: solo tool_use a 10 => 2.5", () => {
  const dims = dimsAll(0);
  dims.tool_use = { score: 10, justification: "" };
  expect(computeOverall(dims)).toBe(2.5);
});
