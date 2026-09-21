import { useEffect, useState } from "react";
import { getRecipeImage } from "./services/recipeImages";

type SceneName = "kitchen" | "cupboards" | "recipes" | "meal-plan" | "shopping";

type Props = { scene: SceneName };

const transitionData: Record<SceneName, { eyebrow: string; title: string; image: string }> = {
  kitchen: {
    eyebrow: "Kitchen",
    title: "Cook with what you have.",
    image: getRecipeImage("Fresh vegetable salad", "Indian"),
  },
  cupboards: {
    eyebrow: "Pantry",
    title: "Everything has a place.",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2200&q=88",
  },
  recipes: {
    eyebrow: "Recipes",
    title: "Turn ingredients into dinner.",
    image: getRecipeImage("Chicken curry", "Indian"),
  },
  "meal-plan": {
    eyebrow: "Weekly table",
    title: "Set the table for the week.",
    image: getRecipeImage("Biryani", "Indian"),
  },
  shopping: {
    eyebrow: "Market list",
    title: "Bring the kitchen home.",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2200&q=88",
  },
};

export default function PageTransitionScene({ scene }: Props) {
  const [loaded, setLoaded] = useState(false);
  const data = transitionData[scene];

  useEffect(() => {
    setLoaded(false);
    const image = new Image();
    image.src = data.image;
    image.onload = () => setLoaded(true);
    image.onerror = () => setLoaded(true);
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [data.image]);

  return (
    <div className={`kitchen-transition image-transition ${scene} ${loaded ? "is-loaded" : ""}`}>
      <div className="transition-image-wrap">
        <img src={data.image} alt="" className="transition-food-image" draggable={false} />
      </div>
      <div className="transition-image-wash" />
      <div className="transition-image-grain" />
      <div className="transition-copy">
        <span>{data.eyebrow}</span>
        <strong>{data.title}</strong>
      </div>
      <div className="transition-progress"><i /></div>
    </div>
  );
}
