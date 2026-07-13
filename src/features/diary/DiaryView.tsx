import { CalendarDays, Check, ClipboardList, PenLine, ShoppingBag, Utensils } from "lucide-react";
import { useState } from "react";
import { FoodImage } from "../../components/ui";
import { fallbackImage } from "../../data/catalog";
import {
  amountText,
  storageText,
  type InventoryItem,
} from "../../domain/inventory";
import { recipeMainIngredients, type Recipe } from "../../domain/recipe";
import type { MealPlan, ShoppingLine } from "../../domain/plan";
import {
  calendarDatesFor,
  dateTitle,
  inventoryDate,
  monthTitle,
  parseISODate,
  sameMonth,
  todayISO,
  toISODate,
  type DiaryEntry,
} from "../../domain/diary";

function TodayPlanPanel({
  plan,
  shoppingList,
  expanded,
  setExpanded,
  completeCooking,
}: {
  plan: MealPlan;
  shoppingList: ShoppingLine[];
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  completeCooking: (recipe: Recipe, source: string) => void;
}) {
  const mainIngredients = recipeMainIngredients(plan.recipe);
  const missingCount = shoppingList.filter((line) => !line.owned && line.name !== "库存已覆盖全部食材").length;

  return (
    <article className="todayPlanCard">
      <div className="todayPlanHeader">
        <div>
          <p className="eyebrow">Today's plan</p>
          <h2>{plan.recipe.title}</h2>
          <span>来自 {plan.source} · {plan.recipe.minutes} 分钟 · {plan.recipe.difficulty}</span>
        </div>
        <img src={plan.recipe.image} alt={plan.recipe.title} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
      </div>
      <div className="todayPlanMeta">
        <div>
          <span>计划状态</span>
          <strong>{expanded ? "制作中" : "准备做"}</strong>
        </div>
        <div>
          <span>采购缺口</span>
          <strong>{missingCount > 0 ? `${missingCount} 项` : "库存够用"}</strong>
        </div>
      </div>
      <div className="needLine planNeedLine"><Utensils size={15} /> 食材：{mainIngredients.join("、") || "当前库存食材"}</div>
      {expanded && (
        <ol className="todaySteps">
          {plan.recipe.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      )}
      <div className="todayPlanActions">
        <button className="ghostButton" type="button" onClick={() => setExpanded(!expanded)}>
          <ClipboardList size={16} /> {expanded ? "收起步骤" : "开始制作"}
        </button>
        <button className="primaryButton" type="button" onClick={() => completeCooking(plan.recipe, plan.source)}>
          <Check size={16} /> 完成制作
        </button>
      </div>
    </article>
  );
}

export function DiaryView({
  diary,
  shoppingList,
  inventory,
  todayPlan,
  completeCooking,
}: {
  diary: DiaryEntry[];
  shoppingList: ShoppingLine[];
  inventory: InventoryItem[];
  todayPlan: MealPlan | null;
  completeCooking: (recipe: Recipe, source: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [planExpanded, setPlanExpanded] = useState(false);
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
      {todayPlan && (
        <TodayPlanPanel
          plan={todayPlan}
          shoppingList={shoppingList}
          expanded={planExpanded}
          setExpanded={setPlanExpanded}
          completeCooking={completeCooking}
        />
      )}
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


