"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { AnalysisResult } from "@/lib/types";
import { DIMENSION_LABELS } from "@/lib/rubric";

export function RadarScores({ result }: { result: AnalysisResult }) {
  const data = (Object.keys(DIMENSION_LABELS) as (keyof typeof DIMENSION_LABELS)[]).map(
    (k) => ({
      dim: DIMENSION_LABELS[k].split(" ")[0],
      score: result.dimensions[k]?.score ?? 0,
    }),
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#1c8f3f" />
        <PolarAngleAxis
          dataKey="dim"
          tick={{ fill: "#7dffa0", fontSize: 11, fontFamily: "monospace" }}
        />
        <PolarRadiusAxis
          domain={[0, 10]}
          tick={{ fill: "#4a6a4a", fontSize: 9 }}
          stroke="#102510"
        />
        <Radar
          dataKey="score"
          stroke="#33ff66"
          fill="#33ff66"
          fillOpacity={0.35}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
