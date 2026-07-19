import "fake-indexeddb/auto";

import { openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCatalogSeed } from "./catalogSeed";
import { IndexedDbContext } from "./context";
import {
  deleteMiiixDatabase,
  MIIIX_DATABASE_VERSION,
  openMiiixDatabase,
} from "./schema";

const databases = new Set<string>();

afterEach(async () => {
  await Promise.all([...databases].map((name) => deleteMiiixDatabase(name)));
  databases.clear();
});

describe("IndexedDB v1 to v2 schema upgrade", () => {
  it("adds catalog stores without rebuilding or losing operational stores", async () => {
    const name = uniqueDatabaseName("schema-upgrade");
    const v1 = await openV1Fixture(name);

    await seedOperationalFixture(v1);
    v1.close();

    const v2 = await openMiiixDatabase(name);

    expect(v2.version).toBe(MIIIX_DATABASE_VERSION);
    expect([...v2.objectStoreNames]).toEqual(expect.arrayContaining([
      "inventoryLots",
      "inventoryTransactions",
      "recipes",
      "recipeIngredients",
      "mealPlans",
      "shoppingItems",
      "cookingSessions",
      "recognitionCandidates",
      "recommendationRuns",
      "recommendationCandidates",
      "catalogSources",
      "catalogCategories",
      "catalogUnits",
      "catalogStorageMethods",
      "catalogIngredients",
    ]));

    await expect(v2.get("inventoryLots", "lot-v1")).resolves.toMatchObject({
      id: "lot-v1",
      ingredientId: "egg",
      quantityRemaining: 200,
      unitId: "unit-gram",
      storageMethodId: "storage-seasoning",
      storageLocation: "seasoning",
      priceAmount: 19.9,
      openedAt: "2026-07-18T08:00:00.000Z",
      expiresAt: "2026-07-25T04:00:00.000Z",
      note: "用户手工备注",
      customTags: ["冷冻分装", "优先吃"],
      currency: "CNY",
      status: "available",
      createdAt: "2026-07-18T04:00:00.000Z",
      updatedAt: "2026-07-19T01:00:00.000Z",
    });
    await expect(v2.get("inventoryTransactions", "transaction-v1")).resolves.toMatchObject({
      inventoryLotId: "lot-v1",
      idempotencyKey: "initial:lot-v1",
    });
    await expect(v2.get("recipes", "recipe-v1")).resolves.toMatchObject({ title: "旧菜谱" });
    await expect(v2.get("recipeIngredients", "recipe-ingredient-v1")).resolves.toMatchObject({
      ingredientId: "pork",
    });
    await expect(v2.get("mealPlans", "plan-v1")).resolves.toMatchObject({
      recipeIds: ["recipe-v1"],
    });
    await expect(v2.get("shoppingItems", "shopping-item-v1")).resolves.toMatchObject({
      ingredientId: "rice",
    });
    await expect(v2.get("cookingSessions", "session-v1")).resolves.toMatchObject({
      idempotencyKey: "cook:2026-07-19",
    });

    const indexTransaction = v2.transaction(
      ["inventoryLots", "inventoryTransactions", "cookingSessions"],
      "readonly",
    );
    expect([...indexTransaction.objectStore("inventoryLots").indexNames]).toContain("by-user-ingredient");
    expect([...indexTransaction.objectStore("inventoryTransactions").indexNames]).toContain(
      "by-user-idempotency",
    );
    expect([...indexTransaction.objectStore("cookingSessions").indexNames]).toContain(
      "by-user-idempotency",
    );
    await indexTransaction.done;

    await ensureCatalogSeed(new IndexedDbContext(v2));
    await expect(v2.get("inventoryLots", "lot-v1")).resolves.toMatchObject({
      id: "lot-v1",
      ingredientId: "50000000-0000-4000-8000-000000000001",
      quantityInitial: 200,
      quantityRemaining: 200,
      unitId: "20000000-0000-4000-8000-000000000001",
      storageMethodId: "30000000-0000-4000-8000-000000000004",
      storageLocation: "dryDark",
      priceAmount: 19.9,
      purchasedAt: "2026-07-18T04:00:00.000Z",
      openedAt: "2026-07-18T08:00:00.000Z",
      expiresAt: "2026-07-25T04:00:00.000Z",
      note: "用户手工备注",
      customTags: ["冷冻分装", "优先吃"],
      currency: "CNY",
      status: "available",
      createdAt: "2026-07-18T04:00:00.000Z",
      updatedAt: "2026-07-19T01:00:00.000Z",
    });
    await expect(v2.get("inventoryTransactions", "transaction-v1")).resolves.toMatchObject({
      unitId: "20000000-0000-4000-8000-000000000001",
    });
    await expect(v2.get("recipeIngredients", "recipe-ingredient-v1")).resolves.toMatchObject({
      ingredientId: "50000000-0000-4000-8000-000000000007",
      unitId: "20000000-0000-4000-8000-000000000001",
    });
    await expect(v2.get("shoppingItems", "shopping-item-v1")).resolves.toMatchObject({
      ingredientId: "50000000-0000-4000-8000-000000000025",
      unitId: "20000000-0000-4000-8000-000000000003",
    });
    await expect(v2.get("recognitionCandidates", "recognition-v1")).resolves.toMatchObject({
      ingredientId: "50000000-0000-4000-8000-000000000001",
      correctedIngredientId: "50000000-0000-4000-8000-000000000007",
    });
    await expect(v2.get("recommendationRuns", "run-v1")).resolves.toMatchObject({
      selectedIngredientIds: [
        "50000000-0000-4000-8000-000000000001",
        "unknown-legacy",
      ],
    });
    await expect(v2.get("recommendationCandidates", "candidate-v1")).resolves.toMatchObject({
      ingredientIds: [
        "50000000-0000-4000-8000-000000000007",
        "50000000-0000-4000-8000-000000000025",
      ],
    });

    v2.close();
  });

  it("can reopen v2 without rerunning the v1 store creation path", async () => {
    const name = uniqueDatabaseName("schema-reopen");
    const initial = await openV1Fixture(name);
    await initial.put("meta", { key: "v1-marker", value: "preserve-me" });
    initial.close();

    const firstV2 = await openMiiixDatabase(name);
    firstV2.close();
    const reopenedV2 = await openMiiixDatabase(name);

    await expect(reopenedV2.get("meta", "v1-marker")).resolves.toEqual({
      key: "v1-marker",
      value: "preserve-me",
    });
    reopenedV2.close();
  });
});

