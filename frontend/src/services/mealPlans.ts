import { supabase } from "../lib/supabase";

export type MealPlanRow = {
  id: string;
  plan_date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  recipe_id: string | null;
  notes: string | null;
};

async function userId() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function listMealPlans(startDate: string, endDate: string): Promise<MealPlanRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("meal_plans")
    .select("id,plan_date,meal_type,recipe_id,notes")
    .gte("plan_date", startDate).lte("plan_date", endDate)
    .order("plan_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MealPlanRow[];
}

export async function createMealPlan(input: {
  plan_date: string;
  meal_type: MealPlanRow["meal_type"];
  recipe_id?: string | null;
  notes?: string | null;
}) {
  if (!supabase) return null;
  const id = await userId();
  if (!id) throw new Error("Please sign in before planning meals.");
  const { data, error } = await supabase.from("meal_plans")
    .upsert({ ...input, user_id: id }, { onConflict: "user_id,plan_date,meal_type" })
    .select("id,plan_date,meal_type,recipe_id,notes").single();
  if (error) throw error;
  return data as MealPlanRow;
}

export async function deleteMealPlan(id: string) {
  if (!supabase) return false;
  const { error } = await supabase.from("meal_plans").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export type SavedRecipeOption = { id: string; title: string; recipe_data: Record<string, unknown> };

export async function listSavedRecipeOptions(): Promise<SavedRecipeOption[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("saved_recipes")
    .select("id,title,recipe_data").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedRecipeOption[];
}
