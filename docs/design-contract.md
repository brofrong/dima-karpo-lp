# Design contract

Rules every landing variant follows. The site has five variants of one page —
`/1/` … `/5/` — that promote **Дмитрий Карпов** as the person who stages a
couple's **wedding dance**. Same content and facts, five different designs.

Read this whole file before touching code.

## 1. The job of the page

A couple planning a wedding lands here (mostly from a phone, from Instagram).
In a minute they should feel: "this looks great, this person is friendly, it is
easy — let's write to him". The page leads to exactly two places:

- Telegram **@KarpovDmitriyy** — the main call to action, repeated often;
- Instagram **@zz_dmitriy_zz** — "see how he dances".

Priorities: wedding dance first. Bachata is Dmitriy's speciality and the
flavour of the page, but he stages **any** wedding dance (a waltz, a slow dance,
a mix of styles, the couple's own track).

The owner asked for a page that is **beautiful, maximally creative, energetic
and sharp ("бодрый, резкий"), with lots of great animation**. A tidy generic
template is a failure. So is a page that is flashy but broken.

## 2. What you may touch

You own **one folder: `src/designs/dN/`** (N is your variant number). Create
and edit files only there.

Everything else is shared and read-only: `src/lib`, `src/data`, `src/layouts`,
`src/components`, `src/pages`, `src/assets`, `scripts`, `docs`, configs,
`package.json`. If something shared looks wrong, say so in your final report
instead of editing it.

Other agents work in the same checkout at the same time, each in their own
folder. Therefore:

- no `git` commands that change anything (no commit, stash, checkout, reset,
  clean); no `bun add` / `bun install` / `bun remove`;
- never run the plain `bun run build`, `bun run fmt` or a dev server — use the
  per-design commands from section 9;
- do not delete or edit files outside your folder, even "temporary" ones.

Required files:

| File                        | What it is                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/designs/dN/Page.astro` | The page. Wraps everything in `BaseLayout` with `variant={N}`.                                                        |
| `src/designs/dN/meta.ts`    | `export const meta: DesignMeta = { name, tagline, palette }` (type from `src/data/designs.ts`). Shown in the gallery. |
| `src/designs/dN/styles.css` | Your Tailwind entry (see section 3).                                                                                  |

Split the rest however you like inside the folder: section components
(`Hero.astro`, …), client scripts (`*.ts`), SVGs.

## 3. Stack

- **Astro 7**, static output. **Tailwind CSS v4** — your own entry file:

  ```css
  @import "tailwindcss" source(".");

  @theme {
    --font-display: "Unbounded", sans-serif;
    --color-ink: #0c0a0e;
  }
  ```

  `source(".")` makes Tailwind scan only your folder. Import the file once in
  `Page.astro` frontmatter: `import "./styles.css";`. Each page loads only its
  own CSS, so global rules in your file cannot leak into other variants.
  Tailwind utilities first; custom CSS (keyframes, masks, clip-paths, complex
  gradients) in the same file or in scoped `<style>` blocks is welcome.

- **Animation libraries already installed** — use them, do not add others:
  `gsap` 3.15 (with every plugin: `gsap/ScrollTrigger`, `gsap/SplitText`,
  `gsap/Flip`, `gsap/Observer`, `gsap/CustomEase`, `gsap/MotionPathPlugin`,
  `gsap/DrawSVGPlugin`, `gsap/ScrambleTextPlugin`, …), `lenis` 1.3 (smooth
  scroll), `three` 0.187 (WebGL). Plain CSS animation, the Web Animations API,
  canvas 2D and SVG are just as good.

- **Client code** lives in `.ts` files in your folder and is loaded from an
  Astro `<script>` (Vite bundles it):

  ```astro
  <script>
    import { initPage } from "./main";
    initPage();
  </script>
  ```

  Keep logic in `.ts` files, not inline in `.astro` — the linter and the
  formatter only see `.ts`/`.css`.

- **three.js is heavy** (~170 KB gzipped). If you use it, load it with a
  dynamic `import("three")` after first paint, cap the pixel ratio at 2, stop
  rendering when the canvas is off screen or the tab is hidden, and keep a
  good-looking static fallback for when WebGL is unavailable.

- **Fonts**: Google Fonts through `<link>` tags in
  `<Fragment slot="head">` (with `preconnect`, `display=swap`), two or three
  families at most. The text is Russian — **every font must have Cyrillic**.
  Check in a screenshot that headings are not falling back to a system font.
  Families known to include Cyrillic: Unbounded, Manrope, Onest, Golos Text,
  Geologica, Inter, Jost, Montserrat, Raleway, Rubik, Rubik Mono One, Oswald,
  Bebas Neue, Dela Gothic One, Russo One, Tektur, Playfair Display, Cormorant
  Garamond, Cormorant Infant, Prata, Forum, Yeseva One, Old Standard TT,
  Literata, Alegreya, PT Serif, Poiret One, Caveat, Marck Script, Bad Script,
  Pacifico, Lobster, Comfortaa, IBM Plex Sans/Serif/Mono, JetBrains Mono,
  Press Start 2P.

- **Base path.** The site is served from `/dima-karpo-lp/`. Never hardcode it.
  In-page links are `#anchors`; links to other pages go through `withBase()`
  from `src/data/designs.ts`; images and CSS go through imports.

## 4. Shared code you must use

- `src/data/site.ts` — `site` (name, role, Telegram/Instagram URLs and
  handles, `typicalLessons`), `helloLink` (Telegram link with a greeting
  pre-filled). Take every link and handle from here; do not retype them.
- `src/data/photos.ts` — the eight photos with alt texts (section 6).
- `src/lib/planner.ts` — option catalogues `STYLES`, `LEVELS`, `EXTRAS`
  (titles and notes ready for display), `buildPlan`, types.
- `src/lib/planner-store.ts` — `createPlannerStore()`: headless state for the
  planner widget (visible month, chosen date and options, the plan, the
  Telegram link). **Build your planner on it** — do not re-implement dates or
  lesson maths.
- `src/lib/dates.ts` — Russian date formatting (`formatRu`,
  `formatRuDayMonth`, `weekdayShortRu`, `countRu`, `plural`, `WEEKDAYS_SHORT`…).
- `src/layouts/BaseLayout.astro` — `<html>`, meta tags, the `no-js` → `js`
  class switch, the variant switcher. Props: `title`, `description`,
  `themeColor`, `variant`, `bodyClass`; slot `head`.
- `src/designs/_reference/` — a bare, unstyled but fully working planner
  (`Planner.astro` + `planner-client.ts`) that passes the automatic test. Read
  it to see the wiring, then write your own markup and looks. Do not import it.

## 5. Content

Language: Russian, addressing the couple as «вы». Warm, lively, short
sentences, a little humour is fine. Typographically clean: «ёлочки», long
dashes —, no lorem ipsum, no walls of text. Emoji: at most a couple, or none.

### Facts you may state

- Дмитрий Карпов — преподаватель бачаты и постановщик свадебных танцев.
- He teaches bachata (has led groups for beginners and for continuing
  dancers) and dances socially — at parties and festivals (see the photos).
- He stages wedding dances: bachata and any other style — a waltz, a slow
  dance, a mix of styles, a dance to the couple's own track.
- He works with couples who have never danced.
- Usual preparation: **5–7 lessons** (`site.typicalLessons`). It is best to
  start one or two months before the wedding; it can be done faster.
- The choreography is built around the couple: their song, their level, the
  dress, the size of the dance floor.
- Details — price, place, schedule, format — are discussed personally in
  Telegram.

### Never invent

No prices or discounts, no city or address, no studio name, no years of
experience, no numbers of couples/students/weddings, no titles or awards, no
reviews, testimonials or quotes from "clients", no ratings, no guarantees, no
lesson duration, no online/offline claims, no "free trial lesson". If a section
would need such a fact, write it so that it does not ("Стоимость и место
занятий Дмитрий подскажет в Telegram").

General truths about wedding dances are fine for an FAQ (comfortable shoes,
practising in the dress skirt, bringing your track, it is okay to be nervous,
partners who "can't dance" learn too).

### What the page should contain

The order, naming and form are yours — surprise us — but all of it must be
there:

1. **Hero** — the only `<h1>`, the promise (wedding dance), Dmitriy's name,
   primary button to Telegram (`helloLink`), secondary to the planner.
2. **Who Dmitriy is** — with photos; link to Instagram.
3. **What dance** — bachata as the signature, plus any other style.
4. **How it goes** — from the first message to the wedding day.
5. **Planner** — the calendar (section 7). The star feature; give it room.
6. **FAQ** — 4–6 honest questions.
7. **Final call to action** + footer with Telegram and Instagram.

Telegram must be reachable from every screenful on a phone (a sticky button
is a good way). External links: `target="_blank" rel="noopener noreferrer"`.

## 6. Photos

Eight photos from Dmitriy's Instagram live in `src/data/photos.ts` (each has
`src`, a ready Russian `alt`, and `about` — what is in the frame). Look at the
actual files in `src/assets/photos/` before designing around them.

They are **small: 640 px on the long side** (the portrait is 320 px). So:

- render them through `<Image>` from `astro:assets`
  (`<Image src={photos.danceSmile.src} alt={photos.danceSmile.alt} widths={[320, 640]} sizes="…" />`);
- show them at about their natural size or smaller: tiles, polaroids, film
  frames, round badges, stacked cards, small collages;
- if you want them big, **stylise**: duotone / gradient map, halftone, heavy
  grain, blur as a colour wash, masks and clip-paths, CSS `mix-blend-mode`.
  A soft upscaled photo across the whole hero looks cheap — do not do that;
- the big visuals come from typography, colour, SVG, CSS and canvas/WebGL.

Use at least four of the photos. `partyWide` has a watermark in the corners —
crop it. Do not add stock photos, AI images or pictures from the internet.

## 7. The planner (calendar)

What the visitor does: picks the wedding date in a calendar, chooses the
style, their experience and extras, and immediately sees how many lessons are
needed, how many days are left, a verdict ("Самое время начинать"), and the
programme lesson by lesson with dates. One button sends that programme to
Dmitriy in Telegram.

Build it on `createPlannerStore()`; the `PlannerView` it gives you has
everything: `weeks` (calendar cells with `disabled`, `isToday`, `selected`,
`session`), `monthTitle`, `canPrev`/`canNext`, `selection`, `lessons`,
`plan` (`status`, `daysLeft`, `headline`, `advice`, `pace`, `sessions`,
`shortened`, `idealLessons`…), `ctaHref`.

Make it a pleasure: mark lesson days in the calendar, animate the programme
when it changes, colour the verdict by `plan.status`, show the countdown.
Handle every state: no date yet, plenty of time (`relaxed`), `comfortable`,
`tight`, `express` (possibly `shortened`), `too-late` (no lessons — invite to
write anyway).

### DOM contract (checked automatically — follow it exactly)

| Selector                                                       | Requirement                                                                                                                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[data-planner]`                                               | Root of the widget. Exactly one on the page. Everything below is inside it.                                                                                                                              |
| `button[data-date="YYYY-MM-DD"]`                               | One per selectable day of the visible month. Days before today are `disabled`. The chosen day has `aria-pressed="true"`. Cells of neighbouring months: either no `data-date`, or a fully working button. |
| `button[data-planner-prev]`, `button[data-planner-next]`       | Month navigation; `disabled` when `canPrev`/`canNext` is false.                                                                                                                                          |
| `[data-planner-lessons]`                                       | Exactly one element. Its first number is `view.lessons` (before a date is chosen that is the recommendation, 6 by default).                                                                              |
| `[data-planner-days-left]`                                     | Exactly one element. Its first number is `plan.daysLeft` once a date is chosen.                                                                                                                          |
| `[data-planner-session]`                                       | One element per lesson of the current plan — the count equals `plan.lessons`; none before a date is chosen. No duplicates (do not clone the list for a marquee).                                         |
| `a[data-planner-cta]`                                          | Exactly one. `href` is always `view.ctaHref`. Opens in a new tab.                                                                                                                                        |
| `button[data-planner-style="bachata\|classic\|mix\|own"]`      | Style, single choice; current one has `aria-pressed="true"`.                                                                                                                                             |
| `button[data-planner-level="zero\|some\|confident"]`           | Experience, single choice.                                                                                                                                                                               |
| `button[data-planner-extra="lifts\|medley\|parents\|friends"]` | Extras, each toggles independently.                                                                                                                                                                      |

Also:

- all of these controls are real `<button type="button">` elements, reachable
  by keyboard, with a visible focus style, at least 40×40 px on a phone;
- a real mouse click on the centre of each control must work — nothing
  (overlay, canvas, custom cursor, sticky bar) may cover it;
- numbers may animate, but must settle on the right value within 2 seconds;
- do not rebuild the day buttons on every state change (focus would be lost) —
  rebuild when the month changes, otherwise update attributes;
- changes are announced politely (`aria-live="polite"` on the result);
- without JavaScript the block still makes sense: the options and a Telegram
  link are in the HTML, plus a `<noscript>` hint.

## 8. Motion, quality, accessibility

**Motion — a lot of it, and sharp.** Fast, confident easing (`expo.out`,
`power4.out`, snappy `back.out`), short durations (0.25–0.8 s), staggered
entrances, things that react to scroll and pointer. Ideas: a staged hero
intro, split-text headlines, scroll-driven scenes and pinned sections,
marquees, parallax layers, magnetic buttons, hover distortions, counters,
drawn SVG lines (dance-step diagrams!), a custom cursor on desktop, WebGL or
canvas backgrounds, a rhythm/beat motif. Sluggish fades everywhere are not
what was asked for.

Rules that keep it from breaking:

- Animate `transform` and `opacity` (and filters sparingly). No animated
  `top/left/width/height`, no layout thrash in scroll handlers. It must stay
  smooth on a mid-range phone.
- **Nothing may stay invisible.** Content hidden for an entrance animation is
  hidden either from JS (`gsap.from`, `gsap.set`) or in CSS only under
  `html.js` (BaseLayout swaps `no-js` → `js` before paint). Without JS and at
  the end of every animation, all text is visible.
- **`prefers-reduced-motion: reduce`**: no parallax, pinning, marquees, smooth
  scroll or looping motion; content is simply there (short opacity fades are
  fine). Use `gsap.matchMedia()` and CSS media queries.
- Touch devices have no hover and no cursor: hover-only effects need a touch
  equivalent or must be unnecessary. Custom cursors only for
  `(hover: hover) and (pointer: fine)`.
- Clean up: `ScrollTrigger.refresh()` after fonts/images load; no console
  errors or warnings from your code.

**Layout.** Phone first: design for 390 px, then 768, 1440 and wide screens.
No horizontal scrolling at any width (decorative overflow sits in a container
with `overflow: clip`). Text never overlaps or runs out of its box; long
Russian words fit at 360 px. Body text at least 16 px; contrast at least
4.5:1 for text.

The variant switcher is a small pill fixed at the left edge, vertically
centred (about 32 px wide). Do not hide it; avoid placing a fixed element of
your own in the same spot.

**Semantics.** One `<h1>`, ordered headings, landmarks (`header`, `main`,
`footer`, `nav`), `alt` on every image (decorative: `alt=""`), buttons are
buttons and links are links, focus is visible, decorative canvases and
duplicated marquee text are `aria-hidden="true"`.

**Head.** Pass `title`, `description` and `themeColor` (your page background)
to `BaseLayout`.

## 9. Build and check — only your variant

```sh
DK_ONLY=dN bun run build          # builds your page into dist-variants/dN (others become stubs)
bun scripts/shot.ts N             # screenshots + automatic checks, report at the end
bun lint --no-script src/designs/dN
bun fmt --no-script src/designs/dN
bunx --bun astro check 2>&1 | grep -B2 -A8 "src/designs/dN"   # type errors in your folder only
```

`scripts/shot.ts` opens your page in headless Chrome (desktop 1440×900 and
phone 390×844), scrolls through it, clicks through the planner like a visitor
and compares what it sees with `src/lib/planner.ts`. It also loads the page
with reduced motion and with JavaScript off. It prints a JSON report:

- `failures` — must be empty. Console errors, failed requests, horizontal
  scroll, broken images, wrong or missing Telegram/Instagram links, planner
  mismatches, content invisible without JS.
- `warnings` — read each one and either fix it or be sure it is harmless.
- `contactSheets` — JPEG sheets of the whole page, top to bottom
  (`/tmp/dk-shots/dN/desktop-sheet-NN.jpg`, `mobile-sheet-NN.jpg`), plus
  `desktop-planner-filled.jpg`, `mobile-planner-filled.jpg`, `nojs-top.jpg`
  and the full-size frames `desktop-NN.jpg` / `mobile-NN.jpg`.
- `extraShots` — the filled planner on desktop and phone, the page without
  JavaScript, and the top of the page plus the planner at 360 px, 820 px and
  1920 px (`small-phone-*.jpg`, `tablet-*.jpg`, `wide-*.jpg`). The same
  overflow and error checks run at those widths.

**Look at the screenshots with the Read tool — every sheet, then full-size
frames of anything suspicious.** The automatic checks cannot see ugly: text
over text, a heading in a fallback font, an empty gap, a photo stretched into
mush, an element stuck half-animated, low contrast. You are done only when
the checks pass _and_ the page looks excellent on both desktop and phone.

Frames are captured about 0.65 s after each scroll step, so entrance
animations should have finished by then; an element caught mid-flight in a
frame usually means the animation is too slow for a "sharp" page.
