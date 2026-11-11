// Screenshots and automatic checks for one landing variant.
//
//   DK_ONLY=d3 bun run build && bun scripts/shot.ts 3
//   bun scripts/shot.ts 3 --dist        # check the full build in ./dist instead
//
// Serves the built site under /dima-karpo-lp/, opens /N/ in headless Chrome at
// desktop and mobile sizes, scrolls through it step by step (so scroll-driven
// animations actually run), saves screenshots to /tmp/dk-shots/dN/ and prints a
// report. Exit code 1 means at least one hard failure.

import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { site } from "../src/data/site";
import { addDays, todayISO } from "../src/lib/dates";
import {
  buildPlan,
  DEFAULT_SELECTION,
  recommendLessons,
  telegramLink,
  telegramMessage,
  type Selection,
} from "../src/lib/planner";

const BASE = "/dima-karpo-lp";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = join(import.meta.dir, "..");

const args = process.argv.slice(2);
const number = Number(args.find((arg) => /^[1-5]$/.test(arg)));
if (!number) {
  console.error("Usage: bun scripts/shot.ts <1-5> [--dist] [--no-shots]");
  process.exit(2);
}
const id = `d${number}`;
const useDist = args.includes("--dist");
const withShots = !args.includes("--no-shots");
const siteDir = useDist ? join(ROOT, "dist") : join(ROOT, "dist-variants", id);
if (!existsSync(join(siteDir, String(number), "index.html"))) {
  console.error(
    `No build found in ${siteDir}. Run: ${useDist ? "bun run build" : `DK_ONLY=${id} bun run build`}`,
  );
  process.exit(2);
}
const outDir = `${process.env.DK_SHOTS_DIR ?? "/tmp/dk-shots"}/${id}`;
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const failures: string[] = [];
const warnings: string[] = [];
const fail = (message: string) => failures.push(message);
const warn = (message: string) => warnings.push(message);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- static server -----------------------------------------------------------

const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${BASE}/`)) {
      return new Response("Not under the base path", { status: 404 });
    }
    let path = normalize(decodeURIComponent(url.pathname.slice(BASE.length)));
    if (path.includes("..")) return new Response("Bad path", { status: 400 });
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(join(siteDir, path));
    if (!(await file.exists()))
      return new Response("Not found", { status: 404 });
    return new Response(file);
  },
});
const origin = `http://localhost:${server.port}`;
const pageUrl = `${origin}${BASE}/${number}/`;

// --- helpers that run inside the page ----------------------------------------

interface PageAudit {
  scrollWidth: number;
  clientWidth: number;
  overflowing: string[];
  brokenImages: string[];
  missingAlt: string[];
  hiddenText: string[];
  h1: string[];
  lang: string;
  title: string;
  telegram: string[];
  instagram: string[];
  badExternal: string[];
  badInternal: string[];
  deadAnchors: string[];
  hasSwitcher: boolean;
  honesty: string[];
  textLength: number;
  pageHeight: number;
}

