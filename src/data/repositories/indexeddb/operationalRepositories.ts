import type {
  CookingRepository,
  CompleteCookingSessionInput,
  CreateCookingSessionInput,
  CreateInventoryLotInput,
  CreateInventoryTransactionInput,
  CreateMealPlanInput,
  CreateRecognitionJobInput,
  CreateRecommendationRunInput,
  InventoryRepository,
  PlanningRepository,
  RecognitionRepository,
  RecipeBundle,
  RecipeRepository,
  RecommendationRepository,
  SaveRecognitionCandidateInput,
  SaveRecipeInput,
  SaveRecommendationCandidateInput,
  UpdateInventoryLotInput,
} from "../contracts";
import type {
  CookingSessionRecord,
  InventoryLot,
  InventoryTransaction,
  JsonValue,
  MealPlanRecord,
  RecognitionCandidate,
  RecognitionJob,
  RecipeDocument,
  RecommendationCandidateRecord,
  RecommendationRun,
  ShoppingListItemRecord,
  ShoppingListRecord,
} from "../../../domain/persistence";
import { IndexedDbContext, createEntityId, nowISO } from "./context";

export class IndexedDbInventoryRepository implements InventoryRepository {
  constructor(private readonly context: IndexedDbContext) {}

  async listAvailableLots(userId: string) {
    return this.context.read(["inventoryLots"], async (transaction) => {
      const lots = await transaction.objectStore("inventoryLots")
        .index("by-user-status")
        .getAll([userId, "available"]);
      return lots.sort((left, right) => {
        const leftDate = left.expiresAt ?? left.createdAt;
        const rightDate = right.expiresAt ?? right.createdAt;
        return leftDate.localeCompare(rightDate);
      });
    });
  }

  async getLot(userId: string, lotId: string) {
    return this.context.read(["inventoryLots"], async (transaction) => {
      const lot = await transaction.objectStore("inventoryLots").get(lotId);
      return lot?.userId === userId ? lot : null;
    });
  }

