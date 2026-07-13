import {
  Bookmark,
  BookmarkCheck,
  ClipboardList,
  NotebookPen,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { FoodImage, RecipeMeta } from "../../components/ui";
import { fallbackImage, foodPreferences, kitchenTools, recipeImages } from "../../data/catalog";
import { freshnessCopy, type InventoryItem } from "../../domain/inventory";
import {
  recipeMainIngredients,
  recipeSeasonings,
  type FoodPreference,
  type KitchenTool,
  type Recipe,
} from "../../domain/recipe";
import type { ShoppingLine } from "../../domain/plan";

type FusionTray = "ingredients" | "tools" | "preferences";

export function WarehouseView({
  inventory,
  activeToolId,
  setActiveToolId,
  favorites,
  toggleFavorite,
  shoppingList,
  planToday,
}: {
  inventory: InventoryItem[];
  activeToolId: string;
  setActiveToolId: (id: string) => void;
  favorites: string[];
  toggleFavorite: (recipe: Recipe) => void;
  shoppingList: ShoppingLine[];
  planToday: (recipe: Recipe, source: string) => void;
}) {
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  const [activeTray, setActiveTray] = useState<FusionTray>("ingredients");
  const [preferenceId, setPreferenceId] = useState("quick");
  const [fusionCount, setFusionCount] = useState(0);
  const [recipeFlipped, setRecipeFlipped] = useState(false);
  const selectedTool = kitchenTools.find((tool) => tool.id === activeToolId) ?? kitchenTools[0];
  const selectedPreference = foodPreferences.find((item) => item.id === preferenceId) ?? foodPreferences[0];
  const selectedItems = selectedInventoryIds
    .map((id) => inventory.find((item) => item.inventoryId === id))
    .filter((item): item is InventoryItem => Boolean(item));
  const fusionRecipe = buildFusionRecipe(selectedItems, selectedTool, selectedPreference, fusionCount);
  const hasSelection = selectedItems.length > 0;

  function toggleIngredient(inventoryId: string) {
    setFusionCount(0);
    setRecipeFlipped(false);
    setSelectedInventoryIds((current) =>
      current.includes(inventoryId)
        ? current.filter((id) => id !== inventoryId)
        : current.length >= 5
          ? [...current.slice(1), inventoryId]
          : [...current, inventoryId],
    );
  }

  function clearWorkbench() {
    setSelectedInventoryIds([]);
    setFusionCount(0);
    setRecipeFlipped(false);
  }

  function fuseNow() {
    if (!hasSelection) return;
    setRecipeFlipped(false);
    setFusionCount((current) => current + 1);
  }

  function handleFusionAction() {
    if (!hasSelection) return;
    fuseNow();
  }

  return (
    <section className="fusionStudio">
      <div className={`fusionCanvas ${fusionCount > 0 ? "hasResult" : ""}`}>
        <div className="fusionTopControls">
          <button className="roundIconButton" type="button" onClick={clearWorkbench} aria-label="清空选择">
            <X size={20} />
          </button>
          <div className="fusionTopRight">
            <button className="roundIconButton" type="button" onClick={() => setActiveTray("preferences")} aria-label="打开偏好">
              <SlidersHorizontal size={19} />
            </button>
            <button className="roundIconButton" type="button" onClick={() => setActiveTray("tools")} aria-label="打开厨具">
              <Utensils size={19} />
            </button>
          </div>
        </div>

        <div className={`fusionStage ${hasSelection ? "hasSelection" : ""}`}>
          {!hasSelection ? (
            <p>点击下方食材库，开始融合吧</p>
          ) : (
            <>
              <div className="fusionToolAnchor" style={{ "--tool": selectedTool.tone } as CSSProperties}>
                <img src={selectedTool.image} alt={selectedTool.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                <span>{selectedTool.name}</span>
              </div>
              {selectedItems.map((item, index) => (
                <button
                  className="canvasIngredient"
                  type="button"
                  style={orbitStyle(index, selectedItems.length)}
                  onClick={() => toggleIngredient(item.inventoryId)}
                  key={item.inventoryId}
                >
                  <FoodImage src={item.photo} alt={item.name} />
                  <span>{item.name}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {fusionCount > 0 && (
          <FusionResultPopup
            recipe={fusionRecipe}
            selectedTool={selectedTool}
            selectedPreference={selectedPreference}
            flipped={recipeFlipped}
            favorite={favorites.includes(fusionRecipe.id)}
            onFavorite={() => toggleFavorite(fusionRecipe)}
            onViewSteps={() => setRecipeFlipped(true)}
            onBack={() => setRecipeFlipped(false)}
            onRemix={fuseNow}
            onDismiss={() => {
              setFusionCount(0);
              setRecipeFlipped(false);
            }}
            onPlanToday={() => planToday(fusionRecipe, "仓库融合")}
          />
        )}
      </div>

      <div className="fusionTray">
        <div className="fusionTrayTabs">
          {[
            ["ingredients", "食材"],
            ["tools", "厨具"],
            ["preferences", "偏好"],
          ].map(([id, label]) => (
            <button className={activeTray === id ? "active" : ""} type="button" key={id} onClick={() => setActiveTray(id as FusionTray)}>
              {label}
            </button>
          ))}
        </div>

        {activeTray === "ingredients" && (
          <div className="fusionRail" aria-label="食材库">
            {inventory.map((item) => {
              const selected = selectedInventoryIds.includes(item.inventoryId);
              return (
                <button className={`fusionPickerCard ingredient ${selected ? "selected" : ""}`} type="button" onClick={() => toggleIngredient(item.inventoryId)} key={item.inventoryId}>
                  <FoodImage src={item.photo} alt={item.name} />
                  <strong>{item.name}</strong>
                  <small>{freshnessCopy(item)}</small>
                  {selected && <span className="pickerBadge">已选</span>}
                </button>
              );
            })}
          </div>
        )}

        {activeTray === "tools" && (
          <div className="fusionRail" aria-label="厨具库">
            {kitchenTools.map((tool) => (
              <button
                className={`fusionPickerCard tool ${activeToolId === tool.id ? "selected" : ""}`}
                type="button"
                style={{ "--tool": tool.tone } as CSSProperties}
                onClick={() => {
                  setActiveToolId(tool.id);
                  setFusionCount(0);
                  setRecipeFlipped(false);
                }}
                key={tool.id}
              >
                <img src={tool.image} alt={tool.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                <strong>{tool.name}</strong>
                <small>{tool.subtitle}</small>
              </button>
            ))}
          </div>
        )}

        {activeTray === "preferences" && (
          <div className="fusionRail preferenceRail" aria-label="食物偏好">
            {foodPreferences.map((preference) => (
              <button
                className={`fusionPickerCard preference ${preferenceId === preference.id ? "selected" : ""}`}
                type="button"
                style={{ "--pref": preference.tone } as CSSProperties}
                onClick={() => {
                  setPreferenceId(preference.id);
                  setFusionCount(0);
                  setRecipeFlipped(false);
                }}
                key={preference.id}
              >
                <span className="preferenceDot" />
                <strong>{preference.label}</strong>
                <small>{preference.desc}</small>
              </button>
            ))}
          </div>
        )}

        <div className="trayFusionFooter">
          <button className="trayFusionButton" type="button" disabled={!hasSelection} onClick={handleFusionAction}>
            <Sparkles size={17} /> {fusionCount > 0 ? "再融合" : "融合"}
          </button>
        </div>
      </div>

      {shoppingList.length > 0 && (
        <div className="shoppingOutput compactShoppingOutput">
          <h2>购物清单</h2>
          {shoppingList.map((line) => (
            <div key={line.id}><ShoppingBag size={16} /> {line.name}<small>{line.reason}</small></div>
          ))}
        </div>
      )}
    </section>
  );
}

function FusionResultPopup({
  recipe,
  selectedTool,
  selectedPreference,
  flipped,
  favorite,
  onFavorite,
  onViewSteps,
  onBack,
  onRemix,
  onDismiss,
  onPlanToday,
}: {
  recipe: Recipe;
  selectedTool: KitchenTool;
  selectedPreference: FoodPreference;
  flipped: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onViewSteps: () => void;
  onBack: () => void;
  onRemix: () => void;
  onDismiss: () => void;
  onPlanToday: () => void;
}) {
  const seasonings = recipeSeasonings(recipe);
  const ingredients = recipeMainIngredients(recipe);

  return (
    <div className="fusionResultLayer" aria-live="polite">
      <div className="fusionResultDock">
        <div className="sparkBurst" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <button className="resultDismiss" type="button" onClick={onDismiss} aria-label="关闭推荐卡">
          <X size={17} />
        </button>
        <div className={`fusionResultCard ${flipped ? "flipped" : ""}`}>
          <div className="fusionResultInner">
            <article className="fusionResultFace resultFront">
              <div className="resultCardBody">
                <div className="resultKicker"><Sparkles size={15} /> 今日最推荐</div>
                <div className="dishHero">
                  <img className="dishCutout" src={recipe.image} alt={recipe.title} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                  <div>
                    <h2>{recipe.title}</h2>
                    <p>{recipe.reason}</p>
                  </div>
                </div>
                <RecipeMeta recipe={recipe} />
                <div className="fusionNeedGrid">
                  <div>
                    <span>需要食材</span>
                    <strong>{ingredients.join("、") || "当前已选食材"}</strong>
                  </div>
                  <div>
                    <span>调味料</span>
                    <strong>{seasonings.join("、") || "按口味微调"}</strong>
                  </div>
                </div>
              </div>
              <div className="resultActions resultDecisionActions">
                <button className="primaryButton wideAction" type="button" onClick={onPlanToday}>
                  <NotebookPen size={16} /> 今天做
                </button>
                <button className={`ghostButton favoriteAction ${favorite ? "active" : ""}`} type="button" onClick={onFavorite}>
                  {favorite ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {favorite ? "已收藏" : "收藏"}
                </button>
                <button className="ghostButton" type="button" onClick={onViewSteps}>
                  <ClipboardList size={16} /> 看做法
                </button>
                <button className="ghostButton" type="button" onClick={onRemix}>
                  <Sparkles size={16} /> 再融合
                </button>
              </div>
            </article>

            <article className="fusionResultFace resultBack">
              <div className="resultCardBody">
                <div className="resultKicker"><ClipboardList size={15} /> 制作教程</div>
                <h2>{recipe.title}</h2>
                <div className="tutorialSummary">
                  <span>{selectedTool.name}</span>
                  <span>{selectedPreference.label}</span>
                  <span>{recipe.minutes} 分钟</span>
                </div>
                <div className="fusionNeedGrid tutorial">
                  <div>
                    <span>菜系</span>
                    <strong>{recipe.cuisine}</strong>
                  </div>
                  <div>
                    <span>卡路里</span>
                    <strong>{recipe.calories} kcal</strong>
                  </div>
                </div>
                <ol className="tutorialSteps">
                  {recipe.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
              <div className="resultActions">
                <button className="ghostButton" type="button" onClick={onBack}>返回推荐</button>
                <button className="primaryButton" type="button" onClick={onPlanToday}>
                  <NotebookPen size={16} /> 今天做
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFusionRecipe(
  selectedItems: InventoryItem[],
  selectedTool: KitchenTool,
  selectedPreference: FoodPreference,
  fusionCount: number,
): Recipe {
  const names = selectedItems.map((item) => item.name);
  const hasFruit = selectedItems.some((item) => item.level1 === "水果");
  const hasProtein = selectedItems.some((item) => item.level1 === "肉禽蛋品" || item.level1 === "豆制品" || item.level1 === "海鲜水产");
  const hasVegetable = selectedItems.some((item) => item.level1 === "蔬菜");
  const title = fusionTitle(names, selectedTool, selectedPreference, hasFruit, hasProtein, hasVegetable);
  const baseCalories = selectedItems.reduce((sum, item) => {
    const estimatedWeight = item.amountMode === "weight" ? item.amount : Math.max(item.amount, 1) * Math.max(item.defaultWeight / Math.max(item.defaultCount, 1), 80);
    return sum + (estimatedWeight / 100) * item.caloriesPer100g;
  }, 0);
  const toolExtraMinutes =
    selectedTool.id === "oven" ? 8 : selectedTool.id === "steamer" ? 4 : selectedTool.id === "coffee" ? 3 : selectedTool.id === "soyMilk" ? 12 : 0;
  const required = Array.from(new Set([...names, ...fusionSupportIngredients(selectedTool, selectedPreference, hasFruit)]));

  return {
    id: `fusion-${selectedTool.id}-${selectedPreference.id}-${names.join("-")}-${fusionCount}`,
    title,
    cuisine: selectedPreference.cuisine,
    difficulty: selectedPreference.difficulty,
    minutes: selectedPreference.minutes + toolExtraMinutes + Math.min(selectedItems.length * 2, 8),
    calories: Math.max(80, Math.round(baseCalories * selectedPreference.calorieBias)),
    image: hasFruit ? recipeImages.peachDrink : selectedTool.id === "steamer" ? recipeImages.steamedEgg : recipeImages.eggplantRice,
    required,
    toolId: selectedTool.id,
    reason: `${names.join("、")} 经过 ${selectedTool.name} 和「${selectedPreference.label}」偏好融合，优先解决今天吃什么。`,
    steps: fusionSteps(selectedTool, selectedPreference, hasFruit, hasProtein, hasVegetable),
  };
}

function fusionTitle(
  names: string[],
  selectedTool: KitchenTool,
  selectedPreference: FoodPreference,
  hasFruit: boolean,
  hasProtein: boolean,
  hasVegetable: boolean,
) {
  if (!names.length) return "选择食材后开始融合";
  const coreNames = names.slice(0, 3).join("、");
  if (selectedTool.id === "juicer" || selectedTool.id === "coffee") return `${coreNames}清爽特调`;
  if (selectedTool.id === "soyMilk") return `${coreNames}暖饮浓汤`;
  if (selectedTool.id === "steamer") return `${coreNames}轻蒸碗`;
  if (selectedTool.id === "oven") return `${coreNames}焗烤小盘`;
  if (selectedPreference.id === "creative" && hasFruit && hasProtein) return `${coreNames}果香咸甜实验`;
  if (selectedPreference.id === "fresh" && hasVegetable) return `${coreNames}清爽快手盘`;
  return `${coreNames}${hasProtein ? "一人主菜" : "灵感小食"}`;
}

function fusionSupportIngredients(selectedTool: KitchenTool, selectedPreference: FoodPreference, hasFruit: boolean) {
  if (selectedTool.id === "juicer" || selectedTool.id === "coffee") return hasFruit ? ["柠檬", "蜂蜜"] : ["牛奶", "冰块"];
  if (selectedTool.id === "soyMilk") return ["清水", "少量糖"];
  if (selectedPreference.id === "zhejiang") return ["生抽", "少量糖"];
  if (selectedPreference.id === "fresh") return ["柠檬", "橄榄油"];
  return ["生抽"];
}

function fusionSteps(selectedTool: KitchenTool, selectedPreference: FoodPreference, hasFruit: boolean, hasProtein: boolean, hasVegetable: boolean) {
  if (selectedTool.id === "juicer" || selectedTool.id === "coffee") {
    return ["食材清洗后切小块。", "保留一点果肉做层次，其余打碎或萃取。", "按酸甜度补柠檬或蜂蜜。", "冷藏 5 分钟后饮用。"];
  }
  if (selectedTool.id === "soyMilk") {
    return ["把食材切小，避开太硬或筋膜多的部分。", "加入清水到建议水位，选择浓汤或豆浆模式。", "完成后按口味补少量糖或盐。", "倒出后静置 2 分钟，让口感更顺。"];
  }
  if (selectedTool.id === "steamer") {
    return ["主料切成容易入口的大小。", "蛋液或清汤作为底味。", "中火蒸到刚熟，避免过老。", "出锅后补生抽或香油。"];
  }
  if (selectedTool.id === "oven") {
    return ["食材擦干水分后铺平。", "用少量油和盐做基础调味。", "烤到边缘上色。", "出炉后按偏好补酸甜或香草。"];
  }
  if (selectedPreference.id === "fresh") {
    return ["先处理最容易出水的食材。", hasProtein ? "蛋白质轻煎或快炒定型。" : "蔬果保持脆感，不要久炒。", "用酸味和少量盐提亮。", "关火后再拌入清爽调味。"];
  }
  if (hasFruit && hasProtein) {
    return ["蛋白质先煎香或焯水去腥。", "水果压出部分汁水做酸甜底。", "小火收成能挂住食材的薄汁。", "最后保留一点新鲜果肉提香。"];
  }
  return ["先处理需要更久加热的食材。", hasVegetable ? "蔬菜后下，保留颜色和口感。" : "主料小火炒香。", "按偏好补咸鲜、酸甜或辛香。", "收汁后试味，必要时补一点水分。"];
}

function orbitStyle(index: number, total: number): CSSProperties {
  const radiusX = total <= 2 ? 96 : 122;
  const radiusY = total <= 2 ? 84 : 102;
  const angle = (-90 + index * (360 / Math.max(total, 1))) * (Math.PI / 180);
  return {
    "--x": `${Math.cos(angle) * radiusX}px`,
    "--y": `${Math.sin(angle) * radiusY}px`,
  } as CSSProperties;
}


