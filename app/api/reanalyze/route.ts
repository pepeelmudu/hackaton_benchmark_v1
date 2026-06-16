import { NextResponse } from "next/server";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let lastRun = 0;

export async function POST() {
  // Anti-spam simple: como mucho una vez cada 30s.
  const now = Date.now();
  if (now - lastRun < 30_000) {
    return NextResponse.json(
      { started: false, reason: "Espera unos segundos entre re-análisis." },
      { status: 429 },
    );
  }
  lastRun = now;

  const child = spawn("npm", ["run", "analyze", "--", "--force"], {
    detached: true,
    stdio: "ignore",
    cwd: process.cwd(),
  });
  child.unref();

  return NextResponse.json({ started: true });
}
