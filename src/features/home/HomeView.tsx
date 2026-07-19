import { Sparkles, Upload } from "lucide-react";
import type { AppView } from "../../app/types";
import { FoodImage, Metric } from "../../components/ui";
import { freshnessCopy, storageText, type InventoryItem } from "../../domain/inventory";

export function HomeView({
  stats,
  inventory,
  openUpload,
  setView,
}: {
  stats: {
    storedScore: number;
    cookFrequency: number;
    cookedCount: number;
    freshnessScore: number | null;
    total: number;
    persona: { name: string; desc: string; min: number };
  };
  inventory: InventoryItem[];
  openUpload: () => void;
  setView: (view: AppView) => void;
}) {
  return (
    <section className="homeStack">
      <div className="profilePanel">
        <div>
          <p className="eyebrow">Hannah's kitchen</p>
          <h1>早上好，Hannah</h1>
          <p>{stats.persona.desc}</p>
          <div className="levelBadge"><Sparkles size={15} /> {stats.persona.name}</div>
        </div>
        <div className="scoreOrb">
          <strong>{stats.total}</strong>
          <span>厨房生命力</span>
        </div>
      </div>

      <div className="metricGrid">
        <Metric label="库存整理" value={stats.storedScore} suffix="%" />
        <Metric label="做饭频率" value={stats.cookFrequency} suffix="次/周" />
        <Metric label="做过的菜" value={stats.cookedCount} suffix="道" />
        <Metric label="新鲜度" value={stats.freshnessScore} suffix="%" />
      </div>

      <button className="uploadEntry" type="button" onClick={openUpload}>
        <span><Upload size={22} /> 上传食材</span>
        <small>拍照、截图、小票、手动输入都从这里进入</small>
      </button>

      <div className="homeWarehouse">
        <div className="sectionHeader compactHeader">
          <div>
            <p className="eyebrow">Pocket warehouse</p>
            <h2>最近食材</h2>
          </div>
          <button className="ghostButton" type="button" onClick={() => setView("warehouse")}>进入仓库</button>
        </div>
        <IngredientPreview inventory={inventory} />
      </div>
    </section>
  );
}


function IngredientPreview({ inventory }: { inventory: InventoryItem[] }) {
  return (
    <div className="ingredientPreviewGrid">
      {inventory.slice(0, 6).map((item) => (
        <article className="ingredientMiniCard" key={item.inventoryId}>
          <FoodImage src={item.photo} alt={item.name} />
          <div>
            <strong>{item.name}</strong>
            <span>{storageText(item.storage)} · {freshnessCopy(item)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

