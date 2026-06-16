"use client";

import type { LeaderboardRow } from "@/lib/types";
import { gauge, scoreColor, rankBadge } from "./format";
import { useLang } from "./i18n";

export function Leaderboard({
  rows,
  selectedId,
  onSelect,
}: {
  rows: LeaderboardRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const { t } = useLang();
  return (
    <div className="panel">
      <div className="border-b border-[var(--phosphor-dim)] px-4 py-2 text-[var(--phosphor-bright)] glow">
        {t.rankingTitle}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-[var(--muted)] text-xs uppercase tracking-wider">
            <th className="px-4 py-2 font-normal">#</th>
            <th className="px-2 py-2 font-normal">{t.colProject}</th>
            <th className="px-2 py-2 font-normal w-[40%]">{t.colScore}</th>
            <th className="px-4 py-2 font-normal text-right">{t.colNota}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isErr = !!r.error;
            const color = scoreColor(r.overall, r.is_disguised_llm);
            const selected = r.id === selectedId;
            return (
              <tr
                key={r.id}
                tabIndex={0}
                onClick={() => onSelect(r.id!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r.id!);
                  }
                }}
                className={`cursor-pointer border-t border-[var(--grid)] transition-colors hover:bg-[rgba(51,255,102,0.06)] ${
                  selected ? "bg-[rgba(51,255,102,0.10)]" : ""
                }`}
              >
                <td className="px-4 py-3 align-top text-lg">{rankBadge(i)}</td>
                <td className="px-2 py-3 align-top">
                  <div className="text-[var(--phosphor-bright)]">
                    {selected ? "> " : ""}
                    {r.name}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{r.team || "—"}</div>
                  {r.is_disguised_llm && (
                    <span className="mt-1 inline-block glow-danger text-xs">
                      {t.disguised}
                    </span>
                  )}
                  {isErr && (
                    <span className="mt-1 inline-block glow-danger text-xs">
                      ✗ ERROR: {r.error}
                    </span>
                  )}
                </td>
                <td className="px-2 py-3 align-top">
                  {!isErr && (
                    <span
                      className="whitespace-pre text-sm tracking-tighter"
                      style={{ color, textShadow: `0 0 6px ${color}` }}
                    >
                      [{gauge(r.overall)}]
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  {isErr ? (
                    <span className="glow-danger">--</span>
                  ) : (
                    <span
                      className="display text-3xl"
                      style={{ color, textShadow: `0 0 8px ${color}` }}
                    >
                      {r.overall.toFixed(1)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                {t.noData} <span className="text-[var(--phosphor)]">npm run analyze</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
