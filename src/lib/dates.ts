// Calendar-day helpers. Everything works on "YYYY-MM-DD" strings and whole-day
// arithmetic in UTC, so time zones and daylight saving can never shift a date.

export type ISODate = string;

const MS_PER_DAY = 86_400_000;

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

const MONTHS_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
] as const;

/** Monday-first, matching how calendars are read in Russia. */
export const WEEKDAYS_SHORT = [
  "пн",
  "вт",
  "ср",
  "чт",
  "пт",
  "сб",
  "вс",
] as const;

const WEEKDAYS_LONG = [
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
  "воскресенье",
] as const;

const pad = (value: number) => String(value).padStart(2, "0");

export function isValidISO(value: unknown): value is ISODate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toDayNumber(iso: ISODate): number {
  if (!isValidISO(iso)) throw new RangeError(`Invalid date: ${String(iso)}`);
  const [year, month, day] = iso.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function fromDayNumber(dayNumber: number): ISODate {
  const date = new Date(dayNumber * MS_PER_DAY);
  return makeISO(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/** Builds an ISO date from parts; `month` is 1–12. */
export function makeISO(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

export function parts(iso: ISODate): {
  year: number;
  month: number;
  day: number;
} {
  toDayNumber(iso);
  const [year, month, day] = iso.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return { year, month, day };
}

/** Today's date in the visitor's own time zone. */
export function todayISO(now: Date = new Date()): ISODate {
  return makeISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(iso) + days);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: ISODate, to: ISODate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso: ISODate): number {
  const [year, month, day] = iso.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  toDayNumber(iso);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Moves a year/month pair by `delta` months; `month` is 1–12. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(index / 12),
    month: (((index % 12) + 12) % 12) + 1,
  };
}

export interface CalendarCell {
  iso: ISODate;
  day: number;
  /** False for the leading/trailing days that belong to neighbouring months. */
  inMonth: boolean;
}

/**
 * Weeks of a month as Monday-first rows of seven cells, padded with the
 * neighbouring months' days so every row is complete.
 */
export function monthGrid(year: number, month: number): CalendarCell[][] {
  const first = makeISO(year, month, 1);
  const start = addDays(first, -weekdayIndex(first));
  const total = Math.ceil((weekdayIndex(first) + daysInMonth(year, month)) / 7);
  const weeks: CalendarCell[][] = [];
  for (let week = 0; week < total; week += 1) {
    const row: CalendarCell[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const iso = addDays(start, week * 7 + weekday);
      const cell = parts(iso);
      row.push({
        iso,
        day: cell.day,
        inMonth: cell.month === month && cell.year === year,
      });
    }
    weeks.push(row);
  }
  return weeks;
}

/** "14 июня 2027" */
export function formatRu(iso: ISODate): string {
  const { year, month, day } = parts(iso);
  return `${day} ${MONTHS_GENITIVE[month - 1]} ${year}`;
}

/** "14 июня" */
export function formatRuDayMonth(iso: ISODate): string {
  const { month, day } = parts(iso);
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

/** "14 июн" */
export function formatRuShort(iso: ISODate): string {
  const { month, day } = parts(iso);
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

/** "Июнь 2027" */
export function monthTitleRu(year: number, month: number): string {
  return `${MONTHS_NOMINATIVE[month - 1]} ${year}`;
}

/** "сб" */
export function weekdayShortRu(iso: ISODate): string {
  return WEEKDAYS_SHORT[weekdayIndex(iso)] as string;
}

/** "суббота" */
export function weekdayLongRu(iso: ISODate): string {
  return WEEKDAYS_LONG[weekdayIndex(iso)] as string;
}

/**
 * Russian plural form: plural(1, ["день", "дня", "дней"]) → "день",
 * 3 → "дня", 11 → "дней".
 */
export function plural(
  count: number,
  forms: readonly [string, string, string],
): string {
  const absolute = Math.abs(Math.trunc(count));
  const lastTwo = absolute % 100;
  const last = absolute % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/** "5 занятий" */
export function countRu(
  count: number,
  forms: readonly [string, string, string],
): string {
  return `${count} ${plural(count, forms)}`;
}
