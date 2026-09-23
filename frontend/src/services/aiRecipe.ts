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


export type AIStreamUpdate =
  | { type: "start"; model: string; fallback?: boolean; attempt?: number }
  | { type: "delta"; content: string }
  | { type: "complete"; recipe: SmartRecipe; model?: string; reasoningTokens?: number | null }
  | { type: "fallback"; message: string }
  | { type: "error"; message: string };

function normalizeAIRecipe(recipe: AIResponse["recipe"]): SmartRecipe {
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

export async function streamAIRecipe(
  pantry: PantryRow[],
  goal = "balanced dinner",
  maxTimeMinutes = 45,
  dietaryPreferences: string[] = [],
  cuisine = "Any cuisine",
  onUpdate?: (update: AIStreamUpdate) => void,
): Promise<SmartRecipe> {
  if (!apiBase) throw new Error("AI backend URL is not configured.");

  const response = await fetch(`${apiBase}/api/recipes/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
    body: JSON.stringify({
      pantry: pantry.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      goal,
      max_time_minutes: maxTimeMinutes,
      dietary_preferences: dietaryPreferences,
      cuisine,
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? "OpenRouter streaming recipe generation failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalRecipe: SmartRecipe | null = null;

  const consume = (raw: string) => {
    const lines = raw.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const update = JSON.parse(payload) as {
          type: string;
          model?: string;
          content?: string;
          message?: string;
          recipe?: AIResponse["recipe"];
          usage?: { reasoning_tokens?: number | null };
          fallback?: boolean;
          attempt?: number;
        };
        if (update.type === "complete" && update.recipe) {
          finalRecipe = normalizeAIRecipe(update.recipe);
          onUpdate?.({
            type: "complete",
            recipe: finalRecipe,
            model: update.model,
            reasoningTokens: update.usage?.reasoning_tokens,
          });
        } else if (update.type === "start") {
          onUpdate?.({
            type: "start",
            model: update.model ?? "OpenRouter",
            fallback: update.fallback,
            attempt: update.attempt,
          });
        } else if (update.type === "delta" && update.content) {
          onUpdate?.({ type: "delta", content: update.content });
        } else if (update.type === "fallback") {
          onUpdate?.({ type: "fallback", message: update.message ?? "Trying the next AI model." });
        } else if (update.type === "error") {
          onUpdate?.({ type: "error", message: update.message ?? "AI generation failed." });
        }
      } catch {
        // Ignore malformed SSE frames and keep the stream alive.
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      consume(buffer);
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    frames.forEach(consume);
  }

  if (!finalRecipe) throw new Error("OpenRouter fallback chain ended without a complete recipe.");
  return finalRecipe;
}
