import { foodLibrary, initialInventory, kitchenTools, recipesSeed } from "../data/catalog";
import type {
  CatalogRepository,
  CreateInventoryLotInput,
  RecipeBundle,
  RepositoryProvider,
  SaveRecipeInput,
} from "../data/repositories";
import {
  createDiaryEntry,
  todayISO,
  toISODate,
  type ConsumedInventoryItem,
  type DiaryEntry,
} from "../domain/diary";
import type { InventoryLot, JsonValue, MealPlanRecord, RecipeDocument } from "../domain/persistence";
import type { InventoryItem, StorageZone, UploadMethod } from "../domain/inventory";
import { createMealPlan, type MealPlan, type ShoppingLine } from "../domain/plan";
import {
  recipeMainIngredients,
  type Recipe,
} from "../domain/recipe";

export const LOCAL_USER_ID = "local-demo-user";
const SEED_VERSION = 1;
const SEED_META_KEY = "demo-seed-version";

export type KitchenSnapshot = {
  inventory: InventoryItem[];
  savedRecipes: Recipe[];
  favorites: string[];
  cookedIds: string[];
  todayPlan: MealPlan | null;
  shoppingList: ShoppingLine[];
  diary: DiaryEntry[];
};

export type CookingCompletion = {
  snapshot: KitchenSnapshot;
  consumed: ConsumedInventoryItem[];
  alreadyCompleted: boolean;
};

type SeedableRepositoryProvider = RepositoryProvider & {
  getMeta<T extends JsonValue>(key: string): Promise<T | null>;
  setMeta(key: string, value: JsonValue): Promise<void>;
};

type CatalogReferences = {
  unitIds: {
    count: string;
    weight: string;
  };
  storageMethodIds: Record<StorageZone, string>;
};

export async function initializeKitchenState(provider: SeedableRepositoryProvider) {
  const seedVersion = await provider.getMeta<number>(SEED_META_KEY);
  if (seedVersion !== SEED_VERSION) {
    await seedLocalDemoData(provider);
    await provider.setMeta(SEED_META_KEY, SEED_VERSION);
  }
  return loadKitchenState(provider);
}

export async function loadKitchenState(provider: RepositoryProvider): Promise<KitchenSnapshot> {
  const references = await resolveCatalogReferences(provider.repositories.catalog);
  const { inventory, recipes, favorites, diarySessions, planRecord } = await loadCoreRecords(provider, references);
  const recipeById = new Map(recipes.map((bundle) => [bundle.recipe.id, recipeBundleToRecipe(bundle)]));
  const diary = diarySessions.map((session) => {
    const recipe = recipeById.get(session.recipeId);
    const metadata = asObject(session.metadata);
    const source = asString(metadata.source) ?? "制作记录";
    const tool = kitchenTools.find((item) => item.id === asString(metadata.toolId)) ?? kitchenTools[0];
    const consumed = parseConsumedItems(metadata.consumed);
    const fallbackRecipe: Recipe = recipe ?? {
      id: session.recipeId,
      title: asString(metadata.recipeTitle) ?? "已完成菜肴",
      cuisine: asString(metadata.cuisine) ?? "家常",
      difficulty: "轻松",
      minutes: 15,
      calories: 0,
      image: "",
      required: consumed.map((item) => item.name),
      toolId: tool.id,
      reason: "从制作记录恢复。",
      steps: [],
    };
    const completedDate = asString(metadata.completedDateISO)
      ?? toISODate(new Date(session.completedAt ?? session.startedAt));
    return {
      ...createDiaryEntry(fallbackRecipe, source, tool, completedDate, consumed),
      id: session.id,
      date: completedDate === todayISO() ? "今天" : completedDate,
      note: session.note ?? createConsumptionNote(consumed, source),
    };
  });

  const todayPlan = planRecord ? await restoreMealPlan(provider, planRecord, recipeById) : null;
  const shoppingList = planRecord
    ? await restoreShoppingList(provider, planRecord.id, planRecord.metadata)
    : [];

  return {
    inventory,
    savedRecipes: Array.from(recipeById.values()).filter((recipe) => !recipesSeed.some((seed) => seed.id === recipe.id)),
    favorites,
    cookedIds: Array.from(new Set(diarySessions.map((session) => session.recipeId))),
    todayPlan,
    shoppingList,
    diary,
  };
}

