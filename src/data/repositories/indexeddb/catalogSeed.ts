import type { IDBPTransaction } from "idb";
import type {
  DataSourceRecord,
  ExternalIngredientMapping,
  FoodCategory,
  ImportBatchRecord,
  IngredientFormDefinition,
  IngredientAlias,
  IngredientAsset,
  IngredientStorageProfile,
  IngredientUnitConversion,
  NutritionProfile,
  StorageMethod,
  UnitDefinition,
} from "../../../domain/persistence";
import type { IngredientDetail as RepositoryIngredientDetail } from "../contracts";
import type {
  CatalogAlias,
  CatalogExternalMapping,
  CatalogImageAsset,
  CatalogNutritionProfile,
  CatalogSource,
  CatalogStorageMethod,
  CatalogStorageProfile,
  CatalogUnit,
  CatalogUnitConversion,
  IngredientCatalogDocument,
  IngredientDetail as SeedIngredientDetail,
} from "../../catalog/types";
import { normalizeCatalogLabel } from "../../catalog/normalize";
import { assertValidIngredientCatalog, v0421GoldenCatalog } from "../../catalog/validation";
import { IndexedDbContext } from "./context";
import type { CatalogIngredientRecord, MiiixIndexedDbSchema } from "./schema";

export const CATALOG_SEED_VERSION_META_KEY = "catalog-seed-version";
export const CATALOG_SEED_DIGEST_META_KEY = "catalog-seed-digest";
export const CATALOG_SEED_STATS_META_KEY = "catalog-seed-stats";
export const CATALOG_REFERENCE_MIGRATION_META_KEY = "catalog-reference-migration-version";
const CATALOG_REFERENCE_MIGRATION_VERSION = 3;

const CATALOG_SEED_STORES = [
  "meta",
  "catalogSources",
  "catalogImportBatches",
  "catalogIngredientForms",
  "catalogCategories",
  "catalogUnits",
  "catalogStorageMethods",
  "catalogIngredients",
  "inventoryLots",
  "inventoryTransactions",
  "recipeIngredients",
  "shoppingItems",
  "recognitionCandidates",
  "recommendationRuns",
  "recommendationCandidates",
] as const;

export type CatalogSeedResult = {
  changed: boolean;
  catalogVersion: string;
  digest: string;
  ingredientCount: number;
  /** Number of persisted operational fields changed by the compatibility migration. */
  migratedFieldCount: number;
};

export type CatalogSeedOptions = {
  /** Test-only transaction hook used to prove rollback after catalog writes. */
  beforeMetaWrite?: () => void | Promise<void>;
};

/**
 * Imports one catalog snapshot and migrates legacy ingredient references in a
 * single IndexedDB transaction. This seed is intentionally independent from
 * kitchen demo data and never reads or changes the kitchen seed meta key.
 */
