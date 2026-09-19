import type { PantryRow } from "./pantry";

export type SmartRecipe = {
  id: string;
  title: string;
  cuisine: string;
  time: number;
  difficulty: "Easy" | "Medium";
  match: number;
  used: string[];
  missing: string[];
  reason: string;
  steps: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
};

type Template = {
  title: string;
  cuisine: string;
  time: number;
  difficulty: SmartRecipe["difficulty"];
  ingredients: string[];
  optional?: string[];
  reason: string;
  steps: string[];
  nutrition: SmartRecipe["nutrition"];
};

const templates: Template[] = [
  {
    title: "Tomato & Basil Toast",
    cuisine: "Mediterranean",
    time: 12,
    difficulty: "Easy",
    ingredients: ["tomato", "basil", "bread"],
    optional: ["olive oil", "garlic"],
    reason: "Uses fresh produce before it loses its best texture.",
    steps: ["Toast the bread until crisp.", "Chop tomato and basil, then season.", "Spoon the mixture over toast and finish with olive oil."],
    nutrition: { calories: 290, protein: 8, carbs: 42, fat: 10 },
  },
  {
    title: "Garden Egg Skillet",
    cuisine: "Breakfast",
    time: 18,
    difficulty: "Easy",
    ingredients: ["egg", "tomato", "onion"],
    optional: ["spinach", "basil", "cheese"],
    reason: "Turns everyday staples into a fast, protein-rich meal.",
    steps: ["Soften onion in a hot pan.", "Add tomato and cook until jammy.", "Crack in eggs, cover, and cook until set."],
    nutrition: { calories: 330, protein: 20, carbs: 15, fat: 21 },
  },
  {
    title: "Avocado Garden Bowl",
    cuisine: "Fresh",
    time: 15,
    difficulty: "Easy",
    ingredients: ["avocado", "tomato", "lettuce"],
    optional: ["lemon", "cucumber", "egg"],
    reason: "Prioritizes ingredients that are best eaten fresh.",
    steps: ["Slice avocado and tomato.", "Layer vegetables in a bowl.", "Add lemon, seasoning, and your available protein."],
    nutrition: { calories: 360, protein: 9, carbs: 25, fat: 27 },
  },
  {
    title: "Creamy Garlic Pasta",
    cuisine: "Italian",
    time: 25,
    difficulty: "Medium",
    ingredients: ["pasta", "garlic", "milk"],
    optional: ["parmesan", "butter", "spinach"],
    reason: "A flexible pantry-first dinner built around reliable staples.",
    steps: ["Cook pasta and reserve a little pasta water.", "Sauté garlic gently, then add milk.", "Toss with pasta and loosen with pasta water."],
    nutrition: { calories: 520, protein: 17, carbs: 76, fat: 16 },
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export function generateRecipeIntelligence(pantry: PantryRow[]): SmartRecipe[] {
  const names = pantry.map((item) => normalize(item.name));
  return templates
    .map((template) => {
      const used = template.ingredients.filter((ingredient) => names.some((name) => name.includes(ingredient) || ingredient.includes(name)));
      const missing = template.ingredients.filter((ingredient) => !used.includes(ingredient));
      const optionalHits = (template.optional ?? []).filter((ingredient) => names.some((name) => name.includes(ingredient)));
      const total = template.ingredients.length;
      const match = Math.round(((used.length + optionalHits.length * 0.15) / total) * 100);
      return { ...template, id: normalize(template.title).replaceAll(" ", "-"), match: Math.min(99, match), used, missing };
    })
    .filter((recipe) => recipe.used.length > 0)
    .sort((a, b) => b.match - a.match)
    .slice(0, 6)
    .map(({ ingredients, optional, ...recipe }) => recipe as SmartRecipe);
}
