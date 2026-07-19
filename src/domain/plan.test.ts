import { describe, expect, it } from "vitest";
import type { InventoryItem } from "./inventory";
import { createMealPlan, inventorySatisfiesIngredient } from "./plan";
import type { Recipe } from "./recipe";

const PORK_CONCEPT_ID = "50000000-0000-4000-8000-000000000006";
const GROUND_PORK_ID = "50000000-0000-4000-8000-000000000007";

describe("ingredient form availability", () => {
  const groundLot = inventoryItem(GROUND_PORK_ID, "ground");
  const broadLot = inventoryItem(PORK_CONCEPT_ID, "unspecified");

  it("lets a broad concept requirement accept a more specific purchased form", () => {
    const broadRequirement = ingredient(PORK_CONCEPT_ID, "unspecified");
    expect(inventorySatisfiesIngredient(groundLot, broadRequirement)).toBe(true);

    const result = createMealPlan(recipeWith(broadRequirement), "test", [groundLot], "2026-07-19");
    expect(result.shoppingList[0]?.name).toBe("库存已覆盖全部食材");
    expect(result.plan.selectedInventoryIds).toEqual([groundLot.inventoryId]);
  });

  it("does not claim a broad unspecified lot already satisfies a ground-form requirement", () => {
    const groundRequirement = ingredient(GROUND_PORK_ID, "ground");
    expect(inventorySatisfiesIngredient(broadLot, groundRequirement)).toBe(false);

    const result = createMealPlan(recipeWith(groundRequirement), "test", [broadLot], "2026-07-19");
    expect(result.shoppingList).toMatchObject([{ ingredientId: GROUND_PORK_ID, owned: false }]);
    expect(result.plan.selectedInventoryIds).toEqual([]);
  });
});

function ingredient(ingredientId: string, formCode: "unspecified" | "ground") {
  return {
    ingredientId,
    conceptId: PORK_CONCEPT_ID,
    variantId: null,
    formCode,
    processState: "raw" as const,
    name: formCode === "ground" ? "猪肉末" : "猪肉",
    role: "main" as const,
  };
}

function inventoryItem(id: string, formCode: "unspecified" | "ground") {
  return {
    id,
    conceptId: PORK_CONCEPT_ID,
    variantId: null,
    formCode,
    processState: "raw",
    inventoryId: `lot-${formCode}`,
  } as unknown as InventoryItem;
}

function recipeWith(requirement: Recipe["ingredients"][number]): Recipe {
  return {
    id: `recipe-${requirement.formCode}`,
    title: "测试菜谱",
    cuisine: "测试",
    difficulty: "轻松",
    minutes: 10,
    calories: null,
    image: "",
    ingredients: [requirement],
    toolId: "wok",
    reason: "测试形态兼容性",
    steps: [],
  };
}
