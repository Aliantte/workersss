import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { ideaId } = await req.json();
  if (!ideaId) {
    return NextResponse.json({ error: "Missing ideaId" }, { status: 400 });
  }
  await sql`UPDATE ideas SET status = 'approved' WHERE id = ${ideaId}`;
  return NextResponse.json({ ok: true });
}
