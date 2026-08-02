import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { CATEGORY_LABEL, type Idea } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Ally Al, who writes Etsy listing copy for a small digital-products
shop and does a quick quality pass before things move on. Write titles the way real successful
Etsy digital-download listings are written — keyword-forward, front-loaded, no fluff. Respond with
ONLY valid JSON, no prose, no markdown fences.`;

function buildPrompt(idea: Idea): string {
  const label = CATEGORY_LABEL[idea.category];
  return `Product: ${label}. Concept: ${idea.concept}. Keywords: ${idea.keywords}.

Write Etsy listing copy. Respond with JSON: {"title": "under 140 chars, keyword-forward", "tags": "13 comma-separated tags, Etsy style, under 20 chars each", "description": "2-3 short paragraphs, buyer-facing"}`;
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

  const { rows: ideas } = await sql<Idea>`SELECT * FROM ideas WHERE status = 'image-ready' LIMIT 6`;

  let written = 0;
  try {
    for (const idea of ideas) {
      const message = await anthropic.messages.create({
        model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(idea) }],
      });
      const textBlock = message.content.find((b) => b.type === "text");
      const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
      const copy: { title: string; tags: string; description: string } = JSON.parse(
        raw.replace(/```json|```/g, "").trim()
      );

      await sql`INSERT INTO listing_copy (idea_id, title, tags, description)
                VALUES (${idea.id}, ${copy.title}, ${copy.tags}, ${copy.description})`;
      await sql`UPDATE ideas SET status = 'ready-to-package' WHERE id = ${idea.id}`;
      written++;
    }

    await logReport("Ally Al", `${written} listings written`);
    return NextResponse.json({ ok: true, written });
  } catch (err) {
    console.error("editor cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
