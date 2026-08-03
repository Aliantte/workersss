import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { pickCategory } from "@/lib/categories";
import { searchEtsyListings, type EtsyGrounding } from "@/lib/etsy";
import { CATEGORY_LABEL, type IdeaCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Aliantte, the research lead for a small Etsy digital-products shop.
You scan for specific, sellable ideas within one product category at a time — never generic
category names. The shop's visual identity is anime/manga art style, Western cartoon style, or
nature and botanical illustration — every idea should draw from one of those three, whichever
fits the category best, not generic stock-photo or minimalist styles. Favor concepts with clear
visual identity and a real buyer search intent. Avoid anything trademarked, celebrity-based, or
requiring licensed IP (no existing anime/cartoon characters — original art only). When real current
Etsy listings are provided, use them to spot actual gaps and patterns — never copy a listing
directly, treat them as market signal, not a template. Respond with ONLY valid JSON, no prose, no
markdown fences.`;

function buildPrompt(category: IdeaCategory, grounding: EtsyGrounding | null): string {
  const label = CATEGORY_LABEL[category];

  let groundingBlock = "";
  if (grounding) {
    const priceLine =
      grounding.avgPrice != null
        ? `\nComparable listings are priced roughly $${grounding.minPrice?.toFixed(2)}-$${grounding.maxPrice?.toFixed(2)}, averaging $${grounding.avgPrice.toFixed(2)}.`
        : "";
    groundingBlock = `\n\nReal current Etsy listings for "${label}" (${grounding.totalCount} active listings match this search):\n${grounding.titles.map((t) => `- ${t}`).join("\n")}${priceLine}\n\nUse this as real market signal — what's already saturated, what angles keep repeating, what's
missing — rather than guessing blind.`;
  }

  return `Generate 6 new digital-product ideas for an Etsy shop, all within the "${label}" category.
Every idea must be anime-style, cartoon-style, or nature/botanical illustration (original art,
no existing IP). For each, give:
- "concept": a short, specific description of the design, including which of the three styles
  it uses (5-15 words)
- "keywords": 4-6 comma-separated Etsy search terms/SEO angle for this piece
- "trend_rationale": one sentence on why this looks promising right now${groundingBlock}

Return as a JSON array of exactly 6 objects with keys: concept, keywords, trend_rationale.`;
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

  const category = pickCategory();
  const batchId = `batch_${Date.now()}`;
  const anthropic = new Anthropic({ apiKey });

  try {
    const grounding = await searchEtsyListings(CATEGORY_LABEL[category], 10);

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(category, grounding) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const ideas: { concept: string; keywords: string; trend_rationale: string }[] =
      JSON.parse(cleaned);

    const suggestedPrice = grounding?.avgPrice ?? null;
    const priceRange =
      grounding?.minPrice != null && grounding?.maxPrice != null
        ? `$${grounding.minPrice.toFixed(2)}-$${grounding.maxPrice.toFixed(2)}`
        : null;

    for (const idea of ideas) {
      await sql`INSERT INTO ideas (batch_id, category, concept, keywords, trend_rationale, status, suggested_price, price_range)
                VALUES (${batchId}, ${category}, ${idea.concept}, ${idea.keywords}, ${idea.trend_rationale}, 'new', ${suggestedPrice}, ${priceRange})`;
    }

    await logReport(
      "Aliantte",
      `${ideas.length} ideas generated (${CATEGORY_LABEL[category]}${grounding ? `, grounded in ${grounding.totalCount} real Etsy listings` : ""}), batch ${batchId}`
    );

    return NextResponse.json({ ok: true, batchId, category, count: ideas.length, grounded: !!grounding, suggestedPrice });
  } catch (err) {
    console.error("research cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
