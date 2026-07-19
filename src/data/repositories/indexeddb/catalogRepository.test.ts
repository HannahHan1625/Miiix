import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIndexedDbRepositoryProvider, type IndexedDbRepositoryProvider } from "./provider";
import { deleteMiiixDatabase } from "./schema";

const TOMATO_ID = "50000000-0000-4000-8000-000000000011";
const TOMATO_CATEGORY_IDS = [
  "40000000-0000-4000-8000-000000000002",
  "40000000-0000-4000-8000-000000000010",
  "40000000-0000-4000-8000-000000000024",
];
const STORAGE_IDS = {
  room: "30000000-0000-4000-8000-000000000001",
  fridge: "30000000-0000-4000-8000-000000000002",
  freezer: "30000000-0000-4000-8000-000000000003",
  dryDark: "30000000-0000-4000-8000-000000000004",
} as const;

let databaseName = "";
let provider: IndexedDbRepositoryProvider;

beforeEach(async () => {
  databaseName = `miiix-test-catalog-repository-${crypto.randomUUID()}`;
  provider = await createIndexedDbRepositoryProvider(databaseName);
});

afterEach(async () => {
  provider.close();
  await deleteMiiixDatabase(databaseName);
});

describe("IndexedDbCatalogRepository", () => {
  it("queries a full aggregate by stable ID", async () => {
    const detail = await provider.repositories.catalog.getIngredient(TOMATO_ID);

    expect(detail).toMatchObject({
      ingredient: {
        id: TOMATO_ID,
        canonicalNameZh: "番茄",
        dataVersion: "2026-07-19.2",
        status: "active",
      },
      categoryIds: TOMATO_CATEGORY_IDS,
      defaultStorageProfileId: expect.any(String),
      supportedUnitIds: expect.any(Array),
    });
    expect(detail?.aliases.map((alias) => alias.alias)).toContain("西红柿");
    expect(detail?.aliases.find((alias) => alias.alias === "西红柿")?.regionCode).toBe("CN-North");
    expect(detail?.storageProfiles).toHaveLength(1);
    expect(detail?.nutritionProfiles).toHaveLength(1);
    expect(detail?.assets).toHaveLength(1);
    expect(detail?.assets[0]).toMatchObject({
      altText: "番茄（Miiix 原型占位图，非实物照片）",
      licenseStatus: "approved_for_prototype",
      styleConsistency: "prototype_placeholder",
      aiGeneration: null,
    });
    expect(detail?.nutritionProfiles[0]).toMatchObject({
      externalMappingId: "a0000000-0000-4000-8000-000000000011",
      reviewStatus: "pending",
    });
  });

  it("searches canonical names and partial approved aliases", async () => {
    await expect(provider.repositories.catalog.findIngredients({ text: "番茄" })).resolves.toMatchObject([
      { ingredient: { id: TOMATO_ID } },
    ]);
    await expect(provider.repositories.catalog.findIngredients({ text: "红柿" })).resolves.toMatchObject([
      { ingredient: { id: TOMATO_ID } },
    ]);
    await expect(provider.repositories.catalog.findIngredients({ text: " 肉 沫 " })).resolves.toMatchObject([
      { ingredient: { canonicalNameZh: "猪肉末" } },
    ]);
  });

  it("resolves only approved aliases", async () => {
    await expect(provider.repositories.catalog.resolveIngredientAlias("西红柿")).resolves.toMatchObject({
      ingredient: { id: TOMATO_ID },
    });
    await expect(provider.repositories.catalog.resolveIngredientAlias("肉沫")).resolves.toMatchObject({
      ingredient: { canonicalNameZh: "猪肉末" },
    });
    await expect(provider.repositories.catalog.resolveIngredientAlias("鲜鸡蛋")).resolves.toBeNull();
    await expect(provider.repositories.catalog.resolveIngredientAlias("酱油")).resolves.toBeNull();
  });

  it("filters by every category level, storage, kind, status, and limit", async () => {
    for (const categoryId of TOMATO_CATEGORY_IDS) {
      const matches = await provider.repositories.catalog.findIngredients({ categoryId });
      expect(matches.map((detail) => detail.ingredient.id)).toContain(TOMATO_ID);
    }

    const fridge = await provider.repositories.catalog.findIngredients({ storageMethodId: STORAGE_IDS.fridge });
    const freezer = await provider.repositories.catalog.findIngredients({ storageMethodId: STORAGE_IDS.freezer });
    const room = await provider.repositories.catalog.findIngredients({ storageMethodId: STORAGE_IDS.room });
    const dryDark = await provider.repositories.catalog.findIngredients({ storageMethodId: STORAGE_IDS.dryDark });
    expect(fridge.some((detail) => detail.ingredient.canonicalNameZh === "鸡蛋")).toBe(true);
    expect(freezer.some((detail) => detail.ingredient.canonicalNameZh === "鸡翅")).toBe(true);
    expect(room.some((detail) => detail.ingredient.id === TOMATO_ID)).toBe(true);
    expect(dryDark.some((detail) => detail.ingredient.canonicalNameZh === "生抽")).toBe(true);

    const condiments = await provider.repositories.catalog.findIngredients({
      kind: "condiment",
      status: "active",
    });
    expect(condiments).toHaveLength(4);
    expect(condiments.every((detail) => detail.ingredient.kind === "condiment")).toBe(true);
    await expect(provider.repositories.catalog.findIngredients({ status: "active", limit: 3 }))
      .resolves.toHaveLength(3);
  });

  it("lists catalog reference data from IndexedDB while retaining tool projection", async () => {
    const [categories, units, storageMethods, tools] = await Promise.all([
      provider.repositories.catalog.listCategories(),
      provider.repositories.catalog.listUnits(),
      provider.repositories.catalog.listStorageMethods(),
      provider.repositories.catalog.listKitchenTools(),
    ]);

    expect(categories.some((category) => category.level === 1 && category.nameZh === "蔬果")).toBe(true);
    expect(categories.some((category) => category.level === 3 && category.nameZh === "茄果类")).toBe(true);
    expect(units.map((unit) => unit.code)).toEqual(expect.arrayContaining(["g", "ml", "piece"]));
    expect(storageMethods.map((method) => method.code)).toEqual([
      "dry_dark",
      "freezer",
      "fridge",
      "room",
    ]);
    expect(tools.length).toBeGreaterThan(0);
  });
});
