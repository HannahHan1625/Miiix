import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import catalogSchema from "./ingredient-catalog.schema.json";
import type {
  CatalogExternalMapping,
  CatalogSource,
  IngredientCatalogDocument,
  IngredientDetail,
} from "./types";
import {
  normalizeCatalogAlias,
  v042GoldenCatalog,
  v0421GoldenCatalog,
  validateIngredientCatalog,
} from "./validation";

const GENERAL_PORK_ID = "50000000-0000-4000-8000-000000000006";
const GROUND_PORK_ID = "50000000-0000-4000-8000-000000000007";

const cloneCatalog = (): IngredientCatalogDocument =>
  JSON.parse(JSON.stringify(v0421GoldenCatalog)) as IngredientCatalogDocument;

const issueCodes = (document: IngredientCatalogDocument): string[] =>
  validateIngredientCatalog(document).issues.map((issue) => issue.code);

const requireIngredient = (document: IngredientCatalogDocument, id: string): IngredientDetail => {
  const ingredient = document.ingredients.find((candidate) => candidate.id === id);
  if (!ingredient) throw new Error(`Ingredient fixture ${id} is required`);
  return ingredient;
};

const requireEpicureSource = (document: IngredientCatalogDocument): CatalogSource => {
  const source = document.sources.find((candidate) => candidate.datasetName.includes("Epicure"));
  if (!source) throw new Error("Epicure source fixture is required");
  return source;
};

const requireApprovedEpicureMapping = (
  document: IngredientCatalogDocument,
): CatalogExternalMapping => {
  const mapping = document.ingredients
    .flatMap((ingredient) => ingredient.externalMappings)
    .find((candidate) => candidate.system === "Epicure_Cooc" && candidate.reviewStatus === "approved");
  if (!mapping) throw new Error("Approved Epicure mapping fixture is required");
  return mapping;
};

