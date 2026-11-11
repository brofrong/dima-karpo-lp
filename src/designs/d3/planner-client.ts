import gsap from "gsap";
import {
  formatRuDayMonth,
  weekdayShortRu,
  type ISODate,
} from "../../lib/dates";
import { createPlannerStore, type PlannerView } from "../../lib/planner-store";
import type { ExtraId, LevelId, StyleId } from "../../lib/planner";

export function mountPlanner(root: HTMLElement): void {
  const store = createPlannerStore();

  const find = <T extends HTMLElement>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Planner: missing ${selector}`);
    return element;
  };

  const grid = find("[data-planner-grid]");
  const monthTitle = find("[data-planner-month]");
  const prev = find<HTMLButtonElement>("[data-planner-prev]");
  const next = find<HTMLButtonElement>("[data-planner-next]");
  const lessons = find("[data-planner-lessons]");
  const daysLeft = find("[data-planner-days-left]");
  const headline = find("[data-planner-headline]");
  const advice = find("[data-planner-advice]");
  const sessions = find("[data-planner-sessions]");
  const cta = find<HTMLAnchorElement>("a[data-planner-cta]");

  prev.addEventListener("click", () => store.prevMonth());
  next.addEventListener("click", () => store.nextMonth());

  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button",
    );
    if (!button || button.disabled) return;

    const { date, plannerStyle, plannerLevel, plannerExtra } = button.dataset;
    if (date) store.setWedding(date as ISODate);
    else if (plannerStyle) store.setStyle(plannerStyle as StyleId);
    else if (plannerLevel) store.setLevel(plannerLevel as LevelId);
    else if (plannerExtra) store.toggleExtra(plannerExtra as ExtraId);
  });

  let shownMonth = "";
  let isAnimating = false;
  let hasWeddingDate = false;
  const days = new Map<string, HTMLButtonElement>();

  function animatePlannerBackground(isSelected: boolean): void {
    if (isAnimating) return;
    isAnimating = true;

    // Use a dummy object to animate the background via onUpdate
    gsap.to(
      { progress: 0 },
      {
        progress: 1,
        duration: 0.8,
        ease: "power2.inOut",
        onUpdate: function () {
          const p = this.targets()[0].progress;
          // Manually interpolate colors
          if (isSelected) {
            const r = Math.round(254 + (230 - 254) * p);
            const g = Math.round(248 + (240 - 248) * p);
            const b = Math.round(243 + (255 - 243) * p);
            root.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
          } else {
            const r = Math.round(230 + (254 - 230) * p);
            const g = Math.round(240 + (248 - 240) * p);
            const b = Math.round(255 + (243 - 255) * p);
            root.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
          }
        },
        onComplete: () => {
          isAnimating = false;
        },
      },
    );
  }

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

    // Trigger background animation when wedding date is selected
    const isNowSelected = view.wedding !== null;
    if (isNowSelected && !hasWeddingDate) {
      animatePlannerBackground(true);
      hasWeddingDate = true;
    } else if (!isNowSelected && hasWeddingDate) {
      animatePlannerBackground(false);
      hasWeddingDate = false;
    }

    // Rebuild day buttons only when month changes
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
        `${formatRuDayMonth(cell.iso)}${cell.selected ? ", день свадьбы" : ""}${
          cell.session ? `, занятие ${cell.session.number}` : ""
        }`,
      );
    }

    // Update month title and nav
    monthTitle.textContent = view.monthTitle;
    prev.disabled = !view.canPrev;
    next.disabled = !view.canNext;

    // Update style buttons
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-style]",
    )) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.plannerStyle === view.selection.style),
      );
    }

    // Update level buttons
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-level]",
    )) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.plannerLevel === view.selection.level),
      );
    }

    // Update extra buttons
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

    // Update result display with animated counter for lessons
    const currentLessons = parseInt(lessons.textContent || "0");
    if (currentLessons !== view.lessons) {
      gsap.to(
        { value: currentLessons },
        {
          value: view.lessons,
          duration: 0.4,
          ease: "power2.out",
          onUpdate: function () {
            lessons.textContent = String(Math.round(this.targets()[0].value));
          },
        },
      );
    }

    daysLeft.textContent = view.plan ? String(view.plan.daysLeft) : "—";
    headline.textContent = view.plan
      ? view.plan.headline
      : "Обычно хватает 5–7 занятий";
    advice.textContent = view.plan
      ? view.plan.advice
      : "Выберите дату свадьбы — и программа разложится по дням.";

    // Update sessions list
    sessions.replaceChildren(
      ...(view.plan?.sessions ?? []).map((session) => {
        const item = document.createElement("li");
        item.setAttribute("data-planner-session", String(session.number));
        item.textContent = `${weekdayShortRu(session.date)}, ${formatRuDayMonth(
          session.date,
        )} — ${session.title}`;
        return item;
      }),
    );

    cta.href = view.ctaHref;
  });
}
