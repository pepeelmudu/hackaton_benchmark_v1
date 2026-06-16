"use client";

import type { LeaderboardRow } from "@/lib/types";
import { WEIGHTS } from "@/lib/rubric";
import { RadarScores } from "./RadarScores";
import { gauge, scoreColor } from "./format";
import { useLang, DIM_KEYS, loc } from "./i18n";

export function ProjectCard({ row }: { row: LeaderboardRow }) {
  const { t, lang } = useLang();
  const r = row.payload;
  if (!r) {
    return (
      <div className="panel p-4 text-[var(--muted)]">
        {t.noValid} <span className="text-[var(--phosphor)]">{row.name}</span>.
        {row.error && <div className="glow-danger mt-2">✗ {row.error}</div>}
      </div>
    );
  }

  const dimKeys = DIM_KEYS;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="text-[var(--phosphor-bright)] glow truncate">
          ┌─ DOSSIER: {row.owner}/{row.name}
        </div>
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--muted)] underline hover:text-[var(--phosphor)]"
        >
          repo ↗
        </a>
      </div>

      <div
        className="mb-3 text-sm"
        style={{ color: r.is_disguised_llm ? "var(--danger)" : "var(--amber)" }}
      >
        {(r.is_disguised_llm ? "⚠ " : "» ") + t.verdict + ": "}
        <span className="glow">{loc(r.verdict, lang)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="border border-[var(--grid)] p-2">
          <RadarScores result={r} />
        </div>

        <div className="space-y-2">
          {dimKeys.map((k) => {
            const d = r.dimensions[k];
            const color = scoreColor(d.score);
            return (
              <div key={k} className="border-b border-[var(--grid)] pb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--phosphor-bright)]">
                    {t.dimsFull[k]}
                    <span className="text-[var(--muted)]">
                      {" "}
                      ·{Math.round(WEIGHTS[k] * 100)}%
                    </span>
                  </span>
                  <span style={{ color, textShadow: `0 0 5px ${color}` }}>
                    {d.score}/10
                  </span>
                </div>
                <div
                  className="whitespace-pre text-xs tracking-tighter"
                  style={{ color }}
                >
                  [{gauge(d.score)}]
                </div>
                <div className="mt-1 text-xs leading-relaxed text-[var(--phosphor)] opacity-80">
                  {loc(d.justification, lang)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-[var(--phosphor-dim)]">
            ++ {t.highlights}
          </div>
          <ul className="space-y-1 text-sm">
            {r.highlights.length === 0 && <li className="text-[var(--muted)]">—</li>}
            {r.highlights.map((h, i) => (
              <li key={i} className="text-[var(--phosphor)]">
                <span className="text-[var(--phosphor-bright)]">+</span> {loc(h, lang)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-[var(--danger)]">
            !! {t.redFlags}
          </div>
          <ul className="space-y-1 text-sm">
            {r.red_flags.length === 0 && <li className="text-[var(--muted)]">—</li>}
            {r.red_flags.map((f, i) => (
              <li key={i} className="glow-danger">
                <span>-</span> {loc(f, lang)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 text-xs text-[var(--muted)]">
        └─ {t.commit} {row.commit_sha ? row.commit_sha.slice(0, 7) : "—"}
      </div>
    </div>
  );
}
