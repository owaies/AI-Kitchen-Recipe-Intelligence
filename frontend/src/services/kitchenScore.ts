import type { SmartRecipe } from "./recipeIntelligence";

export type KitchenScoreSignals = {
  overall: number;
  pantry: number;
  expiry: number;
  time: number;
  preference: number;
  missing: number;
};

type PantrySignalItem = {
  name: string;
  days: number;
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

const matchesIngredient = (pantryName: string, ingredient: string) => {
  const pantry = normalize(pantryName);
  const target = normalize(ingredient);
  return pantry.includes(target) || target.includes(pantry);
};

const expirySignal = (days: number) => {
  if (days <= 0) return 100;
  if (days <= 1) return 92;
  if (days <= 3) return 78;
  if (days <= 7) return 58;
  return 35;
};

const preferenceSignal = (recipe: SmartRecipe, preferences: string[]) => {
  if (!preferences.length) return 100;

  const text = normalize([
    recipe.title,
    recipe.reason,
    ...recipe.used,
    ...recipe.missing,
  ].join(" "));

  let total = 0;
  let matched = 0;

  for (const preference of preferences) {
    total += 1;
    if (preference === "Vegetarian") {
      const meatTerms = ["chicken", "beef", "pork", "mutton", "lamb", "fish", "salmon", "tuna", "shrimp", "prawn", "meat", "turkey"];
      if (!meatTerms.some((term) => text.includes(term))) matched += 1;
    } else if (preference === "High protein") {
      matched += recipe.nutrition.protein >= 20 ? 1 : recipe.nutrition.protein >= 15 ? 0.75 : 0.4;
    } else if (preference === "Dairy-free") {
      const dairyTerms = ["milk", "cream", "cheese", "parmesan", "yogurt", "butter", "ghee"];
      if (!dairyTerms.some((term) => text.includes(term))) matched += 1;
    }
  }

  return Math.round((matched / total) * 100);
};

export function getKitchenScore(
  recipe: SmartRecipe,
  pantry: PantrySignalItem[],
  maxTime: number,
  preferences: string[],
  prioritizeExpiring: boolean,
): KitchenScoreSignals {
  const usedItems = recipe.used.map((ingredient) =>
    pantry.find((item) => matchesIngredient(item.name, ingredient)),
  ).filter(Boolean) as PantrySignalItem[];

  const expiry = prioritizeExpiring
    ? usedItems.length
      ? Math.round(usedItems.reduce((sum, item) => sum + expirySignal(item.days), 0) / usedItems.length)
      : 20
    : 50;

  const time = recipe.time <= maxTime
    ? 100
    : Math.max(25, Math.round((maxTime / recipe.time) * 100));

  const missing = Math.max(0, 100 - recipe.missing.length * 25);
  const pantryScore = recipe.match;
  const preference = preferenceSignal(recipe, preferences);

  const overall = Math.round(
    pantryScore * 0.35 +
    expiry * 0.2 +
    time * 0.15 +
    preference * 0.15 +
    missing * 0.15,
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    pantry: pantryScore,
    expiry,
    time,
    preference,
    missing,
  };
}