export async function addInventoryItems(
  provider: RepositoryProvider,
  items: InventoryItem[],
  method: UploadMethod,
) {
  const references = await resolveCatalogReferences(provider.repositories.catalog);
  await provider.transaction(async (repositories) => {
    for (const item of items) {
      await repositories.inventory.createLot(inventoryItemToLotInput(item, method, references));
    }
  });
  return loadInventory(provider, references);
}

export async function setRecipeFavorite(
  provider: RepositoryProvider,
  recipe: Recipe,
  favorite: boolean,
) {
  const references = await resolveCatalogReferences(provider.repositories.catalog);
  await provider.transaction(async (repositories) => {
    await repositories.recipes.saveRecipe(recipeToSaveInput(recipe, references));
    await repositories.recipes.setFavorite(LOCAL_USER_ID, recipe.id, favorite);
  });
}

export async function saveTodayPlan(
  provider: RepositoryProvider,
  recipe: Recipe,
  source: string,
  inventory: InventoryItem[],
  selectedInventoryIds: string[] = [],
) {
  const draft = createMealPlan(recipe, source, inventory, todayISO(), selectedInventoryIds);
  const shoppingLines = draft.shoppingList;
  const references = await resolveCatalogReferences(provider.repositories.catalog);
  const planRecord = await provider.transaction(async (repositories) => {
    const existing = await repositories.planning.getMealPlan(LOCAL_USER_ID, todayISO());
    if (existing) {
      await repositories.planning.updateMealPlanStatus(LOCAL_USER_ID, existing.id, "cancelled");
    }
    await repositories.recipes.saveRecipe(recipeToSaveInput(recipe, references, inventory));
    const created = await repositories.planning.createMealPlan({
      userId: LOCAL_USER_ID,
      plannedDate: todayISO(),
      source,
      recipeIds: [recipe.id],
      metadata: {
        selectedInventoryLotIds: draft.plan.selectedInventoryIds,
        shoppingLines: shoppingLines.map(shoppingLineToJson),
      },
    });
    const shoppingList = await repositories.planning.createShoppingList(
      LOCAL_USER_ID,
      created.id,
      `《${recipe.title}》购物清单`,
    );
    const structuredItems = shoppingLines.flatMap((line) => {
      const food = foodLibrary.find((item) => item.name === line.name);
      if (!food || line.name === "库存已覆盖全部食材") return [];
      return [{
        ingredientId: food.id,
        requiredQuantity: food.defaultMode === "weight" ? Math.min(food.defaultWeight, 200) : 1,
        ownedQuantity: line.owned ? 1 : 0,
        unitId: food.defaultMode === "weight" ? references.unitIds.weight : references.unitIds.count,
        reason: line.reason,
        status: line.owned ? "skipped" as const : "needed" as const,
      }];
    });
    await repositories.planning.replaceShoppingItems(LOCAL_USER_ID, shoppingList.id, structuredItems);
    return created;
  });

  return {
    plan: {
      ...draft.plan,
      id: planRecord.id,
    },
    shoppingList: shoppingLines,
  };
}

