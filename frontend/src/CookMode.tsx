import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, X } from "lucide-react";
import type { SmartRecipe } from "./services/recipeIntelligence";

type Props = { recipe: SmartRecipe; onClose: () => void };

export default function CookMode({ recipe, onClose }: Props) {
  const [step, setStep] = useState(0);
  const total = recipe.steps.length;
  const progress = total ? ((step + 1) / total) * 100 : 100;

  useEffect(() => {
    document.body.classList.add("cook-mode-open");
    return () => document.body.classList.remove("cook-mode-open");
  }, []);

  return (
    <div className="cook-mode" role="dialog" aria-modal="true" aria-label="Cook mode">
      <div className="cook-mode-image">
        <img src={recipe.image} alt="" />
        <div className="cook-mode-image-shade" />
        <button className="cook-close" onClick={onClose} aria-label="Close cook mode"><X size={19} /></button>
        <div className="cook-title">
          <span>Cook mode</span>
          <h1>{recipe.title}</h1>
          <p><Clock3 size={14} /> {recipe.time} min · {recipe.difficulty}</p>
        </div>
      </div>
      <div className="cook-panel">
        <div className="cook-progress">
          <div><span>STEP {step + 1} OF {total || 1}</span><strong>{Math.round(progress)}%</strong></div>
          <i><b style={{ width: progress + "%" }} /></i>
        </div>
        <div className="cook-step">
          <span className="cook-step-number">{String(step + 1).padStart(2, "0")}</span>
          <div>
            <span className="eyebrow">Method</span>
            <h2>{recipe.steps[step] ?? "Your recipe is ready."}</h2>
            <p>Take your time and check the texture before moving to the next step.</p>
          </div>
        </div>
        <div className="cook-ingredients">
          <span>USING FROM PANTRY</span>
          <div>{recipe.used.slice(0, 5).map((item) => <span key={item}><Check size={12} /> {item}</span>)}</div>
        </div>
        <div className="cook-controls">
          <button className="ghost" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft size={16} /> Previous</button>
          {step < total - 1 ? (
            <button className="primary" onClick={() => setStep((value) => value + 1)}>Next step <ArrowRight size={16} /></button>
          ) : (
            <button className="primary" onClick={onClose}><Check size={16} /> Finish cooking</button>
          )}
        </div>
      </div>
    </div>
  );
}
