import { supabase } from "../lib/supabase";

export type PantryRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expires_on: string | null;
};

const fields = "id,name,quantity,unit,category,expires_on";

async function currentUserId() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function listPantryItems(): Promise<PantryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("pantry_items").select(fields).order("expires_on", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPantryItem(input: {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  expires_on?: string | null;
}) {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) throw new Error("Please sign in before adding pantry items.");
  const { data, error } = await supabase.from("pantry_items").insert({ ...input, user_id: userId }).select(fields).single();
  if (error) throw error;
  return data as PantryRow;
}

export async function updatePantryItem(id: string, input: Partial<Omit<PantryRow, "id">>) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("pantry_items").update(input).eq("id", id).select(fields).single();
  if (error) throw error;
  return data as PantryRow;
}

export async function deletePantryItem(id: string) {
  if (!supabase) return false;
  const { error } = await supabase.from("pantry_items").delete().eq("id", id);
  if (error) throw error;
  return true;
}
