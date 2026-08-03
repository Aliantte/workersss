import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { pickNiche, pickStyle, NICHE_LABEL } from "@/lib/socialCategories";
import { getTrendingClips } from "@/lib/twitch";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Aj, the content researcher for a social media content factory that
produces graphics + captions for Instagram and TikTok. You come up with specific, scroll-stopping
post ideas within one niche at a time — never generic topics. Each idea needs a clear visual hook
(what the graphic actually shows) and works as a single post, not a series. Avoid anything
trademarked, celebrity-based, or requiring licensed IP. Respond with ONLY valid JSON, no prose, no
markdown fences.`;

function buildPrompt(nicheLabel: string): string {
  return `Generate 5 new social post ideas, all within the "${nicheLabel}" niche.
For each, give "hook": a short, specific description of the post's core idea/visual (10-20 words) —
specific enough that a designer could render it and a copywriter could caption it.

Return as a JSON array of exactly 5 objects with key: hook.`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const niche = pickNiche();
  const batchId = `post_batch_${Date.now()}`;

  // --- Twitch clip roundup: real data, no LLM ideation for this branch ---
  if (niche === "twitch_clip_roundup") {
    try {
      const clips = await getTrendingClips(5);
      if (!clips || clips.length === 0) {
        await logReport("Scout", "Twitch clip roundup skipped — no trending clips found (or Twitch keys not configured)");
        return NextResponse.json({ ok: true, batchId, niche, count: 0, note: "no clips or not configured" });
      }

      for (const clip of clips) {
        const hook = `${clip.broadcasterName}: "${clip.title}" (${clip.gameName}, ${clip.viewCount.toLocaleString()} views)`;
        await sql`INSERT INTO posts (batch_id, niche, hook, style, status, source_url, thumbnail_url, source_credit)
                  VALUES (${batchId}, ${niche}, ${hook}, 'real clip thumbnail', 'new', ${clip.clipUrl}, ${clip.thumbnailUrl}, ${clip.broadcasterName})`;
      }

      await logReport("Scout", `${clips.length} trending Twitch clips found, batch ${batchId}`);
      return NextResponse.json({ ok: true, batchId, niche, count: clips.length });
    } catch (err) {
      console.error("scout twitch branch failed", err);
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  // --- Everything else: original AI-ideation path ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey });

  try {
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(NICHE_LABEL[niche]) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const hooks: { hook: string }[] = JSON.parse(cleaned);

    for (const h of hooks) {
      const style = pickStyle();
      await sql`INSERT INTO posts (batch_id, niche, hook, style, status)
                VALUES (${batchId}, ${niche}, ${h.hook}, ${style}, 'new')`;
    }

    await logReport("Scout", `${hooks.length} post ideas generated (${NICHE_LABEL[niche]}), batch ${batchId}`);

    return NextResponse.json({ ok: true, batchId, niche, count: hooks.length });
  } catch (err) {
    console.error("scout cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
