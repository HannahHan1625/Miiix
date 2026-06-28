import {
  Apple,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Camera,
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
  NotebookPen,
  PackageCheck,
  PenLine,
  ReceiptText,
  Refrigerator,
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

const PRODUCT_VERSION = "v0.2.0";
const VERSION_NAME = "晨光冰箱";

type View = "home" | "warehouse" | "recipes" | "diary";
type UploadMethod = "photo" | "online" | "receipt" | "manual";
type StorageZone = "fridge" | "freezer" | "room" | "seasoning";
type AmountMode = "count" | "weight";
type Freshness = "fresh" | "good" | "soon" | "danger";
type RecipeFilter = "all" | "favorite" | "cooked";

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

const fallbackImage =
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
  { id: "wok", name: "复古炒锅", subtitle: "爆炒 / 盖饭", tone: "#c7dcef", image: foodPhotos.soy },
  { id: "steamer", name: "白色蒸锅", subtitle: "蒸蛋 / 清蒸", tone: "#f4df9d", image: "/assets/tool-steamer-reference.png" },
  { id: "oven", name: "奶油烤箱", subtitle: "焗烤 / 甜点", tone: "#f2c9bd", image: recipeImages.steamedEgg },
  { id: "juicer", name: "果汁机", subtitle: "果汁 / 奶昔", tone: "#d6ead7", image: foodPhotos.lemon },
  { id: "coffee", name: "复古咖啡机", subtitle: "咖啡 / 特调", tone: "#f6dfa6", image: "/assets/tool-coffee-reference.png" },
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
  const [fridgeOpen, setFridgeOpen] = useState(false);
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
    }, 260);
  }

  function completeUpload() {
    setUploadDone(true);
    window.setTimeout(() => {
      const nextItem: InventoryItem = {
        ...selectedFood,
        inventoryId: `${selectedFood.id}-${Date.now()}`,
        amountMode,
        amount,
        pricePaid: price,
        note,
        addedDaysAgo: 0,
        customTags: note ? [note] : [],
      };
      setInventory((current) => [nextItem, ...current]);
      setUploadOpen(false);
      setUploadDone(false);
      setView("warehouse");
      setFridgeOpen(true);
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

        <main className="screen">
          {view === "home" && (
            <HomeView
              stats={stats}
              inventory={inventory}
              openUpload={openUpload}
              fridgeOpen={fridgeOpen}
              setFridgeOpen={setFridgeOpen}
              setView={setView}
            />
          )}
          {view === "warehouse" && (
            <WarehouseView
              inventory={inventory}
              fridgeOpen={fridgeOpen}
              setFridgeOpen={setFridgeOpen}
              activeToolId={activeToolId}
              setActiveToolId={setActiveToolId}
              selectedTool={selectedTool}
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
          {view === "diary" && <DiaryView diary={diary} shoppingList={shoppingList} />}
        </main>

        <nav className="bottomNav" aria-label="主导航">
          <NavButton icon={<Home size={19} />} label="主页" active={view === "home"} onClick={() => setView("home")} />
          <NavButton icon={<Refrigerator size={19} />} label="仓库" active={view === "warehouse"} onClick={() => setView("warehouse")} />
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
  fridgeOpen,
  setFridgeOpen,
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
  fridgeOpen: boolean;
  setFridgeOpen: (value: boolean) => void;
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
            <p className="eyebrow">Warehouse view</p>
            <h2>打开冰箱看看</h2>
          </div>
          <button className="ghostButton" type="button" onClick={() => setView("warehouse")}>进入仓库</button>
        </div>
        <FridgeScene inventory={inventory} open={fridgeOpen} onToggle={() => setFridgeOpen(!fridgeOpen)} />
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
  onBack: () => void;
  onDone: () => void;
}) {
  const secondLevels = categoryTree.find((item) => item.level1 === level1)?.level2 ?? [];
  const visibleFoods = foodLibrary.filter((item) => item.level1 === level1 && item.level2 === level2);
  const isAiMethod = method !== "manual";

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
                    onClick={() => setMethod(item.id)}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    <small>{item.note}</small>
                  </button>
                );
              })}
            </div>

            {isAiMethod && (
              <div className="aiResult">
                <Sparkles size={18} />
                <div>
                  <strong>AI 已预填：{selectedFood.name}</strong>
                  <p>{methodText(method)}。你仍然可以手动矫正分类、数量、储存方式和价格。</p>
                </div>
              </div>
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
  fridgeOpen,
  setFridgeOpen,
  activeToolId,
  setActiveToolId,
  selectedTool,
  shoppingList,
  planToday,
}: {
  inventory: InventoryItem[];
  fridgeOpen: boolean;
  setFridgeOpen: (value: boolean) => void;
  activeToolId: string;
  setActiveToolId: (id: string) => void;
  selectedTool: KitchenTool;
  shoppingList: ShoppingLine[];
  planToday: (recipe: Recipe, source: string) => void;
}) {
  const bestRecipe = recipesSeed.find((recipe) => recipe.toolId === activeToolId) ?? recipesSeed[0];
  return (
    <section className="warehouseStack">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Fridge and pantry</p>
          <h1>仓库</h1>
          <p className="pageSub">冰箱、冷冻、室温和调料分区管理。点击冰箱门查看内部摆放。</p>
        </div>
        <button className="primaryButton" type="button" onClick={() => planToday(bestRecipe, "仓库生成食谱")}>
          <Sparkles size={16} /> 今天吃什么
        </button>
      </div>
      <FridgeScene inventory={inventory} open={fridgeOpen} onToggle={() => setFridgeOpen(!fridgeOpen)} />
      <ToolCarousel activeToolId={activeToolId} setActiveToolId={setActiveToolId} />
      <div className="todayPanel">
        <div>
          <p className="eyebrow">Best with {selectedTool.name}</p>
          <h2>{bestRecipe.title}</h2>
          <p>{bestRecipe.reason}</p>
        </div>
        <RecipeMeta recipe={bestRecipe} />
      </div>
      {shoppingList.length > 0 && (
        <div className="shoppingOutput">
          <h2>购物清单输出</h2>
          {shoppingList.map((line) => (
            <div key={line.id}><ShoppingBag size={16} /> {line.name}<small>{line.reason}</small></div>
          ))}
        </div>
      )}
    </section>
  );
}

