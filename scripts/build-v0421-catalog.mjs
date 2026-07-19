import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIR, "..");
const BASE_CATALOG_PATH = resolve(
  REPOSITORY_ROOT,
  "src/data/catalog/v0.4.2-golden-catalog.json",
);
const EPICURE_INPUT_PATH = resolve(
  REPOSITORY_ROOT,
  "src/data/catalog/imports/epicure-cooc-03edd31.json",
);
const OUTPUT_PATH = resolve(
  REPOSITORY_ROOT,
  "src/data/catalog/v0.4.2.1-golden-catalog.json",
);

const RELEASE_VERSION = "0.4.2.1";
const SCHEMA_VERSION = "1.1.0";
const RELEASED_AT = "2026-07-19T18:00:00+08:00";
const RELEASE_REVIEWER = "Miiix v0.4.2.1 data review";
const EPICURE_SOURCE_ID = "10000000-0000-4000-8000-000000000007";
const EPICURE_BATCH_ID = "b0000000-0000-4000-8000-000000000001";
const GENERAL_PORK_ID = "50000000-0000-4000-8000-000000000006";
const GROUND_PORK_ID = "50000000-0000-4000-8000-000000000007";
const NOODLE_ID = "50000000-0000-4000-8000-000000000026";

const VERIFIED_EPICURE_TOKEN_IDS = new Map([
  ["apple", 54],
  ["beef", 124],
  ["bell_pepper", 128],
  ["carrot", 275],
  ["chicken", 321],
  ["chinese_bayberry", 336],
  ["cucumber", 472],
  ["egg", 543],
  ["eggplant", 552],
  ["fish", 599],
  ["lemon", 904],
  ["lettuce", 911],
  ["light_soy_sauce", 914],
  ["milk", 1014],
  ["pork", 1264],
  ["potato", 1268],
  ["rice", 1347],
  ["salt", 1405],
  ["peach", 1175],
  ["shrimp", 1478],
  ["sugar", 1561],
  ["tofu", 1639],
  ["tomato", 1644],
  ["vegetable_oil", 1688],
]);

const LEGACY_SOURCE_GOVERNANCE = new Map([
  [
    "10000000-0000-4000-8000-000000000001",
    {
      licenseCode: "MIIIX-PROPRIETARY",
      licenseUrl: null,
      sourceType: "curated",
      usageScopes: ["identity", "image"],
      rightsReviewStatus: "approved",
      redistributionStatus: "allowed",
      attributionRequired: false,
      notesSuffix: "Miiix may publish and redistribute this material in Miiix products; this proprietary status does not grant third parties an open-data license.",
    },
  ],
  [
    "10000000-0000-4000-8000-000000000002",
    {
      licenseCode: "UNSPECIFIED-SOURCE-TERMS",
      licenseUrl: null,
      sourceType: "standard",
      usageScopes: ["identity", "nutrition"],
      rightsReviewStatus: "citation_only",
      redistributionStatus: "metadata_only",
      attributionRequired: false,
    },
  ],
  [
    "10000000-0000-4000-8000-000000000003",
    {
      licenseCode: "UNSPECIFIED-SOURCE-TERMS",
      licenseUrl: null,
      sourceType: "guidance",
      usageScopes: ["storage"],
      rightsReviewStatus: "citation_only",
      redistributionStatus: "metadata_only",
      attributionRequired: false,
    },
  ],
  [
    "10000000-0000-4000-8000-000000000004",
    {
      licenseCode: "US-PUBLIC-DOMAIN",
      licenseUrl: null,
      sourceType: "dataset",
      usageScopes: ["identity", "nutrition"],
      rightsReviewStatus: "approved",
      redistributionStatus: "allowed",
      attributionRequired: false,
    },
  ],
  [
    "10000000-0000-4000-8000-000000000005",
    {
      licenseCode: "CC0-1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceType: "dataset",
      usageScopes: ["identity", "nutrition"],
      rightsReviewStatus: "approved",
      redistributionStatus: "allowed",
      attributionRequired: false,
    },
  ],
  [
    "10000000-0000-4000-8000-000000000006",
    {
      licenseCode: "CC0-1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceType: "dataset",
      usageScopes: ["identity", "storage"],
      rightsReviewStatus: "approved",
      redistributionStatus: "allowed",
      attributionRequired: false,
    },
  ],
]);

