export type IdeaCategory =
  | "wall_art"
  | "mug_tumbler_wrap"
  | "phone_wallpaper"
  | "digital_planner"
  | "sticker_sheet"
  | "coloring_page"
  | "game_asset_pack";

export type IdeaStatus =
  | "new"
  | "flagged-skip"
  | "image-ready"
  | "ready-to-package"
  | "pending-review"
  | "approved"
  | "archived";

export type Idea = {
  id: number;
  batch_id: string;
  category: IdeaCategory;
  concept: string;
  keywords: string;
  trend_rationale: string;
  status: IdeaStatus;
  reject_reason: string | null;
  suggested_price: number | null;
  price_range: string | null;
  created_at: string;
};

export type Asset = {
  id: number;
  idea_id: number;
  type: "design";
  url: string;
  created_at: string;
};

export type ListingCopy = {
  idea_id: number;
  title: string;
  tags: string;
  description: string;
  created_at: string;
};

export type Report = {
  id: number;
  employee: "Aliantte" | "Pin Laden" | "Ally Al" | "Packager" | "Alvin" | "Scout" | "Designer" | "Copywriter" | "Boardroom";
  summary: string;
  created_at: string;
};

export type MeetingNotes = {
  id: number;
  batch_id: string;
  notes: string;
  created_at: string;
};

export type IdeaWithBundle = Idea & {
  design_url: string | null;
  title: string | null;
  tags: string | null;
  description: string | null;
};

// --- Social content factory ---

export type PostStatus = "new" | "image-ready" | "pending-review" | "approved" | "archived";

export type Post = {
  id: number;
  batch_id: string;
  niche: string;
  hook: string;
  style: string;
  status: PostStatus;
  reject_reason: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  source_credit: string | null;
  created_at: string;
};

export type PostAsset = {
  id: number;
  post_id: number;
  platform: "instagram" | "tiktok";
  url: string;
  created_at: string;
};

export type PostCopy = {
  post_id: number;
  caption: string;
  hashtags: string;
  created_at: string;
};

export type PostWithBundle = Post & {
  instagram_url: string | null;
  tiktok_url: string | null;
  caption: string | null;
  hashtags: string | null;
};

export const CATEGORY_LABEL: Record<IdeaCategory, string> = {
  wall_art: "Wall art",
  mug_tumbler_wrap: "Mug/tumbler wrap",
  phone_wallpaper: "Phone wallpaper",
  digital_planner: "Digital planner",
  sticker_sheet: "Sticker sheet",
  coloring_page: "Coloring page",
  game_asset_pack: "Game asset pack",
};

export type TeamMeeting = {
  id: number;
  discussion: string;
  suggestions: string;
  adjustments: string | null;
  created_at: string;
};
