import {
  deleteDB,
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  type StoreNames,
} from "idb";
import type {
  CanonicalIngredient,
  CookingSessionRecord,
  DataSourceRecord,
  FoodCategory,
  ImportBatchRecord,
  IngredientFormDefinition,
  InventoryLot,
  InventoryTransaction,
  JsonValue,
  MealPlanRecord,
  RecognitionCandidate,
  RecognitionJob,
  RecipeDocument,
  RecipeIngredientLine,
  RecipeStepRecord,
  RecommendationCandidateRecord,
  RecommendationRun,
  ShoppingListItemRecord,
  ShoppingListRecord,
  StorageMethod,
  UnitDefinition,
} from "../../../domain/persistence";
import type { IngredientDetail } from "../contracts";

export const MIIIX_DATABASE_NAME = "miiix-local";
export const MIIIX_DATABASE_VERSION = 3;

export type MetaRecord = {
  key: string;
  value: JsonValue;
};

export type RecipeToolLink = {
  id: string;
  recipeId: string;
  toolId: string;
};

export type FavoriteRecord = {
  id: string;
  userId: string;
  recipeId: string;
  createdAt: string;
};

export type RecommendationFeedbackRecord = {
  id: string;
  userId: string;
  runId: string;
  candidateId: string | null;
  action: "viewed" | "dismissed" | "favorite" | "planned" | "cooked" | "rated";
  properties: Record<string, JsonValue>;
  createdAt: string;
};

/**
 * IndexedDB keeps the catalog as an aggregate read model. PostgreSQL remains
 * normalized, while this record makes offline lookups deterministic and cheap.
 * Every lookup field is derived from `detail` by the catalog seed importer.
 */
export type CatalogIngredientRecord = {
  id: string;
  canonicalNameKey: string;
  searchLabelKeys: string[];
  approvedAliasKeys: string[];
  categoryIds: string[];
  storageMethodIds: string[];
  kind: CanonicalIngredient["kind"];
  recordRole: CanonicalIngredient["recordRole"];
  conceptId: string;
  variantId: string | null;
  formCode: CanonicalIngredient["formCode"];
  processState: CanonicalIngredient["processState"];
  isSelectable: boolean;
  status: CanonicalIngredient["status"];
  detail: IngredientDetail;
};

export interface MiiixIndexedDbSchema extends DBSchema {
  meta: {
    key: string;
    value: MetaRecord;
  };
  inventoryLots: {
    key: string;
    value: InventoryLot;
    indexes: {
      "by-user": string;
      "by-user-status": [string, InventoryLot["status"]];
      "by-user-ingredient": [string, string];
      "by-user-concept-form": [string, string, InventoryLot["formCode"]];
    };
  };
  inventoryTransactions: {
    key: string;
    value: InventoryTransaction;
    indexes: {
      "by-user": string;
      "by-lot": string;
      "by-user-idempotency": [string, string];
    };
  };
  recipes: {
    key: string;
    value: RecipeDocument;
    indexes: {
      "by-status": RecipeDocument["status"];
    };
  };
  recipeIngredients: {
    key: string;
    value: RecipeIngredientLine;
    indexes: {
      "by-recipe": string;
    };
  };
  recipeSteps: {
    key: string;
    value: RecipeStepRecord;
    indexes: {
      "by-recipe": string;
    };
  };
  recipeTools: {
    key: string;
    value: RecipeToolLink;
    indexes: {
      "by-recipe": string;
    };
  };
  favorites: {
    key: string;
    value: FavoriteRecord;
    indexes: {
      "by-user": string;
    };
  };
  mealPlans: {
    key: string;
    value: MealPlanRecord;
    indexes: {
      "by-user": string;
      "by-user-date": [string, string];
    };
  };
  shoppingLists: {
    key: string;
    value: ShoppingListRecord;
    indexes: {
      "by-user": string;
      "by-meal-plan": string;
    };
  };
  shoppingItems: {
    key: string;
    value: ShoppingListItemRecord;
    indexes: {
      "by-list": string;
    };
  };
  cookingSessions: {
    key: string;
    value: CookingSessionRecord;
    indexes: {
      "by-user": string;
      "by-user-idempotency": [string, string];
    };
  };
  recognitionJobs: {
    key: string;
    value: RecognitionJob;
    indexes: {
      "by-user": string;
    };
  };
  recognitionCandidates: {
    key: string;
    value: RecognitionCandidate;
    indexes: {
      "by-job": string;
    };
  };
  recommendationRuns: {
    key: string;
    value: RecommendationRun;
    indexes: {
      "by-user": string;
    };
  };
  recommendationCandidates: {
    key: string;
    value: RecommendationCandidateRecord;
    indexes: {
      "by-run": string;
    };
  };
  recommendationFeedback: {
    key: string;
    value: RecommendationFeedbackRecord;
    indexes: {
      "by-user": string;
      "by-run": string;
    };
  };
  catalogSources: {
    key: string;
    value: DataSourceRecord;
    indexes: {
      "by-provider": string;
    };
  };
  catalogImportBatches: {
    key: string;
    value: ImportBatchRecord;
    indexes: {
      "by-source": string;
      "by-source-revision": [string, string];
      "by-status": ImportBatchRecord["status"];
    };
  };
  catalogIngredientForms: {
    key: IngredientFormDefinition["code"];
    value: IngredientFormDefinition;
    indexes: {
      "by-status": IngredientFormDefinition["status"];
    };
  };
  catalogCategories: {
    key: string;
    value: FoodCategory;
    indexes: {
      "by-parent": string;
      "by-level": FoodCategory["level"];
      "by-slug": string;
    };
  };
  catalogUnits: {
    key: string;
    value: UnitDefinition;
    indexes: {
      "by-code": string;
    };
  };
  catalogStorageMethods: {
    key: string;
    value: StorageMethod;
    indexes: {
      "by-code": string;
    };
  };
  catalogIngredients: {
    key: string;
    value: CatalogIngredientRecord;
    indexes: {
      "by-canonical-name": string;
      "by-search-label": string;
      "by-approved-alias": string;
      "by-category": string;
      "by-storage-method": string;
      "by-kind": CanonicalIngredient["kind"];
      "by-record-role": CanonicalIngredient["recordRole"];
      "by-concept": string;
      "by-form": CanonicalIngredient["formCode"];
      "by-status": CanonicalIngredient["status"];
      "by-kind-status": [CanonicalIngredient["kind"], CanonicalIngredient["status"]];
    };
  };
}

