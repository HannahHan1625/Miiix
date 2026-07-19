import { Bookmark, BookmarkCheck, Camera, Image, Mic, Sparkles, Utensils } from "lucide-react";
import { useState } from "react";
import { RecipeMeta } from "../../components/ui";
import { fallbackImage } from "../../data/catalog";
import type { Recipe, RecipeFilter, RecipeInference, RecipeInputMode } from "../../domain/recipe";

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

export function RecipesView({
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
  toggleFavorite: (recipe: Recipe) => void;
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
            <button className="favoriteButton" type="button" onClick={() => toggleFavorite(recipe)} aria-label="收藏菜谱">
              {favorites.includes(recipe.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
            <img src={recipe.image} alt={recipe.title} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
            <h2>{recipe.title}</h2>
            <RecipeMeta recipe={recipe} />
            <p>{recipe.reason}</p>
            <div className="needLine"><Utensils size={15} /> 需要：{recipe.ingredients.map((item) => item.name).join("、")}</div>
            <div className="cardActions">
              <span>{cookedIds.includes(recipe.id) ? "做过" : "未做"}</span>
              <button className="primaryButton" type="button" onClick={() => planToday(recipe, "菜谱选择")}>
                今天做
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

