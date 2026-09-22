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

const categoryRules: Array<[string, string[]]> = [
  ["Produce", ["apple", "banana", "tomato", "onion", "potato", "carrot", "lemon", "lime", "spinach", "coriander", "cilantro", "basil", "avocado", "cucumber", "pepper", "chilli", "garlic", "ginger"]],
  ["Dairy", ["milk", "yogurt", "cheese", "parmesan", "butter", "cream", "paneer", "ghee"]],
  ["Protein", ["egg", "chicken", "fish", "tofu", "paneer", "beans", "chickpeas", "lentils"]],
  ["Grains", ["rice", "pasta", "bread", "noodle", "oats", "flour", "atta"]],
];

function canonicalName(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    tomatoes: "tomato",
    potatoes: "potato",
    onions: "onion",
    carrots: "carrot",
    apples: "apple",
    bananas: "banana",
    lemons: "lemon",
    limes: "lime",
    eggs: "egg",
    noodles: "noodle",
    chickpeas: "chickpea",
  };
  return aliases[normalized] ?? normalized;
}

function inferCategory(name: string) {
  const canonical = canonicalName(name);
  for (const [category, keywords] of categoryRules) {
    if (keywords.some((keyword) => canonical.includes(keyword))) return category;
  }
  return "Pantry";
}

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

  const name = input.name.trim();
  if (!name) throw new Error("Shopping item name cannot be empty.");

  const { data, error } = await supabase
    .from("shopping_items")
    .insert({
      ...input,
      name,
      category: input.category ?? inferCategory(name),
      user_id: userId,
    })
    .select(fields)
    .single();

  if (error) throw error;
  return data as ShoppingItem;
}

export async function addUniqueShoppingItems(names: string[], source = "meal-plan") {
  if (!supabase) return { added: 0, skipped: 0 };

  const current = await listShoppingItems();
  const existing = new Set(
    current
      .filter((item) => !item.is_purchased)
      .map((item) => canonicalName(item.name)),
  );

  const uniqueNames = Array.from(
    new Map(
      names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [canonicalName(name), name]),
    ).values(),
  );

  let added = 0;
  let skipped = 0;

  for (const name of uniqueNames) {
    const key = canonicalName(name);
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }

    await createShoppingItem({
      name,
      quantity: 1,
      unit: "item",
      category: inferCategory(name),
      source,
    });

    existing.add(key);
    added += 1;
  }

  return { added, skipped };
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
