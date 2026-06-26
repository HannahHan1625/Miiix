import {
  BadgeCheck,
  Bell,
  Bookmark,
  BookmarkCheck,
  Camera,
  Check,
  ChevronLeft,
  ChefHat,
  ClipboardList,
  Coffee,
  CookingPot,
  Flame,
  Heart,
  Images,
  ListPlus,
  Plus,
  Refrigerator,
  Search,
  ShoppingBasket,
  Sparkles,
  Star,
  Timer,
  Trash2,
  Utensils,
  Wand2,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type StorageType = "fridge" | "freezer" | "pantry" | "seasoning";
type Freshness = "fresh" | "normal" | "use-soon" | "expired";
type View = "inventory" | "tools" | "recipes" | "favorites" | "cooked" | "shopping";
type Category = "protein" | "vegetable" | "fruit" | "seasoning" | "staple" | "drink";

type StockItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storage: StorageType;
  freshness: Freshness;
  category: Category;
  addedAt: string;
  image: string;
  minQuantity?: number;
};

type KitchenTool = {
  id: string;
  name: string;
  group: "heat" | "steam" | "bake" | "drink" | "prep";
  subtitle: string;
  image: string;
};

type RecipeIdea = {
  id: string;
  title: string;
  tool: string;
  cuisine: string;
  origin: string;
  calories: number;
  time: number;
  difficulty: "低" | "中" | "高";
  image: string;
  why: string;
  used: { id: string; amount: number; label: string }[];
  missing: string[];
  repeatList: string[];
  steps: string[];
};

type CookRecord = {
  id: string;
  recipe: RecipeIdea;
  cookedAt: string;
  rating: number;
  photoNote: string;
};

type ShoppingItem = {
  id: string;
  name: string;
  reason: string;
  checked: boolean;
};

const storageLabels: Record<StorageType, string> = {
  fridge: "冰箱",
  freezer: "冷冻室",
  pantry: "常温柜",
  seasoning: "调料柜",
};

const freshnessLabels: Record<Freshness, string> = {
  fresh: "新鲜",
  normal: "正常",
  "use-soon": "优先消耗",
  expired: "已过期",
};

const cutout = (body: string, viewBox = "0 0 320 240") =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`,
  )}`;

