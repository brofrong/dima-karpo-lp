import gsap from "gsap";
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
      button.className =
        "w-10 h-10 md:w-12 md:h-12 rounded text-sm md:text-base font-bold transition-all duration-200 " +
        "border border-transparent hover:border-[#00d9ff] hover:text-[#00d9ff]";

      if (cell.isToday) {
        button.classList.add("bg-[#1a1f3a]", "neon-glow-cyan");
      }

      days.set(cell.iso, button);
      grid.append(button);
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

      if (cell.selected) {
        button.classList.add("bg-[#ff006e]", "neon-text");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.classList.remove("bg-[#ff006e]", "neon-text");
        button.setAttribute("aria-pressed", "false");
      }

      if (cell.session) {
        button.classList.add("border-[#00d9ff]", "border-2");
        button.setAttribute("data-lesson", String(cell.session.number));
      } else {
        button.classList.remove("border-[#00d9ff]", "border-2");
        button.removeAttribute("data-lesson");
      }

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

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-style]",
    )) {
      const isPressed = button.dataset.plannerStyle === view.selection.style;
      button.setAttribute("aria-pressed", String(isPressed));
      if (isPressed) {
        button.classList.add(
          "bg-[#ff006e]",
          "neon-glow-pink",
          "border-[#ff006e]",
        );
      } else {
        button.classList.remove(
          "bg-[#ff006e]",
          "neon-glow-pink",
          "border-[#ff006e]",
        );
      }
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-level]",
    )) {
      const isPressed = button.dataset.plannerLevel === view.selection.level;
      button.setAttribute("aria-pressed", String(isPressed));
      if (isPressed) {
        button.classList.add(
          "bg-[#ff006e]",
          "neon-glow-pink",
          "border-[#ff006e]",
        );
      } else {
        button.classList.remove(
          "bg-[#ff006e]",
          "neon-glow-pink",
          "border-[#ff006e]",
        );
      }
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-planner-extra]",
    )) {
      const isPressed = view.selection.extras.includes(
        button.dataset.plannerExtra as ExtraId,
      );
      button.setAttribute("aria-pressed", String(isPressed));
      if (isPressed) {
        button.classList.add(
          "bg-[#00d9ff]",
          "neon-glow-cyan",
          "text-[#0a0e27]",
        );
      } else {
        button.classList.remove(
          "bg-[#00d9ff]",
          "neon-glow-cyan",
          "text-[#0a0e27]",
        );
      }
    }

    // Update lessons with animation
    const oldLessons = lessons.textContent;
    lessons.textContent = String(view.lessons);
    if (oldLessons !== String(view.lessons)) {
      gsap.to(lessons, {
        duration: 0.3,
        scale: 1.2,
        ease: "back.out",
        onComplete: () => {
          gsap.to(lessons, {
            duration: 0.2,
            scale: 1,
            ease: "power2.out",
          });
        },
      });
    }

    daysLeft.textContent = view.plan ? String(view.plan.daysLeft) : "—";

    headline.textContent = view.plan ? view.plan.headline : "Выберите дату";
    advice.textContent = view.plan
      ? view.plan.advice
      : "Выберите дату свадьбы — и программа соберётся сама.";

    const statusElement = root.querySelector("[data-plan-status]");
    if (statusElement && view.plan) {
      let statusColor = "text-[#a71930]";
      if (view.plan.status === "relaxed") statusColor = "text-[#ffd60a]";
      else if (view.plan.status === "comfortable")
        statusColor = "text-[#00d9ff]";
      else if (view.plan.status === "tight") statusColor = "text-[#ff006e]";

      statusElement.className = `font-bold ${statusColor}`;
      statusElement.textContent = view.plan.status;
    }

    // Animate sessions
    sessions.replaceChildren(
      ...(view.plan?.sessions ?? []).map((session, index) => {
        const item = document.createElement("li");
        item.dataset.plannerSession = String(session.number);
        item.className =
          "py-3 px-4 border-l-2 border-[#ff006e] bg-[#1a1f3a] rounded-r transition-all";
        item.innerHTML = `
          <div class="font-bold neon-text">${session.number}. ${session.title}</div>
          <div class="text-sm text-[#00d9ff] mt-1">${weekdayShortRu(session.date)}, ${formatRuDayMonth(session.date)}</div>
        `;

        gsap.from(item, {
          opacity: 0,
          y: 20,
          duration: 0.4,
          delay: index * 0.08,
          ease: "back.out",
        });

        return item;
      }),
    );

    cta.href = view.ctaHref;
  });
}
