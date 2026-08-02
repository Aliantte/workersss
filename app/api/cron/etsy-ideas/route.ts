import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { pushFeedItem } from "@/lib/redis";
import { isAuthorizedCronRequest } from "@/lib/auth";
import type { IdeaItem } from "@/lib/types";

export const maxDuration = 60;

// At 6 runs a day, always asking "give me 5 Etsy ideas" with no angle would
// converge on the same handful of obvious niches fast. Instead each run is
// handed a different lens to dig from, rotating by hour of day.
const LENSES = [
  "home decor and wall art",
  "jewelry and accessories",
  "digital downloads and printables",
  "pet products",
  "wedding and event supplies",
  "seasonal and holiday goods",
  "stationery and planners",
  "craft supplies and DIY kits",
];

function pickLens(): string {
  const hour = new Date().getUTCHours();
  return LENSES[hour % LENSES.length];
}

const SYSTEM_PROMPT = `You are a research worker for an Etsy seller. You scan for emerging,
underserved, or newly-trending product niches that a small print-on-demand or handmade
shop could realistically launch. Favor specificity over generic categories ("dark academia
tarot-themed enamel pins" beats "jewelry"). Avoid anything trademarked, celebrity-based, or
requiring licensed IP. Respond with ONLY valid JSON, no prose, no markdown fences.`;

function buildUserPrompt(lens: string): string {
  return `Generate 8 new Etsy shop niche ideas, focused specifically on the "${lens}" category.
For each, give:
- "title": a short punchy niche name (5-8 words)
- "niche": the broader product category it falls under
- "reasoning": one sentence on why this niche looks promising currently

Return as a JSON array of exactly 8 objects with keys: title, niche, reasoning.`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });
  const lens = pickLens();

  try {
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_IDEA_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(lens) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const ideas: { title: string; niche: string; reasoning: string }[] = JSON.parse(cleaned);

    const saved: IdeaItem[] = [];
    for (const idea of ideas) {
      const item: IdeaItem = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        station: "research",
        title: idea.title,
        niche: idea.niche,
        reasoning: idea.reasoning,
      };
      await pushFeedItem(item);
      saved.push(item);
    }

    return NextResponse.json({ ok: true, lens, count: saved.length, items: saved });
  } catch (err) {
    console.error("etsy-ideas cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