// Local transparent cutout asset catalog. OCR/photo recognition should map normalized item names to these keys.
const assetCatalog = {
  ingredients: {
    egg: cutout(`
      <defs><radialGradient id="g" cx="42%" cy="34%"><stop offset="0" stop-color="#fff0d2"/><stop offset="0.62" stop-color="#d78d45"/><stop offset="1" stop-color="#8f4c22"/></radialGradient></defs>
      <ellipse cx="130" cy="116" rx="84" ry="58" fill="#8f4c22" opacity=".18"/>
      <ellipse cx="96" cy="111" rx="35" ry="43" fill="url(#g)" transform="rotate(-16 96 111)"/>
      <ellipse cx="138" cy="93" rx="36" ry="45" fill="url(#g)" transform="rotate(13 138 93)"/>
      <ellipse cx="172" cy="120" rx="38" ry="46" fill="url(#g)" transform="rotate(-5 172 120)"/>
      <ellipse cx="124" cy="142" rx="34" ry="42" fill="url(#g)" transform="rotate(10 124 142)"/>
      <ellipse cx="90" cy="93" rx="12" ry="8" fill="#fff7e4" opacity=".58"/>
      <ellipse cx="151" cy="78" rx="12" ry="8" fill="#fff7e4" opacity=".5"/>
    `),
    eggplant: cutout(`
      <defs><linearGradient id="p" x1="48" x2="246" y1="120" y2="120"><stop stop-color="#2b173f"/><stop offset=".45" stop-color="#71238f"/><stop offset="1" stop-color="#2d153f"/></linearGradient></defs>
      <path d="M71 135c35-49 113-76 165-53 23 10 24 31 5 53-35 41-122 57-168 28-12-8-11-17-2-28z" fill="url(#p)"/>
      <path d="M77 129c34-32 87-52 132-46" fill="none" stroke="#b87ad1" stroke-width="9" stroke-linecap="round" opacity=".45"/>
      <path d="M228 80c16-22 34-27 50-26-12 12-19 27-22 43-9-10-18-15-28-17z" fill="#506b32"/>
      <path d="M218 86c21-9 36-3 46 12-21 0-37 5-50 20z" fill="#6f8b48"/>
      <ellipse cx="116" cy="109" rx="12" ry="6" fill="#f1b7ff" opacity=".35" transform="rotate(-22 116 109)"/>
    `),
    pork: cutout(`
      <defs><linearGradient id="m" x1="83" x2="232" y1="68" y2="181"><stop stop-color="#f4a18b"/><stop offset=".55" stop-color="#c96b61"/><stop offset="1" stop-color="#7d3739"/></linearGradient></defs>
      <g fill="url(#m)">
        <ellipse cx="126" cy="95" rx="35" ry="23"/><ellipse cx="166" cy="93" rx="42" ry="25"/><ellipse cx="199" cy="116" rx="36" ry="28"/>
        <ellipse cx="111" cy="136" rx="38" ry="28"/><ellipse cx="157" cy="142" rx="47" ry="31"/><ellipse cx="204" cy="153" rx="36" ry="23"/>
      </g>
      <g fill="#ffd4c4" opacity=".55">
        <ellipse cx="118" cy="88" rx="12" ry="5"/><ellipse cx="177" cy="91" rx="18" ry="6"/><ellipse cx="150" cy="132" rx="22" ry="6"/><ellipse cx="205" cy="141" rx="14" ry="5"/>
      </g>
      <g fill="#743639" opacity=".38">
        <circle cx="95" cy="123" r="5"/><circle cx="139" cy="113" r="6"/><circle cx="184" cy="128" r="5"/><circle cx="222" cy="137" r="4"/>
      </g>
    `),
    pepper: cutout(`
      <defs><radialGradient id="r" cx="36%" cy="27%"><stop stop-color="#fff0aa"/><stop offset=".45" stop-color="#8aba36"/><stop offset="1" stop-color="#2f6e2f"/></radialGradient><radialGradient id="y" cx="38%" cy="28%"><stop stop-color="#fff0a3"/><stop offset=".58" stop-color="#f1bf30"/><stop offset="1" stop-color="#c66f19"/></radialGradient><radialGradient id="red" cx="38%" cy="28%"><stop stop-color="#ffb29e"/><stop offset=".55" stop-color="#d63a28"/><stop offset="1" stop-color="#8d211a"/></radialGradient></defs>
      <g transform="rotate(-8 160 120)">
        <path d="M117 63c18-18 48-9 53 16 19-15 48-2 48 24 0 42-38 72-84 65-40-6-64-45-50-77 7-18 20-27 33-28z" fill="url(#r)"/>
        <path d="M118 72c16 25 9 65-18 87" fill="none" stroke="#6fa83a" stroke-width="5" opacity=".6"/>
        <path d="M171 79c-9 33 3 61 28 82" fill="none" stroke="#61992e" stroke-width="5" opacity=".5"/>
        <path d="M150 61c9-23 25-31 48-27-18 11-24 28-25 45z" fill="#49692e"/>
      </g>
      <circle cx="229" cy="147" r="30" fill="url(#red)"/>
      <circle cx="240" cy="103" r="24" fill="url(#y)"/>
    `),
    peach: cutout(`
      <defs><radialGradient id="peach" cx="34%" cy="27%"><stop stop-color="#fff0be"/><stop offset=".5" stop-color="#ef9f68"/><stop offset="1" stop-color="#c96a51"/></radialGradient></defs>
      <path d="M168 55c54 4 79 57 55 103-21 41-83 55-121 28-43-31-34-96 11-122 18-11 37-14 55-9z" fill="url(#peach)"/>
      <path d="M168 62c-21 35-19 75 8 119" fill="none" stroke="#b45245" stroke-width="5" opacity=".38"/>
      <ellipse cx="118" cy="92" rx="21" ry="11" fill="#fff0c7" opacity=".5" transform="rotate(-29 118 92)"/>
      <path d="M164 60c16-24 37-32 64-26-18 12-30 26-35 47-9-11-18-17-29-21z" fill="#6e8f4e"/>
    `),
    yangmei: cutout(`
      <defs><radialGradient id="b" cx="34%" cy="29%"><stop stop-color="#ff8a95"/><stop offset=".48" stop-color="#bd2942"/><stop offset="1" stop-color="#65172f"/></radialGradient></defs>
      <g fill="url(#b)">
        <circle cx="115" cy="102" r="34"/><circle cx="155" cy="83" r="31"/><circle cx="196" cy="103" r="33"/>
        <circle cx="132" cy="142" r="36"/><circle cx="177" cy="145" r="34"/><circle cx="220" cy="142" r="27"/>
      </g>
      <g fill="#ffbcc0" opacity=".48">
        <circle cx="104" cy="91" r="4"/><circle cx="133" cy="113" r="3"/><circle cx="160" cy="72" r="4"/><circle cx="195" cy="96" r="3"/><circle cx="174" cy="142" r="4"/><circle cx="226" cy="135" r="3"/>
      </g>
      <path d="M139 61c13-16 30-19 50-15-12 8-22 18-29 32-6-8-13-13-21-17z" fill="#657b3f"/>
    `),
    rice: cutout(`
      <defs><linearGradient id="bowl" x1="96" x2="226" y1="133" y2="180"><stop stop-color="#e6eef0"/><stop offset="1" stop-color="#8b9ba0"/></linearGradient></defs>
      <ellipse cx="160" cy="102" rx="76" ry="38" fill="#fff"/>
      <g fill="#f7f4e6"><ellipse cx="112" cy="98" rx="15" ry="7"/><ellipse cx="144" cy="86" rx="18" ry="8"/><ellipse cx="174" cy="95" rx="17" ry="7"/><ellipse cx="205" cy="106" rx="14" ry="6"/><ellipse cx="135" cy="116" rx="17" ry="8"/></g>
      <path d="M72 115c7 53 42 78 88 78s81-25 88-78c-44 22-132 22-176 0z" fill="url(#bowl)"/>
      <ellipse cx="160" cy="115" rx="88" ry="26" fill="none" stroke="#d6dee0" stroke-width="8"/>
    `),
    soy: cutout(`
      <defs><linearGradient id="glass" x1="128" x2="192"><stop stop-color="#2a1712"/><stop offset=".5" stop-color="#5a2d20"/><stop offset="1" stop-color="#1c0e0b"/></linearGradient></defs>
      <path d="M139 57h43l8 27v93c0 18-12 30-29 30s-30-12-30-30V84z" fill="url(#glass)"/>
      <path d="M146 34h29v31h-29z" fill="#202020"/><path d="M140 29h41v12h-41z" fill="#3c3b38"/>
      <rect x="137" y="99" width="49" height="58" rx="8" fill="#f4e5bd"/><path d="M147 116h29" stroke="#7f3f2b" stroke-width="7" stroke-linecap="round"/><path d="M148 137h27" stroke="#b9563a" stroke-width="5" stroke-linecap="round"/>
      <path d="M145 72c5 35 4 80-1 118" stroke="#ffffff" stroke-width="5" opacity=".18" stroke-linecap="round"/>
    `),
    lemon: cutout(`
      <defs><radialGradient id="l" cx="36%" cy="27%"><stop stop-color="#fff8bb"/><stop offset=".55" stop-color="#f4d13f"/><stop offset="1" stop-color="#d89c19"/></radialGradient></defs>
      <circle cx="160" cy="120" r="70" fill="url(#l)"/>
      <circle cx="160" cy="120" r="53" fill="#ffe88a" opacity=".7"/>
      <g stroke="#f4c42d" stroke-width="4"><path d="M160 68v104"/><path d="M108 120h104"/><path d="M123 83l74 74"/><path d="M197 83l-74 74"/></g>
      <circle cx="160" cy="120" r="9" fill="#f0b820"/>
    `),
    honey: cutout(`
      <defs><linearGradient id="h" x1="86" x2="224"><stop stop-color="#ffcf3b"/><stop offset=".58" stop-color="#ee9c1a"/><stop offset="1" stop-color="#b35a11"/></linearGradient></defs>
      <path d="M92 98c28-37 109-42 137-1 18 27-1 77-65 83-68 7-94-53-72-82z" fill="url(#h)"/>
      <path d="M91 102c42 18 94 18 137-2" fill="none" stroke="#f8e183" stroke-width="12" opacity=".45"/>
      <path d="M139 175c0 34 42 32 37 1z" fill="#d07312"/>
      <g stroke="#8a4e12" stroke-width="4" opacity=".55"><path d="M122 95h34"/><path d="M116 113h48"/><path d="M121 132h36"/></g>
    `),
    coffee: cutout(`
      <defs><linearGradient id="bean" x1="87" x2="229"><stop stop-color="#7a3f21"/><stop offset=".55" stop-color="#3b1c11"/><stop offset="1" stop-color="#160a06"/></linearGradient></defs>
      <g fill="url(#bean)">
        <ellipse cx="112" cy="104" rx="31" ry="45" transform="rotate(-24 112 104)"/><ellipse cx="160" cy="91" rx="31" ry="44" transform="rotate(12 160 91)"/><ellipse cx="209" cy="118" rx="31" ry="43" transform="rotate(29 209 118)"/>
        <ellipse cx="143" cy="151" rx="30" ry="42" transform="rotate(-5 143 151)"/><ellipse cx="197" cy="162" rx="28" ry="39" transform="rotate(-20 197 162)"/>
      </g>
      <g stroke="#b87543" stroke-width="5" opacity=".55"><path d="M105 70c13 28 16 53 10 75"/><path d="M159 49c-8 27-8 55 2 84"/><path d="M223 86c-28 21-42 46-42 74"/></g>
    `),
    tofu: cutout(`
      <defs><linearGradient id="t" x1="82" x2="220"><stop stop-color="#fff9da"/><stop offset="1" stop-color="#dcc98d"/></linearGradient></defs>
      <path d="M86 91l90-42 76 44-92 48z" fill="#fff2b7"/>
      <path d="M86 91v71l75 46v-67z" fill="url(#t)"/>
      <path d="M161 141l91-48v67l-91 48z" fill="#d6bd79"/>
      <g fill="#c8af70" opacity=".55"><circle cx="122" cy="120" r="5"/><circle cx="143" cy="151" r="4"/><circle cx="109" cy="160" r="4"/></g>
    `),
  },
  tools: {
    wok: cutout(`
      <defs><linearGradient id="w" x1="65" x2="242"><stop stop-color="#61615c"/><stop offset=".55" stop-color="#222"/><stop offset="1" stop-color="#050505"/></linearGradient></defs>
      <ellipse cx="145" cy="139" rx="88" ry="39" fill="url(#w)"/><ellipse cx="145" cy="126" rx="96" ry="28" fill="#3e3e3a"/><ellipse cx="145" cy="122" rx="73" ry="17" fill="#171717"/>
      <path d="M224 124l64-39" stroke="#292724" stroke-width="17" stroke-linecap="round"/><path d="M63 126l-40-22" stroke="#343330" stroke-width="13" stroke-linecap="round"/>
      <path d="M92 110c36 13 79 13 112 0" stroke="#8f8a7e" stroke-width="5" opacity=".45" stroke-linecap="round"/>
    `),
    steamer: cutout(`
      <defs><linearGradient id="wood" x1="72" x2="240"><stop stop-color="#d9b37c"/><stop offset=".5" stop-color="#bd8652"/><stop offset="1" stop-color="#805234"/></linearGradient></defs>
      <ellipse cx="160" cy="77" rx="74" ry="20" fill="#d9b37c"/><path d="M86 77h148v43c0 19-33 34-74 34s-74-15-74-34z" fill="url(#wood)"/>
      <ellipse cx="160" cy="121" rx="74" ry="20" fill="#c99661"/><path d="M86 121h148v43c0 19-33 34-74 34s-74-15-74-34z" fill="url(#wood)"/>
      <ellipse cx="160" cy="164" rx="74" ry="20" fill="#a86f44"/>
      <g stroke="#7a4d2f" opacity=".5"><path d="M104 82v88"/><path d="M133 85v94"/><path d="M162 88v98"/><path d="M191 85v94"/><path d="M219 82v88"/></g>
      <path d="M131 63c15-24 44-24 58 0" fill="none" stroke="#805234" stroke-width="9" stroke-linecap="round"/>
    `),
    oven: cutout(`
      <defs><linearGradient id="o" x1="70" x2="250"><stop stop-color="#faf2e5"/><stop offset=".55" stop-color="#c9b29d"/><stop offset="1" stop-color="#6f625a"/></linearGradient></defs>
      <rect x="65" y="55" width="190" height="137" rx="24" fill="url(#o)"/>
      <rect x="91" y="83" width="100" height="78" rx="10" fill="#29251f"/>
      <path d="M104 99h73v45h-73z" fill="#f2b56f" opacity=".65"/><path d="M98 167h86" stroke="#2f2b27" stroke-width="6" stroke-linecap="round"/>
      <circle cx="219" cy="95" r="15" fill="#f8f1e6"/><circle cx="219" cy="137" r="15" fill="#f8f1e6"/><path d="M212 95h14M219 88v14M213 137h12" stroke="#685c52" stroke-width="3" stroke-linecap="round"/>
    `),
    induction: cutout(`
      <defs><linearGradient id="i" x1="61" x2="259"><stop stop-color="#3b3c3d"/><stop offset=".5" stop-color="#111"/><stop offset="1" stop-color="#4e5355"/></linearGradient></defs>
      <path d="M61 82h198l34 75H27z" fill="url(#i)"/><path d="M38 151h245v20H38z" fill="#171717"/>
      <circle cx="124" cy="121" r="34" fill="none" stroke="#777" stroke-width="5" opacity=".5"/><circle cx="207" cy="123" r="24" fill="none" stroke="#777" stroke-width="4" opacity=".42"/>
      <g fill="#b9e6ff"><circle cx="85" cy="157" r="3"/><circle cx="100" cy="157" r="3"/><circle cx="115" cy="157" r="3"/></g>
    `),
    juicer: cutout(`
      <defs><linearGradient id="j" x1="96" x2="221"><stop stop-color="#dde7ec"/><stop offset=".5" stop-color="#a5bcc7"/><stop offset="1" stop-color="#5b6a70"/></linearGradient></defs>
      <path d="M119 52h73l15 82c3 18-11 35-30 35h-42c-19 0-33-17-30-35z" fill="url(#j)" opacity=".85"/>
      <path d="M126 74h63l8 55c2 15-9 28-25 28h-31c-16 0-28-14-25-30z" fill="#f5c05a" opacity=".7"/>
      <path d="M119 52h84" stroke="#465056" stroke-width="9" stroke-linecap="round"/><path d="M137 38h44" stroke="#303438" stroke-width="12" stroke-linecap="round"/>
      <rect x="104" y="167" width="105" height="45" rx="14" fill="#d9d1c8"/><circle cx="157" cy="190" r="11" fill="#36302b"/>
    `),
    soymilk: cutout(`
      <defs><linearGradient id="s" x1="95" x2="216"><stop stop-color="#fff8ef"/><stop offset=".55" stop-color="#d8cabd"/><stop offset="1" stop-color="#8b8177"/></linearGradient></defs>
      <path d="M111 63h93l18 116c3 19-12 35-31 35h-66c-19 0-34-16-31-35z" fill="url(#s)"/>
      <path d="M122 85h75" stroke="#fff" stroke-width="10" opacity=".55" stroke-linecap="round"/>
      <rect x="125" y="127" width="68" height="43" rx="12" fill="#252525"/><circle cx="159" cy="149" r="11" fill="#b8c67c"/><path d="M129 58h57" stroke="#45413d" stroke-width="13" stroke-linecap="round"/>
      <path d="M205 94c40 3 48 62 9 76" fill="none" stroke="#8b8177" stroke-width="13" stroke-linecap="round"/>
    `),
    coffee: cutout(`
      <defs><linearGradient id="c" x1="70" x2="244"><stop stop-color="#eee2d4"/><stop offset=".58" stop-color="#a89a8b"/><stop offset="1" stop-color="#4c4640"/></linearGradient></defs>
      <rect x="74" y="56" width="171" height="111" rx="20" fill="url(#c)"/>
      <rect x="102" y="87" width="68" height="35" rx="8" fill="#26221e"/><path d="M123 125h28v24h-28z" fill="#2b2520"/>
      <path d="M113 148h51c8 0 13 6 11 14l-6 25h-61l-7-25c-2-8 4-14 12-14z" fill="#f3efe8"/>
      <path d="M183 92h41" stroke="#2b2520" stroke-width="9" stroke-linecap="round"/><circle cx="203" cy="126" r="17" fill="#f6eee4"/><path d="M196 126h14" stroke="#5d544c" stroke-width="4" stroke-linecap="round"/>
    `),
    airfryer: cutout(`
      <defs><linearGradient id="a" x1="92" x2="225"><stop stop-color="#f4efe8"/><stop offset=".5" stop-color="#d0c4b8"/><stop offset="1" stop-color="#6f6760"/></linearGradient></defs>
      <path d="M96 62h128c13 0 24 11 24 24v87c0 23-18 41-41 41h-94c-23 0-41-18-41-41V86c0-13 11-24 24-24z" fill="url(#a)"/>
      <rect x="103" y="94" width="114" height="68" rx="15" fill="#262522"/><path d="M120 111h78v34h-78z" fill="#e4b06b" opacity=".72"/>
      <path d="M126 179h68" stroke="#fff7ec" stroke-width="11" stroke-linecap="round"/><circle cx="221" cy="82" r="10" fill="#2d2b28"/>
    `),
  },
  recipes: {
    eggplantRice: cutout(`
      <ellipse cx="160" cy="144" rx="91" ry="46" fill="#f7f4ed"/><path d="M75 139c10 50 45 74 85 74s75-24 85-74c-42 23-128 23-170 0z" fill="#cad5d6"/><ellipse cx="160" cy="139" rx="91" ry="35" fill="#fff"/>
      <g><ellipse cx="139" cy="117" rx="39" ry="18" fill="#6f3b2b" transform="rotate(-11 139 117)"/><ellipse cx="184" cy="120" rx="43" ry="18" fill="#7b412d" transform="rotate(10 184 120)"/><path d="M101 142c34-14 81-8 117 12" stroke="#c56f4f" stroke-width="14" stroke-linecap="round"/></g>
      <g fill="#3b7a38"><ellipse cx="118" cy="104" rx="12" ry="7"/><ellipse cx="204" cy="101" rx="13" ry="7"/><ellipse cx="224" cy="137" rx="11" ry="7"/></g>
      <circle cx="164" cy="112" r="13" fill="#f0d052"/><circle cx="164" cy="112" r="6" fill="#f6a62f"/>
    `),
    skilletEgg: cutout(`
      <ellipse cx="148" cy="142" rx="92" ry="43" fill="#1d1c1a"/><ellipse cx="148" cy="132" rx="83" ry="35" fill="#2d2a25"/><path d="M226 131l68-29" stroke="#25231f" stroke-width="15" stroke-linecap="round"/>
      <ellipse cx="145" cy="122" rx="63" ry="22" fill="#874630"/><circle cx="145" cy="117" r="28" fill="#fff4da"/><circle cx="148" cy="117" r="13" fill="#f2b431"/>
      <g fill="#4d8d41"><ellipse cx="106" cy="116" rx="11" ry="6"/><ellipse cx="192" cy="116" rx="13" ry="6"/></g>
    `),
    pepperEgg: cutout(`
      <ellipse cx="160" cy="151" rx="98" ry="44" fill="#f5f1ea"/><ellipse cx="160" cy="144" rx="80" ry="30" fill="#fff"/>
      <g fill="#f2c33c"><ellipse cx="123" cy="127" rx="31" ry="18" transform="rotate(-12 123 127)"/><ellipse cx="168" cy="121" rx="34" ry="18" transform="rotate(10 168 121)"/><ellipse cx="197" cy="146" rx="28" ry="15" transform="rotate(-10 197 146)"/></g>
      <g fill="#3e8b3d"><path d="M99 145c19-24 45-25 62-5-26 6-42 13-62 5z"/><path d="M174 101c25-5 43 8 51 30-22-9-38-12-51-30z"/></g>
      <g fill="#8e4333"><circle cx="138" cy="145" r="8"/><circle cx="184" cy="136" r="7"/><circle cx="207" cy="155" r="6"/></g>
    `),
    peachDrink: cutout(`
      <defs><linearGradient id="drink" x1="110" x2="210" y1="70" y2="208"><stop stop-color="#ffe2a4"/><stop offset=".55" stop-color="#ef8e6f"/><stop offset="1" stop-color="#b72d49"/></linearGradient></defs>
      <path d="M106 58h108l-17 150c-2 15-16 26-37 26s-35-11-37-26z" fill="url(#drink)" opacity=".82"/><path d="M106 58h108" stroke="#f5f1ea" stroke-width="10" stroke-linecap="round"/>
      <circle cx="144" cy="126" r="19" fill="#cf2544"/><circle cx="178" cy="109" r="17" fill="#f0a66c"/><circle cx="164" cy="157" r="13" fill="#fff" opacity=".42"/>
      <path d="M195 36l-36 88" stroke="#8f6242" stroke-width="8" stroke-linecap="round"/><path d="M204 89c30-3 45 13 47 39" fill="none" stroke="#9bb664" stroke-width="8" stroke-linecap="round"/>
    `),
    yogurtBowl: cutout(`
      <ellipse cx="160" cy="146" rx="99" ry="45" fill="#f7f2eb"/><path d="M70 144c10 48 47 72 90 72s80-24 90-72c-47 21-133 21-180 0z" fill="#d7d3cc"/><ellipse cx="160" cy="140" rx="94" ry="37" fill="#fff"/>
      <g><circle cx="122" cy="128" r="20" fill="#b92442"/><circle cx="154" cy="116" r="18" fill="#ec9f65"/><circle cx="190" cy="132" r="18" fill="#bc2443"/></g>
      <g stroke="#b98d48" stroke-width="6" stroke-linecap="round"><path d="M104 151l24 10"/><path d="M139 151l28 11"/><path d="M174 154l32 7"/></g>
    `),
    berrySauce: cutout(`
      <defs><linearGradient id="jar" x1="96" x2="222"><stop stop-color="#ffffff"/><stop offset=".55" stop-color="#dfecf0"/><stop offset="1" stop-color="#96a7ad"/></linearGradient></defs>
      <path d="M112 74h96l13 119c2 20-14 37-35 37h-52c-21 0-37-17-35-37z" fill="url(#jar)" opacity=".82"/>
      <path d="M111 82h98v29h-98z" fill="#3b2a24"/><path d="M113 122h96v72c-24 18-71 18-96 0z" fill="#b62342" opacity=".86"/>
      <g fill="#6b1430"><circle cx="136" cy="143" r="11"/><circle cx="171" cy="153" r="10"/><circle cx="189" cy="178" r="12"/></g>
      <path d="M124 57h72" stroke="#e8e2d4" stroke-width="15" stroke-linecap="round"/>
    `),
  },
};