  async createLot(input: CreateInventoryLotInput) {
    return this.context.write(["inventoryLots", "inventoryTransactions"], async (transaction) => {
      const timestamp = nowISO();
      const lot: InventoryLot = {
        ...input,
        id: createEntityId("lot"),
        quantityRemaining: input.quantityInitial,
        status: "available",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const purchase: InventoryTransaction = {
        id: createEntityId("transaction"),
        userId: lot.userId,
        inventoryLotId: lot.id,
        cookingSessionId: null,
        type: "purchase",
        quantity: lot.quantityInitial,
        unitId: lot.unitId,
        idempotencyKey: `initial:${lot.id}`,
        occurredAt: lot.purchasedAt ?? timestamp,
        note: "Initial inventory lot balance",
        metadata: {},
      };
      await transaction.objectStore("inventoryLots").add(lot);
      await transaction.objectStore("inventoryTransactions").add(purchase);
      return lot;
    });
  }

  async updateLot(userId: string, lotId: string, input: UpdateInventoryLotInput) {
    return this.context.write(["inventoryLots"], async (transaction) => {
      const store = transaction.objectStore("inventoryLots");
      const current = await store.get(lotId);
      if (!current || current.userId !== userId) {
        throw new Error(`Inventory lot not found: ${lotId}`);
      }
      if (input.quantityRemaining !== undefined && input.quantityRemaining < 0) {
        throw new Error("Inventory quantity cannot be negative");
      }
      const nextQuantity = input.quantityRemaining ?? current.quantityRemaining;
      const next: InventoryLot = {
        ...current,
        ...input,
        quantityRemaining: nextQuantity,
        status: input.status ?? (nextQuantity > 0 ? current.status : "consumed"),
        updatedAt: nowISO(),
      };
      await store.put(next);
      return next;
    });
  }

  async appendTransaction(input: CreateInventoryTransactionInput) {
    return this.context.write(["inventoryLots", "inventoryTransactions"], async (transaction) => {
      const transactionStore = transaction.objectStore("inventoryTransactions");
      const existing = await transactionStore.index("by-user-idempotency")
        .get([input.userId, input.idempotencyKey]);
      if (existing) return existing;

      const lotStore = transaction.objectStore("inventoryLots");
      const lot = await lotStore.get(input.inventoryLotId);
      if (!lot || lot.userId !== input.userId) {
        throw new Error(`Inventory lot not found: ${input.inventoryLotId}`);
      }
      if (input.quantity <= 0) {
        throw new Error("Inventory transaction quantity must be positive");
      }
      if (lot.unitId !== input.unitId) {
        throw new Error("Inventory transaction unit must match the lot unit");
      }

      const signedQuantity = input.type === "adjust_in" ? input.quantity : -input.quantity;
      const quantityRemaining = roundQuantity(lot.quantityRemaining + signedQuantity);
      if (quantityRemaining < 0) {
        throw new Error(`Insufficient inventory for ${lot.ingredientId}`);
      }

      const status: InventoryLot["status"] = quantityRemaining > 0
        ? "available"
        : input.type === "waste"
          ? "wasted"
          : input.type === "consume"
            ? "consumed"
            : "discarded";
      const updatedLot: InventoryLot = {
        ...lot,
        quantityRemaining,
        status,
        updatedAt: nowISO(),
      };
      const record: InventoryTransaction = {
        ...input,
        id: createEntityId("transaction"),
        occurredAt: input.occurredAt ?? nowISO(),
      };
      await lotStore.put(updatedLot);
      await transactionStore.add(record);
      return record;
    });
  }

  async listTransactions(userId: string, lotId?: string) {
    return this.context.read(["inventoryTransactions"], async (transaction) => {
      const records = await transaction.objectStore("inventoryTransactions")
        .index("by-user")
        .getAll(userId);
      return records
        .filter((record) => !lotId || record.inventoryLotId === lotId)
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    });
  }
}

export class IndexedDbRecipeRepository implements RecipeRepository {
  constructor(private readonly context: IndexedDbContext) {}

  async getRecipe(id: string) {
    return this.context.read(
      ["recipes", "recipeIngredients", "recipeSteps", "recipeTools"],
      async (transaction) => {
        const recipe = await transaction.objectStore("recipes").get(id);
        if (!recipe) return null;
        const [ingredients, steps, toolLinks] = await Promise.all([
          transaction.objectStore("recipeIngredients").index("by-recipe").getAll(id),
          transaction.objectStore("recipeSteps").index("by-recipe").getAll(id),
          transaction.objectStore("recipeTools").index("by-recipe").getAll(id),
        ]);
        return {
          recipe,
          ingredients: ingredients.sort((left, right) => left.sortOrder - right.sortOrder),
          steps: steps.sort((left, right) => left.stepNumber - right.stepNumber),
          toolIds: toolLinks.map((link) => link.toolId),
        } satisfies RecipeBundle;
      },
    );
  }

  async listPublishedRecipes() {
    const ids = await this.context.read(["recipes"], async (transaction) => {
      const recipes = await transaction.objectStore("recipes").index("by-status").getAll("published");
      return recipes.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map((recipe) => recipe.id);
    });
    return Promise.all(ids.map((id) => this.getRecipe(id))).then(
      (bundles) => bundles.filter((bundle): bundle is RecipeBundle => Boolean(bundle)),
    );
  }

