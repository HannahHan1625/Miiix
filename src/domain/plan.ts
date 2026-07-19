import type { InventoryItem } from "./inventory";
import type { Recipe } from "./recipe";

export type ShoppingLine = {
  id: string;
  ingredientId: string | null;
  conceptId?: string | null;
  variantId?: string | null;
  formCode?: Recipe["ingredients"][number]["formCode"];
  processState?: Recipe["ingredients"][number]["processState"];
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
  const lines: ShoppingLine[] = recipe.ingredients.map((ingredient) => ({
    id: `${recipe.id}-${ingredient.ingredientId}-${timestamp}`,
    ingredientId: ingredient.ingredientId,
    conceptId: ingredient.conceptId ?? null,
    variantId: ingredient.variantId ?? null,
    formCode: ingredient.formCode,
    processState: ingredient.processState,
    name: ingredient.name,
    reason: `准备做《${recipe.title}》`,
    owned: inventory.some((item) => inventorySatisfiesIngredient(item, ingredient)),
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
          .filter((item) => recipe.ingredients.some((ingredient) => inventorySatisfiesIngredient(item, ingredient)))
          .map((item) => item.inventoryId),
    } satisfies MealPlan,
    shoppingList: missingLines.length
      ? missingLines
      : [{ id: `${recipe.id}-covered-${timestamp}`, ingredientId: null, name: "库存已覆盖全部食材", reason: `《${recipe.title}》无需额外采购`, owned: false }],
  };
}

export function inventorySatisfiesIngredient(
  item: InventoryItem,
  requirement: Recipe["ingredients"][number],
) {
  // Old generated objects without a spec retain exact-ID behavior. Once a
  // spec exists, concept identity is primary and unspecified axes are wildcards.
  if (!requirement.conceptId) return item.id === requirement.ingredientId;
  if (item.conceptId !== requirement.conceptId) return false;
  if (requirement.variantId && item.variantId !== requirement.variantId) return false;
  if (requirement.formCode && requirement.formCode !== "unspecified"
    && item.formCode !== requirement.formCode) return false;
  if (requirement.processState && requirement.processState !== "unspecified"
    && item.processState !== requirement.processState) return false;
  return true;
}
