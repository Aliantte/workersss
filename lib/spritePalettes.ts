import type { SpritePalette } from "@/components/PixelSprite";

export type CrewSpriteConfig = {
  palette: SpritePalette;
  rowOverrides?: Record<number, string>;
};

export const SPRITES: Record<string, CrewSpriteConfig> = {
  boss: {
    palette: { H: "#241a10", S: "#c9915f", B: "#0d0d0d", A: "#0d0d0d", G: "#ffd23f", L: "#151515", E: "#000" },
  },
  research: {
    palette: { H: "#ff3fa4", S: "#c9915f", B: "#182922", A: "#182922", G: "#7dff5b", L: "#0f1c15", E: "#000" },
  },
  studio: {
    palette: {
      H: "#241124",
      S: "#c9915f",
      B: "#3a1450",
      A: "#3a1450",
      G: "#ff3fa4",
      L: "#20102c",
      E: "#000",
      X: "#ffd23f",
    },
    rowOverrides: { 7: ".BBXBBB." },
  },
  editor: {
    palette: {
      H: "#111318",
      S: "#c9915f",
      B: "#123138",
      A: "#123138",
      G: "#3fe0ff",
      L: "#0c1f22",
      E: "#000",
      C: "#3fe0ff",
    },
    rowOverrides: { 1: "CHHHHHC" },
  },
  packager: {
    palette: { H: "#1a0510", S: "#c9915f", B: "#3a0f28", A: "#3a0f28", G: "#ff3fa4", L: "#240a19", E: "#000" },
  },
  scout: {
    palette: { H: "#241708", S: "#c9915f", B: "#3a2410", A: "#3a2410", G: "#ff8a3d", L: "#241708", E: "#000" },
  },
  designer: {
    palette: {
      H: "#230a1c",
      S: "#c9915f",
      B: "#3a1030",
      A: "#3a1030",
      G: "#ff6bcb",
      L: "#230a1c",
      E: "#000",
      X: "#ffd23f",
    },
    rowOverrides: { 7: ".BBXBBB." },
  },
  copywriter: {
    palette: {
      H: "#0a1f1d",
      S: "#c9915f",
      B: "#0d3330",
      A: "#0d3330",
      G: "#2dd4bf",
      L: "#0a1f1d",
      E: "#000",
      C: "#2dd4bf",
    },
    rowOverrides: { 1: "CHHHHHC" },
  },
  alvin: {
    palette: { H: "#d8d8e0", S: "#c9915f", B: "#1c1c22", A: "#1c1c22", G: "#e8e8f0", L: "#141419", E: "#000", T: "#c02040" },
    rowOverrides: { 6: ".BTTBBB." },
  },
};
