import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { ideaId, reason, kind } = await req.json();
  if (!ideaId) {
    return NextResponse.json({ error: "Missing ideaId" }, { status: 400 });
  }
  if (kind === "social") {
    await sql`UPDATE posts SET status = 'archived', reject_reason = ${reason || null} WHERE id = ${ideaId}`;
  } else {
    await sql`UPDATE ideas SET status = 'archived', reject_reason = ${reason || null} WHERE id = ${ideaId}`;
  }
  return NextResponse.json({ ok: true });
}
