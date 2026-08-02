import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { CATEGORY_LABEL, type Idea } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 120; // bumped from 60s to give the higher cap headroom

const PER_RUN_CAP = 20; // raised from 6 — text-only calls are fast/cheap, no timeout risk like studio's image rendering has

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

  const { rows: ideas } = await sql<Idea>`SELECT * FROM ideas WHERE status = 'image-ready' LIMIT ${PER_RUN_CAP}`;

  let written = 0;
  let failed = 0;

  for (const idea of ideas) {
    try {
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

      // Upsert, not a plain insert — if a prior run wrote the copy but the
      // status update after it never landed (a transient failure between the
      // two statements), this idea would otherwise permanently jam every
      // future run on a duplicate-key error. Re-running it now just
      // overwrites the copy and lets the status update proceed normally.
      await sql`INSERT INTO listing_copy (idea_id, title, tags, description)
                VALUES (${idea.id}, ${copy.title}, ${copy.tags}, ${copy.description})
                ON CONFLICT (idea_id) DO UPDATE SET
                  title = EXCLUDED.title, tags = EXCLUDED.tags, description = EXCLUDED.description`;
      await sql`UPDATE ideas SET status = 'ready-to-package' WHERE id = ${idea.id}`;
      written++;
    } catch (err) {
      // One bad idea (a malformed model response, a transient DB hiccup)
      // no longer takes the rest of the batch down with it.
      console.error(`editor failed on idea ${idea.id}`, err);
      failed++;
    }
  }

  await logReport(
    "Ally Al",
    `${written} listings written${failed > 0 ? `, ${failed} failed` : ""}`
  );
  return NextResponse.json({ ok: true, written, failed });
}
