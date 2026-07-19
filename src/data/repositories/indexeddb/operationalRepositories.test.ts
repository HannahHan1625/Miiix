import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIndexedDbRepositoryProvider, type IndexedDbRepositoryProvider } from "./provider";
import { deleteMiiixDatabase } from "./schema";

const GROUND_PORK_ID = "50000000-0000-4000-8000-000000000007";
const PORK_CONCEPT_ID = "50000000-0000-4000-8000-000000000006";
const GRAM_ID = "20000000-0000-4000-8000-000000000001";
const FREEZER_ID = "30000000-0000-4000-8000-000000000003";

let databaseName = "";
let provider: IndexedDbRepositoryProvider;

beforeEach(async () => {
  databaseName = `miiix-test-operational-${crypto.randomUUID()}`;
  provider = await createIndexedDbRepositoryProvider(databaseName);
});

afterEach(async () => {
  provider.close();
  await deleteMiiixDatabase(databaseName);
});

describe("inventory form persistence", () => {
  it("records pork mince bought in that form as a purchased lot", async () => {
    const lot = await provider.repositories.inventory.createLot({
      userId: "user-test",
      ingredientId: GROUND_PORK_ID,
      conceptId: PORK_CONCEPT_ID,
      variantId: null,
      formCode: "ground",
      processState: "raw",
      originType: "purchased",
      derivedFromLotId: null,
      quantityInitial: 300,
      unitId: GRAM_ID,
      storageMethodId: FREEZER_ID,
      storageLocation: "freezer",
      purchasedAt: "2026-07-19T08:00:00.000Z",
      openedAt: null,
      expiresAt: null,
      priceAmount: 18.8,
      currency: "CNY",
      recognitionJobId: null,
      sourceType: "manual",
      note: "买来就是肉糜",
      customTags: [],
    });

    expect(lot).toMatchObject({
      ingredientId: GROUND_PORK_ID,
      conceptId: PORK_CONCEPT_ID,
      formCode: "ground",
      originType: "purchased",
      quantityRemaining: 300,
    });
    await expect(
      provider.repositories.inventory.listTransactions("user-test", lot.id),
    ).resolves.toMatchObject([{ type: "purchase", quantity: 300 }]);
  });

  it("rejects derived lots until source consumption and creation can be atomic", async () => {
    await expect(provider.repositories.inventory.createLot({
      userId: "user-test",
      ingredientId: GROUND_PORK_ID,
      conceptId: PORK_CONCEPT_ID,
      variantId: null,
      formCode: "ground",
      processState: "raw",
      originType: "user_transformed",
      derivedFromLotId: "lot-source",
      quantityInitial: 200,
      unitId: GRAM_ID,
      storageMethodId: FREEZER_ID,
      storageLocation: "freezer",
      purchasedAt: null,
      openedAt: null,
      expiresAt: null,
      priceAmount: null,
      currency: "CNY",
      recognitionJobId: null,
      sourceType: "manual",
      note: null,
      customTags: [],
    })).rejects.toThrow("atomic source-lot transformation workflow");
  });

  it("rejects an identity spec that contradicts the selected catalog record", async () => {
    await expect(provider.repositories.inventory.createLot({
      userId: "user-test",
      ingredientId: GROUND_PORK_ID,
      conceptId: GROUND_PORK_ID,
      variantId: null,
      formCode: "ground",
      processState: "raw",
      originType: "purchased",
      derivedFromLotId: null,
      quantityInitial: 200,
      unitId: GRAM_ID,
      storageMethodId: FREEZER_ID,
      storageLocation: "freezer",
      purchasedAt: null,
      openedAt: null,
      expiresAt: null,
      priceAmount: null,
      currency: "CNY",
      recognitionJobId: null,
      sourceType: "manual",
      note: null,
      customTags: [],
    })).rejects.toThrow("conceptId must match");
  });
});

describe("recognition identity persistence", () => {
  it("recomputes the effective spec in the same transaction as a correction", async () => {
    const [candidate] = await provider.repositories.recognition.saveCandidates("job-test", [{
      rawLabel: "猪肉糜",
      ingredientId: PORK_CONCEPT_ID,
      correctedIngredientId: null,
      conceptId: PORK_CONCEPT_ID,
      variantId: null,
      formCode: "unspecified",
      processState: "raw",
      confidence: 0.72,
      status: "pending",
      sortOrder: 0,
      metadata: {},
    }]);

    await expect(provider.repositories.recognition.updateCandidate("job-test", candidate.id, {
      status: "corrected",
      correctedIngredientId: GROUND_PORK_ID,
    })).resolves.toMatchObject({
      ingredientId: PORK_CONCEPT_ID,
      correctedIngredientId: GROUND_PORK_ID,
      conceptId: PORK_CONCEPT_ID,
      variantId: null,
      formCode: "ground",
      processState: "raw",
    });
  });

  it("rejects a correction to an unknown catalog identifier", async () => {
    const [candidate] = await provider.repositories.recognition.saveCandidates("job-test", [{
      rawLabel: "未知食材",
      ingredientId: null,
      correctedIngredientId: null,
      conceptId: null,
      variantId: null,
      formCode: "unspecified",
      processState: "unspecified",
      confidence: null,
      status: "pending",
      sortOrder: 0,
      metadata: {},
    }]);

    await expect(provider.repositories.recognition.updateCandidate("job-test", candidate.id, {
      status: "corrected",
      correctedIngredientId: "unknown-catalog-id",
    })).rejects.toThrow("Catalog ingredient not found");
  });
});
