import { describe, expect, test } from "bun:test";
import {
  addDays,
  countRu,
  daysInMonth,
  diffDays,
  formatRu,
  formatRuDayMonth,
  formatRuShort,
  isValidISO,
  makeISO,
  monthGrid,
  monthTitleRu,
  plural,
  shiftMonth,
  todayISO,
  weekdayIndex,
  weekdayLongRu,
  weekdayShortRu,
} from "./dates";
import {
  buildPlan,
  curriculum,
  DEFAULT_SELECTION,
  EXTRAS,
  type ExtraId,
  LEVELS,
  MAX_LESSONS,
  MIN_LESSONS,
  type PlanInput,
  recommendLessons,
  STYLES,
  telegramLink,
  telegramMessage,
} from "./planner";

const TODAY = "2026-11-11";

const plan = (overrides: Partial<PlanInput> = {}) =>
  buildPlan({
    ...DEFAULT_SELECTION,
    today: TODAY,
    wedding: "2027-06-12",
    ...overrides,
  });

describe("dates", () => {
  test("validates ISO dates", () => {
    expect(isValidISO("2027-06-12")).toBe(true);
    expect(isValidISO("2028-02-29")).toBe(true);
    expect(isValidISO("2027-02-29")).toBe(false);
    expect(isValidISO("2027-13-01")).toBe(false);
    expect(isValidISO("2027-6-1")).toBe(false);
    expect(isValidISO("")).toBe(false);
    expect(isValidISO(undefined)).toBe(false);
  });

  test("adds and diffs days across month, year and DST boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29");
    expect(diffDays("2026-11-11", "2027-06-12")).toBe(213);
    expect(diffDays("2027-06-12", "2026-11-11")).toBe(-213);
    expect(diffDays("2027-03-01", "2027-04-01")).toBe(31);
  });

  test("rejects invalid input instead of producing NaN dates", () => {
    expect(() => addDays("nope", 1)).toThrow(RangeError);
    expect(() => diffDays("2027-02-30", "2027-03-01")).toThrow(RangeError);
  });

  test("weekday helpers are Monday-first", () => {
    expect(weekdayIndex("2026-11-11")).toBe(2);
    expect(weekdayShortRu("2026-11-11")).toBe("ср");
    expect(weekdayLongRu("2027-06-12")).toBe("суббота");
    expect(weekdayIndex("2026-11-15")).toBe(6);
    expect(weekdayIndex("2026-11-16")).toBe(0);
  });

  test("month helpers", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2027, 1, -1)).toEqual({ year: 2026, month: 12 });
    expect(shiftMonth(2026, 11, 14)).toEqual({ year: 2028, month: 1 });
    expect(monthTitleRu(2027, 6)).toBe("Июнь 2027");
  });

  test("monthGrid returns complete Monday-first weeks", () => {
    const grid = monthGrid(2026, 11);
    expect(grid).toHaveLength(6);
    for (const week of grid) expect(week).toHaveLength(7);
    expect(grid[0]?.[0]).toEqual({
      iso: "2026-10-26",
      day: 26,
      inMonth: false,
    });
    expect(grid[0]?.[6]).toEqual({ iso: "2026-11-01", day: 1, inMonth: true });
    expect(grid[5]?.[0]?.iso).toBe("2026-11-30");
    const inMonth = grid.flat().filter((cell) => cell.inMonth);
    expect(inMonth).toHaveLength(30);

    // February 2027 starts on a Monday and fits exactly four weeks.
    const february = monthGrid(2027, 2);
    expect(february).toHaveLength(4);
    expect(february[0]?.[0]?.iso).toBe("2027-02-01");
    expect(february.flat().every((cell) => cell.inMonth)).toBe(true);
  });

  test("formats dates in Russian", () => {
    expect(formatRu("2027-06-12")).toBe("12 июня 2027");
    expect(formatRuDayMonth("2027-05-01")).toBe("1 мая");
    expect(formatRuShort("2027-08-09")).toBe("9 авг");
    expect(makeISO(2027, 6, 2)).toBe("2027-06-02");
  });

  test("todayISO uses the local calendar day", () => {
    expect(todayISO(new Date(2026, 10, 11, 23, 59))).toBe("2026-11-11");
    expect(todayISO(new Date(2027, 0, 1, 0, 0))).toBe("2027-01-01");
  });

  test("Russian plurals", () => {
    const days = ["день", "дня", "дней"] as const;
    expect(plural(1, days)).toBe("день");
    expect(plural(2, days)).toBe("дня");
    expect(plural(5, days)).toBe("дней");
    expect(plural(11, days)).toBe("дней");
    expect(plural(12, days)).toBe("дней");
    expect(plural(21, days)).toBe("день");
    expect(plural(104, days)).toBe("дня");
    expect(plural(111, days)).toBe("дней");
    expect(plural(0, days)).toBe("дней");
    expect(countRu(213, days)).toBe("213 дней");
  });
});

