import { Apple, Carrot, Drumstick, Fish, Leaf, Wheat } from "lucide-react";
import type { AmountMode, InventoryItem, UploadMethod } from "../domain/inventory";
import type { FoodPreference, KitchenTool, Recipe } from "../domain/recipe";
import {
  catalogCategoryTree,
  catalogFoodLibrary,
  getProjectedFood,
} from "./catalogProjection";

export const fallbackImage =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180'%3E%3Crect width='240' height='180' fill='%23fff6dc'/%3E%3Ccircle cx='120' cy='90' r='46' fill='%23d8eafa'/%3E%3Cpath d='M83 104c24-38 67-38 74 0' fill='none' stroke='%238ba6b8' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E";

const localPhoto = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">${body}</svg>`,
  )}`;

export const recipeImages = {
  eggplantRice: localPhoto("<rect width='240' height='180' fill='#fff3e4'/><ellipse cx='120' cy='98' rx='75' ry='43' fill='#f7ead5'/><path d='M76 96c22-31 62-37 91-4' fill='none' stroke='#8a5178' stroke-width='20' stroke-linecap='round'/><text x='120' y='154' text-anchor='middle' font-family='system-ui' font-size='18' font-weight='700' fill='#5a3d38'>茄子猪肉末盖饭</text>"),
  peachDrink: localPhoto("<rect width='240' height='180' fill='#fff3ef'/><rect x='78' y='35' width='84' height='104' rx='24' fill='#f4b8ad'/><circle cx='105' cy='74' r='17' fill='#cf3959'/><circle cx='137' cy='97' r='20' fill='#f2c27f'/><text x='120' y='162' text-anchor='middle' font-family='system-ui' font-size='18' font-weight='700' fill='#723f49'>杨梅桃饮</text>"),
  steamedEgg: localPhoto("<rect width='240' height='180' fill='#f6fbff'/><ellipse cx='120' cy='101' rx='71' ry='38' fill='#d9eaf2'/><ellipse cx='120' cy='91' rx='58' ry='28' fill='#f5d77f'/><text x='120' y='160' text-anchor='middle' font-family='system-ui' font-size='18' font-weight='700' fill='#4b5d68'>猪肉末蒸蛋</text>"),
  pepperEgg: localPhoto("<rect width='240' height='180' fill='#f4faef'/><ellipse cx='120' cy='100' rx='72' ry='40' fill='#e9e2c7'/><path d='M78 91c21-15 39-9 50 7 14-24 32-24 48-10' fill='none' stroke='#6c9d59' stroke-width='15' stroke-linecap='round'/><circle cx='105' cy='82' r='18' fill='#f1cf64'/><text x='120' y='160' text-anchor='middle' font-family='system-ui' font-size='18' font-weight='700' fill='#4d6442'>青椒炒蛋</text>"),
};

const toolPhotos = {
  wok: localPhoto("<defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#2d3436'/><stop offset='1' stop-color='#6f777a'/></linearGradient></defs><rect width='240' height='180' fill='#fffaf0'/><g filter='drop-shadow(0 12px 12px rgba(39,49,58,.22))'><path d='M48 98c13 34 132 34 146 0' fill='url(#g)'/><ellipse cx='121' cy='95' rx='73' ry='26' fill='#1f2528'/><ellipse cx='121' cy='89' rx='57' ry='15' fill='#4f5b5f'/><path d='M187 91c23-7 39-6 47 3' fill='none' stroke='#4a4f50' stroke-width='10' stroke-linecap='round'/><path d='M55 90c-18-6-32-4-42 4' fill='none' stroke='#4a4f50' stroke-width='8' stroke-linecap='round'/><path d='M94 80c12-15 38-18 56-6' fill='none' stroke='#e9d9a8' stroke-width='4' stroke-linecap='round'/></g>"),
  oven: localPhoto("<rect width='240' height='180' fill='#fff7e8'/><g filter='drop-shadow(0 14px 14px rgba(39,49,58,.2))'><rect x='47' y='43' width='146' height='94' rx='18' fill='#f0d0b7' stroke='#c28b78' stroke-width='4'/><rect x='66' y='62' width='78' height='49' rx='10' fill='#fffdf5' stroke='#8b8f91' stroke-width='4'/><circle cx='166' cy='70' r='9' fill='#fffdf5' stroke='#8b8f91' stroke-width='4'/><circle cx='166' cy='101' r='9' fill='#fffdf5' stroke='#8b8f91' stroke-width='4'/><rect x='74' y='119' width='92' height='8' rx='4' fill='#8b8f91'/><path d='M84 83c14 12 31 12 44 0' fill='none' stroke='#f6c66f' stroke-width='5' stroke-linecap='round'/></g>"),
  juicer: localPhoto("<rect width='240' height='180' fill='#f5fbf8'/><g filter='drop-shadow(0 14px 14px rgba(39,49,58,.18))'><path d='M85 38h62l-8 78H96z' fill='#d7ebee' stroke='#8ea9ac' stroke-width='4'/><path d='M100 51h30l-4 51h-22z' fill='#f7df85'/><path d='M149 58c25 9 22 42-5 47' fill='none' stroke='#8ea9ac' stroke-width='7' stroke-linecap='round'/><rect x='87' y='117' width='62' height='18' rx='7' fill='#9fbec8'/><rect x='76' y='135' width='86' height='14' rx='7' fill='#7e9299'/><circle cx='119' cy='130' r='4' fill='#fffdf5'/></g>"),
  induction: localPhoto("<rect width='240' height='180' fill='#f8f7f5'/><g filter='drop-shadow(0 13px 14px rgba(39,49,58,.18))'><rect x='48' y='61' width='144' height='76' rx='18' fill='#f7f4ef' stroke='#c5bbb0' stroke-width='4'/><circle cx='101' cy='98' r='27' fill='none' stroke='#647176' stroke-width='5'/><circle cx='101' cy='98' r='15' fill='none' stroke='#9aa5a9' stroke-width='3'/><rect x='142' y='82' width='30' height='18' rx='5' fill='#27313a'/><circle cx='151' cy='114' r='5' fill='#f2c9bd'/><circle cx='169' cy='114' r='5' fill='#b9d9ea'/></g>"),
  soyMilk: localPhoto("<rect width='240' height='180' fill='#fffaf0'/><g filter='drop-shadow(0 14px 14px rgba(39,49,58,.18))'><path d='M83 45h70l-9 92H92z' fill='#f7f1df' stroke='#b6aaa0' stroke-width='4'/><path d='M95 58h46l-5 49H100z' fill='#fffdf5' stroke='#d8cbb8' stroke-width='3'/><path d='M154 63c24 6 25 43 1 52' fill='none' stroke='#b6aaa0' stroke-width='7' stroke-linecap='round'/><rect x='97' y='113' width='39' height='14' rx='7' fill='#f6df8f'/><circle cx='116' cy='120' r='4' fill='#8b6b1f'/><rect x='72' y='137' width='96' height='13' rx='7' fill='#cddfba'/></g>"),
};

const categoryIcons = [Drumstick, Carrot, Wheat, Leaf, Fish, Apple];

export const categoryTree = catalogCategoryTree.map((category, index) => ({
  ...category,
  icon: categoryIcons[index % categoryIcons.length],
}));

export const foodLibrary = catalogFoodLibrary;

function requiredProjectedFood(idOrLegacyId: string) {
  const food = getProjectedFood(idOrLegacyId);
  if (!food) throw new Error(`Missing catalog projection: ${idOrLegacyId}`);
  return food;
}

export const recognitionPresets: Record<Exclude<UploadMethod, "manual">, Array<{ foodId: string; confidence: number }>> = {
  photo: [
    { foodId: requiredProjectedFood("chickenWing").id, confidence: 92 },
    { foodId: requiredProjectedFood("pepper").id, confidence: 84 },
    { foodId: requiredProjectedFood("egg").id, confidence: 79 },
  ],
  online: [
    { foodId: requiredProjectedFood("peach").id, confidence: 91 },
    { foodId: requiredProjectedFood("yangmei").id, confidence: 88 },
    { foodId: requiredProjectedFood("lemon").id, confidence: 76 },
  ],
  receipt: [
    { foodId: requiredProjectedFood("eggplant").id, confidence: 89 },
    { foodId: requiredProjectedFood("pork").id, confidence: 83 },
    { foodId: requiredProjectedFood("soy").id, confidence: 71 },
  ],
};

export const kitchenTools: KitchenTool[] = [
  { id: "wok", name: "复古炒锅", subtitle: "爆炒 / 盖饭", tone: "#c7dcef", image: toolPhotos.wok },
  { id: "steamer", name: "白色蒸锅", subtitle: "蒸蛋 / 清蒸", tone: "#f4df9d", image: "/assets/tool-steamer-reference.png" },
  { id: "oven", name: "奶油烤箱", subtitle: "焗烤 / 甜点", tone: "#f2c9bd", image: toolPhotos.oven },
  { id: "induction", name: "电磁炉", subtitle: "快煎 / 小火炖", tone: "#d8eafa", image: toolPhotos.induction },
  { id: "juicer", name: "果汁机", subtitle: "果汁 / 奶昔", tone: "#d6ead7", image: toolPhotos.juicer },
  { id: "soyMilk", name: "豆浆机", subtitle: "豆浆 / 浓汤", tone: "#dfe8c8", image: toolPhotos.soyMilk },
  { id: "coffee", name: "复古咖啡机", subtitle: "咖啡 / 特调", tone: "#f6dfa6", image: "/assets/tool-coffee-reference.png" },
];

export const foodPreferences: FoodPreference[] = [
  {
    id: "quick",
    label: "省事快手",
    desc: "少洗碗，15 分钟内解决一餐",
    cuisine: "快手家常",
    difficulty: "轻松",
    minutes: 12,
    calorieBias: 0.92,
    tone: "#f4df9d",
    tags: ["低洗碗", "一人食"],
  },
  {
    id: "fresh",
    label: "清爽低负担",
    desc: "更轻、更干净，优先消耗新鲜食材",
    cuisine: "清爽轻食",
    difficulty: "轻松",
    minutes: 16,
    calorieBias: 0.72,
    tone: "#b9d9ea",
    tags: ["清爽", "低负担"],
  },
  {
    id: "zhejiang",
    label: "浙江口味",
    desc: "咸鲜带甜，保留你熟悉的底色",
    cuisine: "江浙家常",
    difficulty: "认真",
    minutes: 18,
    calorieBias: 1,
    tone: "#f2c9bd",
    tags: ["咸鲜", "微甜"],
  },
  {
    id: "creative",
    label: "创新一点",
    desc: "允许水果、香气和跨菜系组合",
    cuisine: "灵感混合",
    difficulty: "挑战",
    minutes: 22,
    calorieBias: 1.08,
    tone: "#d6ead7",
    tags: ["实验", "惊喜"],
  },
];

function stocked(foodId: string, amount: number, mode: AmountMode, addedDaysAgo: number, pricePaid: number): InventoryItem {
  const base = requiredProjectedFood(foodId);
  return {
    ...base,
    inventoryId: `${foodId}-${addedDaysAgo}`,
    amount,
    amountMode: mode,
    pricePaid,
    note: "",
    addedDaysAgo,
    customTags: [],
    expiresAtISO: null,
  };
}

function recipeIngredient(idOrLegacyId: string, role: Recipe["ingredients"][number]["role"]) {
  const food = requiredProjectedFood(idOrLegacyId);
  return { ingredientId: food.id, name: food.name, role };
}

export const initialInventory: InventoryItem[] = [
  stocked("egg", 4, "count", 1, 4.8),
  stocked("eggplant", 1, "count", 1, 3.5),
  stocked("pork", 200, "mass", 2, 7.2),
  stocked("pepper", 2, "count", 1, 4.2),
  stocked("peach", 2, "count", 0, 7.9),
  stocked("yangmei", 350, "mass", 1, 18.8),
  stocked("rice", 1, "package", 0, 2),
  stocked("soy", 500, "volume", 20, 12),
];

export const recipesSeed: Recipe[] = [
  {
    id: "eggplant-pork-rice",
    title: "肉沫青椒茄子盖饭",
    cuisine: "江浙家常",
    difficulty: "认真",
    minutes: 18,
    calories: 520,
    image: recipeImages.eggplantRice,
    ingredients: [
      recipeIngredient("eggplant", "main"),
      recipeIngredient("pork", "main"),
      recipeIngredient("pepper", "main"),
      recipeIngredient("rice", "main"),
      recipeIngredient("soy", "seasoning"),
    ],
    toolId: "wok",
    reason: "把临期肉沫和茄子变成完整一餐，风险低但满足感高。",
    steps: ["茄子切条，青椒切块。", "肉沫炒散，加生抽。", "放茄子焖软，下青椒收汁。", "盖到米饭上。"],
  },
  {
    id: "yangmei-peach-soda",
    title: "杨梅桃气泡饮",
    cuisine: "现代冷饮",
    difficulty: "轻松",
    minutes: 8,
    calories: 138,
    image: recipeImages.peachDrink,
    ingredients: [
      recipeIngredient("yangmei", "main"),
      recipeIngredient("peach", "main"),
      recipeIngredient("lemon", "seasoning"),
      recipeIngredient("white-sugar", "seasoning"),
    ],
    toolId: "juicer",
    reason: "不烧菜也能优先消耗好水果，适合一个人偷懒但想精致一点。",
    steps: ["杨梅轻压出汁，桃切块。", "加柠檬汁和少量白砂糖。", "倒入气泡水或冰水。"],
  },
  {
    id: "steamed-egg",
    title: "青椒肉沫蒸蛋",
    cuisine: "中式蒸菜",
    difficulty: "轻松",
    minutes: 15,
    calories: 310,
    image: recipeImages.steamedEgg,
    ingredients: [
      recipeIngredient("egg", "main"),
      recipeIngredient("pork", "main"),
      recipeIngredient("pepper", "main"),
      recipeIngredient("soy", "seasoning"),
    ],
    toolId: "steamer",
    reason: "洗碗少，口感软，适合冰箱里东西不多的时候。",
    steps: ["鸡蛋加温水打散。", "肉沫炒香铺底。", "蒸 10 分钟后撒青椒碎和生抽。"],
  },
  {
    id: "pepper-egg",
    title: "青椒炒蛋",
    cuisine: "快手家常",
    difficulty: "轻松",
    minutes: 10,
    calories: 260,
    image: recipeImages.pepperEgg,
    ingredients: [
      recipeIngredient("pepper", "main"),
      recipeIngredient("egg", "main"),
      recipeIngredient("soy", "seasoning"),
    ],
    toolId: "wok",
    reason: "最短路径解决“今天不知道吃什么”。",
    steps: ["鸡蛋先炒成大块。", "青椒炒到断生。", "倒回鸡蛋，加生抽调味。"],
  },
];
