import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";
import type {
  InventoryLot,
  InventoryTransaction,
  RecognitionCandidate,
  RecipeIngredientLine,
  RecommendationCandidateRecord,
  RecommendationRun,
  ShoppingListItemRecord,
} from "../../../domain/persistence";
import type { IngredientCatalogDocument } from "../../catalog/types";
import goldenCatalogJson from "../../catalog/v0.4.2.1-golden-catalog.json";
import { IndexedDbContext } from "./context";
import {
  CATALOG_SEED_DIGEST_META_KEY,
  CATALOG_SEED_VERSION_META_KEY,
  ensureCatalogSeed,
} from "./catalogSeed";
import {
  deleteMiiixDatabase,
  openMiiixDatabase,
  type MiiixDatabase,
} from "./schema";

const goldenCatalog = goldenCatalogJson as unknown as IngredientCatalogDocument;
const EGG_ID = "50000000-0000-4000-8000-000000000001";
const PORK_CONCEPT_ID = "50000000-0000-4000-8000-000000000006";
const PORK_ID = "50000000-0000-4000-8000-000000000007";
const RICE_ID = "50000000-0000-4000-8000-000000000025";
const TOMATO_ID = "50000000-0000-4000-8000-000000000011";
const GRAM_ID = "20000000-0000-4000-8000-000000000001";
const PIECE_ID = "20000000-0000-4000-8000-000000000003";
const DRY_DARK_ID = "30000000-0000-4000-8000-000000000004";

const databases = new Map<string, MiiixDatabase>();

afterEach(async () => {
  for (const [name, database] of databases) {
    database.close();
    await deleteMiiixDatabase(name);
  }
  databases.clear();
});

