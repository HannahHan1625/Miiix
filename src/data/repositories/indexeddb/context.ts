import type { IDBPTransaction } from "idb";
import type {
  MiiixDatabase,
  MiiixIndexedDbSchema,
  MiiixReadWriteTransaction,
  MiiixStoreName,
} from "./schema";

export class IndexedDbContext {
  constructor(
    readonly database: MiiixDatabase,
    readonly boundTransaction?: MiiixReadWriteTransaction,
  ) {}

  async read<const Stores extends readonly MiiixStoreName[], T>(
    stores: Stores,
    work: (transaction: IDBPTransaction<MiiixIndexedDbSchema, Stores, "readonly" | "readwrite">) => Promise<T>,
  ) {
    if (this.boundTransaction) {
      return work(this.boundTransaction as unknown as IDBPTransaction<
        MiiixIndexedDbSchema,
        Stores,
        "readonly" | "readwrite"
      >);
    }

    const transaction = this.database.transaction(stores, "readonly");
    const result = await work(transaction);
    await transaction.done;
    return result;
  }

  async write<const Stores extends readonly MiiixStoreName[], T>(
    stores: Stores,
    work: (transaction: IDBPTransaction<MiiixIndexedDbSchema, Stores, "readwrite">) => Promise<T>,
  ) {
    if (this.boundTransaction) {
      return work(this.boundTransaction as unknown as IDBPTransaction<MiiixIndexedDbSchema, Stores, "readwrite">);
    }

    const transaction = this.database.transaction(stores, "readwrite");
    try {
      const result = await work(transaction);
      await transaction.done;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The browser may already have aborted the transaction.
      }
      throw error;
    }
  }
}

export function createEntityId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function nowISO() {
  return new Date().toISOString();
}
