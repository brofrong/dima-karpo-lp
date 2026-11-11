import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import DrawSVGPlugin from "gsap/DrawSVGPlugin";
import ScrambleTextPlugin from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(
  ScrollTrigger,
  SplitText,
  DrawSVGPlugin,
  ScrambleTextPlugin,
);

export function animateHeroHeading() {
  const h1 = document.querySelector("h1");
  if (!h1) return;

  const split = new SplitText(h1, { type: "words,chars" });
  gsap.to(split.chars, {
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.03,
    ease: "elastic.out(1, 0.5)",
    delay: 0.1,
    startAt: { opacity: 0, y: 40 },
  });
}

export function animateSectionHeadings() {
  const headings = document.querySelectorAll("h2");
  headings.forEach((heading) => {
    const split = new SplitText(heading, { type: "words,chars" });
    gsap.to(split.chars, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.02,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: heading,
        start: "top 80%",
        toggleActions: "play none none none",
      },
      startAt: { opacity: 0, y: 40 },
    });
  });
}

export function animateSectionEntrance() {
  const sections = document.querySelectorAll("[data-section]");
  sections.forEach((section) => {
    gsap.to(section, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      startAt: { opacity: 0, y: 40 },
    });
  });
}

export function animateCardHovers() {
  const cards = document.querySelectorAll("[data-card]");
  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      gsap.to(card, {
        scale: 1.03,
        duration: 0.2,
        ease: "back.out(1.7)",
        boxShadow:
          "0 0 30px rgba(255, 0, 110, 0.6), 0 0 60px rgba(255, 0, 110, 0.3)",
      });
    });

    card.addEventListener("mouseleave", () => {
      gsap.to(card, {
        scale: 1,
        duration: 0.2,
        ease: "power2.inOut",
        boxShadow: "0 0 15px rgba(255, 0, 110, 0.3)",
      });
    });
  });
}

export function animateStyleCards() {
  const cards = document.querySelectorAll("[data-style-card]");
  cards.forEach((card, index) => {
    gsap.to(card, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out",
      scrollTrigger: {
        trigger: card,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      startAt: { opacity: 0, y: 30 },
      delay: index * 0.1,
    });
  });
}

export function animateLessonCounter() {
  const counters = document.querySelectorAll("[data-planner-lessons]");
  counters.forEach((counter) => {
    const observer = new MutationObserver(() => {
      // Simple scale animation for counter changes
      gsap.to(counter, {
        scale: 1.2,
        duration: 0.2,
        ease: "back.out",
        onComplete: () => {
          gsap.to(counter, {
            scale: 1,
            duration: 0.15,
            ease: "power2.out",
          });
        },
      });
    });

    observer.observe(counter, {
      characterData: true,
      subtree: true,
      childList: true,
    });
  });
}

export function animateNeonButtons() {
  const buttons = document.querySelectorAll(".btn-neon, .btn-neon-secondary");
  buttons.forEach((button) => {
    button.addEventListener("mouseenter", () => {
      gsap.to(button, {
        duration: 0.3,
        ease: "power2.out",
      });
    });

    button.addEventListener("mouseleave", () => {
      gsap.to(button, {
        duration: 0.3,
        ease: "power2.out",
      });
    });

    button.addEventListener("click", () => {
      gsap.to(button, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut",
      });
    });
  });
}

export function animatePlannerResults() {
  const resultsContainer = document.querySelector("[data-planner-results]");
  if (!resultsContainer) return;

  const observer = new MutationObserver(() => {
    const sessions = document.querySelectorAll("[data-planner-session]");
    gsap.from(sessions, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.08,
      ease: "back.out(1.7)",
    });
  });

  observer.observe(resultsContainer, {
    childList: true,
    subtree: true,
  });
}

export function animateTimelineSteps() {
  const steps = document.querySelectorAll("[data-timeline-step]");
  steps.forEach((step, index) => {
    gsap.to(step, {
      opacity: 1,
      x: 0,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: step,
        start: "top 75%",
        toggleActions: "play none none none",
      },
      startAt: { opacity: 0, x: index % 2 === 0 ? -50 : 50 },
    });
  });
}

export function animateFAQAccordions() {
  const accordions = document.querySelectorAll("[data-faq-item]");
  accordions.forEach((accordion) => {
    const header = accordion.querySelector("[data-faq-header]");
    const content = accordion.querySelector("[data-faq-content]");

    if (header && content) {
      header.addEventListener("click", () => {
        const isOpen = accordion.classList.contains("open");
        const targetHeight = isOpen ? 0 : (content as HTMLElement).scrollHeight;

        gsap.to(content, {
          height: targetHeight,
          opacity: isOpen ? 0 : 1,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            accordion.classList.toggle("open");
          },
        });

        gsap.to(header.querySelector("[data-faq-icon]"), {
          rotation: isOpen ? 0 : 180,
          duration: 0.3,
          ease: "power2.inOut",
        });
      });
    }
  });
}

export function animateScrollReveal() {
  const elements = document.querySelectorAll("[data-reveal]");
  elements.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "cubic-bezier(0.65, 0.05, 0.36, 1)",
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none none",
      },
      startAt: { opacity: 0, y: 40 },
    });
  });
}

export function animateTelegramFAB() {
  const fab = document.querySelector("[data-telegram-fab]");
  if (!fab) return;

  // Bounce entrance animation
  gsap.from(fab, {
    opacity: 0,
    scale: 0,
    duration: 0.6,
    ease: "back.out(1.7)",
    delay: 0.5,
  });

  // Pulse animation on hover
  const link = fab.querySelector("a");
  if (link) {
    link.addEventListener("mouseenter", () => {
      gsap.to(fab, {
        boxShadow: "0 0 30px rgba(255, 0, 110, 0.8)",
        duration: 0.3,
      });
    });

    link.addEventListener("mouseleave", () => {
      gsap.to(fab, {
        boxShadow: "0 0 15px rgba(255, 0, 110, 0.3)",
        duration: 0.3,
      });
    });
  }
}

export function initAllAnimations() {
  // Check if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (!prefersReducedMotion) {
    animateHeroHeading();
    animateSectionHeadings();
    animateSectionEntrance();
    animateCardHovers();
    animateStyleCards();
    animateNeonButtons();
    animatePlannerResults();
    animateTimelineSteps();
    animateFAQAccordions();
    animateScrollReveal();
    animateTelegramFAB();

    // Refresh scroll triggers when images load
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      img.addEventListener("load", () => {
        ScrollTrigger.refresh();
      });
    });
  }

  animateLessonCounter();
}

export function createNeonLineAnimation(svg: SVGElement) {
  const paths = svg.querySelectorAll("path");
  paths.forEach((path) => {
    const length = path.getTotalLength?.() ?? 0;
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);

    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 0.8,
      ease: "cubic-bezier(0.65, 0.05, 0.36, 1)",
      scrollTrigger: {
        trigger: svg,
        start: "top 70%",
        toggleActions: "play none none none",
      },
    });
  });
}