function uniqueDatabaseName(suffix: string) {
  const name = `miiix-test-${suffix}-${crypto.randomUUID()}`;
  databases.add(name);
  return name;
}

function openV1Fixture(name: string) {
  return openDB(name, 1, {
    upgrade(database) {
      database.createObjectStore("meta", { keyPath: "key" });

      const lots = database.createObjectStore("inventoryLots", { keyPath: "id" });
      lots.createIndex("by-user", "userId");
      lots.createIndex("by-user-status", ["userId", "status"]);
      lots.createIndex("by-user-ingredient", ["userId", "ingredientId"]);

      const transactions = database.createObjectStore("inventoryTransactions", { keyPath: "id" });
      transactions.createIndex("by-user", "userId");
      transactions.createIndex("by-lot", "inventoryLotId");
      transactions.createIndex("by-user-idempotency", ["userId", "idempotencyKey"], { unique: true });

      const recipes = database.createObjectStore("recipes", { keyPath: "id" });
      recipes.createIndex("by-status", "status");

      const recipeIngredients = database.createObjectStore("recipeIngredients", { keyPath: "id" });
      recipeIngredients.createIndex("by-recipe", "recipeId");

      const recipeSteps = database.createObjectStore("recipeSteps", { keyPath: "id" });
      recipeSteps.createIndex("by-recipe", "recipeId");

      const recipeTools = database.createObjectStore("recipeTools", { keyPath: "id" });
      recipeTools.createIndex("by-recipe", "recipeId");

      const favorites = database.createObjectStore("favorites", { keyPath: "id" });
      favorites.createIndex("by-user", "userId");

      const plans = database.createObjectStore("mealPlans", { keyPath: "id" });
      plans.createIndex("by-user", "userId");
      plans.createIndex("by-user-date", ["userId", "plannedDate"]);

      const shoppingLists = database.createObjectStore("shoppingLists", { keyPath: "id" });
      shoppingLists.createIndex("by-user", "userId");
      shoppingLists.createIndex("by-meal-plan", "mealPlanId");

      const shoppingItems = database.createObjectStore("shoppingItems", { keyPath: "id" });
      shoppingItems.createIndex("by-list", "shoppingListId");

      const cookingSessions = database.createObjectStore("cookingSessions", { keyPath: "id" });
      cookingSessions.createIndex("by-user", "userId");
      cookingSessions.createIndex("by-user-idempotency", ["userId", "idempotencyKey"], { unique: true });

      const recognitionJobs = database.createObjectStore("recognitionJobs", { keyPath: "id" });
      recognitionJobs.createIndex("by-user", "userId");

      const recognitionCandidates = database.createObjectStore("recognitionCandidates", { keyPath: "id" });
      recognitionCandidates.createIndex("by-job", "jobId");

      const recommendationRuns = database.createObjectStore("recommendationRuns", { keyPath: "id" });
      recommendationRuns.createIndex("by-user", "userId");

      const recommendationCandidates = database.createObjectStore("recommendationCandidates", { keyPath: "id" });
      recommendationCandidates.createIndex("by-run", "runId");

      const recommendationFeedback = database.createObjectStore("recommendationFeedback", { keyPath: "id" });
      recommendationFeedback.createIndex("by-user", "userId");
      recommendationFeedback.createIndex("by-run", "runId");
    },
  });
}

