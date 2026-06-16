const GAUGE_WIDTH = 18;

/** Barra de gauge ASCII tipo `████████░░░░░░░░░░` para una nota 0-10. */
export function gauge(score: number): string {
  const filled = Math.round((Math.max(0, Math.min(10, score)) / 10) * GAUGE_WIDTH);
  return "█".repeat(filled) + "░".repeat(GAUGE_WIDTH - filled);
}

/** Color (variable CSS) según la nota. */
export function scoreColor(score: number, disguised = false): string {
  if (disguised) return "var(--danger)";
  if (score >= 7.5) return "var(--phosphor)";
  if (score >= 5) return "var(--amber)";
  return "var(--danger)";
}

export function rankBadge(i: number): string {
  return ["🥇", "🥈", "🥉"][i] ?? `0${i + 1}`.slice(-2);
}

export function fmtTime(ts: number): string {
  if (!ts) return "--:--";
  const d = new Date(ts);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
