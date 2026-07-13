import type { InventoryItem } from "./inventory";
import type { Recipe } from "./recipe";

export type ShoppingLine = {
  id: string;
  name: string;
  reason: string;
  owned: boolean;
};

export type MealPlan = {
  id: string;
  recipe: Recipe;
  source: string;
  plannedDateISO: string;
};

export function createMealPlan(
  recipe: Recipe,
  source: string,
  inventory: InventoryItem[],
  plannedDateISO: string,
  timestamp = Date.now(),
) {
  const ownedNames = new Set(inventory.map((item) => item.name));
  const lines: ShoppingLine[] = recipe.required.map((name) => ({
    id: `${recipe.id}-${name}-${timestamp}`,
    name,
    reason: `准备做《${recipe.title}》`,
    owned: ownedNames.has(name),
  }));
  const missingLines = lines.filter((line) => !line.owned);

  return {
    plan: {
      id: `${recipe.id}-plan-${timestamp}`,
      recipe,
      source,
      plannedDateISO,
    } satisfies MealPlan,
    shoppingList: missingLines.length
      ? missingLines
      : [{ id: `${recipe.id}-covered-${timestamp}`, name: "库存已覆盖全部食材", reason: `《${recipe.title}》无需额外采购`, owned: false }],
  };
}