describe("v0.4.2.1 IndexedDB catalog seed", () => {
  it("imports the 30-item golden catalog and records independent version/digest meta", async () => {
    const { database, context } = await createTestContext("initial");

    const result = await ensureCatalogSeed(context);

    expect(result).toMatchObject({
      changed: true,
      catalogVersion: goldenCatalog.catalogVersion,
      ingredientCount: 30,
      migratedFieldCount: 0,
    });
    await expect(database.count("catalogIngredients")).resolves.toBe(30);
    await expect(database.count("catalogSources")).resolves.toBe(goldenCatalog.sources.length);
    await expect(database.count("catalogImportBatches")).resolves.toBe(goldenCatalog.importBatches.length);
    await expect(database.count("catalogIngredientForms")).resolves.toBe(goldenCatalog.ingredientForms.length);
    await expect(database.count("catalogCategories")).resolves.toBe(goldenCatalog.categories.length);
    await expect(database.count("catalogUnits")).resolves.toBe(goldenCatalog.units.length);
    await expect(database.count("catalogStorageMethods")).resolves.toBe(goldenCatalog.storageMethods.length);
    await expect(database.get("meta", CATALOG_SEED_VERSION_META_KEY)).resolves.toEqual({
      key: CATALOG_SEED_VERSION_META_KEY,
      value: goldenCatalog.catalogVersion,
    });
    await expect(database.get("meta", CATALOG_SEED_DIGEST_META_KEY)).resolves.toMatchObject({
      key: CATALOG_SEED_DIGEST_META_KEY,
      value: result.digest,
    });
  });

  it("is idempotent for the same version and digest", async () => {
    const { database, context } = await createTestContext("repeat");

    const first = await ensureCatalogSeed(context);
    const eggBefore = await database.get("catalogIngredients", EGG_ID);
    const second = await ensureCatalogSeed(context);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.digest).toBe(first.digest);
    await expect(database.count("catalogIngredients")).resolves.toBe(30);
    await expect(database.get("catalogIngredients", EGG_ID)).resolves.toEqual(eggBefore);
  });

  it("rejects changed content under an existing catalog version", async () => {
    const { database, context } = await createTestContext("update");
    await ensureCatalogSeed(context);

    const update = structuredClone(goldenCatalog);
    update.ingredients[0].updatedAt = "2026-07-19T12:05:00+08:00";

    await expect(ensureCatalogSeed(context, update)).rejects.toThrow(
      "bump catalogVersion before importing changed data",
    );

    await expect(database.count("catalogIngredients")).resolves.toBe(30);
    await expect(database.get("catalogIngredients", EGG_ID)).resolves.toMatchObject({
      detail: { ingredient: { updatedAt: goldenCatalog.ingredients[0].updatedAt } },
    });
  });

  it("preserves an explicit operational form when the catalog snapshot refreshes", async () => {
    const { database, context } = await createTestContext("preserve-form");
    await ensureCatalogSeed(context);
    await database.put("inventoryLots", {
      ...inventoryLot("lot-diced-tomato", TOMATO_ID, GRAM_ID, null, "fridge"),
      conceptId: TOMATO_ID,
      variantId: null,
      formCode: "diced",
      processState: "raw",
      originType: "purchased",
      derivedFromLotId: null,
    });

    const update = structuredClone(goldenCatalog);
    update.catalogVersion = "0.4.2.2";
    update.ingredients[0].updatedAt = "2026-07-19T12:06:00+08:00";
    await ensureCatalogSeed(context, update);

    await expect(database.get("inventoryLots", "lot-diced-tomato")).resolves.toMatchObject({
      ingredientId: TOMATO_ID,
      conceptId: TOMATO_ID,
      formCode: "diced",
      processState: "raw",
    });
  });

  it("rejects a semantically invalid catalog before opening a seed transaction", async () => {
    const { database, context } = await createTestContext("invalid-document");
    const invalid = structuredClone(goldenCatalog);
    invalid.ingredients[0].defaultUnitId = "20000000-0000-4000-8000-000000009999";

    await expect(ensureCatalogSeed(context, invalid)).rejects.toThrow("Invalid ingredient catalog");
    await expect(database.count("catalogIngredients")).resolves.toBe(0);
    await expect(database.get("meta", CATALOG_SEED_VERSION_META_KEY)).resolves.toBeUndefined();
  });

  it("migrates every known v0.4.1 operational reference while preserving unknown IDs", async () => {
    const { database, context } = await createTestContext("legacy-references");
    await putOperationalLegacyFixture(database);

    const result = await ensureCatalogSeed(context);

    expect(result.migratedFieldCount).toBeGreaterThan(0);
    await expect(database.get("inventoryLots", "lot-egg")).resolves.toMatchObject({
      id: "lot-egg",
      ingredientId: EGG_ID,
      conceptId: EGG_ID,
      variantId: null,
      formCode: "unspecified",
      processState: "raw",
      originType: "purchased",
      derivedFromLotId: null,
      quantityInitial: 200,
      quantityRemaining: 200,
      unitId: GRAM_ID,
      storageMethodId: DRY_DARK_ID,
      storageLocation: "dryDark",
      priceAmount: 19.9,
      purchasedAt: "2026-07-18T04:00:00.000Z",
      openedAt: "2026-07-18T08:00:00.000Z",
      expiresAt: "2026-07-25T04:00:00.000Z",
      note: "用户手工备注",
      customTags: ["冷冻分装", "优先吃"],
      currency: "CNY",
      status: "available",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    });
    await expect(database.get("inventoryLots", "lot-unknown")).resolves.toMatchObject({
      ingredientId: "unknown-legacy",
      conceptId: "unknown-legacy",
      variantId: null,
      formCode: "unspecified",
      processState: "unspecified",
      originType: "purchased",
      derivedFromLotId: null,
      unitId: "unknown-unit",
      storageMethodId: null,
    });
    await expect(database.get("recipeIngredients", "recipe-line-pork")).resolves.toMatchObject({
      ingredientId: PORK_ID,
      conceptId: PORK_CONCEPT_ID,
      variantId: null,
      requiredFormCode: "ground",
      requiredProcessState: "raw",
      unitId: GRAM_ID,
    });
    await expect(database.get("shoppingItems", "shopping-rice")).resolves.toMatchObject({
      ingredientId: RICE_ID,
      conceptId: RICE_ID,
      variantId: null,
      requestedFormCode: "unspecified",
      requestedProcessState: "cooked",
      unitId: PIECE_ID,
    });
    await expect(database.get("recognitionCandidates", "recognition-legacy")).resolves.toMatchObject({
      ingredientId: EGG_ID,
      correctedIngredientId: PORK_ID,
      conceptId: PORK_CONCEPT_ID,
      variantId: null,
      formCode: "ground",
      processState: "raw",
    });
    await expect(database.get("recognitionCandidates", "recognition-unresolved")).resolves.toMatchObject({
      ingredientId: null,
      correctedIngredientId: null,
      conceptId: null,
      variantId: null,
      formCode: "unspecified",
      processState: "unspecified",
    });
    await expect(database.get("recommendationRuns", "run-legacy")).resolves.toMatchObject({
      selectedIngredientIds: [EGG_ID, "unknown-legacy"],
    });
    await expect(database.get("recommendationCandidates", "recommendation-legacy")).resolves.toMatchObject({
      ingredientIds: [PORK_ID, RICE_ID],
      substitutionIngredientIds: [EGG_ID, "unknown-legacy"],
    });
    await expect(database.get("inventoryTransactions", "transaction-legacy")).resolves.toMatchObject({
      unitId: GRAM_ID,
      metadata: {
        ingredientId: EGG_ID,
        nested: { ingredientIds: [PORK_ID, "unknown-legacy"] },
        externalIngredientId: "pork",
        providerIngredientIds: ["pork"],
      },
    });
  });

  it("rolls back catalog writes, legacy migration, and meta when import fails", async () => {
    const { database, context } = await createTestContext("rollback");
    const original = await ensureCatalogSeed(context);
    await database.put("inventoryLots", inventoryLot(
      "late-legacy-lot",
      "egg",
      "unit-gram",
      "storage-fridge",
      "fridge",
    ));

    const failedUpdate = structuredClone(goldenCatalog);
    failedUpdate.catalogVersion = "0.4.2.2";
    failedUpdate.ingredients[0].updatedAt = "2026-07-19T12:10:00+08:00";

    await expect(ensureCatalogSeed(context, failedUpdate, {
      beforeMetaWrite() {
        throw new Error("simulated catalog import failure");
      },
    })).rejects.toThrow("simulated catalog import failure");

    await expect(database.get("catalogIngredients", EGG_ID)).resolves.toMatchObject({
      detail: { ingredient: { canonicalNameZh: "鸡蛋" } },
    });
    await expect(database.get("inventoryLots", "late-legacy-lot")).resolves.toMatchObject({
      ingredientId: "egg",
      unitId: "unit-gram",
      storageMethodId: "storage-fridge",
      storageLocation: "fridge",
    });
    await expect(database.get("meta", CATALOG_SEED_VERSION_META_KEY)).resolves.toEqual({
      key: CATALOG_SEED_VERSION_META_KEY,
      value: goldenCatalog.catalogVersion,
    });
    await expect(database.get("meta", CATALOG_SEED_DIGEST_META_KEY)).resolves.toMatchObject({
      value: original.digest,
    });
  });
});

