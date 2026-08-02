import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import type { IdeaWithBundle } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql<IdeaWithBundle>`
      SELECT i.*, a.url AS design_url, lc.title, lc.tags, lc.description
      FROM ideas i
      LEFT JOIN assets a ON a.idea_id = i.id AND a.type = 'design'
      LEFT JOIN listing_copy lc ON lc.idea_id = i.id
      WHERE i.status = 'approved'
      ORDER BY i.created_at DESC`;
    return NextResponse.json({ items: rows });
  } catch (err) {
    return NextResponse.json({ items: [], error: String(err) }, { status: 200 });
  }
}