function auditInPage(base: string): PageAudit {
  const describe = (element: Element): string => {
    const tag = element.tagName.toLowerCase();
    const idPart = element.id ? `#${element.id}` : "";
    const classes =
      typeof element.className === "string" && element.className
        ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
    const text = (element.textContent ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 50);
    return `${tag}${idPart}${classes}${text ? ` "${text}"` : ""}`;
  };
  const clipped = (element: Element): boolean => {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== "visible") return true;
    }
    return false;
  };
  const effectiveOpacity = (element: Element): number => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none") return -1;
      if (style.visibility === "hidden" || style.visibility === "collapse")
        return 0;
      opacity *= Number(style.opacity);
    }
    return opacity;
  };
  const skipHidden = (element: Element): boolean =>
    Boolean(
      element.closest(
        '[aria-hidden="true"], [hidden], [inert], [data-variant-switcher], [data-allow-hidden], script, style, noscript, template, svg',
      ),
    );

  const viewport = document.documentElement.clientWidth;
  const overflowing: string[] = [];
  const hiddenText: string[] = [];
  for (const element of document.body.querySelectorAll("*")) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (
      (rect.right > viewport + 2 || rect.left < -2) &&
      getComputedStyle(element).position !== "fixed" &&
      !clipped(element) &&
      overflowing.length < 10
    ) {
      overflowing.push(
        `${describe(element)} [${Math.round(rect.left)}..${Math.round(rect.right)} of ${viewport}]`,
      );
    }
    const ownText = [...element.childNodes].some(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        (node.textContent ?? "").trim().length > 1,
    );
    if (ownText && !skipHidden(element)) {
      const opacity = effectiveOpacity(element);
      if (opacity >= 0 && opacity < 0.05 && hiddenText.length < 15) {
        hiddenText.push(describe(element));
      }
    }
  }

  const images = [...document.images];
  const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")];
  const raw = (link: HTMLAnchorElement) => link.getAttribute("href") ?? "";
  const bodyText = document.body.innerText;
  const honesty: string[] = [];
  const patterns: [RegExp, string][] = [
    [/\d[\d\s]*(₽|руб)/i, "a price"],
    [/\d+\s*(лет|года|год)\s+(опыта|препода|в танц)/i, "years of experience"],
    [
      /\d+\+?\s*(пар|учеников|свадеб|выпускник)/i,
      "a count of couples/students",
    ],
    [/отзыв/i, "reviews"],
    [/(чемпион|лауреат|призёр|победитель)/i, "titles/awards"],
  ];
  for (const [pattern, label] of patterns) {
    const match = bodyText.match(pattern);
    if (match) honesty.push(`${label}: "${match[0]}"`);
  }

  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: viewport,
    overflowing,
    brokenImages: images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
    missingAlt: images
      .filter((image) => !image.hasAttribute("alt"))
      .map((image) => image.currentSrc || image.src),
    hiddenText,
    h1: [...document.querySelectorAll("h1")].map((heading) =>
      (heading.textContent ?? "").trim().replace(/\s+/g, " "),
    ),
    lang: document.documentElement.lang,
    title: document.title,
    telegram: links
      .map(raw)
      .filter((href) => /(^|\/\/)(t\.me|telegram\.me)\//.test(href)),
    instagram: links.map(raw).filter((href) => href.includes("instagram.com")),
    badExternal: links
      .filter(
        (link) =>
          /^https?:\/\//.test(raw(link)) &&
          (link.target !== "_blank" || !link.rel.includes("noopener")),
      )
      .map(raw),
    badInternal: links
      .map(raw)
      .filter((href) => href.startsWith("/") && !href.startsWith(`${base}/`)),
    deadAnchors: links
      .map(raw)
      .filter((href) => href.startsWith("#") && href.length > 1)
      .filter(
        (href) => !document.getElementById(decodeURIComponent(href.slice(1))),
      ),
    hasSwitcher: Boolean(document.querySelector("[data-variant-switcher]")),
    honesty,
    textLength: bodyText.length,
    pageHeight: document.documentElement.scrollHeight,
  };
}

// --- page plumbing -----------------------------------------------------------

interface Problems {
  console: string[];
  requests: string[];
}