export type MiiixDatabase = IDBPDatabase<MiiixIndexedDbSchema>;
export const allStoreNames = [
  "meta",
  "inventoryLots",
  "inventoryTransactions",
  "recipes",
  "recipeIngredients",
  "recipeSteps",
  "recipeTools",
  "favorites",
  "mealPlans",
  "shoppingLists",
  "shoppingItems",
  "cookingSessions",
  "recognitionJobs",
  "recognitionCandidates",
  "recommendationRuns",
  "recommendationCandidates",
  "recommendationFeedback",
  "catalogSources",
  "catalogImportBatches",
  "catalogIngredientForms",
  "catalogCategories",
  "catalogUnits",
  "catalogStorageMethods",
  "catalogIngredients",
] as const;
export type MiiixStoreName = (typeof allStoreNames)[number];
export type MiiixReadWriteTransaction = IDBPTransaction<
  MiiixIndexedDbSchema,
  typeof allStoreNames,
  "readwrite"
>;

export function openMiiixDatabase(name = MIIIX_DATABASE_NAME) {
  return openDB<MiiixIndexedDbSchema>(name, MIIIX_DATABASE_VERSION, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) createOperationalStores(database);
      if (oldVersion < 2) createCatalogStores(database);
      if (oldVersion < 3) createIdentityLayerStoresAndIndexes(database, transaction);
    },
  });
}