export async function completeCookingAndConsume(
  provider: RepositoryProvider,
  plan: MealPlan,
): Promise<CookingCompletion> {
  let consumed: ConsumedInventoryItem[] = [];
  let alreadyCompleted = false;
  const references = await resolveCatalogReferences(provider.repositories.catalog);

  await provider.transaction(async (repositories) => {
    await repositories.recipes.saveRecipe(recipeToSaveInput(plan.recipe, references));
    const session = await repositories.cooking.startSession({
      userId: LOCAL_USER_ID,
      recipeId: plan.recipe.id,
      mealPlanItemId: null,
      idempotencyKey: `meal-plan:${plan.id}`,
    });
    if (session.status === "completed") {
      consumed = parseConsumedItems(session.metadata.consumed);
      alreadyCompleted = true;
      return;
    }

    const availableLots = await repositories.inventory.listAvailableLots(LOCAL_USER_ID);
    const targetLots = selectLotsForCooking(availableLots, plan);
    for (const lot of targetLots) {
      const food = foodLibrary.find((item) => item.id === lot.ingredientId);
      if (!food) continue;
      const quantity = consumptionQuantity(lot, food.storage === "seasoning", references);
      if (quantity <= 0) continue;
      const transaction = await repositories.inventory.appendTransaction({
        userId: LOCAL_USER_ID,
        inventoryLotId: lot.id,
        cookingSessionId: session.id,
        type: "consume",
        quantity,
        unitId: lot.unitId,
        idempotencyKey: `cook:${session.id}:${lot.id}`,
        note: `完成《${plan.recipe.title}》`,
        metadata: {
          recipeId: plan.recipe.id,
          ingredientId: lot.ingredientId,
        },
      });
      const updatedLot = await repositories.inventory.getLot(LOCAL_USER_ID, lot.id);
      consumed.push({
        inventoryId: lot.id,
        name: food.name,
        quantity: transaction.quantity,
        unit: lot.unitId === references.unitIds.weight ? "g" : food.unit,
        remaining: updatedLot?.quantityRemaining ?? 0,
      });
    }

    const tool = kitchenTools.find((item) => item.id === plan.recipe.toolId) ?? kitchenTools[0];
    await repositories.cooking.completeSession(LOCAL_USER_ID, session.id, {
      completedAt: new Date().toISOString(),
      note: createConsumptionNote(consumed, plan.source),
      metadata: {
        source: plan.source,
        recipeTitle: plan.recipe.title,
        cuisine: plan.recipe.cuisine,
        toolId: tool.id,
        completedDateISO: todayISO(),
        consumed: consumed.map(consumedItemToJson),
      },
    });
    await repositories.planning.updateMealPlanStatus(LOCAL_USER_ID, plan.id, "completed");
  });

  return {
    snapshot: await loadKitchenState(provider),
    consumed,
    alreadyCompleted,
  };
}

