import type { JsonValue } from "../../../domain/persistence";
import type { MiiixRepositories, RepositoryProvider } from "../contracts";
import { IndexedDbCatalogRepository } from "./catalogRepository";
import { ensureCatalogSeed } from "./catalogSeed";
import { IndexedDbContext } from "./context";
import {
  IndexedDbCookingRepository,
  IndexedDbInventoryRepository,
  IndexedDbPlanningRepository,
  IndexedDbRecognitionRepository,
  IndexedDbRecipeRepository,
  IndexedDbRecommendationRepository,
} from "./operationalRepositories";
import {
  allStoreNames,
  openMiiixDatabase,
  type MiiixDatabase,
  type MiiixReadWriteTransaction,
} from "./schema";

export class IndexedDbRepositoryProvider implements RepositoryProvider {
  readonly repositories: MiiixRepositories;

  constructor(
    private readonly database: MiiixDatabase,
    private readonly context = new IndexedDbContext(database),
  ) {
    this.repositories = createRepositories(this.context);
  }

  async transaction<T>(work: (repositories: MiiixRepositories) => Promise<T>) {
    const transaction = this.database.transaction(allStoreNames, "readwrite") as unknown as MiiixReadWriteTransaction;
    const repositories = createRepositories(new IndexedDbContext(this.database, transaction));
    try {
      const result = await work(repositories);
      await transaction.done;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The failing request may already have aborted the transaction.
      }
      try {
        await transaction.done;
      } catch {
        // Expected after abort; preserve the original domain error below.
      }
      throw error;
    }
  }

  async getMeta<T extends JsonValue>(key: string) {
    return this.context.read(["meta"], async (transaction) => {
      const record = await transaction.objectStore("meta").get(key);
      return (record?.value as T | undefined) ?? null;
    });
  }

  async setMeta(key: string, value: JsonValue) {
    return this.context.write(["meta"], async (transaction) => {
      await transaction.objectStore("meta").put({ key, value });
    });
  }

  close() {
    this.database.close();
  }
}

export async function createIndexedDbRepositoryProvider(databaseName?: string) {
  const database = await openMiiixDatabase(databaseName);
  const context = new IndexedDbContext(database);
  try {
    await ensureCatalogSeed(context);
    return new IndexedDbRepositoryProvider(database, context);
  } catch (error) {
    database.close();
    throw error;
  }
}

function createRepositories(context: IndexedDbContext): MiiixRepositories {
  return {
    catalog: new IndexedDbCatalogRepository(context),
    inventory: new IndexedDbInventoryRepository(context),
    recipes: new IndexedDbRecipeRepository(context),
    recognition: new IndexedDbRecognitionRepository(context),
    planning: new IndexedDbPlanningRepository(context),
    cooking: new IndexedDbCookingRepository(context),
    recommendations: new IndexedDbRecommendationRepository(context),
  };
}
