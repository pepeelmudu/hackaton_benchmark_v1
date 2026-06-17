"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LanguageProvider, LangToggle, useLang, loc } from "../components/i18n";
import { RUIN_KEYS, RUIN_LABELS, RUIN_WEIGHTS } from "@/lib/ruin";
import { DoomFire } from "./DoomFire";

interface RuinRow {
  id: number;
  name: string;
  team: string;
  owner: string;
  url: string;
  overall: number;
  error: string | null;
  payload: any | null;
}

export default function RuinPage() {
  return (
    <LanguageProvider>
      <Ruin />
    </LanguageProvider>
  );
}

function flames(score: number): string {
  return "🔥".repeat(Math.max(1, Math.round(score / 2)));
}

function Ruin() {
  const { lang } = useLang();
  const [rows, setRows] = useState<RuinRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ruin", { cache: "no-store" });
    const data = await res.json();
    setRows(data.projects ?? []);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, [load]);

  const scored = rows.filter((r) => !r.error && r.payload);
  const avg = scored.length
    ? Math.round((scored.reduce((a, r) => a + r.overall, 0) / scored.length) * 10) / 10
    : 0;
  const isDemo = scored.some((r) => /demo/i.test(r.payload?.verdict?.en ?? ""));
  const t = lang === "es"
    ? { sub: "¿Quién incinera más tokens y $$$?", back: "← AGENTIC", board: "╠══ INCINERADORES ══╣", idx: "ÍNDICE DE HOGUERA", est: "coste/run", demo: "⚠ DATOS DEMO — ejecuta `npm run ruin` con saldo para los reales", empty: "Sin datos. Ejecuta: npm run ruin" }
    : { sub: "Who incinerates the most tokens and $$$?", back: "← AGENTIC", board: "╠══ BIGGEST BURNERS ══╣", idx: "BONFIRE INDEX", est: "cost/run", demo: "⚠ DEMO DATA — run `npm run ruin` with credits for real values", empty: "No data. Run: npm run ruin" };

  return (
    <main className="ruin ruin-flicker min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header con fuego */}
        <header className="relative mb-6 overflow-hidden border-b border-[var(--fire2)] pb-4">
          <div className="absolute inset-x-0 top-0 -z-0 h-40">
            <DoomFire />
          </div>
          <div className="relative z-10 flex items-start justify-between gap-3 pt-6">
            <div>
              <h1
                className="glitch display text-5xl md:text-7xl"
                data-text="RUIN_BENCHMARK $$$"
              >
                RUIN_BENCHMARK $$$
              </h1>
              <p className="mt-1 text-sm text-[var(--fire3)] opacity-80">{t.sub}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LangToggle />
              <Link
                href="/"
                className="border border-[var(--fire2)] px-3 py-1 text-xs text-[var(--fire3)] transition-colors hover:bg-[rgba(255,90,0,0.15)]"
              >
                {t.back}
              </Link>
            </div>
          </div>
        </header>

        {isDemo && (
          <div className="mb-4 border border-[var(--fire1)] bg-[rgba(255,46,0,0.08)] px-4 py-2 text-sm text-[var(--fire4)]">
            {t.demo}
          </div>
        )}

        {/* Índice de hoguera */}
        <div className="mb-6 flex items-end gap-4 border border-[var(--fire2)] bg-black/40 p-4">
          <div className="text-xs uppercase tracking-widest text-[var(--ash)]">{t.idx}</div>
          <div className="glitch display text-5xl" data-text={avg.toFixed(1)} style={{ color: "var(--fire4)" }}>
            {avg.toFixed(1)}
          </div>
          <div className="pb-1 text-2xl">{flames(avg)}</div>
        </div>

        {/* Ranking */}
        <div className="border border-[var(--fire2)] bg-black/40">
          <div className="border-b border-[var(--fire2)] px-4 py-2 text-[var(--fire4)]">
            {t.board}
          </div>
          {scored.length === 0 && (
            <div className="px-4 py-10 text-center text-[var(--ash)]">{t.empty}</div>
          )}
          {scored.map((r, i) => {
            const open = r.id === openId;
            const p = r.payload;
            return (
              <div key={r.id} className="border-t border-[rgba(255,120,0,0.15)]">
                <div
                  tabIndex={0}
                  onClick={() => setOpenId(open ? null : r.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setOpenId(open ? null : r.id); }}
                  className="grid cursor-pointer grid-cols-[3rem_1fr_42%_4rem] items-center gap-2 px-4 py-3 hover:bg-[rgba(255,90,0,0.08)]"
                >
                  <div className="text-lg">{i === 0 ? "👑" : String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="text-[var(--fire4)]">
                      {open ? "> " : ""}{r.name}
                    </div>
                    <div className="text-xs text-[var(--ash)]">{r.team || "—"}</div>
                  </div>
                  <div>
                    <div className="h-3 w-full bg-[rgba(255,255,255,0.06)]">
                      <div className="flamebar h-3" style={{ width: `${r.overall * 10}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-[var(--fire3)] opacity-80">
                      {loc(p?.estimate, lang)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display text-3xl" style={{ color: "var(--fire4)", textShadow: "0 0 10px rgba(255,90,0,0.6)" }}>
                      {r.overall.toFixed(1)}
                    </div>
                    <div className="text-xs leading-none">{flames(r.overall)}</div>
                  </div>
                </div>

                {open && p && (
                  <div className="border-t border-[rgba(255,120,0,0.15)] bg-black/50 px-4 py-3">
                    <div className="mb-3 text-sm text-[var(--fire3)]">
                      <span className="text-[var(--fire1)]">🔥 </span>{loc(p.verdict, lang)}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {RUIN_KEYS.map((k) => {
                        const d = p.dimensions?.[k];
                        if (!d) return null;
                        return (
                          <div key={k} className="border-l-2 border-[var(--fire2)] pl-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-[var(--fire4)]">
                                {RUIN_LABELS[k][lang]}
                                <span className="text-[var(--ash)]"> ·{Math.round(RUIN_WEIGHTS[k] * 100)}%</span>
                              </span>
                              <span className="text-[var(--fire3)]">{d.score}/10</span>
                            </div>
                            <div className="text-xs text-[var(--fire3)] opacity-70">
                              {loc(d.justification, lang)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {p.burners?.length > 0 && (
                      <div className="mt-3 text-xs text-[var(--fire2)]">
                        🔥 {p.burners.map((b: any) => loc(b, lang)).join(" · ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="mt-8 border-t border-[rgba(255,120,0,0.2)] pt-3 text-center text-xs text-[var(--ash)]">
          elevenyellow · ruin-benchmark · estimación estática de coste con Claude
        </footer>
      </div>
    </main>
  );
}