function createOperationalStores(database: MiiixDatabase) {
  database.createObjectStore("meta", { keyPath: "key" });

  const lots = database.createObjectStore("inventoryLots", { keyPath: "id" });
  lots.createIndex("by-user", "userId");
  lots.createIndex("by-user-status", ["userId", "status"]);
  lots.createIndex("by-user-ingredient", ["userId", "ingredientId"]);

  const transactions = database.createObjectStore("inventoryTransactions", { keyPath: "id" });
  transactions.createIndex("by-user", "userId");
  transactions.createIndex("by-lot", "inventoryLotId");
  transactions.createIndex("by-user-idempotency", ["userId", "idempotencyKey"], { unique: true });

  const recipes = database.createObjectStore("recipes", { keyPath: "id" });
  recipes.createIndex("by-status", "status");

  const recipeIngredients = database.createObjectStore("recipeIngredients", { keyPath: "id" });
  recipeIngredients.createIndex("by-recipe", "recipeId");

  const recipeSteps = database.createObjectStore("recipeSteps", { keyPath: "id" });
  recipeSteps.createIndex("by-recipe", "recipeId");

  const recipeTools = database.createObjectStore("recipeTools", { keyPath: "id" });
  recipeTools.createIndex("by-recipe", "recipeId");

  const favorites = database.createObjectStore("favorites", { keyPath: "id" });
  favorites.createIndex("by-user", "userId");

  const plans = database.createObjectStore("mealPlans", { keyPath: "id" });
  plans.createIndex("by-user", "userId");
  plans.createIndex("by-user-date", ["userId", "plannedDate"]);

  const shoppingLists = database.createObjectStore("shoppingLists", { keyPath: "id" });
  shoppingLists.createIndex("by-user", "userId");
  shoppingLists.createIndex("by-meal-plan", "mealPlanId");

  const shoppingItems = database.createObjectStore("shoppingItems", { keyPath: "id" });
  shoppingItems.createIndex("by-list", "shoppingListId");

  const cookingSessions = database.createObjectStore("cookingSessions", { keyPath: "id" });
  cookingSessions.createIndex("by-user", "userId");
  cookingSessions.createIndex("by-user-idempotency", ["userId", "idempotencyKey"], { unique: true });

  const recognitionJobs = database.createObjectStore("recognitionJobs", { keyPath: "id" });
  recognitionJobs.createIndex("by-user", "userId");

  const recognitionCandidates = database.createObjectStore("recognitionCandidates", { keyPath: "id" });
  recognitionCandidates.createIndex("by-job", "jobId");

  const recommendationRuns = database.createObjectStore("recommendationRuns", { keyPath: "id" });
  recommendationRuns.createIndex("by-user", "userId");

  const recommendationCandidates = database.createObjectStore("recommendationCandidates", { keyPath: "id" });
  recommendationCandidates.createIndex("by-run", "runId");

  const recommendationFeedback = database.createObjectStore("recommendationFeedback", { keyPath: "id" });
  recommendationFeedback.createIndex("by-user", "userId");
  recommendationFeedback.createIndex("by-run", "runId");
}

function createCatalogStores(database: MiiixDatabase) {
  const sources = database.createObjectStore("catalogSources", { keyPath: "id" });
  sources.createIndex("by-provider", "provider");

  const categories = database.createObjectStore("catalogCategories", { keyPath: "id" });
  categories.createIndex("by-parent", "parentId");
  categories.createIndex("by-level", "level");
  categories.createIndex("by-slug", "slug", { unique: true });

  const units = database.createObjectStore("catalogUnits", { keyPath: "id" });
  units.createIndex("by-code", "code", { unique: true });

  const storageMethods = database.createObjectStore("catalogStorageMethods", { keyPath: "id" });
  storageMethods.createIndex("by-code", "code", { unique: true });

  const ingredients = database.createObjectStore("catalogIngredients", { keyPath: "id" });
  ingredients.createIndex("by-canonical-name", "canonicalNameKey", { unique: true });
  ingredients.createIndex("by-search-label", "searchLabelKeys", { multiEntry: true });
  ingredients.createIndex("by-approved-alias", "approvedAliasKeys", { multiEntry: true, unique: true });
  ingredients.createIndex("by-category", "categoryIds", { multiEntry: true });
  ingredients.createIndex("by-storage-method", "storageMethodIds", { multiEntry: true });
  ingredients.createIndex("by-kind", "kind");
  ingredients.createIndex("by-status", "status");
  ingredients.createIndex("by-kind-status", ["kind", "status"]);
}

function createIdentityLayerStoresAndIndexes(
  database: MiiixDatabase,
  transaction: IDBPTransaction<
    MiiixIndexedDbSchema,
    ArrayLike<StoreNames<MiiixIndexedDbSchema>>,
    "versionchange"
  >,
) {
  const batches = database.createObjectStore("catalogImportBatches", { keyPath: "id" });
  batches.createIndex("by-source", "sourceId");
  batches.createIndex("by-source-revision", ["sourceId", "sourceRevision"], { unique: true });
  batches.createIndex("by-status", "status");

  const forms = database.createObjectStore("catalogIngredientForms", { keyPath: "code" });
  forms.createIndex("by-status", "status");

  const lots = transaction.objectStore("inventoryLots");
  if (!lots.indexNames.contains("by-user-concept-form")) {
    lots.createIndex("by-user-concept-form", ["userId", "conceptId", "formCode"]);
  }

  const ingredients = transaction.objectStore("catalogIngredients");
  if (!ingredients.indexNames.contains("by-record-role")) {
    ingredients.createIndex("by-record-role", "recordRole");
  }
  if (!ingredients.indexNames.contains("by-concept")) {
    ingredients.createIndex("by-concept", "conceptId");
  }
  if (!ingredients.indexNames.contains("by-form")) {
    ingredients.createIndex("by-form", "formCode");
  }
}

export function deleteMiiixDatabase(name = MIIIX_DATABASE_NAME) {
  return deleteDB(name);
}
