import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Edit3, PackageOpen, Plus, Search, Trash2, X } from "lucide-react";

export type CupboardItem = {
  id: string;
  name: string;
  amount: string;
  category: string;
  expiry: string;
  days: number;
};

type Props = {
  items: CupboardItem[];
  query: string;
  onQueryChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (item: CupboardItem) => void;
  onDelete: (item: CupboardItem) => void;
};

const imageByIngredient: Record<string, string> = {
  tomato: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=88",
  "cherry tomatoes": "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=88",
  onion: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=88",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=88",
  avocado: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=900&q=88",
  basil: "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=900&q=88",
  garlic: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=900&q=88",
  lemon: "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=900&q=88",
  egg: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=900&q=88",
  eggs: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=900&q=88",
  rice: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=88",
  dal: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=88",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=88",
  paneer: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=88",
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=88",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=88",
  chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=900&q=88",
};

function ingredientImage(name: string) {
  const normalized = name.toLowerCase().trim();
  const exact = imageByIngredient[normalized];
  if (exact) return exact;
  const key = Object.keys(imageByIngredient).find((item) => normalized.includes(item) || item.includes(normalized));
  return key ? imageByIngredient[key] : "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=88";
}

function freshnessFor(item: CupboardItem) { if (item.days < 0) return "expired"; if (item.days === 0) return "today"; if (item.days <= 2) return "soon"; return "fresh"; }

function categoryFor(item: CupboardItem) {
  const value = item.category.toLowerCase();
  if (value.includes("dairy") || value.includes("protein") || value.includes("photo import") && /chicken|egg|paneer|milk/i.test(item.name)) return "dairy";
  if (value.includes("grain") || value.includes("pulse") || value.includes("pantry")) return "grains";
  if (value.includes("herb") || value.includes("spice")) return "spices";
  return "produce";
}

export default function PantryCupboard({ items, query, onQueryChange, onAdd, onEdit, onDelete }: Props) {
  const [selected, setSelected] = useState<CupboardItem | null>(null);
  const [category, setCategory] = useState("all");
  const visible = useMemo(() => items.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "all" || categoryFor(item) === category);
  }), [items, query, category]);

  const groups = ["produce", "dairy", "grains", "spices"] as const;
  const groupNames = { produce: "Fresh produce", dairy: "Dairy & protein", grains: "Grains & pantry", spices: "Herbs & spices" };

  return (
    <section className="pantry-cupboard-page photographic-pantry">
      <div className="cupboard-header">
        <div>
          <span className="eyebrow"><PackageOpen size={13} /> Living pantry</span>
          <h2>A pantry you can actually see.</h2>
          <p>Real ingredient photography, expiry intelligence, and a calm visual shelf for everything in your kitchen.</p>
        </div>
        <div className="cupboard-actions">
          <label className="cupboard-search"><Search size={15} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Find an ingredient..." /></label>
          <motion.button layoutId="add-ingredient-action" className="primary" onClick={onAdd}><Plus size={15} /> Add ingredient</motion.button>
        </div>
      </div>

      <div className="cupboard-filters" role="tablist">
        {[["all", "All"], ...groups.map((item) => [item, groupNames[item]])].map(([value, label]) => (
          <button type="button" key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>{label}</button>
        ))}
      </div>

      <div className="photo-pantry-stage">
        <div className="photo-pantry-backdrop" />
        <div className="photo-pantry-light" />
        <div className="photo-pantry-shelves">
          {groups.map((group) => {
            const groupItems = visible.filter((item) => categoryFor(item) === group).slice(0, 6);
            if (!groupItems.length && category !== "all") return null;
            return (
              <div className="photo-shelf" key={group}>
                <div className="photo-shelf-label">{groupNames[group]}</div>
                <div className="photo-ingredient-row">
                  {groupItems.map((item) => (
                    <button type="button" className={`photo-ingredient freshness-${freshnessFor(item)}`} key={item.id} onClick={() => setSelected(item)}>
                      <motion.span className="photo-ingredient-image" layout transition={{ type: "spring", stiffness: 320, damping: 28 }}><img src={ingredientImage(item.name)} alt={item.name} loading="lazy" /></motion.span>
                      <span className="photo-ingredient-copy"><strong>{item.name}</strong><small>{item.amount}</small><em>{item.days < 0 ? "Expired" : item.days === 0 ? "Use today" : item.days <= 2 ? "Use soon" : item.expiry}</em></span>
                    </button>
                  ))}
                  {!groupItems.length && category === "all" && <span className="photo-shelf-empty">Shelf waiting for ingredients</span>}
                </div>
              </div>
            );
          })}
          {!visible.length && <div className="cupboard-empty"><PackageOpen size={28} /><strong>Nothing on these shelves.</strong><span>Try another search or add a new ingredient.</span></div>}
        </div>
        <div className="photo-pantry-caption"><span>YOUR KITCHEN</span><strong>Fresh ingredients, remembered.</strong></div>
      </div>

      {selected && (
        <motion.div className="ingredient-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} onClick={() => setSelected(null)}>
          <motion.aside className="ingredient-drawer" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 280, damping: 28 }} onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close"><X size={17} /></button>
            <div className="drawer-image"><img src={ingredientImage(selected.name)} alt={selected.name} /></div>
            <span className="eyebrow">{selected.category}</span>
            <h3>{selected.name}</h3>
            <div className="drawer-stats"><div><small>Quantity</small><strong>{selected.amount}</strong></div><div><small>Expiry</small><strong className={selected.days <= 2 ? "urgent-text" : ""}>{selected.expiry}</strong></div></div>
            <p>Stored in your kitchen memory. Use this ingredient in recipe intelligence or update its pantry details.</p>
            <div className="drawer-actions">
              <button className="primary" onClick={() => { setSelected(null); onEdit(selected); }}><Edit3 size={14} /> Edit</button>
              <button className="danger-button" onClick={() => { setSelected(null); onDelete(selected); }}><Trash2 size={14} /> Remove</button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </section>
  );
}
