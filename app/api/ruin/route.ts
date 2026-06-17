import { NextResponse } from "next/server";
import { openDb, getRuinLeaderboard } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = openDb();
  try {
    return NextResponse.json({ projects: getRuinLeaderboard(db) });
  } finally {
    db.close();
  }
}
