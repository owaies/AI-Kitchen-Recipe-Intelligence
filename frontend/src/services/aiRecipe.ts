import type { PantryRow } from "./pantry";
import type { SmartRecipe } from "./recipeIntelligence";

const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

type AIResponse = {
  provider: "OpenRouter";
  recipe: {
    title: string;
    cuisine: string;
    time_minutes: number;
    difficulty: "Easy" | "Medium" | "Hard";
    reason: string;
    used_ingredients: string[];
    missing_ingredients: string[];
    substitutions: string[];
    steps: string[];
    nutrition: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
  };
};

export async function generateAIRecipe(pantry: PantryRow[], goal = "balanced dinner", maxTimeMinutes = 45, dietaryPreferences: string[] = [], cuisine = "Any cuisine"): Promise<SmartRecipe> {
  if (!apiBase) throw new Error("AI backend URL is not configured.");

  const response = await fetch(`${apiBase}/api/recipes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pantry: pantry.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      goal,
      max_time_minutes: maxTimeMinutes,
      dietary_preferences: dietaryPreferences,
      cuisine,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "OpenRouter recipe generation failed.");

  const recipe = (body as AIResponse).recipe;
  const used = recipe.used_ingredients ?? [];
  const missing = recipe.missing_ingredients ?? [];
  const total = used.length + missing.length;
  const match = total ? Math.round((used.length / total) * 100) : 0;

  return {
    id: `openrouter-${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: recipe.title,
    cuisine: recipe.cuisine,
    time: recipe.time_minutes,
    difficulty: recipe.difficulty === "Hard" ? "Medium" : recipe.difficulty,
    match,
    used,
    missing,
    reason: recipe.reason,
    substitutions: recipe.substitutions ?? [],
    steps: recipe.steps,
    nutrition: {
      calories: Math.round(recipe.nutrition.calories),
      protein: Math.round(recipe.nutrition.protein_g),
      carbs: Math.round(recipe.nutrition.carbs_g),
      fat: Math.round(recipe.nutrition.fat_g),
    },
  };
}
