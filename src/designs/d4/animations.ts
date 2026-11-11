import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Where a `data-animate-in` element starts from, by attribute value. */
const ENTRANCES: Record<string, gsap.TweenVars> = {
  left: { x: -48 },
  right: { x: 48 },
};

export function initAnimations(): void {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // The stylesheet hides [data-animate-in] up front; without motion just show it.
  if (prefersReducedMotion) {
    gsap.set("[data-animate-in]", { opacity: 1 });
    return;
  }

  // Hero headline: words drop in one by one
  const heroTitle = document.querySelector<HTMLElement>("[data-hero-title]");
  if (heroTitle) {
    const split = new SplitText(heroTitle, { type: "words" });
    gsap.from(split.words, {
      opacity: 0,
      yPercent: 80,
      rotate: 6,
      duration: 0.7,
      stagger: 0.09,
      ease: "back.out(1.8)",
    });
  }

  // The dance-floor grid drifts as the hero scrolls away
  gsap.to("[data-hero-floor]", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: "[data-hero]",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  // Entrances. The elements start hidden in CSS, so tween to an explicit
  // end state: a from-tween would animate from 0 to 0.
  document
    .querySelectorAll<HTMLElement>("[data-animate-in]")
    .forEach((element) => {
      gsap.set(
        element,
        ENTRANCES[element.dataset.animateIn ?? ""] ?? { y: 24 },
      );
    });
  ScrollTrigger.batch("[data-animate-in]", {
    start: "top 88%",
    once: true,
    onEnter: (elements) =>
      gsap.to(elements, {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        overwrite: true,
      }),
  });

  // Section headings slide up word by word
  document.querySelectorAll<HTMLElement>("h2").forEach((heading) => {
    const split = new SplitText(heading, { type: "words" });
    gsap.from(split.words, {
      scrollTrigger: { trigger: heading, start: "top 88%", once: true },
      opacity: 0,
      yPercent: 60,
      duration: 0.5,
      stagger: 0.07,
      ease: "back.out(1.6)",
    });
  });

  // Timeline: the rail fills with the scroll, badges pop, cards slide in
  const steps = document.querySelector<HTMLElement>("[data-steps]");
  if (steps) {
    gsap.fromTo(
      "[data-rail-fill]",
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: steps,
          start: "top 70%",
          end: "bottom 65%",
          scrub: 0.4,
        },
      },
    );

    steps.querySelectorAll<HTMLElement>("[data-step]").forEach((step) => {
      const trigger = { trigger: step, start: "top 82%", once: true };
      gsap.from(step.querySelector("[data-step-badge]"), {
        scrollTrigger: trigger,
        scale: 0,
        rotate: -90,
        duration: 0.5,
        ease: "back.out(2.5)",
      });
      gsap.from(step.querySelector("[data-step-card]"), {
        scrollTrigger: trigger,
        opacity: 0,
        x: 40,
        duration: 0.55,
        delay: 0.1,
        ease: "power3.out",
      });
    });
  }

  // Planner: the lesson count bumps when it changes
  const lessons = document.querySelector<HTMLElement>("[data-planner-lessons]");
  if (lessons) {
    new MutationObserver(() => {
      gsap.fromTo(
        lessons,
        { scale: 1.35 },
        { scale: 1, duration: 0.45, ease: "back.out(3)", overwrite: true },
      );
    }).observe(lessons, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  // Planner: sessions slide in when the programme is rebuilt
  const sessionList = document.querySelector("[data-planner-sessions]");
  if (sessionList) {
    new MutationObserver(() => {
      const sessions = sessionList.querySelectorAll("[data-planner-session]");
      if (sessions.length === 0) return;
      gsap.fromTo(
        sessions,
        { opacity: 0, x: -16 },
        {
          opacity: 1,
          x: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: "power2.out",
          overwrite: true,
        },
      );
    }).observe(sessionList, { childList: true });
  }

  // Refresh ScrollTrigger after images load
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
}
