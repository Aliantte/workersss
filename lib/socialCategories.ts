export type SocialNiche =
  | "motivational_quotes"
  | "wellness_selfcare"
  | "productivity_mindset"
  | "humor_relatable"
  | "home_lifestyle"
  | "finance_tips";

export const NICHE_LABEL: Record<SocialNiche, string> = {
  motivational_quotes: "Motivational quotes",
  wellness_selfcare: "Wellness & self-care",
  productivity_mindset: "Productivity & mindset",
  humor_relatable: "Humor / relatable",
  home_lifestyle: "Home & lifestyle",
  finance_tips: "Finance tips",
};

const NICHES: SocialNiche[] = [
  "motivational_quotes",
  "wellness_selfcare",
  "productivity_mindset",
  "humor_relatable",
  "home_lifestyle",
  "finance_tips",
];

export function pickNiche(): SocialNiche {
  const hour = new Date().getUTCHours();
  return NICHES[hour % NICHES.length];
}

const VISUAL_STYLES = [
  "clean modern quote-card design, bold typography-friendly negative space, minimalist",
  "vibrant anime/cartoon illustration style",
  "flat design, soft pastel color palette, simple minimalist icons",
  "bold meme-style graphic, high contrast, punchy",
  "elegant nature/botanical aesthetic, soft watercolor feel",
  "retro/vintage poster style, warm muted tones",
];

export function pickStyle(): string {
  return VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];
}
