import { supabase } from "../lib/supabase";

export type PantryRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expires_on: string | null;
};

export async function listPantryItems(): Promise<PantryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("pantry_items")
    .select("id,name,quantity,unit,category,expires_on")
    .order("expires_on", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}
