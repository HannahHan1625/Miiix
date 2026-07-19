import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import catalogSchema from "./ingredient-catalog.schema.json";
import type { IngredientCatalogDocument } from "./types";
import {
  normalizeCatalogAlias,
  v042GoldenCatalog,
  validateIngredientCatalog,
} from "./validation";

const cloneCatalog = (): IngredientCatalogDocument =>
  JSON.parse(JSON.stringify(v042GoldenCatalog)) as IngredientCatalogDocument;

const issueCodes = (document: IngredientCatalogDocument): string[] =>
  validateIngredientCatalog(document).issues.map((issue) => issue.code);

describe("v0.4.2 ingredient catalog", () => {
  it("passes the checked-in Draft 2020-12 JSON Schema", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validateSchema = ajv.compile(catalogSchema);

    expect(validateSchema(v042GoldenCatalog), JSON.stringify(validateSchema.errors, null, 2)).toBe(true);
  });

  it("accepts the checked-in 30-record golden dataset", () => {
    const result = validateIngredientCatalog(v042GoldenCatalog);

    expect(result).toEqual({ valid: true, issues: [] });
    expect(v042GoldenCatalog.ingredients).toHaveLength(30);
    expect(v042GoldenCatalog.ingredients.every((ingredient) => ingredient.status === "active")).toBe(true);
    expect(v042GoldenCatalog.ingredients.every((ingredient) => ingredient.referencePrice === null)).toBe(true);
  });

  it("normalizes Unicode width, whitespace, punctuation, and symbols consistently", () => {
    expect(normalizeCatalogAlias(" Ａ－B · 鸡 翅 ")).toBe("ab鸡翅");
  });

  it("keeps the JSON Schema on Draft 2020-12 with closed object definitions", () => {
    expect(catalogSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(catalogSchema.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.ingredient.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.alias.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.storageProfile.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.nutritionProfile.additionalProperties).toBe(false);
    expect(catalogSchema.$defs.imageAsset.additionalProperties).toBe(false);
  });

  it("rejects an approved alias claimed by two ingredients", () => {
    const catalog = cloneCatalog();
    const alias = catalog.ingredients[0].aliases[0];
    alias.alias = "鸡翅";
    alias.normalizedAlias = "鸡翅";

    expect(issueCodes(catalog)).toContain("approved_alias_conflict");
  });

  it("requires an explicit region for regional aliases", () => {
    const catalog = cloneCatalog();
    const alias = catalog.ingredients.flatMap((ingredient) => ingredient.aliases)
      .find((candidate) => candidate.aliasType === "regional");
    if (!alias) throw new Error("Regional alias fixture is required");
    alias.region = null;

    expect(issueCodes(catalog)).toContain("alias_region");
  });

  it("rejects a legacy ID claimed by two ingredients", () => {
    const catalog = cloneCatalog();
    catalog.ingredients[1].legacyIds.push("egg");

    expect(issueCodes(catalog)).toContain("legacy_id_conflict");
  });

  it("rejects a broken three-level category chain", () => {
    const catalog = cloneCatalog();
    const ingredient = catalog.ingredients[0];
    ingredient.categoryLevel3Id = ingredient.categoryLevel2Id;
    ingredient.categoryId = ingredient.categoryLevel2Id;
    ingredient.categoryIds[2] = ingredient.categoryLevel2Id;

    expect(issueCodes(catalog)).toContain("category_levels");
  });

  it("rejects a default unit outside the unit catalog", () => {
    const catalog = cloneCatalog();
    catalog.ingredients[0].defaultUnitId = "20000000-0000-4000-8000-000000009999";

    expect(issueCodes(catalog)).toContain("default_unit");
  });

  it("rejects an amount mode that disagrees with the default unit dimension", () => {
    const catalog = cloneCatalog();
    const milk = catalog.ingredients.find((ingredient) => ingredient.canonicalNameZh === "牛奶");
    if (!milk) throw new Error("Milk fixture is required");
    milk.defaultAmountMode = "mass";

    expect(issueCodes(catalog)).toContain("default_amount_mode");
  });

  it("rejects storage facts without a registered source", () => {
    const catalog = cloneCatalog();
    catalog.ingredients[0].storageProfiles[0].sourceId = "10000000-0000-4000-8000-000000009999";

    expect(issueCodes(catalog)).toContain("missing_source");
  });

  it("rejects approved numeric nutrition without record-level provenance", () => {
    const catalog = cloneCatalog();
    const profile = catalog.ingredients[2].nutritionProfile;
    profile.caloriesKcal = 1;
    profile.proteinG = 1;
    profile.fatG = 1;
    profile.carbohydrateG = 1;
    profile.fiberG = 1;
    profile.reviewStatus = "approved";

    expect(issueCodes(catalog)).toContain("nutrition_provenance");
  });

  it("rejects multiple primary images", () => {
    const catalog = cloneCatalog();
    const duplicate = {
      ...catalog.ingredients[0].imageAssets[0],
      id: "90000000-0000-4000-8000-000000009999",
    };
    catalog.ingredients[0].imageAssets.push(duplicate);

    expect(issueCodes(catalog)).toContain("primary_image");
  });
});
