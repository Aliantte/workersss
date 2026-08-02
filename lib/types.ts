export type IdeaItem = {
  id: string;
  createdAt: string;
  station: "research";
  title: string;
  niche: string;
  reasoning: string;
};

export type ImageItem = {
  id: string;
  createdAt: string;
  station: "studio";
  theme: "storm" | "anime";
  prompt: string;
  imageUrl: string;
};

export type FeedItem = IdeaItem | ImageItem;
