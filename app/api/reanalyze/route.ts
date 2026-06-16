import { NextResponse } from "next/server";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let lastRun = 0;

const REANALYZE_PASS = process.env.REANALYZE_PASS || "666";

export async function POST(req: Request) {
  // Contraseña requerida para re-analizar.
  let pass = "";
  try {
    pass = (await req.json())?.pass ?? "";
  } catch {
    pass = "";
  }
  if (String(pass) !== REANALYZE_PASS) {
    return NextResponse.json(
      { started: false, reason: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

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
