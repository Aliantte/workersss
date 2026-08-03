import type { IdeaCategory } from "./types";
import { getSetting } from "./settings";

export const CATEGORIES: IdeaCategory[] = [
  "wall_art",
  "mug_tumbler_wrap",
  "phone_wallpaper",
  "digital_planner",
  "sticker_sheet",
  "coloring_page",
  "game_asset_pack",
];

// Weights are clamped to this range on every read — no matter what got
// written, a category can never be picked less than 40% as often, or more
// than 250% as often, as an even split. Keeps the rotation from ever
// collapsing onto one or two categories.
const MIN_WEIGHT = 0.4;
const MAX_WEIGHT = 2.5;

export async function pickCategory(): Promise<IdeaCategory> {
  const raw = await getSetting("category_weights");
  let weights: Record<string, number> = {};
  if (raw) {
    try {
      weights = JSON.parse(raw);
    } catch {
      weights = {};
    }
  }

  const weighted = CATEGORIES.map((c) => ({
    category: c,
    weight: Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weights[c] ?? 1)),
  }));

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weighted) {
    if (r < w.weight) return w.category;
    r -= w.weight;
  }
  return CATEGORIES[CATEGORIES.length - 1];
}
