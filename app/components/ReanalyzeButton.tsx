"use client";

import { useState } from "react";

export function ReanalyzeButton({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("running");
    setMsg("");
    try {
      const res = await fetch("/api/reanalyze", { method: "POST" });
      const data = await res.json();
      if (!data.started) {
        setState("error");
        setMsg(data.reason ?? "No se pudo iniciar.");
        return;
      }
      // El análisis corre en background; refrescamos varias veces.
      setMsg("análisis lanzado…");
      const ticks = [5000, 15000, 30000, 45000];
      ticks.forEach((t) => setTimeout(onDone, t));
      setTimeout(() => setState("idle"), 45000);
    } catch {
      setState("error");
      setMsg("fallo de red");
    }
  }

  return (
    <button
      onClick={run}
      disabled={state === "running"}
      className="border border-[var(--phosphor-dim)] px-4 py-2 text-[var(--phosphor-bright)] transition-all hover:bg-[rgba(51,255,102,0.12)] hover:shadow-[0_0_14px_rgba(51,255,102,0.3)] disabled:opacity-50"
    >
      {state === "running" ? (
        <span className="cursor">RE-ANALIZANDO</span>
      ) : (
        "▶ RE-ANALIZAR AHORA"
      )}
      {msg && <span className="ml-2 text-xs text-[var(--muted)]">{msg}</span>}
    </button>
  );
}
