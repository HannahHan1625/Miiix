import { ClipboardList, Timer } from "lucide-react";
import type { ReactNode } from "react";
import { fallbackImage } from "../data/catalog";
import type { Recipe } from "../domain/recipe";

export function RecipeMeta({ recipe }: { recipe: Recipe }) {
  return (
    <div className="recipeMeta">
      <span><ClipboardList size={13} /> {recipe.ingredients.length} 种食材</span>
      <span><Timer size={13} /> {recipe.minutes} 分钟</span>
      <span>{recipe.difficulty}</span>
      <span>{recipe.cuisine}</span>
      <span>{recipe.calories === null ? "热量待确认" : `${recipe.calories} kcal`}</span>
    </div>
  );
}

export function Metric({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div className="metricCard">
      <span>{label}</span>
      <strong>{value === null ? "待确认" : value}{value !== null && <small>{suffix}</small>}</strong>
      <div><i style={{ width: `${Math.min(value ?? 0, 100)}%` }} /></div>
    </div>
  );
}

export function NavButton({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`navButton ${active ? "active" : ""}`} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function FoodImage({ src, alt }: { src: string; alt: string }) {
  return <img className="foodPhoto" src={src} alt={alt} onError={(event) => { event.currentTarget.src = fallbackImage; }} />;
}
