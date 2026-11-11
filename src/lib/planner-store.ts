// Headless state for the planner widget: which month is shown, which date and
// options are chosen, and everything a design needs to draw the result.
// No DOM in here — each design renders `PlannerView` its own way.

import { helloLink, site } from "../data/site";
import {
  type CalendarCell,
  type ISODate,
  isValidISO,
  monthGrid,
  monthTitleRu,
  parts,
  shiftMonth,
  todayISO,
} from "./dates";
import {
  buildPlan,
  DEFAULT_SELECTION,
  EXTRAS,
  type ExtraId,
  type LevelId,
  type Plan,
  type PlanSession,
  recommendLessons,
  type Selection,
  type StyleId,
  telegramLink,
  telegramMessage,
} from "./planner";

/** How many months ahead of the current one the calendar can go. */
export const MONTHS_AHEAD = 24;

export interface DayCell extends CalendarCell {
  /** Before today: cannot be chosen. */
  disabled: boolean;
  isToday: boolean;
  /** This is the chosen wedding day. */
  selected: boolean;
  /** The lesson that falls on this day in the current plan, if any. */
  session: PlanSession | null;
}

export interface PlannerView {
  today: ISODate;
  /** Visible month. */
  year: number;
  month: number;
  /** "Июнь 2027". */
  monthTitle: string;
  /** Monday-first weeks of the visible month, seven cells each. */
  weeks: DayCell[][];
  canPrev: boolean;
  canNext: boolean;
  /** Chosen wedding day, or null before the first choice. */
  wedding: ISODate | null;
  selection: Selection;
  /** Lessons for the chosen options when time is not a constraint. */
  recommended: number;
  /** Null until a wedding day is chosen. */
  plan: Plan | null;
  /** The number to show big: `plan.lessons`, or `recommended` without a date. */
  lessons: number;
  /** Telegram link with the message pre-filled from the current state. */
  ctaHref: string;
}

export interface PlannerStore {
  getView(): PlannerView;
  /** Calls `listener` now and after every change; returns an unsubscribe. */
  subscribe(listener: (view: PlannerView) => void): () => void;
  /** Chooses a wedding day; ignores past and invalid dates. */
  setWedding(iso: ISODate): void;
  clearWedding(): void;
  nextMonth(): void;
  prevMonth(): void;
  setStyle(style: StyleId): void;
  setLevel(level: LevelId): void;
  toggleExtra(extra: ExtraId): void;
}

export interface PlannerStoreOptions {
  /** Defaults to the visitor's current day. */
  today?: ISODate;
  selection?: Selection;
}

const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

export function createPlannerStore(
  options: PlannerStoreOptions = {},
): PlannerStore {
  const today = options.today ?? todayISO();
  if (!isValidISO(today)) throw new RangeError(`Invalid today date: ${today}`);
  const start = parts(today);
  const firstMonth = monthIndex(start.year, start.month);

  let year = start.year;
  let month = start.month;
  let wedding: ISODate | null = null;
  let selection: Selection = {
    ...(options.selection ?? DEFAULT_SELECTION),
    extras: [...(options.selection ?? DEFAULT_SELECTION).extras],
  };
  let view = compute();
  const listeners = new Set<(view: PlannerView) => void>();

  function compute(): PlannerView {
    const plan = wedding ? buildPlan({ wedding, today, ...selection }) : null;
    const byDate = new Map(plan?.sessions.map((item) => [item.date, item]));
    const recommended = recommendLessons(selection);
    const shown = monthIndex(year, month);
    return {
      today,
      year,
      month,
      monthTitle: monthTitleRu(year, month),
      weeks: monthGrid(year, month).map((week) =>
        week.map((cell) => ({
          ...cell,
          disabled: cell.iso < today,
          isToday: cell.iso === today,
          selected: cell.iso === wedding,
          session: byDate.get(cell.iso) ?? null,
        })),
      ),
      canPrev: shown > firstMonth,
      canNext: shown < firstMonth + MONTHS_AHEAD,
      wedding,
      selection,
      recommended,
      plan,
      lessons: plan ? plan.lessons : recommended,
      ctaHref:
        wedding && plan
          ? telegramLink(
              site.telegramUsername,
              telegramMessage({ wedding, today, ...selection }, plan),
            )
          : helloLink,
    };
  }

  function commit(): void {
    view = compute();
    for (const listener of [...listeners]) listener(view);
  }

  function showMonth(delta: number): void {
    const target = monthIndex(year, month) + delta;
    if (target < firstMonth || target > firstMonth + MONTHS_AHEAD) return;
    ({ year, month } = shiftMonth(year, month, delta));
    commit();
  }

  return {
    getView: () => view,
    subscribe(listener) {
      listeners.add(listener);
      listener(view);
      return () => {
        listeners.delete(listener);
      };
    },
    setWedding(iso) {
      if (!isValidISO(iso) || iso < today) return;
      wedding = iso;
      commit();
    },
    clearWedding() {
      if (wedding === null) return;
      wedding = null;
      commit();
    },
    nextMonth: () => showMonth(1),
    prevMonth: () => showMonth(-1),
    setStyle(style) {
      if (style === selection.style) return;
      selection = { ...selection, style };
      commit();
    },
    setLevel(level) {
      if (level === selection.level) return;
      selection = { ...selection, level };
      commit();
    },
    toggleExtra(extra) {
      if (!EXTRAS.some((item) => item.id === extra)) return;
      const extras = selection.extras.includes(extra)
        ? selection.extras.filter((id) => id !== extra)
        : [...selection.extras, extra];
      selection = { ...selection, extras };
      commit();
    },
  };
}