const INGREDIENT_FORMS = [
  {
    code: "unspecified",
    nameZh: "形态未指定",
    nameEn: "Unspecified form",
    description: "No physical preparation form is asserted for this catalog record.",
    status: "active",
    dataVersion: RELEASE_VERSION,
  },
  {
    code: "whole_piece",
    nameZh: "整块或整只",
    nameEn: "Whole piece",
    description: "The ingredient remains a whole item or a whole retail piece.",
    status: "active",
    dataVersion: RELEASE_VERSION,
  },
  {
    code: "sliced",
    nameZh: "切片",
    nameEn: "Sliced",
    description: "The ingredient has been cut into slices without asserting a cooking state.",
    status: "active",
    dataVersion: RELEASE_VERSION,
  },
  {
    code: "diced",
    nameZh: "切丁",
    nameEn: "Diced",
    description: "The ingredient has been cut into small cubes or dice.",
    status: "active",
    dataVersion: RELEASE_VERSION,
  },
  {
    code: "shredded",
    nameZh: "切丝",
    nameEn: "Shredded",
    description: "The ingredient has been cut or torn into thin strips.",
    status: "active",
    dataVersion: RELEASE_VERSION,
  },
  {
    code: "ground",
    nameZh: "绞碎",
    nameEn: "Ground",
    description: "The ingredient has been minced or mechanically ground; its source concept remains explicit.",
    status: "active",
    dataVersion: RELEASE_VERSION,
  },
];

const LEGACY_MAPPING_LOSSINESS = new Map([
  ["50000000-0000-4000-8000-000000000011", ["variant"]],
  ["50000000-0000-4000-8000-000000000012", ["variant"]],
  ["50000000-0000-4000-8000-000000000013", ["variant"]],
  ["50000000-0000-4000-8000-000000000016", ["variant"]],
  ["50000000-0000-4000-8000-000000000018", ["form"]],
  ["50000000-0000-4000-8000-000000000019", ["form"]],
]);

const [baseCatalog, epicureInput] = await Promise.all([
  readJson(BASE_CATALOG_PATH),
  readJson(EPICURE_INPUT_PATH),
]);

const calculatedRecordsSha256 = sha256Canonical(epicureInput.records);
if (process.argv.includes("--print-records-sha256")) {
  process.stdout.write(`${calculatedRecordsSha256}\n`);
  process.exit(0);
}

assert(
  epicureInput.recordsSha256 === calculatedRecordsSha256,
  `Epicure recordsSha256 mismatch: expected ${epicureInput.recordsSha256}, calculated ${calculatedRecordsSha256}`,
);

validateBaseCatalog(baseCatalog);
validateEpicureInput(epicureInput);

const outputCatalog = buildCatalog(baseCatalog, epicureInput, calculatedRecordsSha256);
validateOutputCatalog(baseCatalog, outputCatalog, epicureInput);

