import { categoryTree, foodLibrary, kitchenTools } from "../../catalog";
import type {
  CatalogRepository,
  IngredientDetail,
  IngredientQuery,
} from "../contracts";
import type {
  CanonicalIngredient,
  FoodCategory,
  KitchenToolDefinition,
  StorageMethod,
  UnitDefinition,
} from "../../../domain/persistence";

const CATALOG_TIMESTAMP = "2026-07-14T00:00:00.000Z";

export const LOCAL_UNIT_IDS = {
  count: "unit-piece",
  weight: "unit-gram",
} as const;

export const LOCAL_STORAGE_METHOD_IDS = {
  fridge: "storage-fridge",
  freezer: "storage-freezer",
  room: "storage-room",
  seasoning: "storage-seasoning",
} as const;

const units: UnitDefinition[] = [
  {
    id: LOCAL_UNIT_IDS.count,
    code: "piece",
    nameZh: "件",
    nameEn: "piece",
    dimension: "count",
    baseFactor: 1,
  },
  {
    id: LOCAL_UNIT_IDS.weight,
    code: "g",
    nameZh: "克",
    nameEn: "gram",
    dimension: "mass",
    baseFactor: 1,
  },
];

const storageMethods: StorageMethod[] = [
  {
    id: LOCAL_STORAGE_METHOD_IDS.fridge,
    code: "fridge",
    nameZh: "冷藏",
    nameEn: "refrigerated",
    temperatureMinC: 0,
    temperatureMaxC: 8,
    requiresDark: false,
    requiresDry: false,
  },
  {
    id: LOCAL_STORAGE_METHOD_IDS.freezer,
    code: "freezer",
    nameZh: "冷冻",
    nameEn: "frozen",
    temperatureMinC: -24,
    temperatureMaxC: -12,
    requiresDark: false,
    requiresDry: false,
  },
  {
    id: LOCAL_STORAGE_METHOD_IDS.room,
    code: "room",
    nameZh: "室温",
    nameEn: "room temperature",
    temperatureMinC: 10,
    temperatureMaxC: 30,
    requiresDark: false,
    requiresDry: false,
  },
  {
    id: LOCAL_STORAGE_METHOD_IDS.seasoning,
    code: "seasoning",
    nameZh: "避光防潮",
    nameEn: "dark and dry",
    temperatureMinC: 10,
    temperatureMaxC: 30,
    requiresDark: true,
    requiresDry: true,
  },
];

const categories: FoodCategory[] = [];
const categoryIdsByName = new Map<string, string>();

categoryTree.forEach((level1, level1Index) => {
  const level1Id = `category-${level1Index + 1}`;
  categories.push({
    id: level1Id,
    parentId: null,
    slug: `level-1-${level1Index + 1}`,
    nameZh: level1.level1,
    nameEn: null,
    level: 1,
    sortOrder: level1Index,
  });
  categoryIdsByName.set(level1.level1, level1Id);

  level1.level2.forEach((level2, level2Index) => {
    const level2Id = `${level1Id}-${level2Index + 1}`;
    categories.push({
      id: level2Id,
      parentId: level1Id,
      slug: `level-2-${level1Index + 1}-${level2Index + 1}`,
      nameZh: level2.name,
      nameEn: null,
      level: 2,
      sortOrder: level2Index,
    });
    categoryIdsByName.set(`${level1.level1}/${level2.name}`, level2Id);

    level2.level3.forEach((level3, level3Index) => {
      const level3Id = `${level2Id}-${level3Index + 1}`;
      categories.push({
        id: level3Id,
        parentId: level2Id,
        slug: `level-3-${level1Index + 1}-${level2Index + 1}-${level3Index + 1}`,
        nameZh: level3,
        nameEn: null,
        level: 3,
        sortOrder: level3Index,
      });
      categoryIdsByName.set(`${level1.level1}/${level2.name}/${level3}`, level3Id);
    });
  });
});

