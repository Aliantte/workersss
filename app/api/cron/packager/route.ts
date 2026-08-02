import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import type { Idea } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 30;

// Mockup generation (design-on-a-mug, art-on-a-wall) is deferred for now — see the
// project README. This stage still does real work: it verifies both a design asset
// and listing copy actually exist before letting an idea into the human review queue,
// and is the spot to slot in mockup rendering later without touching other stages.

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const { rows: candidates } = await sql<Idea>`
    SELECT * FROM ideas WHERE status = 'ready-to-package' LIMIT 10`;

  let packaged = 0;
  let heldBack = 0;

  for (const idea of candidates) {
    const { rows: assetRows } = await sql`SELECT 1 FROM assets WHERE idea_id = ${idea.id} AND type = 'design'`;
    const { rows: copyRows } = await sql`SELECT 1 FROM listing_copy WHERE idea_id = ${idea.id}`;

    if (assetRows.length > 0 && copyRows.length > 0) {
      await sql`UPDATE ideas SET status = 'pending-review' WHERE id = ${idea.id}`;
      packaged++;
    } else {
      heldBack++;
    }
  }

  await logReport(
    "Packager",
    `${packaged} items bundled for review${heldBack > 0 ? `, ${heldBack} held back (missing asset or copy)` : ""}`
  );

  return NextResponse.json({ ok: true, packaged, heldBack });
}
