import { NextResponse } from "next/server";
import { openDb, getHistory } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const db = openDb();
  try {
    return NextResponse.json({ history: getHistory(db, Number(params.id)) });
  } finally {
    db.close();
  }
}
