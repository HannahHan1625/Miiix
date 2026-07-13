import {
  BookOpen,
  Home,
  NotebookPen,
  PackageCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  freshnessPercent,
  type AmountMode,
  type InventoryItem,
  type RecognizedFood,
  type UploadMethod,
} from "./domain/inventory";
import {
  type Recipe,
  type RecipeFilter,
} from "./domain/recipe";
import { createMealPlan, type MealPlan, type ShoppingLine } from "./domain/plan";
import {
  createDiaryEntry,
  dateByDaysAgo,
  todayISO,
  type DiaryEntry,
} from "./domain/diary";
import {
  categoryTree,
  foodLibrary,
  initialInventory,
  kitchenTools,
  recipesSeed,
} from "./data/catalog";
import { NavButton } from "./components/ui";
import type { AppView } from "./app/types";
import { HomeView } from "./features/home/HomeView";
import { UploadSheet } from "./features/inventory/UploadSheet";
import { WarehouseView } from "./features/fusion/WarehouseView";
import { RecipesView } from "./features/recipes/RecipesView";
import { DiaryView } from "./features/diary/DiaryView";

const PRODUCT_VERSION = "v0.3.7";
const VERSION_NAME = "领域模型拆分";

const personaLibrary = [
  { name: "晨光冰箱长", min: 76, desc: "库存结构清楚，做饭节奏稳定，适合开始养成自己的菜谱库。" },
  { name: "杨梅灵感师", min: 62, desc: "会被好食材点燃灵感，适合多做跨菜系尝试。" },
  { name: "冷藏巡逻员", min: 48, desc: "库存意识已经出现，但临期食材需要更主动处理。" },
  { name: "随缘开火人", min: 0, desc: "先把“今天吃什么”跑起来，别再靠意志力做饭。" },
];

