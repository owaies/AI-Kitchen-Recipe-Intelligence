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

export type KitchenScoreExplanation = {
  label: string;
  detail: string;
  tone: "positive" | "neutral" | "attention";
};

export function explainKitchenScore(
  recipe: SmartRecipe,
  signals: KitchenScoreSignals,
  pantry: PantrySignalItem[],
  maxTime: number,
  prioritizeExpiring: boolean,
): KitchenScoreExplanation[] {
  const explanations: KitchenScoreExplanation[] = [];
  const urgentUsed = recipe.used
    .map((ingredient) => pantry.find((item) => matchesIngredient(item.name, ingredient)))
    .filter((item): item is PantrySignalItem => Boolean(item && item.days <= 3));

  if (signals.pantry >= 80) {
    explanations.push({ label: "Pantry coverage", detail: `${signals.pantry}% of the recipe is covered by ingredients you already have.`, tone: "positive" });
  } else {
    explanations.push({ label: "Pantry coverage", detail: `${recipe.missing.length} ingredient${recipe.missing.length === 1 ? "" : "s"} still need to be sourced.`, tone: "attention" });
  }

  if (prioritizeExpiring && urgentUsed.length) {
    const names = urgentUsed.slice(0, 2).map((item) => item.name).join(" and ");
    explanations.push({ label: "Use soon", detail: `${names} ${urgentUsed.length === 1 ? "is" : "are"} close to expiry, so this recipe helps prioritize them.`, tone: "positive" });
  } else if (prioritizeExpiring) {
    explanations.push({ label: "Expiry", detail: "No expiring pantry ingredient is a strong match for this recipe.", tone: "neutral" });
  }

  if (recipe.time <= maxTime) {
    explanations.push({ label: "Time fit", detail: `${recipe.time} minutes fits your ${maxTime}-minute cooking limit.`, tone: "positive" });
  } else {
    explanations.push({ label: "Time fit", detail: `${recipe.time} minutes is above your ${maxTime}-minute target.`, tone: "attention" });
  }

  if (signals.missing >= 75) {
    explanations.push({ label: "Shopping effort", detail: recipe.missing.length ? "Only a small number of ingredients are missing." : "Nothing essential is missing.", tone: "positive" });
  } else {
    explanations.push({ label: "Shopping effort", detail: "This recipe needs several ingredients beyond the current pantry.", tone: "attention" });
  }

  return explanations;
};