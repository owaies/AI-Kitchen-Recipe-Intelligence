import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Leaf,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";\nimport AuthScreen from "./AuthScreen";\nimport { supabase } from "./lib/supabase";\nimport { signOut } from "./services/auth";\nimport { createPantryItem, listPantryItems } from "./services/pantry";

type PantryItem = {
  id: string;
  name: string;
  amount: string;
  category: string;
  expiry: string;
  days: number;
};

const initialPantry: PantryItem[] = [
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
  const [active, setActive] = useState("Overview");
  const [pantry, setPantry] = useState(initialPantry);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");\n\n  useEffect(() => {\n    if (!supabase) return;\n    let mounted = true;\n    supabase.auth.getSession().then(({ data }) => {\n      if (mounted) { setSession(data.session); setAuthLoading(false); }\n    });\n    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {\n      if (mounted) setSession(nextSession);\n    });\n    return () => { mounted = false; listener.subscription.unsubscribe(); };\n  }, []);\n\n  useEffect(() => {\n    if (!session) return;\n    listPantryItems().then((rows) => {\n      setPantry(rows.map((row) => ({\n        id: row.id, name: row.name, amount: row.quantity == null ? "Amount not set" : `${row.quantity} ${row.unit ?? ""}`.trim(),\n        category: row.category ?? "Pantry", expiry: row.expires_on ?? "No expiry",\n        days: row.expires_on ? Math.ceil((new Date(row.expires_on).getTime() - Date.now()) / 86400000) : 999,\n      })));\n    }).catch((error) => console.error("Pantry load failed", error));\n  }, [session]);

  const filtered = useMemo(
    () => pantry.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [pantry, query],
  );

  const addIngredient = () => {
    const name = newIngredient.trim();
    if (!name) return;
    setPantry((items) => [
      ...items,
      { id: Date.now(), name, amount: "1 item", category: "Pantry", expiry: "7 days", days: 7 },
    ]);
    setNewIngredient("");
    setShowAdd(false);
  };

  const saveRecipe = (title: string) =>
    setSaved((items) => items.includes(title) ? items.filter((item) => item !== title) : [...items, title]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Utensils size={18} /></div>
          <div><strong>Kitchen</strong><span>intelligence</span></div>
        </div>
        <div className="side-label">Your kitchen</div>
        <nav>
          {["Overview", "Pantry", "Recipes", "Meal plan", "Shopping list"].map((item) => (
            <button className={active === item ? "nav-item active" : "nav-item"} key={item} onClick={() => setActive(item)}>
              <span>{item}</span><ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="side-card">
          <Sparkles size={20} />
          <strong>Cook with what you have.</strong>
          <p>Your pantry has enough for 8 recipe ideas today.</p>
          <button onClick={() => setActive("Recipes")}>Explore ideas <ArrowRight size={14} /></button>
        </div>
        <div className="side-footer">Private kitchen workspace · v0.1</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand"><Utensils size={18} /> Kitchen</div>
          <div className="top-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your kitchen..." /></div>
          <button className="avatar" title={session?.user.email ?? "Demo kitchen"} onClick={() => session && signOut()}>{session ? (session.user.email?.slice(0,2).toUpperCase() ?? "KI") : "MO"}</button>
        </header>

        <div className="content">
          <section className="hero">
            <div>
              <span className="eyebrow"><Leaf size={13} /> Thursday, September 19</span>
              <h1>Good food<br /><em>starts here.</em></h1>
              <p>Turn what’s already in your kitchen into something worth sitting down for.</p>
              <div className="hero-actions">
                <button className="primary" onClick={() => setActive("Recipes")}><Sparkles size={16} /> Find a recipe</button>
                <button className="ghost" onClick={() => setShowAdd(true)}><Plus size={16} /> Add ingredient</button>
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="food-circle">
                <img src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=85" alt="Fresh ingredients" />
              </div>
              <div className="floating-note"><Sparkles size={14} /><span><strong>4</strong> ingredients<br />need using soon</span></div>
            </div>
          </section>

          <section className="stats">
            <div><span>Pantry</span><strong>{pantry.length}</strong><small>ingredients</small></div>
            <div><span>Expiring soon</span><strong>{pantry.filter(i => i.days <= 2).length}</strong><small>within 48 hours</small></div>
            <div><span>Saved recipes</span><strong>{saved.length}</strong><small>in your collection</small></div>
            <div><span>Shopping</span><strong>7</strong><small>items to pick up</small></div>
          </section>

          <section className="section-head">
            <div><span className="eyebrow">Use it first</span><h2>Ingredients with a deadline</h2></div>
            <button className="text-link" onClick={() => setActive("Pantry")}>View pantry <ArrowRight size={15} /></button>
          </section>

          <section className="pantry-strip">
            {filtered.slice(0, 4).map((item) => (
              <article className={item.days <= 1 ? "ingredient-card urgent" : "ingredient-card"} key={item.id}>
                <div className="ingredient-icon">{item.name.slice(0, 1)}</div>
                <div><span>{item.category}</span><h3>{item.name}</h3><p>{item.amount}</p></div>
                <small>{item.expiry}</small>
              </article>
            ))}
          </section>

          <section className="section-head recipes-head">
            <div><span className="eyebrow">From your pantry</span><h2>Tonight's possibilities</h2></div>
            <button className="text-link" onClick={() => setActive("Recipes")}>See all recipes <ArrowRight size={15} /></button>
          </section>

          <section className="recipe-grid">
            {recipes.map((recipe) => (
              <article className="recipe-card" key={recipe.title}>
                <div className="recipe-image"><img src={recipe.image} alt="" /><button className={saved.includes(recipe.title) ? "save saved" : "save"} onClick={() => saveRecipe(recipe.title)} aria-label="Save recipe">{saved.includes(recipe.title) ? <Check size={16} /> : "+"}</button></div>
                <div className="recipe-body"><span>{recipe.tag}</span><h3>{recipe.title}</h3><p><Clock3 size={14} /> {recipe.time}</p></div>
              </article>
            ))}
          </section>

          <section className="bottom-grid">
            <article className="plan-card"><div><span className="eyebrow">This week</span><h2>A little plan<br /><em>goes a long way.</em></h2><p>Build a meal plan around what you already have and let the shopping list fill itself.</p><button className="dark-button" onClick={() => setActive("Meal plan")}>Open meal plan <CalendarDays size={15} /></button></div><div className="plan-plate">🥗</div></article>
            <article className="shop-card"><div className="shop-title"><div><span className="eyebrow">Shopping list</span><h2>7 things to bring home.</h2></div><ShoppingBasket /></div><div className="shop-items">{["Greek yogurt", "Lemons", "Parmesan"].map((item) => <label key={item}><input type="checkbox" /><span>{item}</span></label>)}</div><button className="text-link" onClick={() => setActive("Shopping list")}>Open full list <ArrowRight size={15} /></button></article>
          </section>
        </div>
      </main>

      {showAdd && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button><span className="eyebrow"><Plus size={13} /> Pantry</span><h2>Add an ingredient</h2><p>Start with the ingredient name. Quantity, expiry and category can be refined in your pantry.</p><input autoFocus value={newIngredient} onChange={(e) => setNewIngredient(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIngredient()} placeholder="e.g. chickpeas" /><div className="photo-option"><Camera size={18} /><div><strong>Photo recognition</strong><span>Coming with the AI vision layer</span></div></div><button className="primary full" onClick={addIngredient}>Add to pantry <ArrowRight size={15} /></button></div></div>}
    </div>
  );
}

export default App;
