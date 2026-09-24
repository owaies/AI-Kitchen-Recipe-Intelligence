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

function normalize(value: string) {\n  return value.trim().toLowerCase().replace(/\\s+/g, " ");\n}\n\nfunction recipeIngredients(recipe: SavedRecipeOption) {
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


export function rankExpiryAwareMeals(
  recipes: SavedRecipeOption[],
  pantry: PantryRow[],
): MealPlanCandidate[] {
  const pantryNames = pantry.map((item) => ({ name: item.name.toLowerCase(), days: item.expires_on ? Math.ceil((new Date(item.expires_on).getTime() - Date.now()) / 86400000) : 999 }));
  return rankPantryAwareMeals(recipes)
    .map((candidate) => {
      const used = recipeIngredients(candidate.recipe).used;
      const urgent = used.filter((ingredient) =>
        pantryNames.some((item) => item.name.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(item.name)) &&
        item.days >= 0 && item.days <= 3,
      );
      return {
        ...candidate,
        reason: urgent.length
          ? `${candidate.pantryCoverage}% pantry coverage · uses ${urgent.slice(0, 2).join(" and ")} before expiry`
          : candidate.reason,
      };
    })
    .sort((a, b) => {
      const urgentA = recipeIngredients(a.recipe).used.filter((ingredient) => pantryNames.some((item) => (item.name.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(item.name)) && item.days >= 0 && item.days <= 3)).length;
      const urgentB = recipeIngredients(b.recipe).used.filter((ingredient) => pantryNames.some((item) => (item.name.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(item.name)) && item.days >= 0 && item.days <= 3)).length;
      return urgentB - urgentA || b.pantryCoverage - a.pantryCoverage;
    });
}


const containsAny = (values: string[], terms: string[]) => {
  const text = values.join(" ").toLowerCase();
  return terms.some((term) => text.includes(term));
};

export function rankDietaryMeals(recipes: SavedRecipeOption[], preferences: string[]): MealPlanCandidate[] {
  if (!preferences.length) return rankPantryAwareMeals(recipes);
  const meat = ["chicken", "beef", "pork", "mutton", "lamb", "fish", "salmon", "tuna", "shrimp", "prawn", "meat", "turkey"];
  const dairy = ["milk", "cream", "cheese", "parmesan", "yogurt", "butter", "ghee"];
  return rankPantryAwareMeals(recipes)
    .map((candidate) => {
      const { used, missing } = recipeIngredients(candidate.recipe);
      const values = [...used, ...missing, candidate.recipe.title];
      const nutrition = candidate.recipe.recipe_data?.nutrition as { protein?: number } | undefined;
      let matched = 0;
      if (preferences.includes("Vegetarian") && !containsAny(values, meat)) matched += 1;
      if (preferences.includes("Dairy-free") && !containsAny(values, dairy)) matched += 1;
      if (preferences.includes("High protein") && Number(nutrition?.protein ?? 0) >= 20) matched += 1;
      const ratio = matched / preferences.length;
      return { ...candidate, reason: ratio >= 1 ? "Matches your dietary preferences and pantry." : `${Math.round(ratio * 100)}% preference fit · ${candidate.reason}` };
    })
    .sort((a, b) => {
      const fit = (candidate: MealPlanCandidate) => {
        const { used, missing } = recipeIngredients(candidate.recipe);
        const values = [...used, ...missing, candidate.recipe.title];
        const nutrition = candidate.recipe.recipe_data?.nutrition as { protein?: number } | undefined;
        let matched = 0;
        if (preferences.includes("Vegetarian") && !containsAny(values, meat)) matched++;
        if (preferences.includes("Dairy-free") && !containsAny(values, dairy)) matched++;
        if (preferences.includes("High protein") && Number(nutrition?.protein ?? 0) >= 20) matched++;
        return matched;
      };
      return fit(b) - fit(a) || b.pantryCoverage - a.pantryCoverage;
    });
}


export function rankTimeAwareMeals(recipes: SavedRecipeOption[], maxMinutes: number): MealPlanCandidate[] {
  return rankPantryAwareMeals(recipes)
    .map((candidate) => {
      const time = Number(candidate.recipe.recipe_data?.time ?? candidate.recipe.recipe_data?.time_minutes ?? 999);
      return {
        ...candidate,
        reason: time <= maxMinutes
          ? `${time} min fits your ${maxMinutes}-minute limit · ${candidate.pantryCoverage}% pantry coverage`
          : `${time} min exceeds your ${maxMinutes}-minute limit · ${candidate.pantryCoverage}% pantry coverage`,
      };
    })
    .sort((a, b) => {
      const timeA = Number(a.recipe.recipe_data?.time ?? a.recipe.recipe_data?.time_minutes ?? 999);
      const timeB = Number(b.recipe.recipe_data?.time ?? b.recipe.recipe_data?.time_minutes ?? 999);
      const fitsA = timeA <= maxMinutes ? 1 : 0;
      const fitsB = timeB <= maxMinutes ? 1 : 0;
      return fitsB - fitsA || Math.abs(timeA - maxMinutes) - Math.abs(timeB - maxMinutes) || b.pantryCoverage - a.pantryCoverage;
    });
}


export function diversifyMealCandidates(
  candidates: MealPlanCandidate[],
  plannedRecipeIds: string[] = [],
): MealPlanCandidate[] {
  const planned = new Set(plannedRecipeIds);
  const usedIngredientSets = new Set<string>();
  return [...candidates].sort((a, b) => {
    const aPlanned = planned.has(a.recipe.id) ? 1 : 0;
    const bPlanned = planned.has(b.recipe.id) ? 1 : 0;
    if (aPlanned !== bPlanned) return aPlanned - bPlanned;
    const ingredientsA = recipeIngredients(a.recipe).used.map((item) => item.toLowerCase()).sort().slice(0, 3).join("|");
    const ingredientsB = recipeIngredients(b.recipe).used.map((item) => item.toLowerCase()).sort().slice(0, 3).join("|");
    const repeatA = usedIngredientSets.has(ingredientsA) ? 1 : 0;
    const repeatB = usedIngredientSets.has(ingredientsB) ? 1 : 0;
    if (repeatA !== repeatB) return repeatA - repeatB;
    usedIngredientSets.add(ingredientsA);
    usedIngredientSets.add(ingredientsB);
    return b.pantryCoverage - a.pantryCoverage;
  });
}


export function buildMealPlanShoppingList(
  recipes: SavedRecipeOption[],
  plannedRecipeIds: string[],
): string[] {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const unique = new Map<string, string>();
  for (const id of plannedRecipeIds) {
    const recipe = byId.get(id);
    if (!recipe) continue;
    for (const ingredient of recipeIngredients(recipe).missing) {
      const key = normalize(ingredient);
      if (key && !unique.has(key)) unique.set(key, ingredient);
    }
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}


export type MealPlanExplanation = {
  pantry: string;
  expiry: string;
  time: string;
  preference: string;
};

export function explainMealPlanCandidate(
  candidate: MealPlanCandidate,
  pantry: PantryRow[],
  maxMinutes: number,
  preferences: string[] = [],
): MealPlanExplanation {
  const { used } = recipeIngredients(candidate.recipe);
  const urgent = used.filter((ingredient) =>
    pantry.some((item) => {
      const days = item.expires_on ? Math.ceil((new Date(item.expires_on).getTime() - Date.now()) / 86400000) : 999;
      return (item.name.toLowerCase().includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(item.name.toLowerCase())) && days >= 0 && days <= 3;
    }),
  );
  const time = Number(candidate.recipe.recipe_data?.time ?? candidate.recipe.recipe_data?.time_minutes ?? 999);
  return {
    pantry: `${candidate.pantryCoverage}% pantry coverage`,
    expiry: urgent.length ? `Uses ${urgent.slice(0, 2).map((item) => item.name).join(" and ")} before expiry` : "No urgent expiry match",
    time: time <= maxMinutes ? `Fits your ${maxMinutes}-minute limit` : `Exceeds your ${maxMinutes}-minute limit`,
    preference: preferences.length ? `Checked against ${preferences.join(", ")}` : "No dietary preference filter",
  };
}


export function buildSmartMealCandidates(
  recipes: SavedRecipeOption[],
  pantry: PantryRow[],
  maxMinutes: number,
  preferences: string[],
  plannedRecipeIds: string[] = [],
): MealPlanCandidate[] {
  const planned = new Set(plannedRecipeIds);
  const pantryNames = pantry.map((item) => ({
    name: item.name.toLowerCase(),
    days: item.expires_on ? Math.ceil((new Date(item.expires_on).getTime() - Date.now()) / 86400000) : 999,
  }));
  const meat = ["chicken", "beef", "pork", "mutton", "lamb", "fish", "salmon", "tuna", "shrimp", "prawn", "meat", "turkey"];
  const dairy = ["milk", "cream", "cheese", "parmesan", "yogurt", "butter", "ghee"];

  return recipes.map((recipe) => {
    const base = rankPantryAwareMeals([recipe])[0];
    const { used } = recipeIngredients(recipe);
    const urgent = used.filter((ingredient) => pantryNames.some((item) =>
      (item.name.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(item.name)) && item.days >= 0 && item.days <= 3,
    )).length;
    const time = Number(recipe.recipe_data?.time ?? recipe.recipe_data?.time_minutes ?? 999);
    const values = [...used, ...(Array.isArray(recipe.recipe_data?.missing) ? recipe.recipe_data.missing.filter((x): x is string => typeof x === "string") : []), recipe.title].map(String).join(" ").toLowerCase();
    const nutrition = recipe.recipe_data?.nutrition as { protein?: number } | undefined;
    let preferenceFit = 0;
    if (preferences.includes("Vegetarian") && !containsAny([values], meat)) preferenceFit++;
    if (preferences.includes("Dairy-free") && !containsAny([values], dairy)) preferenceFit++;
    if (preferences.includes("High protein") && Number(nutrition?.protein ?? 0) >= 20) preferenceFit++;
    const preferenceRatio = preferences.length ? preferenceFit / preferences.length : 1;
    const timeFit = time <= maxMinutes ? 1 : Math.max(0, maxMinutes / Math.max(time, 1));
    const repeatPenalty = planned.has(recipe.id) ? 25 : 0;
    const score = base.pantryCoverage * 0.45 + Math.min(urgent, 3) * 12 + preferenceRatio * 20 + timeFit * 10 - repeatPenalty;
    return {
      ...base,
      reason: urgent
        ? `Uses ${urgent} pantry ingredient${urgent === 1 ? "" : "s"} before expiry · ${base.pantryCoverage}% pantry coverage`
        : time <= maxMinutes
          ? `${time} min fits your ${maxMinutes}-minute limit · ${base.pantryCoverage}% pantry coverage`
          : base.reason,
      _score: score,
    };
  })
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...candidate }) => candidate)
    .slice(0, 6);
}
