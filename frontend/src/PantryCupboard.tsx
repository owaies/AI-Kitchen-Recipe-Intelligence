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

function makeIngredientObject(name: string, index: number) {
  const key = name.toLowerCase();
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7b4f31, roughness: 0.78 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xb83f2f, roughness: 0.38, clearcoat: 0.35 });
  const green = new THREE.MeshStandardMaterial({ color: 0x5f7139, roughness: 0.65 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf0e3c4, roughness: 0.72 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd9eee2, transmission: 0.35, transparent: true, opacity: 0.72, roughness: 0.16 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc6a45e, metalness: 0.82, roughness: 0.2 });

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  if (key.includes("tomato")) {
    const fruit = add(new THREE.SphereGeometry(0.42, 32, 24), red, [0, 0.45, 0]);
    fruit.scale.set(1.08, 0.88, 1.02);
    const stem = add(new THREE.ConeGeometry(0.12, 0.18, 6), green, [0, 0.88, 0]);
    stem.rotation.z = Math.PI;
  } else if (key.includes("onion")) {
    const bulb = add(new THREE.SphereGeometry(0.38, 32, 24), new THREE.MeshStandardMaterial({ color: 0xc9a4a0, roughness: 0.58 }), [0, 0.42, 0]);
    bulb.scale.set(.88, 1.12, .88);
    add(new THREE.CylinderGeometry(.035, .06, .28, 10), cream, [0, .83, 0]);
  } else if (key.includes("potato")) {
    const potato = add(new THREE.SphereGeometry(.42, 28, 20), new THREE.MeshStandardMaterial({ color: 0xa97848, roughness: .92 }), [0, .42, 0]);
    potato.scale.set(1.2, .78, .82);
    potato.rotation.z = index * .4;
  } else if (key.includes("lemon")) {
    const lemon = add(new THREE.SphereGeometry(.36, 32, 24), new THREE.MeshStandardMaterial({ color: 0xd7ad27, roughness: .46 }), [0, .42, 0]);
    lemon.scale.set(1.2, .78, .78);
  } else if (key.includes("egg")) {
    const egg = add(new THREE.SphereGeometry(.32, 28, 24), cream, [0, .36, 0]);
    egg.scale.set(.78, 1.12, .78);
  } else if (key.includes("garlic")) {
    const bulb = add(new THREE.SphereGeometry(.34, 28, 20), cream, [0, .36, 0]);
    bulb.scale.set(1, .88, 1);
    for (let i = 0; i < 5; i++) {
      const clove = add(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe6d5b5, roughness: .7 }), [Math.cos(i * 1.25) * .16, .43, Math.sin(i * 1.25) * .16]);
      clove.scale.y = 1.4;
    }
  } else if (key.includes("rice") || key.includes("dal") || key.includes("flour") || key.includes("pasta")) {
    const bag = add(new THREE.BoxGeometry(.58, .95, .34), cream, [0, .5, 0]);
    bag.rotation.y = (index % 3 - 1) * .06;
    add(new THREE.BoxGeometry(.38, .3, .015), new THREE.MeshStandardMaterial({ color: 0x6b7a3d, roughness: .7 }), [0, .52, .18]);
    add(new THREE.BoxGeometry(.42, .055, .02), metal, [0, .94, .18]);
  } else if (key.includes("milk") || key.includes("oil") || key.includes("bottle")) {
    add(new THREE.CylinderGeometry(.22, .25, .9, 24), glass, [0, .5, 0]);
    add(new THREE.CylinderGeometry(.12, .14, .18, 20), cream, [0, 1.04, 0]);
    add(new THREE.CylinderGeometry(.07, .08, .08, 20), metal, [0, 1.17, 0]);
  } else if (key.includes("butter") || key.includes("paneer")) {
    add(new THREE.BoxGeometry(.62, .38, .42), cream, [0, .28, 0]);
    add(new THREE.BoxGeometry(.5, .2, .015), new THREE.MeshStandardMaterial({ color: 0xd3a93f, roughness: .6 }), [0, .28, .22]);
  } else {
    const jar = add(new THREE.CylinderGeometry(.26, .26, .7, 24), glass, [0, .42, 0]);
    jar.scale.z = .9;
    add(new THREE.CylinderGeometry(.28, .28, .08, 24), metal, [0, .8, 0]);
    add(new THREE.CylinderGeometry(.2, .2, .08, 20), wood, [0, .88, 0]);
  }

  group.rotation.y = (index % 5 - 2) * 0.08;
  return group;
}

