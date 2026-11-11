import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { initFlowCanvas } from "./flow-canvas";
import { mountPlanner } from "./planner-client";

gsap.registerPlugin(ScrollTrigger);

/** Where a `data-reveal` element starts from, by attribute value. */
const REVEAL_FROM: Record<string, gsap.TweenVars> = {
  left: { x: -44 },
  right: { x: 44 },
  zoom: { scale: 0.6 },
};

export function initPage(): void {
  for (const root of document.querySelectorAll<HTMLElement>("[data-planner]")) {
    mountPlanner(root);
  }

  const canvas = document.querySelector<HTMLCanvasElement>(
    "canvas[data-flow-canvas]",
  );
  if (canvas) initFlowCanvas(canvas);

  // The script is running: the stylesheet's "show it anyway" timer can stand down.
  document.documentElement.classList.add("fx-ready");

  // Without motion the stylesheet shows everything as is.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const lenis = new Lenis({ anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  initHero();
  initReveals();
  initParallax();
  initMarquee();
  initThread();
  initMagnets();

  gsap.to("[data-progress]", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

/** Headline lines rise out of their masks, the rest follows. */
function initHero(): void {
  gsap.set("[data-hero-title]", { opacity: 1 });
  gsap.set("[data-hero-item]", { y: 26 });
  gsap.set("[data-hero-pop]", { scale: 0.6, rotate: -10 });

  gsap
    .timeline({ defaults: { ease: "expo.out" } })
    .from(
      "[data-hero-title] .fx-line > span",
      { yPercent: 118, duration: 1.1, stagger: 0.12 },
      0.1,
    )
    .to(
      "[data-hero-item]",
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 },
      0.35,
    )
    .to(
      "[data-hero-pop]",
      {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "back.out(1.5)",
      },
      0.25,
    );

  gsap.to("[data-hero-visual]", {
    yPercent: 14,
    ease: "none",
    scrollTrigger: {
      trigger: "[data-hero]",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

/**
 * Entrances. The elements start hidden in CSS, so tween to an explicit end
 * state: a from-tween would animate from 0 to 0.
 */
function initReveals(): void {
  const elements = gsap.utils.toArray<HTMLElement>("[data-reveal]");
  for (const element of elements) {
    gsap.set(element, REVEAL_FROM[element.dataset.reveal ?? ""] ?? { y: 36 });
  }

  ScrollTrigger.batch(elements, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.9,
        stagger: 0.08,
        ease: "expo.out",
        overwrite: true,
      }),
  });
}

function initParallax(): void {
  for (const element of gsap.utils.toArray<HTMLElement>("[data-parallax]")) {
    const shift = Number(element.dataset.parallax);
    gsap.fromTo(
      element,
      { yPercent: shift },
      {
        yPercent: -shift,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  }
}

/** The ribbons lean into the scroll and settle when it stops. */
function initMarquee(): void {
  const lean = gsap.quickTo("[data-marquee-skew]", "skewX", {
    duration: 0.4,
    ease: "power3.out",
  });
  const settle = gsap.delayedCall(0.12, () => lean(0)).pause();

  ScrollTrigger.create({
    onUpdate: (self) => {
      lean(gsap.utils.clamp(-16, 16, self.getVelocity() / -220));
      settle.restart(true);
    },
  });
}

/** The thread between the steps is drawn as the page scrolls. */
function initThread(): void {
  const steps = document.querySelector<HTMLElement>("[data-steps]");
  if (!steps) return;

  gsap.fromTo(
    "[data-thread-fill]",
    { clipPath: "inset(0% 0% 100% 0%)" },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      ease: "none",
      scrollTrigger: {
        trigger: steps,
        start: "top 72%",
        end: "bottom 62%",
        scrub: 0.5,
      },
    },
  );
}

/** Pill buttons pull towards the cursor. */
function initMagnets(): void {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  for (const button of document.querySelectorAll<HTMLElement>(
    "[data-magnetic]",
  )) {
    const moveX = gsap.quickTo(button, "x", {
      duration: 0.4,
      ease: "power3.out",
    });
    const moveY = gsap.quickTo(button, "y", {
      duration: 0.4,
      ease: "power3.out",
    });

    button.addEventListener("pointermove", (event) => {
      const box = button.getBoundingClientRect();
      moveX((event.clientX - box.left - box.width / 2) * 0.25);
      moveY((event.clientY - box.top - box.height / 2) * 0.4);
    });
    button.addEventListener("pointerleave", () => {
      moveX(0);
      moveY(0);
    });
  }
}