describe("recommendLessons", () => {
  test("typical couples land in the 5–7 lesson range", () => {
    expect(recommendLessons(DEFAULT_SELECTION)).toBe(6);
    expect(recommendLessons({ ...DEFAULT_SELECTION, level: "some" })).toBe(5);
    expect(recommendLessons({ ...DEFAULT_SELECTION, extras: ["lifts"] })).toBe(
      7,
    );
    expect(recommendLessons({ ...DEFAULT_SELECTION, level: "confident" })).toBe(
      4,
    );
  });

  test("style and extras add lessons, duplicates do not", () => {
    expect(recommendLessons({ ...DEFAULT_SELECTION, style: "mix" })).toBe(7);
    expect(
      recommendLessons({
        ...DEFAULT_SELECTION,
        extras: ["lifts", "lifts", "medley"],
      }),
    ).toBe(8);
  });

  test("every combination stays within bounds", () => {
    const allExtras = EXTRAS.map((extra) => extra.id);
    for (const style of STYLES) {
      for (const level of LEVELS) {
        for (let mask = 0; mask < 2 ** allExtras.length; mask += 1) {
          const extras = allExtras.filter((_, bit) => mask & (1 << bit));
          const lessons = recommendLessons({
            style: style.id,
            level: level.id,
            extras,
          });
          expect(lessons).toBeGreaterThanOrEqual(MIN_LESSONS);
          expect(lessons).toBeLessThanOrEqual(MAX_LESSONS);
        }
      }
    }
  });

  test("unknown options throw", () => {
    expect(() =>
      recommendLessons({ ...DEFAULT_SELECTION, style: "tango" as never }),
    ).toThrow(RangeError);
  });
});

describe("curriculum", () => {
  test("has exactly one title per lesson, opening and closing fixed", () => {
    // Six core steps plus two extras plus opening and closing: ten unique titles.
    for (let lessons = 1; lessons <= 10; lessons += 1) {
      const titles = curriculum(lessons, ["lifts", "friends"]);
      expect(titles).toHaveLength(lessons);
      expect(new Set(titles).size).toBe(lessons);
    }
    const six = curriculum(6);
    expect(six[0]).toStartWith("Знакомство");
    expect(six[5]).toStartWith("Генеральный прогон");
    expect(curriculum(0)).toEqual([]);
    // Longer than the catalogue: padded, still one title per lesson.
    expect(curriculum(MAX_LESSONS)).toHaveLength(MAX_LESSONS);
  });

  test("chosen extras appear in the programme", () => {
    const titles = curriculum(8, ["parents", "lifts"]);
    expect(titles.some((title) => title.startsWith("Поддержки"))).toBe(true);
    expect(titles).toContain("Танец с родителями");
    // Catalogue order, not click order.
    expect(
      titles.findIndex((title) => title.startsWith("Поддержки")),
    ).toBeLessThan(titles.indexOf("Танец с родителями"));
  });
});

