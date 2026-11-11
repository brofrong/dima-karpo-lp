import { initAllAnimations } from "./animations";
import { initWebGLCanvas } from "./webgl-canvas";
import { mountPlanner } from "./planner-client";

let scrollProgress = 0;
let webglInitialized = false;

export function initPage(): void {
  // Initialize smooth scroll for the hero section
  const heroSection = document.querySelector(
    "[data-hero-canvas]",
  ) as HTMLCanvasElement;
  if (heroSection) {
    window.addEventListener(
      "scroll",
      () => {
        const rect = heroSection.getBoundingClientRect();
        const progress =
          1 - Math.max(0, Math.min(1, rect.top / window.innerHeight));
        scrollProgress = progress;
      },
      { passive: true },
    );
  }

  // Initialize WebGL canvas with deferred loading
  if (heroSection) {
    // Use requestIdleCallback to defer three.js loading until after initial render
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => loadWebGL(heroSection), { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => loadWebGL(heroSection), 100);
    }
  }

  // Mount planner
  const plannerRoot = document.querySelector("[data-planner]");
  if (plannerRoot) {
    mountPlanner(plannerRoot as HTMLElement);
  }

  // Initialize all animations
  initAllAnimations();
}

function loadWebGL(canvas: HTMLCanvasElement): void {
  if (webglInitialized) return;
  webglInitialized = true;

  import("three").then((THREE) => {
    initWebGLCanvas(canvas, () => scrollProgress, THREE).catch((error) => {
      console.error("Failed to initialize WebGL canvas:", error);
    });
  });
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}
