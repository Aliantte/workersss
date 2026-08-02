import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export const maxDuration = 30;

// Alvin's summary is a straight count of what happened this cycle, not another LLM
// call — the numbers themselves are the report, no need to pay for a model to
// paraphrase them.

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const [{ rows: ideaRows }, { rows: flaggedRows }, { rows: assetRows }, { rows: copyRows }, { rows: pendingRows }] =
    await Promise.all([
      sql`SELECT COUNT(*) FROM ideas WHERE created_at > now() - interval '25 minutes'`,
      sql`SELECT COUNT(*) FROM ideas WHERE status = 'flagged-skip' AND created_at > now() - interval '25 minutes'`,
      sql`SELECT COUNT(*) FROM assets WHERE type = 'design' AND created_at > now() - interval '25 minutes'`,
      sql`SELECT COUNT(*) FROM listing_copy WHERE created_at > now() - interval '25 minutes'`,
      sql`SELECT COUNT(*) FROM ideas WHERE status = 'pending-review' AND created_at > now() - interval '25 minutes'`,
    ]);

  const ideas = Number(ideaRows[0]?.count ?? 0);
  const flagged = Number(flaggedRows[0]?.count ?? 0);
  const designs = Number(assetRows[0]?.count ?? 0);
  const listings = Number(copyRows[0]?.count ?? 0);
  const pending = Number(pendingRows[0]?.count ?? 0);

  const summary = `Cycle wrap: ${ideas} ideas (${flagged} flagged), ${designs} designs, ${listings} listings, ${pending} ready for review`;

  await logReport("Alvin", summary);

  return NextResponse.json({ ok: true, summary });
}