const initialStock: StockItem[] = [
  {
    id: "egg",
    name: "鸡蛋",
    quantity: 4,
    unit: "个",
    storage: "fridge",
    freshness: "normal",
    category: "protein",
    addedAt: "今天",
    image: assetCatalog.ingredients.egg,
    minQuantity: 2,
  },
  {
    id: "eggplant",
    name: "茄子",
    quantity: 1,
    unit: "根",
    storage: "fridge",
    freshness: "normal",
    category: "vegetable",
    addedAt: "昨天",
    image: assetCatalog.ingredients.eggplant,
  },
  {
    id: "pork",
    name: "肉沫",
    quantity: 200,
    unit: "g",
    storage: "fridge",
    freshness: "use-soon",
    category: "protein",
    addedAt: "前天",
    image: assetCatalog.ingredients.pork,
  },
  {
    id: "pepper",
    name: "青椒",
    quantity: 2,
    unit: "个",
    storage: "fridge",
    freshness: "normal",
    category: "vegetable",
    addedAt: "昨天",
    image: assetCatalog.ingredients.pepper,
  },
  {
    id: "peach",
    name: "桃子",
    quantity: 2,
    unit: "个",
    storage: "fridge",
    freshness: "fresh",
    category: "fruit",
    addedAt: "今天",
    image: assetCatalog.ingredients.peach,
  },
  {
    id: "yangmei",
    name: "杨梅",
    quantity: 1,
    unit: "盒",
    storage: "fridge",
    freshness: "use-soon",
    category: "fruit",
    addedAt: "今天",
    image: assetCatalog.ingredients.yangmei,
  },
  {
    id: "rice",
    name: "米饭",
    quantity: 1,
    unit: "碗",
    storage: "pantry",
    freshness: "normal",
    category: "staple",
    addedAt: "常备",
    image: assetCatalog.ingredients.rice,
    minQuantity: 1,
  },
  {
    id: "soy",
    name: "生抽",
    quantity: 1,
    unit: "瓶",
    storage: "seasoning",
    freshness: "normal",
    category: "seasoning",
    addedAt: "常备",
    image: assetCatalog.ingredients.soy,
  },
];

