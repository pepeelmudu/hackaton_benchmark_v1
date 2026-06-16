"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardRow } from "@/lib/types";
import { Leaderboard } from "./components/Leaderboard";
import { ProjectCard } from "./components/ProjectCard";
import { EvolutionChart, type Series } from "./components/EvolutionChart";
import { ReanalyzeButton } from "./components/ReanalyzeButton";
import { fmtTime } from "./components/format";

export default function Home() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    const data = await res.json();
    const projects: LeaderboardRow[] = data.projects ?? [];
    setRows(projects);
    setLastUpdate(Math.max(0, ...projects.map((p) => p.ts || 0)));
    setSelectedId((cur) => cur ?? projects[0]?.id ?? null);

    // Histórico por proyecto para la gráfica de evolución.
    const hist = await Promise.all(
      projects.map(async (p) => {
        const r = await fetch(`/api/history/${p.id}`, { cache: "no-store" });
        const d = await r.json();
        return { name: p.name, points: d.history ?? [] } as Series;
      }),
    );
    setSeries(hist.filter((s) => s.points.length > 0));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      {/* Header tipo terminal */}
      <header className="mb-6 border-b border-[var(--phosphor-dim)] pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-5xl md:text-6xl text-[var(--phosphor-bright)]">
              <span className="cursor">&gt; AGENTIC_BENCHMARK</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              ¿Agente de verdad o LLM disfrazado? · evaluación 0–10 · hackathon
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <div>
              PROYECTOS: <span className="text-[var(--phosphor)]">{rows.length}</span>
            </div>
            <div>
              ÚLT. ACTUALIZACIÓN:{" "}
              <span className="text-[var(--phosphor)]">{fmtTime(lastUpdate)}</span>
            </div>
            <div className="mt-2">
              <ReanalyzeButton onDone={load} />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <Leaderboard rows={rows} selectedId={selectedId} onSelect={setSelectedId} />

        {selected && <ProjectCard row={selected} />}

        <EvolutionChart series={series} />
      </div>

      <footer className="mt-8 border-t border-[var(--grid)] pt-3 text-center text-xs text-[var(--muted)]">
        elevenyellow · agentic-benchmark · análisis estático con Claude
      </footer>
    </main>
  );
}
