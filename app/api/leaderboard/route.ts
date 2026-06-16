import { NextResponse } from "next/server";
import { openDb, getLeaderboard } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = openDb();
  try {
    return NextResponse.json({ projects: getLeaderboard(db) });
  } finally {
    db.close();
  }
}
