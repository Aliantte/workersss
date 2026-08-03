import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import type { Report } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You write a short roundtable-style discussion transcript for a small
automated content operation with two business lines: an Etsy digital-products shop (Aliantte,
Pin Laden, Ally Al, Boxley the Packager) and a social content factory (Scout, Designer,
Copywriter). Alvin supervises both. You're given their real recent activity logs — ground the
discussion in what actually happened, don't invent numbers. Write it like a genuine team check-in:
what's working, what's been a struggle, any friction between roles. Keep it grounded and specific,
not generic corporate-speak. Then separately give concrete, actionable suggestions for the human
owner (referred to as "Big Al" or "the boss") — things they could actually do to help (a setting to
change, a resource to add, a decision to make) based on real patterns in the data, not filler
advice. Respond with ONLY valid JSON, no prose, no markdown fences.`;

function buildPrompt(reports: Report[]): string {
  const log = reports
    .map((r) => `[${r.employee}] ${r.summary}`)
    .join("\n");
  return `Recent activity log (most recent cycles across both business lines):\n${log || "(no activity logged yet)"}\n\nRespond with JSON: {"discussion": "the roundtable transcript, 150-250 words, can use dialogue-style lines per speaker", "suggestions": "2-4 concrete suggestions for the human owner, as a short bulleted-style list within the string"}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  await ensureSchema();
  const anthropic = new Anthropic({ apiKey });

  try {
    const { rows: reports } = await sql<Report>`
      SELECT * FROM reports WHERE created_at > now() - interval '24 hours' ORDER BY created_at ASC`;

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(reports) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const meeting: { discussion: string; suggestions: string } = JSON.parse(
      raw.replace(/```json|```/g, "").trim()
    );

    await sql`INSERT INTO team_meetings (discussion, suggestions) VALUES (${meeting.discussion}, ${meeting.suggestions})`;

    await logReport("Boardroom", `Team meeting held, ${reports.length} recent activity entries reviewed`);

    return NextResponse.json({ ok: true, reportsReviewed: reports.length });
  } catch (err) {
    console.error("meeting cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