function ShelfScene({ items, onSelect }: { items: CupboardItem[]; onSelect: (item: CupboardItem) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const onSelectRef = useRef(onSelect);
  itemsRef.current = items;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x241a13);
    const camera = new THREE.PerspectiveCamera(31, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 0.45, 12);

    scene.add(new THREE.HemisphereLight(0xfff0d5, 0x1b120d, 2.0));
    const key = new THREE.DirectionalLight(0xffe0b0, 4.2);
    key.position.set(-4, 7, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const led = new THREE.RectAreaLight(0xffd28b, 7, 8.5, .45);
    led.position.set(0, 2.55, 1.1);
    led.lookAt(0, 0, 0);
    scene.add(led);

    const fill = new THREE.PointLight(0xffc779, 5, 10);
    fill.position.set(0, 1, 2.5);
    scene.add(fill);

    const cabinet = new THREE.Group();
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(11.8, 7.6, .35),
      new THREE.MeshStandardMaterial({ color: 0x241912, roughness: .96 })
    );
    back.position.z = -1.15;
    back.receiveShadow = true;
    cabinet.add(back);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a442c, roughness: .66 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x38251a, roughness: .8 });
    const addCabinet = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number,number,number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      cabinet.add(mesh);
      return mesh;
    };

    addCabinet(new THREE.BoxGeometry(12.2, .42, 1.0), edgeMat, [0, 3.78, -.65]);
    addCabinet(new THREE.BoxGeometry(12.2, .42, 1.0), edgeMat, [0, -3.78, -.65]);
    addCabinet(new THREE.BoxGeometry(.42, 7.2, 1.0), edgeMat, [-6.0, 0, -.65]);
    addCabinet(new THREE.BoxGeometry(.42, 7.2, 1.0), edgeMat, [6.0, 0, -.65]);

    const shelfYs = [-2.25, -.35, 1.55];
    shelfYs.forEach((y) => {
      addCabinet(new THREE.BoxGeometry(11.45, .18, .82), frameMat, [0, y, -.35]);
      addCabinet(new THREE.BoxGeometry(11.25, .05, .05), new THREE.MeshStandardMaterial({ color: 0xd1a45d, metalness: .4, roughness: .3 }), [0, y + .11, .1]);
    });

    scene.add(cabinet);

    const objectLayer = new THREE.Group();
    scene.add(objectLayer);

    const rebuildObjects = () => {
      while (objectLayer.children.length) {
        const child = objectLayer.children.pop();
        if (child) {
          child.traverse((object) => {
            const mesh = object as THREE.Mesh;
            mesh.geometry?.dispose?.();
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material?.dispose?.();
          });
        }
      }
      const current = itemsRef.current.slice(0, 20);
      current.forEach((item, index) => {
        const object = makeIngredientObject(item.name, index);
        const row = Math.floor(index / 7);
        const col = index % 7;
        object.position.set(-4.7 + col * 1.55, shelfYs[row % shelfYs.length] + .12, -.02 + (index % 2) * .18);
        object.userData.itemId = item.id;
        objectLayer.add(object);
      });
    };
    rebuildObjects();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(objectLayer.children, true);
      const hit = hits.find((entry) => entry.object.userData.itemId || entry.object.parent?.userData.itemId);
      if (hit) {
        let target: THREE.Object3D | null = hit.object;
        while (target && !target.userData.itemId) target = target.parent;
        const item = itemsRef.current.find((candidate) => candidate.id === target?.userData.itemId);
        if (item) onSelectRef.current(item);
      }
    };
    renderer.domElement.addEventListener("pointerdown", handlePointer);

    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      const t = clock.getElapsedTime();
      objectLayer.children.forEach((object, index) => {
        object.position.y += Math.sin(t * 1.2 + index) * .0007;
        object.rotation.y += Math.sin(t * .5 + index) * .00025;
      });
      cabinet.rotation.y = Math.sin(t * .18) * .012;
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
      renderer.domElement.removeEventListener("pointerdown", handlePointer);
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

  return <div className="cupboard-three-layer" ref={mountRef} aria-hidden="false" />;
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
        <ShelfScene items={visible} onSelect={setSelected} />
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
