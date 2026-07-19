export type EntityId = string;
export type ISODate = string;
export type ISODateTime = string;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ReviewStatus = "pending" | "approved" | "rejected";
export type IngredientStatus = "draft" | "active" | "archived";
export type IngredientKind = "raw" | "processed" | "condiment" | "beverage" | "dish_component";
export type UnitDimension = "count" | "mass" | "volume" | "package";
export type IngredientFormCode =
  | "unspecified"
  | "whole_piece"
  | "sliced"
  | "diced"
  | "shredded"
  | "ground";
export type IngredientProcessState = "unspecified" | "raw" | "cooked" | "processed";
export type IngredientRecordRole = "concept" | "variant" | "form_projection";
export type IngredientSpec = {
  conceptId: EntityId;
  variantId: EntityId | null;
  formCode: IngredientFormCode;
  processState: IngredientProcessState;
};

export type DataSourceRecord = {
  id: EntityId;
  provider: string;
  datasetName: string;
  version: string;
  sourceUrl: string | null;
  license: string | null;
  licenseCode: string;
  licenseUrl: string | null;
  sourceType: "curated" | "standard" | "guidance" | "dataset" | "model";
  sourceRevision: string;
  usageScopes: Array<"identity" | "nutrition" | "storage" | "recommendation" | "image">;
  rightsReviewStatus: "approved" | "citation_only" | "review_required" | "restricted";
  redistributionStatus: "allowed" | "attribution_required" | "metadata_only" | "prohibited";
  attributionRequired: boolean;
  snapshotSha256: string | null;
  importerVersion: string | null;
  importedAt: ISODateTime;
  metadata: Record<string, JsonValue>;
};

export type ImportBatchRecord = {
  id: EntityId;
  sourceId: EntityId;
  sourceRevision: string;
  importerVersion: string;
  importedAt: ISODateTime;
  reviewedAt: ISODateTime;
  reviewedBy: string;
  inputRecordCount: number;
  acceptedMappingCount: number;
  pendingMappingCount: number;
  rejectedRecordCount: number;
  recordsSha256: string;
  status: "staged" | "published" | "rejected";
  notes: string | null;
};

export type IngredientFormDefinition = {
  code: IngredientFormCode;
  nameZh: string;
  nameEn: string;
  description: string;
  status: "active" | "archived";
  dataVersion: string;
};

export type UnitDefinition = {
  id: EntityId;
  code: string;
  nameZh: string;
  nameEn: string | null;
  dimension: UnitDimension;
  baseFactor: number | null;
};

export type FoodCategory = {
  id: EntityId;
  parentId: EntityId | null;
  slug: string;
  nameZh: string;
  nameEn: string | null;
  level: 1 | 2 | 3;
  sortOrder: number;
};

