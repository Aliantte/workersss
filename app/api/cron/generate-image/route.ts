import { NextRequest, NextResponse } from "next/server";
import { pushFeedItem } from "@/lib/redis";
import { isAuthorizedCronRequest } from "@/lib/auth";
import type { ImageItem } from "@/lib/types";

export const maxDuration = 60;

// Combinatorial prompt building, not a fixed list — at several drops a day,
// a static array of 5 prompts would start repeating within 24 hours. Each
// axis below is picked independently so the space is in the thousands.

const STORM_SUBJECTS = [
  "a lone lighthouse on a rocky point",
  "a vast wheat field",
  "a fishing village clinging to a cliffside",
  "a single wind-bent tree on a hilltop",
  "an abandoned pier stretching into the sea",
  "a mountain pass between jagged peaks",
  "a desert canyon carved by flash floods",
  "a wooden farmhouse on the open plains",
  "a suspension bridge over a churning river",
  "a lone sailboat far from shore",
];

const STORM_WEATHER = [
  "battered by a violent thunderstorm, lightning cracking the sky",
  "swallowed by a rolling wall of dust and wind",
  "under a churning supercell, greenish storm light",
  "lashed by hurricane rain and horizontal wind",
  "wrapped in low fog rolling in ahead of the storm",
  "lit by distant heat lightning on the horizon",
  "under a wall cloud about to drop a funnel",
  "soaked in the last light before the storm breaks",
];

const STORM_MOOD = [
  "cinematic, moody teal and amber palette",
  "hyper-detailed landscape photography, ultra wide angle",
  "painterly atmosphere, dramatic brush texture",
  "epic scale, muted earth tones",
  "high contrast black and white, documentary style",
  "warm golden-hour light breaking through the clouds",
];

const ANIME_SUBJECTS = [
  "a stoic swordsman with windswept hair",
  "a rain-soaked detective in a long coat",
  "a young mage mid-incantation",
  "a battle-worn knight lowering their visor",
  "a serene shrine maiden",
  "a rival duo clashing blades",
  "a mecha pilot sprinting to their machine",
  "a wandering ronin at a crossroads",
  "a spirit fox shifting between forms",
  "a rooftop assassin scanning the skyline",
];

const ANIME_ACTION = [
  "portrait, dramatic rim lighting, detailed line art",
  "mid-battle, energy trails and speed lines",
  "leaping between rooftops at full sprint",
  "casting a spell, magic circle blooming behind them",
  "frozen mid-clash with a rival, sparks flying",
  "standing still in the calm before a fight",
  "landing from a great height, cloak billowing",
];

const ANIME_LIGHT = [
  "moody cyberpunk neon palette",
  "soft pastel lighting, falling cherry blossoms",
  "high-contrast sunset backlight",
  "cool blue moonlight, sharp shadows",
  "studio quality, clean cel-shaded style",
  "storm-lit, dramatic and desaturated",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt(theme: "storm" | "anime"): string {
  if (theme === "anime") {
    return `anime ${pick(ANIME_SUBJECTS)}, ${pick(ANIME_ACTION)}, ${pick(ANIME_LIGHT)}`;
  }
  return `${pick(STORM_SUBJECTS)}, ${pick(STORM_WEATHER)}, ${pick(STORM_MOOD)}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const themeParam = req.nextUrl.searchParams.get("theme");
  const theme: "storm" | "anime" = themeParam === "anime" ? "anime" : "storm";
  const prompt = buildPrompt(theme);
  const seed = Math.floor(Math.random() * 1_000_000);

  // Pollinations.ai: free, no API key required. Anonymous requests are
  // rate-limited (~1 req/15s) and may carry a small watermark; register at
  // pollinations.ai and set POLLINATIONS_TOKEN below to remove both — worth
  // doing at this cadence.
  const token = process.env.POLLINATIONS_TOKEN;
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    seed: String(seed),
    nologo: "true",
    ...(token ? { token } : {}),
  });
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

  try {
    const check = await fetch(imageUrl, { method: "GET" });
    if (!check.ok) {
      throw new Error(`Pollinations returned ${check.status}`);
    }

    const item: ImageItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      station: "studio",
      theme,
      prompt,
      imageUrl,
    };
    await pushFeedItem(item);

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error("generate-image cron failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
