import {
  BookOpen,
  Home,
  NotebookPen,
  PackageCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  freshnessPercent,
  type AmountMode,
  type FoodInfo,
  type InventoryItem,
  type RecognizedFood,
  type UploadMethod,
} from "./domain/inventory";
import {
  type Recipe,
  type RecipeFilter,
} from "./domain/recipe";
import type { MealPlan, ShoppingLine } from "./domain/plan";
import type { DiaryEntry } from "./domain/diary";
import { recipesSeed } from "./data/catalog";
import {
  createIndexedDbRepositoryProvider,
  type IndexedDbRepositoryProvider,
} from "./data/repositories/indexeddb";
import {
  addInventoryItems,
  completeCookingAndConsume,
  initializeKitchenState,
  saveTodayPlan,
  setRecipeFavorite,
  type KitchenSnapshot,
} from "./application/kitchenPersistence";
import type { CatalogCategoryView } from "./application/catalogView";
import { NavButton } from "./components/ui";
import type { AppView } from "./app/types";
import { HomeView } from "./features/home/HomeView";
import { UploadSheet } from "./features/inventory/UploadSheet";
import { WarehouseView } from "./features/fusion/WarehouseView";
import { RecipesView } from "./features/recipes/RecipesView";
import { DiaryView } from "./features/diary/DiaryView";

const PRODUCT_VERSION = "v0.4.2";
const VERSION_NAME = "食材主数据";
const DEFAULT_INGREDIENT_ID = "50000000-0000-4000-8000-000000000002";
let sharedRepositoryProvider: Promise<IndexedDbRepositoryProvider> | null = null;

function getRepositoryProvider() {
  sharedRepositoryProvider ??= createIndexedDbRepositoryProvider();
  return sharedRepositoryProvider;
}

const personaLibrary = [
  { name: "晨光冰箱长", min: 76, desc: "库存结构清楚，做饭节奏稳定，适合开始养成自己的菜谱库。" },
  { name: "杨梅灵感师", min: 62, desc: "会被好食材点燃灵感，适合多做跨菜系尝试。" },
  { name: "冷藏巡逻员", min: 48, desc: "库存意识已经出现，但临期食材需要更主动处理。" },
  { name: "随缘开火人", min: 0, desc: "先把“今天吃什么”跑起来，别再靠意志力做饭。" },
];

