import catalogJson from "./catalog/v0.4.2.1-golden-catalog.json";
import type { AmountMode, FoodInfo, StorageZone } from "../domain/inventory";
import { catalogPlaceholderImage } from "../domain/catalog";
import type { IngredientCatalogDocument, IngredientDetail } from "./catalog/types";
import { normalizeCatalogLabel } from "./catalog/normalize";

export const ingredientCatalog = catalogJson as unknown as IngredientCatalogDocument;

const categoriesById = new Map(ingredientCatalog.categories.map((category) => [category.id, category]));
const unitsById = new Map(ingredientCatalog.units.map((unit) => [unit.id, unit]));
const storageMethodsById = new Map(ingredientCatalog.storageMethods.map((method) => [method.id, method]));
const ingredientById = new Map(ingredientCatalog.ingredients.map((ingredient) => [ingredient.id, ingredient]));
const legacyIdToIngredientId = new Map(
  ingredientCatalog.ingredients.flatMap((ingredient) =>
    ingredient.legacyIds.map((legacyId) => [legacyId, ingredient.id] as const),
  ),
);

// These are editor starting positions, not catalog facts. The master dataset keeps
// defaultPurchaseQuantity null until user research or a source justifies a value.
const INPUT_FALLBACK_DISCRETE = 1;
const INPUT_FALLBACK_CONTINUOUS = 250;

export function resolveCatalogIngredientId(idOrLegacyId: string) {
  if (ingredientById.has(idOrLegacyId)) return idOrLegacyId;
  return ingredientCatalog.ingredients.find((ingredient) => ingredient.slug === idOrLegacyId)?.id
    ?? null;
}

/**
 * Compatibility-only v0.4.1 migration resolver. Legacy technical IDs are not
 * natural-language labels: notably `pork` means the old minced-pork record.
 */
export function resolveLegacyIngredientId(legacyId: string) {
  return legacyIdToIngredientId.get(legacyId) ?? null;
}

export function getLegacyProjectedFood(legacyId: string) {
  const id = resolveLegacyIngredientId(legacyId);
  return id ? catalogFoodLibrary.find((food) => food.id === id) ?? null : null;
}

export function getCatalogIngredient(idOrLegacyId: string) {
  const id = resolveCatalogIngredientId(idOrLegacyId);
  return id ? ingredientById.get(id) ?? null : null;
}

export function findCatalogIngredientByName(name: string) {
  const normalized = normalizeCatalogLabel(name);
  return ingredientCatalog.ingredients.find((ingredient) =>
    normalizeCatalogLabel(ingredient.canonicalNameZh) === normalized
    || ingredient.aliases.some(
      (alias) => alias.reviewStatus === "approved" && normalizeCatalogLabel(alias.alias) === normalized,
    ),
  ) ?? null;
}

function storageZoneFor(ingredient: IngredientDetail): StorageZone {
  const profile = ingredient.storageProfiles.find((item) => item.id === ingredient.defaultStorageProfileId);
  const method = profile ? storageMethodsById.get(profile.storageMethodId) : null;
  if (method?.code === "fridge" || method?.code === "refrigerated") return "fridge";
  if (method?.code === "freezer" || method?.code === "frozen") return "freezer";
  if (method?.code === "seasoning" || method?.code === "dry_dark" || method?.code === "cool_dark") return "dryDark";
  return "room";
}

