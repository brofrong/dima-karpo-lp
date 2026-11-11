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
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button",
    );
    if (!button || button.disabled) return;

    const { date, plannerStyle, plannerLevel, plannerExtra } = button.dataset;
    if (button === prev) store.prevMonth();
    else if (button === next) store.nextMonth();
    else if (date) store.setWedding(date as ISODate);
    else if (plannerStyle) store.setStyle(plannerStyle as StyleId);
    else if (plannerLevel) store.setLevel(plannerLevel as LevelId);
    else if (plannerExtra) store.toggleExtra(plannerExtra as ExtraId);
  });

  let shownMonth = "";
  let shownSessions = "";
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

    if (shownMonth !== "" && !calm.matches) {
      gsap.from(grid.children, {
        opacity: 0,
        scale: 0.6,
        duration: 0.3,
        stagger: { each: 0.008, from: "start" },
        ease: "back.out(2)",
        clearProps: "opacity,transform",
      });
    }
  }

  function setPressed(
    selector: string,
    isPressed: (button: HTMLButtonElement) => boolean,
  ): void {
    for (const button of root.querySelectorAll<HTMLButtonElement>(selector)) {
      button.setAttribute("aria-pressed", String(isPressed(button)));
    }
  }

  store.subscribe((view) => {
    const month = `${view.year}-${view.month}`;
    if (month !== shownMonth) {
      renderMonth(view);
      shownMonth = month;
    }

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

    monthTitle.textContent = view.monthTitle;
    prev.disabled = !view.canPrev;
    next.disabled = !view.canNext;

    setPressed(
      "[data-planner-style]",
      (button) => button.dataset.plannerStyle === view.selection.style,
    );
    setPressed(
      "[data-planner-level]",
      (button) => button.dataset.plannerLevel === view.selection.level,
    );
    setPressed("[data-planner-extra]", (button) =>
      view.selection.extras.includes(button.dataset.plannerExtra as ExtraId),
    );

    const lessonsText = String(view.lessons);
    if (lessons.textContent !== lessonsText) {
      lessons.textContent = lessonsText;
      if (!calm.matches) {
        gsap.fromTo(
          lessons,
          { scale: 1.4 },
          { scale: 1, duration: 0.5, ease: "back.out(3)", overwrite: true },
        );
      }
    }

    daysLeft.textContent = view.plan ? String(view.plan.daysLeft) : "—";
    headline.textContent = view.plan
      ? view.plan.headline
      : "Обычно хватает 5–7 занятий";
    advice.textContent = view.plan
      ? view.plan.advice
      : "Выберите дату свадьбы — и программа разложится по дням.";

    // Rebuild the programme only when it changed, so flipping months does not replay the entrance.
    const planned = view.plan?.sessions ?? [];
    const key = planned
      .map((session) => `${session.date}|${session.title}`)
      .join(";");
    if (key !== shownSessions) {
      shownSessions = key;
      sessions.replaceChildren(
        ...planned.map((session) => {
          const item = document.createElement("li");
          item.setAttribute("data-planner-session", String(session.number));
          item.textContent = `${weekdayShortRu(session.date)}, ${formatRuDayMonth(session.date)} — ${session.title}`;
          return item;
        }),
      );

      if (planned.length > 0 && !calm.matches) {
        gsap.fromTo(
          sessions.children,
          { opacity: 0, x: -18 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            stagger: 0.05,
            ease: "power3.out",
            overwrite: true,
          },
        );
      }
    }

    cta.href = view.ctaHref;
  });
}
