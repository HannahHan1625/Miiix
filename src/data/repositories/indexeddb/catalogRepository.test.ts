import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIndexedDbRepositoryProvider, type IndexedDbRepositoryProvider } from "./provider";
import { deleteMiiixDatabase, openMiiixDatabase } from "./schema";

const TOMATO_ID = "50000000-0000-4000-8000-000000000011";
const PORK_CONCEPT_ID = "50000000-0000-4000-8000-000000000006";
const GROUND_PORK_ID = "50000000-0000-4000-8000-000000000007";
const CHICKEN_FEET_ID = "50000000-0000-4000-8000-000000000004";
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
        dataVersion: "0.4.2.1",
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
    await expect(provider.repositories.catalog.findIngredients({ text: " 肉 沫 " })).resolves.toEqual([]);
    await expect(provider.repositories.catalog.findIngredients({ text: "猪肉末" })).resolves.toMatchObject([
      { ingredient: { id: GROUND_PORK_ID, conceptId: PORK_CONCEPT_ID, formCode: "ground" } },
    ]);
  });

  it("resolves only approved aliases", async () => {
    await expect(provider.repositories.catalog.resolveIngredientAlias("西红柿")).resolves.toMatchObject({
      ingredient: { id: TOMATO_ID },
    });
    await expect(provider.repositories.catalog.resolveIngredientAlias("肉沫")).resolves.toBeNull();
    await expect(provider.repositories.catalog.resolveIngredientAlias("肉糜")).resolves.toBeNull();
    await expect(provider.repositories.catalog.resolveIngredientAlias("pork", "en")).resolves.toMatchObject({
      ingredient: { id: PORK_CONCEPT_ID, canonicalNameZh: "猪肉（部位未指定）" },
    });
    await expect(provider.repositories.catalog.resolveIngredientAlias("ground pork", "en")).resolves.toMatchObject({
      ingredient: { id: GROUND_PORK_ID, conceptId: PORK_CONCEPT_ID, formCode: "ground" },
    });
    await expect(provider.repositories.catalog.resolveIngredientAlias("minced pork", "en")).resolves.toMatchObject({
      ingredient: { id: GROUND_PORK_ID },
    });
    await expect(
      provider.repositories.catalog.resolveLegacyIngredientId("pork", "miiix-v0.4.1"),
    ).resolves.toMatchObject({ ingredient: { id: GROUND_PORK_ID } });
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
    const [categories, units, storageMethods, sources, batches, forms, tools] = await Promise.all([
      provider.repositories.catalog.listCategories(),
      provider.repositories.catalog.listUnits(),
      provider.repositories.catalog.listStorageMethods(),
      provider.repositories.catalog.listSources(),
      provider.repositories.catalog.listImportBatches(),
      provider.repositories.catalog.listIngredientForms(),
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
    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "10000000-0000-4000-8000-000000000007",
        sourceRevision: "03edd31",
        rightsReviewStatus: "review_required",
        usageScopes: expect.arrayContaining(["identity", "recommendation"]),
      }),
    ]));
    expect(batches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "b0000000-0000-4000-8000-000000000001",
        sourceRevision: "03edd31",
        status: "published",
      }),
    ]));
    expect(forms.map((form) => form.code)).toEqual([
      "diced",
      "ground",
      "shredded",
      "sliced",
      "unspecified",
      "whole_piece",
    ]);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("inherits concept-level Epicure mappings without erasing the requested form", async () => {
    await expect(provider.repositories.catalog.listExternalMappings(
      GROUND_PORK_ID,
      "recommendation",
    )).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({
        requestedIngredientId: GROUND_PORK_ID,
        sourceIngredientId: PORK_CONCEPT_ID,
        inheritedFromConcept: true,
        effectiveLossiness: expect.arrayContaining(["form"]),
        mapping: expect.objectContaining({
          provider: "Epicure_Cooc",
          externalKey: "1264",
          externalVersion: "03edd31",
        }),
      }),
    ]));
  });

  it("serves only approved mappings and never inherits a record-level mapping", async () => {
    await expect(provider.repositories.catalog.listExternalMappings(
      CHICKEN_FEET_ID,
      "recommendation",
    )).resolves.toEqual([]);

    const database = await openMiiixDatabase(databaseName);
    const concept = await database.get("catalogIngredients", PORK_CONCEPT_ID);
    expect(concept).toBeDefined();
    if (!concept) throw new Error("Missing pork concept fixture");
    const conceptMapping = concept.detail.externalMappings[0];
    concept.detail.externalMappings.push({
      ...conceptMapping,
      id: "mapping-record-only-test",
      externalKey: "record-only-token",
      mappingLevel: "record",
    });
    await database.put("catalogIngredients", concept);
    database.close();

    const mappings = await provider.repositories.catalog.listExternalMappings(
      GROUND_PORK_ID,
      "recommendation",
    );
    expect(mappings.some((resolution) => resolution.mapping.externalKey === "record-only-token"))
      .toBe(false);
  });

  it("filters the catalog by concept, record role, and physical form", async () => {
    await expect(provider.repositories.catalog.findIngredients({
      conceptId: PORK_CONCEPT_ID,
      recordRole: "form_projection",
      formCode: "ground",
    })).resolves.toMatchObject([
      { ingredient: { id: GROUND_PORK_ID } },
    ]);
  });
});
