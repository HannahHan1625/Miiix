import {
  deleteDB,
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
} from "idb";
import type {
  CookingSessionRecord,
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
} from "../../../domain/persistence";

export const MIIIX_DATABASE_NAME = "miiix-local";
export const MIIIX_DATABASE_VERSION = 1;

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
] as const;
export type MiiixStoreName = (typeof allStoreNames)[number];
export type MiiixReadWriteTransaction = IDBPTransaction<
  MiiixIndexedDbSchema,
  typeof allStoreNames,
  "readwrite"
>;

export function openMiiixDatabase(name = MIIIX_DATABASE_NAME) {
  return openDB<MiiixIndexedDbSchema>(name, MIIIX_DATABASE_VERSION, {
    upgrade(database) {
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
    },
  });
}

export function deleteMiiixDatabase(name = MIIIX_DATABASE_NAME) {
  return deleteDB(name);
}