describe("buildPlan", () => {
  test("far-away wedding: relaxed, two lessons a week, ends 3 days before", () => {
    const result = plan();
    expect(result.status).toBe("relaxed");
    expect(result.daysLeft).toBe(213);
    expect(result.lessons).toBe(6);
    expect(result.idealLessons).toBe(6);
    expect(result.shortened).toBe(false);
    expect(result.sessions).toHaveLength(6);
    expect(result.lastLesson).toBe("2027-06-09");
    expect(result.firstLesson).toBe("2027-05-22");
    expect(result.pace).toBe("2 раза в неделю");
    expect(result.sessions.map((session) => session.date)).toEqual([
      "2027-05-22",
      "2027-05-26",
      "2027-05-29",
      "2027-06-02",
      "2027-06-05",
      "2027-06-09",
    ]);
    expect(result.sessions.at(-1)?.final).toBe(true);
    expect(result.sessions.filter((session) => session.final)).toHaveLength(1);
    expect(result.advice).toContain("22 мая");
  });

  test("three weeks out: comfortable, starts tomorrow", () => {
    const result = plan({ wedding: addDays(TODAY, 22) });
    expect(result.status).toBe("comfortable");
    expect(result.firstLesson).toBe(addDays(TODAY, 1));
    expect(result.lastLesson).toBe(addDays(TODAY, 19));
    expect(result.lessons).toBe(6);
  });

  test("two weeks out: tight", () => {
    const result = plan({ wedding: addDays(TODAY, 14) });
    expect(result.status).toBe("tight");
    expect(result.lessons).toBe(6);
    expect(result.shortened).toBe(false);
    expect(result.pace).toBe("через день");
  });

  test("one week out: express without cutting, buffer shrinks only if needed", () => {
    const result = plan({ wedding: addDays(TODAY, 9) });
    expect(result.status).toBe("express");
    expect(result.shortened).toBe(false);
    expect(result.lessons).toBe(6);
    expect(result.lastLesson).toBe(addDays(TODAY, 6));
  });

  test("a few days out: programme is shortened to what fits", () => {
    const result = plan({ wedding: addDays(TODAY, 4) });
    expect(result.status).toBe("express");
    expect(result.shortened).toBe(true);
    expect(result.lessons).toBe(3);
    expect(result.idealLessons).toBe(6);
    expect(result.sessions.map((session) => session.date)).toEqual([
      addDays(TODAY, 1),
      addDays(TODAY, 2),
      addDays(TODAY, 3),
    ]);
    expect(result.advice).toContain("3 занятия из 6");
  });

  test("day after tomorrow: a single express lesson tomorrow", () => {
    const result = plan({ wedding: addDays(TODAY, 2) });
    expect(result.lessons).toBe(1);
    expect(result.sessions).toHaveLength(1);
    expect(result.firstLesson).toBe(addDays(TODAY, 1));
    expect(result.pace).toBe("одна встреча");
    expect(result.sessions[0]?.final).toBe(true);
  });

  test("today, tomorrow and past dates produce no sessions", () => {
    for (const offset of [0, 1]) {
      const result = plan({ wedding: addDays(TODAY, offset) });
      expect(result.status).toBe("too-late");
      expect(result.sessions).toEqual([]);
      expect(result.lessons).toBe(0);
      expect(result.firstLesson).toBeNull();
      expect(result.pace).toBe("");
    }
    const past = plan({ wedding: addDays(TODAY, -1) });
    expect(past.status).toBe("past");
    expect(past.daysLeft).toBe(-1);
    expect(past.sessions).toEqual([]);
  });

  test("invalid dates throw", () => {
    expect(() => plan({ wedding: "2027-02-30" })).toThrow(RangeError);
    expect(() => plan({ today: "yesterday" })).toThrow(RangeError);
  });

  test("invariants hold for every horizon and every programme size", () => {
    const allExtras = EXTRAS.map((extra) => extra.id);
    const extraSets: ExtraId[][] = [[], ["lifts"], allExtras];
    for (const level of LEVELS) {
      for (const extras of extraSets) {
        for (let offset = -3; offset <= 400; offset += 1) {
          const wedding = addDays(TODAY, offset);
          const result = plan({ wedding, level: level.id, extras });
          expect(result.daysLeft).toBe(offset);
          expect(result.sessions).toHaveLength(result.lessons);
          expect(result.lessons).toBeLessThanOrEqual(result.idealLessons);
          expect(result.shortened).toBe(
            result.lessons > 0 && result.lessons < result.idealLessons,
          );
          expect(result.headline.length).toBeGreaterThan(0);
          expect(result.advice.length).toBeGreaterThan(0);

          let previous = TODAY;
          for (const [index, session] of result.sessions.entries()) {
            expect(session.number).toBe(index + 1);
            // Strictly after the previous lesson, never today or earlier,
            // always before the wedding day.
            expect(diffDays(previous, session.date)).toBeGreaterThan(0);
            expect(diffDays(session.date, wedding)).toBeGreaterThan(0);
            previous = session.date;
          }
          if (result.lessons > 0) {
            expect(result.firstLesson).toBe(result.sessions[0]?.date ?? null);
            expect(result.lastLesson).toBe(
              result.sessions.at(-1)?.date ?? null,
            );
            expect(result.pace.length).toBeGreaterThan(0);
          }
          if (offset >= 30) expect(result.shortened).toBe(false);
        }
      }
    }
  });
});

describe("telegram", () => {
  test("message summarises the programme", () => {
    const input: PlanInput = {
      style: "mix",
      level: "some",
      extras: ["friends", "lifts"],
      today: TODAY,
      wedding: "2027-06-12",
    };
    const message = telegramMessage(input, buildPlan(input));
    expect(message).toContain("Дата свадьбы: 12 июня 2027");
    expect(message).toContain("Стиль: Микс стилей");
    expect(message).toContain("Опыт: Немного танцевали");
    expect(message).toContain("Дополнительно: Поддержки, Флешмоб с друзьями");
    expect(message).toContain("Программа: 8 занятий, 2 раза в неделю");
  });

  test("message without extras or lessons stays tidy", () => {
    const input: PlanInput = {
      ...DEFAULT_SELECTION,
      today: TODAY,
      wedding: addDays(TODAY, 1),
    };
    const message = telegramMessage(input, buildPlan(input));
    expect(message).not.toContain("Дополнительно");
    expect(message).not.toContain("Программа:");
    expect(message).toContain("что можно успеть");
  });

  test("link encodes text and strips the @", () => {
    expect(telegramLink("@KarpovDmitriyy")).toBe("https://t.me/KarpovDmitriyy");
    const link = telegramLink("KarpovDmitriyy", "Привет!\nДата: 12 июня");
    expect(link).toStartWith("https://t.me/KarpovDmitriyy?text=");
    expect(link).not.toContain(" ");
    expect(link).not.toContain("\n");
    expect(decodeURIComponent(link.split("?text=")[1] ?? "")).toBe(
      "Привет!\nДата: 12 июня",
    );
  });
});
