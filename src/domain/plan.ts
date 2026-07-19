import type { InventoryItem } from "./inventory";
import type { Recipe } from "./recipe";

export type ShoppingLine = {
  id: string;
  ingredientId: string | null;
  name: string;
  reason: string;
  owned: boolean;
};

export type MealPlan = {
  id: string;
  recipe: Recipe;
  source: string;
  plannedDateISO: string;
  selectedInventoryIds: string[];
};

export function createMealPlan(
  recipe: Recipe,
  source: string,
  inventory: InventoryItem[],
  plannedDateISO: string,
  selectedInventoryIds: string[] = [],
  timestamp = Date.now(),
) {
  const ownedIngredientIds = new Set(inventory.map((item) => item.id));
  const lines: ShoppingLine[] = recipe.ingredients.map((ingredient) => ({
    id: `${recipe.id}-${ingredient.ingredientId}-${timestamp}`,
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    reason: `准备做《${recipe.title}》`,
    owned: ownedIngredientIds.has(ingredient.ingredientId),
  }));
  const missingLines = lines.filter((line) => !line.owned);

  return {
    plan: {
      id: `${recipe.id}-plan-${timestamp}`,
      recipe,
      source,
      plannedDateISO,
      selectedInventoryIds: selectedInventoryIds.length
        ? selectedInventoryIds
        : inventory
          .filter((item) => recipe.ingredients.some((ingredient) => ingredient.ingredientId === item.id))
          .map((item) => item.inventoryId),
    } satisfies MealPlan,
    shoppingList: missingLines.length
      ? missingLines
      : [{ id: `${recipe.id}-covered-${timestamp}`, ingredientId: null, name: "库存已覆盖全部食材", reason: `《${recipe.title}》无需额外采购`, owned: false }],
  };
}
