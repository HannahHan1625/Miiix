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
      const matchesRole = !query.recordRole || record.recordRole === query.recordRole;
      const matchesConcept = !query.conceptId || record.conceptId === query.conceptId;
      const matchesForm = !query.formCode || record.formCode === query.formCode;
      const matchesSelectable = query.isSelectable === undefined
        || record.isSelectable === query.isSelectable;
      const matchesStatus = !query.status || record.status === query.status;
      return matchesText
        && matchesCategory
        && matchesStorage
        && matchesKind
        && matchesRole
        && matchesConcept
        && matchesForm
        && matchesSelectable
        && matchesStatus;
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

  async resolveLegacyIngredientId(legacyId: string, namespace: "miiix-v0.4.1") {
    if (namespace !== "miiix-v0.4.1") return null;
    return this.context.read(["catalogIngredients"], async (transaction) => {
      const records = await transaction.objectStore("catalogIngredients").getAll();
      return records.find((record) => {
        const legacyIds = record.detail.ingredient.metadata.legacyIds;
        return Array.isArray(legacyIds) && legacyIds.includes(legacyId);
      })?.detail ?? null;
    });
  }

  async listExternalMappings(
    ingredientId: string,
    usageScope?: Parameters<CatalogRepository["listExternalMappings"]>[1],
  ) {
    return this.context.read(["catalogIngredients"], async (transaction) => {
      const store = transaction.objectStore("catalogIngredients");
      const requested = await store.get(ingredientId);
      if (!requested) return [];
      const conceptId = requested.detail.ingredient.conceptId;
      const concept = conceptId === ingredientId ? requested : await store.get(conceptId);
      const sources = concept && concept.id !== requested.id ? [requested, concept] : [requested];

      return sources.flatMap((source) => source.detail.externalMappings
        .filter((mapping) => {
          if (mapping.reviewStatus !== "approved") return false;
          if (usageScope && !mapping.usageScopes.includes(usageScope)) return false;
          if (source.id === requested.id) return true;
          return mapping.mappingLevel === "concept"
            && requested.recordRole === "form_projection"
            && allowsFormProjectionInheritance(mapping.metadata);
        })
        .map((mapping) => {
          const inheritedFromConcept = source.id !== requested.id;
          const effectiveLossiness = new Set(mapping.lossiness);
          if (inheritedFromConcept && requested.formCode !== source.formCode) effectiveLossiness.add("form");
          if (inheritedFromConcept && requested.variantId !== source.variantId) effectiveLossiness.add("variant");
          if (inheritedFromConcept && requested.processState !== source.processState) {
            effectiveLossiness.add("process_state");
          }
          return {
            requestedIngredientId: requested.id,
            sourceIngredientId: source.id,
            inheritedFromConcept,
            effectiveLossiness: [...effectiveLossiness],
            mapping,
          };
        }));
    });
  }

  async listSources() {
    return this.context.read(["catalogSources"], async (transaction) => {
      const records = await transaction.objectStore("catalogSources").getAll();
      return records.sort((left, right) => left.provider.localeCompare(right.provider)
        || left.datasetName.localeCompare(right.datasetName));
    });
  }

  async listImportBatches(sourceId?: string) {
    return this.context.read(["catalogImportBatches"], async (transaction) => {
      const store = transaction.objectStore("catalogImportBatches");
      const records = sourceId ? await store.index("by-source").getAll(sourceId) : await store.getAll();
      return records.sort((left, right) => right.importedAt.localeCompare(left.importedAt));
    });
  }

  async listIngredientForms() {
    return this.context.read(["catalogIngredientForms"], async (transaction) => {
      const records = await transaction.objectStore("catalogIngredientForms").getAll();
      return records.sort((left, right) => left.code.localeCompare(right.code));
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

function allowsFormProjectionInheritance(metadata: Record<string, unknown>) {
  const policy = metadata.conceptFormInheritance;
  return Boolean(policy && typeof policy === "object" && !Array.isArray(policy)
    && (policy as Record<string, unknown>).appliesToFormProjections === true);
}

function catalogSearchRank(canonicalNameKey: string, approvedAliasKeys: string[], text: string) {
  if (!text) return 3;
  if (canonicalNameKey === text) return 0;
  if (approvedAliasKeys.some((key) => key.endsWith(`:${text}`))) return 1;
  return 2;
}