export async function ensureCatalogSeed(
  context: IndexedDbContext,
  document: IngredientCatalogDocument = v0421GoldenCatalog,
  options: CatalogSeedOptions = {},
): Promise<CatalogSeedResult> {
  assertValidIngredientCatalog(document, { releasePolicy: null });
  validateSeedBoundary(document);
  const digest = digestCatalogDocument(document);
  const current = await context.read(["meta"], async (transaction) => {
    const store = transaction.objectStore("meta");
    const [version, storedDigest, referenceMigration] = await Promise.all([
      store.get(CATALOG_SEED_VERSION_META_KEY),
      store.get(CATALOG_SEED_DIGEST_META_KEY),
      store.get(CATALOG_REFERENCE_MIGRATION_META_KEY),
    ]);
    return {
      version: version?.value,
      digest: storedDigest?.value,
      referenceMigration: referenceMigration?.value,
    };
  });

  assertCatalogRevisionIsImmutable(
    current.version,
    current.digest,
    document.catalogVersion,
    digest,
  );

  if (current.version === document.catalogVersion
    && current.digest === digest
    && current.referenceMigration === CATALOG_REFERENCE_MIGRATION_VERSION) {
    return {
      changed: false,
      catalogVersion: document.catalogVersion,
      digest,
      ingredientCount: document.ingredients.length,
      migratedFieldCount: 0,
    };
  }

  return context.write(CATALOG_SEED_STORES, async (transaction) => {
    const metaStore = transaction.objectStore("meta");
    const [transactionVersion, transactionDigest, transactionReferenceMigration] = await Promise.all([
      metaStore.get(CATALOG_SEED_VERSION_META_KEY),
      metaStore.get(CATALOG_SEED_DIGEST_META_KEY),
      metaStore.get(CATALOG_REFERENCE_MIGRATION_META_KEY),
    ]);
    const catalogIsCurrent = transactionVersion?.value === document.catalogVersion
      && transactionDigest?.value === digest;
    assertCatalogRevisionIsImmutable(
      transactionVersion?.value,
      transactionDigest?.value,
      document.catalogVersion,
      digest,
    );
    const referenceMigrationIsCurrent = transactionReferenceMigration?.value
      === CATALOG_REFERENCE_MIGRATION_VERSION;
    if (catalogIsCurrent && referenceMigrationIsCurrent) {
      return {
        changed: false,
        catalogVersion: document.catalogVersion,
        digest,
        ingredientCount: document.ingredients.length,
        migratedFieldCount: 0,
      };
    }

    const sourceStore = transaction.objectStore("catalogSources");
    const importBatchStore = transaction.objectStore("catalogImportBatches");
    const ingredientFormStore = transaction.objectStore("catalogIngredientForms");
    const categoryStore = transaction.objectStore("catalogCategories");
    const unitStore = transaction.objectStore("catalogUnits");
    const storageMethodStore = transaction.objectStore("catalogStorageMethods");
    const ingredientStore = transaction.objectStore("catalogIngredients");

    if (!catalogIsCurrent) {
      await Promise.all([
        sourceStore.clear(),
        importBatchStore.clear(),
        ingredientFormStore.clear(),
        categoryStore.clear(),
        unitStore.clear(),
        storageMethodStore.clear(),
        ingredientStore.clear(),
      ]);

      for (const source of document.sources) await sourceStore.put(toDataSourceRecord(source));
      for (const batch of document.importBatches) await importBatchStore.put(toImportBatchRecord(batch));
      for (const form of document.ingredientForms) await ingredientFormStore.put(toIngredientFormDefinition(form));
      for (const category of document.categories) await categoryStore.put(toFoodCategory(category));
      for (const unit of document.units) await unitStore.put(toUnitDefinition(unit));
      for (const method of document.storageMethods) {
        await storageMethodStore.put(toStorageMethod(method));
      }
      for (const ingredient of document.ingredients) {
        await ingredientStore.put(toCatalogIngredientRecord(ingredient));
      }
    }

    const legacyIds = createLegacyIngredientIdMap(document.ingredients);
    const ingredientById = new Map(document.ingredients.map((ingredient) => [ingredient.id, ingredient]));
    const catalogReferences = createLegacyCatalogReferenceMaps(document);
    const migratedFieldCount = await migrateOperationalIngredientReferences(
      transaction,
      legacyIds,
      catalogReferences,
      ingredientById,
    );

    try {
      await options.beforeMetaWrite?.();
    } catch (error) {
      // Consume the transaction completion rejection here. IndexedDbContext
      // will still rethrow the original import error to the caller.
      transaction.abort();
      try {
        await transaction.done;
      } catch {
        // Expected: abort is the rollback mechanism.
      }
      throw error;
    }

    await metaStore.put({ key: CATALOG_SEED_VERSION_META_KEY, value: document.catalogVersion });
    await metaStore.put({ key: CATALOG_SEED_DIGEST_META_KEY, value: digest });
    await metaStore.put({
      key: CATALOG_REFERENCE_MIGRATION_META_KEY,
      value: CATALOG_REFERENCE_MIGRATION_VERSION,
    });
    await metaStore.put({
      key: CATALOG_SEED_STATS_META_KEY,
      value: {
        catalogVersion: document.catalogVersion,
        ingredientCount: document.ingredients.length,
        migratedFieldCount,
        referenceMigrationVersion: CATALOG_REFERENCE_MIGRATION_VERSION,
      },
    });

    return {
      changed: !catalogIsCurrent || !referenceMigrationIsCurrent || migratedFieldCount > 0,
      catalogVersion: document.catalogVersion,
      digest,
      ingredientCount: document.ingredients.length,
      migratedFieldCount,
    };
  });
}

