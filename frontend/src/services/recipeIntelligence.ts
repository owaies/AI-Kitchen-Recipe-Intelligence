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
  substitutions?: string[];
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

{
  title: "Masala Egg Bhurji",
  cuisine: "Indian",
  time: 20,
  difficulty: "Easy",
  ingredients: ["egg", "onion", "tomato"],
  optional: ["chili", "coriander", "turmeric"],
  reason: "A quick Indian-style skillet that turns everyday pantry staples into a spiced meal.",
  steps: ["Sauté onion with spices.", "Add tomato and cook until soft.", "Stir in beaten eggs and cook until just set."],
  nutrition: { calories: 310, protein: 20, carbs: 13, fat: 20 },
},
{
  title: "Sesame Garlic Noodles",
  cuisine: "Chinese",
  time: 18,
  difficulty: "Easy",
  ingredients: ["noodles", "garlic", "soy sauce"],
  optional: ["sesame", "onion", "chili"],
  reason: "A fast Chinese-inspired noodle bowl built from flexible pantry staples.",
  steps: ["Cook noodles and reserve a little water.", "Sauté garlic and add soy sauce.", "Toss noodles through the sauce and finish with sesame."],
  nutrition: { calories: 440, protein: 12, carbs: 67, fat: 14 },
},
{
  title: "Thai Coconut Curry Bowl",
  cuisine: "Thai",
  time: 30,
  difficulty: "Medium",
  ingredients: ["coconut milk", "onion", "garlic"],
  optional: ["chili", "lime", "basil"],
  reason: "A fragrant Thai-style curry base that adapts well to vegetables already in the kitchen.",
  steps: ["Sauté aromatics until fragrant.", "Add coconut milk and simmer gently.", "Add available vegetables and cook until tender."],
  nutrition: { calories: 390, protein: 8, carbs: 28, fat: 28 },
},
{
  title: "Mexican Tomato Bean Bowl",
  cuisine: "Mexican",
  time: 20,
  difficulty: "Easy",
  ingredients: ["tomato", "beans", "onion"],
  optional: ["avocado", "lime", "corn"],
  reason: "A bright Mexican-inspired bowl that makes inexpensive pantry ingredients useful.",
  steps: ["Cook onion until softened.", "Add tomato and beans, then simmer with seasoning.", "Finish with avocado or lime if available."],
  nutrition: { calories: 350, protein: 16, carbs: 48, fat: 10 },
},
{
  title: "Miso Ginger Rice Bowl",
  cuisine: "Japanese",
  time: 25,
  difficulty: "Easy",
  ingredients: ["rice", "miso", "ginger"],
  optional: ["egg", "soy sauce", "sesame"],
  reason: "A comforting Japanese-inspired bowl with a savory miso base.",
  steps: ["Warm cooked rice.", "Whisk miso with a little warm water and ginger.", "Top rice with the sauce and available protein or vegetables."],
  nutrition: { calories: 380, protein: 12, carbs: 64, fat: 9 },
},
{
  title: "Mediterranean Chickpea Salad",
  cuisine: "Mediterranean",
  time: 15,
  difficulty: "Easy",
  ingredients: ["chickpeas", "tomato", "lemon"],
  optional: ["cucumber", "basil", "olive oil"],
  reason: "A fresh Mediterranean bowl that needs little cooking and uses pantry-friendly staples.",
  steps: ["Drain and rinse chickpeas.", "Chop tomato and available vegetables.", "Toss everything with lemon, seasoning, and olive oil."],
  nutrition: { calories: 330, protein: 14, carbs: 45, fat: 11 },
},
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
