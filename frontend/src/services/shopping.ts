import { supabase } from "../lib/supabase";

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  is_purchased: boolean;
  source: string | null;
};

const fields = "id,name,quantity,unit,category,is_purchased,source";

async function currentUserId() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("shopping_items").select(fields).order("is_purchased", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShoppingItem[];
}

export async function createShoppingItem(input: {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  source?: string | null;
}) {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) throw new Error("Please sign in before adding shopping items.");
  const { data, error } = await supabase.from("shopping_items").insert({ ...input, user_id: userId }).select(fields).single();
  if (error) throw error;
  return data as ShoppingItem;
}

export async function toggleShoppingItem(id: string, isPurchased: boolean) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("shopping_items").update({ is_purchased: isPurchased }).eq("id", id).select(fields).single();
  if (error) throw error;
  return data as ShoppingItem;
}

export async function deleteShoppingItem(id: string) {
  if (!supabase) return false;
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
  return true;
}
