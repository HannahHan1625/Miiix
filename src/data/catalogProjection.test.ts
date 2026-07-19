import { describe, expect, it } from "vitest";
import {
  findCatalogIngredientByName,
  resolveCatalogIngredientId,
  resolveLegacyIngredientId,
} from "./catalogProjection";

const PORK_CONCEPT_ID = "50000000-0000-4000-8000-000000000006";
const GROUND_PORK_ID = "50000000-0000-4000-8000-000000000007";

describe("catalog identity boundaries", () => {
  it("does not interpret a legacy technical ID as a natural-language catalog ID", () => {
    expect(resolveCatalogIngredientId("pork")).toBeNull();
    expect(resolveLegacyIngredientId("pork")).toBe(GROUND_PORK_ID);
  });

  it("resolves broad and form-specific pork labels independently", () => {
    expect(findCatalogIngredientByName("pork")?.id).toBe(PORK_CONCEPT_ID);
    expect(findCatalogIngredientByName("ground pork")?.id).toBe(GROUND_PORK_ID);
    expect(findCatalogIngredientByName("minced pork")?.id).toBe(GROUND_PORK_ID);
    expect(findCatalogIngredientByName("肉末")).toBeNull();
  });
});