async function createTestContext(suffix: string) {
  const name = `miiix-test-catalog-seed-${suffix}-${crypto.randomUUID()}`;
  const database = await openMiiixDatabase(name);
  databases.set(name, database);
  return { database, context: new IndexedDbContext(database) };
}

async function putOperationalLegacyFixture(database: MiiixDatabase) {
  const transaction = database.transaction([
    "inventoryLots",
    "inventoryTransactions",
    "recipeIngredients",
    "shoppingItems",
    "recognitionCandidates",
    "recommendationRuns",
    "recommendationCandidates",
  ], "readwrite");
  await transaction.objectStore("inventoryLots").put(inventoryLot(
    "lot-egg",
    "egg",
    "unit-gram",
    "storage-seasoning",
    "seasoning",
  ));
  await transaction.objectStore("inventoryLots").put(inventoryLot(
    "lot-unknown",
    "unknown-legacy",
    "unknown-unit",
    null,
    null,
  ));
  await transaction.objectStore("inventoryTransactions").put(inventoryTransaction());
  await transaction.objectStore("recipeIngredients").put(recipeIngredientLine());
  await transaction.objectStore("shoppingItems").put(shoppingItem());
  await transaction.objectStore("recognitionCandidates").put(recognitionCandidate());
  await transaction.objectStore("recognitionCandidates").put(unresolvedRecognitionCandidate());
  await transaction.objectStore("recommendationRuns").put(recommendationRun());
  await transaction.objectStore("recommendationCandidates").put(recommendationCandidate());
  await transaction.done;
}