describe("v0.4.2.1 ingredient catalog", () => {
  it("passes the checked-in Draft 2020-12 JSON Schema", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validateSchema = ajv.compile(catalogSchema);

    expect(validateSchema(v0421GoldenCatalog), JSON.stringify(validateSchema.errors, null, 2)).toBe(true);
  });

  it("accepts the checked-in 30-record golden dataset", () => {
    const result = validateIngredientCatalog(v0421GoldenCatalog);

    expect(result).toEqual({ valid: true, issues: [] });
    expect(v0421GoldenCatalog.schemaVersion).toBe("1.1.0");
    expect(v0421GoldenCatalog.catalogVersion).toBe("0.4.2.1");
    expect(v0421GoldenCatalog.ingredients).toHaveLength(30);
    expect(v0421GoldenCatalog.ingredients.every((ingredient) => ingredient.status === "active")).toBe(true);
    expect(v0421GoldenCatalog.ingredients.every((ingredient) => ingredient.referencePrice === null)).toBe(true);
  });

  it("retains explicit v0.4.2 validation compatibility", () => {
    expect(validateIngredientCatalog(v042GoldenCatalog, { releasePolicy: "v0.4.2" }))
      .toEqual({ valid: true, issues: [] });
  });

  it("normalizes Unicode width, whitespace, punctuation, and symbols consistently", () => {
    expect(normalizeCatalogAlias(" Ａ－B · 鸡 翅 ")).toBe("ab鸡翅");
  });

  it("keeps the JSON Schema closed and version-pinned", () => {
    expect(catalogSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(catalogSchema.properties.schemaVersion.const).toBe("1.1.0");
    expect(catalogSchema.properties.catalogVersion.const).toBe("0.4.2.1");
    expect(catalogSchema.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.source.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.importBatch.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.ingredientForm.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.ingredient.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.alias.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.storageProfile.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.externalMapping.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.nutritionProfile.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.imageAsset.additionalProperties).toBe(false);
  });

  it("requires the 0.4.2.1 catalog and 1.1.0 schema under the default policy", () => {
    const catalog = cloneCatalog();
    catalog.catalogVersion = "0.4.2";
    catalog.schemaVersion = "1.0.0";

    expect(issueCodes(catalog)).toEqual(expect.arrayContaining(["catalog_version", "schema_version"]));
  });

  it("rejects duplicate or missing required form definitions", () => {
    const catalog = cloneCatalog();
    catalog.ingredientForms[1].code = catalog.ingredientForms[0].code;

    expect(issueCodes(catalog)).toEqual(expect.arrayContaining(["duplicate_form_code", "required_form"]));
  });

  it("requires concept records to identify themselves", () => {
    const catalog = cloneCatalog();
    requireIngredient(catalog, GENERAL_PORK_ID).conceptId = GROUND_PORK_ID;

    expect(issueCodes(catalog)).toContain("concept_identity");
  });

  it("requires form projections to point to a different concept", () => {
    const catalog = cloneCatalog();
    requireIngredient(catalog, GROUND_PORK_ID).conceptId = GROUND_PORK_ID;

    expect(issueCodes(catalog)).toContain("form_projection_identity");
  });

  it("pins ground pork to the raw ground projection of the general pork concept", () => {
    const catalog = cloneCatalog();
    requireIngredient(catalog, GROUND_PORK_ID).processState = "cooked";

    expect(issueCodes(catalog)).toContain("ground_pork_identity");
  });

  it("maps ordinary English pork only to general pork", () => {
    const catalog = cloneCatalog();
    const groundPork = requireIngredient(catalog, GROUND_PORK_ID);
    const alias = groundPork.aliases.find((candidate) => candidate.alias === "ground pork");
    if (!alias) throw new Error("Ground pork alias fixture is required");
    alias.alias = "pork";
    alias.normalizedAlias = "pork";

    expect(issueCodes(catalog)).toEqual(expect.arrayContaining(["approved_alias_conflict", "ground_pork_alias"]));
  });

  it("accepts ground/minced pork labels but never auto-approves animal-unspecified meat mince", () => {
    const validCodes = issueCodes(cloneCatalog());
    expect(validCodes).not.toContain("ground_pork_alias");
    expect(validCodes).not.toContain("ambiguous_meat_alias");

    const missingEnglishCatalog = cloneCatalog();
    const porkMince = requireIngredient(missingEnglishCatalog, GROUND_PORK_ID).aliases
      .find((candidate) => candidate.alias === "pork mince");
    if (!porkMince) throw new Error("Pork mince alias fixture is required");
    porkMince.reviewStatus = "pending";
    expect(issueCodes(missingEnglishCatalog)).toContain("ground_pork_alias");

    const catalog = cloneCatalog();
    const ambiguous = requireIngredient(catalog, GROUND_PORK_ID).aliases
      .find((candidate) => candidate.alias === "肉末");
    if (!ambiguous) throw new Error("Ambiguous meat alias fixture is required");
    ambiguous.reviewStatus = "approved";

    expect(issueCodes(catalog)).toContain("ambiguous_meat_alias");
  });

  it("rejects an approved alias claimed by two ingredients in the same locale", () => {
    const catalog = cloneCatalog();
    const alias = catalog.ingredients[0].aliases[0];
    alias.alias = "鸡翅";
    alias.normalizedAlias = "鸡翅";

    expect(issueCodes(catalog)).toContain("approved_alias_conflict");
  });

  it("requires an explicit region for regional aliases", () => {
    const catalog = cloneCatalog();
    const alias = catalog.ingredients.flatMap((ingredient) => ingredient.aliases)
      .find((candidate) => candidate.aliasType === "regional");
    if (!alias) throw new Error("Regional alias fixture is required");
    alias.region = null;

    expect(issueCodes(catalog)).toContain("alias_region");
  });

  it("rejects a legacy ID claimed by two ingredients", () => {
    const catalog = cloneCatalog();
    catalog.ingredients[1].legacyIds.push("egg");

    expect(issueCodes(catalog)).toContain("legacy_id_conflict");
  });

  it("rejects a broken three-level category chain", () => {
    const catalog = cloneCatalog();
    const ingredient = catalog.ingredients[0];
    ingredient.categoryLevel3Id = ingredient.categoryLevel2Id;
    ingredient.categoryId = ingredient.categoryLevel2Id;
    ingredient.categoryIds[2] = ingredient.categoryLevel2Id;

    expect(issueCodes(catalog)).toContain("category_levels");
  });

  it("rejects a default unit outside the unit catalog", () => {
    const catalog = cloneCatalog();
    catalog.ingredients[0].defaultUnitId = "20000000-0000-4000-8000-000000009999";

    expect(issueCodes(catalog)).toContain("default_unit");
  });

  it("rejects an amount mode that disagrees with the default unit dimension", () => {
    const catalog = cloneCatalog();
    const milk = catalog.ingredients.find((ingredient) => ingredient.canonicalNameZh === "牛奶");
    if (!milk) throw new Error("Milk fixture is required");
    milk.defaultAmountMode = "mass";

    expect(issueCodes(catalog)).toContain("default_amount_mode");
  });

  it("rejects storage facts without a registered source", () => {
    const catalog = cloneCatalog();
    catalog.ingredients[0].storageProfiles[0].sourceId = "10000000-0000-4000-8000-000000009999";

    expect(issueCodes(catalog)).toContain("missing_source");
  });

  it("binds storage and nutrition facts to the ingredient form and process", () => {
    const storageCatalog = cloneCatalog();
    storageCatalog.ingredients[0].storageProfiles[0].formCode = "ground";
    expect(issueCodes(storageCatalog)).toContain("storage_identity_context");

    const nutritionCatalog = cloneCatalog();
    nutritionCatalog.ingredients[0].nutritionProfile.processState = "cooked";
    expect(issueCodes(nutritionCatalog)).toContain("nutrition_identity_context");
  });

  it("rejects approved numeric nutrition without record-level provenance", () => {
    const catalog = cloneCatalog();
    const profile = catalog.ingredients[2].nutritionProfile;
    profile.caloriesKcal = 1;
    profile.proteinG = 1;
    profile.fatG = 1;
    profile.carbohydrateG = 1;
    profile.fiberG = 1;
    profile.reviewStatus = "approved";

    expect(issueCodes(catalog)).toContain("nutrition_provenance");
  });

  it("requires published batches to carry a verified revision, importer, and checksum", () => {
    const checksumCatalog = cloneCatalog();
    checksumCatalog.importBatches[0].recordsSha256 = "not-a-sha256";
    expect(issueCodes(checksumCatalog)).toContain("published_batch_governance");

    const importerCatalog = cloneCatalog();
    importerCatalog.importBatches[0].importerVersion = "different-importer";
    expect(issueCodes(importerCatalog)).toContain("published_batch_importer");

    const revisionCatalog = cloneCatalog();
    revisionCatalog.importBatches[0].sourceRevision = "different-revision";
    expect(issueCodes(revisionCatalog)).toContain("import_batch_revision");

    const countCatalog = cloneCatalog();
    countCatalog.importBatches[0].inputRecordCount += 1;
    expect(issueCodes(countCatalog)).toContain("published_batch_counts");

    const sourceReviewCatalog = cloneCatalog();
    requireEpicureSource(sourceReviewCatalog).reviewStatus = "pending";
    expect(issueCodes(sourceReviewCatalog)).toContain("published_batch_source_review");
  });

  it("requires every mapping import batch reference to resolve to the same source", () => {
    const catalog = cloneCatalog();
    requireApprovedEpicureMapping(catalog).importBatchId = "b0000000-0000-4000-8000-000000009999";

    expect(issueCodes(catalog)).toContain("mapping_import_batch");
  });

  it("allows approval only for exact, lossless Epicure mappings", () => {
    const epicureMappings = v0421GoldenCatalog.ingredients
      .flatMap((ingredient) => ingredient.externalMappings)
      .filter((mapping) => mapping.system === "Epicure_Cooc");
    const approved = epicureMappings.filter((mapping) => mapping.reviewStatus === "approved");
    const pending = epicureMappings.filter((mapping) => mapping.reviewStatus === "pending");

    expect(approved).toHaveLength(20);
    expect(pending).toHaveLength(8);
    expect(approved.every((mapping) => mapping.matchType === "exact" && mapping.lossiness.length === 0)).toBe(true);
    expect(epicureMappings
      .filter((mapping) => mapping.matchType !== "exact" || mapping.lossiness.length > 0)
      .every((mapping) => mapping.reviewStatus === "pending")).toBe(true);

    const catalog = cloneCatalog();
    const mapping = requireApprovedEpicureMapping(catalog);
    mapping.matchType = "representative";
    mapping.lossiness = ["form"];

    expect(issueCodes(catalog)).toContain("epicure_approval_gate");

    const unexplainedCatalog = cloneCatalog();
    const unexplained = unexplainedCatalog.ingredients
      .flatMap((ingredient) => ingredient.externalMappings)
      .find((candidate) => candidate.matchType === "representative");
    if (!unexplained) throw new Error("Representative mapping fixture is required");
    unexplained.lossiness = [];
    expect(issueCodes(unexplainedCatalog)).toContain("mapping_lossiness");
  });

  it("requires approved Epicure mappings to use a published recommendation batch", () => {
    const batchCatalog = cloneCatalog();
    batchCatalog.importBatches[0].status = "staged";
    expect(issueCodes(batchCatalog)).toContain("epicure_published_batch");

    const scopeCatalog = cloneCatalog();
    requireApprovedEpicureMapping(scopeCatalog).usageScopes = ["identity"];
    expect(issueCodes(scopeCatalog)).toContain("epicure_usage_scope");
  });

  it("keeps Epicure rights review-scoped instead of claiming production clearance", () => {
    const catalog = cloneCatalog();
    requireEpicureSource(catalog).rightsReviewStatus = "approved";

    expect(issueCodes(catalog)).toContain("epicure_rights_scope");

    const attributionCatalog = cloneCatalog();
    requireEpicureSource(attributionCatalog).attributionRequired = false;
    expect(issueCodes(attributionCatalog)).toContain("source_license");
  });

  it("rejects mapping uses outside the source's declared scopes", () => {
    const catalog = cloneCatalog();
    requireApprovedEpicureMapping(catalog).usageScopes = ["identity", "recommendation", "storage"];

    expect(issueCodes(catalog)).toContain("mapping_usage_scope");
  });

  it("requires relationship evidence for related mappings", () => {
    const catalog = cloneCatalog();
    const mapping = catalog.ingredients
      .flatMap((ingredient) => ingredient.externalMappings)
      .find((candidate) => candidate.system === "Epicure_Cooc" && candidate.reviewStatus === "pending");
    if (!mapping) throw new Error("Pending Epicure mapping fixture is required");
    mapping.matchType = "related";
    mapping.metadata = {};

    expect(issueCodes(catalog)).toContain("related_mapping_evidence");
  });

  it("rejects multiple primary images", () => {
    const catalog = cloneCatalog();
    const duplicate = {
      ...catalog.ingredients[0].imageAssets[0],
      id: "90000000-0000-4000-8000-000000009999",
    };
    catalog.ingredients[0].imageAssets.push(duplicate);

    expect(issueCodes(catalog)).toContain("primary_image");
  });
});
