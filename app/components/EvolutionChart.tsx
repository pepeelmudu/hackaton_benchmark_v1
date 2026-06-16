"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fmtTime } from "./format";
import { useLang } from "./i18n";

export interface Series {
  name: string;
  points: { ts: number; overall: number }[];
}

// Paleta fósforo/ámbar para diferenciar equipos sin perder el rollo terminal.
const COLORS = ["#33ff66", "#ffb000", "#7dffa0", "#46d0ff", "#ff2e4d", "#c08bff", "#e0ff4f"];

export function EvolutionChart({ series }: { series: Series[] }) {
  const { t } = useLang();
  // Une todos los puntos en un eje temporal común.
  const tsSet = new Set<number>();
  series.forEach((s) => s.points.forEach((p) => tsSet.add(p.ts)));
  const allTs = [...tsSet].sort((a, b) => a - b);

  const data = allTs.map((ts) => {
    const row: Record<string, number | null> = { ts };
    for (const s of series) {
      const pt = s.points.find((p) => p.ts === ts);
      row[s.name] = pt ? pt.overall : null;
    }
    return row;
  });

  const hasData = allTs.length > 0;

  return (
    <div className="panel p-3">
      <div className="mb-2 text-[var(--phosphor-bright)] glow">
        {t.evolutionTitle}
      </div>
      {!hasData ? (
        <div className="py-10 text-center text-[var(--muted)]">
          {t.noHistory}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
            <CartesianGrid stroke="#102510" />
            <XAxis
              dataKey="ts"
              tickFormatter={fmtTime}
              tick={{ fill: "#4a6a4a", fontSize: 11 }}
              stroke="#1c8f3f"
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: "#4a6a4a", fontSize: 11 }}
              stroke="#1c8f3f"
            />
            <Tooltip
              contentStyle={{
                background: "#0a0f0a",
                border: "1px solid #1c8f3f",
                fontFamily: "monospace",
                fontSize: 12,
              }}
              labelFormatter={(ts) => `t = ${fmtTime(Number(ts))}`}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: "monospace" }} />
            {series.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