const tools: KitchenTool[] = [
  { id: "wok", name: "炒锅", group: "heat", subtitle: "爆炒 / 盖饭 / 热菜", image: assetCatalog.tools.wok },
  { id: "steamer", name: "蒸锅", group: "steam", subtitle: "清蒸 / 蒸蛋 / 点心", image: assetCatalog.tools.steamer },
  { id: "oven", name: "烤箱", group: "bake", subtitle: "烘烤 / 焗菜 / 甜点", image: assetCatalog.tools.oven },
  { id: "induction", name: "电磁炉", group: "heat", subtitle: "小锅 / 汤面 / 一人食", image: assetCatalog.tools.induction },
  { id: "juicer", name: "榨汁机", group: "drink", subtitle: "果汁 / 奶昔 / 沙冰", image: assetCatalog.tools.juicer },
  { id: "soymilk", name: "豆浆机", group: "drink", subtitle: "豆浆 / 米糊 / 热饮", image: assetCatalog.tools.soymilk },
  { id: "coffee", name: "咖啡机", group: "drink", subtitle: "咖啡 / 冷萃 / 特调", image: assetCatalog.tools.coffee },
  { id: "airfryer", name: "空气炸锅", group: "bake", subtitle: "少油 / 烤物 / 快手", image: assetCatalog.tools.airfryer },
];

