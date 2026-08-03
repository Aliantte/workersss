import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { NICHE_LABEL, type SocialNiche } from "@/lib/socialCategories";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 120;

const PER_RUN_CAP = 15;

const SYSTEM_PROMPT = `You are the Copywriter for a social content factory, writing captions for
Instagram and TikTok. Write the way real high-performing posts are actually written — a strong
hook line first, short punchy sentences, a light call-to-action, tasteful emoji use (not excessive).
Respond with ONLY valid JSON, no prose, no markdown fences.`;

function buildPrompt(post: Post): string {
  const label = NICHE_LABEL[post.niche as SocialNiche] ?? post.niche;
  return `Niche: ${label}. Post concept: ${post.hook}.

Write the caption. Respond with JSON: {"caption": "the full caption, hook line first, under 150 words", "hashtags": "10-15 space-separated hashtags, mix of broad and niche-specific"}`;
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

  const { rows: posts } = await sql<Post>`SELECT * FROM posts WHERE status = 'image-ready' LIMIT ${PER_RUN_CAP}`;

  let written = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      const message = await anthropic.messages.create({
        model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(post) }],
      });
      const textBlock = message.content.find((b) => b.type === "text");
      const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
      const copy: { caption: string; hashtags: string } = JSON.parse(
        raw.replace(/```json|```/g, "").trim()
      );

      await sql`INSERT INTO post_copy (post_id, caption, hashtags)
                VALUES (${post.id}, ${copy.caption}, ${copy.hashtags})
                ON CONFLICT (post_id) DO UPDATE SET
                  caption = EXCLUDED.caption, hashtags = EXCLUDED.hashtags`;
      // Straight to pending-review — no separate bundler stage the way the
      // Etsy shop has one; a post is just an image pair + caption, nothing
      // else to verify or assemble.
      await sql`UPDATE posts SET status = 'pending-review' WHERE id = ${post.id}`;
      written++;
    } catch (err) {
      console.error(`copywriter failed on post ${post.id}`, err);
      failed++;
    }
  }

  await logReport("Copywriter", `${written} captions written${failed > 0 ? `, ${failed} failed` : ""}`);
  return NextResponse.json({ ok: true, written, failed });
}
