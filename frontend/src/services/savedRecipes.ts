import { supabase } from "../lib/supabase";
import type { SmartRecipe } from "./recipeIntelligence";

export async function saveGeneratedRecipe(recipe: SmartRecipe): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("Please sign in before saving recipes.");

  const { error } = await supabase.from("saved_recipes").insert({
    user_id: userId,
    title: recipe.title,
    source: "gemini",
    recipe_data: recipe,
  });
  if (error) throw error;
  return true;
}
