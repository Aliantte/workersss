import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import type { TeamMeeting } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql<TeamMeeting>`
      SELECT * FROM team_meetings ORDER BY created_at DESC LIMIT 20`;
    const settings = await getAllSettings();
    return NextResponse.json({ meetings: rows, settings });
  } catch (err) {
    return NextResponse.json({ meetings: [], settings: [], error: String(err) }, { status: 200 });
  }
}