function ingredientToFoodInfo(ingredient: IngredientDetail): FoodInfo {
  const level1 = categoriesById.get(ingredient.categoryLevel1Id);
  const level2 = categoriesById.get(ingredient.categoryLevel2Id);
  const level3 = categoriesById.get(ingredient.categoryLevel3Id);
  const defaultProfile = ingredient.storageProfiles.find((profile) => profile.id === ingredient.defaultStorageProfileId);
  const defaultMethod = defaultProfile ? storageMethodsById.get(defaultProfile.storageMethodId) : null;
  const defaultUnit = unitsById.get(ingredient.defaultUnitId);
  const purchaseQuantity = ingredient.defaultPurchaseQuantity;
  const supportedUnits = ingredient.supportedUnitIds
    .map((unitId) => unitsById.get(unitId))
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit));
  const unitIdsByMode: Partial<Record<AmountMode, string>> = {};
  const unitLabelsByMode: Partial<Record<AmountMode, string>> = {};
  const unitBaseFactorsByMode: Partial<Record<AmountMode, number>> = {};
  for (const unit of supportedUnits) {
    const mode = unit.dimension as AmountMode;
    unitIdsByMode[mode] ??= unit.id;
    unitLabelsByMode[mode] ??= unit.nameZh;
    unitBaseFactorsByMode[mode] ??= unit.baseFactor ?? 1;
  }
  if (defaultUnit) {
    const mode = defaultUnit.dimension as AmountMode;
    unitIdsByMode[mode] = defaultUnit.id;
    unitLabelsByMode[mode] = defaultUnit.nameZh;
    unitBaseFactorsByMode[mode] = defaultUnit.baseFactor ?? 1;
  }

  return {
    id: ingredient.id,
    conceptId: ingredient.conceptId,
    variantId: ingredient.variantId,
    formCode: ingredient.formCode,
    processState: ingredient.processState,
    name: ingredient.canonicalNameZh,
    level1: level1?.nameZh ?? "未分类",
    level2: level2?.nameZh ?? "未分类",
    level3: level3?.nameZh ?? ingredient.canonicalNameZh,
    kind: ingredient.kind,
    photo: catalogPlaceholderImage(ingredient.id, ingredient.canonicalNameZh),
    storage: storageZoneFor(ingredient),
    storageTags: [
      defaultMethod?.nameZh,
      defaultProfile?.instructions,
    ].filter((value): value is string => Boolean(value)),
    shelfLifeDays: defaultProfile?.recommendedDays ?? null,
    defaultMode: ingredient.defaultAmountMode,
    supportedModes: Array.from(new Set(supportedUnits.map((unit) => unit.dimension as AmountMode))),
    defaultAmount: purchaseQuantity
      ?? (ingredient.defaultAmountMode === "count" || ingredient.defaultAmountMode === "package"
        ? INPUT_FALLBACK_DISCRETE
        : INPUT_FALLBACK_CONTINUOUS),
    defaultUnitId: ingredient.defaultUnitId,
    unitIdsByMode,
    unitLabelsByMode,
    unitBaseFactorsByMode,
    referencePrice: null,
    caloriesPer100g: ingredient.nutritionProfile.caloriesKcal,
  };
}

export const catalogFoodLibrary = ingredientCatalog.ingredients
  .filter((ingredient) => ingredient.status === "active" && ingredient.isSelectable)
  .map(ingredientToFoodInfo);

export const catalogCategoryTree = ingredientCatalog.categories
  .filter((category) => category.level === 1)
  .sort((left, right) => left.sortOrder - right.sortOrder)
  .map((level1) => ({
    level1: level1.nameZh,
    slug: level1.slug,
    level2: ingredientCatalog.categories
      .filter((category) => category.level === 2 && category.parentId === level1.id)
      .filter((category) => catalogFoodLibrary.some((food) => food.level2 === category.nameZh))
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((level2) => ({
        name: level2.nameZh,
        level3: ingredientCatalog.categories
          .filter((category) => category.level === 3 && category.parentId === level2.id)
          .filter((category) => catalogFoodLibrary.some((food) => food.level3 === category.nameZh))
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((category) => category.nameZh),
      })),
  }));

export function getProjectedFood(idOrLegacyId: string) {
  const id = resolveCatalogIngredientId(idOrLegacyId);
  return id ? catalogFoodLibrary.find((food) => food.id === id) ?? null : null;
}

export function findProjectedFoodByName(name: string) {
  const ingredient = findCatalogIngredientByName(name);
  return ingredient ? catalogFoodLibrary.find((food) => food.id === ingredient.id) ?? null : null;
}
