import type { CatalogRepository, IngredientDetail } from "../data/repositories";
import { catalogPlaceholderImage } from "../domain/catalog";
import type { AmountMode, FoodInfo, StorageZone } from "../domain/inventory";

export type CatalogCategoryView = {
  level1: string;
  level2: Array<{ name: string; level3: string[] }>;
};

export async function loadCatalogViewProjection(catalog: CatalogRepository) {
  const [details, categories, units, storageMethods] = await Promise.all([
    catalog.findIngredients({ status: "active", isSelectable: true, limit: 1_000 }),
    catalog.listCategories(),
    catalog.listUnits(),
    catalog.listStorageMethods(),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const storageById = new Map(storageMethods.map((method) => [method.id, method]));
  const foods = details.map((detail) => toFoodInfo(detail, categoryById, unitById, storageById));
  const activeCategoryIds = new Set(details.flatMap((detail) => detail.categoryIds));
  const categoryTree = categories
    .filter((category) => category.level === 1 && activeCategoryIds.has(category.id))
    .map((level1) => ({
      level1: level1.nameZh,
      level2: categories
        .filter((category) => category.level === 2
          && category.parentId === level1.id
          && activeCategoryIds.has(category.id))
        .map((level2) => ({
          name: level2.nameZh,
          level3: categories
            .filter((category) => category.level === 3
              && category.parentId === level2.id
              && activeCategoryIds.has(category.id))
            .map((category) => category.nameZh),
        })),
    }));
  return {
    foods,
    foodById: new Map(foods.map((food) => [food.id, food])),
    categoryTree,
  };
}

export async function loadCatalogFoodProjection(catalog: CatalogRepository) {
  return (await loadCatalogViewProjection(catalog)).foodById;
}

function toFoodInfo(
  detail: IngredientDetail,
  categoryById: Map<string, Awaited<ReturnType<CatalogRepository["listCategories"]>>[number]>,
  unitById: Map<string, Awaited<ReturnType<CatalogRepository["listUnits"]>>[number]>,
  storageById: Map<string, Awaited<ReturnType<CatalogRepository["listStorageMethods"]>>[number]>,
): FoodInfo {
  const { ingredient } = detail;
  const [level1Id, level2Id, level3Id] = detail.categoryIds;
  const defaultProfile = detail.storageProfiles.find((profile) => profile.id === detail.defaultStorageProfileId);
  const storageMethod = defaultProfile ? storageById.get(defaultProfile.storageMethodId) : null;
  const supportedUnits = detail.supportedUnitIds
    .map((unitId) => unitById.get(unitId))
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
  const defaultUnit = ingredient.defaultUnitId ? unitById.get(ingredient.defaultUnitId) : null;
  if (defaultUnit) {
    const mode = defaultUnit.dimension as AmountMode;
    unitIdsByMode[mode] = defaultUnit.id;
    unitLabelsByMode[mode] = defaultUnit.nameZh;
    unitBaseFactorsByMode[mode] = defaultUnit.baseFactor ?? 1;
  }
  const defaultMode = ingredient.defaultAmountMode as AmountMode;

  return {
    id: ingredient.id,
    conceptId: ingredient.conceptId,
    variantId: ingredient.variantId,
    formCode: ingredient.formCode,
    processState: ingredient.processState,
    name: ingredient.canonicalNameZh,
    level1: categoryById.get(level1Id)?.nameZh ?? "未分类",
    level2: categoryById.get(level2Id)?.nameZh ?? "未分类",
    level3: categoryById.get(level3Id)?.nameZh ?? ingredient.canonicalNameZh,
    kind: ingredient.kind,
    photo: catalogPlaceholderImage(ingredient.id, ingredient.canonicalNameZh),
    storage: toStorageZone(storageMethod?.code),
    storageTags: [storageMethod?.nameZh, defaultProfile?.instructions]
      .filter((value): value is string => Boolean(value)),
    shelfLifeDays: defaultProfile?.shelfLifeDays ?? null,
    defaultMode,
    supportedModes: Array.from(new Set(supportedUnits.map((unit) => unit.dimension as AmountMode))),
    defaultAmount: ingredient.defaultPurchaseQuantity
      ?? (defaultMode === "count" || defaultMode === "package" ? 1 : 250),
    defaultUnitId: ingredient.defaultUnitId ?? unitIdsByMode[defaultMode] ?? "",
    unitIdsByMode,
    unitLabelsByMode,
    unitBaseFactorsByMode,
    referencePrice: null,
    caloriesPer100g: detail.nutritionProfiles.find((profile) => profile.reviewStatus === "approved")?.caloriesKcal ?? null,
  };
}

function toStorageZone(code: string | undefined): StorageZone {
  if (code === "fridge" || code === "refrigerated") return "fridge";
  if (code === "freezer" || code === "frozen") return "freezer";
  if (code === "seasoning" || code === "dry_dark" || code === "cool_dark") return "dryDark";
  return "room";
}