function generateRecipes(stock: StockItem[], selectedIds: string[], tool: KitchenTool): RecipeIdea[] {
  const selected = stock.filter((item) => selectedIds.includes(item.id));
  const names = selected.map((item) => item.name);
  const has = (name: string) => names.includes(name);
  const fruitMode = tool.group === "drink" || selected.some((item) => item.category === "fruit");

  if (fruitMode) {
    return [
      {
        id: "berry-peach-sparkle",
        title: "杨梅桃子气泡饮",
        tool: tool.name,
        cuisine: "饮品",
        origin: "现代冷饮",
        calories: 138,
        time: 8,
        difficulty: "低",
        image: assetCatalog.recipes.peachDrink,
        why: "最推荐。优先消耗杨梅，桃子提供甜感，不开火也能完成一次库存转化。",
        used: [
          { id: "yangmei", amount: has("杨梅") ? 1 : 0, label: "杨梅半盒" },
          { id: "peach", amount: has("桃子") ? 1 : 0, label: "桃子 1 个" },
        ].filter((item) => item.amount > 0),
        missing: ["气泡水", "冰块"],
        repeatList: ["气泡水", "冰块", "薄荷"],
        steps: ["杨梅轻压出汁，桃子切块。", "加入冰块和水果。", "倒入气泡水，静置 3 分钟。"],
      },
      {
        id: "fruit-yogurt-bowl",
        title: "杨梅桃子酸奶杯",
        tool: "冷食",
        cuisine: "甜品",
        origin: "北欧早餐",
        calories: 260,
        time: 6,
        difficulty: "低",
        image: assetCatalog.recipes.yogurtBowl,
        why: "无需厨具，适合把水果变成一份完整小餐。",
        used: [
          { id: "yangmei", amount: has("杨梅") ? 1 : 0, label: "杨梅半盒" },
          { id: "peach", amount: has("桃子") ? 1 : 0, label: "桃子 1 个" },
        ].filter((item) => item.amount > 0),
        missing: ["酸奶"],
        repeatList: ["酸奶", "燕麦片"],
        steps: ["水果洗净切块。", "杯底铺酸奶。", "放入水果，按口味加蜂蜜。"],
      },
      {
        id: "berry-sauce",
        title: "杨梅桃子酸甜酱",
        tool: "小锅",
        cuisine: "酱汁",
        origin: "法式果酱",
        calories: 190,
        time: 14,
        difficulty: "中",
        image: assetCatalog.recipes.berrySauce,
        why: "把水果变成酱汁，可搭配煎蛋、烤肉或面包，扩大使用场景。",
        used: [
          { id: "yangmei", amount: has("杨梅") ? 1 : 0, label: "杨梅半盒" },
          { id: "peach", amount: has("桃子") ? 1 : 0, label: "桃子半个" },
        ].filter((item) => item.amount > 0),
        missing: ["柠檬汁"],
        repeatList: ["柠檬", "蜂蜜"],
        steps: ["水果切小块入锅。", "小火压煮到出汁。", "加柠檬汁，收至微稠。"],
      },
    ];
  }

  return [
    {
      id: "eggplant-pork-rice",
      title: "肉沫青椒茄子盖饭",
      tool: tool.name,
      cuisine: "家常",
      origin: "中国家常菜",
      calories: 520,
      time: 18,
      difficulty: "中",
      image: assetCatalog.recipes.eggplantRice,
      why: "最推荐。肉沫优先消耗，茄子和青椒形成完整热菜，配饭就是一餐。",
      used: [
        { id: "eggplant", amount: has("茄子") ? 1 : 0, label: "茄子 1 根" },
        { id: "pork", amount: has("肉沫") ? 100 : 0, label: "肉沫 100g" },
        { id: "pepper", amount: has("青椒") ? 1 : 0, label: "青椒 1 个" },
      ].filter((item) => item.amount > 0),
      missing: [],
      repeatList: ["蒜", "葱", "米饭"],
      steps: ["茄子切条，青椒切块。", "肉沫炒散，加生抽和少量水。", "放茄子焖软，再下青椒收汁。", "盖到米饭上。"],
    },
    {
      id: "eggplant-egg-skillet",
      title: "茄子肉沫温泉蛋小锅",
      tool: tool.name,
      cuisine: "创意家常",
      origin: "日式小锅灵感",
      calories: 430,
      time: 22,
      difficulty: "中",
      image: assetCatalog.recipes.skilletEgg,
      why: "用鸡蛋做口感层次，仍然低风险，适合想换个吃法。",
      used: [
        { id: "eggplant", amount: has("茄子") ? 1 : 0, label: "茄子 1 根" },
        { id: "pork", amount: has("肉沫") ? 120 : 0, label: "肉沫 120g" },
        { id: "egg", amount: has("鸡蛋") ? 1 : 0, label: "鸡蛋 1 个" },
      ].filter((item) => item.amount > 0),
      missing: ["葱花"],
      repeatList: ["葱", "白芝麻"],
      steps: ["肉沫炒香，加入茄子。", "加生抽和少量水焖 8 分钟。", "关火后打入鸡蛋，盖盖焖到半熟。", "拌开后配饭。"],
    },
    {
      id: "pepper-egg",
      title: "青椒炒蛋加肉沫",
      tool: tool.name,
      cuisine: "快手",
      origin: "中国家常菜",
      calories: 360,
      time: 12,
      difficulty: "低",
      image: assetCatalog.recipes.pepperEgg,
      why: "步骤短、洗碗少，适合懒得烧但想吃热菜的时候。",
      used: [
        { id: "pepper", amount: has("青椒") ? 1 : 0, label: "青椒 1 个" },
        { id: "egg", amount: has("鸡蛋") ? 2 : 0, label: "鸡蛋 2 个" },
        { id: "pork", amount: has("肉沫") ? 60 : 0, label: "肉沫 60g" },
      ].filter((item) => item.amount > 0),
      missing: [],
      repeatList: ["鸡蛋"],
      steps: ["鸡蛋打散先炒成块。", "肉沫炒散后下青椒。", "倒回鸡蛋，加生抽调味。"],
    },
  ];
}