const ingredientDetails: IngredientDetail[] = foodLibrary.map((food) => {
  const ingredient: CanonicalIngredient = {
    id: food.id,
    slug: food.id,
    canonicalNameZh: food.name,
    canonicalNameEn: null,
    kind: food.storage === "seasoning" ? "condiment" : "raw",
    defaultUnitId: food.defaultMode === "weight" ? LOCAL_UNIT_IDS.weight : LOCAL_UNIT_IDS.count,
    parentIngredientId: null,
    sourceId: null,
    status: "active",
    metadata: {
      level1: food.level1,
      level2: food.level2,
      level3: food.level3,
      displayUnit: food.unit,
      defaultCount: food.defaultCount,
      defaultWeight: food.defaultWeight,
      defaultPrice: food.price,
    },
    createdAt: CATALOG_TIMESTAMP,
    updatedAt: CATALOG_TIMESTAMP,
  };

  return {
    ingredient,
    aliases: [
      {
        id: `alias-${food.id}`,
        ingredientId: food.id,
        locale: "zh-CN",
        alias: food.name,
        normalizedAlias: normalizeLabel(food.name),
        aliasType: "common",
        confidence: 1,
        reviewStatus: "approved",
      },
    ],
    categoryIds: [
      categoryIdsByName.get(food.level1),
      categoryIdsByName.get(`${food.level1}/${food.level2}`),
      categoryIdsByName.get(`${food.level1}/${food.level2}/${food.level3}`),
    ].filter((id): id is string => Boolean(id)),
    storageProfiles: [
      {
        id: `storage-profile-${food.id}`,
        ingredientId: food.id,
        storageMethodId: LOCAL_STORAGE_METHOD_IDS[food.storage],
        shelfLifeDays: food.shelfLifeDays,
        afterOpeningDays: null,
        freshnessWarningDays: Math.max(1, Math.ceil(food.shelfLifeDays * 0.2)),
        instructions: food.storageTags.join("；"),
        sourceId: null,
        confidence: 0.75,
        reviewStatus: "pending",
      },
    ],
    nutritionProfiles: [
      {
        id: `nutrition-${food.id}`,
        ingredientId: food.id,
        basisQuantity: 100,
        basisUnitId: LOCAL_UNIT_IDS.weight,
        caloriesKcal: food.caloriesPer100g,
        proteinG: null,
        fatG: null,
        carbohydrateG: null,
        fiberG: null,
        sourceId: null,
        reviewStatus: "pending",
      },
    ],
    assets: [
      {
        id: `asset-${food.id}`,
        ingredientId: food.id,
        assetUri: food.photo,
        assetType: "thumbnail",
        backgroundRemoved: false,
        outlineApplied: true,
        sourceUrl: food.photo.startsWith("http") ? food.photo : null,
        license: null,
        attribution: null,
        reviewStatus: "pending",
        isPrimary: true,
      },
    ],
  };
});

const toolDefinitions: KitchenToolDefinition[] = kitchenTools.map((tool) => ({
  id: tool.id,
  code: tool.id,
  nameZh: tool.name,
  nameEn: null,
  description: tool.subtitle,
  assetUri: tool.image,
  status: "active",
}));

export class LocalCatalogRepository implements CatalogRepository {
  async getIngredient(id: string) {
    return ingredientDetails.find((detail) => detail.ingredient.id === id) ?? null;
  }

  async findIngredients(query: IngredientQuery) {
    const text = normalizeLabel(query.text ?? "");
    const matches = ingredientDetails.filter((detail) => {
      const matchesText = !text || [detail.ingredient.canonicalNameZh, ...detail.aliases.map((alias) => alias.alias)]
        .some((label) => normalizeLabel(label).includes(text));
      const matchesCategory = !query.categoryId || detail.categoryIds.includes(query.categoryId);
      const matchesKind = !query.kind || detail.ingredient.kind === query.kind;
      const matchesStatus = !query.status || detail.ingredient.status === query.status;
      return matchesText && matchesCategory && matchesKind && matchesStatus;
    });
    return matches.slice(0, query.limit ?? matches.length);
  }

  async resolveIngredientAlias(rawLabel: string, locale = "zh-CN") {
    const normalized = normalizeLabel(rawLabel);
    return ingredientDetails.find((detail) => detail.aliases.some(
      (alias) => alias.locale === locale && alias.normalizedAlias === normalized,
    )) ?? null;
  }

  async listCategories() {
    return categories;
  }

  async listUnits() {
    return units;
  }

  async listStorageMethods() {
    return storageMethods;
  }

  async listKitchenTools() {
    return toolDefinitions;
  }
}

function normalizeLabel(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
}
