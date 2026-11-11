import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

export function initPage(): void {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) return;

  // Ornament animation on page load
  const ornaments =
    document.querySelectorAll<SVGSVGElement>(".ornament-animated");
  ornaments.forEach((ornament) => {
    gsap.from(ornament, {
      drawSVG: "0%",
      duration: 1,
      ease: "power2.inOut",
      delay: 0.2,
    });
  });

  // Hero entrance animations
  const heroTitle = document.querySelector(".hero-title");
  const heroSubtitle = document.querySelector(".hero-subtitle");
  const heroPhoto = document.querySelector(".hero-photo");

  if (heroTitle) {
    gsap.from(heroTitle, {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: "cubic-bezier(0.34, 1.42, 0.64, 1)",
    });
  }

  if (heroSubtitle) {
    gsap.from(heroSubtitle, {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: "cubic-bezier(0.34, 1.42, 0.64, 1)",
      delay: 0.2,
    });
  }

  if (heroPhoto) {
    gsap.from(heroPhoto, {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: "cubic-bezier(0.34, 1.42, 0.64, 1)",
      delay: 0.4,
    });
  }

  // Photo tint shift on scroll
  const photoTinted = document.querySelector(
    ".hero-photo .photo-tinted",
  ) as HTMLElement;
  if (photoTinted) {
    const tintObj = { value: 0.1 };
    gsap.to(tintObj, {
      scrollTrigger: {
        trigger: ".hero-photo",
        start: "top center",
        end: "center center",
        scrub: 0.5,
      },
      value: 0.3,
      duration: 0.6,
      onUpdate() {
        photoTinted.style.setProperty("--tint-opacity", String(tintObj.value));
      },
    });
  }

  // Button hover effects
  const buttons = document.querySelectorAll(".btn-cta, .btn-option");
  buttons.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      gsap.to(btn, {
        scale: 1.02,
        duration: 0.2,
        ease: "power2.out",
      });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, {
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
      });
    });
  });

  // Refresh ScrollTrigger after content loads
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
}
