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

export type DataSourceRecord = {
  id: EntityId;
  provider: string;
  datasetName: string;
  version: string;
  sourceUrl: string | null;
  license: string | null;
  importedAt: ISODateTime;
  metadata: Record<string, JsonValue>;
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
  kind: IngredientKind;
  defaultUnitId: EntityId | null;
  parentIngredientId: EntityId | null;
  sourceId: EntityId | null;
  status: IngredientStatus;
  metadata: Record<string, JsonValue>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type IngredientAlias = {
  id: EntityId;
  ingredientId: EntityId;
  locale: string;
  alias: string;
  normalizedAlias: string;
  aliasType: "common" | "regional" | "retail" | "ocr" | "translation";
  confidence: number;
  reviewStatus: ReviewStatus;
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
  shelfLifeDays: number;
  afterOpeningDays: number | null;
  freshnessWarningDays: number | null;
  instructions: string | null;
  sourceId: EntityId | null;
  confidence: number;
  reviewStatus: ReviewStatus;
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
  sourceId: EntityId | null;
  reviewStatus: ReviewStatus;
};

export type IngredientAsset = {
  id: EntityId;
  ingredientId: EntityId;
  assetUri: string;
  assetType: "source_photo" | "cutout" | "thumbnail";
  backgroundRemoved: boolean;
  outlineApplied: boolean;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
  reviewStatus: ReviewStatus;
  isPrimary: boolean;
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
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type RecipeIngredientLine = {
  id: EntityId;
  recipeId: EntityId;
  ingredientId: EntityId;
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
