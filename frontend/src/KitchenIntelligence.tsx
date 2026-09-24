import { Clock3, Flame, Leaf, Sparkles } from "lucide-react";
import type { PantryRow } from "./services/pantry";
import { generateRecipeIntelligence, type SmartRecipe } from "./services/recipeIntelligence";

type Props = {
  pantry: PantryRow[];
  onExplore: () => void;
};

function daysUntil(value: string | null) {
  if (!value) return null;
  const target = new Date(value + "T23:59:59");
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function urgency(days: number | null) {
  if (days === null) return { label: "No expiry", tone: "neutral" };
  if (days < 0) return { label: "Expired", tone: "danger" };
  if (days === 0) return { label: "Use today", tone: "danger" };
  if (days === 1) return { label: "Use tomorrow", tone: "danger" };
  if (days <= 3) return { label: days + " days left", tone: "warn" };
  return { label: days + " days", tone: "neutral" };
}

function scoreKitchen(pantry: PantryRow[]) {
  if (!pantry.length) return 0;
  const pressure = pantry.reduce((total, item) => {
    const days = daysUntil(item.expires_on);
    if (days === null) return total;
    if (days < 0) return total + 30;
    if (days <= 1) return total + 18;
    if (days <= 3) return total + 10;
    if (days <= 7) return total + 4;
    return total;
  }, 0);
  return Math.max(38, Math.min(98, 100 - Math.round(pressure / pantry.length)));
}

function recipeExpiryBoost(recipe: SmartRecipe, expiring: PantryRow[]) {
  const names = expiring.map((item) => item.name.toLowerCase());
  return recipe.used.reduce((score, ingredient) => (
    names.some((name) => name.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(name))
      ? score + 25
      : score
  ), 0);
}

export default function KitchenIntelligence({ pantry, onExplore }: Props) {
  const scoredPantry = pantry
    .map((item) => ({ item, days: daysUntil(item.expires_on) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const atRisk = scoredPantry.filter(({ days }) => days !== null && days <= 3);
  const expiring = scoredPantry.filter(({ days }) => days !== null && days >= 0 && days <= 7);
  const score = scoreKitchen(pantry);

  const recommendations = generateRecipeIntelligence(pantry)
    .map((recipe) => ({ recipe, score: recipe.match + recipeExpiryBoost(recipe, atRisk.map(({ item }) => item)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ recipe }) => recipe);

  return (
    <section className="kitchen-intelligence intelligence-board">
      <div className="intelligence-board-head">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> AI kitchen intelligence</span>
          <h2>Cook with urgency, not guesswork.</h2>
          <p>Your expiry signals now become recipe context. Ingredients that need attention are surfaced first and can be prioritized by the AI recipe generator.</p>
        </div>
        <button className="intelligence-ask" onClick={onExplore}><Sparkles size={14} /> Ask the kitchen</button>
      </div>

      <div className="intelligence-score-grid">
        <div className="intelligence-score-card">
          <span>Kitchen freshness</span>
          <strong>{score}<small>/100</small></strong>
          <div className="intelligence-progress"><i style={{ width: score + "%" }} /></div>
          <p>{score >= 80 ? "Your pantry has low expiry pressure." : "A few ingredients deserve attention."}</p>
        </div>
        <div className="intelligence-mini-card"><Flame size={17} /><strong>{atRisk.length}</strong><span>at risk within 3 days</span></div>
        <div className="intelligence-mini-card"><Leaf size={17} /><strong>{expiring.length}</strong><span>ingredients to prioritize</span></div>
      </div>

      <div className="intelligence-board-grid">
        <div className="intelligence-use-first">
          <div className="intelligence-subhead"><div><span className="eyebrow">Use first</span><h3>Expiry queue</h3></div><Clock3 size={17} /></div>
          {atRisk.slice(0, 4).map(({ item, days }) => {
            const status = urgency(days);
            return (
              <div className="intelligence-ingredient" key={item.id}>
                <div className="intelligence-ingredient-mark">{item.name.slice(0, 1)}</div>
                <div><strong>{item.name}</strong><small>{item.quantity ?? 1} {item.unit ?? "item"}</small></div>
                <span className={status.tone}>{status.label}</span>
              </div>
            );
          })}
          {atRisk.length === 0 && <div className="intelligence-empty">No ingredients are currently inside the three-day urgency window.</div>}
        </div>

        <div className="intelligence-recommendations">
          <div className="intelligence-subhead"><div><span className="eyebrow">Priority recipes</span><h3>What the kitchen suggests</h3></div><button onClick={onExplore}>See all →</button></div>
          {recommendations.map((recipe) => (
            <button className="intelligence-recipe" key={recipe.id} onClick={onExplore}>
              <img src={recipe.image} alt="" loading="lazy" />
              <span><strong>{recipe.title}</strong><small>{recipe.match}% pantry match · {recipe.time} min</small></span>
              <i>→</i>
            </button>
          ))}
          {recommendations.length === 0 && <div className="intelligence-empty">Add ingredients to unlock pantry-aware recipe recommendations.</div>}
        </div>
      </div>
    </section>
  );
}