  async saveRecipe(input: SaveRecipeInput) {
    const recipeId = input.id ?? createEntityId("recipe");
    await this.context.write(
      ["recipes", "recipeIngredients", "recipeSteps", "recipeTools"],
      async (transaction) => {
        const { ingredients, steps, toolIds, id: _inputId, ...documentInput } = input;
        const recipeStore = transaction.objectStore("recipes");
        const current = await recipeStore.get(recipeId);
        const timestamp = nowISO();
        const recipe: RecipeDocument = {
          ...documentInput,
          id: recipeId,
          createdAt: current?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        await recipeStore.put(recipe);

        const ingredientStore = transaction.objectStore("recipeIngredients");
        let ingredientCursor = await ingredientStore.index("by-recipe").openKeyCursor(recipeId);
        while (ingredientCursor) {
          await ingredientStore.delete(ingredientCursor.primaryKey);
          ingredientCursor = await ingredientCursor.continue();
        }

        const stepStore = transaction.objectStore("recipeSteps");
        let stepCursor = await stepStore.index("by-recipe").openKeyCursor(recipeId);
        while (stepCursor) {
          await stepStore.delete(stepCursor.primaryKey);
          stepCursor = await stepCursor.continue();
        }

        const toolStore = transaction.objectStore("recipeTools");
        let toolCursor = await toolStore.index("by-recipe").openKeyCursor(recipeId);
        while (toolCursor) {
          await toolStore.delete(toolCursor.primaryKey);
          toolCursor = await toolCursor.continue();
        }

        for (const ingredient of ingredients) {
          await ingredientStore.add({
            ...ingredient,
            id: createEntityId("recipe-ingredient"),
            recipeId,
          });
        }
        for (const step of steps) {
          await stepStore.add({
            ...step,
            id: createEntityId("recipe-step"),
            recipeId,
          });
        }
        for (const toolId of toolIds) {
          await toolStore.put({ id: `${recipeId}:${toolId}`, recipeId, toolId });
        }
      },
    );
    const saved = await this.getRecipe(recipeId);
    if (!saved) throw new Error(`Failed to save recipe: ${recipeId}`);
    return saved;
  }

  async listFavoriteRecipeIds(userId: string) {
    return this.context.read(["favorites"], async (transaction) => {
      const favorites = await transaction.objectStore("favorites").index("by-user").getAll(userId);
      return favorites.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((item) => item.recipeId);
    });
  }

  async setFavorite(userId: string, recipeId: string, favorite: boolean) {
    return this.context.write(["favorites"], async (transaction) => {
      const store = transaction.objectStore("favorites");
      const id = `${userId}:${recipeId}`;
      if (favorite) {
        await store.put({ id, userId, recipeId, createdAt: nowISO() });
      } else {
        await store.delete(id);
      }
    });
  }
}

export class IndexedDbPlanningRepository implements PlanningRepository {
  constructor(private readonly context: IndexedDbContext) {}

