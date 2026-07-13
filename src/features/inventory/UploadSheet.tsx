import {
  Camera,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Image,
  Keyboard,
  PackageCheck,
  ReceiptText,
  Scale,
  Snowflake,
  Sparkles,
  Tags,
  Upload,
} from "lucide-react";
import { FoodImage } from "../../components/ui";
import { categoryTree, foodLibrary, recognitionPresets } from "../../data/catalog";
import {
  storageText,
  type AmountMode,
  type FoodInfo,
  type RecognitionStatus,
  type RecognizedFood,
  type UploadMethod,
} from "../../domain/inventory";

const uploadMethods = [
  { id: "photo", label: "拍照识别", icon: Camera, note: "适合冰箱现场拍摄，AI 识别后自动填充。" },
  { id: "online", label: "线上截图", icon: Image, note: "适合外卖买菜、盒马、叮咚订单截图。" },
  { id: "receipt", label: "小票", icon: ReceiptText, note: "适合线下超市购物小票。" },
  { id: "manual", label: "手动输入", icon: Keyboard, note: "最快补录，分类和默认值自动带出。" },
] satisfies { id: UploadMethod; label: string; icon: typeof Camera; note: string }[];

export function UploadSheet({
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