function FridgeScene({ inventory, open, onToggle }: { inventory: InventoryItem[]; open: boolean; onToggle: () => void }) {
  return (
    <button className={`fridgeScene ${open ? "open" : ""}`} type="button" onClick={onToggle} aria-label="打开或关闭冰箱">
      <div className="fridgeCabinet">
        <div className="fridgeInterior">
          <Shelf title="冷藏区" items={inventory.filter((item) => item.storage === "fridge").slice(0, 5)} />
          <Shelf title="冷冻区" items={inventory.filter((item) => item.storage === "freezer").slice(0, 4)} />
          <Shelf title="室温 / 调料" items={inventory.filter((item) => item.storage === "room" || item.storage === "seasoning").slice(0, 5)} />
        </div>
        <div className="fridgeDoor">
          <span className="handle vertical" />
          <span className="handle horizontal top" />
          <span className="handle horizontal bottom" />
          <span className="magnet one">M</span>
          <span className="magnet two">菜</span>
          <span className="magnet three">旅</span>
        </div>
      </div>
      <span className="fridgeHint">{open ? "点击关上冰箱" : "点击打开冰箱"}</span>
    </button>
  );
}

function Shelf({ title, items }: { title: string; items: InventoryItem[] }) {
  return (
    <div className="shelf">
      <span>{title}</span>
      <div className="shelfItems">
        {items.map((item) => (
          <div className="fridgeFood" key={item.inventoryId}>
            <FoodImage src={item.photo} alt={item.name} />
            <small>{item.name}</small>
          </div>
        ))}
      </div>
    </div>
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
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Recipe library</p>
          <h1>菜谱</h1>
          <p className="pageSub">收藏、做过和全部菜谱分层筛选；后续继续打磨更多口味条件。</p>
        </div>
      </div>
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

function DiaryView({ diary, shoppingList }: { diary: DiaryEntry[]; shoppingList: ShoppingLine[] }) {
  const preference = diary.length > 2 ? "偏好快手家常与低洗碗路径" : "偏好信号正在积累";
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Cooking diary</p>
          <h1>日记</h1>
          <p className="pageSub">记录做菜行为，沉淀偏好。这里是后续个性化推荐的伏笔。</p>
        </div>
      </div>
      <div className="diaryInsight">
        <Heart size={20} />
        <div>
          <strong>{preference}</strong>
          <p>收藏、今天吃什么、做过的菜会逐步形成你的口味画像。</p>
        </div>
      </div>
      {shoppingList.length > 0 && (
        <div className="shoppingOutput diaryShopping">
          <h2>本次购物清单</h2>
          {shoppingList.map((line) => (
            <div key={line.id}><ShoppingBag size={16} /> {line.name}<small>{line.reason}</small></div>
          ))}
        </div>
      )}
      <div className="diaryList">
        {diary.map((entry) => (
          <article key={entry.id}>
            <span><PenLine size={15} /> {entry.date}</span>
            <h2>{entry.recipeTitle}</h2>
            <p>{entry.note}</p>
            <div>{entry.tags.map((tag) => <small key={tag}>{tag}</small>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
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

export default App;