function watch(page: Page): Problems {
  const problems: Problems = { console: [], requests: [] };
  page.on("console", (message) => {
    if (message.type() === "error")
      problems.console.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => {
    problems.console.push(`Uncaught: ${String(error).slice(0, 300)}`);
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "";
    if (reason.includes("ERR_ABORTED")) return;
    problems.requests.push(`${request.url()} — ${reason}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.requests.push(`${response.url()} — HTTP ${response.status()}`);
    }
  });
  return problems;
}

async function open(page: Page): Promise<void> {
  await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await sleep(1800);
}

/** Scrolls down one step at a time; returns the screenshots it took. */
async function scrollThrough(
  page: Page,
  prefix: string,
  options: { pause: number; shots: boolean; maxShots: number },
): Promise<string[]> {
  const files: string[] = [];
  const viewportHeight = page.viewport()?.height ?? 800;
  const step = Math.round(viewportHeight * 0.85);
  let position = 0;
  for (let index = 0; index < 80; index += 1) {
    if (options.shots && files.length < options.maxShots) {
      const file = join(
        outDir,
        `${prefix}-${String(index + 1).padStart(2, "0")}.jpg`,
      );
      await page.screenshot({ path: file, type: "jpeg", quality: 72 });
      files.push(file);
    }
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    if (position + viewportHeight >= height - 2) break;
    position = Math.min(position + step, height - viewportHeight);
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      position,
    );
    await sleep(options.pause);
  }
  return files;
}

async function contactSheets(
  files: string[],
  prefix: string,
  perSheet: number,
  columns: number,
  cellWidth: number,
): Promise<string[]> {
  const sheets: string[] = [];
  for (let start = 0; start < files.length; start += perSheet) {
    const sheet = join(
      outDir,
      `${prefix}-sheet-${String(sheets.length + 1).padStart(2, "0")}.jpg`,
    );
    const result = Bun.spawnSync([
      "magick",
      "montage",
      ...files.slice(start, start + perSheet),
      "-tile",
      `${columns}x`,
      "-geometry",
      `${cellWidth}x+6+6`,
      "-background",
      "#ff00ff",
      "-quality",
      "78",
      sheet,
    ]);
    if (result.exitCode === 0) sheets.push(sheet);
    else
      warn(`magick montage failed: ${result.stderr.toString().slice(0, 200)}`);
  }
  return sheets;
}

function judge(label: string, audit: PageAudit, problems: Problems): void {
  for (const message of new Set(problems.console))
    fail(`[${label}] console error: ${message}`);
  for (const message of new Set(problems.requests))
    fail(`[${label}] request failed: ${message}`);
  if (audit.scrollWidth > audit.clientWidth + 1) {
    fail(
      `[${label}] horizontal scroll: page is ${audit.scrollWidth}px wide in a ${audit.clientWidth}px viewport. Offenders: ${audit.overflowing.join(" | ") || "none found outside clipped containers"}`,
    );
  }
  for (const source of audit.brokenImages)
    fail(`[${label}] broken image: ${source}`);
  for (const source of audit.missingAlt)
    fail(`[${label}] <img> without alt: ${source}`);
  if (audit.hiddenText.length > 0) {
    warn(
      `[${label}] text still invisible at the end of the page (fine for closed menus or scrubbed scenes; a bug if it is content): ${audit.hiddenText.join(" | ")}`,
    );
  }
}

function judgeContent(audit: PageAudit): void {
  if (audit.h1.length !== 1)
    fail(`expected exactly one <h1>, found ${audit.h1.length}`);
  if (audit.lang !== "ru")
    fail(`<html lang> is "${audit.lang}", expected "ru"`);
  if (!audit.title.trim()) fail("empty <title>");
  if (!audit.hasSwitcher)
    fail("variant switcher is missing (pass variant to BaseLayout)");
  if (audit.telegram.length === 0) fail("no Telegram link on the page");
  for (const href of audit.telegram) {
    if (
      href !== site.telegramUrl &&
      !href.startsWith(`${site.telegramUrl}?text=`)
    ) {
      fail(`wrong Telegram link: ${href.slice(0, 120)}`);
    }
  }
  if (audit.instagram.length === 0) fail("no Instagram link on the page");
  for (const href of audit.instagram) {
    if (href !== site.instagramUrl) fail(`wrong Instagram link: ${href}`);
  }
  for (const href of new Set(audit.badExternal)) {
    fail(
      `external link needs target="_blank" rel="noopener noreferrer": ${href.slice(0, 120)}`,
    );
  }
  for (const href of new Set(audit.badInternal))
    fail(`internal link ignores the base path: ${href}`);
  for (const href of new Set(audit.deadAnchors))
    fail(`anchor points nowhere: ${href}`);
  for (const item of audit.honesty) {
    warn(
      `possible invented fact (${item}) — only facts from docs/design-contract.md are allowed`,
    );
  }
  if (audit.textLength < 1500)
    warn(`very little text on the page (${audit.textLength} chars)`);
}

// --- planner end-to-end ------------------------------------------------------

interface PlannerState {
  lessons: string | null;
  daysLeft: string | null;
  sessions: number;
  cta: string | null;
  pressed: boolean;
}

async function plannerState(
  page: Page,
  iso: string | null,
): Promise<PlannerState> {
  return page.evaluate((date) => {
    const root = document.querySelector("[data-planner]");
    const text = (selector: string) =>
      root?.querySelector(selector)?.textContent?.trim() ?? null;
    const day = date ? root?.querySelector(`[data-date="${date}"]`) : null;
    return {
      lessons: text("[data-planner-lessons]"),
      daysLeft: text("[data-planner-days-left]"),
      sessions: root?.querySelectorAll("[data-planner-session]").length ?? 0,
      cta:
        root?.querySelector("a[data-planner-cta]")?.getAttribute("href") ??
        null,
      pressed:
        day?.getAttribute("aria-pressed") === "true" ||
        day?.getAttribute("aria-selected") === "true",
    };
  }, iso);
}

const firstNumber = (text: string | null): number | null => {
  const match = text?.match(/\d+/);
  return match ? Number(match[0]) : null;
};

/** Clicks through the planner like a visitor and compares it with src/lib/planner.ts. */
async function testPlanner(page: Page, label: string): Promise<void> {
  const say = (message: string) => fail(`[planner, ${label}] ${message}`);
  if (!(await page.$("[data-planner]"))) {
    say("no [data-planner] element");
    return;
  }
  const today = await page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  if (today !== todayISO())
    warn(`browser date ${today} differs from script date ${todayISO()}`);

  const click = async (selector: string): Promise<boolean> => {
    const done = await page.evaluate((target) => {
      const element = document.querySelector<HTMLElement>(
        `[data-planner] ${target}`,
      );
      if (!element) return "missing";
      if (element.tagName !== "BUTTON")
        return `not a <button> (${element.tagName.toLowerCase()})`;
      if ((element as HTMLButtonElement).disabled) return "disabled";
      element.scrollIntoView({ block: "center", behavior: "instant" });
      return "ok";
    }, selector);
    if (done !== "ok") {
      say(`${selector} is ${done}`);
      return false;
    }
    await sleep(250);
    try {
      // A real mouse click: fails if something covers the control.
      await page.click(`[data-planner] ${selector}`);
    } catch (error) {
      say(`cannot click ${selector}: ${String(error).slice(0, 160)}`);
      return false;
    }
    await sleep(120);
    return true;
  };

  const pickDate = async (iso: string): Promise<boolean> => {
    for (let hop = 0; hop < 30; hop += 1) {
      if (await page.$(`[data-planner] [data-date="${iso}"]:not(:disabled)`))
        break;
      if (!(await click("[data-planner-next]"))) return false;
      await sleep(450);
    }
    if (!(await page.$(`[data-planner] [data-date="${iso}"]:not(:disabled)`))) {
      say(`could not reach ${iso} with [data-planner-next]`);
      return false;
    }
    return click(`[data-date="${iso}"]`);
  };

  const expectPlan = async (
    step: string,
    wedding: string,
    selection: Selection,
  ) => {
    const input = { wedding, today, ...selection };
    const plan = buildPlan(input);
    const href = telegramLink(
      site.telegramUsername,
      telegramMessage(input, plan),
    );
    let state = await plannerState(page, wedding);
    // Numbers may count up with an animation — give them time to settle.
    for (let attempt = 0; attempt < 16; attempt += 1) {
      if (
        firstNumber(state.lessons) === plan.lessons &&
        firstNumber(state.daysLeft) === plan.daysLeft &&
        state.sessions === plan.lessons &&
        state.cta === href
      ) {
        break;
      }
      await sleep(250);
      state = await plannerState(page, wedding);
    }
    if (firstNumber(state.lessons) !== plan.lessons) {
      say(
        `${step}: [data-planner-lessons] shows "${state.lessons}", expected ${plan.lessons}`,
      );
    }
    if (firstNumber(state.daysLeft) !== plan.daysLeft) {
      say(
        `${step}: [data-planner-days-left] shows "${state.daysLeft}", expected ${plan.daysLeft}`,
      );
    }
    if (state.sessions !== plan.lessons) {
      say(
        `${step}: ${state.sessions} [data-planner-session] items, expected ${plan.lessons}`,
      );
    }
    if (state.cta !== href) {
      say(
        `${step}: a[data-planner-cta] href differs from telegramLink(username, telegramMessage(input, plan)). Got: ${decodeURIComponent(state.cta ?? "null").slice(0, 220)}`,
      );
    }
    if (!state.pressed)
      say(`${step}: [data-date="${wedding}"] has no aria-pressed="true"`);
  };

  // Before any choice the planner shows the usual recommendation.
  const initial = await plannerState(page, null);
  const usual = recommendLessons(DEFAULT_SELECTION);
  if (initial.sessions === 0 && firstNumber(initial.lessons) !== usual) {
    say(
      `before a date is chosen [data-planner-lessons] shows "${initial.lessons}", expected ${usual}`,
    );
  }
  if (!initial.cta?.startsWith(`${site.telegramUrl}`)) {
    say(`a[data-planner-cta] must always lead to Telegram, got ${initial.cta}`);
  }
  const pastDisabled = await page.evaluate((date) => {
    const days = [
      ...document.querySelectorAll<HTMLButtonElement>(
        "[data-planner] [data-date]",
      ),
    ];
    return days
      .filter((day) => (day.dataset.date ?? "") < date)
      .every(
        (day) => day.disabled || day.getAttribute("aria-disabled") === "true",
      );
  }, today);
  if (!pastDisabled) say("past days in the calendar must be disabled");

  let selection: Selection = { ...DEFAULT_SELECTION, extras: [] };
  const far = addDays(today, 47);
  if (!(await pickDate(far))) return;
  await expectPlan("date in 47 days, default options", far, selection);

  if (await click('[data-planner-level="confident"]')) {
    selection = { ...selection, level: "confident" };
    await expectPlan("level → confident", far, selection);
  }
  if (await click('[data-planner-style="mix"]')) {
    selection = { ...selection, style: "mix" };
    await expectPlan("style → mix", far, selection);
  }
  if (await click('[data-planner-extra="lifts"]')) {
    selection = { ...selection, extras: ["lifts"] };
    await expectPlan("extra lifts on", far, selection);
  }
  if (await click('[data-planner-extra="parents"]')) {
    selection = { ...selection, extras: ["lifts", "parents"] };
    await expectPlan("extra parents on", far, selection);
  }
  if (await click('[data-planner-extra="lifts"]')) {
    selection = { ...selection, extras: ["parents"] };
    await expectPlan("extra lifts off again", far, selection);
  }

  // A date that is too close for the full programme: the plan must shrink.
  for (let hop = 0; hop < 30; hop += 1) {
    if (
      await page.$(
        `[data-planner] [data-date="${addDays(today, 5)}"]:not(:disabled)`,
      )
    )
      break;
    if (!(await click("[data-planner-prev]"))) return;
    await sleep(450);
  }
  const near = addDays(today, 5);
  if (await pickDate(near))
    await expectPlan("date in 5 days (short notice)", near, selection);
}

// --- run ---------------------------------------------------------------------

async function run(browser: Browser) {
  const report: Record<string, unknown> = {
    design: id,
    url: pageUrl,
    shots: outDir,
  };

  // Desktop
  const desktop = await browser.newPage();
  await desktop.setViewport({ width: 1440, height: 900 });
  const desktopProblems = watch(desktop);
  await open(desktop);
  const desktopShots = await scrollThrough(desktop, "desktop", {
    pause: 650,
    shots: withShots,
    maxShots: 36,
  });
  await sleep(900);
  const desktopAudit = await desktop.evaluate(auditInPage, BASE);
  judge("desktop", desktopAudit, desktopProblems);
  judgeContent(desktopAudit);
  await testPlanner(desktop, "desktop");
  if (withShots && (await desktop.$("[data-planner]"))) {
    await desktop.evaluate(() =>
      document
        .querySelector("[data-planner]")
        ?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    await sleep(900);
    await desktop.screenshot({
      path: join(outDir, "desktop-planner-filled.jpg"),
      type: "jpeg",
      quality: 80,
    });
  }
  for (const message of new Set(desktopProblems.console)) {
    if (!failures.some((line) => line.includes(message)))
      fail(`[desktop, planner] console error: ${message}`);
  }
  await desktop.close();

  // Mobile
  const mobile = await browser.newPage();
  await mobile.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await mobile.setUserAgent({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const mobileProblems = watch(mobile);
  await open(mobile);
  const mobileShots = await scrollThrough(mobile, "mobile", {
    pause: 650,
    shots: withShots,
    maxShots: 45,
  });
  await sleep(900);
  const mobileAudit = await mobile.evaluate(auditInPage, BASE);
  judge("mobile", mobileAudit, mobileProblems);
  const smallTargets = await mobile.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "[data-planner] button, a[data-planner-cta]",
      ),
    ]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.width < 32 || rect.height < 32);
      })
      .slice(0, 6)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()} "${(element.textContent ?? "").trim().slice(0, 20)}" ${Math.round(rect.width)}×${Math.round(rect.height)}`;
      }),
  );
  if (smallTargets.length > 0) {
    warn(
      `[mobile] planner tap targets smaller than 32px: ${smallTargets.join(" | ")}`,
    );
  }
  await testPlanner(mobile, "mobile");
  if (withShots && (await mobile.$("[data-planner]"))) {
    await mobile.evaluate(() =>
      document
        .querySelector("[data-planner]")
        ?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    await sleep(900);
    await mobile.screenshot({
      path: join(outDir, "mobile-planner-filled.jpg"),
      type: "jpeg",
      quality: 75,
    });
  }
  await mobile.close();

  // prefers-reduced-motion: everything must be readable without animation.
  const calm = await browser.newPage();
  await calm.setViewport({ width: 1440, height: 900 });
  await calm.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  const calmProblems = watch(calm);
  await open(calm);
  await scrollThrough(calm, "calm", { pause: 200, shots: false, maxShots: 0 });
  await sleep(600);
  const calmAudit = await calm.evaluate(auditInPage, BASE);
  judge("reduced motion", calmAudit, calmProblems);
  await calm.close();

  // Other widths: a small phone, a tablet and a wide monitor must not break.
  const widthShots: string[] = [];
  for (const [name, width, height] of [
    ["small-phone", 360, 740],
    ["tablet", 820, 1180],
    ["wide", 1920, 1080],
  ] as const) {
    const other = await browser.newPage();
    await other.setViewport({
      width,
      height,
      isMobile: width < 1000,
      hasTouch: width < 1000,
    });
    const otherProblems = watch(other);
    await open(other);
    if (withShots) {
      const top = join(outDir, `${name}-top.jpg`);
      await other.screenshot({ path: top, type: "jpeg", quality: 70 });
      widthShots.push(top);
    }
    await scrollThrough(other, name, { pause: 250, shots: false, maxShots: 0 });
    await sleep(700);
    judge(
      `${name} ${width}px`,
      await other.evaluate(auditInPage, BASE),
      otherProblems,
    );
    if (withShots && (await other.$("[data-planner]"))) {
      await other.evaluate(() =>
        document
          .querySelector("[data-planner]")
          ?.scrollIntoView({ block: "start", behavior: "instant" }),
      );
      await sleep(900);
      const shot = join(outDir, `${name}-planner.jpg`);
      await other.screenshot({ path: shot, type: "jpeg", quality: 70 });
      widthShots.push(shot);
    }
    await other.close();
  }

  // No JavaScript: content and links must still be there.
  const plain = await browser.newPage();
  await plain.setViewport({ width: 1440, height: 900 });
  await plain.setJavaScriptEnabled(false);
  await plain.goto(pageUrl, { waitUntil: "networkidle2", timeout: 45_000 });
  await sleep(500);
  if (withShots) {
    await plain.screenshot({
      path: join(outDir, "nojs-top.jpg"),
      type: "jpeg",
      quality: 72,
    });
  }
  const plainAudit = await plain.evaluate(auditInPage, BASE);
  if (plainAudit.hiddenText.length > 0) {
    fail(
      `[no JS] content is invisible without JavaScript (hide things for animation only under html.js): ${plainAudit.hiddenText.join(" | ")}`,
    );
  }
  if (plainAudit.telegram.length === 0)
    fail("[no JS] no Telegram link without JavaScript");
  await plain.close();

  const sheets = withShots
    ? [
        ...(await contactSheets(desktopShots, "desktop", 6, 2, 720)),
        ...(await contactSheets(mobileShots, "mobile", 10, 5, 390)),
      ]
    : [];

  const assets = join(siteDir, "_astro");
  const heavy = existsSync(assets)
    ? readdirSync(assets)
        .map((name) => ({
          name,
          kb: Math.round(statSync(join(assets, name)).size / 1024),
        }))
        .filter((file) => file.kb >= 250)
        .map((file) => `${file.name} ${file.kb}KB`)
    : [];

  report.pageHeight = {
    desktop: desktopAudit.pageHeight,
    mobile: mobileAudit.pageHeight,
  };
  report.h1 = desktopAudit.h1;
  report.title = desktopAudit.title;
  report.textLength = desktopAudit.textLength;
  report.heavyAssets = heavy;
  report.contactSheets = sheets;
  report.extraShots = withShots
    ? [
        "desktop-planner-filled.jpg",
        "mobile-planner-filled.jpg",
        "nojs-top.jpg",
      ]
        .map((name) => join(outDir, name))
        .concat(widthShots)
    : [];
  report.singleShots = `${desktopShots.length} desktop + ${mobileShots.length} mobile full-size frames in ${outDir} (desktop-NN.jpg, mobile-NN.jpg)`;
  report.failures = failures;
  report.warnings = warnings;
  return report;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--hide-scrollbars",
    "--mute-audio",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
try {
  const report = await run(browser);
  await Bun.write(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(
    failures.length === 0
      ? `\nOK: no hard failures, ${warnings.length} warning(s).`
      : `\nFAILED: ${failures.length} failure(s), ${warnings.length} warning(s).`,
  );
} finally {
  await browser.close();
  await server.stop(true);
}
process.exit(failures.length === 0 ? 0 : 1);
