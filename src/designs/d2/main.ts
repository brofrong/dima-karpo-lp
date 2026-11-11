import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import DrawSVGPlugin from "gsap/DrawSVGPlugin";
import Lenis from "lenis";

// Register plugins
gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

export function initPage(): void {
  // Store observers for cleanup
  const observers: MutationObserver[] = [];

  // Initialize smooth scroll
  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    gestureOrientation: "vertical",
  });

  function raf(time: number) {
    lenis.raf(time);
  }

  gsap.ticker.add(raf);

  // ===== Ornament animation =====
  const ornament = document.querySelector("[data-ornament] svg");
  if (ornament) {
    const paths = ornament.querySelectorAll("path");
    paths.forEach((path) => {
      gsap.from(path, {
        drawSVG: 0,
        duration: 1.2,
        ease: "power2.out",
        delay: 0.2,
        stagger: 0.1,
      });
    });
  }

  // ===== Section dividers animation =====
  ScrollTrigger.batch("[data-divider] svg path", {
    onEnter: (batch: Element[]) => {
      gsap.from(batch, {
        drawSVG: 0,
        duration: 0.8,
        ease: "power2.inOut",
        stagger: 0.05,
      });
    },
    start: "top 85%",
  });

  // ===== Hero headline animation =====
  const headlines = document.querySelectorAll("h1[data-headline]");
  headlines.forEach((headline) => {
    const split = new SplitText(headline, { type: "words,chars" });
    gsap.from(split.chars, {
      opacity: 0,
      y: 10,
      duration: 0.6,
      stagger: 0.08,
      ease: "power2.out",
    });
  });

  // ===== Photo duotone hover effect =====
  const photos = document.querySelectorAll("[data-photo-frame] img");
  photos.forEach((photo) => {
    const container = photo.closest("[data-photo-frame]");
    if (!container) return;

    // Only apply on devices with hover capability
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      container.addEventListener("mouseenter", () => {
        gsap.to(photo, {
          filter: "saturate(0.95)",
          duration: 0.4,
          ease: "power2.inOut",
        });
      });

      container.addEventListener("mouseleave", () => {
        gsap.to(photo, {
          filter: "saturate(0.75)",
          duration: 0.4,
          ease: "power2.inOut",
        });
      });
    }
  });

  // ===== Scroll reveals =====
  const photoConfig: Parameters<typeof ScrollTrigger.batch>[1] = {
    onEnter: (batch: Element[]) => {
      gsap.to(batch, {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        stagger: { each: 0.1 },
      });
    },
    start: "top 85%",
  };
  ScrollTrigger.batch("[data-photo-frame]", photoConfig);

  // ===== Section headlines scroll reveal =====
  const h2Config: Parameters<typeof ScrollTrigger.batch>[1] = {
    onEnter: (batch: Element[]) => {
      batch.forEach((element) => {
        const split = new SplitText(element, { type: "words,chars" });
        gsap.from(split.chars, {
          opacity: 0,
          y: 15,
          duration: 0.5,
          stagger: 0.04,
          ease: "power2.out",
        });
      });
    },
    start: "top 80%",
  };
  ScrollTrigger.batch("h2", h2Config);

  // ===== Text paragraphs fade in =====
  const pConfig: Parameters<typeof ScrollTrigger.batch>[1] = {
    onEnter: (batch: Element[]) => {
      gsap.to(batch, {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
      });
    },
    start: "top 90%",
  };
  ScrollTrigger.batch("p", pConfig);

  // ===== Planner animations =====
  const planner = document.querySelector("[data-planner]");
  if (planner) {
    // Animate day buttons when they appear
    ScrollTrigger.create({
      trigger: planner,
      onEnter: () => {
        const buttons = planner.querySelectorAll("button[data-date]");
        gsap.to(buttons, {
          opacity: 1,
          duration: 0.4,
          stagger: { each: 0.02 },
          ease: "power2.out",
        });
      },
      start: "top 80%",
    });

    // Animate lessons count
    const lessonsElement = planner.querySelector("[data-planner-lessons]");
    if (lessonsElement) {
      const observer = new MutationObserver(() => {
        gsap.from(lessonsElement, {
          scale: 0.8,
          duration: 0.3,
          ease: "back.out",
        });
      });
      observer.observe(lessonsElement as Node, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      observers.push(observer);
    }

    // Add button press feedback
    const styleButtons = planner.querySelectorAll("[data-planner-style]");
    styleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        gsap.to(button, {
          scale: 0.95,
          duration: 0.15,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
        });
      });
    });
  }

  // ===== FAQ expand/collapse animation =====
  // Animation handled by inline script in FAQ.astro with smooth CSS transitions
  // Do not add GSAP listener here to avoid state sync conflicts

  // ===== Reduce motion support =====
  const prefersReducedMotion = matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    // Clear all animations
    gsap.globalTimeline.clear();
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

    // Simple opacity reveals instead
    document
      .querySelectorAll(
        "[data-photo-frame], h1[data-headline], h2, p, [data-ornament] svg, [data-divider] svg",
      )
      .forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
      });
  }

  // Provide cleanup function for observers
  (
    globalThis as unknown as { cleanupPageObservers: () => void }
  ).cleanupPageObservers = () => {
    observers.forEach((observer) => observer.disconnect());
  };

  // Automatically clean up observers on page unload
  window.addEventListener("beforeunload", () => {
    observers.forEach((observer) => observer.disconnect());
  });
}
