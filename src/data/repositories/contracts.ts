import type {
  CanonicalIngredient,
  CookingSessionRecord,
  EntityId,
  FoodCategory,
  IngredientAlias,
  IngredientAsset,
  IngredientStorageProfile,
  IngredientUnitConversion,
  InventoryLot,
  InventoryTransaction,
  ISODate,
  ISODateTime,
  JsonValue,
  KitchenToolDefinition,
  MealPlanRecord,
  NutritionProfile,
  ExternalIngredientMapping,
  RecognitionCandidate,
  RecognitionJob,
  RecipeDocument,
  RecipeIngredientLine,
  RecipeStepRecord,
  RecommendationCandidateRecord,
  RecommendationMode,
  RecommendationRun,
  ShoppingListRecord,
  ShoppingListItemRecord,
  StorageMethod,
  UnitDefinition,
} from "../../domain/persistence";

export type IngredientQuery = {
  text?: string;
  categoryId?: EntityId;
  storageMethodId?: EntityId;
  kind?: CanonicalIngredient["kind"];
  status?: CanonicalIngredient["status"];
  limit?: number;
};

export type IngredientDetail = {
  ingredient: CanonicalIngredient;
  aliases: IngredientAlias[];
  categoryIds: EntityId[];
  defaultStorageProfileId: EntityId | null;
  storageProfiles: IngredientStorageProfile[];
  supportedUnitIds: EntityId[];
  unitConversions: IngredientUnitConversion[];
  nutritionProfiles: NutritionProfile[];
  assets: IngredientAsset[];
  externalMappings: ExternalIngredientMapping[];
};

export type CreateInventoryLotInput = Omit<
  InventoryLot,
  "id" | "quantityRemaining" | "status" | "createdAt" | "updatedAt"
>;

export type UpdateInventoryLotInput = Partial<
  Pick<
    InventoryLot,
    | "quantityRemaining"
    | "storageMethodId"
    | "storageLocation"
    | "openedAt"
    | "expiresAt"
    | "note"
    | "customTags"
    | "status"
  >
>;

export type CreateInventoryTransactionInput = Omit<InventoryTransaction, "id" | "occurredAt" | "type"> & {
  type: Exclude<InventoryTransaction["type"], "purchase">;
  occurredAt?: ISODateTime;
};

export type RecipeBundle = {
  recipe: RecipeDocument;
  ingredients: RecipeIngredientLine[];
  steps: RecipeStepRecord[];
  toolIds: EntityId[];
};

export type SaveRecipeInput = Omit<RecipeDocument, "id" | "createdAt" | "updatedAt"> & {
  id?: EntityId;
  ingredients: Omit<RecipeIngredientLine, "id" | "recipeId">[];
  steps: Omit<RecipeStepRecord, "id" | "recipeId">[];
  toolIds: EntityId[];
};

export type CreateMealPlanInput = {
  userId: EntityId;
  plannedDate: ISODate;
  source: string;
  recipeIds: EntityId[];
  metadata?: MealPlanRecord["metadata"];
};

export type CreateRecognitionJobInput = Pick<
  RecognitionJob,
  "userId" | "inputType" | "inputAssetUri" | "provider" | "modelVersion"
>;

export type SaveRecognitionCandidateInput = Omit<RecognitionCandidate, "id" | "jobId">;

export type CreateCookingSessionInput = Pick<
  CookingSessionRecord,
  "userId" | "recipeId" | "mealPlanItemId" | "idempotencyKey"
> & {
  startedAt?: ISODateTime;
};

export type ShoppingListBundle = {
  list: ShoppingListRecord;
  items: ShoppingListItemRecord[];
};

export type CompleteCookingSessionInput = Partial<
  Pick<CookingSessionRecord, "rating" | "photoAssetUri" | "note">
> & {
  completedAt: ISODateTime;
  metadata?: CookingSessionRecord["metadata"];
};

export type CreateRecommendationRunInput = {
  userId: EntityId;
  mode: RecommendationMode;
  selectedIngredientIds: EntityId[];
  selectedInventoryLotIds: EntityId[];
  selectedToolIds: EntityId[];
  preferenceSnapshot: Record<string, JsonValue>;
  modelSnapshot: Record<string, JsonValue>;
};

export type SaveRecommendationCandidateInput = Omit<
  RecommendationCandidateRecord,
  "id" | "runId"
>;

