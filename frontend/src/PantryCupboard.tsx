import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import anime from "animejs";
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
  tomato: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=500&q=82",
  "cherry tomatoes": "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=500&q=82",
  onion: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=82",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=82",
  avocado: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=500&q=82",
  basil: "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=500&q=82",
  garlic: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=500&q=82",
  lemon: "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=500&q=82",
  egg: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=500&q=82",
  eggs: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=500&q=82",
  rice: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=500&q=82",
  dal: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=82",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=500&q=82",
  paneer: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=82",
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=82",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=82",
};

function ingredientImage(name: string) {
  const normalized = name.toLowerCase().trim();
  const exact = imageByIngredient[normalized];
  if (exact) return exact;
  const key = Object.keys(imageByIngredient).find((item) => normalized.includes(item) || item.includes(normalized));
  return key ? imageByIngredient[key] : "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=500&q=82";
}

function categoryFor(item: CupboardItem) {
  const value = item.category.toLowerCase();
  if (value.includes("dairy") || value.includes("protein")) return "dairy";
  if (value.includes("grain") || value.includes("pulse") || value.includes("pantry")) return "grains";
  if (value.includes("herb") || value.includes("spice")) return "spices";
  return "produce";
}

function ShelfScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0.5, 11);

    scene.add(new THREE.HemisphereLight(0xffefd2, 0x201711, 2.8));
    const warm = new THREE.PointLight(0xffd49b, 8, 15);
    warm.position.set(0, 1.8, 3);
    scene.add(warm);
    const green = new THREE.PointLight(0xaab978, 4, 10);
    green.position.set(-5, -1, 2);
    scene.add(green);

    const cabinet = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5b3d29, roughness: 0.72 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x2e2119, roughness: 0.85 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc5a15b, metalness: 0.7, roughness: 0.28 });

    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      cabinet.add(mesh);
      return mesh;
    };

    add(new THREE.BoxGeometry(10.8, 7.2, 0.45), wood, [0, 0, -1.15]);
    add(new THREE.BoxGeometry(10.2, 6.6, 0.25), darkWood, [0, 0, -0.88]);
    for (const y of [-2.0, -0.1, 1.8]) {
      add(new THREE.BoxGeometry(9.65, 0.14, 0.65), wood, [0, y, -0.45]);
      add(new THREE.BoxGeometry(9.5, 0.05, 0.08), brass, [0, y + 0.08, -0.1]);
    }
    const leftDoor = add(new THREE.BoxGeometry(5.1, 6.8, 0.28), wood, [-2.65, 0, 0.15]);
    const rightDoor = add(new THREE.BoxGeometry(5.1, 6.8, 0.28), wood, [2.65, 0, 0.15]);
    leftDoor.name = "left-door";
    rightDoor.name = "right-door";
    add(new THREE.BoxGeometry(0.08, 5.9, 0.16), brass, [0, 0, 0.35]);

    scene.add(cabinet);

    const particles = new THREE.Group();
    for (let i = 0; i < 55; i += 1) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018 + Math.random() * 0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xe7c56c : 0xb85b43, transparent: true, opacity: 0.35 }),
      );
      dot.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 3);
      particles.add(dot);
    }
    scene.add(particles);

    const motion = { z: 13, y: 0.45, left: 0, right: 0 };
    anime({
      targets: motion,
      z: 9,
      y: 0,
      left: -0.04,
      right: 0.04,
      duration: 900,
      easing: "easeOutExpo",
      update: () => {
        camera.position.z = motion.z;
        camera.position.y = motion.y;
        leftDoor.rotation.y = motion.left;
        rightDoor.rotation.y = motion.right;
      },
    });

    anime({
      targets: particles.rotation,
      y: Math.PI * 2,
      duration: 8500,
      easing: "linear",
      loop: true,
    });

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      raf = requestAnimationFrame(render);
      const t = clock.getElapsedTime();
      cabinet.position.y = Math.sin(t * 0.7) * 0.035;
      cabinet.rotation.y = Math.sin(t * 0.35) * 0.018;
      particles.position.y = Math.sin(t * 0.4) * 0.14;
      renderer.render(scene, camera);
    };
    render();

    const resize = () => {
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      anime.remove(motion);
      anime.remove(particles.rotation);
      renderer.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material?.dispose?.();
      });
      renderer.domElement.remove();
    };
  }, []);

  return <div className="cupboard-three-layer" ref={mountRef} aria-hidden="true" />;
}

export default function PantryCupboard({ items, query, onQueryChange, onAdd, onEdit, onDelete }: Props) {
  const [selected, setSelected] = useState<CupboardItem | null>(null);
  const [category, setCategory] = useState("all");

  const visible = useMemo(
    () => items.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || categoryFor(item) === category;
      return matchesQuery && matchesCategory;
    }),
    [items, query, category],
  );

  const groups = ["produce", "dairy", "grains", "spices"] as const;
  const groupNames = { produce: "Fresh produce", dairy: "Dairy & protein", grains: "Grains & pantry", spices: "Herbs & spices" };

  return (
    <section className="pantry-cupboard-page">
      <div className="cupboard-header">
        <div>
          <span className="eyebrow"><PackageOpen size={13} /> Living pantry</span>
          <h2>Your ingredient cupboard</h2>
          <p>Every ingredient has a place. Hover, inspect, and open an item to see what it can become.</p>
        </div>
        <div className="cupboard-actions">
          <label className="cupboard-search"><Search size={15} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Find an ingredient..." /></label>
          <button className="primary" onClick={onAdd}><Plus size={15} /> Add ingredient</button>
        </div>
      </div>

      <div className="cupboard-filters" role="tablist" aria-label="Pantry categories">
        {[["all", "All"], ...groups.map((item) => [item, groupNames[item]])].map(([value, label]) => (
          <button type="button" key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>{label}</button>
        ))}
      </div>

      <div className="cupboard-stage">
        <ShelfScene />
        <div className="cupboard-glow" />
        <div className="cupboard-items">
          {groups.map((group) => {
            const groupItems = visible.filter((item) => categoryFor(item) === group).slice(0, 12);
            if (!groupItems.length && category !== "all") return null;
            return (
              <div className={`cupboard-shelf-row shelf-${group}`} key={group}>
                <div className="shelf-label">{groupNames[group]}</div>
                <div className="cupboard-item-grid">
                  {groupItems.map((item) => (
                    <button type="button" className={`cupboard-item ${item.days <= 2 ? "expiring" : ""}`} key={item.id} onClick={() => setSelected(item)}>
                      <span className="ingredient-photo"><img src={ingredientImage(item.name)} alt="" loading="lazy" /></span>
                      <span className="ingredient-info"><strong>{item.name}</strong><small>{item.amount}</small></span>
                      <span className="ingredient-status">{item.days <= 2 ? "Use soon" : item.expiry}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {visible.length === 0 && <div className="cupboard-empty"><PackageOpen size={28} /><strong>Nothing on these shelves.</strong><span>Try another search or add a new ingredient.</span></div>}
        </div>
      </div>

      {selected && (
        <div className="ingredient-drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="ingredient-drawer" onClick={(event) => event.stopPropagation()}>
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
          </aside>
        </div>
      )}
    </section>
  );
}
