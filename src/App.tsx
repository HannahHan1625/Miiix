import {
  Apple,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Camera,
  CalendarDays,
  Carrot,
  Check,
  ChefHat,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  Coffee,
  CookingPot,
  Drumstick,
  Fish,
  Heart,
  Home,
  Image,
  Keyboard,
  Leaf,
  Mic,
  NotebookPen,
  PackageCheck,
  PenLine,
  ReceiptText,
  Scale,
  ShoppingBag,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Tags,
  Timer,
  Upload,
  Utensils,
  Wheat,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const PRODUCT_VERSION = "v0.3.5";
const VERSION_NAME = "完整推荐卡";

type View = "home" | "warehouse" | "recipes" | "diary";
type UploadMethod = "photo" | "online" | "receipt" | "manual";
type StorageZone = "fridge" | "freezer" | "room" | "seasoning";
type AmountMode = "count" | "weight";
type Freshness = "fresh" | "good" | "soon" | "danger";
type RecipeFilter = "all" | "favorite" | "cooked";
type RecognitionStatus = "queued" | "selected" | "ignored";
type RecipeInputMode = "photo" | "voice";
type FusionTray = "ingredients" | "tools" | "preferences";

type FoodInfo = {
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

type InventoryItem = FoodInfo & {
  inventoryId: string;
  amountMode: AmountMode;
  amount: number;
  pricePaid: number;
  note: string;
  addedDaysAgo: number;
  customTags: string[];
};

type Recipe = {
  id: string;
  title: string;
  cuisine: string;
  difficulty: "轻松" | "认真" | "挑战";
  minutes: number;
  calories: number;
  image: string;
  required: string[];
  toolId: string;
  reason: string;
  steps: string[];
};

type DiaryEntry = {
  id: string;
  recipeTitle: string;
  date: string;
  dateISO: string;
  source: string;
  note: string;
  tags: string[];
};

type ShoppingLine = {
  id: string;
  name: string;
  reason: string;
  owned: boolean;
};

type KitchenTool = {
  id: string;
  name: string;
  subtitle: string;
  tone: string;
  image: string;
};

type FoodPreference = {
  id: string;
  label: string;
  desc: string;
  cuisine: string;
  difficulty: Recipe["difficulty"];
  minutes: number;
  calorieBias: number;
  tone: string;
  tags: string[];
};

type RecognizedFood = {
  foodId: string;
  confidence: number;
  status: RecognitionStatus;
};

type RecipeInference = {
  title: string;
  confidence: number;
  clues: string[];
  flavor: string;
  steps: string[];
};

const fallbackImage =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180'%3E%3Crect width='240' height='180' fill='%23fff6dc'/%3E%3Ccircle cx='120' cy='90' r='46' fill='%23d8eafa'/%3E%3Cpath d='M83 104c24-38 67-38 74 0' fill='none' stroke='%238ba6b8' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E";

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateByDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return toISODate(date);
}

function todayISO() {
  return dateByDaysAgo(0);
}

const localPhoto = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">${body}</svg>`,
  )}`;

const foodPhotos = {
  egg: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=460&q=90",
  eggplant: "https://images.unsplash.com/photo-1722501561648-b28829d2f289?auto=format&fit=crop&w=460&q=90",
  pork: "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=460&q=90",
  pepper: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=460&q=90",
  peach: "https://images.unsplash.com/photo-1517355352485-3c18847c2f7d?auto=format&fit=crop&w=460&q=90",
  yangmei: localPhoto("<rect width='240' height='180' fill='#fff7e8'/><g filter='drop-shadow(0 10px 12px rgba(40,35,35,.22))'><circle cx='92' cy='93' r='28' fill='#b32645'/><circle cx='122' cy='75' r='25' fill='#ca3150'/><circle cx='148' cy='98' r='30' fill='#9e1f3c'/><circle cx='120' cy='119' r='27' fill='#d94b61'/><circle cx='170' cy='119' r='23' fill='#b52a44'/></g><g fill='#ffd0d4' opacity='.65'><circle cx='84' cy='84' r='4'/><circle cx='118' cy='68' r='4'/><circle cx='147' cy='92' r='3'/><circle cx='128' cy='118' r='4'/></g><path d='M114 51c14-14 32-16 52-11-16 8-25 19-30 33-6-10-13-16-22-22z' fill='#758c50'/>"),
  rice: localPhoto("<rect width='240' height='180' fill='#f7fbff'/><ellipse cx='120' cy='75' rx='72' ry='32' fill='#fff'/><g fill='#f5f0dc'><ellipse cx='82' cy='74' rx='14' ry='6'/><ellipse cx='110' cy='62' rx='18' ry='7'/><ellipse cx='139' cy='72' rx='16' ry='7'/><ellipse cx='159' cy='86' rx='15' ry='6'/><ellipse cx='104' cy='92' rx='17' ry='7'/></g><path d='M48 88c8 43 35 66 72 66s64-23 72-66c-36 20-108 20-144 0z' fill='#d9e7ea'/><ellipse cx='120' cy='88' rx='76' ry='22' fill='none' stroke='#c6d8de' stroke-width='7'/>"),
  soy: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=460&q=90",
  chickenWing: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=460&q=90",
  chickenBreast: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=460&q=90",
  beef: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=460&q=90",
  tofu: "https://images.unsplash.com/photo-1617490888069-57f308d428d9?auto=format&fit=crop&w=460&q=90",
  shrimp: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=460&q=90",
  lettuce: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=460&q=90",
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=460&q=90",
  lemon: "https://images.unsplash.com/photo-1587496679742-bad502958fbf?auto=format&fit=crop&w=460&q=90",
};

const recipeImages = {
  eggplantRice: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=720&q=90",
  peachDrink: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=720&q=90",
  steamedEgg: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=720&q=90",
  pepperEgg: "https://images.unsplash.com/photo-1495214783159-3503fd1b572d?auto=format&fit=crop&w=720&q=90",
};

const toolPhotos = {
  wok: localPhoto("<defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#2d3436'/><stop offset='1' stop-color='#6f777a'/></linearGradient></defs><rect width='240' height='180' fill='#fffaf0'/><g filter='drop-shadow(0 12px 12px rgba(39,49,58,.22))'><path d='M48 98c13 34 132 34 146 0' fill='url(#g)'/><ellipse cx='121' cy='95' rx='73' ry='26' fill='#1f2528'/><ellipse cx='121' cy='89' rx='57' ry='15' fill='#4f5b5f'/><path d='M187 91c23-7 39-6 47 3' fill='none' stroke='#4a4f50' stroke-width='10' stroke-linecap='round'/><path d='M55 90c-18-6-32-4-42 4' fill='none' stroke='#4a4f50' stroke-width='8' stroke-linecap='round'/><path d='M94 80c12-15 38-18 56-6' fill='none' stroke='#e9d9a8' stroke-width='4' stroke-linecap='round'/></g>"),
  oven: localPhoto("<rect width='240' height='180' fill='#fff7e8'/><g filter='drop-shadow(0 14px 14px rgba(39,49,58,.2))'><rect x='47' y='43' width='146' height='94' rx='18' fill='#f0d0b7' stroke='#c28b78' stroke-width='4'/><rect x='66' y='62' width='78' height='49' rx='10' fill='#fffdf5' stroke='#8b8f91' stroke-width='4'/><circle cx='166' cy='70' r='9' fill='#fffdf5' stroke='#8b8f91' stroke-width='4'/><circle cx='166' cy='101' r='9' fill='#fffdf5' stroke='#8b8f91' stroke-width='4'/><rect x='74' y='119' width='92' height='8' rx='4' fill='#8b8f91'/><path d='M84 83c14 12 31 12 44 0' fill='none' stroke='#f6c66f' stroke-width='5' stroke-linecap='round'/></g>"),
  juicer: localPhoto("<rect width='240' height='180' fill='#f5fbf8'/><g filter='drop-shadow(0 14px 14px rgba(39,49,58,.18))'><path d='M85 38h62l-8 78H96z' fill='#d7ebee' stroke='#8ea9ac' stroke-width='4'/><path d='M100 51h30l-4 51h-22z' fill='#f7df85'/><path d='M149 58c25 9 22 42-5 47' fill='none' stroke='#8ea9ac' stroke-width='7' stroke-linecap='round'/><rect x='87' y='117' width='62' height='18' rx='7' fill='#9fbec8'/><rect x='76' y='135' width='86' height='14' rx='7' fill='#7e9299'/><circle cx='119' cy='130' r='4' fill='#fffdf5'/></g>"),
  induction: localPhoto("<rect width='240' height='180' fill='#f8f7f5'/><g filter='drop-shadow(0 13px 14px rgba(39,49,58,.18))'><rect x='48' y='61' width='144' height='76' rx='18' fill='#f7f4ef' stroke='#c5bbb0' stroke-width='4'/><circle cx='101' cy='98' r='27' fill='none' stroke='#647176' stroke-width='5'/><circle cx='101' cy='98' r='15' fill='none' stroke='#9aa5a9' stroke-width='3'/><rect x='142' y='82' width='30' height='18' rx='5' fill='#27313a'/><circle cx='151' cy='114' r='5' fill='#f2c9bd'/><circle cx='169' cy='114' r='5' fill='#b9d9ea'/></g>"),
  soyMilk: localPhoto("<rect width='240' height='180' fill='#fffaf0'/><g filter='drop-shadow(0 14px 14px rgba(39,49,58,.18))'><path d='M83 45h70l-9 92H92z' fill='#f7f1df' stroke='#b6aaa0' stroke-width='4'/><path d='M95 58h46l-5 49H100z' fill='#fffdf5' stroke='#d8cbb8' stroke-width='3'/><path d='M154 63c24 6 25 43 1 52' fill='none' stroke='#b6aaa0' stroke-width='7' stroke-linecap='round'/><rect x='97' y='113' width='39' height='14' rx='7' fill='#f6df8f'/><circle cx='116' cy='120' r='4' fill='#8b6b1f'/><rect x='72' y='137' width='96' height='13' rx='7' fill='#cddfba'/></g>"),
};

const categoryTree = [
  {
    level1: "肉禽蛋品",
    icon: Drumstick,
    level2: [
      { name: "猪肉", level3: ["肉沫", "梅花肉", "排骨"] },
      { name: "牛肉", level3: ["牛肉片", "牛腩", "牛排"] },
      { name: "鸡肉", level3: ["鸡翅", "鸡爪", "鸡胸肉", "鸡腿肉"] },
      { name: "蛋类", level3: ["鸡蛋", "鸭蛋"] },
    ],
  },
  {
    level1: "水果",
    icon: Apple,
    level2: [
      { name: "桃李杏", level3: ["桃子", "黄桃"] },
      { name: "浆果", level3: ["杨梅", "蓝莓"] },
      { name: "柑橘", level3: ["柠檬", "橙子"] },
    ],
  },
  {
    level1: "蔬菜",
    icon: Carrot,
    level2: [
      { name: "茄果瓜类", level3: ["茄子", "青椒", "番茄"] },
      { name: "叶菜", level3: ["生菜", "小青菜"] },
      { name: "菌菇", level3: ["香菇", "口蘑"] },
    ],
  },
  {
    level1: "豆制品",
    icon: Leaf,
    level2: [{ name: "豆腐豆干", level3: ["北豆腐", "嫩豆腐", "豆干"] }],
  },
  {
    level1: "海鲜水产",
    icon: Fish,
    level2: [
      { name: "虾蟹", level3: ["鲜虾", "虾仁"] },
      { name: "鱼类", level3: ["鲈鱼", "三文鱼"] },
    ],
  },
  {
    level1: "粮油调味",
    icon: Wheat,
    level2: [
      { name: "主食", level3: ["米饭", "面条"] },
      { name: "调味", level3: ["生抽", "蜂蜜", "橄榄油"] },
    ],
  },
];

const foodLibrary: FoodInfo[] = [
  food("egg", "鸡蛋", "肉禽蛋品", "蛋类", "鸡蛋", foodPhotos.egg, "fridge", ["冷藏", "避免水洗后久放"], 30, "count", 6, 360, "个", 1.2, 143),
  food("pork", "肉沫", "肉禽蛋品", "猪肉", "肉沫", foodPhotos.pork, "freezer", ["冷冻", "分装密封"], 60, "weight", 1, 250, "g", 8.8, 395),
  food("chickenWing", "鸡翅", "肉禽蛋品", "鸡肉", "鸡翅", foodPhotos.chickenWing, "freezer", ["冷冻", "密封"], 90, "weight", 1, 500, "g", 18.9, 194),
  food("chickenFeet", "鸡爪", "肉禽蛋品", "鸡肉", "鸡爪", foodPhotos.chickenWing, "freezer", ["冷冻", "密封"], 90, "weight", 1, 400, "g", 16.8, 215),
  food("chickenBreast", "鸡胸肉", "肉禽蛋品", "鸡肉", "鸡胸肉", foodPhotos.chickenBreast, "freezer", ["冷冻", "低脂备餐"], 90, "weight", 1, 400, "g", 15.6, 165),
  food("chickenLeg", "鸡腿肉", "肉禽蛋品", "鸡肉", "鸡腿肉", foodPhotos.chickenBreast, "freezer", ["冷冻", "去骨分装"], 90, "weight", 1, 500, "g", 17.9, 181),
  food("beef", "牛肉片", "肉禽蛋品", "牛肉", "牛肉片", foodPhotos.beef, "freezer", ["冷冻", "分份"], 90, "weight", 1, 300, "g", 28.8, 250),
  food("eggplant", "茄子", "蔬菜", "茄果瓜类", "茄子", foodPhotos.eggplant, "fridge", ["冷藏", "避免潮湿"], 5, "count", 1, 300, "根", 3.5, 25),
  food("pepper", "青椒", "蔬菜", "茄果瓜类", "青椒", foodPhotos.pepper, "fridge", ["冷藏", "保鲜袋"], 7, "count", 2, 220, "个", 4.2, 22),
  food("tomato", "番茄", "蔬菜", "茄果瓜类", "番茄", foodPhotos.tomato, "room", ["室温保存", "成熟后冷藏"], 6, "count", 3, 450, "个", 5.5, 18),
  food("lettuce", "生菜", "蔬菜", "叶菜", "生菜", foodPhotos.lettuce, "fridge", ["冷藏", "厨房纸吸水"], 4, "count", 1, 350, "颗", 6.8, 16),
  food("peach", "桃子", "水果", "桃李杏", "桃子", foodPhotos.peach, "fridge", ["冷藏", "单层摆放"], 5, "count", 2, 300, "个", 7.9, 42),
  food("yangmei", "杨梅", "水果", "浆果", "杨梅", foodPhotos.yangmei, "fridge", ["冷藏", "优先食用"], 2, "weight", 1, 350, "g", 18.8, 30),
  food("lemon", "柠檬", "水果", "柑橘", "柠檬", foodPhotos.lemon, "fridge", ["冷藏", "避光"], 21, "count", 2, 220, "个", 4.8, 37),
  food("tofu", "北豆腐", "豆制品", "豆腐豆干", "北豆腐", foodPhotos.tofu, "fridge", ["冷藏", "泡水换水"], 3, "weight", 1, 400, "g", 4.5, 81),
  food("shrimp", "鲜虾", "海鲜水产", "虾蟹", "鲜虾", foodPhotos.shrimp, "freezer", ["冷冻", "去虾线"], 60, "weight", 1, 300, "g", 24.8, 99),
  food("rice", "米饭", "粮油调味", "主食", "米饭", foodPhotos.rice, "room", ["室温", "当天食用"], 1, "count", 1, 250, "碗", 2.0, 116),
  food("soy", "生抽", "粮油调味", "调味", "生抽", foodPhotos.soy, "seasoning", ["避光", "避免潮湿"], 365, "count", 1, 500, "瓶", 12.0, 53),
];

const recognitionPresets: Record<Exclude<UploadMethod, "manual">, Array<{ foodId: string; confidence: number }>> = {
  photo: [
    { foodId: "chickenWing", confidence: 92 },
    { foodId: "pepper", confidence: 84 },
    { foodId: "egg", confidence: 79 },
  ],
  online: [
    { foodId: "peach", confidence: 91 },
    { foodId: "yangmei", confidence: 88 },
    { foodId: "lemon", confidence: 76 },
  ],
  receipt: [
    { foodId: "eggplant", confidence: 89 },
    { foodId: "pork", confidence: 83 },
    { foodId: "soy", confidence: 71 },
  ],
};

function food(
  id: string,
  name: string,
  level1: string,
  level2: string,
  level3: string,
  photo: string,
  storage: StorageZone,
  storageTags: string[],
  shelfLifeDays: number,
  defaultMode: AmountMode,
  defaultCount: number,
  defaultWeight: number,
  unit: string,
  price: number,
  caloriesPer100g: number,
): FoodInfo {
  return {
    id,
    name,
    level1,
    level2,
    level3,
    photo,
    storage,
    storageTags,
    shelfLifeDays,
    defaultMode,
    defaultCount,
    defaultWeight,
    unit,
    price,
    caloriesPer100g,
  };
}

const kitchenTools: KitchenTool[] = [
  { id: "wok", name: "复古炒锅", subtitle: "爆炒 / 盖饭", tone: "#c7dcef", image: toolPhotos.wok },
  { id: "steamer", name: "白色蒸锅", subtitle: "蒸蛋 / 清蒸", tone: "#f4df9d", image: "/assets/tool-steamer-reference.png" },
  { id: "oven", name: "奶油烤箱", subtitle: "焗烤 / 甜点", tone: "#f2c9bd", image: toolPhotos.oven },
  { id: "induction", name: "电磁炉", subtitle: "快煎 / 小火炖", tone: "#d8eafa", image: toolPhotos.induction },
  { id: "juicer", name: "果汁机", subtitle: "果汁 / 奶昔", tone: "#d6ead7", image: toolPhotos.juicer },
  { id: "soyMilk", name: "豆浆机", subtitle: "豆浆 / 浓汤", tone: "#dfe8c8", image: toolPhotos.soyMilk },
  { id: "coffee", name: "复古咖啡机", subtitle: "咖啡 / 特调", tone: "#f6dfa6", image: "/assets/tool-coffee-reference.png" },
];

const foodPreferences: FoodPreference[] = [
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

const initialInventory: InventoryItem[] = [
  stocked("egg", 4, "count", 1, 4.8),
  stocked("eggplant", 1, "count", 1, 3.5),
  stocked("pork", 200, "weight", 2, 7.2),
  stocked("pepper", 2, "count", 1, 4.2),
  stocked("peach", 2, "count", 0, 7.9),
  stocked("yangmei", 350, "weight", 1, 18.8),
  stocked("rice", 1, "count", 0, 2),
  stocked("soy", 1, "count", 20, 12),
];

function stocked(foodId: string, amount: number, mode: AmountMode, addedDaysAgo: number, pricePaid: number): InventoryItem {
  const base = foodLibrary.find((item) => item.id === foodId);
  if (!base) throw new Error(`Missing food ${foodId}`);
  return {
    ...base,
    inventoryId: `${foodId}-${addedDaysAgo}`,
    amount,
    amountMode: mode,
    pricePaid,
    note: "",
    addedDaysAgo,
    customTags: [],
  };
}

const recipesSeed: Recipe[] = [
  {
    id: "eggplant-pork-rice",
    title: "肉沫青椒茄子盖饭",
    cuisine: "江浙家常",
    difficulty: "认真",
    minutes: 18,
    calories: 520,
    image: recipeImages.eggplantRice,
    required: ["茄子", "肉沫", "青椒", "米饭", "生抽"],
    toolId: "wok",
    reason: "把临期肉沫和茄子变成完整一餐，风险低但满足感高。",
    steps: ["茄子切条，青椒切块。", "肉沫炒散，加生抽。", "放茄子焖软，下青椒收汁。", "盖到米饭上。"],
  },
  {
    id: "yangmei-peach-soda",
    title: "杨梅桃子气泡饮",
    cuisine: "现代冷饮",
    difficulty: "轻松",
    minutes: 8,
    calories: 138,
    image: recipeImages.peachDrink,
    required: ["杨梅", "桃子", "柠檬", "蜂蜜"],
    toolId: "juicer",
    reason: "不烧菜也能优先消耗好水果，适合一个人偷懒但想精致一点。",
    steps: ["杨梅轻压出汁，桃子切块。", "加柠檬汁和少量蜂蜜。", "倒入气泡水或冰水。"],
  },
  {
    id: "steamed-egg",
    title: "青椒肉沫蒸蛋",
    cuisine: "中式蒸菜",
    difficulty: "轻松",
    minutes: 15,
    calories: 310,
    image: recipeImages.steamedEgg,
    required: ["鸡蛋", "肉沫", "青椒", "生抽"],
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
    required: ["青椒", "鸡蛋", "生抽"],
    toolId: "wok",
    reason: "最短路径解决“今天不知道吃什么”。",
    steps: ["鸡蛋先炒成大块。", "青椒炒到断生。", "倒回鸡蛋，加生抽调味。"],
  },
];

const uploadMethods = [
  { id: "photo", label: "拍照识别", icon: Camera, note: "适合冰箱现场拍摄，AI 识别后自动填充。" },
  { id: "online", label: "线上截图", icon: Image, note: "适合外卖买菜、盒马、叮咚订单截图。" },
  { id: "receipt", label: "小票", icon: ReceiptText, note: "适合线下超市购物小票。" },
  { id: "manual", label: "手动输入", icon: Keyboard, note: "最快补录，分类和默认值自动带出。" },
] satisfies { id: UploadMethod; label: string; icon: typeof Camera; note: string }[];

const personaLibrary = [
  { name: "晨光冰箱长", min: 76, desc: "库存结构清楚，做饭节奏稳定，适合开始养成自己的菜谱库。" },
  { name: "杨梅灵感师", min: 62, desc: "会被好食材点燃灵感，适合多做跨菜系尝试。" },
  { name: "冷藏巡逻员", min: 48, desc: "库存意识已经出现，但临期食材需要更主动处理。" },
  { name: "随缘开火人", min: 0, desc: "先把“今天吃什么”跑起来，别再靠意志力做饭。" },
];

function App() {
  const [view, setView] = useState<View>("home");
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClosing, setUploadClosing] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [method, setMethod] = useState<UploadMethod>("manual");
  const [level1, setLevel1] = useState("肉禽蛋品");
  const [level2, setLevel2] = useState("鸡肉");
  const [selectedFoodId, setSelectedFoodId] = useState("chickenWing");
  const [amountMode, setAmountMode] = useState<AmountMode>("weight");
  const [amount, setAmount] = useState(500);
  const [price, setPrice] = useState(18.9);
  const [note, setNote] = useState("冷冻分装");
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [activeToolId, setActiveToolId] = useState("wok");
  const [favorites, setFavorites] = useState<string[]>(["eggplant-pork-rice"]);
  const [cookedIds, setCookedIds] = useState<string[]>(["pepper-egg"]);
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [cuisineFilter, setCuisineFilter] = useState("全部");
  const [shoppingList, setShoppingList] = useState<ShoppingLine[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([
    {
      id: "diary-1",
      recipeTitle: "青椒炒蛋",
      date: "昨天",
      dateISO: dateByDaysAgo(1),
      source: "做过的菜",
      note: "下次可以加一点肉沫，口感更完整。",
      tags: ["快手", "家常", "低洗碗"],
    },
  ]);

  const selectedFood = foodLibrary.find((item) => item.id === selectedFoodId) ?? foodLibrary[0];
  const selectedTool = kitchenTools.find((tool) => tool.id === activeToolId) ?? kitchenTools[0];

  const stats = useMemo(() => {
    const storedScore = Math.min(100, Math.round((inventory.length / 14) * 100));
    const cookFrequency = 4;
    const cookedCount = diary.length + cookedIds.length;
    const freshnessScore = Math.round(
      inventory.reduce((sum, item) => sum + freshnessPercent(item), 0) / Math.max(inventory.length, 1),
    );
    const total = Math.round(storedScore * 0.32 + cookFrequency * 10 * 0.28 + cookedCount * 10 * 0.2 + freshnessScore * 0.2);
    const persona = personaLibrary.find((item) => total >= item.min) ?? personaLibrary[personaLibrary.length - 1];
    return { storedScore, cookFrequency, cookedCount, freshnessScore, total, persona };
  }, [cookedIds.length, diary.length, inventory]);

  const filteredRecipes = recipesSeed.filter((recipe) => {
    const byMode =
      recipeFilter === "all" ||
      (recipeFilter === "favorite" && favorites.includes(recipe.id)) ||
      (recipeFilter === "cooked" && cookedIds.includes(recipe.id));
    const byCuisine = cuisineFilter === "全部" || recipe.cuisine === cuisineFilter;
    return byMode && byCuisine;
  });

  const cuisineOptions = ["全部", ...Array.from(new Set(recipesSeed.map((recipe) => recipe.cuisine)))];

  function openUpload() {
    setUploadOpen(true);
    setUploadClosing(false);
    setUploadDone(false);
  }

  function closeUpload() {
    setUploadClosing(true);
    window.setTimeout(() => {
      setUploadOpen(false);
      setUploadClosing(false);
      setUploadDone(false);
      setRecognizedFoods([]);
    }, 260);
  }

  function completeUpload() {
    setUploadDone(true);
    window.setTimeout(() => {
      const timestamp = Date.now();
      const foodIds = recognizedFoods.filter((item) => item.status !== "ignored").map((item) => item.foodId);
      const targetFoodIds = foodIds.length ? foodIds : [selectedFood.id];
      const nextItems = targetFoodIds
        .map((foodId, index) => foodLibrary.find((item) => item.id === foodId) ?? selectedFood)
        .map((foodInfo, index): InventoryItem => {
          const isSelected = foodInfo.id === selectedFood.id;
          return {
            ...foodInfo,
            inventoryId: `${foodInfo.id}-${timestamp}-${index}`,
            amountMode: isSelected ? amountMode : foodInfo.defaultMode,
            amount: isSelected ? amount : foodInfo.defaultMode === "count" ? foodInfo.defaultCount : foodInfo.defaultWeight,
            pricePaid: isSelected ? price : foodInfo.price,
            note: isSelected ? note : "AI识别待确认",
            addedDaysAgo: 0,
            customTags: isSelected ? (note ? [note] : []) : ["AI识别待确认"],
          };
        });
      setInventory((current) => [...nextItems, ...current]);
      setUploadOpen(false);
      setUploadDone(false);
      setRecognizedFoods([]);
      setView("warehouse");
    }, 560);
  }

  function selectFood(foodId: string) {
    const next = foodLibrary.find((item) => item.id === foodId);
    if (!next) return;
    setSelectedFoodId(foodId);
    setAmountMode(next.defaultMode);
    setAmount(next.defaultMode === "count" ? next.defaultCount : next.defaultWeight);
    setPrice(next.price);
    setNote(next.storageTags[0] ?? "");
  }

  function chooseLevel1(nextLevel1: string) {
    const nextL2 = categoryTree.find((item) => item.level1 === nextLevel1)?.level2[0]?.name;
    const nextFood = foodLibrary.find((item) => item.level1 === nextLevel1 && item.level2 === nextL2);
    setLevel1(nextLevel1);
    if (nextL2) setLevel2(nextL2);
    if (nextFood) selectFood(nextFood.id);
  }

  function chooseLevel2(nextLevel2: string) {
    const nextFood = foodLibrary.find((item) => item.level1 === level1 && item.level2 === nextLevel2);
    setLevel2(nextLevel2);
    if (nextFood) selectFood(nextFood.id);
  }

  function toggleFavorite(recipeId: string) {
    setFavorites((current) =>
      current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [recipeId, ...current],
    );
  }

  function planToday(recipe: Recipe, source: string) {
    const ownedNames = new Set(inventory.map((item) => item.name));
    const lines = recipe.required.map((name) => ({
      id: `${recipe.id}-${name}-${Date.now()}`,
      name,
      reason: `今天吃《${recipe.title}》`,
      owned: ownedNames.has(name),
    }));
    const missingLines = lines.filter((line) => !line.owned);
    setShoppingList(
      missingLines.length
        ? missingLines
        : [{ id: `${recipe.id}-covered-${Date.now()}`, name: "库存已覆盖全部食材", reason: `《${recipe.title}》无需额外采购`, owned: false }],
    );
    setDiary((current) => [
      {
        id: `${recipe.id}-${Date.now()}`,
        recipeTitle: recipe.title,
        date: "今天",
        dateISO: todayISO(),
        source,
        note: `由 ${source} 加入今日计划；缺口食材已自动减去库存。`,
        tags: [recipe.cuisine, recipe.difficulty, selectedTool.name],
      },
      ...current,
    ]);
    setCookedIds((current) => (current.includes(recipe.id) ? current : [recipe.id, ...current]));
    setView("diary");
  }

  return (
    <div className="appShell">
      <div className="appFrame">
        <header className="topbar">
          <button className="brandButton" type="button" onClick={() => setView("home")}>
            <span className="brandMark">M</span>
            <span>
              <strong>Miiix</strong>
              <small>{PRODUCT_VERSION} {VERSION_NAME}</small>
            </span>
          </button>
          <div className="versionPill">{VERSION_NAME}</div>
        </header>

        <main className={`screen ${view === "warehouse" ? "warehouseScreen" : ""}`}>
          {view === "home" && (
            <HomeView
              stats={stats}
              inventory={inventory}
              openUpload={openUpload}
              setView={setView}
            />
          )}
          {view === "warehouse" && (
            <WarehouseView
              inventory={inventory}
              activeToolId={activeToolId}
              setActiveToolId={setActiveToolId}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              shoppingList={shoppingList}
              planToday={planToday}
            />
          )}
          {view === "recipes" && (
            <RecipesView
              recipes={filteredRecipes}
              recipeFilter={recipeFilter}
              setRecipeFilter={setRecipeFilter}
              cuisineFilter={cuisineFilter}
              setCuisineFilter={setCuisineFilter}
              cuisineOptions={cuisineOptions}
              favorites={favorites}
              cookedIds={cookedIds}
              toggleFavorite={toggleFavorite}
              planToday={planToday}
            />
          )}
          {view === "diary" && <DiaryView diary={diary} shoppingList={shoppingList} inventory={inventory} />}
        </main>

        <nav className="bottomNav" aria-label="主导航">
          <NavButton icon={<Home size={19} />} label="主页" active={view === "home"} onClick={() => setView("home")} />
          <NavButton icon={<PackageCheck size={19} />} label="仓库" active={view === "warehouse"} onClick={() => setView("warehouse")} />
          <NavButton icon={<BookOpen size={19} />} label="菜谱" active={view === "recipes"} onClick={() => setView("recipes")} />
          <NavButton icon={<NotebookPen size={19} />} label="日记" active={view === "diary"} onClick={() => setView("diary")} />
        </nav>
      </div>

      {uploadOpen && (
        <UploadSheet
          closing={uploadClosing}
          done={uploadDone}
          method={method}
          setMethod={setMethod}
          level1={level1}
          level2={level2}
          chooseLevel1={chooseLevel1}
          chooseLevel2={chooseLevel2}
          selectedFood={selectedFood}
          selectFood={selectFood}
          amountMode={amountMode}
          setAmountMode={setAmountMode}
          amount={amount}
          setAmount={setAmount}
          price={price}
          setPrice={setPrice}
          note={note}
          setNote={setNote}
          recognizedFoods={recognizedFoods}
          setRecognizedFoods={setRecognizedFoods}
          onBack={closeUpload}
          onDone={completeUpload}
        />
      )}
    </div>
  );
}

function HomeView({
  stats,
  inventory,
  openUpload,
  setView,
}: {
  stats: ReturnType<typeof useMemo> extends never ? never : {
    storedScore: number;
    cookFrequency: number;
    cookedCount: number;
    freshnessScore: number;
    total: number;
    persona: { name: string; desc: string; min: number };
  };
  inventory: InventoryItem[];
  openUpload: () => void;
  setView: (view: View) => void;
}) {
  return (
    <section className="homeStack">
      <div className="profilePanel">
        <div>
          <p className="eyebrow">Hannah's kitchen</p>
          <h1>早上好，Hannah</h1>
          <p>{stats.persona.desc}</p>
          <div className="levelBadge"><Sparkles size={15} /> {stats.persona.name}</div>
        </div>
        <div className="scoreOrb">
          <strong>{stats.total}</strong>
          <span>厨房生命力</span>
        </div>
      </div>

      <div className="metricGrid">
        <Metric label="库存整理" value={stats.storedScore} suffix="%" />
        <Metric label="做饭频率" value={stats.cookFrequency} suffix="次/周" />
        <Metric label="做过的菜" value={stats.cookedCount} suffix="道" />
        <Metric label="新鲜度" value={stats.freshnessScore} suffix="%" />
      </div>

      <button className="uploadEntry" type="button" onClick={openUpload}>
        <span><Upload size={22} /> 上传食材</span>
        <small>拍照、截图、小票、手动输入都从这里进入</small>
      </button>

      <div className="homeWarehouse">
        <div className="sectionHeader compactHeader">
          <div>
            <p className="eyebrow">Pocket warehouse</p>
            <h2>最近食材</h2>
          </div>
          <button className="ghostButton" type="button" onClick={() => setView("warehouse")}>进入仓库</button>
        </div>
        <IngredientPreview inventory={inventory} />
      </div>
    </section>
  );
}

function UploadSheet({
  closing,
  done,
  method,
  setMethod,
  level1,
  level2,
  chooseLevel1,
  chooseLevel2,
  selectedFood,
  selectFood,
  amountMode,
  setAmountMode,
  amount,
  setAmount,
  price,
  setPrice,
  note,
  setNote,
  recognizedFoods,
  setRecognizedFoods,
  onBack,
  onDone,
}: {
  closing: boolean;
  done: boolean;
  method: UploadMethod;
  setMethod: (method: UploadMethod) => void;
  level1: string;
  level2: string;
  chooseLevel1: (value: string) => void;
  chooseLevel2: (value: string) => void;
  selectedFood: FoodInfo;
  selectFood: (id: string) => void;
  amountMode: AmountMode;
  setAmountMode: (mode: AmountMode) => void;
  amount: number;
  setAmount: (value: number) => void;
  price: number;
  setPrice: (value: number) => void;
  note: string;
  setNote: (value: string) => void;
  recognizedFoods: RecognizedFood[];
  setRecognizedFoods: (value: RecognizedFood[]) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const secondLevels = categoryTree.find((item) => item.level1 === level1)?.level2 ?? [];
  const visibleFoods = foodLibrary.filter((item) => item.level1 === level1 && item.level2 === level2);
  const isAiMethod = method !== "manual";

  function chooseMethod(nextMethod: UploadMethod) {
    setMethod(nextMethod);
    setRecognizedFoods([]);
  }

  function runMockRecognition(nextMethod: Exclude<UploadMethod, "manual">) {
    const nextFoods = recognitionPresets[nextMethod].map((item, index) => ({
      ...item,
      status: index === 0 ? "selected" as RecognitionStatus : "queued" as RecognitionStatus,
    }));
    setRecognizedFoods(nextFoods);
    const firstFood = foodLibrary.find((item) => item.id === nextFoods[0]?.foodId);
    if (firstFood) selectFood(firstFood.id);
  }

  function selectRecognizedFood(foodId: string) {
    setRecognizedFoods(
      recognizedFoods.map((item) => ({
        ...item,
        status: item.foodId === foodId ? "selected" : item.status === "selected" ? "queued" : item.status,
      })),
    );
    selectFood(foodId);
  }

  function toggleRecognizedFood(foodId: string) {
    setRecognizedFoods(
      recognizedFoods.map((item) => {
        if (item.foodId !== foodId) return item;
        return { ...item, status: item.status === "ignored" ? "queued" : "ignored" };
      }),
    );
  }

  return (
    <div className={`uploadOverlay ${closing ? "closing" : ""} ${done ? "done" : ""}`}>
      <div className="uploadCard">
        <div className="uploadCardInner">
          <div className="uploadFace uploadFront">
            <header className="uploadHeader">
              <button type="button" onClick={onBack}><ChevronLeft size={20} /> 返回</button>
              <strong>上传食材</strong>
              <button type="button" onClick={onDone}>完成 <Check size={18} /></button>
            </header>

            <div className="methodGrid">
              {uploadMethods.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={method === item.id ? "active" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => chooseMethod(item.id)}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    <small>{item.note}</small>
                  </button>
                );
              })}
            </div>

            {isAiMethod && (
              <AiUploadRecognizer
                method={method}
                recognizedFoods={recognizedFoods}
                onUpload={() => runMockRecognition(method)}
                onSelect={selectRecognizedFood}
                onToggle={toggleRecognizedFood}
              />
            )}

            <CategoryPicker
              level1={level1}
              level2={level2}
              secondLevels={secondLevels}
              visibleFoods={visibleFoods}
              selectedFood={selectedFood}
              chooseLevel1={chooseLevel1}
              chooseLevel2={chooseLevel2}
              selectFood={selectFood}
            />

            <FoodEditor
              selectedFood={selectedFood}
              amountMode={amountMode}
              setAmountMode={setAmountMode}
              amount={amount}
              setAmount={setAmount}
              price={price}
              setPrice={setPrice}
              note={note}
              setNote={setNote}
            />
          </div>
          <div className="uploadFace uploadBack">
            <PackageCheck size={42} />
            <h2>{selectedFood.name} 已进入仓库</h2>
            <p>根据食材库默认值，已带入储存方式、保质期、数量和价格。现在跳转到仓库检查摆放。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiUploadRecognizer({
  method,
  recognizedFoods,
  onUpload,
  onSelect,
  onToggle,
}: {
  method: UploadMethod;
  recognizedFoods: RecognizedFood[];
  onUpload: () => void;
  onSelect: (foodId: string) => void;
  onToggle: (foodId: string) => void;
}) {
  const accept = method === "receipt" ? "image/*,.pdf" : "image/*";
  const handledCount = recognizedFoods.filter((item) => item.status !== "ignored").length;

  return (
    <div className="aiRecognizer">
      <label className="uploadDrop">
        <input type="file" accept={accept} onChange={onUpload} />
        <span><Upload size={18} /> {uploadActionText(method)}</span>
        <small>{methodText(method)}</small>
      </label>

      {recognizedFoods.length > 0 ? (
        <div className="aiResult">
          <Sparkles size={18} />
          <div>
            <strong>AI 识别到 {recognizedFoods.length} 个食材，准备处理 {handledCount} 个</strong>
            <p>点击图片选择要校正的食材；右上角角标表示是否会加入仓库。</p>
          </div>
        </div>
      ) : (
        <div className="aiResult empty">
          <Sparkles size={18} />
          <div>
            <strong>等待上传识别</strong>
            <p>上传后会以图片队列展示识别结果，每个食材都可选择处理或跳过。</p>
          </div>
        </div>
      )}

      {recognizedFoods.length > 0 && (
        <div className="recognizedFoodGrid">
          {recognizedFoods.map((item) => {
            const foodInfo = foodLibrary.find((food) => food.id === item.foodId);
            if (!foodInfo) return null;

            return (
              <article className={`recognizedFoodCard ${item.status}`} key={item.foodId}>
                <button className="recognizedFoodSelect" type="button" onClick={() => onSelect(item.foodId)}>
                  <span className="cornerBadge">{recognitionStatusText(item.status)}</span>
                  <FoodImage src={foodInfo.photo} alt={foodInfo.name} />
                  <strong>{foodInfo.name}</strong>
                  <small>{item.confidence}% 置信</small>
                </button>
                <button className="toggleRecognized" type="button" onClick={() => onToggle(item.foodId)}>
                  {item.status === "ignored" ? "恢复处理" : "跳过"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryPicker({
  level1,
  level2,
  secondLevels,
  visibleFoods,
  selectedFood,
  chooseLevel1,
  chooseLevel2,
  selectFood,
}: {
  level1: string;
  level2: string;
  secondLevels: { name: string; level3: string[] }[];
  visibleFoods: FoodInfo[];
  selectedFood: FoodInfo;
  chooseLevel1: (value: string) => void;
  chooseLevel2: (value: string) => void;
  selectFood: (id: string) => void;
}) {
  return (
    <div className="categoryBlock">
      <div className="railTags">
        {categoryTree.map((item) => {
          const Icon = item.icon;
          return (
            <button className={level1 === item.level1 ? "active" : ""} type="button" key={item.level1} onClick={() => chooseLevel1(item.level1)}>
              <Icon size={15} /> {item.level1}
            </button>
          );
        })}
      </div>
      <div className="railTags secondary">
        {secondLevels.map((item) => (
          <button className={level2 === item.name ? "active" : ""} type="button" key={item.name} onClick={() => chooseLevel2(item.name)}>
            {item.name}
          </button>
        ))}
      </div>
      <div className="foodChoiceGrid">
        {visibleFoods.map((food) => (
          <button className={selectedFood.id === food.id ? "selected" : ""} type="button" key={food.id} onClick={() => selectFood(food.id)}>
            <FoodImage src={food.photo} alt={food.name} />
            <strong>{food.level3}</strong>
            <small>{food.storageTags.join(" / ")}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function FoodEditor({
  selectedFood,
  amountMode,
  setAmountMode,
  amount,
  setAmount,
  price,
  setPrice,
  note,
  setNote,
}: {
  selectedFood: FoodInfo;
  amountMode: AmountMode;
  setAmountMode: (mode: AmountMode) => void;
  amount: number;
  setAmount: (value: number) => void;
  price: number;
  setPrice: (value: number) => void;
  note: string;
  setNote: (value: string) => void;
}) {
  const maxAmount = amountMode === "count" ? 12 : 1200;
  return (
    <div className="foodEditor">
      <div className="editorLine">
        <Snowflake size={17} />
        <span>推荐储存</span>
        <strong>{storageText(selectedFood.storage)}</strong>
        <small>{selectedFood.shelfLifeDays} 天建议期</small>
      </div>
      <div className="editorLine">
        <Scale size={17} />
        <span>记录方式</span>
        <div className="segmented">
          <button className={amountMode === "count" ? "active" : ""} type="button" onClick={() => setAmountMode("count")}>数量</button>
          <button className={amountMode === "weight" ? "active" : ""} type="button" onClick={() => setAmountMode("weight")}>克重</button>
        </div>
      </div>
      <label className="rangeLine">
        <span>{amountMode === "count" ? "数量" : "克重"}：{amount}{amountMode === "count" ? selectedFood.unit : "g"}</span>
        <input type="range" min={amountMode === "count" ? 1 : 50} max={maxAmount} step={amountMode === "count" ? 1 : 50} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
      </label>
      <label className="inputLine">
        <CircleDollarSign size={17} />
        <span>价格</span>
        <input type="number" min="0" step="0.1" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
      </label>
      <label className="inputLine">
        <Tags size={17} />
        <span>备注/标签</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
    </div>
  );
}

function WarehouseView({
  inventory,
  activeToolId,
  setActiveToolId,
  favorites,
  toggleFavorite,
  shoppingList,
  planToday,
}: {
  inventory: InventoryItem[];
  activeToolId: string;
  setActiveToolId: (id: string) => void;
  favorites: string[];
  toggleFavorite: (recipeId: string) => void;
  shoppingList: ShoppingLine[];
  planToday: (recipe: Recipe, source: string) => void;
}) {
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  const [activeTray, setActiveTray] = useState<FusionTray>("ingredients");
  const [preferenceId, setPreferenceId] = useState("quick");
  const [fusionCount, setFusionCount] = useState(0);
  const [recipeFlipped, setRecipeFlipped] = useState(false);
  const selectedTool = kitchenTools.find((tool) => tool.id === activeToolId) ?? kitchenTools[0];
  const selectedPreference = foodPreferences.find((item) => item.id === preferenceId) ?? foodPreferences[0];
  const selectedItems = selectedInventoryIds
    .map((id) => inventory.find((item) => item.inventoryId === id))
    .filter((item): item is InventoryItem => Boolean(item));
  const fusionRecipe = buildFusionRecipe(selectedItems, selectedTool, selectedPreference, fusionCount);
  const hasSelection = selectedItems.length > 0;

  function toggleIngredient(inventoryId: string) {
    setFusionCount(0);
    setRecipeFlipped(false);
    setSelectedInventoryIds((current) =>
      current.includes(inventoryId)
        ? current.filter((id) => id !== inventoryId)
        : current.length >= 5
          ? [...current.slice(1), inventoryId]
          : [...current, inventoryId],
    );
  }

  function clearWorkbench() {
    setSelectedInventoryIds([]);
    setFusionCount(0);
    setRecipeFlipped(false);
  }

  function fuseNow() {
    if (!hasSelection) return;
    setRecipeFlipped(false);
    setFusionCount((current) => current + 1);
  }

  function handleFusionAction() {
    if (!hasSelection) return;
    fuseNow();
  }

  return (
    <section className="fusionStudio">
      <div className={`fusionCanvas ${fusionCount > 0 ? "hasResult" : ""}`}>
        <div className="fusionTopControls">
          <button className="roundIconButton" type="button" onClick={clearWorkbench} aria-label="清空选择">
            <X size={20} />
          </button>
          <div className="fusionTopRight">
            <button className="roundIconButton" type="button" onClick={() => setActiveTray("preferences")} aria-label="打开偏好">
              <SlidersHorizontal size={19} />
            </button>
            <button className="roundIconButton" type="button" onClick={() => setActiveTray("tools")} aria-label="打开厨具">
              <Utensils size={19} />
            </button>
          </div>
        </div>

        <div className={`fusionStage ${hasSelection ? "hasSelection" : ""}`}>
          {!hasSelection ? (
            <p>点击下方食材库，开始融合吧</p>
          ) : (
            <>
              <div className="fusionToolAnchor" style={{ "--tool": selectedTool.tone } as React.CSSProperties}>
                <img src={selectedTool.image} alt={selectedTool.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                <span>{selectedTool.name}</span>
              </div>
              {selectedItems.map((item, index) => (
                <button
                  className="canvasIngredient"
                  type="button"
                  style={orbitStyle(index, selectedItems.length)}
                  onClick={() => toggleIngredient(item.inventoryId)}
                  key={item.inventoryId}
                >
                  <FoodImage src={item.photo} alt={item.name} />
                  <span>{item.name}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {fusionCount > 0 && (
          <FusionResultPopup
            recipe={fusionRecipe}
            selectedTool={selectedTool}
            selectedPreference={selectedPreference}
            flipped={recipeFlipped}
            favorite={favorites.includes(fusionRecipe.id)}
            onFavorite={() => toggleFavorite(fusionRecipe.id)}
            onMake={() => setRecipeFlipped(true)}
            onBack={() => setRecipeFlipped(false)}
            onDismiss={() => {
              setFusionCount(0);
              setRecipeFlipped(false);
            }}
            onPlanToday={() => planToday(fusionRecipe, "仓库融合")}
          />
        )}
      </div>

      <div className="fusionTray">
        <div className="fusionTrayTabs">
          {[
            ["ingredients", "食材"],
            ["tools", "厨具"],
            ["preferences", "偏好"],
          ].map(([id, label]) => (
            <button className={activeTray === id ? "active" : ""} type="button" key={id} onClick={() => setActiveTray(id as FusionTray)}>
              {label}
            </button>
          ))}
        </div>

        {activeTray === "ingredients" && (
          <div className="fusionRail" aria-label="食材库">
            {inventory.map((item) => {
              const selected = selectedInventoryIds.includes(item.inventoryId);
              return (
                <button className={`fusionPickerCard ingredient ${selected ? "selected" : ""}`} type="button" onClick={() => toggleIngredient(item.inventoryId)} key={item.inventoryId}>
                  <FoodImage src={item.photo} alt={item.name} />
                  <strong>{item.name}</strong>
                  <small>{freshnessCopy(item)}</small>
                  {selected && <span className="pickerBadge">已选</span>}
                </button>
              );
            })}
          </div>
        )}

        {activeTray === "tools" && (
          <div className="fusionRail" aria-label="厨具库">
            {kitchenTools.map((tool) => (
              <button
                className={`fusionPickerCard tool ${activeToolId === tool.id ? "selected" : ""}`}
                type="button"
                style={{ "--tool": tool.tone } as React.CSSProperties}
                onClick={() => {
                  setActiveToolId(tool.id);
                  setFusionCount(0);
                  setRecipeFlipped(false);
                }}
                key={tool.id}
              >
                <img src={tool.image} alt={tool.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                <strong>{tool.name}</strong>
                <small>{tool.subtitle}</small>
              </button>
            ))}
          </div>
        )}

        {activeTray === "preferences" && (
          <div className="fusionRail preferenceRail" aria-label="食物偏好">
            {foodPreferences.map((preference) => (
              <button
                className={`fusionPickerCard preference ${preferenceId === preference.id ? "selected" : ""}`}
                type="button"
                style={{ "--pref": preference.tone } as React.CSSProperties}
                onClick={() => {
                  setPreferenceId(preference.id);
                  setFusionCount(0);
                  setRecipeFlipped(false);
                }}
                key={preference.id}
              >
                <span className="preferenceDot" />
                <strong>{preference.label}</strong>
                <small>{preference.desc}</small>
              </button>
            ))}
          </div>
        )}

        <div className="trayFusionFooter">
          <button className="trayFusionButton" type="button" disabled={!hasSelection} onClick={handleFusionAction}>
            <Sparkles size={17} /> {fusionCount > 0 ? "再融合" : "融合"}
          </button>
        </div>
      </div>

      {shoppingList.length > 0 && (
        <div className="shoppingOutput compactShoppingOutput">
          <h2>购物清单</h2>
          {shoppingList.map((line) => (
            <div key={line.id}><ShoppingBag size={16} /> {line.name}<small>{line.reason}</small></div>
          ))}
        </div>
      )}
    </section>
  );
}

function FusionResultPopup({
  recipe,
  selectedTool,
  selectedPreference,
  flipped,
  favorite,
  onFavorite,
  onMake,
  onBack,
  onDismiss,
  onPlanToday,
}: {
  recipe: Recipe;
  selectedTool: KitchenTool;
  selectedPreference: FoodPreference;
  flipped: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onMake: () => void;
  onBack: () => void;
  onDismiss: () => void;
  onPlanToday: () => void;
}) {
  const seasonings = recipeSeasonings(recipe);
  const ingredients = recipeMainIngredients(recipe);

  return (
    <div className="fusionResultLayer" aria-live="polite">
      <div className="fusionResultDock">
        <div className="sparkBurst" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <button className="resultDismiss" type="button" onClick={onDismiss} aria-label="关闭推荐卡">
          <X size={17} />
        </button>
        <div className={`fusionResultCard ${flipped ? "flipped" : ""}`}>
          <div className="fusionResultInner">
            <article className="fusionResultFace resultFront">
              <div className="resultCardBody">
                <div className="resultKicker"><Sparkles size={15} /> 今日最推荐</div>
                <div className="dishHero">
                  <img className="dishCutout" src={recipe.image} alt={recipe.title} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                  <div>
                    <h2>{recipe.title}</h2>
                    <p>{recipe.reason}</p>
                  </div>
                </div>
                <RecipeMeta recipe={recipe} />
                <div className="fusionNeedGrid">
                  <div>
                    <span>需要食材</span>
                    <strong>{ingredients.join("、") || "当前已选食材"}</strong>
                  </div>
                  <div>
                    <span>调味料</span>
                    <strong>{seasonings.join("、") || "按口味微调"}</strong>
                  </div>
                </div>
              </div>
              <div className="resultActions">
                <button className={`ghostButton favoriteAction ${favorite ? "active" : ""}`} type="button" onClick={onFavorite}>
                  {favorite ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} 收藏
                </button>
                <button className="primaryButton" type="button" onClick={onMake}>
                  <ChefHat size={16} /> 制作
                </button>
              </div>
            </article>

            <article className="fusionResultFace resultBack">
              <div className="resultCardBody">
                <div className="resultKicker"><ClipboardList size={15} /> 制作教程</div>
                <h2>{recipe.title}</h2>
                <div className="tutorialSummary">
                  <span>{selectedTool.name}</span>
                  <span>{selectedPreference.label}</span>
                  <span>{recipe.minutes} 分钟</span>
                </div>
                <div className="fusionNeedGrid tutorial">
                  <div>
                    <span>菜系</span>
                    <strong>{recipe.cuisine}</strong>
                  </div>
                  <div>
                    <span>卡路里</span>
                    <strong>{recipe.calories} kcal</strong>
                  </div>
                </div>
                <ol className="tutorialSteps">
                  {recipe.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
              <div className="resultActions">
                <button className="ghostButton" type="button" onClick={onBack}>返回卡片</button>
                <button className="primaryButton" type="button" onClick={onPlanToday}>
                  <NotebookPen size={16} /> 加入今天
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFusionRecipe(
  selectedItems: InventoryItem[],
  selectedTool: KitchenTool,
  selectedPreference: FoodPreference,
  fusionCount: number,
): Recipe {
  const names = selectedItems.map((item) => item.name);
  const hasFruit = selectedItems.some((item) => item.level1 === "水果");
  const hasProtein = selectedItems.some((item) => item.level1 === "肉禽蛋品" || item.level1 === "豆制品" || item.level1 === "海鲜水产");
  const hasVegetable = selectedItems.some((item) => item.level1 === "蔬菜");
  const title = fusionTitle(names, selectedTool, selectedPreference, hasFruit, hasProtein, hasVegetable);
  const baseCalories = selectedItems.reduce((sum, item) => {
    const estimatedWeight = item.amountMode === "weight" ? item.amount : Math.max(item.amount, 1) * Math.max(item.defaultWeight / Math.max(item.defaultCount, 1), 80);
    return sum + (estimatedWeight / 100) * item.caloriesPer100g;
  }, 0);
  const toolExtraMinutes =
    selectedTool.id === "oven" ? 8 : selectedTool.id === "steamer" ? 4 : selectedTool.id === "coffee" ? 3 : selectedTool.id === "soyMilk" ? 12 : 0;
  const required = Array.from(new Set([...names, ...fusionSupportIngredients(selectedTool, selectedPreference, hasFruit)]));

  return {
    id: `fusion-${selectedTool.id}-${selectedPreference.id}-${names.join("-")}-${fusionCount}`,
    title,
    cuisine: selectedPreference.cuisine,
    difficulty: selectedPreference.difficulty,
    minutes: selectedPreference.minutes + toolExtraMinutes + Math.min(selectedItems.length * 2, 8),
    calories: Math.max(80, Math.round(baseCalories * selectedPreference.calorieBias)),
    image: hasFruit ? recipeImages.peachDrink : selectedTool.id === "steamer" ? recipeImages.steamedEgg : recipeImages.eggplantRice,
    required,
    toolId: selectedTool.id,
    reason: `${names.join("、")} 经过 ${selectedTool.name} 和「${selectedPreference.label}」偏好融合，优先解决今天吃什么。`,
    steps: fusionSteps(selectedTool, selectedPreference, hasFruit, hasProtein, hasVegetable),
  };
}

function fusionTitle(
  names: string[],
  selectedTool: KitchenTool,
  selectedPreference: FoodPreference,
  hasFruit: boolean,
  hasProtein: boolean,
  hasVegetable: boolean,
) {
  if (!names.length) return "选择食材后开始融合";
  const coreNames = names.slice(0, 3).join("、");
  if (selectedTool.id === "juicer" || selectedTool.id === "coffee") return `${coreNames}清爽特调`;
  if (selectedTool.id === "soyMilk") return `${coreNames}暖饮浓汤`;
  if (selectedTool.id === "steamer") return `${coreNames}轻蒸碗`;
  if (selectedTool.id === "oven") return `${coreNames}焗烤小盘`;
  if (selectedPreference.id === "creative" && hasFruit && hasProtein) return `${coreNames}果香咸甜实验`;
  if (selectedPreference.id === "fresh" && hasVegetable) return `${coreNames}清爽快手盘`;
  return `${coreNames}${hasProtein ? "一人主菜" : "灵感小食"}`;
}

function fusionSupportIngredients(selectedTool: KitchenTool, selectedPreference: FoodPreference, hasFruit: boolean) {
  if (selectedTool.id === "juicer" || selectedTool.id === "coffee") return hasFruit ? ["柠檬", "蜂蜜"] : ["牛奶", "冰块"];
  if (selectedTool.id === "soyMilk") return ["清水", "少量糖"];
  if (selectedPreference.id === "zhejiang") return ["生抽", "少量糖"];
  if (selectedPreference.id === "fresh") return ["柠檬", "橄榄油"];
  return ["生抽"];
}

function fusionSteps(selectedTool: KitchenTool, selectedPreference: FoodPreference, hasFruit: boolean, hasProtein: boolean, hasVegetable: boolean) {
  if (selectedTool.id === "juicer" || selectedTool.id === "coffee") {
    return ["食材清洗后切小块。", "保留一点果肉做层次，其余打碎或萃取。", "按酸甜度补柠檬或蜂蜜。", "冷藏 5 分钟后饮用。"];
  }
  if (selectedTool.id === "soyMilk") {
    return ["把食材切小，避开太硬或筋膜多的部分。", "加入清水到建议水位，选择浓汤或豆浆模式。", "完成后按口味补少量糖或盐。", "倒出后静置 2 分钟，让口感更顺。"];
  }
  if (selectedTool.id === "steamer") {
    return ["主料切成容易入口的大小。", "蛋液或清汤作为底味。", "中火蒸到刚熟，避免过老。", "出锅后补生抽或香油。"];
  }
  if (selectedTool.id === "oven") {
    return ["食材擦干水分后铺平。", "用少量油和盐做基础调味。", "烤到边缘上色。", "出炉后按偏好补酸甜或香草。"];
  }
  if (selectedPreference.id === "fresh") {
    return ["先处理最容易出水的食材。", hasProtein ? "蛋白质轻煎或快炒定型。" : "蔬果保持脆感，不要久炒。", "用酸味和少量盐提亮。", "关火后再拌入清爽调味。"];
  }
  if (hasFruit && hasProtein) {
    return ["蛋白质先煎香或焯水去腥。", "水果压出部分汁水做酸甜底。", "小火收成能挂住食材的薄汁。", "最后保留一点新鲜果肉提香。"];
  }
  return ["先处理需要更久加热的食材。", hasVegetable ? "蔬菜后下，保留颜色和口感。" : "主料小火炒香。", "按偏好补咸鲜、酸甜或辛香。", "收汁后试味，必要时补一点水分。"];
}

function orbitStyle(index: number, total: number): React.CSSProperties {
  const radiusX = total <= 2 ? 96 : 122;
  const radiusY = total <= 2 ? 84 : 102;
  const angle = (-90 + index * (360 / Math.max(total, 1))) * (Math.PI / 180);
  return {
    "--x": `${Math.cos(angle) * radiusX}px`,
    "--y": `${Math.sin(angle) * radiusY}px`,
  } as React.CSSProperties;
}

const storageSections: Array<{ id: StorageZone; label: string; desc: string; icon: React.ReactNode }> = [
  { id: "fridge", label: "冷藏", desc: "短期新鲜，优先安排", icon: <Snowflake size={15} /> },
  { id: "freezer", label: "冷冻", desc: "分装保存，适合备菜", icon: <PackageCheck size={15} /> },
  { id: "room", label: "室温", desc: "避光通风，随手可取", icon: <Home size={15} /> },
  { id: "seasoning", label: "调料", desc: "做菜风味底座", icon: <Tags size={15} /> },
];

function IngredientPreview({ inventory }: { inventory: InventoryItem[] }) {
  return (
    <div className="ingredientPreviewGrid">
      {inventory.slice(0, 6).map((item) => (
        <article className="ingredientMiniCard" key={item.inventoryId}>
          <FoodImage src={item.photo} alt={item.name} />
          <div>
            <strong>{item.name}</strong>
            <span>{storageText(item.storage)} · {freshnessCopy(item)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function IngredientWarehouse({ inventory }: { inventory: InventoryItem[] }) {
  const [selectedInventoryId, setSelectedInventoryId] = useState(inventory[0]?.inventoryId ?? "");
  const totalPrice = inventory.reduce((sum, item) => sum + item.pricePaid, 0);
  const urgentCount = inventory.filter((item) => freshnessLevel(item) === "soon" || freshnessLevel(item) === "danger").length;
  const selectedItem = inventory.find((item) => item.inventoryId === selectedInventoryId) ?? inventory[0];

  return (
    <div className="ingredientWarehouse">
      <div className="warehouseSummary">
        <div>
          <span>食材总数</span>
          <strong>{inventory.length}<small>件</small></strong>
        </div>
        <div>
          <span>需优先处理</span>
          <strong>{urgentCount}<small>件</small></strong>
        </div>
        <div>
          <span>估算库存</span>
          <strong>{Math.round(totalPrice)}<small>元</small></strong>
        </div>
      </div>

      {storageSections.map((section) => {
        const items = inventory.filter((item) => item.storage === section.id);
        if (items.length === 0) return null;

        return (
          <section className="ingredientZone" key={section.id}>
            <div className="zoneHeader">
              <div>
                <h2>{section.icon}{section.label}</h2>
                <p>{section.desc}，左右滑动查看</p>
              </div>
              <span>{items.length} 件</span>
            </div>
            <div className="ingredientRail" aria-label={`${section.label}食材`}>
              {items.map((item) => (
                <IngredientRailCard
                  item={item}
                  selected={selectedItem?.inventoryId === item.inventoryId}
                  onSelect={() => setSelectedInventoryId(item.inventoryId)}
                  key={item.inventoryId}
                />
              ))}
            </div>
          </section>
        );
      })}

      {selectedItem && <SelectedIngredientPanel item={selectedItem} />}
    </div>
  );
}

function IngredientRailCard({ item, selected, onSelect }: { item: InventoryItem; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`ingredientRailCard ${freshnessLevel(item)} ${selected ? "selected" : ""}`} type="button" onClick={onSelect}>
      <span className="ingredientPhotoWrap">
        <FoodImage src={item.photo} alt={item.name} />
      </span>
      <strong>{item.name}</strong>
      <small>{freshnessCopy(item)}</small>
    </button>
  );
}

function SelectedIngredientPanel({ item }: { item: InventoryItem }) {
  return (
    <section className={`selectedIngredientPanel ${freshnessLevel(item)}`}>
      <div className="selectedIngredientHero">
        <FoodImage src={item.photo} alt={item.name} />
        <div>
          <p className="eyebrow">Selected ingredient</p>
          <h2>{item.name}</h2>
          <span className="freshChip">{freshnessCopy(item)}</span>
        </div>
      </div>
      <div className="ingredientMeta">
        <span>{amountText(item)}</span>
        <span>{storageText(item.storage)}</span>
        <span>{item.pricePaid.toFixed(1)} 元</span>
        <span>{item.level1}</span>
      </div>
      <div className="storageTags">
        {item.storageTags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        {item.note && <span>{item.note}</span>}
      </div>
    </section>
  );
}

function ToolCarousel({ activeToolId, setActiveToolId }: { activeToolId: string; setActiveToolId: (id: string) => void }) {
  return (
    <div className="toolCarousel">
      <div className="sectionHeader compactHeader">
        <div>
          <p className="eyebrow">Retro tools</p>
          <h2>选择厨具</h2>
        </div>
      </div>
      <div className="toolRail">
        {kitchenTools.map((tool) => (
          <button className={activeToolId === tool.id ? "active" : ""} type="button" key={tool.id} onClick={() => setActiveToolId(tool.id)} style={{ "--tool": tool.tone } as React.CSSProperties}>
            <img src={tool.image} alt={tool.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
            <strong>{tool.name}</strong>
            <small>{tool.subtitle}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecipeReverseBox({
  mode,
  setMode,
  description,
  setDescription,
  inference,
  inferRecipe,
}: {
  mode: RecipeInputMode;
  setMode: (mode: RecipeInputMode) => void;
  description: string;
  setDescription: (value: string) => void;
  inference: RecipeInference | null;
  inferRecipe: (mode: RecipeInputMode) => void;
}) {
  return (
    <div className="recipeReverseBox">
      <div className="sectionHeader compactHeader">
        <div>
          <p className="eyebrow">Reverse recipe</p>
          <h2>拍照或语音反推做法</h2>
        </div>
      </div>
      <div className="recipeInputModes">
        <button className={mode === "photo" ? "active" : ""} type="button" onClick={() => setMode("photo")}>
          <Camera size={17} /> 拍照识别
        </button>
        <button className={mode === "voice" ? "active" : ""} type="button" onClick={() => setMode("voice")}>
          <Mic size={17} /> 语音描述
        </button>
      </div>

      {mode === "photo" ? (
        <label className="recipePhotoInput">
          <input type="file" accept="image/*" onChange={() => inferRecipe("photo")} />
          <span><Image size={18} /> 上传菜品照片</span>
          <small>根据摆盘、颜色、酱汁状态和主料形态推测做法</small>
        </label>
      ) : (
        <div className="recipeVoiceInput">
          <button type="button" onClick={() => inferRecipe("voice")}><Mic size={17} /> 开始语音输入</button>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说出菜名、口感、口味，例如：像糖醋排骨，外层发亮，软糯酸甜" />
        </div>
      )}

      <button className="primaryButton inferButton" type="button" onClick={() => inferRecipe(mode)}>
        <Sparkles size={16} /> 推测制作方式
      </button>

      {inference && (
        <div className="recipeInferenceCard">
          <div>
            <span>{inference.confidence}%</span>
            <small>推测置信</small>
          </div>
          <section>
            <h3>{inference.title}</h3>
            <p>{inference.flavor}</p>
            <div className="recipeClues">
              {inference.clues.map((clue) => <span key={clue}>{clue}</span>)}
            </div>
            <ol>
              {inference.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}

function RecipesView({
  recipes,
  recipeFilter,
  setRecipeFilter,
  cuisineFilter,
  setCuisineFilter,
  cuisineOptions,
  favorites,
  cookedIds,
  toggleFavorite,
  planToday,
}: {
  recipes: Recipe[];
  recipeFilter: RecipeFilter;
  setRecipeFilter: (value: RecipeFilter) => void;
  cuisineFilter: string;
  setCuisineFilter: (value: string) => void;
  cuisineOptions: string[];
  favorites: string[];
  cookedIds: string[];
  toggleFavorite: (recipeId: string) => void;
  planToday: (recipe: Recipe, source: string) => void;
}) {
  const [recipeInputMode, setRecipeInputMode] = useState<RecipeInputMode>("photo");
  const [recipeDescription, setRecipeDescription] = useState("菜名像糖醋排骨，外层有光泽，口感软糯，口味酸甜");
  const [inference, setInference] = useState<RecipeInference | null>(null);

  function inferRecipe(nextMode: RecipeInputMode) {
    const lowerDescription = recipeDescription.toLowerCase();
    const isBerry = recipeDescription.includes("杨梅") || lowerDescription.includes("berry");
    const isSweetSour = recipeDescription.includes("酸甜") || recipeDescription.includes("糖醋");
    const isCrispy = recipeDescription.includes("脆") || recipeDescription.includes("外酥");

    setInference({
      title: isBerry ? "杨梅糖醋小排风味做法" : isSweetSour ? "糖醋光泽类菜肴做法" : "家常复刻做法",
      confidence: nextMode === "photo" ? 86 : 79,
      clues: nextMode === "photo" ? ["颜色光泽", "酱汁挂壁", "块状主食材"] : ["菜名描述", "口感关键词", "口味关键词"],
      flavor: isBerry ? "果酸、甜口、轻微酒香" : isSweetSour ? "酸甜、酱香、收汁浓" : isCrispy ? "外酥内嫩、咸鲜" : "家常平衡口",
      steps: isBerry
        ? ["主料先煎香或焯水去腥", "杨梅压汁后和糖、醋、生抽调成酸甜汁", "小火收汁到能挂勺", "出锅前补一点果肉或柠檬皮提香"]
        : ["先判断主料是否需要焯水或煎香", "按酸甜或咸鲜方向配置基础酱汁", "中小火让酱汁包裹食材", "最后用高火收亮并试味微调"],
    });
  }

  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Recipe library</p>
          <h1>菜谱</h1>
          <p className="pageSub">收藏、做过和全部菜谱分层筛选；后续继续打磨更多口味条件。</p>
        </div>
      </div>
      <RecipeReverseBox
        mode={recipeInputMode}
        setMode={setRecipeInputMode}
        description={recipeDescription}
        setDescription={setRecipeDescription}
        inference={inference}
        inferRecipe={inferRecipe}
      />
      <div className="filterBlock">
        <div className="railTags">
          {[
            ["all", "全部"],
            ["favorite", "收藏的菜"],
            ["cooked", "做过的菜"],
          ].map(([id, label]) => (
            <button className={recipeFilter === id ? "active" : ""} type="button" key={id} onClick={() => setRecipeFilter(id as RecipeFilter)}>
              {label}
            </button>
          ))}
        </div>
        <div className="railTags secondary">
          {cuisineOptions.map((item) => (
            <button className={cuisineFilter === item ? "active" : ""} type="button" key={item} onClick={() => setCuisineFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="recipeGrid">
        {recipes.map((recipe) => (
          <article className="recipeCard" key={recipe.id}>
            <button className="favoriteButton" type="button" onClick={() => toggleFavorite(recipe.id)} aria-label="收藏菜谱">
              {favorites.includes(recipe.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
            <img src={recipe.image} alt={recipe.title} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
            <h2>{recipe.title}</h2>
            <RecipeMeta recipe={recipe} />
            <p>{recipe.reason}</p>
            <div className="needLine"><Utensils size={15} /> 需要：{recipe.required.join("、")}</div>
            <div className="cardActions">
              <span>{cookedIds.includes(recipe.id) ? "做过" : "未做"}</span>
              <button className="primaryButton" type="button" onClick={() => planToday(recipe, "菜谱选择")}>
                今天吃什么
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function sameMonth(leftISO: string, rightISO: string) {
  const left = parseISODate(leftISO);
  const right = parseISODate(rightISO);
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function calendarDatesFor(anchorISO: string) {
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

function dateTitle(iso: string) {
  const date = parseISODate(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function monthTitle(iso: string) {
  const date = parseISODate(iso);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function inventoryDate(item: InventoryItem) {
  return dateByDaysAgo(item.addedDaysAgo);
}

function DiaryView({ diary, shoppingList, inventory }: { diary: DiaryEntry[]; shoppingList: ShoppingLine[]; inventory: InventoryItem[] }) {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const preference = diary.length > 2 ? "偏好快手家常与低洗碗路径" : "偏好信号正在积累";
  const calendarDays = calendarDatesFor(selectedDate);
  const monthlyIncome = inventory.filter((item) => sameMonth(inventoryDate(item), selectedDate));
  const monthlyExpense = diary.filter((entry) => sameMonth(entry.dateISO, selectedDate));
  const selectedIncome = inventory.filter((item) => inventoryDate(item) === selectedDate);
  const selectedExpense = diary.filter((entry) => entry.dateISO === selectedDate);

  function moveMonth(offset: number) {
    const next = parseISODate(selectedDate);
    next.setDate(1);
    next.setMonth(next.getMonth() + offset);
    setSelectedDate(toISODate(next));
  }

  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Food ledger</p>
          <h1>日记</h1>
          <p className="pageSub">像银行卡收支一样看厨房：收入是存放的食材，支出是做掉的菜肴。</p>
        </div>
      </div>
      <div className="diaryInsight">
        <CalendarDays size={20} />
        <div>
          <strong>{preference}</strong>
          <p>入库和做菜记录会逐步形成你的口味画像。</p>
        </div>
      </div>
      <div className="ledgerSummary">
        <div>
          <span>本月入库</span>
          <strong>+{monthlyIncome.length}<small>件食材</small></strong>
        </div>
        <div>
          <span>本月做菜</span>
          <strong>-{monthlyExpense.length}<small>道菜</small></strong>
        </div>
      </div>
      <div className="ledgerCalendar">
        <div className="calendarHeader">
          <button type="button" onClick={() => moveMonth(-1)}>上月</button>
          <strong>{monthTitle(selectedDate)}</strong>
          <button type="button" onClick={() => moveMonth(1)}>下月</button>
        </div>
        <div className="calendarWeekdays">
          {["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendarGrid">
          {calendarDays.map((dateISO) => {
            const dayIncome = inventory.filter((item) => inventoryDate(item) === dateISO).length;
            const dayExpense = diary.filter((entry) => entry.dateISO === dateISO).length;
            const isActive = dateISO === selectedDate;
            const inMonth = sameMonth(dateISO, selectedDate);
            const date = parseISODate(dateISO);

            return (
              <button className={`${isActive ? "active" : ""} ${inMonth ? "" : "muted"}`} type="button" data-date={dateISO} onClick={() => setSelectedDate(dateISO)} key={dateISO}>
                <strong>{date.getDate()}</strong>
                <span>
                  {dayIncome > 0 && <i className="income">+{dayIncome}</i>}
                  {dayExpense > 0 && <i className="expense">-{dayExpense}</i>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="ledgerDetail">
        <div className="ledgerDetailHeader">
          <div>
            <p className="eyebrow">Daily detail</p>
            <h2>{dateTitle(selectedDate)}</h2>
          </div>
          <span>+{selectedIncome.length} / -{selectedExpense.length}</span>
        </div>
        {selectedIncome.length === 0 && selectedExpense.length === 0 && (
          <div className="emptyLedger">这天还没有厨房收支记录。</div>
        )}
        {selectedIncome.map((item) => (
          <article className="ledgerLine income" key={item.inventoryId}>
            <FoodImage src={item.photo} alt={item.name} />
            <div>
              <span>食材入库</span>
              <strong>{item.name}</strong>
              <small>{amountText(item)} · {storageText(item.storage)}</small>
            </div>
            <b>+{item.pricePaid.toFixed(1)}</b>
          </article>
        ))}
        {selectedExpense.map((entry) => (
          <article className="ledgerLine expense" key={entry.id}>
            <span className="ledgerIcon"><PenLine size={16} /></span>
            <div>
              <span>做菜支出</span>
              <strong>{entry.recipeTitle}</strong>
              <small>{entry.tags.join(" · ")}</small>
            </div>
            <b>-1</b>
          </article>
        ))}
      </div>
      {shoppingList.length > 0 && (
        <div className="shoppingOutput diaryShopping">
          <h2>本次购物清单</h2>
          {shoppingList.map((line) => (
            <div key={line.id}><ShoppingBag size={16} /> {line.name}<small>{line.reason}</small></div>
          ))}
        </div>
      )}
    </section>
  );
}

const seasoningWords = new Set(["生抽", "少量糖", "糖", "柠檬", "橄榄油", "蜂蜜", "牛奶", "冰块", "清水", "盐"]);

function recipeSeasonings(recipe: Recipe) {
  return recipe.required.filter((item) => seasoningWords.has(item));
}

function recipeMainIngredients(recipe: Recipe) {
  return recipe.required.filter((item) => !seasoningWords.has(item));
}

function RecipeMeta({ recipe }: { recipe: Recipe }) {
  return (
    <div className="recipeMeta">
      <span><ClipboardList size={13} /> {recipe.required.length} 种食材</span>
      <span><Timer size={13} /> {recipe.minutes} 分钟</span>
      <span>{recipe.difficulty}</span>
      <span>{recipe.cuisine}</span>
      <span>{recipe.calories} kcal</span>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="metricCard">
      <span>{label}</span>
      <strong>{value}<small>{suffix}</small></strong>
      <div><i style={{ width: `${Math.min(value, 100)}%` }} /></div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`navButton ${active ? "active" : ""}`} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FoodImage({ src, alt }: { src: string; alt: string }) {
  return <img className="foodPhoto" src={src} alt={alt} onError={(event) => { event.currentTarget.src = fallbackImage; }} />;
}

function freshnessPercent(item: InventoryItem) {
  return Math.max(0, Math.min(100, Math.round(((item.shelfLifeDays - item.addedDaysAgo) / item.shelfLifeDays) * 100)));
}

function freshnessLevel(item: InventoryItem): Freshness {
  const score = freshnessPercent(item);
  if (score >= 75) return "fresh";
  if (score >= 45) return "good";
  if (score >= 18) return "soon";
  return "danger";
}

function freshnessCopy(item: InventoryItem) {
  const percent = freshnessPercent(item);
  const label = {
    fresh: "新鲜",
    good: "稳定",
    soon: "尽快吃",
    danger: "马上处理",
  }[freshnessLevel(item)];
  return `${label} ${percent}%`;
}

function amountText(item: InventoryItem) {
  if (item.amountMode === "count") return `${item.amount}${item.unit}`;
  return `${item.amount}g`;
}

function storageText(storage: StorageZone) {
  return {
    fridge: "冷藏",
    freezer: "冷冻",
    room: "室温保存",
    seasoning: "避光防潮",
  }[storage];
}

function methodText(method: UploadMethod) {
  return {
    photo: "照片识别会优先提取可见食材和包装信息",
    online: "线上截图会读取商品名、规格和价格",
    receipt: "小票会解析购买日期、商品和总价",
    manual: "手动输入会根据食材库自动补全默认值",
  }[method];
}

function uploadActionText(method: UploadMethod) {
  return {
    photo: "上传或拍摄食材照片",
    online: "上传线上购物截图",
    receipt: "上传小票照片或 PDF",
    manual: "手动输入食材",
  }[method];
}

function recognitionStatusText(status: RecognitionStatus) {
  return {
    selected: "处理中",
    queued: "待处理",
    ignored: "跳过",
  }[status];
}

export default App;
