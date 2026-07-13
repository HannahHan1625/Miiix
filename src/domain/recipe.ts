export type RecipeFilter = "all" | "favorite" | "cooked";
export type RecipeInputMode = "photo" | "voice";

export type Recipe = {
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

export type KitchenTool = {
  id: string;
  name: string;
  subtitle: string;
  tone: string;
  image: string;
};

export type FoodPreference = {
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

export type RecipeInference = {
  title: string;
  confidence: number;
  clues: string[];
  flavor: string;
  steps: string[];
};

const seasoningWords = new Set(["生抽", "少量糖", "糖", "柠檬", "橄榄油", "蜂蜜", "牛奶", "冰块", "清水", "盐"]);

export function recipeSeasonings(recipe: Recipe) {
  return recipe.required.filter((item) => seasoningWords.has(item));
}

export function recipeMainIngredients(recipe: Recipe) {
  return recipe.required.filter((item) => !seasoningWords.has(item));
}
