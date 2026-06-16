"use client";

import { useState } from "react";
import { useLang, DIM_KEYS } from "./i18n";
import { WEIGHTS } from "@/lib/rubric";

export function CriteriaButton() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const c = t.criteria;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border border-[var(--phosphor-dim)] px-4 py-2 text-[var(--phosphor-bright)] transition-all hover:bg-[rgba(51,255,102,0.12)] hover:shadow-[0_0_14px_rgba(51,255,102,0.3)]"
      >
        ? {c.button}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="panel w-full max-w-2xl p-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-[var(--phosphor-dim)] pb-2">
              <span className="text-[var(--phosphor-bright)] glow">
                ┌─ {c.title}
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label={c.close}
                className="border border-[var(--phosphor-dim)] px-2 text-[var(--phosphor)] hover:bg-[rgba(51,255,102,0.12)]"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-[var(--phosphor)] opacity-90">
              {c.intro}
            </p>

            <div className="mb-4 space-y-3">
              {DIM_KEYS.map((k) => (
                <div key={k} className="border-l-2 border-[var(--phosphor-dim)] pl-3">
                  <div className="text-sm text-[var(--phosphor-bright)]">
                    {t.dimsFull[k]}
                    <span className="text-[var(--amber)]"> · {Math.round(WEIGHTS[k] * 100)}%</span>
                  </div>
                  <div className="text-xs leading-relaxed text-[var(--phosphor)] opacity-80">
                    {c.dims[k]}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-3 border-t border-[var(--grid)] pt-3 text-xs leading-relaxed text-[var(--phosphor)] opacity-90">
              <span className="text-[var(--phosphor-bright)]">» </span>
              {c.scoring}
            </div>
            <div className="text-xs leading-relaxed text-[var(--amber)] opacity-90">
              <span className="glow-amber">⚠ </span>
              {c.integrity}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
