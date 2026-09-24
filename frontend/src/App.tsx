import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, CalendarDays, Camera, Check, ChevronRight, Clock3, Leaf,
Plus, Search, ShoppingBasket, Sparkles, Utensils, X,
} from "lucide-react";
import AuthScreen from "./AuthScreen";
import ShoppingList from "./ShoppingList";
import MealPlanner from "./MealPlanner";
import PageTransitionScene from "./PageTransitionScene";
import CookMode from "./CookMode";
import PantryCupboard from "./PantryCupboard";
import { supabase } from "./lib/supabase";
import { signOut } from "./services/auth";
import { createPantryItem, deletePantryItem, listPantryItems, updatePantryItem } from "./services/pantry";
import { generateRecipeIntelligence, type SmartRecipe } from "./services/recipeIntelligence";
import { generateAIRecipe, streamAIRecipe } from "./services/aiRecipe";
import { saveGeneratedRecipe } from "./services/savedRecipes";
import { detectIngredientsFromPhoto, type DetectedIngredient } from "./services/vision";
import type { Session } from "@supabase/supabase-js";

type SelectOption = { value: string | number; label: string };

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 650;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}{suffix}</>;
}

function CustomSelect({ label, value, options, onChange }: { label: string; value: string | number; options: SelectOption[]; onChange: (value: string | number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="custom-select-field" ref={ref}>
      <span className="custom-select-label">{label}</span>
      <button
        type="button"
        className={open ? "custom-select-trigger open" : "custom-select-trigger"}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label}</span><ChevronRight size={13} className="custom-select-chevron" />
      </button>
      {open && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "custom-select-option selected" : "custom-select-option"}
              key={String(option.value)}
              onClick={() => { onChange(option.value); setOpen(false); }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type PantryItem = {
  id: string;
  name: string;
  amount: string;
  category: string;
  expiry: string;
  days: number;
};

const demoPantry: PantryItem[] = [
  { id: "demo-1", name: "Avocado", amount: "2 pcs", category: "Produce", expiry: "Today", days: 0 },
  { id: "demo-2", name: "Cherry tomatoes", amount: "250 g", category: "Produce", expiry: "Tomorrow", days: 1 },
  { id: "demo-3", name: "Eggs", amount: "6 pcs", category: "Dairy", expiry: "4 days", days: 4 },
  { id: "demo-4", name: "Basil", amount: "1 bunch", category: "Herbs", expiry: "5 days", days: 5 },
];

const recipes = [
  { title: "Tomato & Basil Toast", time: "12 min", tag: "Uses 4 pantry items", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80" },
  { title: "Green Goddess Eggs", time: "18 min", tag: "High protein", image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80" },
  { title: "Avocado Garden Bowl", time: "15 min", tag: "Fresh & bright", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80" },
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const { scrollY } = useScroll();
  const storyY = useTransform(scrollY, [0, 700], [0, -38]);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [active, setActive] = useState("Overview");
  const [transitionScene, setTransitionScene] = useState<"kitchen" | "cupboards" | "recipes" | "meal-plan" | "shopping" | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>(demoPantry);
  const [pantryLoading, setPantryLoading] = useState(Boolean(supabase));
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnit, setEditUnit] = useState("item");
  const [editCategory, setEditCategory] = useState("Pantry");
  const [editExpiry, setEditExpiry] = useState("");
  const [pantryBusy, setPantryBusy] = useState(false);
  const [pantryError, setPantryError] = useState("");
  const [recipeResults, setRecipeResults] = useState<SmartRecipe[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiStage, setAiStage] = useState("Ready");
  const [aiStreamChars, setAiStreamChars] = useState(0);
  const [aiReasoningTokens, setAiReasoningTokens] = useState<number | null>(null);
  const [aiGoal, setAiGoal] = useState("a practical dinner using the pantry");
  const [aiMaxTime, setAiMaxTime] = useState(45);
  const [aiCuisine, setAiCuisine] = useState("Any cuisine");
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<SmartRecipe | null>(null);
  const [cookRecipe, setCookRecipe] = useState<SmartRecipe | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoIngredients, setPhotoIngredients] = useState<string[]>([]);
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedIngredient[]>([]);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ingredientBridge, setIngredientBridge] = useState<{ name: string; image: string } | null>(null);
  const [photoStage, setPhotoStage] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    const displayName = session.user.user_metadata?.display_name ?? session.user.email?.split("@")[0] ?? null;
    supabase.from("profiles").upsert({
      id: session.user.id,
      display_name: displayName,
    }).then(({ error }) => {
      if (error) console.error("Profile sync failed", error);
    });
    listPantryItems()
      .then((rows) => {
        setPantry(rows.map((row) => ({
          id: row.id,
          name: row.name,
          amount: row.quantity == null ? "Amount not set" : `${row.quantity} ${row.unit ?? ""}`.trim(),
          category: row.category ?? "Pantry",
          expiry: row.expires_on ?? "No expiry",
          days: row.expires_on
            ? Math.ceil((new Date(row.expires_on).getTime() - Date.now()) / 86400000)
            : 999,
        })));
      })
      .catch((error) => console.error("Pantry load failed", error))
      .finally(() => setPantryLoading(false));
  }, [session]);

  useEffect(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(".magnetic"));
    const handlers = buttons.map((button) => {
      const move = (event: PointerEvent) => {
        const rect = button.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - .5) * 7;
        const y = ((event.clientY - rect.top) / rect.height - .5) * 7;
        button.style.transform = `translate3d(${x}px,${y}px,0)`;
      };
      const leave = () => { button.style.transform = ""; };
      button.addEventListener("pointermove", move);
      button.addEventListener("pointerleave", leave);
      return () => { button.removeEventListener("pointermove", move); button.removeEventListener("pointerleave", leave); };
    });
    return () => handlers.forEach((cleanup) => cleanup());
  }, [active]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? null : current), 2800);
  };

  const findRecipesForIngredient = (item: { name: string }) => {
    const image = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80";
    setIngredientBridge({ name: item.name, image });
    window.setTimeout(() => { setIngredientBridge(null); navigateTo("Recipes"); }, 650);
  };

  const navigateTo = (page: string) => {
    if (page === active || transitionScene) return;

    const scenes: Record<string, typeof transitionScene> = {
      Overview: "kitchen",
      Pantry: "cupboards",
      Recipes: "recipes",
      "Meal plan": "meal-plan",
      "Shopping list": "shopping",
    };
    const scene = scenes[page];
    if (!scene) {
      setActive(page);
      return;
    }

    if (active === "Pantry" && page === "Recipes" && pantry.length) {
      const first = [...pantry].sort((a,b) => a.days - b.days)[0];
      setIngredientBridge({ name: first.name, image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80" });
      window.setTimeout(() => setIngredientBridge(null), 720);
    }
    setTransitionScene(scene);
    window.setTimeout(() => {
      setActive(page);
      window.setTimeout(() => setTransitionScene(null), 520);
    }, 760);
  };

  const filtered = useMemo(
    () => pantry.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [pantry, query],
  );

  const addIngredient = async () => {
    const name = newIngredient.trim();
    if (!name) return;

    if (session) {
      try {
        const row = await createPantryItem({
          name,
          quantity: 1,
          unit: "item",
          category: "Pantry",
        });
        if (row) {
          setPantry((items) => [
            ...items,
            { id: row.id, name: row.name, amount: "1 item", category: "Pantry", expiry: "No expiry", days: 999 },
          ]);
        }
      } catch (error) {
        setQuery(error instanceof Error ? error.message : "Could not add ingredient.");
      }
    } else {
      setPantry((items) => [
        ...items,
        { id: String(Date.now()), name, amount: "1 item", category: "Pantry", expiry: "7 days", days: 7 },
      ]);
    }
    setNewIngredient("");
    setShowAdd(false);
    showToast(`${name} added to your pantry`);
  };

  const openEdit = (item: PantryItem) => {
    setEditing(item); setEditName(item.name); setEditQuantity(item.amount.split(" ")[0] || "1");
    setEditUnit(item.amount.split(" ").slice(1).join(" ") || "item"); setEditCategory(item.category);
    setEditExpiry(/^\\d{4}-\\d{2}-\\d{2}$/.test(item.expiry) ? item.expiry : ""); setPantryError("");
  };

  const savePantryEdit = async () => {
    if (!editing || !editName.trim()) return;
    setPantryBusy(true); setPantryError("");
    try {
      if (session) {
        const row = await updatePantryItem(editing.id, { name: editName.trim(), quantity: Number(editQuantity) || 0, unit: editUnit || "item", category: editCategory || "Pantry", expires_on: editExpiry || null });
        if (row) setPantry((items) => items.map((item) => item.id === editing.id ? { ...item, name: row.name, amount: `${row.quantity ?? 0} ${row.unit ?? ""}`.trim(), category: row.category ?? "Pantry", expiry: row.expires_on ?? "No expiry", days: row.expires_on ? Math.ceil((new Date(row.expires_on).getTime() - Date.now()) / 86400000) : 999 } : item));
      } else {
        setPantry((items) => items.map((item) => item.id === editing.id ? { ...item, name: editName.trim(), amount: `${editQuantity} ${editUnit}`.trim(), category: editCategory, expiry: editExpiry || "No expiry", days: editExpiry ? Math.ceil((new Date(editExpiry).getTime() - Date.now()) / 86400000) : 999 } : item));
      }
      setEditing(null);
    } catch (error) { setPantryError(error instanceof Error ? error.message : "Could not update ingredient."); }
    finally { setPantryBusy(false); }
  };

  const removePantryItem = async (item: PantryItem) => {
    if (!confirm("Remove " + item.name + " from your pantry?")) return;
    setPantryBusy(true); setPantryError("");
    try {
      if (session) await deletePantryItem(item.id);
      setPantry((items) => items.filter((entry) => entry.id !== item.id));
    } catch (error) { setPantryError(error instanceof Error ? error.message : "Could not remove ingredient."); }
    finally { setPantryBusy(false); }
  };
  const handleIngredientPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoMessage("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setPhotoMessage("Image must be smaller than 8 MB."); return; }
    setPhotoName(file.name);
    setPhotoMessage("Photo ready. Confirm the ingredients before adding them.");
    setPhotoIngredients([]);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const addPhotoIngredient = (value: string) => {
    const name = value.trim();
    if (!name || photoIngredients.includes(name)) return;
    setPhotoIngredients((items) => [...items, name]);
  };

  const detectPhotoIngredients = async () => {
    if (!photoPreview) return;
    setPhotoBusy(true);
    setPhotoStage(1);
    setPhotoMessage("Reading image...");
    window.setTimeout(() => setPhotoStage(2), 650);
    window.setTimeout(() => setPhotoStage(3), 1300);
    window.setTimeout(() => setPhotoStage(4), 1950);
    try {
      const detected = await detectIngredientsFromPhoto(photoPreview);
      setDetectedIngredients(detected);
      setPhotoStage(4);
      setPhotoIngredients(detected.map((item) => item.name));
      setPhotoMessage(detected.length ? `Detected ${detected.length} ingredient${detected.length === 1 ? "" : "s"}. Review the selections before saving.` : "No confident ingredients were detected. Try a clearer food photo.");
    } catch (error) {
      setPhotoStage(0);
      setPhotoMessage(error instanceof Error ? error.message : "Ingredient recognition failed.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const addConfirmedPhotoIngredients = async () => {
    for (const name of photoIngredients) {
      if (session) await createPantryItem({ name, quantity: 1, unit: "item", category: "Photo import" });
    }
    setPantry((items) => [...items, ...photoIngredients.map((name, index) => ({ id: "photo-" + Date.now() + "-" + index, name, amount: "1 item", category: "Photo import", expiry: "No expiry", days: 999 }))]);
    setPhotoPreview(null); setPhotoIngredients([]); setDetectedIngredients([]); setPhotoName(""); setShowAdd(false); setPhotoMessage("");
  };

  const generateRecipes = async () => {
    const rows = session ? await listPantryItems() : pantry.map((item) => ({ id: item.id, name: item.name, quantity: 1, unit: "item", category: item.category, expires_on: null }));
    setRecipeResults(generateRecipeIntelligence(rows, aiCuisine));
    setAiMessage("");
    setActive("Recipes");
  };

  const generateAIRecipeFromPantry = async () => {
    setAiBusy(true);
    setAiMessage("");
    setAiStage("Reading your pantry");
    setAiStreamChars(0);
    setAiReasoningTokens(null);
    try {
      const rows = session ? await listPantryItems() : pantry.map((item) => ({ id: item.id, name: item.name, quantity: 1, unit: "item", category: item.category, expires_on: null }));
      const recipe = await streamAIRecipe(rows, aiGoal, aiMaxTime, dietaryPreferences, aiCuisine, (update) => {
        if (update.type === "start") setAiStage(update.fallback ? `Fallback model ${update.attempt ?? ""} is thinking` : `${update.model} is thinking`);
        if (update.type === "delta") {
          setAiStage("Building your recipe");
          setAiStreamChars((count) => count + update.content.length);
        }
        if (update.type === "complete") {
          setAiStage("Recipe assembled");
          setAiReasoningTokens(update.reasoningTokens ?? null);
        }
        if (update.type === "fallback") {
          setAiStage(update.message);
          setAiStreamChars(0);
        }
        if (update.type === "error") setAiStage("AI service unavailable");
      });
      setRecipeResults((items) => [recipe, ...items.filter((item) => item.id !== recipe.id)].slice(0, 6));
      setActive("Recipes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenRouter recipe generation is unavailable.";
      const normalized = message.toLowerCase();
      const quotaUnavailable =
        normalized.includes("429") ||
        normalized.includes("quota") ||
        normalized.includes("resource_exhausted") ||
        normalized.includes("rate limit") ||
        normalized.includes("high demand") ||
        normalized.includes("temporarily") ||
        normalized.includes("503");

      const rows = session ? await listPantryItems() : pantry.map((item) => ({ id: item.id, name: item.name, quantity: 1, unit: "item", category: item.category, expires_on: null }));
      const fallback = generateRecipeIntelligence(rows);
      setRecipeResults(fallback);
      setAiMessage(
        quotaUnavailable
          ? "OpenRouter is temporarily unavailable or rate-limited. Showing pantry-engine recipes instead."
          : "OpenRouter could not complete structured recipe generation. Showing pantry-engine recipes instead.",
      );
      setAiStage("Using pantry engine");
    } finally {
      setAiBusy(false);
    }
  };

  const saveRecipe = (title: string) => {
    setSaved((items) =>
      items.includes(title) ? items.filter((item) => item !== title) : [...items, title],
    );
  };

  if (authLoading) return <div className="auth-loading">Preparing your kitchen...</div>;
  if (supabase && !session) return <AuthScreen onAuthenticated={() => undefined} />;

  return (
    <>
      {transitionScene && <PageTransitionScene scene={transitionScene} />}
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Utensils size={18} /></div>
          <div><strong>Kitchen</strong><span>intelligence</span></div>
        </div>
        <div className="side-label">Your kitchen</div>
        <nav>
          {["Overview", "Pantry", "Recipes", "Meal plan", "Shopping list"].map((item) => (
            <button className={active === item ? "nav-item active" : "nav-item"} key={item} onClick={() => navigateTo(item)} style={{ position: "relative" }}>
              {active === item && <motion.span layoutId="active-nav-indicator" className="nav-active-indicator" style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 999, background: "var(--tomato)", boxShadow: "0 0 16px rgba(207, 70, 54, .28)" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span>{item}</span><ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="side-card">
          <Sparkles size={20} />
          <strong>Cook with what you have.</strong>
          <p>Your pantry has enough for 8 recipe ideas today.</p>
          <button onClick={() => navigateTo("Recipes")}>Explore ideas <ArrowRight size={14} /></button>
        </div>
        <div className="side-footer">Private kitchen workspace · v0.1</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand"><Utensils size={18} /> Kitchen</div>
          <div className="top-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your kitchen..." /></div>
          {session ? (
            <button className="avatar" title="Sign out" onClick={() => signOut()} aria-label="Sign out">
              {session.user.email?.slice(0, 2).toUpperCase() ?? "KI"}
            </button>
          ) : <div className="avatar">MO</div>}
        </header>

        <div className="content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            className="page-motion-shell"
            initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.42, ease: [0.22, 0.8, 0.22, 1] }}
          >
          {active === "Pantry" ? (
            <PantryCupboard
              items={pantry}
              query={query}
              onQueryChange={setQuery}
              onAdd={() => setShowAdd(true)}
              onEdit={openEdit}
              onDelete={removePantryItem}
              onFindRecipes={findRecipesForIngredient}
            />
          ) : active === "Shopping list" ? (
            <ShoppingList onRecipes={() => setActive("Recipes")} />
          ) : active === "Meal plan" ? (
            <MealPlanner />
          ) : active === "Recipes" ? (
            <section className="recipes-page">
              <motion.div className="recipe-intelligence-hero" style={{ y: storyY }}>
                <div>
                  <span className="eyebrow"><Sparkles size={13} /> Pantry intelligence</span>
                  <h2>What can you cook<br /><em>right now?</em></h2>
                  <p>Ask Nemotron to reason over your pantry, dietary preferences and time limit. Missing ingredients and practical substitutions stay visible.</p>
                  <div className="ai-controls">
                    <label className="goal-field">GOAL<input value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} aria-label="Recipe goal" /></label>
                    <CustomSelect label="TIME" value={aiMaxTime} onChange={(value) => setAiMaxTime(Number(value))} options={[{ value: 20, label: "20 min" }, { value: 30, label: "30 min" }, { value: 45, label: "45 min" }, { value: 60, label: "60 min" }]} />
                    <CustomSelect label="CUISINE" value={aiCuisine} onChange={(value) => setAiCuisine(String(value))} options={["Any cuisine", "Indian", "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Korean", "Mediterranean", "Middle Eastern", "American"].map((item) => ({ value: item, label: item }))} />
                    <div className="dietary-controls"><span>DIET</span>{["Vegetarian", "High protein", "Dairy-free"].map((option) => <button type="button" key={option} className={dietaryPreferences.includes(option) ? "selected" : ""} onClick={() => setDietaryPreferences((items) => items.includes(option) ? items.filter((item) => item !== option) : [...items, option])}>{option}<span className="diet-check">{dietaryPreferences.includes(option) ? "✓" : "+"}</span></button>)}</div>
                  </div>
                </div>
                <div className="recipe-actions"><button className="primary magnetic" onClick={generateAIRecipeFromPantry} disabled={aiBusy}><Sparkles size={15} /> {aiBusy ? "Asking Nemotron..." : "Ask Nemotron"}</button><button className="ghost" onClick={generateRecipes}>Use pantry engine</button></div>
              </motion.div>
              {aiBusy && (
                <motion.div className="ai-generation-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <div className="ai-generation-orb"><Sparkles size={18} /></div>
                  <div className="ai-generation-copy">
                    <span className="eyebrow">Live Nemotron generation</span>
                    <strong>{aiStage}<i className="ai-pulse-dots">...</i></strong>
                    <small>{aiStreamChars ? `${aiStreamChars} response characters received` : "Establishing the AI stream..."}</small>
                  </div>
                  <div className="ai-generation-meta">
                    <span className="ai-signal"><i /> streaming</span>
                    {aiReasoningTokens !== null && <span>{aiReasoningTokens} reasoning tokens</span>}
                  </div>
                </motion.div>
              )}
              {aiMessage && <div className="pantry-error">{aiMessage}</div>}
              {recipeResults.length === 0 ? (
                <div className="recipe-empty"><Sparkles size={28} /><h3>Let your pantry lead.</h3><p>Add a few ingredients, then generate recipe ideas built around what you already own.</p><button className="primary magnetic" onClick={generateRecipes}>Generate recipes</button></div>
              ) : (
                <motion.div className="smart-recipe-grid recipe-carousel" layout drag="x" dragConstraints={{left:-700,right:0}} dragElastic={.08}>
                  <AnimatePresence mode="popLayout">
                  {recipeResults.map((recipe) => (
                    <motion.article className="smart-recipe-card" layout key={recipe.id} initial={{opacity:0,scale:.96,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94,y:-8}} onClick={() => setSelectedRecipe(recipe)} whileHover={{ y: -7, scale: 1.008 }} whileTap={{ scale: 0.995 }} transition={{ type: "spring", stiffness: 320, damping: 26 }}>
                      <motion.div layoutId={`recipe-image-${recipe.id}`} className="smart-recipe-photo"><img src={recipe.image} alt="" loading="lazy" /><span>{recipe.cuisine}</span><strong>{recipe.match}% match</strong></motion.div>
                      <div className="smart-recipe-content"><motion.h3 layoutId={`recipe-title-${recipe.id}`}>{recipe.title}</motion.h3><p>{recipe.reason}</p>
                      <div className="recipe-meta"><span><Clock3 size={13} /> {recipe.time} min</span><span>{recipe.difficulty}</span></div>
                      <div className="match-bar"><i style={{ width: recipe.match + "%" }} /></div>
                      <div className="recipe-ingredients"><span>Have: {recipe.used.join(", ") || "none"}</span>{recipe.missing.length > 0 && <span>Need: {recipe.missing.join(", ")}</span>}</div></div>
                    </motion.article>
                  ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </section>
          ) : (
            <> 
          <section className="hero">
            <div>
              <span className="eyebrow"><Leaf size={13} /> Your kitchen, today</span>
              <h1>Good food<br /><em>starts here.</em></h1>
              <p>Turn what’s already in your kitchen into something worth sitting down for.</p>
              <div className="hero-actions">
                <button className="primary" onClick={generateRecipes}><Sparkles size={16} /> Find a recipe</button>
                <button className="ghost" onClick={() => setShowAdd(true)}><Plus size={16} /> Add ingredient</button>
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
              <div className="food-circle" onPointerMove={(event) => { const rect=event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--mx", `${((event.clientX-rect.left)/rect.width-.5)*-8}px`); event.currentTarget.style.setProperty("--my", `${((event.clientY-rect.top)/rect.height-.5)*-8}px`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--mx","0px"); event.currentTarget.style.setProperty("--my","0px"); }}>
                <img src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=85" alt="Fresh ingredients" style={{transform:"translate3d(var(--mx,0px),var(--my,0px),0) scale(1.04)",transition:"transform .45s cubic-bezier(.22,.8,.22,1)"}} />
              </div>
              <div className="floating-note"><Sparkles size={14} /><span><strong>{pantry.filter((i) => i.days <= 2).length}</strong> ingredients<br />need using soon</span></div>
            </div>
          </section>

          <section className="kitchen-intelligence">
            <div className="intelligence-heading">
              <span className="eyebrow"><Sparkles size={13} /> Kitchen intelligence</span>
              <h2>Your kitchen is telling you what to cook.</h2>
            </div>
            <div className="intelligence-metrics">
              <div><strong>{pantry.length}</strong><span>ingredients available</span></div>
              <div className="urgent"><strong>{pantry.filter((i) => i.days <= 2).length}</strong><span>need using soon</span></div>
              <div><strong>{Math.max(1, Math.min(14, pantry.length * 2))}</strong><span>possible meals</span></div>
              <button onClick={() => navigateTo("Recipes")}>Ask your kitchen <ArrowRight size={14} /></button>
            </div>
          </section>

          <section className="stats" aria-label="Kitchen statistics">
            <div><span>Pantry</span><strong><AnimatedNumber value={pantry.length} /></strong><small>ingredients</small></div>
            <div><span>Expiring soon</span><strong><AnimatedNumber value={pantry.filter((i) => i.days <= 2).length} /></strong><small>within 48 hours</small></div>
            <div><span>Saved recipes</span><strong><AnimatedNumber value={saved.length} /></strong><small>in your collection</small></div>
            <div><span>Shopping</span><strong><AnimatedNumber value={7} /></strong><small>items to pick up</small></div>
          </section>

          <section className="section-head">
            <div><span className="eyebrow">Use it first</span><h2>Ingredients with a deadline</h2></div>
            <button className="text-link" onClick={() => navigateTo("Pantry")}>View pantry <ArrowRight size={15} /></button>
          </section>
          <section className="pantry-strip">
            {pantryLoading ? Array.from({length:4}).map((_,index) => <article className="ingredient-card kitchen-skeleton" key={index}><div style={{width:43,height:43,borderRadius:"50%",background:"linear-gradient(90deg,#eee5d7,#faf5eb,#eee5d7)",backgroundSize:"200% 100%",animation:"skeleton-shimmer 1.3s linear infinite"}} /><div style={{display:"grid",gap:7}}><i style={{display:"block",width:70,height:7,borderRadius:4,background:"#e8dfd1"}} /><i style={{display:"block",width:105,height:13,borderRadius:4,background:"#e8dfd1"}} /><i style={{display:"block",width:60,height:7,borderRadius:4,background:"#e8dfd1"}} /></div><i style={{width:40,height:7,borderRadius:4,background:"#e8dfd1"}} /></article>) : filtered.slice(0,4).map((item) => (
              <article className={item.days <= 1 ? "ingredient-card urgent" : "ingredient-card"} key={item.id}>
                <div className="ingredient-icon">{item.name.slice(0, 1)}</div>
                <div><span>{item.category}</span><h3>{item.name}</h3><p>{item.amount}</p></div>
                <small>{item.expiry}</small>
              </article>
            ))}
          </section>

          <section className="section-head recipes-head">
            <div><span className="eyebrow">From your pantry</span><h2>Tonight's possibilities</h2></div>
            <button className="text-link" onClick={() => navigateTo("Recipes")}>See all recipes <ArrowRight size={15} /></button>
          </section>
          <section className="recipe-grid">
            {recipes.map((recipe) => (
              <article className="recipe-card" key={recipe.title}>
                <div className="recipe-image">
                  <img src={recipe.image} alt="" />
                  <button className={saved.includes(recipe.title) ? "save saved" : "save"} onClick={() => saveRecipe(recipe.title)} aria-label="Save recipe">
                    {saved.includes(recipe.title) ? <Check size={16} /> : "+"}
                  </button>
                </div>
                <div className="recipe-body"><span>{recipe.tag}</span><h3>{recipe.title}</h3><p><Clock3 size={14} /> {recipe.time}</p></div>
              </article>
            ))}
          </section>

          <section className="bottom-grid">
            <article className="plan-card">
              <div><span className="eyebrow">This week</span><h2>A little plan<br /><em>goes a long way.</em></h2><p>Build a meal plan around what you already have and let the shopping list fill itself.</p><button className="dark-button" onClick={() => navigateTo("Meal plan")}>Open meal plan <CalendarDays size={15} /></button></div>
              <div className="plan-plate">🥗</div>
            </article>
            <article className="shop-card">
              <div className="shop-title"><div><span className="eyebrow">Shopping list</span><h2>7 things to bring home.</h2></div><ShoppingBasket /></div>
              <div className="shop-items">{["Greek yogurt", "Lemons", "Parmesan"].map((item) => <label key={item}><input type="checkbox" /><span>{item}</span></label>)}</div>
              <button className="text-link" onClick={() => navigateTo("Shopping list")}>Open full list <ArrowRight size={15} /></button>
            </article>
          </section>
            </>
          )}
          </motion.div>
        </AnimatePresence>
        </div>
      </main>

      {selectedRecipe && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} onMouseDown={() => setSelectedRecipe(null)}>
          <motion.div className="modal recipe-detail-modal" initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} transition={{ type: "spring", stiffness: 260, damping: 24 }} onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRecipe(null)}><X size={18} /></button>
            <motion.div layoutId={`recipe-image-${selectedRecipe.id}`} className="recipe-detail-image" onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--rx", `${((event.clientX - rect.left) / rect.width - .5) * -18}px`); event.currentTarget.style.setProperty("--ry", `${((event.clientY - rect.top) / rect.height - .5) * -12}px`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--rx","0px"); event.currentTarget.style.setProperty("--ry","0px"); }}><img src={selectedRecipe.image} alt="" style={{transform:"translate3d(var(--rx,0px),var(--ry,0px),0) scale(1.04)",transition:"transform .35s cubic-bezier(.22,.8,.22,1)"}} /></motion.div>
            <span className="eyebrow"><Sparkles size={13} /> {selectedRecipe.match}% pantry match</span>
            <motion.h2 layoutId={`recipe-title-${selectedRecipe.id}`}>{selectedRecipe.title}</motion.h2><p>{selectedRecipe.reason}</p>
            <div className="nutrition-strip"><span><b><AnimatedNumber value={selectedRecipe.nutrition.calories} /></b> kcal</span><span><b><AnimatedNumber value={selectedRecipe.nutrition.protein} suffix="g" /></b> protein</span><span><b><AnimatedNumber value={selectedRecipe.nutrition.carbs} suffix="g" /></b> carbs</span><span><b><AnimatedNumber value={selectedRecipe.nutrition.fat} suffix="g" /></b> fat</span></div>
            <div className="detail-columns"><div><strong>Use</strong>{selectedRecipe.used.map((item) => <span key={item}>✓ {item}</span>)}</div><div><strong>Shopping</strong>{selectedRecipe.missing.length ? selectedRecipe.missing.map((item) => <span key={item}>+ {item}</span>) : <span>Nothing essential missing.</span>}</div></div>
            {selectedRecipe.substitutions && selectedRecipe.substitutions.length > 0 && <div className="substitutions"><strong>Smart substitutions</strong>{selectedRecipe.substitutions.map((item) => <span key={item}>↳ {item}</span>)}</div>}
            <div className="steps"><strong>Method</strong>{selectedRecipe.steps.map((step, i) => <div key={step}><b>{i+1}</b><span>{step}</span></div>)}</div>
            <button className="primary full" onClick={() => { setSelectedRecipe(null); setCookRecipe(selectedRecipe); }}><Utensils size={15} /> Start cooking</button>
            <button className="primary full save-generated" disabled={saveBusy} onClick={async () => { setSaveBusy(true); try { await saveGeneratedRecipe(selectedRecipe); setSaved((items) => items.includes(selectedRecipe.title) ? items : [...items, selectedRecipe.title]); setAiMessage("Recipe saved to your private collection.");
        showToast("Recipe saved to your collection"); } catch (error) { setAiMessage(error instanceof Error ? error.message : "Could not save recipe."); } finally { setSaveBusy(false); } }}>{saveBusy ? "Saving..." : saved.includes(selectedRecipe.title) ? "Saved to collection ✓" : "Save recipe to collection"}</button>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>{toast && <motion.div initial={{opacity:0,x:30,y:10}} animate={{opacity:1,x:0,y:0}} exit={{opacity:0,x:30}} style={{position:"fixed",right:24,bottom:24,zIndex:120000,minWidth:240,maxWidth:360,padding:"13px 15px",borderRadius:12,background:"var(--espresso)",color:"#fff",boxShadow:"0 18px 45px rgba(46,36,29,.24)",fontSize:12,display:"flex",alignItems:"center",gap:9}}><Check size={15} color="var(--butter)" />{toast}<motion.i initial={{scaleX:1}} animate={{scaleX:0}} transition={{duration:2.8,ease:"linear"}} style={{position:"absolute",left:0,bottom:0,height:2,width:"100%",background:"var(--butter)",transformOrigin:"left"}} /></motion.div>}</AnimatePresence>
      <AnimatePresence>{ingredientBridge && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,zIndex:115000,background:"rgba(30,20,14,.88)",display:"grid",placeItems:"center",backdropFilter:"blur(14px)"}}><motion.div initial={{scale:.86,y:24}} animate={{scale:1,y:0}} style={{width:"min(520px,88vw)",borderRadius:24,overflow:"hidden",background:"var(--paper)",boxShadow:"0 30px 90px rgba(0,0,0,.35)"}}><img src={ingredientBridge.image} alt="" style={{width:"100%",height:240,objectFit:"cover"}}/><div style={{padding:26}}><span className="eyebrow">Ingredient → recipe intelligence</span><h2 style={{fontFamily:"Playfair Display",fontSize:38,margin:"9px 0"}}>Recipes using {ingredientBridge.name}</h2><p style={{color:"var(--muted)",fontSize:12}}>Carrying your ingredient into the recipe kitchen...</p><div style={{height:3,background:"#e9dfcf",overflow:"hidden"}}><motion.i initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:.65,ease:"easeInOut"}} style={{display:"block",height:"100%",background:"var(--tomato)",transformOrigin:"left"}} /></div></div></motion.div></motion.div>}</AnimatePresence>
      {cookRecipe && <CookMode recipe={cookRecipe} onClose={() => setCookRecipe(null)} />}

      {editing && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} onMouseDown={() => !pantryBusy && setEditing(null)}>
          <motion.div className="modal edit-modal" initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} transition={{ type: "spring", stiffness: 260, damping: 24 }} onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditing(null)}><X size={18} /></button>
            <span className="eyebrow">Pantry · Edit</span><h2>Refine ingredient</h2>
            <div className="edit-grid">
              <label>NAME<input value={editName} onChange={(e) => setEditName(e.target.value)} /></label>
              <label>QUANTITY<input type="number" min="0" step="0.1" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} /></label>
              <label>UNIT<input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} /></label>
              <label>CATEGORY<select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}><option>Produce</option><option>Dairy</option><option>Herbs</option><option>Pantry</option><option>Grains</option><option>Protein</option><option>Other</option></select></label>
              <label className="full-field">EXPIRY DATE<input type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} /></label>
            </div>
            {pantryError && <div className="auth-message">{pantryError}</div>}
            <button className="primary full" onClick={savePantryEdit} disabled={pantryBusy}>{pantryBusy ? "Saving..." : <>Save changes <Check size={15} /></>}</button>
          </motion.div>
        </motion.div>
      )}

      {showAdd && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} onMouseDown={() => setShowAdd(false)}>
          <motion.div layoutId="add-ingredient-action" className="modal add-ingredient-modal" initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} transition={{ type: "spring", stiffness: 260, damping: 24 }} onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            <span className="eyebrow"><Plus size={13} /> Pantry</span>
            <h2>Add an ingredient</h2>
            <p>Start with the ingredient name. Quantity, expiry and category can be refined in your pantry.</p>
            <input autoFocus value={newIngredient} onChange={(e) => setNewIngredient(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIngredient()} placeholder="e.g. chickpeas" />
            <label className="photo-option photo-upload"><Camera size={18} /><div><strong>Ingredient photo</strong><span>Upload a photo, then confirm ingredients before saving.</span></div><input type="file" accept="image/*" onChange={handleIngredientPhoto} /></label>
            {photoPreview && <div className={photoBusy ? "photo-review is-scanning" : "photo-review"}><div className="photo-preview-frame"><img src={photoPreview} alt="Ingredient upload preview" />{photoBusy && <motion.div className="vision-scan-line" initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }} />}</div><div><span className="eyebrow">BLIP vision · {photoName}</span><strong>{detectedIngredients.length ? "Review detected ingredients" : "Detect ingredients in this photo"}</strong>{photoBusy && <div className="vision-stages">{["Reading image","Identifying food","Checking ingredient","Preparing pantry item"].map((stage, index) => <span key={stage} className={photoStage >= index + 1 ? "done" : ""}><i>{photoStage > index ? "✓" : index + 1}</i>{stage}</span>)}</div>}{detectedIngredients.length > 0 ? <div className="quick-ingredients"><AnimatePresence initial={false}>{detectedIngredients.map((item,index) => <motion.button key={item.name} type="button" initial={{opacity:0,y:8,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,scale:.94}} transition={{delay:index*.055,type:"spring",stiffness:360,damping:25}} className={photoIngredients.includes(item.name) ? "selected" : ""} onClick={() => photoIngredients.includes(item.name) ? setPhotoIngredients((items) => items.filter((x) => x !== item.name)) : addPhotoIngredient(item.name)}>{item.name}<small>{Math.round(item.confidence * 100)}%</small></motion.button>)}</AnimatePresence></div> : <button type="button" className="primary full" onClick={detectPhotoIngredients} disabled={photoBusy}><Sparkles size={15} /> {photoBusy ? "Analyzing photo with BLIP..." : "Detect ingredients with BLIP"}</button>}<small>{photoMessage}</small>{detectedIngredients.length > 0 && <button type="button" className="primary full" onClick={addConfirmedPhotoIngredients} disabled={!photoIngredients.length || photoBusy}>Add confirmed ingredients</button>}</div></div>}
            <button className="primary full" onClick={addIngredient}>Add to pantry <ArrowRight size={15} /></button>
          </motion.div>
        </motion.div>
      )}
      </div>
    </>
  );
}

export default App;
