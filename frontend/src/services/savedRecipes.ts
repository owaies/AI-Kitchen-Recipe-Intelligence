import { supabase } from "../lib/supabase";
import type { SmartRecipe } from "./recipeIntelligence";

export async function saveGeneratedRecipe(recipe: SmartRecipe): Promise<boolean> {
  if (!supabase) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const userId = userData.user?.id;
  if (!userId) throw new Error("Please sign in before saving recipes.");

  const { data: existing, error: lookupError } = await supabase
    .from("saved_recipes")
    .select("id")
    .eq("user_id", userId)
    .eq("title", recipe.title)
    .limit(1)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await supabase
      .from("saved_recipes")
      .update({
        source: "openrouter",
        recipe_data: recipe,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }

  const { error } = await supabase.from("saved_recipes").insert({
    user_id: userId,
    title: recipe.title,
    source: "openrouter",
    recipe_data: recipe,
  });

  if (error) throw error;
  return true;
}