function App() {
  const [view, setView] = useState<AppView>("home");
  const [catalogFoods, setCatalogFoods] = useState<FoodInfo[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategoryView[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClosing, setUploadClosing] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [method, setMethod] = useState<UploadMethod>("manual");
  const [level1, setLevel1] = useState("");
  const [level2, setLevel2] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [amountMode, setAmountMode] = useState<AmountMode>("mass");
  const [amount, setAmount] = useState(250);
  const [price, setPrice] = useState<number | null>(null);
  const [note, setNote] = useState("冷冻分装");
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [activeToolId, setActiveToolId] = useState("wok");
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cookedIds, setCookedIds] = useState<string[]>([]);
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [cuisineFilter, setCuisineFilter] = useState("全部");
  const [todayPlan, setTodayPlan] = useState<MealPlan | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingLine[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [persistenceState, setPersistenceState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [persistenceNotice, setPersistenceNotice] = useState("正在恢复本地厨房数据");
  const repositoryProvider = useRef<IndexedDbRepositoryProvider | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreKitchen() {
      try {
        const provider = await getRepositoryProvider();
        if (!active) return;
        repositoryProvider.current = provider;
        const snapshot = await initializeKitchenState(provider);
        if (!active) return;
        applySnapshot(snapshot);
        setPersistenceState("ready");
        setPersistenceNotice("数据已保存在此设备");
      } catch (error) {
        console.error("Failed to initialize local persistence", error);
        if (!active) return;
        setPersistenceState("error");
        setPersistenceNotice("本地数据初始化失败，请刷新重试");
      }
    }

    void restoreKitchen();
    return () => {
      active = false;
      repositoryProvider.current = null;
    };
  }, []);

  function applySnapshot(snapshot: KitchenSnapshot) {
    setCatalogFoods(snapshot.catalogFoods);
    setCatalogCategories(snapshot.catalogCategories);
    const currentFood = snapshot.catalogFoods.find((item) => item.id === selectedFoodId);
    const nextFood = currentFood
      ?? snapshot.catalogFoods.find((item) => item.id === DEFAULT_INGREDIENT_ID)
      ?? snapshot.catalogFoods[0];
    if (nextFood) {
      setSelectedFoodId(nextFood.id);
      setLevel1(nextFood.level1);
      setLevel2(nextFood.level2);
      if (!currentFood) {
        setAmountMode(nextFood.defaultMode);
        setAmount(nextFood.defaultAmount);
        setNote(nextFood.storageTags[0] ?? "");
      }
    }
    setInventory(snapshot.inventory);
    setSavedRecipes(snapshot.savedRecipes);
    setFavorites(snapshot.favorites);
    setCookedIds(snapshot.cookedIds);
    setTodayPlan(snapshot.todayPlan);
    setShoppingList(snapshot.shoppingList);
    setDiary(snapshot.diary);
  }

  const selectedFood = catalogFoods.find((item) => item.id === selectedFoodId) ?? catalogFoods[0];
  const recipeCatalog = useMemo(() => {
    const catalog = new Map<string, Recipe>();
    [...recipesSeed, ...savedRecipes].forEach((recipe) => catalog.set(recipe.id, recipe));
    return Array.from(catalog.values());
  }, [savedRecipes]);

  const stats = useMemo(() => {
    const storedScore = Math.min(100, Math.round((inventory.length / 14) * 100));
    const cookFrequency = 4;
    const cookedCount = diary.length + cookedIds.length;
    const knownFreshnessScores = inventory
      .map(freshnessPercent)
      .filter((score): score is number => score !== null);
    const freshnessScore = knownFreshnessScores.length
      ? Math.round(knownFreshnessScores.reduce((sum, score) => sum + score, 0) / knownFreshnessScores.length)
      : null;
    const knownSubtotal = storedScore * 0.32 + cookFrequency * 10 * 0.28 + cookedCount * 10 * 0.2;
    const total = Math.round(freshnessScore === null
      ? knownSubtotal / 0.8
      : knownSubtotal + freshnessScore * 0.2);
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
    if (!selectedFood) return;
    setUploadDone(true);
    window.setTimeout(() => {
      const timestamp = Date.now();
      const foodIds = recognizedFoods.filter((item) => item.status !== "ignored").map((item) => item.foodId);
      const targetFoodIds = foodIds.length ? foodIds : [selectedFood.id];
      const nextItems = targetFoodIds
        .map((foodId) => catalogFoods.find((item) => item.id === foodId) ?? selectedFood)
        .map((foodInfo, index): InventoryItem => {
          const isSelected = foodInfo.id === selectedFood.id;
          return {
            ...foodInfo,
            inventoryId: `${foodInfo.id}-${timestamp}-${index}`,
            amountMode: isSelected ? amountMode : foodInfo.defaultMode,
            amount: isSelected ? amount : foodInfo.defaultAmount,
            pricePaid: isSelected ? price : null,
            note: isSelected ? note : "AI识别待确认",
            addedDaysAgo: 0,
            customTags: isSelected ? (note ? [note] : []) : ["AI识别待确认"],
            expiresAtISO: null,
          };
        });
      void persistUploadedItems(nextItems);
    }, 560);
  }

  async function persistUploadedItems(nextItems: InventoryItem[]) {
    const provider = repositoryProvider.current;
    if (!provider) {
      setUploadDone(false);
      setPersistenceState("error");
      setPersistenceNotice("数据库尚未就绪，请稍后重试");
      return;
    }

    setPersistenceState("saving");
    setPersistenceNotice("正在保存食材");
    try {
      const nextInventory = await addInventoryItems(provider, nextItems, method);
      setInventory(nextInventory);
      setUploadOpen(false);
      setUploadDone(false);
      setRecognizedFoods([]);
      setView("warehouse");
      setPersistenceState("ready");
      setPersistenceNotice(`已新增 ${nextItems.length} 份库存`);
    } catch (error) {
      console.error("Failed to persist inventory", error);
      setUploadDone(false);
      setPersistenceState("error");
      setPersistenceNotice("食材保存失败，库存没有被修改");
    }
  }

  function selectFood(foodId: string) {
    const next = catalogFoods.find((item) => item.id === foodId);
    if (!next) return;
    setSelectedFoodId(foodId);
    setAmountMode(next.defaultMode);
    setAmount(next.defaultAmount);
    setPrice(null);
    setNote(next.storageTags[0] ?? "");
  }

  function chooseLevel1(nextLevel1: string) {
    const nextL2 = catalogCategories.find((item) => item.level1 === nextLevel1)?.level2[0]?.name;
    const nextFood = catalogFoods.find((item) => item.level1 === nextLevel1 && item.level2 === nextL2);
    setLevel1(nextLevel1);
    if (nextL2) setLevel2(nextL2);
    if (nextFood) selectFood(nextFood.id);
  }

  function chooseLevel2(nextLevel2: string) {
    const nextFood = catalogFoods.find((item) => item.level1 === level1 && item.level2 === nextLevel2);
    setLevel2(nextLevel2);
    if (nextFood) selectFood(nextFood.id);
  }

  function rememberRecipe(recipe: Recipe) {
    if (recipesSeed.some((item) => item.id === recipe.id)) return;
    setSavedRecipes((current) => (current.some((item) => item.id === recipe.id) ? current : [recipe, ...current]));
  }

  async function toggleFavorite(recipe: Recipe) {
    const provider = repositoryProvider.current;
    if (!provider) return;
    const wasFavorite = favorites.includes(recipe.id);
    if (!wasFavorite) rememberRecipe(recipe);
    setFavorites((current) =>
      wasFavorite ? current.filter((id) => id !== recipe.id) : [recipe.id, ...current],
    );
    setPersistenceState("saving");
    setPersistenceNotice(wasFavorite ? "正在取消收藏" : "正在收藏菜谱");
    try {
      await setRecipeFavorite(provider, recipe, !wasFavorite);
      setPersistenceState("ready");
      setPersistenceNotice(wasFavorite ? "已取消收藏" : "菜谱已收藏");
    } catch (error) {
      console.error("Failed to persist favorite", error);
      setFavorites((current) =>
        wasFavorite ? [recipe.id, ...current] : current.filter((id) => id !== recipe.id),
      );
      setPersistenceState("error");
      setPersistenceNotice("收藏状态保存失败，已恢复原状态");
    }
  }

  async function planToday(recipe: Recipe, source: string, selectedInventoryIds: string[] = []) {
    const provider = repositoryProvider.current;
    if (!provider) return;
    rememberRecipe(recipe);
    setPersistenceState("saving");
    setPersistenceNotice("正在生成今日计划与购物清单");
    try {
      const next = await saveTodayPlan(provider, recipe, source, inventory, selectedInventoryIds);
      setTodayPlan(next.plan);
      setShoppingList(next.shoppingList);
      setView("diary");
      setPersistenceState("ready");
      setPersistenceNotice("今日菜单已保存");
    } catch (error) {
      console.error("Failed to persist meal plan", error);
      setPersistenceState("error");
      setPersistenceNotice("今日菜单保存失败，请重试");
    }
  }

  async function completeCooking(recipe: Recipe, _source: string) {
    const provider = repositoryProvider.current;
    if (!provider || !todayPlan || todayPlan.recipe.id !== recipe.id) {
      setPersistenceState("error");
      setPersistenceNotice("没有找到可完成的今日菜单");
      return;
    }
    rememberRecipe(recipe);
    setPersistenceState("saving");
    setPersistenceNotice("正在记录制作并扣减库存");
    try {
      const completion = await completeCookingAndConsume(provider, todayPlan);
      applySnapshot(completion.snapshot);
      setView("diary");
      setPersistenceState("ready");
      setPersistenceNotice(
        completion.alreadyCompleted
          ? "这道菜已记录过，没有重复扣减库存"
          : completion.consumed.length
            ? `制作完成，已扣减 ${completion.consumed.length} 类食材`
            : "制作完成，未找到可自动扣减的库存",
      );
    } catch (error) {
      console.error("Failed to complete cooking", error);
      setPersistenceState("error");
      setPersistenceNotice("制作记录失败，库存没有被扣减");
    }
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

        <div className={`persistenceToast ${persistenceState}`} role="status">
          <span />
          {persistenceNotice}
        </div>

        <main className={`screen ${view === "warehouse" ? "warehouseScreen" : ""}`}>
          {persistenceState === "loading" && (
            <div className="persistenceLoading">
              <strong>正在打开你的厨房</strong>
              <span>恢复库存、菜谱、计划和日记</span>
            </div>
          )}
          {persistenceState !== "loading" && (
            <>
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
              catalogFoods={catalogFoods}
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
          {view === "diary" && <DiaryView diary={diary} shoppingList={shoppingList} inventory={inventory} todayPlan={todayPlan} completeCooking={completeCooking} cookingBusy={persistenceState === "saving"} />}
            </>
          )}
        </main>

        <nav className="bottomNav" aria-label="主导航">
          <NavButton icon={<Home size={19} />} label="主页" active={view === "home"} onClick={() => setView("home")} />
          <NavButton icon={<PackageCheck size={19} />} label="仓库" active={view === "warehouse"} onClick={() => setView("warehouse")} />
          <NavButton icon={<BookOpen size={19} />} label="菜谱" active={view === "recipes"} onClick={() => setView("recipes")} />
          <NavButton icon={<NotebookPen size={19} />} label="日记" active={view === "diary"} onClick={() => setView("diary")} />
        </nav>
      </div>

      {uploadOpen && selectedFood && (
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
          catalogFoods={catalogFoods}
          categoryTree={catalogCategories}
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