export function digestCatalogDocument(document: IngredientCatalogDocument) {
  const source = stableSerialize(document);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function assertCatalogRevisionIsImmutable(
  storedVersion: unknown,
  storedDigest: unknown,
  incomingVersion: string,
  incomingDigest: string,
) {
  if (storedVersion === incomingVersion && storedDigest !== incomingDigest) {
    throw new Error(
      `Catalog version ${incomingVersion} already exists with a different digest; bump catalogVersion before importing changed data.`,
    );
  }
}

export function aliasLookupKey(locale: string, normalizedAlias: string) {
  return `${locale.toLocaleLowerCase("en-US")}:${normalizedAlias}`;
}

export function toCatalogIngredientRecord(seed: SeedIngredientDetail): CatalogIngredientRecord {
  const detail = toRepositoryIngredientDetail(seed);
  const canonicalNameKey = normalizeCatalogLabel(seed.canonicalNameZh);
  const approvedAliases = seed.aliases.filter((alias) => alias.reviewStatus === "approved");
  const approvedAliasKeys = unique([
    aliasLookupKey("zh-CN", canonicalNameKey),
    ...(seed.canonicalNameEn
      ? [aliasLookupKey("en", normalizeCatalogLabel(seed.canonicalNameEn))]
      : []),
    ...approvedAliases.map((alias) => aliasLookupKey(
      alias.locale,
      normalizeCatalogLabel(alias.normalizedAlias || alias.alias),
    )),
  ]);
  const searchLabelKeys = unique([
    canonicalNameKey,
    ...(seed.canonicalNameEn ? [normalizeCatalogLabel(seed.canonicalNameEn)] : []),
    ...approvedAliases.map((alias) => normalizeCatalogLabel(alias.normalizedAlias || alias.alias)),
  ]).filter(Boolean);

  return {
    id: seed.id,
    canonicalNameKey,
    searchLabelKeys,
    approvedAliasKeys,
    categoryIds: [...seed.categoryIds],
    storageMethodIds: unique(seed.storageProfiles.map((profile) => profile.storageMethodId)),
    kind: detail.ingredient.kind,
    recordRole: detail.ingredient.recordRole,
    conceptId: detail.ingredient.conceptId,
    variantId: detail.ingredient.variantId,
    formCode: detail.ingredient.formCode,
    processState: detail.ingredient.processState,
    isSelectable: detail.ingredient.isSelectable,
    status: detail.ingredient.status,
    detail,
  };
}

function toRepositoryIngredientDetail(seed: SeedIngredientDetail): RepositoryIngredientDetail {
  return {
    ingredient: {
      id: seed.id,
      slug: seed.slug,
      canonicalNameZh: seed.canonicalNameZh,
      canonicalNameEn: seed.canonicalNameEn,
      scientificName: seed.scientificName,
      kind: seed.kind,
      recordRole: seed.recordRole,
      conceptId: seed.conceptId,
      variantId: seed.variantId,
      formCode: seed.formCode,
      processState: seed.processState,
      isSelectable: seed.isSelectable,
      defaultUnitId: seed.defaultUnitId,
      defaultAmountMode: seed.defaultAmountMode,
      defaultPurchaseQuantity: seed.defaultPurchaseQuantity,
      parentIngredientId: seed.conceptId === seed.id ? null : seed.conceptId,
      sourceId: seed.sourceIds[0] ?? null,
      status: seed.status,
      dataVersion: seed.dataVersion,
      reviewedBy: seed.reviewedBy,
      reviewedAt: seed.reviewedAt,
      metadata: {
        legacyIds: seed.legacyIds,
        categoryId: seed.categoryId,
        sourceIds: seed.sourceIds,
        referencePrice: seed.referencePrice,
        seedDefaultAmountMode: seed.defaultAmountMode,
      },
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt,
    },
    aliases: seed.aliases.map(toIngredientAlias),
    categoryIds: [...seed.categoryIds],
    defaultStorageProfileId: seed.defaultStorageProfileId,
    storageProfiles: seed.storageProfiles.map(toIngredientStorageProfile),
    supportedUnitIds: [...seed.supportedUnitIds],
    unitConversions: seed.unitConversions.map((conversion) => toIngredientUnitConversion(seed.id, conversion)),
    nutritionProfiles: [toNutritionProfile(seed.nutritionProfile, seed.externalMappings)],
    assets: seed.imageAssets.map(toIngredientAsset),
    externalMappings: seed.externalMappings.map(toExternalIngredientMapping),
  };
}

function toDataSourceRecord(source: CatalogSource): DataSourceRecord {
  return {
    id: source.id,
    provider: source.provider,
    datasetName: source.datasetName,
    version: source.version,
    sourceUrl: source.sourceUrl,
    license: source.license,
    licenseCode: source.licenseCode,
    licenseUrl: source.licenseUrl,
    sourceType: source.sourceType,
    sourceRevision: source.sourceRevision,
    usageScopes: [...source.usageScopes],
    rightsReviewStatus: source.rightsReviewStatus,
    redistributionStatus: source.redistributionStatus,
    attributionRequired: source.attributionRequired,
    snapshotSha256: source.snapshotSha256,
    importerVersion: source.importerVersion,
    importedAt: source.retrievedAt,
    metadata: {
      jurisdiction: source.jurisdiction,
      retrievedAt: source.retrievedAt,
      reviewedAt: source.reviewedAt,
      reviewStatus: source.reviewStatus,
      notes: source.notes,
    },
  };
}

function toImportBatchRecord(
  batch: IngredientCatalogDocument["importBatches"][number],
): ImportBatchRecord {
  return { ...batch };
}

function toIngredientFormDefinition(
  form: IngredientCatalogDocument["ingredientForms"][number],
): IngredientFormDefinition {
  return { ...form };
}

function toFoodCategory(category: IngredientCatalogDocument["categories"][number]): FoodCategory {
  return {
    id: category.id,
    parentId: category.parentId,
    slug: category.slug,
    nameZh: category.nameZh,
    nameEn: category.nameEn,
    level: category.level,
    sortOrder: category.sortOrder,
  };
}

function toUnitDefinition(unit: CatalogUnit): UnitDefinition {
  return {
    id: unit.id,
    code: unit.code,
    nameZh: unit.nameZh,
    nameEn: unit.nameEn,
    dimension: unit.dimension,
    baseFactor: unit.baseFactor,
  };
}

function toStorageMethod(method: CatalogStorageMethod): StorageMethod {
  return {
    id: method.id,
    code: method.code,
    nameZh: method.nameZh,
    nameEn: method.nameEn,
    temperatureMinC: method.temperatureMinC,
    temperatureMaxC: method.temperatureMaxC,
    requiresDark: method.requiresDark,
    requiresDry: method.requiresDry,
  };
}

function toIngredientAlias(alias: CatalogAlias): IngredientAlias {
  return {
    id: alias.id,
    ingredientId: alias.ingredientId,
    locale: alias.locale,
    regionCode: alias.region,
    alias: alias.alias,
    normalizedAlias: normalizeCatalogLabel(alias.normalizedAlias || alias.alias),
    aliasType: alias.aliasType,
    confidence: alias.confidence,
    sourceId: alias.sourceId,
    reviewStatus: alias.reviewStatus,
    reviewedBy: alias.reviewedBy,
    reviewedAt: alias.reviewedAt,
  };
}

function toIngredientStorageProfile(profile: CatalogStorageProfile): IngredientStorageProfile {
  const recommendedDays = profile.recommendedDays;
  return {
    id: profile.id,
    ingredientId: profile.ingredientId,
    storageMethodId: profile.storageMethodId,
    shelfLifeDays: recommendedDays,
    recommendedMinDays: profile.minDays,
    recommendedMaxDays: profile.maxDays,
    afterOpeningDays: null,
    freshnessWarningDays: recommendedDays === null ? null : Math.max(1, Math.ceil(recommendedDays * 0.2)),
    regionCode: profile.region,
    environmentTags: [...profile.environmentTags],
    foodState: profile.foodState,
    formCode: profile.formCode,
    processState: profile.processState,
    packagingState: profile.packagingState,
    endpoint: profile.endpoint,
    instructions: profile.instructions,
    evidenceKey: profile.evidenceKey,
    sourceId: profile.sourceId,
    confidence: profile.confidence,
    reviewStatus: profile.reviewStatus,
    reviewedBy: profile.reviewedBy,
    reviewedAt: profile.reviewedAt,
  };
}

function toIngredientUnitConversion(
  ingredientId: string,
  conversion: CatalogUnitConversion,
): IngredientUnitConversion {
  return {
    id: conversion.id,
    ingredientId,
    fromUnitId: conversion.fromUnitId,
    toUnitId: conversion.toUnitId,
    factor: conversion.factor,
    sourceId: conversion.sourceId,
    confidence: conversion.reviewStatus === "approved" ? 1 : 0.5,
    reviewStatus: conversion.reviewStatus,
  };
}

function toNutritionProfile(
  profile: CatalogNutritionProfile,
  mappings: CatalogExternalMapping[],
): NutritionProfile {
  const mapping = mappings.find((item) => item.id === profile.externalMappingId) ?? null;
  return {
    id: profile.id,
    ingredientId: profile.ingredientId,
    basisQuantity: profile.basisQuantity,
    basisUnitId: profile.basisUnitId,
    caloriesKcal: profile.caloriesKcal,
    proteinG: profile.proteinG,
    fatG: profile.fatG,
    carbohydrateG: profile.carbohydrateG,
    fiberG: profile.fiberG,
    dataClassification: profile.dataClassification === "unknown"
      ? "not_measured"
      : profile.dataClassification,
    foodState: profile.foodState ?? "unspecified",
    formCode: profile.formCode,
    processState: profile.processState,
    sourceRecordId: profile.sourceRecordId ?? mapping?.externalId ?? null,
    sourceRelease: profile.sourceRelease,
    externalMappingId: profile.externalMappingId,
    matchType: profile.matchType === "exact"
      ? "exact"
      : profile.matchType === "representative"
        ? "representative"
        : "none",
    sourceId: profile.sourceId,
    reviewStatus: profile.reviewStatus,
    reviewedBy: profile.reviewedBy,
    reviewedAt: profile.reviewedAt,
  };
}

function toIngredientAsset(asset: CatalogImageAsset): IngredientAsset {
  const rightsReviewed = asset.licenseStatus === "approved"
    || asset.licenseStatus === "approved_for_prototype";
  return {
    id: asset.id,
    ingredientId: asset.ingredientId,
    assetUri: asset.assetUri,
    assetType: asset.assetType,
    altText: asset.altText,
    backgroundRemoved: false,
    outlineApplied: asset.processingStatus !== "source",
    sourceUrl: asset.sourceUrl,
    license: asset.license,
    attribution: asset.attribution,
    providerAssetId: asset.providerAssetId,
    originalUrl: asset.originalUrl,
    processedUrl: asset.processedUrl,
    licenseCode: asset.licenseCode,
    licenseUrl: asset.licenseUrl,
    licenseStatus: asset.licenseStatus,
    rightsStatus: asset.rightsStatus === "cleared"
      ? "verified"
      : asset.rightsStatus === "rejected"
          ? "restricted"
          : "unknown",
    processingStatus: asset.processingStatus === "source"
      ? "original"
      : asset.processingStatus,
    sourceSha256: asset.sourceSha256,
    processedSha256: asset.processedSha256,
    transformLog: [...asset.transformLog],
    styleConsistency: asset.styleConsistency,
    aiGeneration: asset.aiGeneration ? { ...asset.aiGeneration } : null,
    subjectMatchReviewed: asset.subjectMatchReviewed,
    rightsReviewed: asset.rightsReviewed && rightsReviewed,
    reviewStatus: asset.reviewStatus,
    isPrimary: asset.isPrimary,
  };
}

function toExternalIngredientMapping(mapping: CatalogExternalMapping): ExternalIngredientMapping {
  return {
    id: mapping.id,
    ingredientId: mapping.ingredientId,
    provider: mapping.system,
    externalKey: mapping.externalId,
    externalLabel: mapping.externalName,
    externalVersion: mapping.externalVersion,
    matchType: mapping.matchType,
    mappingLevel: mapping.mappingLevel,
    usageScopes: [...mapping.usageScopes],
    lossiness: [...mapping.lossiness],
    confidence: mapping.confidence,
    sourceId: mapping.sourceId,
    importBatchId: mapping.importBatchId,
    reviewStatus: mapping.reviewStatus,
    reviewedBy: mapping.reviewedBy,
    reviewedAt: mapping.reviewedAt,
    metadata: {
      ...mapping.metadata,
      catalogMatchType: mapping.matchType,
    },
  };
}

function createLegacyIngredientIdMap(ingredients: SeedIngredientDetail[]) {
  const result = new Map<string, string>();
  for (const ingredient of ingredients) {
    for (const legacyId of ingredient.legacyIds) {
      const existing = result.get(legacyId);
      if (existing && existing !== ingredient.id) {
        throw new Error(`Catalog legacy ID is ambiguous: ${legacyId}`);
      }
      result.set(legacyId, ingredient.id);
    }
  }
  return result;
}

type LegacyCatalogReferenceMaps = {
  unitIds: Map<string, string>;
  storageMethodIds: Map<string, string>;
};

function createLegacyCatalogReferenceMaps(document: IngredientCatalogDocument): LegacyCatalogReferenceMaps {
  const unitByCode = new Map(document.units.map((unit) => [unit.code, unit.id]));
  const storageByCode = new Map(document.storageMethods.map((method) => [method.code, method.id]));
  const requireReference = (records: Map<string, string>, code: string, label: string) => {
    const id = records.get(code);
    if (!id) throw new Error(`Catalog is missing reference for ${label}:${code}`);
    return id;
  };
  return {
    unitIds: new Map([
      ["unit-piece", requireReference(unitByCode, "piece", "unit")],
      ["unit-gram", requireReference(unitByCode, "g", "unit")],
    ]),
    storageMethodIds: new Map([
      ["storage-fridge", requireReference(storageByCode, "fridge", "storage")],
      ["storage-freezer", requireReference(storageByCode, "freezer", "storage")],
      ["storage-room", requireReference(storageByCode, "room", "storage")],
      ["storage-seasoning", requireReference(storageByCode, "dry_dark", "storage")],
    ]),
  };
}

async function migrateOperationalIngredientReferences(
  transaction: IDBPTransaction<MiiixIndexedDbSchema, typeof CATALOG_SEED_STORES, "readwrite">,
  legacyIds: Map<string, string>,
  references: LegacyCatalogReferenceMaps,
  ingredientById: Map<string, SeedIngredientDetail>,
) {
  let migrated = 0;

  const lotStore = transaction.objectStore("inventoryLots");
  for (const record of await lotStore.getAll()) {
    const ingredientId = migrateId(record.ingredientId, legacyIds);
    const unitId = migrateId(record.unitId, references.unitIds);
    const storageMethodId = migrateNullableId(record.storageMethodId, references.storageMethodIds);
    const storageLocation = record.storageLocation === "seasoning" ? "dryDark" : record.storageLocation;
    const spec = operationalIngredientSpec(ingredientId, ingredientById, record);
    const originType = record.originType ?? "purchased";
    const derivedFromLotId = record.derivedFromLotId ?? null;
    const changes = Number(ingredientId !== record.ingredientId)
      + Number(unitId !== record.unitId)
      + Number(storageMethodId !== record.storageMethodId)
      + Number(storageLocation !== record.storageLocation)
      + countIngredientSpecChanges(record, spec)
      + Number(record.originType !== originType)
      + Number(record.derivedFromLotId !== derivedFromLotId);
    if (changes > 0) {
      migrated += changes;
      await lotStore.put({
        ...record,
        ingredientId,
        ...spec,
        originType,
        derivedFromLotId,
        unitId,
        storageMethodId,
        storageLocation,
      });
    }
  }

  const transactionStore = transaction.objectStore("inventoryTransactions");
  for (const record of await transactionStore.getAll()) {
    const next = migrateIngredientReferenceTree(record.metadata, legacyIds);
    const unitId = migrateId(record.unitId, references.unitIds);
    const changes = next.count + Number(unitId !== record.unitId);
    if (changes > 0) {
      migrated += changes;
      await transactionStore.put({
        ...record,
        unitId,
        metadata: next.value as typeof record.metadata,
      });
    }
  }

  const recipeIngredientStore = transaction.objectStore("recipeIngredients");
  for (const record of await recipeIngredientStore.getAll()) {
    const ingredientId = migrateId(record.ingredientId, legacyIds);
    const unitId = migrateNullableId(record.unitId, references.unitIds);
    const spec = operationalIngredientSpec(ingredientId, ingredientById, {
      conceptId: record.conceptId,
      variantId: record.variantId,
      formCode: record.requiredFormCode,
      processState: record.requiredProcessState,
    });
    const changes = Number(ingredientId !== record.ingredientId)
      + Number(unitId !== record.unitId)
      + countIngredientSpecChanges({
        conceptId: record.conceptId,
        variantId: record.variantId,
        formCode: record.requiredFormCode,
        processState: record.requiredProcessState,
      }, spec);
    if (changes > 0) {
      migrated += changes;
      await recipeIngredientStore.put({
        ...record,
        ingredientId,
        conceptId: spec.conceptId,
        variantId: spec.variantId,
        requiredFormCode: spec.formCode,
        requiredProcessState: spec.processState,
        unitId,
      });
    }
  }

  const shoppingItemStore = transaction.objectStore("shoppingItems");
  for (const record of await shoppingItemStore.getAll()) {
    const ingredientId = migrateId(record.ingredientId, legacyIds);
    const unitId = migrateId(record.unitId, references.unitIds);
    const spec = operationalIngredientSpec(ingredientId, ingredientById, {
      conceptId: record.conceptId,
      variantId: record.variantId,
      formCode: record.requestedFormCode,
      processState: record.requestedProcessState,
    });
    const changes = Number(ingredientId !== record.ingredientId)
      + Number(unitId !== record.unitId)
      + countIngredientSpecChanges({
        conceptId: record.conceptId,
        variantId: record.variantId,
        formCode: record.requestedFormCode,
        processState: record.requestedProcessState,
      }, spec);
    if (changes > 0) {
      migrated += changes;
      await shoppingItemStore.put({
        ...record,
        ingredientId,
        conceptId: spec.conceptId,
        variantId: spec.variantId,
        requestedFormCode: spec.formCode,
        requestedProcessState: spec.processState,
        unitId,
      });
    }
  }

  const recognitionStore = transaction.objectStore("recognitionCandidates");
  for (const record of await recognitionStore.getAll()) {
    const ingredientId = migrateNullableId(record.ingredientId, legacyIds);
    const correctedIngredientId = migrateNullableId(record.correctedIngredientId, legacyIds);
    const selectedIngredientId = correctedIngredientId ?? ingredientId;
    const spec = selectedIngredientId
      ? operationalIngredientSpec(selectedIngredientId, ingredientById, record)
      : {
          conceptId: record.conceptId ?? null,
          variantId: record.variantId ?? null,
          formCode: record.formCode ?? "unspecified",
          processState: record.processState ?? "unspecified",
        } as const;
    const changes = Number(ingredientId !== record.ingredientId)
      + Number(correctedIngredientId !== record.correctedIngredientId)
      + countIngredientSpecChanges(record, spec);
    if (changes > 0) {
      migrated += changes;
      await recognitionStore.put({
        ...record,
        ingredientId,
        correctedIngredientId,
        conceptId: spec.conceptId,
        variantId: spec.variantId,
        formCode: spec.formCode,
        processState: spec.processState,
      });
    }
  }

  const recommendationRunStore = transaction.objectStore("recommendationRuns");
  for (const record of await recommendationRunStore.getAll()) {
    const next = migrateIds(record.selectedIngredientIds, legacyIds);
    if (next.count > 0) {
      migrated += next.count;
      await recommendationRunStore.put({ ...record, selectedIngredientIds: next.values });
    }
  }

  const recommendationCandidateStore = transaction.objectStore("recommendationCandidates");
  for (const record of await recommendationCandidateStore.getAll()) {
    // This also covers future used/substitution ingredient fields without
    // coupling the seed migration to recommendation ranking internals.
    const next = migrateIngredientReferenceTree(record, legacyIds);
    if (next.count > 0) {
      migrated += next.count;
      await recommendationCandidateStore.put(next.value as typeof record);
    }
  }

  return migrated;
}

type PartialOperationalSpec = Partial<{
  conceptId: string | null;
  variantId: string | null;
  formCode: SeedIngredientDetail["formCode"];
  processState: SeedIngredientDetail["processState"];
}>;

function operationalIngredientSpec(
  ingredientId: string,
  ingredientById: Map<string, SeedIngredientDetail>,
  existing: PartialOperationalSpec,
) {
  const ingredient = ingredientById.get(ingredientId);
  return {
    // Catalog refreshes fill only fields that predate the form model. A lot or
    // recipe may intentionally carry a more specific physical form than its
    // broad catalog record, so an existing value must never be overwritten.
    conceptId: existing.conceptId ?? ingredient?.conceptId ?? ingredientId,
    variantId: existing.variantId !== undefined
      ? existing.variantId
      : ingredient?.variantId ?? null,
    formCode: existing.formCode ?? ingredient?.formCode ?? "unspecified",
    processState: existing.processState ?? ingredient?.processState ?? "unspecified",
  } as const;
}

function countIngredientSpecChanges(
  current: PartialOperationalSpec,
  next: {
    conceptId: string | null;
    variantId: string | null;
    formCode: SeedIngredientDetail["formCode"];
    processState: SeedIngredientDetail["processState"];
  },
) {
  return Number(current.conceptId !== next.conceptId)
    + Number(current.variantId !== next.variantId)
    + Number(current.formCode !== next.formCode)
    + Number(current.processState !== next.processState);
}

const LEGACY_REFERENCE_TREE_KEYS = new Set([
  "ingredientId",
  "ingredientIds",
  "substitutionIngredientId",
  "substitutionIngredientIds",
]);

function migrateIngredientReferenceTree(value: unknown, legacyIds: Map<string, string>, key = ""):
  { value: unknown; count: number } {
  if (typeof value === "string" && LEGACY_REFERENCE_TREE_KEYS.has(key)) {
    const migrated = migrateId(value, legacyIds);
    return { value: migrated, count: Number(migrated !== value) };
  }
  if (Array.isArray(value)) {
    if (LEGACY_REFERENCE_TREE_KEYS.has(key)) {
      let count = 0;
      const values = value.map((item) => {
        if (typeof item !== "string") return item;
        const next = migrateId(item, legacyIds);
        count += Number(next !== item);
        return next;
      });
      return { value: values, count };
    }
    let count = 0;
    const values = value.map((item) => {
      const next = migrateIngredientReferenceTree(item, legacyIds);
      count += next.count;
      return next.value;
    });
    return { value: values, count };
  }
  if (value && typeof value === "object") {
    let count = 0;
    const entries = Object.entries(value).map(([entryKey, item]) => {
      const next = migrateIngredientReferenceTree(item, legacyIds, entryKey);
      count += next.count;
      return [entryKey, next.value];
    });
    return { value: Object.fromEntries(entries), count };
  }
  return { value, count: 0 };
}

function migrateId(id: string, legacyIds: Map<string, string>) {
  return legacyIds.get(id) ?? id;
}

function migrateNullableId(id: string | null, legacyIds: Map<string, string>) {
  return id === null ? null : migrateId(id, legacyIds);
}

function migrateIds(ids: string[], legacyIds: Map<string, string>) {
  let count = 0;
  const values = ids.map((id) => {
    const next = migrateId(id, legacyIds);
    count += Number(next !== id);
    return next;
  });
  return { values, count };
}

function validateSeedBoundary(document: IngredientCatalogDocument) {
  if (!document.catalogVersion.trim()) throw new Error("Catalog version is required");
  if (document.ingredients.length === 0) throw new Error("Catalog must contain ingredients");
  assertUniqueIds("source", document.sources.map((item) => item.id));
  assertUniqueIds("import batch", document.importBatches.map((item) => item.id));
  assertUniqueCodes("ingredient form", document.ingredientForms.map((item) => item.code));
  assertUniqueIds("category", document.categories.map((item) => item.id));
  assertUniqueIds("unit", document.units.map((item) => item.id));
  assertUniqueIds("storage method", document.storageMethods.map((item) => item.id));
  assertUniqueIds("ingredient", document.ingredients.map((item) => item.id));

  const lookupKeys = new Map<string, string>();
  for (const ingredient of document.ingredients) {
    for (const key of toCatalogIngredientRecord(ingredient).approvedAliasKeys) {
      const existing = lookupKeys.get(key);
      if (existing && existing !== ingredient.id) {
        throw new Error(`Approved catalog label is ambiguous: ${key}`);
      }
      lookupKeys.set(key, ingredient.id);
    }
  }
  createLegacyIngredientIdMap(document.ingredients);
}

function assertUniqueIds(label: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id) throw new Error(`Catalog ${label} ID is required`);
    if (seen.has(id)) throw new Error(`Duplicate catalog ${label} ID: ${id}`);
    seen.add(id);
  }
}

function assertUniqueCodes(label: string, codes: string[]) {
  const seen = new Set<string>();
  for (const code of codes) {
    if (!code) throw new Error(`Catalog ${label} code is required`);
    if (seen.has(code)) throw new Error(`Duplicate catalog ${label} code: ${code}`);
    seen.add(code);
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function unique(values: string[]) {
  return [...new Set(values)];
}
