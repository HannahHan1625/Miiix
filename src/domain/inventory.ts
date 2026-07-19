import type { IngredientFormCode, IngredientProcessState } from "./persistence";

export type StorageZone = "fridge" | "freezer" | "room" | "dryDark";
export type AmountMode = "count" | "mass" | "volume" | "package";
export type Freshness = "fresh" | "good" | "soon" | "danger" | "unknown";
export type UploadMethod = "photo" | "online" | "receipt" | "manual";
export type RecognitionStatus = "queued" | "selected" | "ignored";

export type FoodInfo = {
  id: string;
  conceptId: string;
  variantId: string | null;
  formCode: IngredientFormCode;
  processState: IngredientProcessState;
  name: string;
  level1: string;
  level2: string;
  level3: string;
  kind: "raw" | "processed" | "condiment" | "beverage" | "dish_component";
  photo: string;
  storage: StorageZone;
  storageTags: string[];
  shelfLifeDays: number | null;
  defaultMode: AmountMode;
  supportedModes: AmountMode[];
  defaultAmount: number;
  defaultUnitId: string;
  unitIdsByMode: Partial<Record<AmountMode, string>>;
  unitLabelsByMode: Partial<Record<AmountMode, string>>;
  unitBaseFactorsByMode: Partial<Record<AmountMode, number>>;
  referencePrice: null;
  caloriesPer100g: number | null;
};

export type InventoryItem = FoodInfo & {
  inventoryId: string;
  amountMode: AmountMode;
  amount: number;
  pricePaid: number | null;
  note: string;
  addedDaysAgo: number;
  customTags: string[];
  expiresAtISO: string | null;
};

export type RecognizedFood = {
  foodId: string;
  confidence: number;
  status: RecognitionStatus;
};

export function freshnessPercent(item: InventoryItem) {
  if (!item.shelfLifeDays || item.shelfLifeDays <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(((item.shelfLifeDays - item.addedDaysAgo) / item.shelfLifeDays) * 100)));
}

export function freshnessLevel(item: InventoryItem): Freshness {
  const score = freshnessPercent(item);
  if (score === null) return "unknown";
  if (score >= 75) return "fresh";
  if (score >= 45) return "good";
  if (score >= 18) return "soon";
  return "danger";
}

export function freshnessCopy(item: InventoryItem) {
  const percent = freshnessPercent(item);
  if (percent === null) return "期限待确认";
  const label = {
    fresh: "新鲜",
    good: "稳定",
    soon: "尽快吃",
    danger: "马上处理",
    unknown: "期限待确认",
  }[freshnessLevel(item)];
  return `${label} ${percent}%`;
}

export function amountText(item: InventoryItem) {
  return `${item.amount}${item.unitLabelsByMode[item.amountMode] ?? ""}`;
}

export function amountModeText(mode: AmountMode) {
  return {
    count: "件数",
    mass: "克重",
    volume: "容量",
    package: "包装",
  }[mode];
}

export function storageText(storage: StorageZone) {
  return {
    fridge: "冷藏",
    freezer: "冷冻",
    room: "室温保存",
    dryDark: "避光防潮",
  }[storage];
}