function App() {
  const [view, setView] = useState<View>("inventory");
  const [stock, setStock] = useState<StockItem[]>(initialStock);
  const [selectedIds, setSelectedIds] = useState<string[]>(["eggplant", "pork", "pepper"]);
  const [activeToolId, setActiveToolId] = useState("wok");
  const [recipes, setRecipes] = useState<RecipeIdea[]>([]);
  const [featuredRecipe, setFeaturedRecipe] = useState<RecipeIdea | null>(null);
  const [openTutorialId, setOpenTutorialId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<RecipeIdea[]>([]);
  const [records, setRecords] = useState<CookRecord[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const activeTool = tools.find((tool) => tool.id === activeToolId) ?? tools[0];
  const availableStock = stock.filter((item) => item.quantity > 0);
  const selectedItems = availableStock.filter((item) => selectedIds.includes(item.id));
  const filteredStock = availableStock.filter((item) => item.name.includes(query.trim()));
  const useSoonCount = availableStock.filter((item) => item.freshness === "use-soon").length;
  const favoriteIds = new Set(favorites.map((recipe) => recipe.id));

  const shoppingFromRecipes = useMemo(
    () => shopping.filter((item) => !item.checked),
    [shopping],
  );

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  function generate() {
    const generated = generateRecipes(availableStock, selectedIds, activeTool);
    setRecipes(generated);
    setFeaturedRecipe(generated[0] ?? null);
    setOpenTutorialId(null);
    setView("recipes");
  }

  function toggleFavorite(recipe: RecipeIdea) {
    setFavorites((current) =>
      current.some((item) => item.id === recipe.id)
        ? current.filter((item) => item.id !== recipe.id)
        : [recipe, ...current],
    );
  }

  function addWantedRecipe(recipe: RecipeIdea, source: string) {
    const nextItems = [...recipe.missing, ...recipe.repeatList].map((name) => ({
      id: `${recipe.id}-${source}-${name}-${Date.now()}`,
      name,
      reason: `想做《${recipe.title}》`,
      checked: false,
    }));
    setShopping((current) => {
      const names = new Set(current.map((item) => item.name));
      return [...current, ...nextItems.filter((item) => !names.has(item.name))];
    });
    setView("shopping");
  }

  function cookRecipe(recipe: RecipeIdea) {
    setStock((current) =>
      current.map((item) => {
        const usage = recipe.used.find((used) => used.id === item.id);
        if (!usage) return item;
        return { ...item, quantity: Math.max(0, Number((item.quantity - usage.amount).toFixed(2))) };
      }),
    );
    setRecords((current) => [
      {
        id: `${recipe.id}-${Date.now()}`,
        recipe,
        cookedAt: "刚刚",
        rating: 92,
        photoNote: "可上传成品照，AI 评分和生成贴图记录。",
      },
      ...current,
    ]);
    setSelectedIds([]);
    setOpenTutorialId(null);
    setView("cooked");
  }

  function addStockItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const quantity = Number(formData.get("quantity") || 1);
    const unit = String(formData.get("unit") || "份").trim();
    const storage = String(formData.get("storage") || "fridge") as StorageType;
    if (!name) return;
    setStock((current) => [
      {
        id: `${name}-${Date.now()}`,
        name,
        quantity,
        unit,
        storage,
        freshness: "normal",
        category: "vegetable",
        addedAt: "刚刚",
        image: assetCatalog.ingredients.lemon,
      },
      ...current,
    ]);
    setIsAdding(false);
    event.currentTarget.reset();
  }

  return (
    <div className="appShell">
      <div className="appFrame">
        <header className="topbar">
          <button className="brandButton" onClick={() => setView("inventory")} type="button">
            <span className="brandMark">M</span>
            <span>
              <strong>Miiix</strong>
              <small>inventory to recipes</small>
            </span>
          </button>
          <div className="topbarActions">
            <button className="softIcon" type="button" aria-label="拍照识别入口">
              <Camera size={18} />
            </button>
            <button className="softIcon" type="button" aria-label="临期提醒">
              <Bell size={18} />
              {useSoonCount > 0 && <span className="dot">{useSoonCount}</span>}
            </button>
          </div>
        </header>

        <main className="screen">
          {view === "inventory" && (
            <InventoryView
              stock={filteredStock}
              selectedIds={selectedIds}
              query={query}
              setQuery={setQuery}
              toggleSelected={toggleSelected}
              selectedItems={selectedItems}
              isAdding={isAdding}
              setIsAdding={setIsAdding}
              addStockItem={addStockItem}
              onGenerate={generate}
              onTools={() => setView("tools")}
            />
          )}
          {view === "tools" && (
            <ToolsView
              tools={tools}
              activeToolId={activeToolId}
              setActiveToolId={setActiveToolId}
              selectedItems={selectedItems}
              onGenerate={generate}
            />
          )}
          {view === "recipes" && (
            <RecipesView
              recipes={recipes}
              featuredRecipe={featuredRecipe}
              favoriteIds={favoriteIds}
              openTutorialId={openTutorialId}
              setOpenTutorialId={setOpenTutorialId}
              toggleFavorite={toggleFavorite}
              cookRecipe={cookRecipe}
              addWantedRecipe={addWantedRecipe}
              onBack={() => setView("tools")}
            />
          )}
          {view === "favorites" && (
            <RecipeCollection
              title="我的收藏"
              empty="收藏菜谱后会放在这里，用来生成想做清单。"
              recipes={favorites}
              favoriteIds={favoriteIds}
              openTutorialId={openTutorialId}
              setOpenTutorialId={setOpenTutorialId}
              toggleFavorite={toggleFavorite}
              cookRecipe={cookRecipe}
              addWantedRecipe={addWantedRecipe}
            />
          )}
          {view === "cooked" && <CookedView records={records} addWantedRecipe={addWantedRecipe} />}
          {view === "shopping" && (
            <ShoppingView shopping={shoppingFromRecipes} setShopping={setShopping} />
          )}
        </main>

        <nav className="bottomNav" aria-label="主导航">
          <NavButton icon={<Refrigerator size={19} />} label="库存" active={view === "inventory"} onClick={() => setView("inventory")} />
          <NavButton icon={<Utensils size={19} />} label="厨具" active={view === "tools"} onClick={() => setView("tools")} />
          <NavButton icon={<Bookmark size={19} />} label="收藏" active={view === "favorites"} onClick={() => setView("favorites")} />
          <NavButton icon={<ChefHat size={19} />} label="我的菜谱" active={view === "cooked"} onClick={() => setView("cooked")} />
          <NavButton icon={<ShoppingBasket size={19} />} label="清单" active={view === "shopping"} onClick={() => setView("shopping")} />
        </nav>
      </div>
    </div>
  );
}

function InventoryView({
  stock,
  selectedIds,
  query,
  setQuery,
  toggleSelected,
  selectedItems,
  isAdding,
  setIsAdding,
  addStockItem,
  onGenerate,
  onTools,
}: {
  stock: StockItem[];
  selectedIds: string[];
  query: string;
  setQuery: (value: string) => void;
  toggleSelected: (id: string) => void;
  selectedItems: StockItem[];
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
  addStockItem: (event: FormEvent<HTMLFormElement>) => void;
  onGenerate: () => void;
  onTools: () => void;
}) {
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Inventory assets</p>
          <h1 className="pageTitle">冰箱库存</h1>
          <p className="pageSub">今日库存：优先处理临期食材，保留采买日期和数量。</p>
        </div>
        <button className="softIcon large" onClick={() => setIsAdding(!isAdding)} type="button" aria-label="添加食材">
          <Plus size={22} />
        </button>
      </div>

      <div className="scanStrip">
        <button type="button"><Camera size={17} /> 拍照识别</button>
        <button type="button"><Images size={17} /> 上传小票</button>
        <button type="button"><ListPlus size={17} /> 手动添加</button>
      </div>

      <label className="searchBox">
        <Search size={18} />
        <input placeholder="搜索食材" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      {isAdding && (
        <form className="addPanel" onSubmit={addStockItem}>
          <input name="name" placeholder="食材名称" />
          <div className="formRow">
            <input name="quantity" type="number" min="0.1" step="0.1" defaultValue="1" />
            <input name="unit" placeholder="单位" defaultValue="份" />
          </div>
          <select name="storage" defaultValue="fridge">
            <option value="fridge">冰箱</option>
            <option value="freezer">冷冻室</option>
            <option value="pantry">常温柜</option>
            <option value="seasoning">调料柜</option>
          </select>
          <button className="primaryButton" type="submit">加入库存</button>
        </form>
      )}

      <div className="ingredientGrid">
        {stock.map((item) => (
          <button
            className={`assetCard ingredientAsset ${selectedIds.includes(item.id) ? "selected" : ""}`}
            key={item.id}
            onClick={() => toggleSelected(item.id)}
            type="button"
          >
            <img className="cutoutImage" src={item.image} alt={item.name} />
            <span className={`freshness ${item.freshness}`}>{freshnessLabels[item.freshness]}</span>
            <strong>{item.name}</strong>
            <small>{item.quantity}{item.unit} · {storageLabels[item.storage]}</small>
            {selectedIds.includes(item.id) && <span className="selectedBadge"><Check size={14} /></span>}
          </button>
        ))}
      </div>

      <div className="actionDock">
        <div>
          <strong>{selectedItems.length} 个食材已选</strong>
          <small>{selectedItems.map((item) => item.name).join(" / ") || "选择食材后进入厨具"}</small>
        </div>
        <button className="ghostButton" onClick={onTools} type="button">选厨具</button>
        <button className="primaryButton" onClick={onGenerate} type="button"><Wand2 size={16} /> 生成</button>
      </div>
    </section>
  );
}

