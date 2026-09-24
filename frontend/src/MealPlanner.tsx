import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Check, Clock3, Plus, ShoppingBasket, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import { createMealPlan, deleteMealPlan, listMealPlans, listSavedRecipeOptions, type MealPlanRow, type SavedRecipeOption } from "./services/mealPlans";
import { addUniqueShoppingItems } from "./services/shopping";
import { listPantryItems, type PantryRow } from "./services/pantry";
import { buildMealPlanFocus, buildSmartMealCandidates, explainMealPlanCandidate, type MealPlanCandidate, type MealPlanFocus } from "./services/mealPlanIntelligence";

const meals: { value: MealPlanRow["meal_type"]; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}
function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(12, 0, 0, 0);
  return copy;
}
function prettyDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(value + "T12:00:00"));
}

function missingIngredients(recipe: SavedRecipeOption) {
  const value = recipe.recipe_data?.missing;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function urgencyLabel(value: MealPlanFocus["ingredients"][number]) {
  if (value.urgency === "today") return "today";
  if (value.urgency === "soon") return value.daysLeft === 1 ? "1 day" : `${value.daysLeft} days`;
  if (value.urgency === "expired") return "expired";
  return value.daysLeft === null ? "no date" : `${value.daysLeft} days`;
}

export default function MealPlanner({ maxTime = 45, preferences = [] }: { maxTime?: number; preferences?: string[] }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [plans, setPlans] = useState<MealPlanRow[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeOption[]>([]);
  const [pantryFocus, setPantryFocus] = useState<MealPlanFocus | null>(null);
  const [pantryRows, setPantryRows] = useState<PantryRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState(iso(startOfWeek(new Date())));
  const [mealType, setMealType] = useState<MealPlanRow["meal_type"]>("dinner");
  const [recipeId, setRecipeId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [groceryBusy, setGroceryBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date(week);
    value.setDate(value.getDate() + index);
    return iso(value);
  }), [week]);

  useEffect(() => {
    setDate(days[0]);
    if (!supabase) return;
    Promise.all([
      listMealPlans(days[0], days[6]),
      listSavedRecipeOptions(),
      listPantryItems(),
    ])
      .then(([nextPlans, nextRecipes, pantry]) => {
        setPlans(nextPlans);
        setSavedRecipes(nextRecipes);
        setPantryFocus(buildMealPlanFocus(pantry));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load your meal plan."));
  }, [days]);

  const recipeName = (id: string | null) => savedRecipes.find((recipe) => recipe.id === id)?.title ?? null;

  const smartCandidates = useMemo(
    () => buildSmartMealCandidates(savedRecipes, pantryRows, maxTime, preferences, plans.map((plan) => plan.recipe_id).filter((id): id is string => Boolean(id))),
    [savedRecipes, pantryRows, maxTime, preferences, plans],
  );

  const planCandidate = (candidate: MealPlanCandidate) => {
    setDate(days[0]);
    setMealType("dinner");
    setRecipeId(candidate.recipe.id);
    setNotes(explainMealPlanCandidate(candidate, pantryRows, maxTime, preferences).pantry);
    setShowAdd(true);
  };

  const add = async () => {
    if (!date || busy) return;
    setBusy(true); setMessage("");
    try {
      if (supabase) {
        const row = await createMealPlan({ plan_date: date, meal_type: mealType, recipe_id: recipeId || null, notes: notes.trim() || null });
        if (row) setPlans((items) => [...items.filter((item) => !(item.plan_date === row.plan_date && item.meal_type === row.meal_type)), row]);
      } else {
        setPlans((items) => [...items, { id: "local-" + Date.now(), plan_date: date, meal_type: mealType, recipe_id: null, notes: notes.trim() || null }]);
      }
      setShowAdd(false); setNotes(""); setRecipeId("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add meal.");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setPlans((items) => items.filter((item) => item.id !== id));
    if (supabase) {
      try { await deleteMealPlan(id); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove meal."); }
    }
  };

  const moveMeal = async (id: string, targetDate: string, targetType: MealPlanRow["meal_type"]) => {
    const source = plans.find((item) => item.id === id);
    if (!source || (source.plan_date === targetDate && source.meal_type === targetType)) return;
    try {
      if (supabase) {
        const moved = await createMealPlan({ plan_date: targetDate, meal_type: targetType, recipe_id: source.recipe_id, notes: source.notes });
        if (moved) {
          await deleteMealPlan(source.id);
          setPlans((items) => [...items.filter((item) => item.id !== source.id && !(item.plan_date === targetDate && item.meal_type === targetType)), moved]);
        }
      } else {
        setPlans((items) => items.map((item) => item.id === id ? { ...item, plan_date: targetDate, meal_type: targetType } : item));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not move meal.");
    } finally { setDraggingId(null); }
  };

  const buildGroceryList = async () => {
    if (groceryBusy) return;
    if (!supabase) {
      setMessage("Sign in with Supabase to build a persistent grocery list from your meal plan.");
      return;
    }
    setGroceryBusy(true);
    setMessage("");
    try {
      const recipeById = new Map(savedRecipes.map((recipe) => [recipe.id, recipe]));
      const weekPlans = plans.filter((plan) => days.includes(plan.plan_date) && plan.recipe_id);
      const missing = weekPlans.flatMap((plan) => {
        const recipe = plan.recipe_id ? recipeById.get(plan.recipe_id) : null;
        return recipe ? missingIngredients(recipe) : [];
      });
      if (missing.length === 0) {
        setMessage("No missing ingredients found on this week's saved recipes.");
        return;
      }
      const result = await addUniqueShoppingItems(missing, "meal-plan");
      setMessage(result.added
        ? `Added ${result.added} grocery item${result.added === 1 ? "" : "s"} to your shopping list${result.skipped ? ` · ${result.skipped} already listed` : ""}.`
        : "Those ingredients are already on your shopping list.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not build the grocery list.");
    } finally {
      setGroceryBusy(false);
    }
  };

  return (
    <section className="meal-plan-page">
      <div className="section-head meal-plan-head">
        <div>
          <span className="eyebrow"><CalendarDays size={13} /> Weekly rhythm</span>
          <h2>A plan worth cooking.</h2>
          <p>Place saved recipes across the week, keep a note for each meal, and turn planning into a grocery-ready routine.</p>
        </div>
        <div className="meal-plan-actions">
          <button className="ghost" onClick={buildGroceryList} disabled={groceryBusy}><ShoppingBasket size={15} /> {groceryBusy ? "Building list..." : "Build grocery list"}</button>
          <button className="primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Plan a meal</button>
        </div>
      </div>

      {message && <div className="pantry-error">{message}</div>}

      {pantryFocus && (
        <section className="kitchen-intelligence meal-plan-intelligence">
          <div className="intelligence-heading">
            <span className="eyebrow"><Clock3 size={13} /> Freshness-aware planning</span>
            <h2>{pantryFocus.headline}</h2>
            <p>{pantryFocus.description}</p>
          </div>
          <div className="intelligence-metrics">
            {pantryFocus.ingredients.map((item) => (
              <div key={item.id} className={item.urgency === "expired" || item.urgency === "today" ? "urgent" : ""}>
                <strong>{item.name}</strong>
                <span>{urgencyLabel(item)}</span>
              </div>
            ))}
            {pantryFocus.ingredients.length === 0 && (
              <div><strong>Pantry ready</strong><span>No expiry pressure</span></div>
            )}
            <button onClick={() => setShowAdd(true)}>Plan around it <Plus size={14} /></button>
          </div>
        </section>
      )}

      {smartCandidates.length > 0 && (
        <section className="meal-smart-board">
          <div className="section-head">
            <div>
              <span className="eyebrow"><Sparkles size={13} /> Smart meal planning</span>
              <h2>Meals shaped around your kitchen.</h2>
              <p>Suggestions balance pantry coverage, expiry pressure, preferences, cooking time, and variety.</p>
            </div>
          </div>
          <div className="meal-smart-grid">
            {smartCandidates.slice(0, 3).map((candidate) => {
              const explanation = explainMealPlanCandidate(candidate, pantryRows, maxTime, preferences);
              return (
                <article className="meal-smart-card" key={candidate.recipe.id}>
                  <div>
                    <span className="eyebrow">{candidate.pantryCoverage}% pantry fit</span>
                    <h3>{candidate.recipe.title}</h3>
                    <p>{candidate.reason}</p>
                  </div>
                  <div className="meal-smart-signals">
                    <span>{explanation.pantry}</span>
                    <span>{explanation.expiry}</span>
                    <span>{explanation.time}</span>
                  </div>
                  <button className="primary" onClick={() => planCandidate(candidate)}>Plan this meal <Plus size={14} /></button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="week-toolbar">
        <button className="ghost" onClick={() => setWeek((current) => new Date(current.getTime() - 7 * 86400000))}>← Previous</button>
        <strong>{prettyDate(days[0])} · {prettyDate(days[6])}</strong>
        <button className="ghost" onClick={() => setWeek((current) => new Date(current.getTime() + 7 * 86400000))}>Next →</button>
      </div>

      <div className="meal-plan-grid">
        {days.map((day) => (
          <article className="meal-day" key={day}>
            <header><span>{new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date(day + "T12:00:00"))}</span><strong>{new Date(day + "T12:00:00").getDate()}</strong></header>
            <div className="meal-slots">
              {meals.map((meal) => {
                const planned = plans.find((item) => item.plan_date === day && item.meal_type === meal.value);
                return (
                  <div className={planned ? "meal-slot filled" : "meal-slot"} key={meal.value} onDragOver={(event) => planned && event.preventDefault()} onDrop={() => draggingId && moveMeal(draggingId, day, meal.value)}>
                    <small>{meal.label}</small>
                    {planned ? (
                      <motion.div draggable onDragStart={() => setDraggingId(planned.id)} onDragEnd={() => setDraggingId(null)} className="planned-meal" whileDrag={{scale:1.03,rotate:1,boxShadow:"0 18px 35px rgba(46,36,29,.2)"}}>
                        <span>{recipeName(planned.recipe_id) ?? planned.notes ?? "Kitchen idea"}</span>
                        {planned.notes && recipeName(planned.recipe_id) && <em>{planned.notes}</em>}
                        <button onClick={() => remove(planned.id)} aria-label={"Remove " + meal.label}><Trash2 size={12} /></button>
                      </motion.div>
                    ) : <button className="slot-add" onClick={() => { setDate(day); setMealType(meal.value); setShowAdd(true); }}>+ Add</button>}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {showAdd && (
        <div className="modal-backdrop" onMouseDown={() => !busy && setShowAdd(false)}>
          <div className="modal meal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            <span className="eyebrow"><CalendarDays size={13} /> Meal plan</span>
            <h2>Plan a meal</h2>
            <div className="edit-grid">
              <label>DATE<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label>MEAL<select value={mealType} onChange={(event) => setMealType(event.target.value as MealPlanRow["meal_type"])}>{meals.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</select></label>
              <label className="full-field">SAVED RECIPE<select value={recipeId} onChange={(event) => setRecipeId(event.target.value)}><option value="">Kitchen idea / note only</option>{savedRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}</select></label>
              <label className="full-field">NOTE<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. add extra lemon, use the spinach first" /></label>
            </div>
            {savedRecipes.length === 0 && <div className="meal-hint"><Check size={14} /> Save a generated recipe first to attach it to this meal.</div>}
            <button className="primary full" onClick={add} disabled={busy}>{busy ? "Planning..." : <>Add to week <Check size={15} /></>}</button>
          </div>
        </div>
      )}
    </section>
  );
}
