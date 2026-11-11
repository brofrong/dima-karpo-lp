// Wedding-dance programme planner: turns a wedding date and a few choices into
// a lesson count and a dated rehearsal schedule. Pure functions only, so every
// design renders the same numbers and the logic is covered by unit tests.

import {
  addDays,
  countRu,
  diffDays,
  formatRu,
  formatRuDayMonth,
  type ISODate,
  isValidISO,
} from "./dates";

export const STYLES = [
  {
    id: "bachata",
    title: "Бачата",
    note: "Тёплый, близкий танец — специализация Дмитрия",
    lessons: 0,
  },
  {
    id: "classic",
    title: "Вальс или медленный танец",
    note: "Классика, которая всегда к месту",
    lessons: 0,
  },
  {
    id: "mix",
    title: "Микс стилей",
    note: "Начинаем нежно, заканчиваем зажигательно",
    lessons: 1,
  },
  {
    id: "own",
    title: "Свой трек",
    note: "Приносите любимую песню — хореография под неё",
    lessons: 0,
  },
] as const;

export const LEVELS = [
  {
    id: "zero",
    title: "Никогда не танцевали",
    note: "Начнём с самых основ",
    lessons: 6,
  },
  {
    id: "some",
    title: "Немного танцевали",
    note: "Есть на что опереться",
    lessons: 5,
  },
  {
    id: "confident",
    title: "Танцуем уверенно",
    note: "Сразу к хореографии",
    lessons: 4,
  },
] as const;

export const EXTRAS = [
  {
    id: "lifts",
    title: "Поддержки",
    note: "Безопасные и эффектные",
    lessons: 1,
    step: "Поддержки: безопасно, легко и эффектно",
  },
  {
    id: "medley",
    title: "Нарезка из нескольких треков",
    note: "Смена настроения посреди танца",
    lessons: 1,
    step: "Склейка треков: меняем настроение на ходу",
  },
  {
    id: "parents",
    title: "Танец с родителями",
    note: "Отдельный трогательный момент",
    lessons: 1,
    step: "Танец с родителями",
  },
  {
    id: "friends",
    title: "Флешмоб с друзьями",
    note: "Гости подхватывают финал",
    lessons: 1,
    step: "Флешмоб с друзьями: простая общая связка",
  },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
export type LevelId = (typeof LEVELS)[number]["id"];
export type ExtraId = (typeof EXTRAS)[number]["id"];

export interface Selection {
  style: StyleId;
  level: LevelId;
  extras: readonly ExtraId[];
}

export const DEFAULT_SELECTION: Selection = {
  style: "bachata",
  level: "zero",
  extras: [],
};

export interface PlanInput extends Selection {
  /** Wedding day, "YYYY-MM-DD". */
  wedding: ISODate;
  /** The visitor's current day, "YYYY-MM-DD" — see `todayISO()`. */
  today: ISODate;
}

export type PlanStatus =
  /** Plenty of time: lessons start later, two a week. */
  | "relaxed"
  /** Start now at two lessons a week. */
  | "comfortable"
  /** Fits, but more often than twice a week. */
  | "tight"
  /** Almost daily, or the programme had to be shortened. */
  | "express"
  /** Wedding is today or tomorrow: no room for a lesson. */
  | "too-late"
  /** Date is in the past. */
  | "past";

export interface PlanSession {
  /** 1-based lesson number. */
  number: number;
  date: ISODate;
  title: string;
  /** True for the last lesson (the dress rehearsal). */
  final: boolean;
}

export interface Plan {
  status: PlanStatus;
  /** Whole days from today to the wedding (negative when it has passed). */
  daysLeft: number;
  /** Lessons we would recommend with enough time. */
  idealLessons: number;
  /** Lessons that actually fit before the wedding (≤ idealLessons). */
  lessons: number;
  /** True when fewer lessons fit than recommended. */
  shortened: boolean;
  sessions: PlanSession[];
  firstLesson: ISODate | null;
  lastLesson: ISODate | null;
  /** "2 раза в неделю" — empty when there are no lessons. */
  pace: string;
  /** Short verdict, e.g. "Самое время начинать". */
  headline: string;
  /** One sentence of advice to show under the verdict. */
  advice: string;
}

export const MIN_LESSONS = 3;
export const MAX_LESSONS = 12;

/** Days between lessons at a comfortable two-a-week rhythm. */
const COMFORT_GAP = 3.5;
/** Days between lessons when training every other day. */
const TIGHT_GAP = 2;
/** The dress rehearsal lands this many days before the wedding when it fits. */
const FINAL_BUFFERS = [3, 2, 1] as const;
/** Extra lead time (days) beyond which we suggest starting later. */
const RELAXED_SLACK = 14;

const LESSON_FORMS = ["занятие", "занятия", "занятий"] as const;

function find<T extends { id: string }>(list: readonly T[], id: string): T {
  const item = list.find((entry) => entry.id === id);
  if (!item) throw new RangeError(`Unknown option: ${id}`);
  return item;
}

function uniqueExtras(extras: readonly ExtraId[]): ExtraId[] {
  // Keep the catalogue order so the programme reads the same however the
  // visitor clicked.
  return EXTRAS.map((extra) => extra.id).filter((id) => extras.includes(id));
}

/** How many lessons the chosen programme needs when time is not a constraint. */
export function recommendLessons(selection: Selection): number {
  const total =
    find(LEVELS, selection.level).lessons +
    find(STYLES, selection.style).lessons +
    uniqueExtras(selection.extras).reduce(
      (sum, id) => sum + find(EXTRAS, id).lessons,
      0,
    );
  return Math.min(MAX_LESSONS, Math.max(MIN_LESSONS, total));
}

/** Lesson titles for a programme of `lessons` sessions. */
export function curriculum(
  lessons: number,
  extras: readonly ExtraId[] = [],
): string[] {
  if (lessons <= 0) return [];
  if (lessons === 1) return ["Экспресс-постановка: выход, связка и финал"];

  // Lower rank survives first when the programme has to be shortened.
  const middle = [
    { title: "Основа: шаги, ритм и ведение в паре", rank: 1 },
    { title: "Первая связка под вашу музыку", rank: 2 },
    ...uniqueExtras(extras).map((id) => ({
      title: find(EXTRAS, id).step,
      rank: 3,
    })),
    { title: "Вторая связка и красивые переходы", rank: 4 },
    { title: "Собираем танец целиком", rank: 5 },
    { title: "Чистка, акценты и уверенность", rank: 6 },
    { title: "Репетиция в образе: платье, обувь, площадка", rank: 7 },
  ].map((step, order) => ({ ...step, order }));

  const needed = lessons - 2;
  const kept = [...middle]
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, needed)
    .sort((a, b) => a.order - b.order)
    .map((step) => step.title);
  while (kept.length < needed) kept.push("Закрепляем танец: ещё один прогон");

  return [
    "Знакомство: музыка, идея танца и первые шаги",
    ...kept,
    "Генеральный прогон: в обуви, с выходом и поклоном",
  ];
}

