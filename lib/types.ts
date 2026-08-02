export type IdeaCategory =
  | "wall_art"
  | "mug_tumbler_wrap"
  | "phone_wallpaper"
  | "digital_planner"
  | "sticker_sheet";

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
  employee: "Aliantte" | "Pin Laden" | "Ally Al" | "Packager" | "Alvin";
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

export const CATEGORY_LABEL: Record<IdeaCategory, string> = {
  wall_art: "Wall art",
  mug_tumbler_wrap: "Mug/tumbler wrap",
  phone_wallpaper: "Phone wallpaper",
  digital_planner: "Digital planner",
  sticker_sheet: "Sticker sheet",
};