function App() {
  const [view, setView] = useState<AppView>("home");
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClosing, setUploadClosing] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [method, setMethod] = useState<UploadMethod>("manual");
  const [level1, setLevel1] = useState("肉禽蛋品");
  const [level2, setLevel2] = useState("鸡肉");
  const [selectedFoodId, setSelectedFoodId] = useState("chickenWing");
  const [amountMode, setAmountMode] = useState<AmountMode>("weight");
  const [amount, setAmount] = useState(500);
  const [price, setPrice] = useState(18.9);
  const [note, setNote] = useState("冷冻分装");
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [activeToolId, setActiveToolId] = useState("wok");
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<string[]>(["eggplant-pork-rice"]);
  const [cookedIds, setCookedIds] = useState<string[]>(["pepper-egg"]);
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [cuisineFilter, setCuisineFilter] = useState("全部");
  const [todayPlan, setTodayPlan] = useState<MealPlan | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingLine[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([
    {
      id: "diary-1",
      recipeTitle: "青椒炒蛋",
      date: "昨天",
      dateISO: dateByDaysAgo(1),
      source: "做过的菜",
      note: "下次可以加一点肉沫，口感更完整。",
      tags: ["快手", "家常", "低洗碗"],
    },
  ]);

  const selectedFood = foodLibrary.find((item) => item.id === selectedFoodId) ?? foodLibrary[0];
  const selectedTool = kitchenTools.find((tool) => tool.id === activeToolId) ?? kitchenTools[0];
  const recipeCatalog = useMemo(() => {
    const catalog = new Map<string, Recipe>();
    [...recipesSeed, ...savedRecipes].forEach((recipe) => catalog.set(recipe.id, recipe));
    return Array.from(catalog.values());
  }, [savedRecipes]);

  const stats = useMemo(() => {
    const storedScore = Math.min(100, Math.round((inventory.length / 14) * 100));
    const cookFrequency = 4;
    const cookedCount = diary.length + cookedIds.length;
    const freshnessScore = Math.round(
      inventory.reduce((sum, item) => sum + freshnessPercent(item), 0) / Math.max(inventory.length, 1),
    );
    const total = Math.round(storedScore * 0.32 + cookFrequency * 10 * 0.28 + cookedCount * 10 * 0.2 + freshnessScore * 0.2);
    const persona = personaLibrary.find((item) => total >= item.min) ?? personaLibrary[personaLibrary.length - 1];
    return { storedScore, cookFrequency, cookedCount, freshnessScore, total, persona };
  }, [cookedIds.length, diary.length, inventory]);

  const filteredRecipes = recipeCatalog.filter((recipe) => {
    const byMode =
      recipeFilter === "all" ||
      (recipeFilter === "favorite" && favorites.includes(recipe.id)) ||
      (recipeFilter === "cooked" && cookedIds.includes(recipe.id));
    const byCuisine = cuisineFilter === "全部" || recipe.cuisine === cuisineFilter;
    return byMode && byCuisine;
  });

  const cuisineOptions = ["全部", ...Array.from(new Set(recipeCatalog.map((recipe) => recipe.cuisine)))];

  function openUpload() {
    setUploadOpen(true);
    setUploadClosing(false);
    setUploadDone(false);
  }

  function closeUpload() {
    setUploadClosing(true);
    window.setTimeout(() => {
      setUploadOpen(false);
      setUploadClosing(false);
      setUploadDone(false);
      setRecognizedFoods([]);
    }, 260);
  }

  function completeUpload() {
    setUploadDone(true);
    window.setTimeout(() => {
      const timestamp = Date.now();
      const foodIds = recognizedFoods.filter((item) => item.status !== "ignored").map((item) => item.foodId);
      const targetFoodIds = foodIds.length ? foodIds : [selectedFood.id];
      const nextItems = targetFoodIds
        .map((foodId) => foodLibrary.find((item) => item.id === foodId) ?? selectedFood)
        .map((foodInfo, index): InventoryItem => {
          const isSelected = foodInfo.id === selectedFood.id;
          return {
            ...foodInfo,
            inventoryId: `${foodInfo.id}-${timestamp}-${index}`,
            amountMode: isSelected ? amountMode : foodInfo.defaultMode,
            amount: isSelected ? amount : foodInfo.defaultMode === "count" ? foodInfo.defaultCount : foodInfo.defaultWeight,
            pricePaid: isSelected ? price : foodInfo.price,
            note: isSelected ? note : "AI识别待确认",
            addedDaysAgo: 0,
            customTags: isSelected ? (note ? [note] : []) : ["AI识别待确认"],
          };
        });
      setInventory((current) => [...nextItems, ...current]);
      setUploadOpen(false);
      setUploadDone(false);
      setRecognizedFoods([]);
      setView("warehouse");
    }, 560);
  }

  function selectFood(foodId: string) {
    const next = foodLibrary.find((item) => item.id === foodId);
    if (!next) return;
    setSelectedFoodId(foodId);
    setAmountMode(next.defaultMode);
    setAmount(next.defaultMode === "count" ? next.defaultCount : next.defaultWeight);
    setPrice(next.price);
    setNote(next.storageTags[0] ?? "");
  }

  function chooseLevel1(nextLevel1: string) {
    const nextL2 = categoryTree.find((item) => item.level1 === nextLevel1)?.level2[0]?.name;
    const nextFood = foodLibrary.find((item) => item.level1 === nextLevel1 && item.level2 === nextL2);
    setLevel1(nextLevel1);
    if (nextL2) setLevel2(nextL2);
    if (nextFood) selectFood(nextFood.id);
  }

  function chooseLevel2(nextLevel2: string) {
    const nextFood = foodLibrary.find((item) => item.level1 === level1 && item.level2 === nextLevel2);
    setLevel2(nextLevel2);
    if (nextFood) selectFood(nextFood.id);
  }

  function rememberRecipe(recipe: Recipe) {
    if (recipesSeed.some((item) => item.id === recipe.id)) return;
    setSavedRecipes((current) => (current.some((item) => item.id === recipe.id) ? current : [recipe, ...current]));
  }

  function toolForRecipe(recipe: Recipe) {
    return kitchenTools.find((tool) => tool.id === recipe.toolId) ?? selectedTool;
  }

  function toggleFavorite(recipe: Recipe) {
    if (!favorites.includes(recipe.id)) rememberRecipe(recipe);
    setFavorites((current) =>
      current.includes(recipe.id) ? current.filter((id) => id !== recipe.id) : [recipe.id, ...current],
    );
  }

  function planToday(recipe: Recipe, source: string) {
    rememberRecipe(recipe);
    const next = createMealPlan(recipe, source, inventory, todayISO());
    setTodayPlan(next.plan);
    setShoppingList(next.shoppingList);
    setView("diary");
  }

  function completeCooking(recipe: Recipe, source: string) {
    rememberRecipe(recipe);
    const entry = createDiaryEntry(recipe, source, toolForRecipe(recipe), todayISO());
    setDiary((current) => [entry, ...current]);
    setCookedIds((current) => (current.includes(recipe.id) ? current : [recipe.id, ...current]));
    setTodayPlan((current) => (current?.recipe.id === recipe.id ? null : current));
    setView("diary");
  }

  return (
    <div className="appShell">
      <div className="appFrame">
        <header className="topbar">
          <button className="brandButton" type="button" onClick={() => setView("home")}>
            <span className="brandMark">M</span>
            <span>
              <strong>Miiix</strong>
              <small>{PRODUCT_VERSION} {VERSION_NAME}</small>
            </span>
          </button>
          <div className="versionPill">{VERSION_NAME}</div>
        </header>

        <main className={`screen ${view === "warehouse" ? "warehouseScreen" : ""}`}>
          {view === "home" && (
            <HomeView
              stats={stats}
              inventory={inventory}
              openUpload={openUpload}
              setView={setView}
            />
          )}
          {view === "warehouse" && (
            <WarehouseView
              inventory={inventory}
              activeToolId={activeToolId}
              setActiveToolId={setActiveToolId}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              shoppingList={shoppingList}
              planToday={planToday}
            />
          )}
          {view === "recipes" && (
            <RecipesView
              recipes={filteredRecipes}
              recipeFilter={recipeFilter}
              setRecipeFilter={setRecipeFilter}
              cuisineFilter={cuisineFilter}
              setCuisineFilter={setCuisineFilter}
              cuisineOptions={cuisineOptions}
              favorites={favorites}
              cookedIds={cookedIds}
              toggleFavorite={toggleFavorite}
              planToday={planToday}
            />
          )}
          {view === "diary" && <DiaryView diary={diary} shoppingList={shoppingList} inventory={inventory} todayPlan={todayPlan} completeCooking={completeCooking} />}
        </main>

        <nav className="bottomNav" aria-label="主导航">
          <NavButton icon={<Home size={19} />} label="主页" active={view === "home"} onClick={() => setView("home")} />
          <NavButton icon={<PackageCheck size={19} />} label="仓库" active={view === "warehouse"} onClick={() => setView("warehouse")} />
          <NavButton icon={<BookOpen size={19} />} label="菜谱" active={view === "recipes"} onClick={() => setView("recipes")} />
          <NavButton icon={<NotebookPen size={19} />} label="日记" active={view === "diary"} onClick={() => setView("diary")} />
        </nav>
      </div>

      {uploadOpen && (
        <UploadSheet
          closing={uploadClosing}
          done={uploadDone}
          method={method}
          setMethod={setMethod}
          level1={level1}
          level2={level2}
          chooseLevel1={chooseLevel1}
          chooseLevel2={chooseLevel2}
          selectedFood={selectedFood}
          selectFood={selectFood}
          amountMode={amountMode}
          setAmountMode={setAmountMode}
          amount={amount}
          setAmount={setAmount}
          price={price}
          setPrice={setPrice}
          note={note}
          setNote={setNote}
          recognizedFoods={recognizedFoods}
          setRecognizedFoods={setRecognizedFoods}
          onBack={closeUpload}
          onDone={completeUpload}
        />
      )}
    </div>
  );
}

export default App;
