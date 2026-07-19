import rawV042Catalog from "./v0.4.2-golden-catalog.json";
import rawV0421Catalog from "./v0.4.2.1-golden-catalog.json";
import type {
  CatalogCategory,
  IngredientCatalogDocument,
  IngredientDetail,
} from "./types";
import { normalizeCatalogLabel } from "./normalize";

export const v042GoldenCatalog = rawV042Catalog as unknown as IngredientCatalogDocument;
export const v0421GoldenCatalog = rawV0421Catalog as unknown as IngredientCatalogDocument;

export type CatalogValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type CatalogValidationResult = {
  valid: boolean;
  issues: CatalogValidationIssue[];
};

export type CatalogValidationOptions = {
  releasePolicy?: "v0.4.2.1" | "v0.4.2" | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const GENERAL_PORK_ID = "50000000-0000-4000-8000-000000000006";
const GROUND_PORK_ID = "50000000-0000-4000-8000-000000000007";

export function normalizeCatalogAlias(value: string): string {
  return normalizeCatalogLabel(value);
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function aliasOwnershipKey(locale: string, normalizedAlias: string): string {
  return `${locale.toLocaleLowerCase("en-US")}:${normalizedAlias}`;
}

export function validateIngredientCatalog(
  document: IngredientCatalogDocument,
  options: CatalogValidationOptions = {},
): CatalogValidationResult {
  const releasePolicy = options.releasePolicy === undefined ? "v0.4.2.1" : options.releasePolicy;
  const enforceV0421 = releasePolicy === "v0.4.2.1"
    || (releasePolicy === null && document.schemaVersion === "1.1.0");
  const issues: CatalogValidationIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const expectUuid = (value: string, path: string) => {
    if (!UUID_PATTERN.test(value)) add("invalid_uuid", path, `Expected a fixed UUID, received ${value}.`);
  };
  const expectUniqueIds = <T extends { id: string }>(records: T[], path: string) => {
    const seen = new Set<string>();
    records.forEach((record, index) => {
      expectUuid(record.id, `${path}[${index}].id`);
      if (seen.has(record.id)) add("duplicate_id", `${path}[${index}].id`, `Duplicate ID ${record.id}.`);
      seen.add(record.id);
    });
  };

  if (releasePolicy === "v0.4.2.1" && document.catalogVersion !== "0.4.2.1") {
    add("catalog_version", "catalogVersion", "The golden dataset must identify catalog version 0.4.2.1.");
  }
  if (releasePolicy === "v0.4.2" && document.catalogVersion !== "0.4.2") {
    add("catalog_version", "catalogVersion", "The golden dataset must identify catalog version 0.4.2.");
  }
  if (enforceV0421 && document.schemaVersion !== "1.1.0") {
    add("schema_version", "schemaVersion", "Catalog v0.4.2.1 requires schema version 1.1.0.");
  }
  if (!hasText(document.schemaVersion) || !hasText(document.dataVersion)) {
    add("catalog_governance", "schemaVersion", "Schema and data versions are required.");
  }
  if (!hasText(document.reviewedBy) || !isDateTime(document.reviewedAt) || !isDateTime(document.publishedAt)) {
    add("catalog_governance", "reviewedBy", "Top-level reviewer and valid review/publication timestamps are required.");
  }

  const importBatches = document.importBatches ?? [];
  const ingredientForms = document.ingredientForms ?? [];

  expectUniqueIds(document.sources, "sources");
  if (enforceV0421) expectUniqueIds(importBatches, "importBatches");
  expectUniqueIds(document.units, "units");
  expectUniqueIds(document.storageMethods, "storageMethods");
  expectUniqueIds(document.categories, "categories");
  expectUniqueIds(document.ingredients, "ingredients");

  if (releasePolicy === "v0.4.2" || releasePolicy === "v0.4.2.1") {
    const requiredSourceSignals = ["WS/T 464", "家庭食品安全提示", "SR28", "FoodKeeper"];
    for (const signal of requiredSourceSignals) {
      const found = document.sources.some((source) =>
        `${source.provider} ${source.datasetName} ${source.version}`.includes(signal),
      );
      if (!found) add("required_source", "sources", `Missing required source family: ${signal}.`);
    }
  }

  const sourceIds = new Set(document.sources.map((source) => source.id));
  const sourceById = new Map(document.sources.map((source) => [source.id, source]));
  const importBatchById = new Map(importBatches.map((batch) => [batch.id, batch]));
  const formCodes = new Set(ingredientForms.map((form) => form.code));
  const unitById = new Map(document.units.map((unit) => [unit.id, unit]));
  const storageMethodIds = new Set(document.storageMethods.map((method) => method.id));
  const categoryById = new Map(document.categories.map((category) => [category.id, category]));
  const ingredientById = new Map(document.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  document.sources.forEach((source, index) => {
    if (!hasText(source.provider) || !hasText(source.datasetName) || !hasText(source.version)) {
      add("source_governance", `sources[${index}]`, "Provider, dataset name, and version are required.");
    }
    if (!hasText(source.sourceUrl) || !hasText(source.license) || !hasText(source.jurisdiction)) {
      add("source_governance", `sources[${index}]`, "Source URL, license, and jurisdiction are required.");
    }
    if (!isDateTime(source.retrievedAt) || !isDateTime(source.reviewedAt)) {
      add("source_governance", `sources[${index}]`, "Retrieval and review timestamps must be valid.");
    }
    if (enforceV0421) {
      if (!hasText(source.licenseCode) || !hasText(source.sourceRevision) || source.usageScopes.length === 0) {
        add("source_release_metadata", `sources[${index}]`, "License code, source revision, and at least one usage scope are required.");
      }
      if (source.redistributionStatus === "attribution_required"
        && (!source.attributionRequired || source.licenseUrl === null)) {
        add("source_license", `sources[${index}].licenseUrl`, "Sources redistributed under attribution terms need an attribution flag and license URL.");
      }
      if (source.snapshotSha256 !== null && !SHA256_PATTERN.test(source.snapshotSha256)) {
        add("source_checksum", `sources[${index}].snapshotSha256`, "Source snapshot checksum must be a lowercase SHA-256 digest.");
      }
    }
  });

  if (enforceV0421) {
    validateImportBatches(importBatches, sourceById, add);
    validateIngredientForms(ingredientForms, add);
  }

  for (const category of document.categories) validateCategory(category, categoryById, add);

  const activeIngredients = document.ingredients.filter((ingredient) => ingredient.status === "active");
  if (releasePolicy === "v0.4.2" || releasePolicy === "v0.4.2.1") {
    if (document.ingredients.length !== 30) {
      add("golden_set_size", "ingredients", `Expected exactly 30 golden records, found ${document.ingredients.length}.`);
    }
    if (activeIngredients.length !== 30) {
      add("active_count", "ingredients", `Expected exactly 30 active records, found ${activeIngredients.length}.`);
    }
  }

  const nameOwners = new Map<string, string>();
  const slugOwners = new Map<string, string>();
  const approvedAliasOwners = new Map<string, string>();
  const legacyOwners = new Map<string, string>();
  const allNestedIds = new Set<string>([
    ...document.sources.map((record) => record.id),
    ...(enforceV0421 ? importBatches.map((record) => record.id) : []),
    ...document.units.map((record) => record.id),
    ...document.storageMethods.map((record) => record.id),
    ...document.categories.map((record) => record.id),
    ...document.ingredients.map((record) => record.id),
  ]);

  for (const ingredient of document.ingredients) {
    const normalizedName = normalizeCatalogAlias(ingredient.canonicalNameZh);
    const nameKey = aliasOwnershipKey("zh-CN", normalizedName);
    if (!approvedAliasOwners.has(nameKey)) approvedAliasOwners.set(nameKey, ingredient.id);
    if (ingredient.canonicalNameEn) {
      const englishKey = aliasOwnershipKey("en", normalizeCatalogAlias(ingredient.canonicalNameEn));
      if (!approvedAliasOwners.has(englishKey)) approvedAliasOwners.set(englishKey, ingredient.id);
    }
  }

  const claimEntityId = (id: string, path: string) => {
    expectUuid(id, path);
    if (allNestedIds.has(id)) add("duplicate_nested_id", path, `Nested entity ID ${id} is reused.`);
    allNestedIds.add(id);
  };

  for (const [index, ingredient] of document.ingredients.entries()) {
    const path = `ingredients[${index}]`;
    const normalizedName = normalizeCatalogAlias(ingredient.canonicalNameZh);
    const existingNameOwner = nameOwners.get(normalizedName);
    if (existingNameOwner && existingNameOwner !== ingredient.id) {
      add("duplicate_name", `${path}.canonicalNameZh`, `Canonical name conflicts with ${existingNameOwner}.`);
    }
    nameOwners.set(normalizedName, ingredient.id);
    const existingSlugOwner = slugOwners.get(ingredient.slug);
    if (existingSlugOwner && existingSlugOwner !== ingredient.id) {
      add("duplicate_slug", `${path}.slug`, `Slug conflicts with ${existingSlugOwner}.`);
    }
    slugOwners.set(ingredient.slug, ingredient.id);

    for (const legacyId of ingredient.legacyIds) {
      const owner = legacyOwners.get(legacyId);
      if (owner && owner !== ingredient.id) {
        add("legacy_id_conflict", `${path}.legacyIds`, `Legacy ID ${legacyId} is already owned by ${owner}.`);
      }
      legacyOwners.set(legacyId, ingredient.id);
    }

    validateGovernance(ingredient, path, add);
    if (enforceV0421) {
      validateIdentity(ingredient, path, ingredientById, formCodes, add);
    }
    validateCategories(ingredient, path, categoryById, add);
    validateAliases(ingredient, path, sourceIds, approvedAliasOwners, claimEntityId, add);
    validateUnits(ingredient, path, unitById, sourceIds, claimEntityId, add);
    validateStorage(ingredient, path, sourceIds, storageMethodIds, formCodes, enforceV0421, claimEntityId, add);
    validateExternalMappings(
      ingredient,
      path,
      sourceById,
      importBatchById,
      enforceV0421,
      claimEntityId,
      add,
    );
    validateNutrition(ingredient, path, sourceIds, unitById, formCodes, enforceV0421, claimEntityId, add);
    validateImages(ingredient, path, claimEntityId, add);

    for (const sourceId of ingredient.sourceIds) {
      if (!sourceIds.has(sourceId)) add("missing_source", `${path}.sourceIds`, `Unknown source ${sourceId}.`);
    }
    if (ingredient.status === "active" && ingredient.referencePrice !== null) {
      add("reference_price", `${path}.referencePrice`, "Reference price must stay null; user purchase prices belong to inventory facts.");
    }
  }

  if (releasePolicy === "v0.4.2" || releasePolicy === "v0.4.2.1") {
    validateLegacyAssignments(document.ingredients, add);
  }
  if (enforceV0421) validatePorkReleaseSemantics(document.ingredients, add);
  return { valid: issues.length === 0, issues };
}

function validateImportBatches(
  batches: IngredientCatalogDocument["importBatches"],
  sourceById: Map<string, IngredientCatalogDocument["sources"][number]>,
  add: (code: string, path: string, message: string) => void,
): void {
  for (const [index, batch] of batches.entries()) {
    const path = `importBatches[${index}]`;
    const source = sourceById.get(batch.sourceId);
    if (!source) {
      add("missing_source", `${path}.sourceId`, `Unknown source ${batch.sourceId}.`);
      continue;
    }
    if (batch.sourceRevision !== source.sourceRevision) {
      add("import_batch_revision", `${path}.sourceRevision`, "Import batch revision must equal its source revision.");
    }
    const accounted = batch.acceptedMappingCount + batch.pendingMappingCount + batch.rejectedRecordCount;
    if (accounted > batch.inputRecordCount) {
      add("import_batch_counts", path, "Accepted, pending, and rejected counts cannot exceed inputRecordCount.");
    }
    if (batch.status === "published") {
      if (accounted !== batch.inputRecordCount) {
        add("published_batch_counts", path, "Published batch counts must account for every input record.");
      }
      if (!hasText(batch.sourceRevision)
        || !hasText(batch.importerVersion)
        || !SHA256_PATTERN.test(batch.recordsSha256)
        || !hasText(batch.reviewedBy)
        || !isDateTime(batch.importedAt)
        || !isDateTime(batch.reviewedAt)) {
        add("published_batch_governance", path, "Published batches require revision, importer, checksum, and review timestamps.");
      }
      if (!hasText(source.sourceRevision) || !hasText(source.importerVersion)) {
        add("published_batch_source", `${path}.sourceId`, "Published batches require a versioned source importer contract.");
      } else if (batch.importerVersion !== source.importerVersion) {
        add("published_batch_importer", `${path}.importerVersion`, "Published batch importer must equal the source importer version.");
      }
      if (source.reviewStatus !== "approved") {
        add("published_batch_source_review", `${path}.sourceId`, "Published batches require an approved data source.");
      }
    }
  }
}

function validateIngredientForms(
  forms: IngredientCatalogDocument["ingredientForms"],
  add: (code: string, path: string, message: string) => void,
): void {
  const owners = new Map<string, number>();
  forms.forEach((form, index) => {
    const previous = owners.get(form.code);
    if (previous !== undefined) {
      add("duplicate_form_code", `ingredientForms[${index}].code`, `Form code ${form.code} is already defined at index ${previous}.`);
    }
    owners.set(form.code, index);
    if (!hasText(form.nameZh) || !hasText(form.nameEn) || !hasText(form.description) || !hasText(form.dataVersion)) {
      add("form_governance", `ingredientForms[${index}]`, "Ingredient forms require names, description, and data version.");
    }
  });
  for (const code of ["unspecified", "whole_piece", "sliced", "diced", "shredded", "ground"] as const) {
    const form = forms.find((candidate) => candidate.code === code);
    if (!form || form.status !== "active") {
      add("required_form", "ingredientForms", `Catalog v0.4.2.1 requires active form code ${code}.`);
    }
  }
}

function validateIdentity(
  ingredient: IngredientDetail,
  path: string,
  ingredientById: Map<string, IngredientDetail>,
  formCodes: Set<string>,
  add: (code: string, path: string, message: string) => void,
): void {
  if (!formCodes.has(ingredient.formCode)) {
    add("form_reference", `${path}.formCode`, `Unknown ingredient form ${ingredient.formCode}.`);
  }
  const concept = ingredientById.get(ingredient.conceptId);
  if (!concept) {
    add("concept_reference", `${path}.conceptId`, `Unknown concept ${ingredient.conceptId}.`);
  }
  const variant = ingredient.variantId === null ? null : ingredientById.get(ingredient.variantId);
  if (ingredient.variantId !== null && !variant) {
    add("variant_reference", `${path}.variantId`, `Unknown variant ${ingredient.variantId}.`);
  }

  if (ingredient.recordRole === "concept") {
    if (ingredient.conceptId !== ingredient.id) {
      add("concept_identity", `${path}.conceptId`, "Concept records must identify themselves as their concept.");
    }
    if (ingredient.variantId !== null) {
      add("concept_identity", `${path}.variantId`, "Concept records cannot point to a variant.");
    }
    if (ingredient.formCode !== "unspecified") {
      add("concept_identity", `${path}.formCode`, "Concept records use the unspecified form; concrete forms are separate projections.");
    }
  }

  if (ingredient.recordRole === "variant") {
    if (ingredient.conceptId === ingredient.id || concept?.recordRole !== "concept") {
      add("variant_identity", `${path}.conceptId`, "Variant records must point to a different concept record.");
    }
    if (ingredient.variantId !== ingredient.id) {
      add("variant_identity", `${path}.variantId`, "Variant records must identify themselves as their variant.");
    }
  }

  if (ingredient.recordRole === "form_projection") {
    if (ingredient.conceptId === ingredient.id) {
      add("form_projection_identity", `${path}.conceptId`, "Form projections cannot identify themselves as their concept.");
    }
    if (concept && concept.recordRole !== "concept") {
      add("form_projection_identity", `${path}.conceptId`, "Form projections must resolve to a concept record.");
    }
    if (ingredient.formCode === "unspecified") {
      add("form_projection_identity", `${path}.formCode`, "Form projections require a concrete form code.");
    }
    if (variant && (variant.recordRole !== "variant" || variant.conceptId !== ingredient.conceptId)) {
      add("form_projection_identity", `${path}.variantId`, "Form projection variant must belong to the same concept.");
    }
  }
}

function validatePorkReleaseSemantics(
  ingredients: IngredientDetail[],
  add: (code: string, path: string, message: string) => void,
): void {
  const generalPork = ingredients.find((ingredient) => ingredient.id === GENERAL_PORK_ID);
  const groundPork = ingredients.find((ingredient) => ingredient.id === GROUND_PORK_ID);
  if (!generalPork || generalPork.recordRole !== "concept" || generalPork.conceptId !== GENERAL_PORK_ID) {
    add("pork_identity", "ingredients", "General pork must remain the self-identifying pork concept.");
  }
  if (!groundPork
    || groundPork.recordRole !== "form_projection"
    || groundPork.conceptId !== GENERAL_PORK_ID
    || groundPork.variantId !== null
    || groundPork.formCode !== "ground"
    || groundPork.processState !== "raw") {
    add("ground_pork_identity", "ingredients", "Ground pork must be the raw ground form projection of the general pork concept.");
  }

  const approvedAlias = (ingredient: IngredientDetail | undefined, label: string, locale: string) =>
    ingredient?.aliases.some((alias) => alias.reviewStatus === "approved"
      && alias.locale.toLocaleLowerCase("en-US") === locale.toLocaleLowerCase("en-US")
      && normalizeCatalogAlias(alias.alias) === normalizeCatalogAlias(label)) ?? false;

  if (!approvedAlias(generalPork, "pork", "en")) {
    add("pork_alias", "ingredients", "The ordinary English label pork must resolve to the general pork concept.");
  }
  if (approvedAlias(groundPork, "pork", "en")) {
    add("ground_pork_alias", "ingredients", "The ordinary English label pork cannot resolve to ground pork.");
  }
  for (const label of ["ground pork", "minced pork", "pork mince"]) {
    if (!approvedAlias(groundPork, label, "en")) {
      add("ground_pork_alias", "ingredients", `Ground pork requires approved English alias ${label}.`);
    }
  }
  for (const label of ["猪肉糜", "猪绞肉"]) {
    const found = groundPork?.aliases.some((alias) => alias.reviewStatus === "approved"
      && normalizeCatalogAlias(alias.alias) === normalizeCatalogAlias(label));
    if (!found) add("ground_pork_alias", "ingredients", `Ground pork requires approved alias ${label}.`);
  }

  const ambiguous = new Set(["肉末", "肉糜", "肉沫"].map(normalizeCatalogAlias));
  for (const ingredient of ingredients) {
    for (const alias of ingredient.aliases) {
      if (alias.reviewStatus === "approved" && ambiguous.has(normalizeCatalogAlias(alias.alias))) {
        add("ambiguous_meat_alias", `ingredients.${ingredient.id}.aliases`, `${alias.alias} lacks an animal source and cannot be auto-approved.`);
      }
    }
  }
}

function validateCategory(
  category: CatalogCategory,
  categoryById: Map<string, CatalogCategory>,
  add: (code: string, path: string, message: string) => void,
): void {
  if (category.level === 1 && category.parentId !== null) {
    add("category_parent", `categories.${category.id}.parentId`, "Level-1 category must not have a parent.");
    return;
  }
  if (category.level > 1) {
    const parent = category.parentId ? categoryById.get(category.parentId) : undefined;
    if (!parent || parent.level !== category.level - 1) {
      add("category_parent", `categories.${category.id}.parentId`, "Category parent must exist at the immediately preceding level.");
    }
  }
}

function validateGovernance(
  ingredient: IngredientDetail,
  path: string,
  add: (code: string, path: string, message: string) => void,
): void {
  if (!hasText(ingredient.dataVersion) || !hasText(ingredient.reviewedBy)) {
    add("ingredient_governance", path, "Ingredient dataVersion and reviewedBy are required.");
  }
  if (![ingredient.createdAt, ingredient.updatedAt, ingredient.reviewedAt].every(isDateTime)) {
    add("ingredient_governance", path, "Ingredient governance timestamps must be valid date-times.");
  }
}

function validateCategories(
  ingredient: IngredientDetail,
  path: string,
  categoryById: Map<string, CatalogCategory>,
  add: (code: string, path: string, message: string) => void,
): void {
  const ids = [ingredient.categoryLevel1Id, ingredient.categoryLevel2Id, ingredient.categoryLevel3Id];
  if (ingredient.categoryIds.length !== 3 || ingredient.categoryIds.some((id, index) => id !== ids[index])) {
    add("category_projection", `${path}.categoryIds`, "categoryIds must equal the explicit level-1/2/3 fields.");
  }
  if (ingredient.categoryId !== ingredient.categoryLevel3Id) {
    add("category_projection", `${path}.categoryId`, "categoryId must point to the level-3 category.");
  }
  const categories = ids.map((id) => categoryById.get(id));
  if (!categories[0] || !categories[1] || !categories[2]) {
    add("category_reference", `${path}.categoryIds`, "All category references must exist.");
    return;
  }
  if (categories[0].level !== 1 || categories[1].level !== 2 || categories[2].level !== 3) {
    add("category_levels", `${path}.categoryIds`, "Ingredient categories must be ordered levels 1, 2, and 3.");
  }
  if (categories[1].parentId !== categories[0].id || categories[2].parentId !== categories[1].id) {
    add("category_chain", `${path}.categoryIds`, "Ingredient category references must form one parent chain.");
  }
}

function validateAliases(
  ingredient: IngredientDetail,
  path: string,
  sourceIds: Set<string>,
  approvedAliasOwners: Map<string, string>,
  claimEntityId: (id: string, path: string) => void,
  add: (code: string, path: string, message: string) => void,
): void {
  ingredient.aliases.forEach((alias, aliasIndex) => {
    const aliasPath = `${path}.aliases[${aliasIndex}]`;
    claimEntityId(alias.id, `${aliasPath}.id`);
    if (alias.ingredientId !== ingredient.id) add("alias_ingredient", `${aliasPath}.ingredientId`, "Alias ingredientId does not match its owner.");
    if (alias.normalizedAlias !== normalizeCatalogAlias(alias.alias)) {
      add("alias_normalization", `${aliasPath}.normalizedAlias`, "normalizedAlias must use the catalog normalizer.");
    }
    if (!sourceIds.has(alias.sourceId)) add("missing_source", `${aliasPath}.sourceId`, `Unknown source ${alias.sourceId}.`);
    if (!hasText(alias.locale) || !hasText(alias.reviewedBy) || !isDateTime(alias.reviewedAt)) {
      add("alias_governance", aliasPath, "Alias locale and review governance are required.");
    }
    if (alias.aliasType === "regional" && (alias.region === null || !hasText(alias.region))) {
      add("alias_region", `${aliasPath}.region`, "Regional aliases require an explicit region.");
    }
    if (alias.reviewStatus === "approved") {
      const aliasKey = aliasOwnershipKey(alias.locale, alias.normalizedAlias);
      const owner = approvedAliasOwners.get(aliasKey);
      if (owner && owner !== ingredient.id) {
        add("approved_alias_conflict", `${aliasPath}.normalizedAlias`, `Approved alias is already owned by ${owner}.`);
      } else {
        approvedAliasOwners.set(aliasKey, ingredient.id);
      }
    }
  });
}

function validateUnits(
  ingredient: IngredientDetail,
  path: string,
  unitById: Map<string, { id: string; dimension: string }>,
  sourceIds: Set<string>,
  claimEntityId: (id: string, path: string) => void,
  add: (code: string, path: string, message: string) => void,
): void {
  if (!unitById.has(ingredient.defaultUnitId)) add("default_unit", `${path}.defaultUnitId`, "Default unit must exist.");
  if (!ingredient.supportedUnitIds.includes(ingredient.defaultUnitId)) {
    add("default_unit", `${path}.supportedUnitIds`, "Supported units must include the default unit.");
  }
  const defaultUnit = unitById.get(ingredient.defaultUnitId);
  if (defaultUnit && defaultUnit.dimension !== ingredient.defaultAmountMode) {
    add(
      "default_amount_mode",
      `${path}.defaultAmountMode`,
      `Default amount mode ${ingredient.defaultAmountMode} must match unit dimension ${defaultUnit.dimension}.`,
    );
  }
  for (const unitId of ingredient.supportedUnitIds) {
    if (!unitById.has(unitId)) add("unit_reference", `${path}.supportedUnitIds`, `Unknown unit ${unitId}.`);
  }
  ingredient.unitConversions.forEach((conversion, conversionIndex) => {
    const conversionPath = `${path}.unitConversions[${conversionIndex}]`;
    claimEntityId(conversion.id, `${conversionPath}.id`);
    if (!unitById.has(conversion.fromUnitId) || !unitById.has(conversion.toUnitId)) {
      add("unit_reference", conversionPath, "Conversion units must exist.");
    }
    if (!sourceIds.has(conversion.sourceId)) add("missing_source", `${conversionPath}.sourceId`, "Conversion source must exist.");
    if (!(conversion.factor > 0)) add("unit_factor", `${conversionPath}.factor`, "Conversion factor must be positive.");
  });
}

function validateStorage(
  ingredient: IngredientDetail,
  path: string,
  sourceIds: Set<string>,
  storageMethodIds: Set<string>,
  formCodes: Set<string>,
  enforceV0421: boolean,
  claimEntityId: (id: string, path: string) => void,
  add: (code: string, path: string, message: string) => void,
): void {
  const profileIds = new Set(ingredient.storageProfiles.map((profile) => profile.id));
  if (!profileIds.has(ingredient.defaultStorageProfileId)) {
    add("default_storage", `${path}.defaultStorageProfileId`, "Default storage profile must belong to the ingredient.");
  }
  ingredient.storageProfiles.forEach((profile, profileIndex) => {
    const profilePath = `${path}.storageProfiles[${profileIndex}]`;
    claimEntityId(profile.id, `${profilePath}.id`);
    if (profile.ingredientId !== ingredient.id) add("storage_ingredient", `${profilePath}.ingredientId`, "Storage profile ingredientId does not match its owner.");
    if (!storageMethodIds.has(profile.storageMethodId)) add("storage_method", `${profilePath}.storageMethodId`, "Storage method must exist.");
    if (!sourceIds.has(profile.sourceId)) add("missing_source", `${profilePath}.sourceId`, "Storage source must exist.");
    if (enforceV0421) {
      if (!formCodes.has(profile.formCode)) {
        add("form_reference", `${profilePath}.formCode`, `Unknown storage form ${profile.formCode}.`);
      }
      if (profile.formCode !== ingredient.formCode || profile.processState !== ingredient.processState) {
        add("storage_identity_context", profilePath, "Storage form and process state must match the ingredient record.");
      }
    }
    if (!hasText(profile.region) || profile.environmentTags.length === 0 || !hasText(profile.foodState) || !hasText(profile.packagingState)) {
      add("storage_context", profilePath, "Region, environment, food state, and packaging state are required.");
    }
    const { minDays, maxDays, recommendedDays } = profile;
    if (minDays !== null && maxDays !== null && minDays > maxDays) {
      add("storage_range", profilePath, "Storage minDays cannot exceed maxDays.");
    }
    if (recommendedDays !== null && minDays !== null && recommendedDays < minDays) {
      add("storage_range", profilePath, "recommendedDays cannot be below minDays.");
    }
    if (recommendedDays !== null && maxDays !== null && recommendedDays > maxDays) {
      add("storage_range", profilePath, "recommendedDays cannot exceed maxDays.");
    }
    if (!hasText(profile.instructions) || !hasText(profile.reviewedBy) || !isDateTime(profile.reviewedAt)) {
      add("storage_governance", profilePath, "Instructions and review governance are required.");
    }
  });
}

function validateExternalMappings(
  ingredient: IngredientDetail,
  path: string,
  sourceById: Map<string, IngredientCatalogDocument["sources"][number]>,
  importBatchById: Map<string, IngredientCatalogDocument["importBatches"][number]>,
  enforceV0421: boolean,
  claimEntityId: (id: string, path: string) => void,
  add: (code: string, path: string, message: string) => void,
): void {
  ingredient.externalMappings.forEach((mapping, mappingIndex) => {
    const mappingPath = `${path}.externalMappings[${mappingIndex}]`;
    claimEntityId(mapping.id, `${mappingPath}.id`);
    if (mapping.ingredientId !== ingredient.id) {
      add("mapping_ingredient", `${mappingPath}.ingredientId`, "External mapping ingredientId does not match its owner.");
    }
    const source = sourceById.get(mapping.sourceId);
    if (!source) add("missing_source", `${mappingPath}.sourceId`, "External mapping source must exist.");
    if (!hasText(mapping.externalId)
      || !hasText(mapping.externalName)
      || !hasText(mapping.reviewedBy)
      || !isDateTime(mapping.reviewedAt)) {
      add("mapping_governance", mappingPath, "External record and review governance are required.");
    }
    if (!enforceV0421) return;

    const batch = mapping.importBatchId === null ? null : importBatchById.get(mapping.importBatchId);
    if (mapping.importBatchId !== null && !batch) {
      add("mapping_import_batch", `${mappingPath}.importBatchId`, "External mapping import batch must exist.");
    }
    if (batch && batch.sourceId !== mapping.sourceId) {
      add("mapping_import_batch", `${mappingPath}.importBatchId`, "Mapping and import batch must use the same source.");
    }
    if (!hasText(mapping.externalVersion)) {
      add("mapping_governance", mappingPath, "External mapping version is required.");
    }
    if (source) {
      for (const scope of mapping.usageScopes) {
        if (!source.usageScopes.includes(scope)) {
          add("mapping_usage_scope", `${mappingPath}.usageScopes`, `Source does not permit ${scope} usage.`);
        }
      }
      if (mapping.externalVersion !== source.sourceRevision) {
        add("mapping_revision", `${mappingPath}.externalVersion`, "Mapping external version must equal the reviewed source revision.");
      }
    }
    if (mapping.matchType === "exact" && mapping.lossiness.length > 0) {
      add("mapping_lossiness", `${mappingPath}.lossiness`, "Exact mappings cannot declare lossy dimensions.");
    }
    if (mapping.matchType !== "exact" && mapping.lossiness.length === 0) {
      add("mapping_lossiness", `${mappingPath}.lossiness`, "Every non-exact mapping must declare its lossy dimensions.");
    }
    if (mapping.matchType === "related" && Object.keys(mapping.metadata).length === 0) {
      add("related_mapping_evidence", `${mappingPath}.metadata`, "Related mappings require structured relationship evidence.");
    }

    if (mapping.reviewStatus === "approved") {
      if (!source || source.reviewStatus !== "approved") {
        add("mapping_source_review", `${mappingPath}.sourceId`, "Approved mappings require an approved source record.");
      }
      if (mapping.system === "Epicure_Cooc") {
        if (mapping.matchType !== "exact" || mapping.lossiness.length > 0) {
          add("epicure_approval_gate", mappingPath, "Only exact, lossless Epicure mappings can be approved automatically.");
        }
        if (!batch || batch.status !== "published") {
          add("epicure_published_batch", `${mappingPath}.importBatchId`, "Approved Epicure mappings require a published import batch.");
        }
        if (!source?.usageScopes.includes("recommendation") || !mapping.usageScopes.includes("recommendation")) {
          add("epicure_usage_scope", `${mappingPath}.usageScopes`, "Approved Epicure mappings require recommendation usage on source and mapping.");
        }
        if (source?.rightsReviewStatus === "approved") {
          add("epicure_rights_scope", `${mappingPath}.sourceId`, "Epicure corpus rights remain review-scoped and cannot be labelled production-cleared.");
        }
        if (mapping.mappingLevel !== "concept") {
          add("epicure_mapping_level", `${mappingPath}.mappingLevel`, "Epicure mappings attach at concept level in v0.4.2.1.");
        }
      }
    }
  });
}

function validateNutrition(
  ingredient: IngredientDetail,
  path: string,
  sourceIds: Set<string>,
  unitById: Map<string, { id: string }>,
  formCodes: Set<string>,
  enforceV0421: boolean,
  claimEntityId: (id: string, path: string) => void,
  add: (code: string, path: string, message: string) => void,
): void {
  const profile = ingredient.nutritionProfile;
  const profilePath = `${path}.nutritionProfile`;
  claimEntityId(profile.id, `${profilePath}.id`);
  if (profile.ingredientId !== ingredient.id) add("nutrition_ingredient", `${profilePath}.ingredientId`, "Nutrition ingredientId does not match its owner.");
  if (!unitById.has(profile.basisUnitId)) add("unit_reference", `${profilePath}.basisUnitId`, "Nutrition basis unit must exist.");
  const numericValues = [profile.caloriesKcal, profile.proteinG, profile.fatG, profile.carbohydrateG, profile.fiberG];
  const hasAnyValue = numericValues.some((value) => value !== null);
  const mapping = profile.externalMappingId
    ? ingredient.externalMappings.find((candidate) => candidate.id === profile.externalMappingId)
    : undefined;

  if (profile.externalMappingId !== null && !mapping) {
    add("nutrition_provenance", `${profilePath}.externalMappingId`, "Nutrition external mapping must belong to the ingredient.");
  }

  if (enforceV0421) {
    if (!formCodes.has(profile.formCode)) {
      add("form_reference", `${profilePath}.formCode`, `Unknown nutrition form ${profile.formCode}.`);
    }
    if (profile.formCode !== ingredient.formCode || profile.processState !== ingredient.processState) {
      add("nutrition_identity_context", profilePath, "Nutrition form and process state must match the ingredient record.");
    }
  }

  if (profile.sourceId !== null && !sourceIds.has(profile.sourceId)) {
    add("missing_source", `${profilePath}.sourceId`, "Nutrition source must exist.");
  }
  if (hasAnyValue && (!profile.sourceId || !mapping)) {
    add("nutrition_provenance", profilePath, "Any numeric nutrient value requires a source and record-level external mapping.");
  }
  if (profile.reviewStatus === "approved") {
    if (numericValues.some((value) => value === null)) add("nutrition_completeness", profilePath, "Approved baseline nutrition requires all five values.");
    if (!profile.sourceId || !mapping || mapping.reviewStatus !== "approved" || mapping.matchType !== "exact") {
      add("nutrition_provenance", profilePath, "Approved nutrition requires an approved exact external mapping and source.");
    }
    if (enforceV0421 && mapping && !mapping.usageScopes.includes("nutrition")) {
      add("nutrition_provenance", profilePath, "Approved nutrition mapping must allow nutrition usage.");
    }
    if (profile.matchType !== "exact" || profile.dataClassification === "unknown" || !profile.sourceRecordId || !profile.sourceRelease) {
      add("nutrition_classification", profilePath, "Approved nutrition requires exact match, classification, source record, and release.");
    }
    if (mapping && mapping.sourceId !== profile.sourceId) {
      add("nutrition_provenance", profilePath, "Nutrition source must equal the external mapping source.");
    }
  }
  if (!hasText(profile.reviewedBy) || !isDateTime(profile.reviewedAt)) {
    add("nutrition_governance", profilePath, "Nutrition review governance is required even when values are intentionally null.");
  }
}

function validateImages(
  ingredient: IngredientDetail,
  path: string,
  claimEntityId: (id: string, path: string) => void,
  add: (code: string, path: string, message: string) => void,
): void {
  const primary = ingredient.imageAssets.filter((asset) => asset.isPrimary);
  if (primary.length !== 1) add("primary_image", `${path}.imageAssets`, `Expected exactly one primary image, found ${primary.length}.`);
  ingredient.imageAssets.forEach((asset, assetIndex) => {
    const assetPath = `${path}.imageAssets[${assetIndex}]`;
    claimEntityId(asset.id, `${assetPath}.id`);
    if (asset.ingredientId !== ingredient.id) add("image_ingredient", `${assetPath}.ingredientId`, "Image ingredientId does not match its owner.");
    if (!asset.altText.includes(ingredient.canonicalNameZh)) add("image_name_match", `${assetPath}.altText`, "Image alt text must name the ingredient.");
    if (!hasText(asset.license) || !hasText(asset.licenseCode)) add("image_license", assetPath, "Image license and license code are required.");
    if (!asset.subjectMatchReviewed || !asset.rightsReviewed) add("image_review", assetPath, "Subject match and rights must be explicitly reviewed.");
    if (asset.processingStatus === "placeholder") {
      const expectedUri = `miiix-placeholder://${ingredient.id}`;
      if (asset.assetUri !== expectedUri) add("image_placeholder_uri", `${assetPath}.assetUri`, `Placeholder URI must be ${expectedUri}.`);
      if (asset.license !== "Miiix-owned" || asset.licenseCode !== "MIIIX-OWNED" || asset.rightsStatus !== "cleared") {
        add("image_license", assetPath, "Prototype placeholders must be explicitly Miiix-owned and rights-cleared.");
      }
      if (asset.originalUrl !== null || asset.processedUrl !== null || asset.providerAssetId !== null || asset.sourceUrl !== null) {
        add("image_provenance", assetPath, "Programmatic placeholders must not claim a source/provider URL or asset ID.");
      }
      if (asset.sourceSha256 !== null || asset.processedSha256 !== null || asset.aiGeneration !== null) {
        add("image_provenance", assetPath, "Unmaterialized non-AI placeholders must have null hashes and aiGeneration.");
      }
      if (asset.licenseStatus !== "approved_for_prototype" || asset.styleConsistency !== "prototype_placeholder") {
        add("image_release_scope", assetPath, "Placeholder rights/status must remain explicitly prototype-only.");
      }
    }
  });
}

function validateLegacyAssignments(
  ingredients: IngredientDetail[],
  add: (code: string, path: string, message: string) => void,
): void {
  const expected = new Map<string, string>([
    ["egg", "鸡蛋"], ["chickenWing", "鸡翅"], ["chickenBreast", "鸡胸肉"],
    ["chickenFeet", "鸡爪"], ["chickenLeg", "鸡腿肉"], ["pork", "猪肉末"],
    ["beef", "牛肉"], ["eggplant", "茄子"], ["pepper", "青椒"],
    ["tomato", "番茄"], ["lettuce", "生菜"], ["peach", "桃"],
    ["yangmei", "杨梅"], ["lemon", "柠檬"], ["tofu", "豆腐"],
    ["shrimp", "虾"], ["soy", "生抽"], ["rice", "米饭（熟）"],
  ]);
  for (const [legacyId, expectedName] of expected) {
    const owner = ingredients.find((ingredient) => ingredient.legacyIds.includes(legacyId));
    if (!owner || owner.canonicalNameZh !== expectedName) {
      add("legacy_assignment", "ingredients", `Legacy ID ${legacyId} must map only to ${expectedName}.`);
    }
  }
  for (const expectedEmptyName of ["猪肉（部位未指定）", "大米（生）"]) {
    const ingredient = ingredients.find((candidate) => candidate.canonicalNameZh === expectedEmptyName);
    if (!ingredient || ingredient.legacyIds.length !== 0) {
      add("legacy_assignment", "ingredients", `${expectedEmptyName} must not claim a legacy ID.`);
    }
  }
}

export function assertValidIngredientCatalog(
  document: IngredientCatalogDocument,
  options: CatalogValidationOptions = {},
): void {
  const result = validateIngredientCatalog(document, options);
  if (!result.valid) {
    const detail = result.issues.map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`).join("\n");
    throw new Error(`Invalid ingredient catalog:\n${detail}`);
  }
}