async function seedOperationalFixture(database: Awaited<ReturnType<typeof openV1Fixture>>) {
  const transaction = database.transaction([
    "inventoryLots",
    "inventoryTransactions",
    "recipes",
    "recipeIngredients",
    "mealPlans",
    "shoppingLists",
    "shoppingItems",
    "cookingSessions",
    "recognitionCandidates",
    "recommendationRuns",
    "recommendationCandidates",
  ], "readwrite");

  await transaction.objectStore("inventoryLots").add({
    id: "lot-v1",
    userId: "user-v1",
    ingredientId: "egg",
    quantityInitial: 200,
    quantityRemaining: 200,
    unitId: "unit-gram",
    storageMethodId: "storage-seasoning",
    storageLocation: "seasoning",
    purchasedAt: "2026-07-18T04:00:00.000Z",
    openedAt: "2026-07-18T08:00:00.000Z",
    expiresAt: "2026-07-25T04:00:00.000Z",
    priceAmount: 19.9,
    note: "用户手工备注",
    customTags: ["冷冻分装", "优先吃"],
    status: "available",
    currency: "CNY",
    createdAt: "2026-07-18T04:00:00.000Z",
    updatedAt: "2026-07-19T01:00:00.000Z",
  });
  await transaction.objectStore("inventoryTransactions").add({
    id: "transaction-v1",
    userId: "user-v1",
    inventoryLotId: "lot-v1",
    unitId: "unit-gram",
    idempotencyKey: "initial:lot-v1",
  });
  await transaction.objectStore("recipes").add({
    id: "recipe-v1",
    title: "旧菜谱",
    status: "published",
  });
  await transaction.objectStore("recipeIngredients").add({
    id: "recipe-ingredient-v1",
    recipeId: "recipe-v1",
    ingredientId: "pork",
    unitId: "unit-gram",
  });
  await transaction.objectStore("mealPlans").add({
    id: "plan-v1",
    userId: "user-v1",
    plannedDate: "2026-07-19",
    recipeIds: ["recipe-v1"],
  });
  await transaction.objectStore("shoppingLists").add({
    id: "shopping-list-v1",
    userId: "user-v1",
    mealPlanId: "plan-v1",
  });
  await transaction.objectStore("shoppingItems").add({
    id: "shopping-item-v1",
    shoppingListId: "shopping-list-v1",
    ingredientId: "rice",
    unitId: "unit-piece",
  });
  await transaction.objectStore("cookingSessions").add({
    id: "session-v1",
    userId: "user-v1",
    idempotencyKey: "cook:2026-07-19",
  });
  await transaction.objectStore("recognitionCandidates").add({
    id: "recognition-v1",
    jobId: "job-v1",
    ingredientId: "egg",
    correctedIngredientId: "pork",
  });
  await transaction.objectStore("recommendationRuns").add({
    id: "run-v1",
    userId: "user-v1",
    selectedIngredientIds: ["egg", "unknown-legacy"],
  });
  await transaction.objectStore("recommendationCandidates").add({
    id: "candidate-v1",
    runId: "run-v1",
    ingredientIds: ["pork", "rice"],
  });

  await transaction.done;
}
