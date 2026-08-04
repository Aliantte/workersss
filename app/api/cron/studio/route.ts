import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { getNumberSetting } from "@/lib/settings";
import { CATEGORY_LABEL, type Idea } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 280;

// Defaults if Boardroom hasn't adjusted anything yet. Hard bounds enforced in
// getNumberSetting() below — Boardroom can nudge these, but never past 1-8
// for the cap or 768-2048 for resolution, regardless of what it decides.
const DEFAULT_RENDER_CAP = 4;
const DEFAULT_RESOLUTION = 1536;

const MEETING_CAP = 4;

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

const QUALITY_SUFFIX =
  "Professional, polished illustration quality — avoid the generic over-smoothed, mushy-detail look common in AI art, avoid warped or nonsensical small details, coherent clean composition.";

function buildImagePrompt(idea: Idea): string {
  const label = CATEGORY_LABEL[idea.category];

  if (idea.category === "coloring_page") {
    return `${label}: ${idea.concept}. Black and white line art ONLY — no color, no shading, no greyscale fill. Bold, clean, evenly-weighted outlines suitable for printing and coloring in. Anime/manga style, Western cartoon style, or nature/botanical subject — whichever the concept calls for. High resolution, crisp lines, white background, no text or watermark. ${QUALITY_SUFFIX}`;
  }

  if (idea.category === "game_asset_pack") {
    return `${label}: ${idea.concept}. Clean 2D game asset — pixel art or flat vector game-UI style, whichever the concept calls for. Isolated subject on a plain or transparent-friendly background, crisp readable edges at small sizes, game-ready, no photorealism, no text or watermark. ${QUALITY_SUFFIX}`;
  }

  if (idea.category === "mug_tumbler_wrap") {
    return `${label}: ${idea.concept}. Compose this as if it's a cropped detail from a much larger continuous scene or seamless repeating pattern — NOT a self-contained framed picture with one centered subject and clear composed edges. The image should feel like it keeps going beyond all four sides, like a snapshot cut from something bigger, not a poster or portrait with a beginning and end. Fills the ENTIRE frame edge-to-edge, zero border, zero white space, zero margin. Flat artwork only — do not depict a cup, mug, tumbler, or any product. Anime/manga art style or Western cartoon style or nature and botanical illustration — whichever the concept calls for. Ultra high resolution, extremely detailed, vibrant professional color, no text or watermark. ${QUALITY_SUFFIX}`;
  }

  return `${label}: ${idea.concept}. Anime/manga art style or Western cartoon style or nature and botanical illustration — whichever the concept calls for. Ultra high resolution, extremely detailed, sharp clean linework, vibrant professional color, commercial print-ready quality, no text or watermark. ${QUALITY_SUFFIX}`;
}

// A tumbler wrap for a 20oz cup has a real, fixed print spec — 8.5in x 9in —
// not a square. Height is the longer edge; width is scaled to match that
// real-world ratio so the design actually fits the product, not just looks
// nice as a flat square.
function dimensionsFor(category: string, resolution: number): { width: number; height: number } {
  if (category === "mug_tumbler_wrap") {
    const height = resolution;
    const width = Math.round(resolution * (8.5 / 9));
    return { width, height };
  }
  return { width: resolution, height: resolution };
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

  const renderCap = await getNumberSetting("studio_render_cap", DEFAULT_RENDER_CAP, 1, 8);
  const resolution = await getNumberSetting("studio_resolution", DEFAULT_RESOLUTION, 768, 2048);

  try {
    // --- Phase 1: run the sync meeting for EVERY batch still waiting on one ---
    const { rows: pendingBatches } = await sql<{ batch_id: string }>`
      SELECT DISTINCT i.batch_id FROM ideas i
      WHERE i.status = 'new'
        AND NOT EXISTS (SELECT 1 FROM meeting_notes m WHERE m.batch_id = i.batch_id)
      ORDER BY i.batch_id ASC`;

    let meetingsRun = 0;
    let flaggedTotal = 0;

    for (const { batch_id } of pendingBatches.slice(0, MEETING_CAP)) {
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
    const { rows: renderCandidates } = await sql<Idea>`
      SELECT i.* FROM ideas i
      JOIN meeting_notes m ON m.batch_id = i.batch_id
      WHERE i.status = 'new'
      ORDER BY i.created_at ASC
      LIMIT ${renderCap}`;

    let rendered = 0;
    let failed = 0;
    const token = process.env.POLLINATIONS_TOKEN;

    for (const idea of renderCandidates) {
      try {
        const prompt = buildImagePrompt(idea);
        const { width, height } = dimensionsFor(idea.category, resolution);
        const seed = Math.floor(Math.random() * 1_000_000);
        const params = new URLSearchParams({
          width: String(width),
          height: String(height),
          model: "flux",
          enhance: "true",
          seed: String(seed),
          nologo: "true",
          ...(token ? { token } : {}),
        });
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

        const res = await fetch(imageUrl);
        if (!res.ok) {
          failed++;
          continue;
        }
        const bytes = await res.arrayBuffer();

        const blob = await put(`designs/idea-${idea.id}.png`, Buffer.from(bytes), {
          access: "public",
          contentType: "image/png",
        });

        await sql`INSERT INTO assets (idea_id, type, url) VALUES (${idea.id}, 'design', ${blob.url})`;
        await sql`UPDATE ideas SET status = 'image-ready' WHERE id = ${idea.id}`;
        rendered++;
      } catch (err) {
        console.error(`studio failed on idea ${idea.id}`, err);
        failed++;
      }
    }

    await sql`INSERT INTO run_metrics (employee, rendered, failed) VALUES ('Pin Laden', ${rendered}, ${failed})`;

    await logReport(
      "Pin Laden",
      `${rendered} designs rendered${failed > 0 ? `, ${failed} failed` : ""}, ${meetingsRun} batch sync${meetingsRun === 1 ? "" : "s"} run (${flaggedTotal} flagged)`
    );

    return NextResponse.json({ ok: true, meetingsRun, rendered, failed, flaggedTotal, renderCap, resolution });
  } catch (err) {
    console.error("studio cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
