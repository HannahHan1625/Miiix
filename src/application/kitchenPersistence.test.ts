import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createIndexedDbRepositoryProvider,
  deleteMiiixDatabase,
  type IndexedDbRepositoryProvider,
} from "../data/repositories/indexeddb";
import type { InventoryItem } from "../domain/inventory";
import type { Recipe } from "../domain/recipe";
import { todayISO } from "../domain/diary";
import {
  LOCAL_USER_ID,
  addInventoryItems,
  completeCookingAndConsume,
  initializeKitchenState,
  loadKitchenState,
  saveTodayPlan,
} from "./kitchenPersistence";

describe("persistent kitchen workflow", () => {
  let databaseName: string;
  let provider: IndexedDbRepositoryProvider;

  beforeEach(async () => {
    databaseName = `miiix-test-${crypto.randomUUID()}`;
    provider = await createIndexedDbRepositoryProvider(databaseName);
  });

  afterEach(async () => {
    provider.close();
    await deleteMiiixDatabase(databaseName);
  });

  it("persists inventory, plans, cooking sessions and an idempotent stock deduction", async () => {
    const initialized = await initializeKitchenState(provider);
    expect(initialized.catalogFoods).toHaveLength(30);
    expect(initialized.catalogCategories.map((category) => category.level1)).toContain("肉禽蛋奶豆及水产");
    const egg = initialized.catalogFoods.find((item) => item.name === "鸡蛋");
    if (!egg) throw new Error("Egg catalog record is required for this test");

    const testBatch: InventoryItem = {
      ...egg,
      inventoryId: "temporary-ui-id",
      amountMode: "count",
      amount: 3,
      pricePaid: null,
      note: "纵向链路测试批次",
      addedDaysAgo: 0,
      customTags: ["integration-test"],
      expiresAtISO: null,
    };
    const inventoryAfterAdd = await addInventoryItems(provider, [testBatch], "manual");
    const persistedBatch = inventoryAfterAdd.find((item) => item.note === testBatch.note);
    expect(persistedBatch?.amount).toBe(3);
    expect(persistedBatch?.pricePaid).toBeNull();

    const recipe: Recipe = {
      id: "repository-adapter-test-egg",
      title: "持久化测试煎蛋",
      cuisine: "测试厨房",
      difficulty: "轻松",
      minutes: 6,
      calories: 143,
      image: egg.photo,
      ingredients: [{ ingredientId: egg.id, name: egg.name, role: "main" }],
      toolId: "wok",
      reason: "验证库存到制作完成的持久化纵向链路。",
      steps: ["打散鸡蛋。", "煎熟并完成记录。"],
    };
    const planned = await saveTodayPlan(
      provider,
      recipe,
      "集成测试",
      inventoryAfterAdd,
      [persistedBatch!.inventoryId],
    );

    provider.close();
    provider = await createIndexedDbRepositoryProvider(databaseName);
    const restoredBeforeCooking = await loadKitchenState(provider);
    expect(restoredBeforeCooking.todayPlan?.id).toBe(planned.plan.id);
    expect(restoredBeforeCooking.todayPlan?.recipe.calories).toBeNull();
    expect(restoredBeforeCooking.todayPlan?.recipe.ingredients[0]).toMatchObject({
      ingredientId: egg.id,
      conceptId: egg.conceptId,
      variantId: egg.variantId,
      formCode: egg.formCode,
      processState: egg.processState,
    });
    expect(restoredBeforeCooking.savedRecipes.find((item) => item.id === recipe.id)?.calories).toBeNull();
    expect(restoredBeforeCooking.inventory.find((item) => item.inventoryId === persistedBatch!.inventoryId)?.amount).toBe(3);

    const completion = await completeCookingAndConsume(provider, restoredBeforeCooking.todayPlan!);
    const remainingAfterCooking = completion.snapshot.inventory.find(
      (item) => item.inventoryId === persistedBatch!.inventoryId,
    );
    expect(completion.alreadyCompleted).toBe(false);
    expect(completion.consumed).toEqual([
      expect.objectContaining({
        inventoryId: persistedBatch!.inventoryId,
        name: "鸡蛋",
        quantity: 1,
        remaining: 2,
      }),
    ]);
    expect(remainingAfterCooking?.amount).toBe(2);
    expect(completion.snapshot.todayPlan).toBeNull();
    expect(completion.snapshot.diary.find((entry) => entry.recipeTitle === recipe.title)?.dateISO).toBe(todayISO());

    const repeatedCompletion = await completeCookingAndConsume(provider, planned.plan);
    expect(repeatedCompletion.alreadyCompleted).toBe(true);
    expect(repeatedCompletion.snapshot.inventory.find(
      (item) => item.inventoryId === persistedBatch!.inventoryId,
    )?.amount).toBe(2);

    const transactions = await provider.repositories.inventory.listTransactions(
      LOCAL_USER_ID,
      persistedBatch!.inventoryId,
    );
    expect(transactions.filter((transaction) => transaction.type === "consume")).toHaveLength(1);

    provider.close();
    provider = await createIndexedDbRepositoryProvider(databaseName);
    const restoredAfterCooking = await loadKitchenState(provider);
    expect(restoredAfterCooking.inventory.find(
      (item) => item.inventoryId === persistedBatch!.inventoryId,
    )?.amount).toBe(2);
    expect(restoredAfterCooking.diary.some((entry) => entry.recipeTitle === recipe.title)).toBe(true);
  });

  it("converts base consumption amounts into the lot unit before deducting kg inventory", async () => {
    const initialized = await initializeKitchenState(provider);
    const pork = initialized.catalogFoods.find((item) => item.name === "猪肉末");
    if (!pork) throw new Error("Pork catalog record is required for this test");
    const kilogramUnitId = "20000000-0000-4000-8000-000000000002";
    const batch: InventoryItem = {
      ...pork,
      inventoryId: "temporary-kg-id",
      defaultUnitId: kilogramUnitId,
      unitIdsByMode: { ...pork.unitIdsByMode, mass: kilogramUnitId },
      unitLabelsByMode: { ...pork.unitLabelsByMode, mass: "千克" },
      unitBaseFactorsByMode: { ...pork.unitBaseFactorsByMode, mass: 1000 },
      amountMode: "mass",
      amount: 1,
      pricePaid: null,
      note: "kg 换算测试批次",
      addedDaysAgo: 0,
      customTags: ["kg-test"],
      expiresAtISO: null,
    };
    const inventory = await addInventoryItems(provider, [batch], "manual");
    const persisted = inventory.find((item) => item.note === batch.note);
    if (!persisted) throw new Error("The kg test lot was not persisted");
    const recipe: Recipe = {
      id: "repository-adapter-test-kg",
      title: "千克单位扣减测试",
      cuisine: "测试厨房",
      difficulty: "轻松",
      minutes: 5,
      calories: null,
      image: pork.photo,
      ingredients: [{ ingredientId: pork.id, name: pork.name, role: "main" }],
      toolId: "wok",
      reason: "验证基础克数不会被误当成千克。",
      steps: ["完成测试制作。"],
    };
    const planned = await saveTodayPlan(provider, recipe, "kg 集成测试", inventory, [persisted.inventoryId]);
    const completion = await completeCookingAndConsume(provider, planned.plan);

    expect(completion.consumed[0]?.quantity).toBeCloseTo(0.125);
    expect(completion.consumed[0]?.remaining).toBeCloseTo(0.875);
    expect(completion.snapshot.inventory.find((item) => item.inventoryId === persisted.inventoryId)?.amount)
      .toBeCloseTo(0.875);
  });
});
