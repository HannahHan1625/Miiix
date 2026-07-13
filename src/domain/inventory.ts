export type StorageZone = "fridge" | "freezer" | "room" | "seasoning";
export type AmountMode = "count" | "weight";
export type Freshness = "fresh" | "good" | "soon" | "danger";
export type UploadMethod = "photo" | "online" | "receipt" | "manual";
export type RecognitionStatus = "queued" | "selected" | "ignored";

export type FoodInfo = {
  id: string;
  name: string;
  level1: string;
  level2: string;
  level3: string;
  photo: string;
  storage: StorageZone;
  storageTags: string[];
  shelfLifeDays: number;
  defaultMode: AmountMode;
  defaultCount: number;
  defaultWeight: number;
  unit: string;
  price: number;
  caloriesPer100g: number;
};

export type InventoryItem = FoodInfo & {
  inventoryId: string;
  amountMode: AmountMode;
  amount: number;
  pricePaid: number;
  note: string;
  addedDaysAgo: number;
  customTags: string[];
};

export type RecognizedFood = {
  foodId: string;
  confidence: number;
  status: RecognitionStatus;
};

export function freshnessPercent(item: InventoryItem) {
  return Math.max(0, Math.min(100, Math.round(((item.shelfLifeDays - item.addedDaysAgo) / item.shelfLifeDays) * 100)));
}

export function freshnessLevel(item: InventoryItem): Freshness {
  const score = freshnessPercent(item);
  if (score >= 75) return "fresh";
  if (score >= 45) return "good";
  if (score >= 18) return "soon";
  return "danger";
}

export function freshnessCopy(item: InventoryItem) {
  const percent = freshnessPercent(item);
  const label = {
    fresh: "新鲜",
    good: "稳定",
    soon: "尽快吃",
    danger: "马上处理",
  }[freshnessLevel(item)];
  return `${label} ${percent}%`;
}

export function amountText(item: InventoryItem) {
  if (item.amountMode === "count") return `${item.amount}${item.unit}`;
  return `${item.amount}g`;
}

export function storageText(storage: StorageZone) {
  return {
    fridge: "冷藏",
    freezer: "冷冻",
    room: "室温保存",
    seasoning: "避光防潮",
  }[storage];
}
