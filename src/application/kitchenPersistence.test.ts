import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { foodLibrary } from "../data/catalog";
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
    await initializeKitchenState(provider);
    const egg = foodLibrary.find((item) => item.id === "egg");
    if (!egg) throw new Error("Egg catalog record is required for this test");

    const testBatch: InventoryItem = {
      ...egg,
      inventoryId: "temporary-ui-id",
      amountMode: "count",
      amount: 3,
      pricePaid: 3.6,
      note: "纵向链路测试批次",
      addedDaysAgo: 0,
      customTags: ["integration-test"],
    };
    const inventoryAfterAdd = await addInventoryItems(provider, [testBatch], "manual");
    const persistedBatch = inventoryAfterAdd.find((item) => item.note === testBatch.note);
    expect(persistedBatch?.amount).toBe(3);

    const recipe: Recipe = {
      id: "repository-adapter-test-egg",
      title: "持久化测试煎蛋",
      cuisine: "测试厨房",
      difficulty: "轻松",
      minutes: 6,
      calories: 143,
      image: egg.photo,
      required: ["鸡蛋"],
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
});
