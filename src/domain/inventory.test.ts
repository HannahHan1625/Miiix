import { describe, expect, it } from "vitest";
import {
  freshnessCopy,
  freshnessLevel,
  freshnessPercent,
  type InventoryItem,
} from "./inventory";

const inventoryFixture = (shelfLifeDays: number | null, addedDaysAgo: number): InventoryItem => ({
  id: "ingredient-test",
  conceptId: "ingredient-test",
  variantId: null,
  formCode: "unspecified",
  processState: "raw",
  name: "测试食材",
  level1: "测试",
  level2: "测试",
  level3: "测试食材",
  kind: "raw",
  photo: "",
  storage: "fridge",
  storageTags: [],
  shelfLifeDays,
  defaultMode: "mass",
  supportedModes: ["mass"],
  defaultAmount: 100,
  defaultUnitId: "unit-g",
  unitIdsByMode: { mass: "unit-g" },
  unitLabelsByMode: { mass: "克" },
  unitBaseFactorsByMode: { mass: 1 },
  referencePrice: null,
  caloriesPer100g: null,
  inventoryId: "lot-test",
  amountMode: "mass",
  amount: 100,
  pricePaid: null,
  note: "",
  addedDaysAgo,
  customTags: [],
  expiresAtISO: null,
});

describe("inventory freshness", () => {
  it("keeps an unknown shelf life unknown instead of inventing 50 percent", () => {
    const item = inventoryFixture(null, 2);

    expect(freshnessPercent(item)).toBeNull();
    expect(freshnessLevel(item)).toBe("unknown");
    expect(freshnessCopy(item)).toBe("期限待确认");
  });

  it("calculates a percentage only when a real shelf-life value exists", () => {
    const item = inventoryFixture(10, 2);

    expect(freshnessPercent(item)).toBe(80);
    expect(freshnessCopy(item)).toBe("新鲜 80%");
  });
});