const serializedOutput = `${JSON.stringify(outputCatalog, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const currentOutput = await readFile(OUTPUT_PATH, "utf8").catch(() => null);
  assert(currentOutput !== null, `Generated catalog is missing: ${OUTPUT_PATH}`);
  assert(
    currentOutput === serializedOutput,
    "Generated v0.4.2.1 catalog is stale. Run: node scripts/build-v0421-catalog.mjs",
  );
} else {
  await writeFile(OUTPUT_PATH, serializedOutput, "utf8");
}

const epicureMappings = outputCatalog.ingredients.flatMap((ingredient) =>
  ingredient.externalMappings.filter((mapping) => mapping.system === "Epicure_Cooc"),
);
const approvedEpicureMappings = epicureMappings.filter(
  (mapping) => mapping.reviewStatus === "approved",
).length;
const pendingEpicureMappings = epicureMappings.filter(
  (mapping) => mapping.reviewStatus === "pending",
).length;
process.stdout.write(
  [
    process.argv.includes("--check") ? "Checked" : "Built",
    "v0.4.2.1 catalog",
    `recordsSha256=${calculatedRecordsSha256}`,
    `ingredients=${outputCatalog.ingredients.length}`,
    `epicureMappings=${epicureMappings.length}`,
    `approved=${approvedEpicureMappings}`,
    `pending=${pendingEpicureMappings}`,
  ].join(" ") + "\n",
);

function buildCatalog(base, input, recordsSha256) {
  const sourceById = new Map(base.sources.map((source) => [source.id, source]));
  const governedSources = base.sources.map((source) => governLegacySource(source));
  assert(!sourceById.has(input.source.id), `Epicure source ID already exists: ${input.source.id}`);

  const recordsByIngredientId = new Map();
  for (const record of input.records) {
    const records = recordsByIngredientId.get(record.ingredientId) ?? [];
    records.push(record);
    recordsByIngredientId.set(record.ingredientId, records);
  }

  const ingredients = base.ingredients.map((ingredient) => {
    const spec = ingredientSpec(ingredient);
    const inputRecords = recordsByIngredientId.get(ingredient.id) ?? [];
    const aliases = enrichAliases(ingredient, input.source.id);
    const externalMappings = [
      ...ingredient.externalMappings.map((mapping) =>
        enrichLegacyExternalMapping(mapping, sourceById.get(mapping.sourceId), ingredient.id),
      ),
      ...inputRecords.map((record) => epicureExternalMapping(record, input)),
    ];
    const nextSourceIds = inputRecords.length > 0
      ? unique([...ingredient.sourceIds, input.source.id])
      : [...ingredient.sourceIds];

    return {
      ...ingredient,
      aliases,
      storageProfiles: ingredient.storageProfiles.map((profile) => ({
        ...profile,
        formCode: spec.formCode,
        processState: spec.processState,
      })),
      nutritionProfile: {
        ...ingredient.nutritionProfile,
        formCode: spec.formCode,
        processState: spec.processState,
      },
      externalMappings,
      sourceIds: nextSourceIds,
      dataVersion: RELEASE_VERSION,
      updatedAt: RELEASED_AT,
      reviewedAt: RELEASED_AT,
      reviewedBy: RELEASE_REVIEWER,
      ...spec,
    };
  });

  const acceptedMappingCount = input.records.filter(
    (record) => record.reviewStatus === "approved",
  ).length;
  const pendingMappingCount = input.records.filter(
    (record) => record.reviewStatus === "pending",
  ).length;
  const rejectedRecordCount = input.records.filter(
    (record) => record.reviewStatus === "rejected",
  ).length;

  return {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion: RELEASE_VERSION,
    dataVersion: RELEASE_VERSION,
    publishedAt: RELEASED_AT,
    reviewedAt: RELEASED_AT,
    reviewedBy: RELEASE_REVIEWER,
    sources: [...governedSources, structuredClone(input.source)],
    importBatches: [
      {
        ...structuredClone(input.batch),
        inputRecordCount: input.records.length,
        acceptedMappingCount,
        pendingMappingCount,
        rejectedRecordCount,
        recordsSha256,
      },
    ],
    ingredientForms: structuredClone(INGREDIENT_FORMS),
    units: structuredClone(base.units),
    storageMethods: structuredClone(base.storageMethods),
    categories: structuredClone(base.categories),
    ingredients,
  };
}

function governLegacySource(source) {
  const governance = LEGACY_SOURCE_GOVERNANCE.get(source.id);
  assert(governance, `No conservative governance policy for legacy source ${source.id}`);
  return {
    id: source.id,
    provider: source.provider,
    datasetName: source.datasetName,
    version: source.version,
    sourceUrl: source.sourceUrl,
    license: source.license,
    licenseCode: governance.licenseCode,
    licenseUrl: governance.licenseUrl,
    jurisdiction: source.jurisdiction,
    sourceType: governance.sourceType,
    sourceRevision: source.version,
    usageScopes: governance.usageScopes,
    rightsReviewStatus: governance.rightsReviewStatus,
    redistributionStatus: governance.redistributionStatus,
    attributionRequired: governance.attributionRequired,
    snapshotSha256: null,
    importerVersion: null,
    retrievedAt: source.retrievedAt,
    reviewedAt: RELEASED_AT,
    reviewStatus: source.reviewStatus,
    notes: [source.notes, governance.notesSuffix].filter(Boolean).join(" "),
  };
}

function ingredientSpec(ingredient) {
  if (ingredient.id === GROUND_PORK_ID) {
    return {
      recordRole: "form_projection",
      conceptId: GENERAL_PORK_ID,
      variantId: null,
      formCode: "ground",
      processState: "raw",
      isSelectable: true,
    };
  }

  let processState = "processed";
  if (ingredient.kind === "raw") processState = "raw";
  if (ingredient.id === "50000000-0000-4000-8000-000000000025") processState = "cooked";
  return {
    recordRole: "concept",
    conceptId: ingredient.id,
    variantId: null,
    formCode: "unspecified",
    processState,
    isSelectable: true,
  };
}

function enrichAliases(ingredient, epicureSourceId) {
  const aliases = ingredient.aliases.map((alias) => {
    if (
      ingredient.id === GROUND_PORK_ID
      && ["肉末", "肉沫", "猪肉馅"].includes(alias.alias)
    ) {
      return {
        ...alias,
        confidence: alias.alias === "猪肉馅" ? 0.6 : 0.4,
        reviewStatus: "pending",
        reviewedAt: RELEASED_AT,
        reviewedBy: RELEASE_REVIEWER,
      };
    }
    return alias;
  });

  if (ingredient.id === GENERAL_PORK_ID) {
    aliases.push(aliasRecord({
      id: "60000000-0000-4000-8000-000000000603",
      ingredientId: GENERAL_PORK_ID,
      alias: "pork",
      aliasType: "external_model",
      locale: "en",
      region: null,
      sourceId: epicureSourceId,
      confidence: 1,
      reviewStatus: "approved",
    }));
  }

  if (ingredient.id === GROUND_PORK_ID) {
    aliases.push(
      aliasRecord({
        id: "60000000-0000-4000-8000-000000000705",
        ingredientId: GROUND_PORK_ID,
        alias: "ground pork",
        aliasType: "translation",
        locale: "en",
        region: null,
        sourceId: "10000000-0000-4000-8000-000000000001",
        confidence: 1,
        reviewStatus: "approved",
      }),
      aliasRecord({
        id: "60000000-0000-4000-8000-000000000706",
        ingredientId: GROUND_PORK_ID,
        alias: "minced pork",
        aliasType: "translation",
        locale: "en",
        region: null,
        sourceId: "10000000-0000-4000-8000-000000000001",
        confidence: 1,
        reviewStatus: "approved",
      }),
      aliasRecord({
        id: "60000000-0000-4000-8000-000000000707",
        ingredientId: GROUND_PORK_ID,
        alias: "pork mince",
        aliasType: "translation",
        locale: "en",
        region: null,
        sourceId: "10000000-0000-4000-8000-000000000001",
        confidence: 1,
        reviewStatus: "approved",
      }),
      aliasRecord({
        id: "60000000-0000-4000-8000-000000000708",
        ingredientId: GROUND_PORK_ID,
        alias: "猪肉糜",
        aliasType: "common",
        locale: "zh-CN",
        region: null,
        sourceId: "10000000-0000-4000-8000-000000000001",
        confidence: 1,
        reviewStatus: "approved",
      }),
      aliasRecord({
        id: "60000000-0000-4000-8000-000000000709",
        ingredientId: GROUND_PORK_ID,
        alias: "猪绞肉",
        aliasType: "regional",
        locale: "zh-TW",
        region: "TW",
        sourceId: "10000000-0000-4000-8000-000000000001",
        confidence: 0.95,
        reviewStatus: "approved",
      }),
      aliasRecord({
        id: "60000000-0000-4000-8000-000000000710",
        ingredientId: GROUND_PORK_ID,
        alias: "肉糜",
        aliasType: "common",
        locale: "zh-CN",
        region: null,
        sourceId: "10000000-0000-4000-8000-000000000001",
        confidence: 0.4,
        reviewStatus: "pending",
      }),
    );
  }

  return aliases;
}

function aliasRecord({
  id,
  ingredientId,
  alias,
  aliasType,
  locale,
  region,
  sourceId,
  confidence,
  reviewStatus,
}) {
  return {
    id,
    ingredientId,
    alias,
    normalizedAlias: normalizeLabel(alias, locale),
    aliasType,
    locale,
    region,
    sourceId,
    confidence,
    reviewStatus,
    reviewedAt: RELEASED_AT,
    reviewedBy: RELEASE_REVIEWER,
  };
}

function enrichLegacyExternalMapping(mapping, source, ingredientId) {
  assert(source, `Legacy external mapping ${mapping.id} references an unknown source`);
  const lossiness = mapping.matchType === "exact"
    ? []
    : LEGACY_MAPPING_LOSSINESS.get(ingredientId) ?? ["variant"];
  return {
    id: mapping.id,
    ingredientId: mapping.ingredientId,
    system: mapping.system,
    externalId: mapping.externalId,
    externalName: mapping.externalName,
    externalVersion: source.version,
    sourceId: mapping.sourceId,
    importBatchId: null,
    matchType: mapping.matchType,
    mappingLevel: "record",
    usageScopes: ["identity", "nutrition"],
    lossiness,
    confidence: mapping.matchType === "exact" ? 1 : 0.65,
    reviewStatus: mapping.reviewStatus,
    reviewedAt: mapping.reviewedAt,
    reviewedBy: mapping.reviewedBy,
    metadata: {
      provenance: "v0.4.2_manual_record_review",
      sourceRecordId: mapping.externalId,
    },
  };
}

function epicureExternalMapping(record, input) {
  const ingredientSuffix = record.ingredientId.slice(-12);
  return {
    id: `b1000000-0000-4000-8000-${ingredientSuffix}`,
    ingredientId: record.ingredientId,
    system: input.mappingSystem,
    externalId: String(record.tokenId),
    externalName: record.token,
    externalVersion: input.source.sourceRevision,
    sourceId: input.source.id,
    importBatchId: input.batch.id,
    matchType: record.matchType,
    mappingLevel: record.mappingLevel,
    usageScopes: [...record.usageScopes],
    lossiness: [...record.lossiness],
    confidence: record.confidence,
    reviewStatus: record.reviewStatus,
    reviewedAt: input.batch.reviewedAt,
    reviewedBy: input.batch.reviewedBy,
    metadata: {
      token: record.token,
      tokenId: record.tokenId,
      tokenVerification: "pinned_vocabulary_revision",
      relationDirection: "external_token_to_catalog_record",
      conceptFormInheritance: record.token === "pork"
        ? {
            appliesToFormProjections: true,
            addedLossiness: ["form"],
          }
        : null,
    },
  };
}

function validateBaseCatalog(base) {
  assert(base.catalogVersion === "0.4.2", "Builder base must be the v0.4.2 golden catalog");
  assert(base.ingredients.length === 30, "Builder base must contain exactly 30 ingredients");
  assert(base.sources.length === 6, "Builder expects the six reviewed v0.4.2 source records");
  assert(
    new Set(base.ingredients.map((ingredient) => ingredient.id)).size === 30,
    "Builder base ingredient IDs must be unique",
  );
}

function validateEpicureInput(input) {
  assert(input.schemaVersion === "1.0.0", "Unsupported Epicure input schema version");
  assert(input.mappingSystem === "Epicure_Cooc", "Unexpected Epicure mapping system");
  assert(input.source.id === EPICURE_SOURCE_ID, "Unexpected Epicure source ID");
  assert(input.source.sourceRevision === "03edd31", "Epicure source revision must be 03edd31");
  assert(input.source.version === input.source.sourceRevision, "Epicure version and revision must match");
  assert(input.source.licenseCode === "CC-BY-4.0", "Epicure artifact license must be CC-BY-4.0");
  assert(input.source.rightsReviewStatus === "review_required", "Epicure rights review must remain required");
  assert(
    input.source.redistributionStatus === "attribution_required",
    "Epicure artifact redistribution must require attribution",
  );
  assert(input.source.attributionRequired === true, "Epicure attribution must remain required");
  assert(
    sameArray(input.source.usageScopes, ["identity", "recommendation"]),
    "Epicure source may only be scoped to identity and recommendation",
  );
  assert(
    input.source.notes.toLowerCase().includes("recipe corpus"),
    "Epicure source notes must preserve the recipe-corpus license boundary",
  );
  assert(input.batch.id === EPICURE_BATCH_ID, "Unexpected Epicure import batch ID");
  assert(input.batch.sourceId === input.source.id, "Epicure batch source must match its source record");
  assert(input.batch.sourceRevision === input.source.sourceRevision, "Epicure batch revision mismatch");
  assert(input.batch.status === "published", "Epicure mapping batch must be published");
  assert(input.records.length === 28, `Expected 28 mapping rows, found ${input.records.length}`);

  const seenPairs = new Set();
  const seenTokens = new Set();
  for (const record of input.records) {
    const verifiedTokenId = VERIFIED_EPICURE_TOKEN_IDS.get(record.token);
    assert(verifiedTokenId !== undefined, `Unverified Epicure token: ${record.token}`);
    assert(verifiedTokenId === record.tokenId, `Wrong token ID for ${record.token}`);
    assert(record.ingredientId !== GROUND_PORK_ID, "Ground pork must inherit the pork concept mapping");
    assert(record.ingredientId !== NOODLE_ID, "No verified Epicure noodle token exists in this input");
    assert(record.mappingLevel === "concept", "Epicure mappings must remain concept-level");
    assert(
      sameArray(record.usageScopes, ["identity", "recommendation"]),
      `Epicure mapping ${record.token}/${record.ingredientId} has an invalid usage scope`,
    );
    assert(record.confidence >= 0 && record.confidence <= 1, "Mapping confidence must be 0..1");
    if (record.matchType !== "exact" || record.lossiness.length > 0) {
      assert(
        record.reviewStatus === "pending",
        `Lossy or non-exact Epicure mapping must remain pending: ${record.token}/${record.ingredientId}`,
      );
    }
    const pair = `${record.tokenId}:${record.ingredientId}`;
    assert(!seenPairs.has(pair), `Duplicate Epicure mapping input row: ${pair}`);
    seenPairs.add(pair);
    seenTokens.add(record.token);
  }

  assert(seenTokens.size === VERIFIED_EPICURE_TOKEN_IDS.size, "Epicure token set is incomplete");
  for (const token of VERIFIED_EPICURE_TOKEN_IDS.keys()) {
    assert(seenTokens.has(token), `Missing verified Epicure token: ${token}`);
  }

  const chickenRecords = input.records.filter((record) => record.token === "chicken");
  assert(chickenRecords.length === 4, "Chicken token must remain a pending broader mapping to four legacy cuts");
  assert(
    chickenRecords.every(
      (record) => record.matchType === "broader"
        && record.reviewStatus === "pending"
        && sameArray(record.lossiness, ["variant"]),
    ),
    "Chicken mappings must remain broader, pending, and variant-lossy",
  );
  const riceRecords = input.records.filter((record) => record.token === "rice");
  assert(riceRecords.length === 2, "Rice token must retain raw/cooked ambiguity");
  assert(
    riceRecords.every(
      (record) => record.matchType === "representative"
        && record.reviewStatus === "pending"
        && sameArray(record.lossiness, ["process_state"]),
    ),
    "Rice mappings must remain representative, pending, and process-state-lossy",
  );
}

function validateOutputCatalog(base, output, input) {
  assert(output.schemaVersion === SCHEMA_VERSION, "Generated schema version mismatch");
  assert(output.catalogVersion === RELEASE_VERSION, "Generated catalog version mismatch");
  assert(output.dataVersion === RELEASE_VERSION, "Generated data version mismatch");
  assert(output.sources.length === 7, "Generated catalog must contain seven sources");
  assert(output.importBatches.length === 1, "Generated catalog must contain one import batch");
  assert(output.ingredientForms.length === 6, "Generated catalog must contain six ingredient forms");
  assert(output.ingredients.length === 30, "Generated catalog must preserve the 30-item golden set");
  assert(
    JSON.stringify(output.ingredients.map((ingredient) => ingredient.id))
      === JSON.stringify(base.ingredients.map((ingredient) => ingredient.id)),
    "Generated catalog changed a stable ingredient UUID or ingredient order",
  );
  assert(
    output.sources.every((source) =>
      source.licenseCode
      && source.sourceRevision
      && source.sourceType
      && source.rightsReviewStatus
      && source.redistributionStatus
      && Array.isArray(source.usageScopes)),
    "Every source must have explicit governance fields",
  );

  const ingredientById = new Map(output.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  for (const ingredient of output.ingredients) {
    assert(ingredient.isSelectable === true, `${ingredient.canonicalNameZh} must remain selectable`);
    assert(ingredient.variantId === null, `${ingredient.canonicalNameZh} must not invent a variant ID`);
    if (ingredient.id === GROUND_PORK_ID) continue;
    assert(ingredient.recordRole === "concept", `${ingredient.canonicalNameZh} must remain a concept record`);
    assert(ingredient.conceptId === ingredient.id, `${ingredient.canonicalNameZh} conceptId must be self`);
    assert(ingredient.formCode === "unspecified", `${ingredient.canonicalNameZh} form must remain unspecified`);
  }

  const generalPork = ingredientById.get(GENERAL_PORK_ID);
  const groundPork = ingredientById.get(GROUND_PORK_ID);
  assert(generalPork, "General pork record is missing");
  assert(groundPork, "Ground pork record is missing");
  assert(
    generalPork.aliases.some((alias) => alias.alias === "pork" && alias.reviewStatus === "approved"),
    "Generic English pork must resolve to the general pork concept",
  );
  assert(
    groundPork.recordRole === "form_projection"
      && groundPork.conceptId === GENERAL_PORK_ID
      && groundPork.variantId === null
      && groundPork.formCode === "ground"
      && groundPork.processState === "raw",
    "Ground pork must be a raw ground form projection of the general pork concept",
  );
  assert(
    !groundPork.externalMappings.some((mapping) => mapping.system === "Epicure_Cooc"),
    "Ground pork must not invent a direct Epicure token",
  );
  assert(
    generalPork.externalMappings.some(
      (mapping) => mapping.system === "Epicure_Cooc"
        && mapping.externalId === "1264"
        && mapping.externalName === "pork",
    ),
    "General pork must own the verified Epicure pork token",
  );
  for (const alias of ["肉末", "肉糜", "肉沫", "猪肉馅"]) {
    assert(
      groundPork.aliases.some(
        (candidate) => candidate.alias === alias && candidate.reviewStatus === "pending",
      ),
      `${alias} must remain pending because its ingredient/form meaning is not exact`,
    );
  }
  for (const alias of ["猪肉末", "猪肉糜", "猪绞肉", "ground pork", "minced pork", "pork mince"]) {
    assert(
      groundPork.aliases.some(
        (candidate) => candidate.alias === alias && candidate.reviewStatus === "approved",
      ),
      `${alias} must be an approved ground-pork alias`,
    );
  }

  const allMappings = output.ingredients.flatMap((ingredient) => ingredient.externalMappings);
  assert(
    new Set(allMappings.map((mapping) => mapping.id)).size === allMappings.length,
    "Generated external mapping IDs must be unique",
  );
  const epicureMappings = allMappings.filter((mapping) => mapping.system === "Epicure_Cooc");
  assert(epicureMappings.length === input.records.length, "Every Epicure input row must produce one mapping");
  assert(
    epicureMappings.every(
      (mapping) => mapping.sourceId === EPICURE_SOURCE_ID
        && mapping.importBatchId === EPICURE_BATCH_ID
        && mapping.externalVersion === "03edd31"
        && mapping.mappingLevel === "concept"
        && sameArray(mapping.usageScopes, ["identity", "recommendation"]),
    ),
    "Generated Epicure mapping provenance is incomplete",
  );

  const batch = output.importBatches[0];
  assert(batch.inputRecordCount === 28, "Published batch record count mismatch");
  assert(batch.acceptedMappingCount === 20, "Published batch approved mapping count mismatch");
  assert(batch.pendingMappingCount === 8, "Published batch pending mapping count mismatch");
  assert(batch.rejectedRecordCount === 0, "Published batch must not hide rejected input rows");
  assert(batch.recordsSha256 === input.recordsSha256, "Published batch hash must match the input pack");
}

function normalizeLabel(value, locale = "zh-CN") {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase(locale)
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256Canonical(value) {
  return createHash("sha256").update(stableSerialize(value), "utf8").digest("hex");
}

function sameArray(left, right) {
  return Array.isArray(left)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function unique(values) {
  return [...new Set(values)];
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