export interface CatalogRepository {
  getIngredient(id: EntityId): Promise<IngredientDetail | null>;
  findIngredients(query: IngredientQuery): Promise<IngredientDetail[]>;
  resolveIngredientAlias(rawLabel: string, locale?: string): Promise<IngredientDetail | null>;
  listCategories(): Promise<FoodCategory[]>;
  listUnits(): Promise<UnitDefinition[]>;
  listStorageMethods(): Promise<StorageMethod[]>;
  listKitchenTools(): Promise<KitchenToolDefinition[]>;
}

export interface InventoryRepository {
  listAvailableLots(userId: EntityId): Promise<InventoryLot[]>;
  getLot(userId: EntityId, lotId: EntityId): Promise<InventoryLot | null>;
  createLot(input: CreateInventoryLotInput): Promise<InventoryLot>;
  updateLot(userId: EntityId, lotId: EntityId, input: UpdateInventoryLotInput): Promise<InventoryLot>;
  appendTransaction(input: CreateInventoryTransactionInput): Promise<InventoryTransaction>;
  listTransactions(userId: EntityId, lotId?: EntityId): Promise<InventoryTransaction[]>;
}

export interface RecipeRepository {
  getRecipe(id: EntityId): Promise<RecipeBundle | null>;
  listPublishedRecipes(): Promise<RecipeBundle[]>;
  saveRecipe(input: SaveRecipeInput): Promise<RecipeBundle>;
  listFavoriteRecipeIds(userId: EntityId): Promise<EntityId[]>;
  setFavorite(userId: EntityId, recipeId: EntityId, favorite: boolean): Promise<void>;
}

export interface RecognitionRepository {
  createJob(input: CreateRecognitionJobInput): Promise<RecognitionJob>;
  getJob(userId: EntityId, jobId: EntityId): Promise<RecognitionJob | null>;
  saveCandidates(jobId: EntityId, candidates: SaveRecognitionCandidateInput[]): Promise<RecognitionCandidate[]>;
  updateCandidate(
    jobId: EntityId,
    candidateId: EntityId,
    patch: Pick<RecognitionCandidate, "status" | "correctedIngredientId">,
  ): Promise<RecognitionCandidate>;
  setJobStatus(jobId: EntityId, status: RecognitionJob["status"], errorMessage?: string): Promise<void>;
}

export interface PlanningRepository {
  createMealPlan(input: CreateMealPlanInput): Promise<MealPlanRecord>;
  getMealPlan(userId: EntityId, date: ISODate): Promise<MealPlanRecord | null>;
  updateMealPlanStatus(
    userId: EntityId,
    planId: EntityId,
    status: MealPlanRecord["status"],
  ): Promise<MealPlanRecord>;
  createShoppingList(
    userId: EntityId,
    mealPlanId: EntityId | null,
    title: string,
  ): Promise<ShoppingListRecord>;
  replaceShoppingItems(
    userId: EntityId,
    shoppingListId: EntityId,
    items: Omit<ShoppingListItemRecord, "id" | "shoppingListId">[],
  ): Promise<ShoppingListItemRecord[]>;
  getShoppingList(userId: EntityId, mealPlanId: EntityId | null): Promise<ShoppingListBundle | null>;
}

export interface CookingRepository {
  startSession(input: CreateCookingSessionInput): Promise<CookingSessionRecord>;
  completeSession(
    userId: EntityId,
    sessionId: EntityId,
    input: CompleteCookingSessionInput,
  ): Promise<CookingSessionRecord>;
  listDiary(userId: EntityId, from: ISODate, to: ISODate): Promise<CookingSessionRecord[]>;
}

export interface RecommendationRepository {
  createRun(input: CreateRecommendationRunInput): Promise<RecommendationRun>;
  saveCandidates(
    runId: EntityId,
    candidates: SaveRecommendationCandidateInput[],
  ): Promise<RecommendationCandidateRecord[]>;
  completeRun(runId: EntityId): Promise<void>;
  recordFeedback(
    userId: EntityId,
    runId: EntityId,
    candidateId: EntityId | null,
    action: "viewed" | "dismissed" | "favorite" | "planned" | "cooked" | "rated",
    properties?: Record<string, JsonValue>,
  ): Promise<void>;
}

export type MiiixRepositories = {
  catalog: CatalogRepository;
  inventory: InventoryRepository;
  recipes: RecipeRepository;
  recognition: RecognitionRepository;
  planning: PlanningRepository;
  cooking: CookingRepository;
  recommendations: RecommendationRepository;
};

export interface RepositoryProvider {
  repositories: MiiixRepositories;
  transaction<T>(work: (repositories: MiiixRepositories) => Promise<T>): Promise<T>;
}
