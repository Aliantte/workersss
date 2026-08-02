import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { CATEGORY_LABEL, type Idea } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 280;

// Cap on how many images get rendered in a single invocation, regardless of
// how many are eligible. Keeps each run comfortably inside maxDuration and
// naturally drains any backlog over multiple cycles instead of risking a
// timeout by trying to clear everything at once.
const RENDER_CAP = 10;

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
  return `${label}: ${idea.concept}. Anime/manga art style or Western cartoon style or nature and botanical illustration — whichever the concept calls for. Ultra high resolution, extremely detailed, sharp clean linework, vibrant professional color, commercial print-ready quality, no text or watermark.`;
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
    // --- Phase 1: run the sync meeting for EVERY batch still waiting on one ---
    // Cheap, fast text-only calls — no reason to let these fall behind, so all
    // pending batches get processed in one run, oldest first.
    const { rows: pendingBatches } = await sql<{ batch_id: string }>`
      SELECT DISTINCT i.batch_id FROM ideas i
      WHERE i.status = 'new'
        AND NOT EXISTS (SELECT 1 FROM meeting_notes m WHERE m.batch_id = i.batch_id)
      ORDER BY i.batch_id ASC`;

    let meetingsRun = 0;
    let flaggedTotal = 0;

    for (const { batch_id } of pendingBatches) {
      const { rows: batchIdeas } = await sql<Idea>`SELECT * FROM ideas WHERE batch_id = ${batch_id} AND status = 'new'`;

      const meetingMsg = await anthropic.messages.create({
        model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: MEETING_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildMeetingPrompt(batchIdeas) }],
      });
      const meetingText = meetingMsg.content.find((b) => b.type === "text");
      const meetingRaw = meetingText && "text" in meetingText ? meetingText.text : "{}";
      const meeting: { notes: string; flag_ids: number[] } = JSON.parse(
        meetingRaw.replace(/```json|```/g, "").trim()
      );

      await sql`INSERT INTO meeting_notes (batch_id, notes) VALUES (${batch_id}, ${meeting.notes})`;

      const flagIds: number[] = meeting.flag_ids || [];
      for (const id of flagIds) {
        await sql`UPDATE ideas SET status = 'flagged-skip' WHERE id = ${id}`;
      }

      meetingsRun++;
      flaggedTotal += flagIds.length;
    }

    // --- Phase 2: render a bounded pool of images across ALL met batches ---
    // Not tied to whichever batch just had its meeting — pulls the oldest
    // eligible ideas across everything waiting, so a backlog drains evenly
    // instead of newer batches jumping the queue.
    const { rows: renderCandidates } = await sql<Idea>`
      SELECT i.* FROM ideas i
      JOIN meeting_notes m ON m.batch_id = i.batch_id
      WHERE i.status = 'new'
      ORDER BY i.created_at ASC
      LIMIT ${RENDER_CAP}`;

    let rendered = 0;
    const token = process.env.POLLINATIONS_TOKEN;

    for (const idea of renderCandidates) {
      const prompt = buildImagePrompt(idea);
      const seed = Math.floor(Math.random() * 1_000_000);
      const params = new URLSearchParams({
        width: "1536",
        height: "1536",
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
      `${rendered} designs rendered, ${meetingsRun} batch sync${meetingsRun === 1 ? "" : "s"} run (${flaggedTotal} flagged)`
    );

    return NextResponse.json({ ok: true, meetingsRun, rendered, flaggedTotal });
  } catch (err) {
    console.error("studio cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
