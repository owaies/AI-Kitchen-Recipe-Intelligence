import type { PantryRow } from "./pantry";
import type { SavedRecipeOption } from "./mealPlans";
import { buildPantryInsights } from "./pantryInsights";

export type MealPlanFocus = {
  headline: string;
  description: string;
  ingredients: {
    id: string;
    name: string;
    daysLeft: number | null;
    urgency: "expired" | "today" | "soon" | "fresh" | "no-expiry";
  }[];
};

export function buildMealPlanFocus(pantry: PantryRow[]): MealPlanFocus {
  const insights = buildPantryInsights(pantry)
    .filter((item) => item.urgency !== "no-expiry")
    .slice(0, 3);

  if (insights.length === 0) {
    return {
      headline: "Your week has room to breathe.",
      description: "No dated pantry items are currently pressing. Plan around the meals you actually want to cook.",
      ingredients: [],
    };
  }

  const names = insights.map((item) => item.name);
  const headline = names.length === 1
    ? `Build a meal around ${names[0]}.`
    : `Use ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} first.`;

  return {
    headline,
    description: "Freshness-aware planning keeps ingredients with the shortest shelf window in the front of the queue.",
    ingredients: insights.map(({ id, name, daysLeft, urgency }) => ({ id, name, daysLeft, urgency })),
  };
}


export type MealPlanCandidate = {
  recipe: SavedRecipeOption;
  pantryCoverage: number;
  missingCount: number;
  reason: string;
};

function recipeIngredients(recipe: SavedRecipeOption) {
  const data = recipe.recipe_data ?? {};
  const used = Array.isArray(data.used) ? data.used.filter((item): item is string => typeof item === "string") : [];
  const missing = Array.isArray(data.missing) ? data.missing.filter((item): item is string => typeof item === "string") : [];
  return { used, missing };
}

export function rankPantryAwareMeals(recipes: SavedRecipeOption[]): MealPlanCandidate[] {
  return recipes
    .map((recipe) => {
      const { used, missing } = recipeIngredients(recipe);
      const total = used.length + missing.length;
      const pantryCoverage = total ? Math.round((used.length / total) * 100) : 0;
      return {
        recipe,
        pantryCoverage,
        missingCount: missing.length,
        reason: missing.length
          ? `${pantryCoverage}% pantry coverage · ${missing.length} item${missing.length === 1 ? "" : "s"} to buy`
          : "100% pantry coverage · no extra shopping needed",
      };
    })
    .sort((a, b) => b.pantryCoverage - a.pantryCoverage || a.missingCount - b.missingCount);
}
