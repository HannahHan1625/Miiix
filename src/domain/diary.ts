import type { InventoryItem } from "./inventory";
import type { KitchenTool, Recipe } from "./recipe";

export type DiaryEntry = {
  id: string;
  recipeTitle: string;
  date: string;
  dateISO: string;
  source: string;
  note: string;
  tags: string[];
};

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateByDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return toISODate(date);
}

export function todayISO() {
  return dateByDaysAgo(0);
}

export function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function sameMonth(leftISO: string, rightISO: string) {
  const left = parseISODate(leftISO);
  const right = parseISODate(rightISO);
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function calendarDatesFor(anchorISO: string) {
  const anchor = parseISODate(anchorISO);
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toISODate(date);
  });
}

export function dateTitle(iso: string) {
  const date = parseISODate(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function monthTitle(iso: string) {
  const date = parseISODate(iso);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function inventoryDate(item: InventoryItem) {
  return dateByDaysAgo(item.addedDaysAgo);
}

export function createDiaryEntry(
  recipe: Recipe,
  source: string,
  tool: KitchenTool,
  completedDateISO: string,
  timestamp = Date.now(),
): DiaryEntry {
  return {
    id: `${recipe.id}-${timestamp}`,
    recipeTitle: recipe.title,
    date: "今天",
    dateISO: completedDateISO,
    source,
    note: `由 ${source} 完成制作；这条记录会进入后续口味偏好学习。`,
    tags: [recipe.cuisine, recipe.difficulty, tool.name],
  };
}
