import { formatRuDayMonth, weekdayShortRu } from "../../lib/dates";
import { createPlannerStore, type PlannerView } from "../../lib/planner-store";
import type { ExtraId, LevelId, StyleId } from "../../lib/planner";

export function mountPlanner(root: HTMLElement): void {
  const store = createPlannerStore();
  const find = <T extends HTMLElement>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Planner: missing ${selector}`);
    return element;
  };

  // Calendar elements
  const grid = find("[data-planner-grid]");
  const monthTitle = find("[data-planner-month]");
  const prev = find<HTMLButtonElement>("[data-planner-prev]");
  const next = find<HTMLButtonElement>("[data-planner-next]");

  // Options elements
  const lessons = find("[data-planner-lessons]");
  const daysLeft = find("[data-planner-days-left]");
  const headline = find("[data-planner-headline]");
  const advice = find("[data-planner-advice]");
  const sessions = find("[data-planner-sessions]");
  const cta = find<HTMLAnchorElement>("a[data-planner-cta]");

  // Event listeners
  prev.addEventListener("click", () => store.prevMonth());
  next.addEventListener("click", () => store.nextMonth());

  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button",
    );
    if (!button || button.disabled) return;

    const { date, plannerStyle, plannerLevel, plannerExtra } = button.dataset;
    if (date) store.setWedding(date);
    else if (plannerStyle) store.setStyle(plannerStyle as StyleId);
    else if (plannerLevel) store.setLevel(plannerLevel as LevelId);
    else if (plannerExtra) store.toggleExtra(plannerExtra as ExtraId);
  });

  let shownMonth = "";
  const days = new Map<string, HTMLButtonElement>();

  function renderMonth(view: PlannerView): void {
    grid.replaceChildren();
    days.clear();
    for (const cell of view.weeks.flat()) {
      if (!cell.inMonth) {
        grid.append(document.createElement("span"));
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.date = cell.iso;
      button.textContent = String(cell.day);
      days.set(cell.iso, button);
      grid.append(button);
    }
  }

  store.subscribe((view) => {
    const month = `${view.year}-${view.month}`;

    // Rebuild day buttons only when the month changes
    if (month !== shownMonth) {
      renderMonth(view);
      shownMonth = month;
    }

    // Update day button states
    for (const cell of view.weeks.flat()) {
      const button = days.get(cell.iso);
      if (!button) continue;
      button.disabled = cell.disabled;
      button.setAttribute("aria-pressed", String(cell.selected));
      button.toggleAttribute("data-today", cell.isToday);
      button.toggleAttribute("data-lesson", cell.session !== null);
      button.setAttribute(
        "aria-label",
        `${formatRuDayMonth(cell.iso)}${cell.selected ? ", день свадьбы" : ""}${cell.session ? `, занятие ${cell.session.number}` : ""}`,
      );
    }

    monthTitle.textContent = view.monthTitle;
    prev.disabled = !view.canPrev;
    next.disabled = !view.canNext;

    // Update option buttons
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-style]",
    )) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.plannerStyle === view.selection.style),
      );
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-level]",
    )) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.plannerLevel === view.selection.level),
      );
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-extra]",
    )) {
      button.setAttribute(
        "aria-pressed",
        String(
          view.selection.extras.includes(
            button.dataset.plannerExtra as ExtraId,
          ),
        ),
      );
    }

    // Update results display
    lessons.textContent = String(view.lessons);
    daysLeft.textContent = view.plan ? String(view.plan.daysLeft) : "—";
    headline.textContent = view.plan
      ? view.plan.headline
      : "Обычно хватает 5–7 занятий";
    advice.textContent = view.plan
      ? view.plan.advice
      : "Выберите дату свадьбы — и программа разложится по дням.";

    sessions.replaceChildren(
      ...(view.plan?.sessions ?? []).map((session) => {
        const item = document.createElement("li");
        item.dataset.plannerSession = String(session.number);
        item.className = "timeline-step";
        const content = `${session.number}. ${weekdayShortRu(session.date)}, ${formatRuDayMonth(session.date)} — ${session.title}`;
        item.textContent = content;
        return item;
      }),
    );

    cta.href = view.ctaHref;
  });
}