function inventoryLot(
  id: string,
  ingredientId: string,
  unitId: string,
  storageMethodId: string | null,
  storageLocation: string | null,
): InventoryLot {
  return {
    id,
    userId: "user-test",
    ingredientId,
    quantityInitial: 200,
    quantityRemaining: 200,
    unitId,
    storageMethodId,
    storageLocation,
    purchasedAt: "2026-07-18T04:00:00.000Z",
    openedAt: "2026-07-18T08:00:00.000Z",
    expiresAt: "2026-07-25T04:00:00.000Z",
    priceAmount: 19.9,
    currency: "CNY",
    recognitionJobId: null,
    sourceType: "manual",
    note: "用户手工备注",
    customTags: ["冷冻分装", "优先吃"],
    status: "available",
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  } as unknown as InventoryLot;
}

function inventoryTransaction(): InventoryTransaction {
  return {
    id: "transaction-legacy",
    userId: "user-test",
    inventoryLotId: "lot-egg",
    cookingSessionId: null,
    type: "purchase",
    quantity: 200,
    unitId: "unit-gram",
    idempotencyKey: "initial:lot-egg",
    occurredAt: "2026-07-19T00:00:00.000Z",
    note: null,
    metadata: {
      ingredientId: "egg",
      nested: { ingredientIds: ["pork", "unknown-legacy"] },
      externalIngredientId: "pork",
      providerIngredientIds: ["pork"],
    },
  };
}

function recipeIngredientLine(): RecipeIngredientLine {
  return {
    id: "recipe-line-pork",
    recipeId: "recipe-test",
    ingredientId: "pork",
    role: "main",
    quantity: 1,
    unitId: "unit-gram",
    preparation: null,
    substitutionGroup: null,
    sortOrder: 0,
  } as unknown as RecipeIngredientLine;
}

function shoppingItem(): ShoppingListItemRecord {
  return {
    id: "shopping-rice",
    shoppingListId: "list-test",
    ingredientId: "rice",
    requiredQuantity: 1,
    ownedQuantity: 0,
    unitId: "unit-piece",
    reason: null,
    status: "needed",
  } as unknown as ShoppingListItemRecord;
}

function recognitionCandidate(): RecognitionCandidate {
  return {
    id: "recognition-legacy",
    jobId: "job-test",
    rawLabel: "鸡蛋",
    ingredientId: "egg",
    correctedIngredientId: "pork",
    confidence: 0.9,
    status: "corrected",
    sortOrder: 0,
    metadata: {},
  } as unknown as RecognitionCandidate;
}

function unresolvedRecognitionCandidate(): RecognitionCandidate {
  return {
    id: "recognition-unresolved",
    jobId: "job-test",
    rawLabel: "无法识别",
    ingredientId: null,
    correctedIngredientId: null,
    confidence: null,
    status: "pending",
    sortOrder: 1,
    metadata: {},
  } as unknown as RecognitionCandidate;
}

function recommendationRun(): RecommendationRun {
  return {
    id: "run-legacy",
    userId: "user-test",
    mode: "reliable",
    status: "started",
    selectedIngredientIds: ["egg", "unknown-legacy"],
    selectedInventoryLotIds: [],
    selectedToolIds: [],
    preferenceSnapshot: {},
    modelSnapshot: {},
    createdAt: "2026-07-19T00:00:00.000Z",
    completedAt: null,
  };
}

function recommendationCandidate(): RecommendationCandidateRecord & {
  substitutionIngredientIds: string[];
} {
  return {
    id: "recommendation-legacy",
    runId: "run-legacy",
    rank: 1,
    recipeId: null,
    ingredientIds: ["pork", "rice"],
    substitutionIngredientIds: ["egg", "unknown-legacy"],
    totalScore: 1,
    scoreBreakdown: {},
    explanation: "legacy fixture",
    selected: true,
  };
}