async function seedLocalDemoData(provider: RepositoryProvider) {
  const references = await resolveCatalogReferences(provider.repositories.catalog);
  await provider.transaction(async (repositories) => {
    for (const recipe of recipesSeed) {
      await repositories.recipes.saveRecipe(recipeToSaveInput(recipe, references, initialInventory));
    }
    for (const item of initialInventory) {
      await repositories.inventory.createLot(inventoryItemToLotInput(item, "manual", references));
    }
    await repositories.recipes.setFavorite(LOCAL_USER_ID, "eggplant-pork-rice", true);
    const seededSession = await repositories.cooking.startSession({
      userId: LOCAL_USER_ID,
      recipeId: "pepper-egg",
      mealPlanItemId: null,
      idempotencyKey: "seed:pepper-egg",
      startedAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    await repositories.cooking.completeSession(LOCAL_USER_ID, seededSession.id, {
      completedAt: new Date(Date.now() - 86_400_000).toISOString(),
      note: "下次可以加一点肉沫，口感更完整。",
      metadata: {
        source: "做过的菜",
        recipeTitle: "青椒炒蛋",
        cuisine: "快手家常",
        toolId: "wok",
        completedDateISO: toISODate(new Date(Date.now() - 86_400_000)),
        consumed: [],
      },
    });
  });
}

async function loadCoreRecords(provider: RepositoryProvider, references: CatalogReferences) {
  const [lots, recipes, favorites, diarySessions, planRecord] = await Promise.all([
    provider.repositories.inventory.listAvailableLots(LOCAL_USER_ID),
    provider.repositories.recipes.listPublishedRecipes(),
    provider.repositories.recipes.listFavoriteRecipeIds(LOCAL_USER_ID),
    provider.repositories.cooking.listDiary(LOCAL_USER_ID, "2000-01-01", "2100-12-31"),
    provider.repositories.planning.getMealPlan(LOCAL_USER_ID, todayISO()),
  ]);
  return {
    inventory: lots.flatMap((lot) => lotToInventoryItem(lot, references)),
    recipes,
    favorites,
    diarySessions,
    planRecord,
  };
}

async function loadInventory(provider: RepositoryProvider, references: CatalogReferences) {
  const lots = await provider.repositories.inventory.listAvailableLots(LOCAL_USER_ID);
  return lots.flatMap((lot) => lotToInventoryItem(lot, references));
}

async function restoreMealPlan(
  provider: RepositoryProvider,
  record: MealPlanRecord,
  recipeById: Map<string, Recipe>,
) {
  const recipeId = record.recipeIds[0];
  let recipe = recipeById.get(recipeId);
  if (!recipe) {
    const bundle = await provider.repositories.recipes.getRecipe(recipeId);
    if (bundle) recipe = recipeBundleToRecipe(bundle);
  }
  if (!recipe) return null;
  return {
    id: record.id,
    recipe,
    source: record.source,
    plannedDateISO: record.plannedDate,
    selectedInventoryIds: asStringArray(record.metadata.selectedInventoryLotIds),
  } satisfies MealPlan;
}

async function restoreShoppingList(
  provider: RepositoryProvider,
  planId: string,
  metadata: Record<string, JsonValue>,
) {
  const storedLines = parseShoppingLines(metadata.shoppingLines);
  if (storedLines.length) return storedLines;
  const bundle = await provider.repositories.planning.getShoppingList(LOCAL_USER_ID, planId);
  if (!bundle) return [];
  if (!bundle.items.length) {
    return [{
      id: `${planId}-covered`,
      name: "库存已覆盖全部食材",
      reason: "无需额外采购",
      owned: false,
    }];
  }
  return bundle.items.map((item) => ({
    id: item.id,
    name: foodLibrary.find((food) => food.id === item.ingredientId)?.name ?? item.ingredientId,
    reason: item.reason ?? bundle.list.title,
    owned: item.ownedQuantity >= item.requiredQuantity,
  }));
}

function inventoryItemToLotInput(
  item: InventoryItem,
  method: UploadMethod,
  references: CatalogReferences,
): CreateInventoryLotInput {
  const purchasedAt = new Date(Date.now() - item.addedDaysAgo * 86_400_000);
  const expiresAt = new Date(purchasedAt);
  expiresAt.setDate(expiresAt.getDate() + item.shelfLifeDays);
  return {
    userId: LOCAL_USER_ID,
    ingredientId: item.id,
    quantityInitial: item.amount,
    unitId: item.amountMode === "weight" ? references.unitIds.weight : references.unitIds.count,
    storageMethodId: references.storageMethodIds[item.storage],
    storageLocation: item.storage,
    purchasedAt: purchasedAt.toISOString(),
    openedAt: null,
    expiresAt: expiresAt.toISOString(),
    priceAmount: item.pricePaid,
    currency: "CNY",
    recognitionJobId: null,
    sourceType: method === "online" ? "online_screenshot" : method,
    note: item.note || null,
    customTags: item.customTags,
  };
}

function lotToInventoryItem(lot: InventoryLot, references: CatalogReferences): InventoryItem[] {
  const food = foodLibrary.find((item) => item.id === lot.ingredientId);
  if (!food) return [];
  const purchasedAt = lot.purchasedAt ? new Date(lot.purchasedAt).getTime() : new Date(lot.createdAt).getTime();
  const addedDaysAgo = Math.max(0, Math.floor((Date.now() - purchasedAt) / 86_400_000));
  return [{
    ...food,
    inventoryId: lot.id,
    amountMode: lot.unitId === references.unitIds.weight ? "weight" : "count",
    amount: lot.quantityRemaining,
    pricePaid: lot.priceAmount ?? food.price,
    note: lot.note ?? "",
    addedDaysAgo,
    customTags: lot.customTags,
  }];
}

function recipeToSaveInput(
  recipe: Recipe,
  references: CatalogReferences,
  inventory: InventoryItem[] = [],
): SaveRecipeInput {
  const mainNames = new Set(recipeMainIngredients(recipe));
  return {
    id: recipe.id,
    slug: recipe.id,
    title: recipe.title,
    cuisineCode: recipe.cuisine,
    difficulty: difficultyToRecord(recipe.difficulty),
    minutes: recipe.minutes,
    servings: 1,
    caloriesKcal: recipe.calories,
    imageUri: recipe.image,
    sourceType: recipesSeed.some((seed) => seed.id === recipe.id) ? "curated" : "generated",
    status: "published",
    metadata: {
      required: recipe.required,
      reason: recipe.reason,
      difficultyZh: recipe.difficulty,
      toolId: recipe.toolId,
    },
    ingredients: recipe.required.flatMap((name, index) => {
      const food = foodLibrary.find((item) => item.name === name);
      if (!food) return [];
      const inventoryItem = inventory.find((item) => item.id === food.id);
      return [{
        ingredientId: food.id,
        role: mainNames.has(name) ? "main" as const : "seasoning" as const,
        quantity: inventoryItem ? consumptionQuantityForItem(inventoryItem) : null,
        unitId: food.defaultMode === "weight" ? references.unitIds.weight : references.unitIds.count,
        preparation: null,
        substitutionGroup: null,
        sortOrder: index,
      }];
    }),
    steps: recipe.steps.map((instruction, index) => ({
      stepNumber: index + 1,
      instruction,
      durationMinutes: null,
      mediaUri: null,
    })),
    toolIds: [recipe.toolId],
  };
}

function recipeBundleToRecipe(bundle: RecipeBundle) {
  const metadata = asObject(bundle.recipe.metadata);
  const required = asStringArray(metadata.required);
  return {
    id: bundle.recipe.id,
    title: bundle.recipe.title,
    cuisine: bundle.recipe.cuisineCode ?? "家常",
    difficulty: recordToDifficulty(bundle.recipe),
    minutes: bundle.recipe.minutes,
    calories: bundle.recipe.caloriesKcal ?? 0,
    image: bundle.recipe.imageUri ?? "",
    required: required.length
      ? required
      : bundle.ingredients.map((line) => foodLibrary.find((food) => food.id === line.ingredientId)?.name ?? line.ingredientId),
    toolId: asString(metadata.toolId) ?? bundle.toolIds[0] ?? "wok",
    reason: asString(metadata.reason) ?? "从已保存的菜谱恢复。",
    steps: bundle.steps.map((step) => step.instruction),
  } satisfies Recipe;
}

function selectLotsForCooking(lots: InventoryLot[], plan: MealPlan) {
  const selected = new Set(plan.selectedInventoryIds);
  if (selected.size) return lots.filter((lot) => selected.has(lot.id));

  const requiredNames = new Set(recipeMainIngredients(plan.recipe));
  const chosenIngredients = new Set<string>();
  return lots.filter((lot) => {
    const food = foodLibrary.find((item) => item.id === lot.ingredientId);
    if (!food || !requiredNames.has(food.name) || chosenIngredients.has(food.id)) return false;
    chosenIngredients.add(food.id);
    return true;
  });
}

function consumptionQuantity(lot: InventoryLot, condiment: boolean, references: CatalogReferences) {
  if (lot.unitId === references.unitIds.weight) {
    return Math.min(lot.quantityRemaining, condiment ? 10 : 125);
  }
  return Math.min(lot.quantityRemaining, condiment ? 0.1 : 1);
}

function consumptionQuantityForItem(item: InventoryItem) {
  if (item.amountMode === "weight") return Math.min(item.amount, item.storage === "seasoning" ? 10 : 125);
  return Math.min(item.amount, item.storage === "seasoning" ? 0.1 : 1);
}

function createConsumptionNote(consumed: ConsumedInventoryItem[], source: string) {
  if (!consumed.length) return `由 ${source} 完成制作；本次没有可自动匹配的库存批次。`;
  return `已扣减库存：${consumed.map((item) => `${item.name} ${item.quantity}${item.unit}`).join("、")}。`;
}

function difficultyToRecord(difficulty: Recipe["difficulty"]): RecipeDocument["difficulty"] {
  return { 轻松: "easy", 认真: "medium", 挑战: "hard" }[difficulty] as RecipeDocument["difficulty"];
}

function recordToDifficulty(recipe: RecipeDocument): Recipe["difficulty"] {
  const metadata = asObject(recipe.metadata);
  const stored = asString(metadata.difficultyZh);
  if (stored === "轻松" || stored === "认真" || stored === "挑战") return stored;
  return { easy: "轻松", medium: "认真", hard: "挑战" }[recipe.difficulty] as Recipe["difficulty"];
}

function shoppingLineToJson(line: ShoppingLine): Record<string, JsonValue> {
  return { id: line.id, name: line.name, reason: line.reason, owned: line.owned };
}

function consumedItemToJson(item: ConsumedInventoryItem): Record<string, JsonValue> {
  return {
    inventoryId: item.inventoryId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    remaining: item.remaining,
  };
}

function parseShoppingLines(value: JsonValue | undefined): ShoppingLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asObject(item);
    const id = asString(record.id);
    const name = asString(record.name);
    const reason = asString(record.reason);
    if (!id || !name || !reason || typeof record.owned !== "boolean") return [];
    return [{ id, name, reason, owned: record.owned }];
  });
}

