"use client";

import { useState } from "react";
import { useLang } from "./i18n";

export function ReanalyzeButton({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    const pass = window.prompt(t.passPrompt);
    if (pass === null) return; // cancelado
    setState("running");
    setMsg("");
    try {
      const res = await fetch("/api/reanalyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pass }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setState("error");
        setMsg(t.wrongPass);
        return;
      }
      if (!data.started) {
        setState("error");
        setMsg(data.reason ?? t.cantStart);
        return;
      }
      // El análisis corre en background; refrescamos varias veces.
      setMsg(t.started);
      const ticks = [5000, 15000, 30000, 45000];
      ticks.forEach((ms) => setTimeout(onDone, ms));
      setTimeout(() => setState("idle"), 45000);
    } catch {
      setState("error");
      setMsg(t.netError);
    }
  }

  return (
    <button
      onClick={run}
      disabled={state === "running"}
      className="border border-[var(--phosphor-dim)] px-4 py-2 text-[var(--phosphor-bright)] transition-all hover:bg-[rgba(51,255,102,0.12)] hover:shadow-[0_0_14px_rgba(51,255,102,0.3)] disabled:opacity-50"
    >
      {state === "running" ? (
        <span className="cursor">{t.reanalyzing}</span>
      ) : (
        t.reanalyze
      )}
      {msg && <span className="ml-2 text-xs text-[var(--muted)]">{msg}</span>}
    </button>
  );
}
