import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import DrawSVGPlugin from "gsap/DrawSVGPlugin";
import SplitText from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText);

export function initAnimations(): void {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    // Minimal animations when reduced motion is preferred
    gsap.to("[data-animate-in]", {
      opacity: 1,
      duration: 0.1,
    });
    return;
  }

  // Hero headline split text animation
  const heroTitle = document.querySelector("h1");
  if (heroTitle && !heroTitle.classList.contains("animated")) {
    heroTitle.classList.add("animated");
    const split = new SplitText(heroTitle, { type: "words,chars" });
    gsap.from(split.chars, {
      duration: 0.6,
      opacity: 0,
      y: 10,
      stagger: 0.05,
      ease: "power2.out",
    });
  }

  // Animate timeline connector SVG
  const timelineConnector = document.querySelector("svg[data-timeline]");
  if (timelineConnector) {
    const lines = timelineConnector.querySelectorAll("[data-draw-line]");
    lines.forEach((line, index) => {
      gsap.from(line, {
        strokeDashoffset: gsap.getProperty(line, "strokeDasharray") as number,
        duration: 1,
        ease: "power2.inOut",
        delay: index * 0.2,
        scrollTrigger: {
          trigger: line,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      });
    });
  }

  // Animate step cards on scroll
  const stepCards = document.querySelectorAll("[data-step-card]");
  stepCards.forEach((card, index) => {
    const isLeft = index % 2 === 0;
    gsap.from(card, {
      opacity: 0,
      x: isLeft ? -40 : 40,
      duration: 0.6,
      ease: "back.out",
      scrollTrigger: {
        trigger: card,
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });
  });

  // Color shift animation based on scroll
  const colorShiftElements = document.querySelectorAll("[data-color-shift]");
  if (colorShiftElements.length > 0) {
    const colorTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "[data-hero]",
        start: "top top",
        end: "[data-footer]",
        scrub: 1.5,
      },
    });

    // Colors shift from cool blue -> warm orange -> gold
    const colors = [
      "#0f5a9f", // cool blue
      "#ff8c42", // warm orange
      "#ffd60a", // gold
    ];

    colorShiftElements.forEach((el) => {
      colorTimeline.to(
        el,
        {
          color: colors[1],
          duration: 1,
        },
        0,
      );
    });
  }

  // Section entrances with stagger
  // The stylesheet hides [data-animate-in] up front, so tween to an explicit
  // end state: a from-tween would animate from 0 to 0.
  gsap.set("[data-animate-in]", { y: 20 });
  ScrollTrigger.batch("[data-animate-in]", {
    start: "top 88%",
    once: true,
    onEnter: (elements) =>
      gsap.to(elements, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        overwrite: true,
      }),
  });

  // Planner entrance animation
  const plannerSection = document.querySelector("[data-planner-section]");
  if (plannerSection) {
    gsap.from(plannerSection, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: plannerSection,
        start: "top 70%",
        toggleActions: "play none none none",
      },
    });
  }

  // Animate planner sessions when added
  const observerConfig: MutationObserverInit = {
    childList: true,
    subtree: true,
  };

  const sessionList = document.querySelector("[data-planner-sessions]");
  if (sessionList) {
    const observer = new MutationObserver(() => {
      const sessions = sessionList.querySelectorAll("[data-planner-session]");
      gsap.from(sessions, {
        opacity: 0,
        x: -20,
        duration: 0.4,
        stagger: 0.1,
        ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      });
    });
    observer.observe(sessionList, observerConfig);
  }

  // Refresh ScrollTrigger after images load
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });

  // Clean up on unload
  window.addEventListener("beforeunload", () => {
    gsap.killTweensOf("*");
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  });
}
