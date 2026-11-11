import { describe, expect, test } from "bun:test";
import { helloLink, site } from "../data/site";
import { addDays } from "./dates";
import { buildPlan, telegramLink, telegramMessage } from "./planner";
import { createPlannerStore, MONTHS_AHEAD } from "./planner-store";

const TODAY = "2026-11-11";

describe("createPlannerStore", () => {
  test("starts on the current month with the usual recommendation", () => {
    const view = createPlannerStore({ today: TODAY }).getView();
    expect(view.year).toBe(2026);
    expect(view.month).toBe(11);
    expect(view.monthTitle).toBe("Ноябрь 2026");
    expect(view.wedding).toBeNull();
    expect(view.plan).toBeNull();
    expect(view.lessons).toBe(6);
    expect(view.recommended).toBe(6);
    expect(view.ctaHref).toBe(helloLink);
    expect(view.canPrev).toBe(false);
    expect(view.canNext).toBe(true);
  });

  test("marks past days, today and complete weeks", () => {
    const view = createPlannerStore({ today: TODAY }).getView();
    const cells = view.weeks.flat();
    expect(view.weeks.every((week) => week.length === 7)).toBe(true);
    expect(cells.find((cell) => cell.iso === "2026-11-10")?.disabled).toBe(
      true,
    );
    expect(cells.find((cell) => cell.iso === TODAY)?.disabled).toBe(false);
    expect(cells.find((cell) => cell.iso === TODAY)?.isToday).toBe(true);
    expect(cells.filter((cell) => cell.isToday)).toHaveLength(1);
  });

  test("choosing a date builds the same plan as buildPlan", () => {
    const store = createPlannerStore({ today: TODAY });
    const wedding = addDays(TODAY, 47);
    store.setWedding(wedding);
    const view = store.getView();
    const input = { wedding, today: TODAY, ...view.selection };
    const plan = buildPlan(input);
    expect(view.plan).toEqual(plan);
    expect(view.lessons).toBe(plan.lessons);
    expect(view.ctaHref).toBe(
      telegramLink(site.telegramUsername, telegramMessage(input, plan)),
    );
  });

  test("marks the wedding day and lesson days in the grid", () => {
    const store = createPlannerStore({ today: TODAY });
    const wedding = "2026-12-28";
    store.setWedding(wedding);
    store.nextMonth();
    const view = store.getView();
    const cells = view.weeks.flat();
    expect(
      cells.filter((cell) => cell.selected).map((cell) => cell.iso),
    ).toEqual([wedding]);
    const decemberSessions = view.plan?.sessions.filter((item) =>
      cells.some((cell) => cell.iso === item.date),
    );
    expect(decemberSessions?.length).toBeGreaterThan(0);
    for (const session of decemberSessions ?? []) {
      expect(cells.find((cell) => cell.iso === session.date)?.session).toEqual(
        session,
      );
    }
  });

  test("ignores past and invalid dates", () => {
    const store = createPlannerStore({ today: TODAY });
    store.setWedding("2026-11-10");
    store.setWedding("2026-02-30");
    store.setWedding("soon");
    expect(store.getView().wedding).toBeNull();
    store.setWedding(TODAY);
    expect(store.getView().wedding).toBe(TODAY);
    expect(store.getView().plan?.status).toBe("too-late");
    store.clearWedding();
    expect(store.getView().plan).toBeNull();
  });

  test("month navigation stays inside its range", () => {
    const store = createPlannerStore({ today: TODAY });
    store.prevMonth();
    expect(store.getView().month).toBe(11);
    store.nextMonth();
    store.nextMonth();
    expect(store.getView().monthTitle).toBe("Январь 2027");
    expect(store.getView().canPrev).toBe(true);
    for (let hop = 0; hop < MONTHS_AHEAD + 5; hop += 1) store.nextMonth();
    const last = store.getView();
    expect(last.monthTitle).toBe("Ноябрь 2028");
    expect(last.canNext).toBe(false);
    for (let hop = 0; hop < MONTHS_AHEAD + 5; hop += 1) store.prevMonth();
    expect(store.getView().monthTitle).toBe("Ноябрь 2026");
  });

  test("options change the recommendation and the plan", () => {
    const store = createPlannerStore({ today: TODAY });
    store.setLevel("confident");
    expect(store.getView().lessons).toBe(4);
    store.setStyle("mix");
    expect(store.getView().lessons).toBe(5);
    store.toggleExtra("lifts");
    store.toggleExtra("parents");
    expect(store.getView().lessons).toBe(7);
    expect(store.getView().selection.extras).toEqual(["lifts", "parents"]);
    store.toggleExtra("lifts");
    expect(store.getView().selection.extras).toEqual(["parents"]);
    store.toggleExtra("nope" as never);
    expect(store.getView().lessons).toBe(6);
    store.setWedding(addDays(TODAY, 60));
    expect(store.getView().plan?.lessons).toBe(6);
  });

  test("subscribers get the current view at once and every change after", () => {
    const store = createPlannerStore({ today: TODAY });
    const seen: number[] = [];
    const stop = store.subscribe((view) => seen.push(view.lessons));
    store.setLevel("some");
    store.setLevel("some");
    stop();
    store.setLevel("confident");
    expect(seen).toEqual([6, 5]);
  });

  test("does not share the default selection between stores", () => {
    const first = createPlannerStore({ today: TODAY });
    first.toggleExtra("friends");
    const second = createPlannerStore({ today: TODAY });
    expect(second.getView().selection.extras).toEqual([]);
  });
});
