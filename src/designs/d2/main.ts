import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import DrawSVGPlugin from "gsap/DrawSVGPlugin";
import Lenis from "lenis";

// Register plugins
gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

export function initPage(): void {
  const headlines = document.querySelectorAll<HTMLElement>("h1[data-headline]");

  // ===== Reduce motion support =====
  // The stylesheet hides the headline for its entrance, so show it and stop here.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    headlines.forEach((headline) => {
      headline.style.opacity = "1";
    });
    return;
  }

  // Store observers for cleanup
  const observers: MutationObserver[] = [];

  // Initialize smooth scroll
  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    gestureOrientation: "vertical",
  });
  lenis.on("scroll", ScrollTrigger.update);

  function raf(time: number) {
    lenis.raf(time * 1000);
  }

  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // ===== Ornament animation =====
  gsap.from("[data-ornament] svg path", {
    drawSVG: 0,
    duration: 1.2,
    ease: "power2.out",
    delay: 0.2,
    stagger: 0.1,
  });
  gsap.from("[data-ornament] svg", {
    rotate: -90,
    scale: 0.6,
    transformOrigin: "50% 50%",
    duration: 1.4,
    ease: "power3.out",
  });

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
    once: true,
  });

  // ===== Hero headline animation =====
  headlines.forEach((headline) => {
    const split = new SplitText(headline, { type: "words,chars" });
    gsap.set(headline, { opacity: 1 });
    gsap.from(split.chars, {
      opacity: 0,
      y: 24,
      rotate: 6,
      duration: 0.7,
      stagger: 0.035,
      ease: "power3.out",
      delay: 0.3,
    });
  });

  // ===== Hero copy and photo =====
  gsap.from("[data-hero-in]", {
    opacity: 0,
    y: 24,
    duration: 0.8,
    stagger: 0.12,
    ease: "power2.out",
    delay: 0.9,
  });

  // ===== Photo hover =====
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document
      .querySelectorAll<HTMLElement>("[data-photo-frame]")
      .forEach((frame) => {
        const photo = frame.querySelector("img");
        if (!photo) return;
        frame.addEventListener("mouseenter", () => {
          gsap.to(photo, { scale: 1.06, duration: 0.6, ease: "power2.out" });
        });
        frame.addEventListener("mouseleave", () => {
          gsap.to(photo, { scale: 1, duration: 0.6, ease: "power2.out" });
        });
      });
  }

  // ===== Scroll reveals =====
  // Everything below is visible without JS; the tweens only run once an
  // element scrolls in, so nothing stays hidden if a trigger never fires.
  ScrollTrigger.batch("[data-photo-frame]:not([data-hero-in] *)", {
    onEnter: (batch: Element[]) => {
      gsap.from(batch, {
        opacity: 0,
        y: 32,
        scale: 0.96,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
      });
    },
    start: "top 88%",
    once: true,
  });

  // ===== Section headlines scroll reveal =====
  ScrollTrigger.batch("h2:not([data-hero-in] *)", {
    onEnter: (batch: Element[]) => {
      batch.forEach((element) => {
        const split = new SplitText(element, { type: "words,chars" });
        gsap.from(split.chars, {
          opacity: 0,
          y: 18,
          duration: 0.5,
          stagger: 0.02,
          ease: "power2.out",
        });
      });
    },
    start: "top 85%",
    once: true,
  });

  // ===== Text paragraphs fade in =====
  ScrollTrigger.batch("section p", {
    onEnter: (batch: Element[]) => {
      gsap.from(batch, {
        opacity: 0,
        y: 14,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.06,
        clearProps: "opacity,transform",
      });
    },
    start: "top 92%",
    once: true,
  });

  // ===== Planner animations =====
  const planner = document.querySelector("[data-planner]");
  if (planner) {
    // Animate lessons count
    const lessonsElement = planner.querySelector("[data-planner-lessons]");
    if (lessonsElement) {
      const observer = new MutationObserver(() => {
        gsap.fromTo(
          lessonsElement,
          { scale: 0.8 },
          { scale: 1, duration: 0.3, ease: "back.out", overwrite: true },
        );
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
        gsap.fromTo(
          button,
          { scale: 1 },
          {
            scale: 0.95,
            duration: 0.15,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
            overwrite: true,
          },
        );
      });
    });
  }

  // ===== FAQ expand/collapse animation =====
  // Animation handled by inline script in FAQ.astro with smooth CSS transitions
  // Do not add GSAP listener here to avoid state sync conflicts

  // Automatically clean up observers on page unload
  window.addEventListener("pagehide", () => {
    observers.forEach((observer) => observer.disconnect());
  });
}
