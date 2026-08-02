import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import type { Idea, Report, MeetingNotes } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();

    const [{ rows: newIdeas }, { rows: readyIdeas }, { rows: packageIdeas }, { rows: reports }, { rows: notes }, { rows: counts }] =
      await Promise.all([
        sql<Idea>`SELECT * FROM ideas WHERE status = 'new' ORDER BY created_at DESC LIMIT 8`,
        sql<Idea>`SELECT * FROM ideas WHERE status = 'image-ready' ORDER BY created_at DESC LIMIT 8`,
        sql<Idea>`SELECT * FROM ideas WHERE status = 'ready-to-package' ORDER BY created_at DESC LIMIT 8`,
        sql<Report>`SELECT * FROM reports ORDER BY created_at DESC LIMIT 15`,
        sql<MeetingNotes>`SELECT * FROM meeting_notes ORDER BY created_at DESC LIMIT 1`,
        sql`SELECT status, COUNT(*) FROM ideas GROUP BY status`,
      ]);

    const countMap: Record<string, number> = {};
    for (const row of counts as { status: string; count: string }[]) {
      countMap[row.status] = Number(row.count);
    }

    return NextResponse.json({
      queues: { studio: newIdeas, editor: readyIdeas, packager: packageIdeas },
      reports,
      latestMeetingNotes: notes[0] ?? null,
      counts: countMap,
    });
  } catch (err) {
    return NextResponse.json(
      { queues: { studio: [], editor: [], packager: [] }, reports: [], latestMeetingNotes: null, counts: {}, error: String(err) },
      { status: 200 }
    );
  }
}
