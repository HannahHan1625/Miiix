import { Apple, Carrot, Drumstick, Fish, Leaf, Wheat } from "lucide-react";
import type { AmountMode, FoodInfo, InventoryItem, StorageZone, UploadMethod } from "../domain/inventory";
import type { FoodPreference, KitchenTool, Recipe } from "../domain/recipe";

export const fallbackImage =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180'%3E%3Crect width='240' height='180' fill='%23fff6dc'/%3E%3Ccircle cx='120' cy='90' r='46' fill='%23d8eafa'/%3E%3Cpath d='M83 104c24-38 67-38 74 0' fill='none' stroke='%238ba6b8' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E";

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
  yangmei: localPhoto("<rect width='240' height='180' fill='#fff7e8'/><g filter='drop-shadow(0 10px 12px rgba(40,35,35,.22))'><circle cx='92' cy='93' r='28' fill='#b32645'/><circle cx='122' cy='75' r='25' fill='#ca3150'/><circle cx='148' cy='98' r='30' fill='#9e1f3c'/><circle cx='120' cy='119' r='27' fill='#d94b61'/><circle cx='170' cy='119' r='23' fill='#b52a44'/></g><g fill='#ffd0d4' opacity='.65'><circle cx='84' cy='84' r='4'/><circle cx='118' cy='68' r='4'/><circle cx='147' cy='92' r='3'/><circle cx='128' cy='118' r='4'/></g><path d='M114 51c14-14 32-16 52-11-16 8-25 19-30 33-6-10-13-16-22-22z' fill='#758c50'/>") ,
  rice: localPhoto("<rect width='240' height='180' fill='#f7fbff'/><ellipse cx='120' cy='75' rx='72' ry='32' fill='#fff'/><g fill='#f5f0dc'><ellipse cx='82' cy='74' rx='14' ry='6'/><ellipse cx='110' cy='62' rx='18' ry='7'/><ellipse cx='139' cy='72' rx='16' ry='7'/><ellipse cx='159' cy='86' rx='15' ry='6'/><ellipse cx='104' cy='92' rx='17' ry='7'/></g><path d='M48 88c8 43 35 66 72 66s64-23 72-66c-36 20-108 20-144 0z' fill='#d9e7ea'/><ellipse cx='120' cy='88' rx='76' ry='22' fill='none' stroke='#c6d8de' stroke-width='7'/>") ,
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

export const recipeImages = {
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

export const categoryTree = [
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

export const foodLibrary: FoodInfo[] = [
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

export const recognitionPresets: Record<Exclude<UploadMethod, "manual">, Array<{ foodId: string; confidence: number }>> = {
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

export const initialInventory: InventoryItem[] = [
  stocked("egg", 4, "count", 1, 4.8),
  stocked("eggplant", 1, "count", 1, 3.5),
  stocked("pork", 200, "weight", 2, 7.2),
  stocked("pepper", 2, "count", 1, 4.2),
  stocked("peach", 2, "count", 0, 7.9),
  stocked("yangmei", 350, "weight", 1, 18.8),
  stocked("rice", 1, "count", 0, 2),
  stocked("soy", 1, "count", 20, 12),
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
