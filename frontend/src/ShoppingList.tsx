import { useEffect, useState } from "react";
import { ArrowRight, Check, Plus, ShoppingBasket, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import { createShoppingItem, deleteShoppingItem, listShoppingItems, toggleShoppingItem, type ShoppingItem } from "./services/shopping";

export default function ShoppingList({ onRecipes }: { onRecipes: () => void }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    listShoppingItems().then(setItems).catch(() => undefined);
  }, []);

  const add = async () => {
    const name = input.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      if (supabase) {
        const row = await createShoppingItem({ name, quantity: 1, unit: "item", category: "To buy", source: "manual" });
        if (row) setItems((current) => [row, ...current]);
      } else {
        setItems((current) => [{
          id: "local-" + Date.now(),
          name,
          quantity: 1,
          unit: "item",
          category: "To buy",
          is_purchased: false,
          source: "manual",
        }, ...current]);
      }
      setInput("");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: ShoppingItem) => {
    const next = !item.is_purchased;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_purchased: next } : entry));
    if (supabase) {
      try {
        await toggleShoppingItem(item.id, next);
      } catch {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_purchased: item.is_purchased } : entry));
      }
    }
  };

  const remove = async (item: ShoppingItem) => {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (supabase) {
      try {
        await deleteShoppingItem(item.id);
      } catch {
        setItems((current) => [item, ...current]);
      }
    }
  };

  const purchased = items.filter((item) => item.is_purchased).length;

  return (
    <section className="shopping-page">
      <div className="section-head shopping-page-head">
        <div>
          <span className="eyebrow"><ShoppingBasket size={13} /> Grocery intelligence</span>
          <h2>Your shopping list</h2>
          <p>Keep the next grocery run focused. Items stay private to your kitchen account.</p>
        </div>
        <div className="shopping-progress"><strong>{purchased}/{items.length}</strong><span>purchased</span></div>
      </div>

      <div className="shopping-add">
        <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="Add milk, coriander, parmesan..." />
        <button className="primary" onClick={add} disabled={busy}><Plus size={15} /> Add item</button>
      </div>

      <div className="shopping-board">
        {items.length === 0 ? (
          <div className="shopping-empty">
            <ShoppingBasket size={30} />
            <strong>Your list is clear.</strong>
            <span>Add groceries manually, or use missing ingredients from a recipe as your next step.</span>
            <button className="ghost" onClick={onRecipes}>Explore recipes <ArrowRight size={14} /></button>
          </div>
        ) : items.map((item) => (
          <article className={item.is_purchased ? "shopping-row purchased" : "shopping-row"} key={item.id}>
            <button className="shopping-check" onClick={() => toggle(item)} aria-label={item.is_purchased ? "Mark not purchased" : "Mark purchased"}><Check size={15} /></button>
            <div><strong>{item.name}</strong><small>{item.source === "recipe" ? "From recipe" : "Added manually"}</small></div>
            <span>{item.quantity ?? 1} {item.unit ?? "item"}</span>
            <button className="shopping-remove" onClick={() => remove(item)} aria-label={"Remove " + item.name}><X size={15} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}
