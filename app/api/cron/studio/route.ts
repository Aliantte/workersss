import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { CATEGORY_LABEL, type Idea } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 120;

const MEETING_SYSTEM_PROMPT = `You are the joint voice of Aliantte (research), Pin Laden (design),
and the Packager on a small Etsy digital-products team, doing a quick pre-production sync before
design work starts on a new batch of ideas. For each idea, decide if it's actually feasible to
execute well this cycle — flag ones that need a different aspect ratio than usual, are too similar
to a very recent piece, or are too vague to design from. Most ideas should pass. Respond with ONLY
valid JSON, no prose, no markdown fences.`;

function buildMeetingPrompt(ideas: Idea[]): string {
  const list = ideas
    .map((i) => `id ${i.id}: [${CATEGORY_LABEL[i.category]}] ${i.concept} — keywords: ${i.keywords}`)
    .join("\n");
  return `Here's the new batch:\n${list}\n\nRespond with JSON: {"notes": "2-3 sentence summary of the batch and any concerns", "flag_ids": [array of idea ids to skip this cycle, can be empty]}`;
}

function buildImagePrompt(idea: Idea): string {
  const label = CATEGORY_LABEL[idea.category];
  return `${label}: ${idea.concept}. Clean commercial print-ready design, high detail, professional Etsy digital product listing style, no text or watermark.`;
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

  // Find the most recent batch that still has "new" ideas and hasn't been through a meeting yet.
  const { rows: batchRows } = await sql<{ batch_id: string }>`
    SELECT DISTINCT i.batch_id FROM ideas i
    WHERE i.status = 'new'
      AND NOT EXISTS (SELECT 1 FROM meeting_notes m WHERE m.batch_id = i.batch_id)
    ORDER BY i.batch_id DESC LIMIT 1`;

  if (batchRows.length === 0) {
    return NextResponse.json({ ok: true, message: "No new batch waiting on a sync." });
  }

  const batchId = batchRows[0].batch_id;
  const { rows: ideas } = await sql<Idea>`SELECT * FROM ideas WHERE batch_id = ${batchId} AND status = 'new'`;

  try {
    // --- Sync meeting ---
    const meetingMsg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: MEETING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildMeetingPrompt(ideas) }],
    });
    const meetingText = meetingMsg.content.find((b) => b.type === "text");
    const meetingRaw = meetingText && "text" in meetingText ? meetingText.text : "{}";
    const meeting: { notes: string; flag_ids: number[] } = JSON.parse(
      meetingRaw.replace(/```json|```/g, "").trim()
    );

    await sql`INSERT INTO meeting_notes (batch_id, notes) VALUES (${batchId}, ${meeting.notes})`;

    const flagIds = new Set(meeting.flag_ids || []);
    for (const id of flagIds) {
      await sql`UPDATE ideas SET status = 'flagged-skip' WHERE id = ${id}`;
    }

    const feasible = ideas.filter((i) => !flagIds.has(i.id));

    // --- Design generation for whatever survived the sync ---
    let rendered = 0;
    const token = process.env.POLLINATIONS_TOKEN;

    for (const idea of feasible) {
      const prompt = buildImagePrompt(idea);
      const seed = Math.floor(Math.random() * 1_000_000);
      const params = new URLSearchParams({
        width: "1024",
        height: "1024",
        seed: String(seed),
        nologo: "true",
        ...(token ? { token } : {}),
      });
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

      const res = await fetch(imageUrl);
      if (!res.ok) continue;
      const bytes = await res.arrayBuffer();

      const blob = await put(`designs/idea-${idea.id}.png`, Buffer.from(bytes), {
        access: "public",
        contentType: "image/png",
      });

      await sql`INSERT INTO assets (idea_id, type, url) VALUES (${idea.id}, 'design', ${blob.url})`;
      await sql`UPDATE ideas SET status = 'image-ready' WHERE id = ${idea.id}`;
      rendered++;
    }

    await logReport(
      "Pin Laden",
      `${rendered} designs rendered, batch ${batchId} (${flagIds.size} flagged in sync)`
    );

    return NextResponse.json({ ok: true, batchId, rendered, flagged: flagIds.size });
  } catch (err) {
    console.error("studio cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
