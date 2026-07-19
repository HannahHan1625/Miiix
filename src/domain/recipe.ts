export type RecipeFilter = "all" | "favorite" | "cooked";
export type RecipeInputMode = "photo" | "voice";

export type Recipe = {
  id: string;
  title: string;
  cuisine: string;
  difficulty: "轻松" | "认真" | "挑战";
  minutes: number;
  calories: number | null;
  image: string;
  ingredients: RecipeIngredient[];
  toolId: string;
  reason: string;
  steps: string[];
};

export type RecipeIngredient = {
  ingredientId: string;
  conceptId?: string;
  variantId?: string | null;
  formCode?: IngredientFormCode;
  processState?: IngredientProcessState;
  name: string;
  role: "main" | "seasoning" | "optional" | "garnish";
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

export function recipeSeasonings(recipe: Recipe) {
  return recipe.ingredients
    .filter((item) => item.role === "seasoning")
    .map((item) => item.name);
}

export function recipeMainIngredients(recipe: Recipe) {
  return recipe.ingredients
    .filter((item) => item.role === "main")
    .map((item) => item.name);
}

export function recipeIngredientNames(recipe: Recipe) {
  return recipe.ingredients.map((item) => item.name);
}
import type { IngredientFormCode, IngredientProcessState } from "./persistence";
