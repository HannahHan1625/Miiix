import { initialInventory, kitchenTools, recipesSeed } from "../data/catalog";
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
import type { AmountMode, FoodInfo, InventoryItem, StorageZone, UploadMethod } from "../domain/inventory";
import {
  createMealPlan,
  type MealPlan,
  type ShoppingLine,
} from "../domain/plan";
import type { Recipe } from "../domain/recipe";
import {
  loadCatalogFoodProjection,
  loadCatalogViewProjection,
  type CatalogCategoryView,
} from "./catalogView";

export const LOCAL_USER_ID = "local-demo-user";
const SEED_VERSION = 1;
const SEED_META_KEY = "demo-seed-version";

export type KitchenSnapshot = {
  catalogFoods: FoodInfo[];
  catalogCategories: CatalogCategoryView[];
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
  unitIds: Record<AmountMode, string>;
  unitModeById: Record<string, AmountMode>;
  unitLabelById: Record<string, string>;
  unitBaseFactorById: Record<string, number>;
  storageMethodIds: Record<StorageZone, string>;
  storageZoneById: Record<string, StorageZone>;
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
  const [references, catalogView] = await Promise.all([
    resolveCatalogReferences(provider.repositories.catalog),
    loadCatalogViewProjection(provider.repositories.catalog),
  ]);
  const { foodById } = catalogView;
  const { inventory, recipes, favorites, diarySessions, planRecord } = await loadCoreRecords(
    provider,
    references,
    foodById,
  );
  const recipeById = new Map(recipes.map((bundle) => [
    bundle.recipe.id,
    recipeBundleToRecipe(bundle, foodById),
  ]));
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
      calories: null,
      image: "",
      ingredients: consumed.map((item) => ({
        ingredientId: item.inventoryId,
        name: item.name,
        role: "main" as const,
      })),
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

  const todayPlan = planRecord ? await restoreMealPlan(provider, planRecord, recipeById, foodById) : null;
  const shoppingList = planRecord
    ? await restoreShoppingList(provider, planRecord.id, planRecord.metadata, foodById)
    : [];

  return {
    catalogFoods: catalogView.foods,
    catalogCategories: catalogView.categoryTree,
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
  const [references, foodById] = await Promise.all([
    resolveCatalogReferences(provider.repositories.catalog),
    loadCatalogFoodProjection(provider.repositories.catalog),
  ]);
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
  const foodById = await loadCatalogFoodProjection(provider.repositories.catalog);
  await provider.transaction(async (repositories) => {
    await repositories.recipes.saveRecipe(recipeToSaveInput(recipe, foodById));
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
  const [references, foodById] = await Promise.all([
    resolveCatalogReferences(provider.repositories.catalog),
    loadCatalogFoodProjection(provider.repositories.catalog),
  ]);
  const planRecord = await provider.transaction(async (repositories) => {
    const existing = await repositories.planning.getMealPlan(LOCAL_USER_ID, todayISO());
    if (existing) {
      await repositories.planning.updateMealPlanStatus(LOCAL_USER_ID, existing.id, "cancelled");
    }
    await repositories.recipes.saveRecipe(recipeToSaveInput(recipe, foodById, inventory));
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
      const food = line.ingredientId
        ? foodById.get(line.ingredientId)
        : null;
      if (!food) return [];
      return [{
        ingredientId: food.id,
        conceptId: line.conceptId ?? food.conceptId,
        variantId: line.variantId !== undefined ? line.variantId : food.variantId,
        requestedFormCode: line.formCode ?? food.formCode,
        requestedProcessState: line.processState ?? food.processState,
        requiredQuantity: food.defaultMode === "mass" || food.defaultMode === "volume"
          ? Math.min(food.defaultAmount, 200)
          : 1,
        ownedQuantity: line.owned ? 1 : 0,
        unitId: food.defaultUnitId,
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
  const [references, foodById] = await Promise.all([
    resolveCatalogReferences(provider.repositories.catalog),
    loadCatalogFoodProjection(provider.repositories.catalog),
  ]);

  await provider.transaction(async (repositories) => {
    await repositories.recipes.saveRecipe(recipeToSaveInput(plan.recipe, foodById));
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
      const food = foodById.get(lot.ingredientId);
      if (!food) continue;
      const condiment = plan.recipe.ingredients.some(
        (ingredient) => ingredient.ingredientId === lot.ingredientId && ingredient.role === "seasoning",
      );
      const quantity = consumptionQuantity(lot, condiment, references);
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
        unit: references.unitLabelById[lot.unitId] ?? "",
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
  const [references, foodById] = await Promise.all([
    resolveCatalogReferences(provider.repositories.catalog),
    loadCatalogFoodProjection(provider.repositories.catalog),
  ]);
  await provider.transaction(async (repositories) => {
    for (const recipe of recipesSeed) {
      await repositories.recipes.saveRecipe(recipeToSaveInput(recipe, foodById, initialInventory));
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
      note: "下次可以加一点猪肉末，口感更完整。",
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

async function loadCoreRecords(
  provider: RepositoryProvider,
  references: CatalogReferences,
  foodById: Map<string, FoodInfo>,
) {
  const [lots, recipes, favorites, diarySessions, planRecord] = await Promise.all([
    provider.repositories.inventory.listAvailableLots(LOCAL_USER_ID),
    provider.repositories.recipes.listPublishedRecipes(),
    provider.repositories.recipes.listFavoriteRecipeIds(LOCAL_USER_ID),
    provider.repositories.cooking.listDiary(LOCAL_USER_ID, "2000-01-01", "2100-12-31"),
    provider.repositories.planning.getMealPlan(LOCAL_USER_ID, todayISO()),
  ]);
  return {
    inventory: lots.flatMap((lot) => lotToInventoryItem(lot, references, foodById)),
    recipes,
    favorites,
    diarySessions,
    planRecord,
  };
}

async function loadInventory(provider: RepositoryProvider, references: CatalogReferences) {
  const [lots, foodById] = await Promise.all([
    provider.repositories.inventory.listAvailableLots(LOCAL_USER_ID),
    loadCatalogFoodProjection(provider.repositories.catalog),
  ]);
  return lots.flatMap((lot) => lotToInventoryItem(lot, references, foodById));
}

async function restoreMealPlan(
  provider: RepositoryProvider,
  record: MealPlanRecord,
  recipeById: Map<string, Recipe>,
  foodById: Map<string, FoodInfo>,
) {
  const recipeId = record.recipeIds[0];
  let recipe = recipeById.get(recipeId);
  if (!recipe) {
    const bundle = await provider.repositories.recipes.getRecipe(recipeId);
    if (bundle) recipe = recipeBundleToRecipe(bundle, foodById);
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
  foodById: Map<string, FoodInfo>,
) {
  const storedLines = parseShoppingLines(metadata.shoppingLines);
  if (storedLines.length) return storedLines;
  const bundle = await provider.repositories.planning.getShoppingList(LOCAL_USER_ID, planId);
  if (!bundle) return [];
  if (!bundle.items.length) {
    return [{
      id: `${planId}-covered`,
      ingredientId: null,
      name: "库存已覆盖全部食材",
      reason: "无需额外采购",
      owned: false,
    }];
  }
  return bundle.items.map((item) => ({
    id: item.id,
    ingredientId: item.ingredientId,
    conceptId: item.conceptId,
    variantId: item.variantId,
    formCode: item.requestedFormCode,
    processState: item.requestedProcessState,
    name: foodById.get(item.ingredientId)?.name ?? item.ingredientId,
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
  const expiresAt = item.shelfLifeDays
    ? new Date(purchasedAt.getTime() + item.shelfLifeDays * 86_400_000)
    : null;
  return {
    userId: LOCAL_USER_ID,
    ingredientId: item.id,
    conceptId: item.conceptId,
    variantId: item.variantId,
    formCode: item.formCode,
    processState: item.processState,
    originType: "purchased",
    derivedFromLotId: null,
    quantityInitial: item.amount,
    unitId: item.unitIdsByMode[item.amountMode] ?? item.defaultUnitId,
    storageMethodId: references.storageMethodIds[item.storage],
    storageLocation: item.storage,
    purchasedAt: purchasedAt.toISOString(),
    openedAt: null,
    expiresAt: expiresAt?.toISOString() ?? null,
    priceAmount: item.pricePaid,
    currency: "CNY",
    recognitionJobId: null,
    sourceType: method === "online" ? "online_screenshot" : method,
    note: item.note || null,
    customTags: item.customTags,
  };
}

function lotToInventoryItem(
  lot: InventoryLot,
  references: CatalogReferences,
  foodById: Map<string, FoodInfo>,
): InventoryItem[] {
  const food = foodById.get(lot.ingredientId);
  if (!food) return [];
  const purchasedAt = lot.purchasedAt ? new Date(lot.purchasedAt).getTime() : new Date(lot.createdAt).getTime();
  const addedDaysAgo = Math.max(0, Math.floor((Date.now() - purchasedAt) / 86_400_000));
  const amountMode = references.unitModeById[lot.unitId] ?? food.defaultMode;
  const shelfLifeDays = lot.expiresAt
    ? Math.max(1, Math.ceil((new Date(lot.expiresAt).getTime() - purchasedAt) / 86_400_000))
    : null;
  return [{
    ...food,
    conceptId: lot.conceptId,
    variantId: lot.variantId,
    formCode: lot.formCode,
    processState: lot.processState,
    storage: lot.storageMethodId
      ? references.storageZoneById[lot.storageMethodId] ?? food.storage
      : food.storage,
    shelfLifeDays,
    inventoryId: lot.id,
    amountMode,
    amount: lot.quantityRemaining,
    unitIdsByMode: { ...food.unitIdsByMode, [amountMode]: lot.unitId },
    unitLabelsByMode: {
      ...food.unitLabelsByMode,
      [amountMode]: references.unitLabelById[lot.unitId] ?? food.unitLabelsByMode[amountMode],
    },
    unitBaseFactorsByMode: {
      ...food.unitBaseFactorsByMode,
      [amountMode]: references.unitBaseFactorById[lot.unitId] ?? food.unitBaseFactorsByMode[amountMode] ?? 1,
    },
    pricePaid: lot.priceAmount,
    note: lot.note ?? "",
    addedDaysAgo,
    customTags: lot.customTags,
    expiresAtISO: lot.expiresAt,
  }];
}

function recipeToSaveInput(
  recipe: Recipe,
  foodById: Map<string, FoodInfo>,
  inventory: InventoryItem[] = [],
): SaveRecipeInput {
  const sourceType = recipesSeed.some((seed) => seed.id === recipe.id) ? "curated" : "generated";
  return {
    id: recipe.id,
    slug: recipe.id,
    title: recipe.title,
    cuisineCode: recipe.cuisine,
    difficulty: difficultyToRecord(recipe.difficulty),
    minutes: recipe.minutes,
    servings: 1,
    caloriesKcal: sourceType === "curated" ? recipe.calories : null,
    imageUri: recipe.image,
    sourceType,
    status: "published",
    metadata: {
      ingredientSnapshot: recipe.ingredients.map((ingredient) => ({
        ingredientId: ingredient.ingredientId,
        conceptId: ingredient.conceptId ?? null,
        variantId: ingredient.variantId ?? null,
        formCode: ingredient.formCode ?? "unspecified",
        processState: ingredient.processState ?? "unspecified",
        name: ingredient.name,
        role: ingredient.role,
      })),
      reason: recipe.reason,
      difficultyZh: recipe.difficulty,
      toolId: recipe.toolId,
    },
    ingredients: recipe.ingredients.flatMap((ingredient, index) => {
      const food = foodById.get(ingredient.ingredientId);
      if (!food) return [];
      const inventoryItem = inventory.find((item) => item.id === food.id);
      return [{
        ingredientId: food.id,
        conceptId: ingredient.conceptId ?? food.conceptId,
        variantId: ingredient.variantId !== undefined ? ingredient.variantId : food.variantId,
        requiredFormCode: ingredient.formCode ?? food.formCode,
        requiredProcessState: ingredient.processState ?? food.processState,
        role: ingredient.role,
        quantity: inventoryItem ? consumptionQuantityForItem(inventoryItem) : null,
        unitId: inventoryItem?.unitIdsByMode[inventoryItem.amountMode] ?? food.defaultUnitId,
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

function recipeBundleToRecipe(bundle: RecipeBundle, foodById: Map<string, FoodInfo>) {
  const metadata = asObject(bundle.recipe.metadata);
  const ingredientSnapshot = parseRecipeIngredientSnapshot(metadata.ingredientSnapshot);
  const ingredientById = new Map(ingredientSnapshot.map((item) => [item.ingredientId, item]));
  return {
    id: bundle.recipe.id,
    title: bundle.recipe.title,
    cuisine: bundle.recipe.cuisineCode ?? "家常",
    difficulty: recordToDifficulty(bundle.recipe),
    minutes: bundle.recipe.minutes,
    calories: bundle.recipe.sourceType === "generated" ? null : bundle.recipe.caloriesKcal,
    image: bundle.recipe.imageUri ?? "",
    ingredients: bundle.ingredients.map((line) => {
      const snapshot = ingredientById.get(line.ingredientId);
      return {
        ingredientId: line.ingredientId,
        conceptId: line.conceptId,
        variantId: line.variantId,
        formCode: line.requiredFormCode,
        processState: line.requiredProcessState,
        name: snapshot?.name ?? foodById.get(line.ingredientId)?.name ?? line.ingredientId,
        role: line.role,
      };
    }),
    toolId: asString(metadata.toolId) ?? bundle.toolIds[0] ?? "wok",
    reason: asString(metadata.reason) ?? "从已保存的菜谱恢复。",
    steps: bundle.steps.map((step) => step.instruction),
  } satisfies Recipe;
}

function selectLotsForCooking(lots: InventoryLot[], plan: MealPlan) {
  const selected = new Set(plan.selectedInventoryIds);
  if (selected.size) return lots.filter((lot) => selected.has(lot.id));

  const requiredIngredients = plan.recipe.ingredients.filter((ingredient) => ingredient.role === "main");
  const chosenRequirements = new Set<number>();
  return lots.filter((lot) => {
    const requirementIndex = requiredIngredients.findIndex((ingredient, index) => (
      !chosenRequirements.has(index) && lotSatisfiesIngredient(lot, ingredient)
    ));
    if (requirementIndex < 0) return false;
    chosenRequirements.add(requirementIndex);
    return true;
  });
}

function lotSatisfiesIngredient(lot: InventoryLot, requirement: Recipe["ingredients"][number]) {
  if (!requirement.conceptId) return lot.ingredientId === requirement.ingredientId;
  if (lot.conceptId !== requirement.conceptId) return false;
  if (requirement.variantId && lot.variantId !== requirement.variantId) return false;
  if (requirement.formCode && requirement.formCode !== "unspecified"
    && lot.formCode !== requirement.formCode) return false;
  if (requirement.processState && requirement.processState !== "unspecified"
    && lot.processState !== requirement.processState) return false;
  return true;
}

function consumptionQuantity(lot: InventoryLot, condiment: boolean, references: CatalogReferences) {
  const mode = references.unitModeById[lot.unitId];
  if (mode === "mass" || mode === "volume") {
    const baseFactor = references.unitBaseFactorById[lot.unitId] ?? 1;
    return Math.min(lot.quantityRemaining, (condiment ? 10 : 125) / baseFactor);
  }
  return Math.min(lot.quantityRemaining, condiment ? 0.1 : 1);
}

function consumptionQuantityForItem(item: InventoryItem) {
  if (item.amountMode === "mass" || item.amountMode === "volume") {
    const baseFactor = item.unitBaseFactorsByMode[item.amountMode] ?? 1;
    return Math.min(item.amount, (item.kind === "condiment" ? 10 : 125) / baseFactor);
  }
  return Math.min(item.amount, item.kind === "condiment" ? 0.1 : 1);
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
  return {
    id: line.id,
    ingredientId: line.ingredientId,
    conceptId: line.conceptId ?? null,
    variantId: line.variantId ?? null,
    formCode: line.formCode ?? "unspecified",
    processState: line.processState ?? "unspecified",
    name: line.name,
    reason: line.reason,
    owned: line.owned,
  };
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
    return [{
      id,
      ingredientId: asString(record.ingredientId),
      conceptId: asString(record.conceptId),
      variantId: asString(record.variantId),
      formCode: asIngredientFormCode(record.formCode),
      processState: asIngredientProcessState(record.processState),
      name,
      reason,
      owned: record.owned,
    }];
  });
}

function parseRecipeIngredientSnapshot(value: JsonValue | undefined) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asObject(item);
    const ingredientId = asString(record.ingredientId);
    const name = asString(record.name);
    const role = asString(record.role);
    if (!ingredientId || !name || !role || !["main", "seasoning", "optional", "garnish"].includes(role)) return [];
    return [{
      ingredientId,
      conceptId: asString(record.conceptId) ?? undefined,
      variantId: record.variantId === null ? null : asString(record.variantId) ?? undefined,
      formCode: asIngredientFormCode(record.formCode),
      processState: asIngredientProcessState(record.processState),
      name,
      role: role as "main" | "seasoning" | "optional" | "garnish",
    }];
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

function asIngredientFormCode(value: JsonValue | undefined) {
  return typeof value === "string"
    && ["unspecified", "whole_piece", "sliced", "diced", "shredded", "ground"].includes(value)
    ? value as Recipe["ingredients"][number]["formCode"]
    : undefined;
}

function asIngredientProcessState(value: JsonValue | undefined) {
  return typeof value === "string" && ["unspecified", "raw", "cooked", "processed"].includes(value)
    ? value as Recipe["ingredients"][number]["processState"]
    : undefined;
}

async function resolveCatalogReferences(catalog: CatalogRepository): Promise<CatalogReferences> {
  const [units, storageMethods] = await Promise.all([
    catalog.listUnits(),
    catalog.listStorageMethods(),
  ]);
  const unitId = (code: string) => requireCatalogId(units, [code], `unit:${code}`);
  const storageMethodId = (codes: string[], label: string) =>
    requireCatalogId(storageMethods, codes, `storage:${label}`);

  const storageMethodIds: Record<StorageZone, string> = {
    fridge: storageMethodId(["refrigerated", "fridge"], "fridge"),
    freezer: storageMethodId(["frozen", "freezer"], "freezer"),
    room: storageMethodId(["room_temperature", "room"], "room"),
    dryDark: storageMethodId(["dry_dark", "seasoning", "cool_dark"], "dry-dark"),
  };

  return {
    unitIds: {
      count: unitId("piece"),
      mass: unitId("g"),
      volume: unitId("ml"),
      package: unitId("package"),
    },
    unitModeById: Object.fromEntries(units.map((unit) => [unit.id, unit.dimension as AmountMode])),
    unitLabelById: Object.fromEntries(units.map((unit) => [unit.id, unit.nameZh])),
    unitBaseFactorById: Object.fromEntries(units.map((unit) => [unit.id, unit.baseFactor ?? 1])),
    storageMethodIds,
    storageZoneById: Object.fromEntries(
      Object.entries(storageMethodIds).map(([zone, id]) => [id, zone as StorageZone]),
    ),
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
