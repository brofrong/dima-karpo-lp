# Свадебный танец с Дмитрием Карповым

Пять вариантов одного лендинга: постановка свадебного танца (бачата и любой
другой стиль) с Дмитрием Карповым. В каждом — календарь: выбираете дату
свадьбы, стиль и опыт, получаете программу занятий по дням и отправляете её
Дмитрию в Telegram.

- Галерея вариантов: `/`
- Варианты: `/1/` … `/5/`
- Telegram: [@KarpovDmitriyy](https://t.me/KarpovDmitriyy) · Instagram:
  [@zz_dmitriy_zz](https://www.instagram.com/zz_dmitriy_zz/)

## Стек

Astro (статика) · Tailwind CSS v4 · GSAP, Lenis, three.js · всё остальное —
Bun: менеджер пакетов, запуск, тесты, линтер, форматтер.

## Команды

```sh
bun install
bun run dev          # локальный сервер: http://localhost:4321/dima-karpo-lp/
bun run build        # статика в ./dist
bun test             # тесты планировщика
bun run lint         # bun lint
bun run fmt          # bun fmt
bun run typecheck    # astro check
bun run verify       # всё сразу
```

Проверка одного варианта со скриншотами (нужен Google Chrome):

```sh
DK_ONLY=d3 bun run build && bun scripts/shot.ts 3
```

## Где что лежит

| Путь                                       | Что это                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| `src/data/site.ts`                         | Имя, ссылки, тексты для поиска — общие для всех вариантов |
| `src/data/photos.ts`, `src/assets/photos/` | Фотографии и подписи к ним                                |
| `src/lib/planner.ts`                       | Расчёт программы: сколько занятий и по каким дням         |
| `src/lib/planner-store.ts`                 | Состояние календаря для виджета                           |
| `src/designs/d1` … `d5`                    | Сами дизайны, каждый в своей папке                        |
| `docs/design-contract.md`                  | Правила, общие для всех вариантов                         |
| `scripts/shot.ts`                          | Скриншоты и автоматические проверки                       |

## Как поменять содержание

- Ссылки и имя — в `src/data/site.ts`.
- Фото — положите файлы с теми же именами в `src/assets/photos/` (сейчас там
  превью 640 px из Instagram; оригиналы будут выглядеть заметно лучше).
- Сколько занятий на что уходит — каталоги `STYLES`, `LEVELS`, `EXTRAS` в
  `src/lib/planner.ts`.

## Публикация

GitHub Pages собирается из ветки `main` (`.github/workflows/deploy.yml`).
