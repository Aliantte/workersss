import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { getSetting, setSetting, getNumberSetting } from "@/lib/settings";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_LABEL, type Report } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

// --- Guardrails ---
// Every number below is a hard limit. The adjustments computed in this route
// are deterministic (plain arithmetic on real data) — Claude never decides a
// number, it only narrates what already happened. Nothing here can exceed
// these bounds regardless of how the data looks.
const CATEGORY_WEIGHT_MIN = 0.4;
const CATEGORY_WEIGHT_MAX = 2.5;
const CATEGORY_NUDGE = 0.3; // max change per day, per category
const CATEGORY_MIN_SAMPLE = 3; // don't adjust a category on fewer than 3 decisions

const RENDER_CAP_MIN = 1;
const RENDER_CAP_MAX = 8;

const FAILURE_RATE_HIGH = 0.2; // above this, pull back
const METRIC_MIN_SAMPLE = 3; // don't react to fewer than 3 runs

async function adjustCategoryWeights(): Promise<string[]> {
  const notes: string[] = [];

  const { rows } = await sql<{ category: string; status: string; count: string }>`
    SELECT category, status, COUNT(*) as count FROM ideas
    WHERE status IN ('approved', 'archived')
    GROUP BY category, status`;

  const stats: Record<string, { approved: number; archived: number }> = {};
  for (const row of rows) {
    stats[row.category] ??= { approved: 0, archived: 0 };
    if (row.status === "approved") stats[row.category].approved = Number(row.count);
    else stats[row.category].archived = Number(row.count);
  }

  const raw = await getSetting("category_weights");
  const weights: Record<string, number> = raw ? JSON.parse(raw) : {};

  for (const category of CATEGORIES) {
    const s = stats[category];
    if (!s) continue;
    const total = s.approved + s.archived;
    if (total < CATEGORY_MIN_SAMPLE) continue;

    const approvalRate = s.approved / total;
    const oldWeight = Math.min(CATEGORY_WEIGHT_MAX, Math.max(CATEGORY_WEIGHT_MIN, weights[category] ?? 1));
    const nudge = (approvalRate - 0.5) * CATEGORY_NUDGE * 2; // scaled so a 100%/0% rate hits the full nudge
    const newWeight = Math.round(Math.min(CATEGORY_WEIGHT_MAX, Math.max(CATEGORY_WEIGHT_MIN, oldWeight + nudge)) * 100) / 100;

    if (newWeight !== oldWeight) {
      weights[category] = newWeight;
      notes.push(
        `${CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}: weight ${oldWeight.toFixed(2)} -> ${newWeight.toFixed(2)} (${Math.round(approvalRate * 100)}% approval on ${total} decisions)`
      );
    }
  }

  if (notes.length > 0) {
    await setSetting("category_weights", JSON.stringify(weights), notes.join("; "));
  }

  return notes;
}

async function adjustImageSettings(): Promise<string[]> {
  const notes: string[] = [];

  const targets: [string, string, [number, number]][] = [
    ["Pin Laden", "studio_render_cap", [RENDER_CAP_MIN, RENDER_CAP_MAX]],
    ["Designer", "designer_post_cap", [1, 6]],
  ];

  for (const [employee, capKey, capBounds] of targets) {
    const { rows } = await sql<{ rendered: string; failed: string }>`
      SELECT COALESCE(SUM(rendered),0) as rendered, COALESCE(SUM(failed),0) as failed
      FROM (SELECT rendered, failed FROM run_metrics WHERE employee = ${employee} ORDER BY created_at DESC LIMIT 5) recent`;

    const rendered = Number(rows[0]?.rendered ?? 0);
    const failed = Number(rows[0]?.failed ?? 0);
    const totalRuns = rendered + failed;
    if (totalRuns < METRIC_MIN_SAMPLE) continue;

    const failureRate = failed / totalRuns;
    const currentCap = await getNumberSetting(capKey, capBounds[0], capBounds[0], capBounds[1]);

    if (failureRate > FAILURE_RATE_HIGH && currentCap > capBounds[0]) {
      const newCap = currentCap - 1;
      await setSetting(capKey, String(newCap), `failure rate ${Math.round(failureRate * 100)}% over last ${totalRuns} images/posts — pulled cap back`);
      notes.push(`${employee}: render cap ${currentCap} -> ${newCap} (${Math.round(failureRate * 100)}% failure rate)`);
    } else if (failureRate === 0 && currentCap < capBounds[1]) {
      const newCap = currentCap + 1;
      await setSetting(capKey, String(newCap), `clean run streak (${totalRuns} in a row, 0 failures) — nudged cap up`);
      notes.push(`${employee}: render cap ${currentCap} -> ${newCap} (clean streak, ${totalRuns} in a row)`);
    }
  }

  return notes;
}

const SYSTEM_PROMPT = `You write a short roundtable-style discussion transcript for a small
automated content operation with two business lines: an Etsy digital-products shop (Aliantte,
Pin Laden, Ally Al, Boxley the Packager) and a social content factory (Aj, Al Jr., Katastrophik).
Alvin supervises both. You're given their real recent activity logs, plus a list of concrete
setting adjustments that already happened automatically based on real data — reference those
adjustments accurately in the discussion, don't invent different numbers. Write it like a genuine
team check-in: what's working, what's been a struggle, any friction between roles. Keep it grounded
and specific, not generic corporate-speak. Then separately give concrete suggestions for the human
owner ("Big Al") — things only a human could decide (a resource to add, a bigger strategic call),
not settings that already auto-adjusted. Respond with ONLY valid JSON, no prose, no markdown fences.`;

function buildPrompt(reports: Report[], adjustments: string[]): string {
  const log = reports.map((r) => `[${r.employee}] ${r.summary}`).join("\n");
  const adjustmentBlock =
    adjustments.length > 0
      ? `\n\nSettings that auto-adjusted this cycle:\n${adjustments.map((a) => `- ${a}`).join("\n")}`
      : "\n\nNo settings adjusted this cycle (not enough data yet, or everything's already dialed in).";

  return `Recent activity log (most recent cycles across both business lines):\n${log || "(no activity logged yet)"}${adjustmentBlock}\n\nRespond with JSON: {"discussion": "the roundtable transcript, 150-250 words, can use dialogue-style lines per speaker", "suggestions": "2-4 concrete suggestions for the human owner, as a short bulleted-style list within the string"}`;
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
    const categoryNotes = await adjustCategoryWeights();
    const imageNotes = await adjustImageSettings();
    const adjustments = [...categoryNotes, ...imageNotes];

    const { rows: reports } = await sql<Report>`
      SELECT * FROM reports WHERE created_at > now() - interval '24 hours' ORDER BY created_at ASC`;

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(reports, adjustments) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const meeting: { discussion: string; suggestions: string } = JSON.parse(
      raw.replace(/```json|```/g, "").trim()
    );

    const adjustmentsText = adjustments.length > 0 ? adjustments.join("\n") : "No adjustments this cycle.";

    await sql`INSERT INTO team_meetings (discussion, suggestions, adjustments) VALUES (${meeting.discussion}, ${meeting.suggestions}, ${adjustmentsText})`;

    await logReport(
      "Boardroom",
      `Team meeting held, ${reports.length} activity entries reviewed, ${adjustments.length} setting${adjustments.length === 1 ? "" : "s"} adjusted`
    );

    return NextResponse.json({ ok: true, reportsReviewed: reports.length, adjustments });
  } catch (err) {
    console.error("meeting cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
