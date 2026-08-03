import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import type { TeamMeeting } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql<TeamMeeting>`
      SELECT * FROM team_meetings ORDER BY created_at DESC LIMIT 20`;
    return NextResponse.json({ meetings: rows });
  } catch (err) {
    return NextResponse.json({ meetings: [], error: String(err) }, { status: 200 });
  }
}
