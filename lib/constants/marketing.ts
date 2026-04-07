export const VIRAL_CATEGORIES = [
  "indie_hacking",
  "ai_productivity",
  "fitness_diet",
  "side_hustle_money",
  "vibe_coding",
] as const;

export type ViralCategory = (typeof VIRAL_CATEGORIES)[number];

export const VIRAL_CATEGORY_LABELS: Record<ViralCategory, string> = {
  indie_hacking: "Indie Hacking",
  ai_productivity: "AI & Productivity",
  fitness_diet: "Fitness & Diet",
  side_hustle_money: "Side Hustle & Money",
  vibe_coding: "Vibe Coding",
};