function paceLabel(lessons: number, spanDays: number): string {
  if (lessons <= 0) return "";
  if (lessons === 1) return "одна встреча";
  const gap = spanDays / (lessons - 1);
  if (gap >= 6) return "раз в неделю";
  if (gap >= 3) return "2 раза в неделю";
  if (gap >= 2) return "через день";
  if (gap > 1) return "почти каждый день";
  return "каждый день";
}

function emptyPlan(
  status: "too-late" | "past",
  daysLeft: number,
  idealLessons: number,
): Plan {
  const past = status === "past";
  return {
    status,
    daysLeft,
    idealLessons,
    lessons: 0,
    shortened: false,
    sessions: [],
    firstLesson: null,
    lastLesson: null,
    pace: "",
    headline: past ? "Эта дата уже прошла" : "Свадьба уже на пороге",
    advice: past
      ? "Выберите дату свадьбы в будущем — и программа соберётся сама."
      : "На постановку времени не осталось — напишите Дмитрию, он подскажет простой и красивый выход.",
  };
}

/** Builds the full programme for a wedding date and a set of choices. */
export function buildPlan(input: PlanInput): Plan {
  if (!isValidISO(input.wedding)) {
    throw new RangeError(`Invalid wedding date: ${String(input.wedding)}`);
  }
  if (!isValidISO(input.today)) {
    throw new RangeError(`Invalid today date: ${String(input.today)}`);
  }

  const extras = uniqueExtras(input.extras);
  const idealLessons = recommendLessons(input);
  const daysLeft = diffDays(input.today, input.wedding);
  if (daysLeft < 0) return emptyPlan("past", daysLeft, idealLessons);

  // Lessons can start tomorrow. The dress rehearsal sits a few days before the
  // wedding; that buffer shrinks only when the full programme would not fit.
  const first = addDays(input.today, 1);
  let last = addDays(input.wedding, -FINAL_BUFFERS[FINAL_BUFFERS.length - 1]);
  for (const buffer of FINAL_BUFFERS) {
    const candidate = addDays(input.wedding, -buffer);
    if (diffDays(first, candidate) + 1 >= idealLessons) {
      last = candidate;
      break;
    }
  }

  const availableSpan = diffDays(first, last);
  const windowDays = availableSpan + 1;
  if (windowDays < 1) return emptyPlan("too-late", daysLeft, idealLessons);

  const lessons = Math.min(idealLessons, windowDays);
  const shortened = lessons < idealLessons;
  const comfortSpan = Math.round((lessons - 1) * COMFORT_GAP);
  const start =
    availableSpan > comfortSpan ? addDays(last, -comfortSpan) : first;
  const span = diffDays(start, last);

  const titles = curriculum(lessons, extras);
  const sessions: PlanSession[] = titles.map((title, index) => ({
    number: index + 1,
    date:
      lessons === 1
        ? last
        : addDays(start, Math.round((index * span) / (lessons - 1))),
    title,
    final: index === lessons - 1,
  }));

  let status: PlanStatus;
  if (shortened) status = "express";
  else if (availableSpan >= comfortSpan + RELAXED_SLACK) status = "relaxed";
  else if (availableSpan >= comfortSpan) status = "comfortable";
  else if (availableSpan >= (lessons - 1) * TIGHT_GAP) status = "tight";
  else status = "express";

  const lessonsText = countRu(lessons, LESSON_FORMS);
  let headline: string;
  let advice: string;
  if (status === "relaxed") {
    headline = "Времени с запасом";
    advice = `Спокойно стартуем ${formatRuDayMonth(start)} — или раньше, если хочется совсем без спешки.`;
  } else if (status === "comfortable") {
    headline = "Самое время начинать";
    advice = "Два занятия в неделю — и танец успеет спокойно «улечься» в теле.";
  } else if (status === "tight") {
    headline = "Успеваем, но плотно";
    advice =
      "Заниматься придётся чаще обычного — лучше написать Дмитрию уже сегодня.";
  } else if (shortened) {
    headline = "Экспресс-режим";
    advice = `До свадьбы помещается ${lessonsText} из ${idealLessons} — упростим хореографию, но оставим её эффектной.`;
  } else {
    headline = "Экспресс-режим";
    advice =
      "Занятия почти каждый день — напишите Дмитрию прямо сейчас, чтобы занять время.";
  }

  return {
    status,
    daysLeft,
    idealLessons,
    lessons,
    shortened,
    sessions,
    firstLesson: sessions[0]?.date ?? null,
    lastLesson: sessions[sessions.length - 1]?.date ?? null,
    pace: paceLabel(lessons, span),
    headline,
    advice,
  };
}

/** The message a couple sends to Dmitriy, pre-filled from their programme. */
export function telegramMessage(input: PlanInput, plan: Plan): string {
  const extras = uniqueExtras(input.extras).map((id) => find(EXTRAS, id).title);
  const lines = [
    "Здравствуйте, Дмитрий! Хотим поставить свадебный танец.",
    "",
    `Дата свадьбы: ${formatRu(input.wedding)}`,
    `Стиль: ${find(STYLES, input.style).title}`,
    `Опыт: ${find(LEVELS, input.level).title}`,
  ];
  if (extras.length > 0) lines.push(`Дополнительно: ${extras.join(", ")}`);
  if (plan.lessons > 0 && plan.firstLesson) {
    lines.push(
      `Программа: ${countRu(plan.lessons, LESSON_FORMS)}, ${plan.pace}, первое — ${formatRuDayMonth(plan.firstLesson)}`,
    );
  } else if (plan.status === "too-late") {
    lines.push("Времени почти не осталось — подскажите, что можно успеть?");
  }
  lines.push("", "Когда можно начать?");
  return lines.join("\n");
}

/** A t.me link that opens the chat with `text` already typed in. */
export function telegramLink(username: string, text?: string): string {
  const base = `https://t.me/${username.replace(/^@/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
