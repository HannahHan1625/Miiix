import type {
  CatalogRepository,
  IngredientQuery,
} from "../contracts";
import type { KitchenToolDefinition } from "../../../domain/persistence";
import { normalizeCatalogLabel } from "../../catalog/normalize";
import { aliasLookupKey } from "./catalogSeed";
import { IndexedDbContext } from "./context";

/**
 * Offline Catalog adapter backed by IndexedDB v2.
 *
 * Ingredients and their related master data are imported by `catalogSeed.ts`;
 * this repository is deliberately read-only so UI code cannot mutate the
 * catalog through the business repository contract.
 */
export class IndexedDbCatalogRepository implements CatalogRepository {
  constructor(private readonly context: IndexedDbContext) {}

  async getIngredient(id: string) {
    return this.context.read(["catalogIngredients"], async (transaction) => {
      return (await transaction.objectStore("catalogIngredients").get(id))?.detail ?? null;
    });
  }

  async findIngredients(query: IngredientQuery) {
    const text = normalizeCatalogLabel(query.text ?? "");
    const storageMethodId = query.storageMethodId;
    const records = await this.context.read(["catalogIngredients"], async (transaction) => {
      return transaction.objectStore("catalogIngredients").getAll();
    });

    const matches = records.filter((record) => {
      const matchesText = !text || record.searchLabelKeys.some((label) => label.includes(text));
      const matchesCategory = !query.categoryId || record.categoryIds.includes(query.categoryId);
      const matchesStorage = !storageMethodId || record.storageMethodIds.includes(storageMethodId);
      const matchesKind = !query.kind || record.kind === query.kind;
      const matchesStatus = !query.status || record.status === query.status;
      return matchesText && matchesCategory && matchesStorage && matchesKind && matchesStatus;
    });

    matches.sort((left, right) => {
      const leftRank = catalogSearchRank(left.canonicalNameKey, left.approvedAliasKeys, text);
      const rightRank = catalogSearchRank(right.canonicalNameKey, right.approvedAliasKeys, text);
      return leftRank - rightRank
        || left.detail.ingredient.canonicalNameZh.localeCompare(
          right.detail.ingredient.canonicalNameZh,
          "zh-CN",
        );
    });

    const limit = query.limit === undefined
      ? matches.length
      : Math.max(0, Math.trunc(query.limit));
    return matches.slice(0, limit).map((record) => record.detail);
  }

  async resolveIngredientAlias(rawLabel: string, locale = "zh-CN") {
    const normalized = normalizeCatalogLabel(rawLabel);
    if (!normalized) return null;

    return this.context.read(["catalogIngredients"], async (transaction) => {
      const record = await transaction.objectStore("catalogIngredients")
        .index("by-approved-alias")
        .get(aliasLookupKey(locale, normalized));
      return record?.detail ?? null;
    });
  }

  async listCategories() {
    return this.context.read(["catalogCategories"], async (transaction) => {
      const records = await transaction.objectStore("catalogCategories").getAll();
      return records.sort((left, right) => left.level - right.level
        || left.sortOrder - right.sortOrder
        || left.nameZh.localeCompare(right.nameZh, "zh-CN"));
    });
  }

  async listUnits() {
    return this.context.read(["catalogUnits"], async (transaction) => {
      const records = await transaction.objectStore("catalogUnits").getAll();
      return records.sort((left, right) => left.code.localeCompare(right.code));
    });
  }

  async listStorageMethods() {
    return this.context.read(["catalogStorageMethods"], async (transaction) => {
      const records = await transaction.objectStore("catalogStorageMethods").getAll();
      return records.sort((left, right) => left.code.localeCompare(right.code));
    });
  }

  async listKitchenTools() {
    // Tools remain a UI projection in v0.4.2; load them only when requested so
    // catalog initialization never depends on demo recipes or screen fixtures.
    const { kitchenTools } = await import("../../catalog");
    return kitchenTools.map((tool): KitchenToolDefinition => ({
      id: tool.id,
      code: tool.id,
      nameZh: tool.name,
      nameEn: null,
      description: tool.subtitle,
      assetUri: tool.image,
      status: "active",
    }));
  }
}

function catalogSearchRank(canonicalNameKey: string, approvedAliasKeys: string[], text: string) {
  if (!text) return 3;
  if (canonicalNameKey === text) return 0;
  if (approvedAliasKeys.some((key) => key.endsWith(`:${text}`))) return 1;
  return 2;
}
