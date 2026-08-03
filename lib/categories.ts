import type { IdeaCategory } from "./types";

const CATEGORIES: IdeaCategory[] = [
  "wall_art",
  "mug_tumbler_wrap",
  "phone_wallpaper",
  "digital_planner",
  "sticker_sheet",
  "coloring_page",
];

export function pickCategory(): IdeaCategory {
  const hour = new Date().getUTCHours();
  return CATEGORIES[hour % CATEGORIES.length];
}