  async createMealPlan(input: CreateMealPlanInput) {
    return this.context.write(["mealPlans"], async (transaction) => {
      const timestamp = nowISO();
      const record: MealPlanRecord = {
        ...input,
        id: createEntityId("meal-plan"),
        status: "planned",
        metadata: input.metadata ?? {},
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await transaction.objectStore("mealPlans").add(record);
      return record;
    });
  }

  async getMealPlan(userId: string, date: string) {
    return this.context.read(["mealPlans"], async (transaction) => {
      const plans = await transaction.objectStore("mealPlans").index("by-user-date").getAll([userId, date]);
      return plans
        .filter((plan) => plan.status === "planned" || plan.status === "cooking")
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
    });
  }

  async updateMealPlanStatus(userId: string, planId: string, status: MealPlanRecord["status"]) {
    return this.context.write(["mealPlans"], async (transaction) => {
      const store = transaction.objectStore("mealPlans");
      const current = await store.get(planId);
      if (!current || current.userId !== userId) throw new Error(`Meal plan not found: ${planId}`);
      const next = { ...current, status, updatedAt: nowISO() };
      await store.put(next);
      return next;
    });
  }

  async createShoppingList(userId: string, mealPlanId: string | null, title: string) {
    return this.context.write(["shoppingLists"], async (transaction) => {
      const timestamp = nowISO();
      const list: ShoppingListRecord = {
        id: createEntityId("shopping-list"),
        userId,
        mealPlanId,
        title,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await transaction.objectStore("shoppingLists").add(list);
      return list;
    });
  }

  async replaceShoppingItems(
    userId: string,
    shoppingListId: string,
    items: Omit<ShoppingListItemRecord, "id" | "shoppingListId">[],
  ) {
    return this.context.write(["shoppingLists", "shoppingItems"], async (transaction) => {
      const list = await transaction.objectStore("shoppingLists").get(shoppingListId);
      if (!list || list.userId !== userId) throw new Error(`Shopping list not found: ${shoppingListId}`);
      const itemStore = transaction.objectStore("shoppingItems");
      let cursor = await itemStore.index("by-list").openKeyCursor(shoppingListId);
      while (cursor) {
        await itemStore.delete(cursor.primaryKey);
        cursor = await cursor.continue();
      }
      const records: ShoppingListItemRecord[] = [];
      for (const item of items) {
        const record = { ...item, id: createEntityId("shopping-item"), shoppingListId };
        await itemStore.add(record);
        records.push(record);
      }
      return records;
    });
  }

  async getShoppingList(userId: string, mealPlanId: string | null) {
    return this.context.read(["shoppingLists", "shoppingItems"], async (transaction) => {
      const lists = await transaction.objectStore("shoppingLists").index("by-user").getAll(userId);
      const list = lists
        .filter((item) => item.mealPlanId === mealPlanId && item.status === "active")
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
      if (!list) return null;
      const items = await transaction.objectStore("shoppingItems").index("by-list").getAll(list.id);
      return { list, items };
    });
  }
}

export class IndexedDbCookingRepository implements CookingRepository {
  constructor(private readonly context: IndexedDbContext) {}

  async startSession(input: CreateCookingSessionInput) {
    return this.context.write(["cookingSessions"], async (transaction) => {
      const store = transaction.objectStore("cookingSessions");
      const existing = await store.index("by-user-idempotency").get([input.userId, input.idempotencyKey]);
      if (existing) return existing;
      const startedAt = input.startedAt ?? nowISO();
      const session: CookingSessionRecord = {
        ...input,
        id: createEntityId("cooking-session"),
        status: "started",
        startedAt,
        completedAt: null,
        rating: null,
        photoAssetUri: null,
        note: null,
        metadata: {},
      };
      await store.add(session);
      return session;
    });
  }

  async completeSession(userId: string, sessionId: string, input: CompleteCookingSessionInput) {
    return this.context.write(["cookingSessions"], async (transaction) => {
      const store = transaction.objectStore("cookingSessions");
      const current = await store.get(sessionId);
      if (!current || current.userId !== userId) throw new Error(`Cooking session not found: ${sessionId}`);
      const next: CookingSessionRecord = {
        ...current,
        ...input,
        status: "completed",
        rating: input.rating ?? current.rating,
        photoAssetUri: input.photoAssetUri ?? current.photoAssetUri,
        note: input.note ?? current.note,
        metadata: input.metadata ?? current.metadata,
      };
      await store.put(next);
      return next;
    });
  }

  async listDiary(userId: string, from: string, to: string) {
    return this.context.read(["cookingSessions"], async (transaction) => {
      const sessions = await transaction.objectStore("cookingSessions").index("by-user").getAll(userId);
      return sessions
        .filter((session) => {
          const date = (session.completedAt ?? session.startedAt).slice(0, 10);
          return session.status === "completed" && date >= from && date <= to;
        })
        .sort((left, right) => (right.completedAt ?? right.startedAt).localeCompare(left.completedAt ?? left.startedAt));
    });
  }
}

export class IndexedDbRecognitionRepository implements RecognitionRepository {
  constructor(private readonly context: IndexedDbContext) {}

  async createJob(input: CreateRecognitionJobInput) {
    return this.context.write(["recognitionJobs"], async (transaction) => {
      const timestamp = nowISO();
      const job: RecognitionJob = {
        ...input,
        id: createEntityId("recognition-job"),
        status: "queued",
        rawOutput: {},
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await transaction.objectStore("recognitionJobs").add(job);
      return job;
    });
  }

  async getJob(userId: string, jobId: string) {
    return this.context.read(["recognitionJobs"], async (transaction) => {
      const job = await transaction.objectStore("recognitionJobs").get(jobId);
      return job?.userId === userId ? job : null;
    });
  }

  async saveCandidates(jobId: string, candidates: SaveRecognitionCandidateInput[]) {
    return this.context.write(["recognitionCandidates"], async (transaction) => {
      const store = transaction.objectStore("recognitionCandidates");
      const records: RecognitionCandidate[] = [];
      for (const candidate of candidates) {
        const record = { ...candidate, id: createEntityId("recognition-candidate"), jobId };
        await store.add(record);
        records.push(record);
      }
      return records;
    });
  }

  async updateCandidate(
    jobId: string,
    candidateId: string,
    patch: Pick<RecognitionCandidate, "status" | "correctedIngredientId">,
  ) {
    return this.context.write(["recognitionCandidates"], async (transaction) => {
      const store = transaction.objectStore("recognitionCandidates");
      const current = await store.get(candidateId);
      if (!current || current.jobId !== jobId) throw new Error(`Recognition candidate not found: ${candidateId}`);
      const next = { ...current, ...patch };
      await store.put(next);
      return next;
    });
  }

  async setJobStatus(jobId: string, status: RecognitionJob["status"], errorMessage?: string) {
    return this.context.write(["recognitionJobs"], async (transaction) => {
      const store = transaction.objectStore("recognitionJobs");
      const current = await store.get(jobId);
      if (!current) throw new Error(`Recognition job not found: ${jobId}`);
      await store.put({ ...current, status, errorMessage: errorMessage ?? null, updatedAt: nowISO() });
    });
  }
}

export class IndexedDbRecommendationRepository implements RecommendationRepository {
  constructor(private readonly context: IndexedDbContext) {}

  async createRun(input: CreateRecommendationRunInput) {
    return this.context.write(["recommendationRuns"], async (transaction) => {
      const run: RecommendationRun = {
        ...input,
        id: createEntityId("recommendation-run"),
        status: "started",
        createdAt: nowISO(),
        completedAt: null,
      };
      await transaction.objectStore("recommendationRuns").add(run);
      return run;
    });
  }

  async saveCandidates(runId: string, candidates: SaveRecommendationCandidateInput[]) {
    return this.context.write(["recommendationCandidates"], async (transaction) => {
      const store = transaction.objectStore("recommendationCandidates");
      const records: RecommendationCandidateRecord[] = [];
      for (const candidate of candidates) {
        const record = { ...candidate, id: createEntityId("recommendation-candidate"), runId };
        await store.add(record);
        records.push(record);
      }
      return records;
    });
  }

  async completeRun(runId: string) {
    return this.context.write(["recommendationRuns"], async (transaction) => {
      const store = transaction.objectStore("recommendationRuns");
      const current = await store.get(runId);
      if (!current) throw new Error(`Recommendation run not found: ${runId}`);
      await store.put({ ...current, status: "completed", completedAt: nowISO() });
    });
  }

  async recordFeedback(
    userId: string,
    runId: string,
    candidateId: string | null,
    action: "viewed" | "dismissed" | "favorite" | "planned" | "cooked" | "rated",
    properties: Record<string, JsonValue> = {},
  ) {
    return this.context.write(["recommendationFeedback"], async (transaction) => {
      const id = createEntityId("recommendation-feedback");
      await transaction.objectStore("recommendationFeedback").add({
        id,
        userId,
        runId,
        candidateId,
        action,
        properties,
        createdAt: nowISO(),
      });
    });
  }
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}