function ToolsView({
  tools,
  activeToolId,
  setActiveToolId,
  selectedItems,
  onGenerate,
}: {
  tools: KitchenTool[];
  activeToolId: string;
  setActiveToolId: (id: string) => void;
  selectedItems: StockItem[];
  onGenerate: () => void;
}) {
  const groups = [
    { id: "heat", label: "加热" },
    { id: "steam", label: "蒸煮" },
    { id: "bake", label: "烘烤" },
    { id: "drink", label: "饮品" },
    { id: "prep", label: "处理" },
  ];
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Kitchen tools</p>
          <h1 className="pageTitle">选择厨具</h1>
          <p className="pageSub">按当前食材选择烹饪方式。</p>
        </div>
        <button className="primaryButton" onClick={onGenerate} type="button"><Sparkles size={16} /> 生成食谱</button>
      </div>

      <div className="selectedRail">
        {selectedItems.map((item) => (
          <div className="tinyCutout" key={item.id}>
            <img src={item.image} alt={item.name} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      {groups.map((group) => {
        const groupTools = tools.filter((tool) => tool.group === group.id);
        if (!groupTools.length) return null;
        return (
          <div className="toolGroup" key={group.id}>
            <h2>{group.label}</h2>
            <div className="toolGrid">
              {groupTools.map((tool) => (
                <button
                  className={`assetCard toolCard ${activeToolId === tool.id ? "selected" : ""}`}
                  key={tool.id}
                  onClick={() => setActiveToolId(tool.id)}
                  type="button"
                >
                  <img className="cutoutImage toolImage" src={tool.image} alt={tool.name} />
                  <strong>{tool.name}</strong>
                  <small>{tool.subtitle}</small>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function RecipesView(props: {
  recipes: RecipeIdea[];
  featuredRecipe: RecipeIdea | null;
  favoriteIds: Set<string>;
  openTutorialId: string | null;
  setOpenTutorialId: (id: string | null) => void;
  toggleFavorite: (recipe: RecipeIdea) => void;
  cookRecipe: (recipe: RecipeIdea) => void;
  addWantedRecipe: (recipe: RecipeIdea, source: string) => void;
  onBack: () => void;
}) {
  const { recipes, featuredRecipe, onBack } = props;
  return (
    <section>
      <button className="textButton" onClick={onBack} type="button"><ChevronLeft size={18} /> 返回厨具</button>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Recipe surprise</p>
          <h1 className="pageTitle">推荐食谱</h1>
          <p className="pageSub">今日最合适的一道菜已优先弹出。</p>
        </div>
      </div>
      {featuredRecipe && (
        <div className="surpriseDish">
          <img src={featuredRecipe.image} alt={featuredRecipe.title} />
          <div>
            <span>Best match</span>
            <h2>{featuredRecipe.title}</h2>
            <p>{featuredRecipe.why}</p>
          </div>
        </div>
      )}
      <RecipeCards {...props} recipes={recipes} />
    </section>
  );
}

function RecipeCollection(props: {
  title: string;
  empty: string;
  recipes: RecipeIdea[];
  favoriteIds: Set<string>;
  openTutorialId: string | null;
  setOpenTutorialId: (id: string | null) => void;
  toggleFavorite: (recipe: RecipeIdea) => void;
  cookRecipe: (recipe: RecipeIdea) => void;
  addWantedRecipe: (recipe: RecipeIdea, source: string) => void;
}) {
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Saved recipes</p>
          <h1 className="pageTitle">{props.title}</h1>
          <p className="pageSub">{props.empty}</p>
        </div>
      </div>
      <RecipeCards {...props} />
    </section>
  );
}

function RecipeCards({
  recipes,
  favoriteIds,
  openTutorialId,
  setOpenTutorialId,
  toggleFavorite,
  cookRecipe,
  addWantedRecipe,
}: {
  recipes: RecipeIdea[];
  favoriteIds: Set<string>;
  openTutorialId: string | null;
  setOpenTutorialId: (id: string | null) => void;
  toggleFavorite: (recipe: RecipeIdea) => void;
  cookRecipe: (recipe: RecipeIdea) => void;
  addWantedRecipe: (recipe: RecipeIdea, source: string) => void;
}) {
  if (!recipes.length) {
    return <div className="emptyState"><Bookmark size={34} /><p>暂无菜谱</p></div>;
  }
  return (
    <div className="recipeGrid">
      {recipes.map((recipe) => {
        const isOpen = openTutorialId === recipe.id;
        const isFav = favoriteIds.has(recipe.id);
        return (
          <article className={`recipeFlip ${isOpen ? "open" : ""}`} key={recipe.id}>
            <div className="recipeFace recipeFront">
              <button className="favoriteButton" onClick={() => toggleFavorite(recipe)} type="button" aria-label="收藏菜谱">
                {isFav ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>
              <img className="dishCutout" src={recipe.image} alt={recipe.title} />
              <div className="tagRow">
                <span><Timer size={13} /> {recipe.time} 分钟</span>
                <span>{recipe.difficulty}</span>
                <span>{recipe.cuisine}</span>
                <span>{recipe.origin}</span>
                <span>{recipe.calories} kcal</span>
              </div>
              <h2>{recipe.title}</h2>
              <p>{recipe.why}</p>
              <div className="needLine">需要：{recipe.used.map((item) => item.label).join("、") || "当前库存"}</div>
              <div className="cardActions">
                <button className="ghostButton" onClick={() => addWantedRecipe(recipe, "wanted")} type="button">
                  <ClipboardList size={16} /> 想做
                </button>
                <button className="primaryButton" onClick={() => setOpenTutorialId(recipe.id)} type="button">
                  <ChefHat size={16} /> 制作
                </button>
              </div>
            </div>
            <div className="recipeFace recipeBack">
              <button className="textButton" onClick={() => setOpenTutorialId(null)} type="button"><ChevronLeft size={18} /> 返回卡片</button>
              <h2>{recipe.title}</h2>
              <ol>
                {recipe.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <div className="cookInteractions">
                <div><Camera size={18} /><span>成品照 AI 打分</span></div>
                <div><BadgeCheck size={18} /><span>生成制作贴图</span></div>
              </div>
              <button className="cookButton" onClick={() => cookRecipe(recipe)} type="button">
                <Check size={17} /> 完成制作并记录
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CookedView({
  records,
  addWantedRecipe,
}: {
  records: CookRecord[];
  addWantedRecipe: (recipe: RecipeIdea, source: string) => void;
}) {
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">My cookbook</p>
          <h1 className="pageTitle">我的菜谱</h1>
          <p className="pageSub">做过的菜会沉淀成你的私人菜谱。</p>
        </div>
      </div>
      {!records.length ? (
        <div className="emptyState"><ChefHat size={34} /><p>完成制作后会生成记录。</p></div>
      ) : (
        <div className="cookedList">
          {records.map((record) => (
            <article className="cookedCard" key={record.id}>
              <img src={record.recipe.image} alt={record.recipe.title} />
              <div>
                <h2>{record.recipe.title}</h2>
                <p>{record.photoNote}</p>
                <span><Star size={14} /> AI 评分 {record.rating}</span>
              </div>
              <button className="ghostButton" onClick={() => addWantedRecipe(record.recipe, "cooked")} type="button">
                复做清单
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ShoppingView({
  shopping,
  setShopping,
}: {
  shopping: ShoppingItem[];
  setShopping: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
}) {
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">From wanted recipes</p>
          <h1 className="pageTitle">购物清单</h1>
          <p className="pageSub">由想做菜谱自动汇总。</p>
        </div>
      </div>
      {!shopping.length ? (
        <div className="emptyState"><ShoppingBasket size={34} /><p>先在菜谱卡片点击“想做”。</p></div>
      ) : (
        <div className="shoppingList">
          {shopping.map((item) => (
            <label className={`shoppingItem ${item.checked ? "done" : ""}`} key={item.id}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() =>
                  setShopping((current) =>
                    current.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry),
                  )
                }
              />
              <span><strong>{item.name}</strong><small>{item.reason}</small></span>
              <button type="button" onClick={() => setShopping((current) => current.filter((entry) => entry.id !== item.id))}>
                <Trash2 size={16} />
              </button>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`navButton ${active ? "active" : ""}`} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default App;
