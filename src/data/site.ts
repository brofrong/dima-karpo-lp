// Facts every design shares. Edit here once and all five landings update.
// Only things we actually know about Dmitriy live here — no prices, no city,
// no years of experience, no reviews. See docs/design-contract.md.

import { telegramLink } from "../lib/planner";

export const site = {
  name: "Дмитрий Карпов",
  firstName: "Дмитрий",
  role: "Преподаватель бачаты и постановщик свадебных танцев",
  telegramUsername: "KarpovDmitriyy",
  telegramHandle: "@KarpovDmitriyy",
  telegramUrl: telegramLink("KarpovDmitriyy"),
  instagramUsername: "zz_dmitriy_zz",
  instagramHandle: "@zz_dmitriy_zz",
  instagramUrl: "https://www.instagram.com/zz_dmitriy_zz/",
  /** Shown as the default <title> / description; designs may override. */
  seoTitle: "Свадебный танец с Дмитрием Карповым — бачата и не только",
  seoDescription:
    "Постановка свадебного танца: бачата, вальс, микс или ваш любимый трек. Выберите дату свадьбы — и получите программу занятий по дням.",
  /** Usual preparation, as Dmitriy describes it. */
  typicalLessons: "5–7 занятий",
} as const;

/** Message that opens in Telegram from plain "write to me" buttons. */
export const helloMessage =
  "Здравствуйте, Дмитрий! Хотим поставить свадебный танец. Подскажите, когда можно начать?";

export const helloLink = telegramLink(site.telegramUsername, helloMessage);