export type CanonicalIngredient = {
  id: EntityId;
  slug: string;
  canonicalNameZh: string;
  canonicalNameEn: string | null;
  scientificName: string | null;
  kind: IngredientKind;
  recordRole: IngredientRecordRole;
  conceptId: EntityId;
  variantId: EntityId | null;
  formCode: IngredientFormCode;
  processState: IngredientProcessState;
  isSelectable: boolean;
  defaultUnitId: EntityId | null;
  defaultAmountMode: UnitDimension;
  defaultPurchaseQuantity: number | null;
  parentIngredientId: EntityId | null;
  sourceId: EntityId | null;
  status: IngredientStatus;
  dataVersion: string;
  reviewedBy: string;
  reviewedAt: ISODateTime;
  metadata: Record<string, JsonValue>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type IngredientAlias = {
  id: EntityId;
  ingredientId: EntityId;
  locale: string;
  regionCode: string | null;
  alias: string;
  normalizedAlias: string;
  aliasType: "common" | "regional" | "retail" | "ocr" | "translation" | "external_model" | "recipe_phrase";
  confidence: number;
  sourceId: EntityId | null;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: ISODateTime | null;
};

export type StorageMethod = {
  id: EntityId;
  code: string;
  nameZh: string;
  nameEn: string | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  requiresDark: boolean;
  requiresDry: boolean;
};

export type IngredientStorageProfile = {
  id: EntityId;
  ingredientId: EntityId;
  storageMethodId: EntityId;
  shelfLifeDays: number | null;
  recommendedMinDays: number | null;
  recommendedMaxDays: number | null;
  afterOpeningDays: number | null;
  freshnessWarningDays: number | null;
  regionCode: string;
  environmentTags: string[];
  foodState: string;
  formCode: IngredientFormCode;
  processState: IngredientProcessState;
  packagingState: string;
  endpoint: "safety" | "quality" | "package_label";
  instructions: string | null;
  evidenceKey: string | null;
  sourceId: EntityId | null;
  confidence: number;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: ISODateTime | null;
};

export type NutritionProfile = {
  id: EntityId;
  ingredientId: EntityId;
  basisQuantity: number;
  basisUnitId: EntityId;
  caloriesKcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbohydrateG: number | null;
  fiberG: number | null;
  dataClassification: "analytical" | "calculated" | "borrowed" | "estimated" | "not_measured";
  foodState: string;
  formCode: IngredientFormCode;
  processState: IngredientProcessState;
  sourceRecordId: string | null;
  sourceRelease: string | null;
  externalMappingId: EntityId | null;
  matchType: "exact" | "representative" | "none";
  sourceId: EntityId | null;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: ISODateTime | null;
};

export type IngredientUnitConversion = {
  id: EntityId;
  ingredientId: EntityId;
  fromUnitId: EntityId;
  toUnitId: EntityId;
  factor: number;
  sourceId: EntityId | null;
  confidence: number;
  reviewStatus: ReviewStatus;
};

export type IngredientAsset = {
  id: EntityId;
  ingredientId: EntityId;
  assetUri: string;
  assetType: "source_photo" | "cutout" | "thumbnail";
  altText: string;
  backgroundRemoved: boolean;
  outlineApplied: boolean;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
  providerAssetId: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  licenseCode: string;
  licenseUrl: string | null;
  licenseStatus: "approved" | "approved_for_prototype" | "pending" | "rejected";
  rightsStatus: "unknown" | "research_only" | "verified" | "restricted";
  processingStatus: "original" | "pending" | "processed" | "failed" | "placeholder";
  sourceSha256: string | null;
  processedSha256: string | null;
  transformLog: string[];
  styleConsistency: "prototype_placeholder" | "consistent" | "needs_review";
  aiGeneration: { model: string; prompt: string } | null;
  subjectMatchReviewed: boolean;
  rightsReviewed: boolean;
  reviewStatus: ReviewStatus;
  isPrimary: boolean;
};

export type ExternalIngredientMapping = {
  id: EntityId;
  ingredientId: EntityId;
  provider: string;
  externalKey: string;
  externalLabel: string | null;
  externalVersion: string;
  matchType: "exact" | "representative" | "broader" | "narrower" | "related";
  mappingLevel: "record" | "concept";
  usageScopes: Array<"identity" | "nutrition" | "storage" | "recommendation" | "image">;
  lossiness: Array<"form" | "variant" | "process_state" | "species" | "product_type">;
  confidence: number;
  sourceId: EntityId | null;
  importBatchId: EntityId | null;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: ISODateTime | null;
  metadata: Record<string, JsonValue>;
};

export type KitchenToolDefinition = {
  id: EntityId;
  code: string;
  nameZh: string;
  nameEn: string | null;
  description: string | null;
  assetUri: string | null;
  status: IngredientStatus;
};

export type RecipeDocument = {
  id: EntityId;
  slug: string | null;
  title: string;
  cuisineCode: string | null;
  difficulty: "easy" | "medium" | "hard";
  minutes: number;
  servings: number;
  caloriesKcal: number | null;
  imageUri: string | null;
  sourceType: "curated" | "generated" | "imported";
  status: "draft" | "published" | "archived";
  metadata: Record<string, JsonValue>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type RecipeIngredientLine = {
  id: EntityId;
  recipeId: EntityId;
  ingredientId: EntityId;
  conceptId: EntityId;
  variantId: EntityId | null;
  requiredFormCode: IngredientFormCode;
  requiredProcessState: IngredientProcessState;
  role: "main" | "seasoning" | "optional" | "garnish";
  quantity: number | null;
  unitId: EntityId | null;
  preparation: string | null;
  substitutionGroup: string | null;
  sortOrder: number;
};

export type RecipeStepRecord = {
  id: EntityId;
  recipeId: EntityId;
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  mediaUri: string | null;
};

export type InventoryLot = {
  id: EntityId;
  userId: EntityId;
  ingredientId: EntityId;
  conceptId: EntityId;
  variantId: EntityId | null;
  formCode: IngredientFormCode;
  processState: IngredientProcessState;
  originType: "purchased" | "user_transformed" | "imported" | "unknown";
  derivedFromLotId: EntityId | null;
  quantityInitial: number;
  quantityRemaining: number;
  unitId: EntityId;
  storageMethodId: EntityId | null;
  storageLocation: string | null;
  purchasedAt: ISODateTime | null;
  openedAt: ISODateTime | null;
  expiresAt: ISODateTime | null;
  priceAmount: number | null;
  currency: string;
  recognitionJobId: EntityId | null;
  sourceType: "manual" | "photo" | "online_screenshot" | "receipt" | "import";
  note: string | null;
  customTags: string[];
  status: "available" | "consumed" | "wasted" | "discarded";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type InventoryTransaction = {
  id: EntityId;
  userId: EntityId;
  inventoryLotId: EntityId;
  cookingSessionId: EntityId | null;
  type: "purchase" | "consume" | "waste" | "adjust_in" | "adjust_out";
  quantity: number;
  unitId: EntityId;
  idempotencyKey: string;
  occurredAt: ISODateTime;
  note: string | null;
  metadata: Record<string, JsonValue>;
};

export type RecognitionJob = {
  id: EntityId;
  userId: EntityId;
  inputType: "photo" | "online_screenshot" | "receipt" | "manual";
  inputAssetUri: string | null;
  provider: string | null;
  modelVersion: string | null;
  status: "queued" | "processing" | "needs_review" | "completed" | "failed";
  rawOutput: Record<string, JsonValue>;
  errorMessage: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type RecognitionCandidate = {
  id: EntityId;
  jobId: EntityId;
  rawLabel: string;
  ingredientId: EntityId | null;
  correctedIngredientId: EntityId | null;
  conceptId: EntityId | null;
  variantId: EntityId | null;
  formCode: IngredientFormCode;
  processState: IngredientProcessState;
  confidence: number | null;
  status: "pending" | "accepted" | "corrected" | "ignored";
  sortOrder: number;
  metadata: Record<string, JsonValue>;
};

export type MealPlanRecord = {
  id: EntityId;
  userId: EntityId;
  plannedDate: ISODate;
  source: string;
  status: "planned" | "cooking" | "completed" | "cancelled";
  recipeIds: EntityId[];
  metadata: Record<string, JsonValue>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type ShoppingListRecord = {
  id: EntityId;
  userId: EntityId;
  mealPlanId: EntityId | null;
  title: string;
  status: "active" | "completed" | "archived";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type ShoppingListItemRecord = {
  id: EntityId;
  shoppingListId: EntityId;
  ingredientId: EntityId;
  conceptId: EntityId;
  variantId: EntityId | null;
  requestedFormCode: IngredientFormCode;
  requestedProcessState: IngredientProcessState;
  requiredQuantity: number;
  ownedQuantity: number;
  unitId: EntityId;
  reason: string | null;
  status: "needed" | "in_cart" | "purchased" | "skipped";
};

export type CookingSessionRecord = {
  id: EntityId;
  userId: EntityId;
  recipeId: EntityId;
  mealPlanItemId: EntityId | null;
  idempotencyKey: string;
  status: "started" | "completed" | "abandoned";
  startedAt: ISODateTime;
  completedAt: ISODateTime | null;
  rating: number | null;
  photoAssetUri: string | null;
  note: string | null;
  metadata: Record<string, JsonValue>;
};

export type RecommendationMode = "reliable" | "creative" | "substitute";

export type RecommendationRun = {
  id: EntityId;
  userId: EntityId;
  mode: RecommendationMode;
  status: "started" | "completed" | "failed";
  selectedIngredientIds: EntityId[];
  selectedInventoryLotIds: EntityId[];
  selectedToolIds: EntityId[];
  preferenceSnapshot: Record<string, JsonValue>;
  modelSnapshot: Record<string, JsonValue>;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
};

export type RecommendationCandidateRecord = {
  id: EntityId;
  runId: EntityId;
  rank: number;
  recipeId: EntityId | null;
  ingredientIds: EntityId[];
  totalScore: number;
  scoreBreakdown: Record<string, JsonValue>;
  explanation: string;
  selected: boolean;
};