function parseConsumedItems(value: JsonValue | undefined): ConsumedInventoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asObject(item);
    const inventoryId = asString(record.inventoryId);
    const name = asString(record.name);
    const unit = asString(record.unit);
    if (!inventoryId || !name || !unit || typeof record.quantity !== "number" || typeof record.remaining !== "number") return [];
    return [{ inventoryId, name, unit, quantity: record.quantity, remaining: record.remaining }];
  });
}

function asObject(value: JsonValue | undefined): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, JsonValue>
    : {};
}

function asString(value: JsonValue | undefined) {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: JsonValue | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function resolveCatalogReferences(catalog: CatalogRepository): Promise<CatalogReferences> {
  const [units, storageMethods] = await Promise.all([
    catalog.listUnits(),
    catalog.listStorageMethods(),
  ]);
  const unitId = (code: string) => requireCatalogId(units, [code], `unit:${code}`);
  const storageMethodId = (codes: string[], label: string) =>
    requireCatalogId(storageMethods, codes, `storage:${label}`);

  return {
    unitIds: {
      count: unitId("piece"),
      weight: unitId("g"),
    },
    storageMethodIds: {
      fridge: storageMethodId(["refrigerated", "fridge"], "fridge"),
      freezer: storageMethodId(["frozen", "freezer"], "freezer"),
      room: storageMethodId(["room_temperature", "room"], "room"),
      seasoning: storageMethodId(["dry_dark", "seasoning", "cool_dark"], "seasoning"),
    },
  };
}

function requireCatalogId(
  items: Array<{ id: string; code: string }>,
  codes: string[],
  label: string,
) {
  const match = items.find((item) => codes.includes(item.code));
  if (!match) throw new Error(`Missing catalog reference: ${label}`);
  return match.id;
}
