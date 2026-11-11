import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import SplitText from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText);

export function initPage(): void {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // The stylesheet hides .section-reveal up front; without motion just show it.
  if (prefersReducedMotion) {
    gsap.set(".section-reveal, .ornament-scroll", { opacity: 1 });
    return;
  }

  // Ornament animation on page load
  gsap.from(".ornament-animated line", {
    drawSVG: "50% 50%",
    duration: 1,
    ease: "power2.inOut",
    delay: 0.2,
  });

  // Hero entrance animations
  const heroTitle = document.querySelector<HTMLElement>(".hero-title");
  if (heroTitle) {
    const split = new SplitText(heroTitle, { type: "words" });
    gsap.from(split.words, {
      opacity: 0,
      yPercent: 60,
      rotate: 4,
      duration: 0.9,
      stagger: 0.09,
      ease: "back.out(1.4)",
    });
  }

  gsap.from(".hero-kicker", { opacity: 0, y: -12, duration: 0.6 });
  gsap.from(".equalizer span", {
    scaleY: 0,
    transformOrigin: "bottom",
    duration: 0.5,
    stagger: 0.02,
    delay: 0.4,
    ease: "power2.out",
    clearProps: "transform",
  });
  gsap.from(".hero-subtitle", {
    opacity: 0,
    y: 20,
    duration: 0.8,
    stagger: 0.12,
    delay: 0.5,
    ease: "power2.out",
  });
  gsap.from(".hero-photo", {
    opacity: 0,
    x: 40,
    rotate: 3,
    duration: 1,
    delay: 0.3,
    ease: "power3.out",
  });
  gsap.from(".hero-photo-note", {
    opacity: 0,
    scale: 0.8,
    duration: 0.5,
    delay: 1.1,
    ease: "back.out(2)",
  });

  // Section reveal animations on scroll.
  // The sections start hidden in CSS, so tween to an explicit end state:
  // a from-tween would animate from 0 to 0.
  gsap.set(".section-reveal", { y: 30 });
  ScrollTrigger.batch(".section-reveal", {
    start: "top 88%",
    once: true,
    onEnter: (sections) =>
      gsap.to(sections, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        overwrite: true,
      }),
  });

  // Headings slide in word by word
  document
    .querySelectorAll<HTMLElement>(".section-reveal h2")
    .forEach((heading) => {
      const split = new SplitText(heading, { type: "words" });
      gsap.from(split.words, {
        scrollTrigger: { trigger: heading, start: "top 88%", once: true },
        opacity: 0,
        yPercent: 50,
        duration: 0.6,
        stagger: 0.06,
        ease: "power3.out",
      });
    });

  // Ornament divider scroll-triggered reveals
  document
    .querySelectorAll<SVGLineElement>(".ornament-scroll line")
    .forEach((line) => {
      gsap.from(line, {
        scrollTrigger: { trigger: line, start: "top 95%", once: true },
        drawSVG: "50% 50%",
        duration: 0.8,
        ease: "power2.out",
      });
    });

  // Photo tint shift on scroll
  const photoTinted = document.querySelector<HTMLElement>(
    ".hero-photo .photo-tinted",
  );
  if (photoTinted) {
    const tintObj = { value: 0.1 };
    gsap.to(tintObj, {
      scrollTrigger: {
        trigger: ".hero-photo",
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
      },
      value: 0.35,
      onUpdate() {
        photoTinted.style.setProperty("--tint-opacity", String(tintObj.value));
      },
    });
  }

  // Quote callout animations with SplitText
  document.querySelectorAll(".quote-callout p").forEach((quote) => {
    const split = new SplitText(quote, { type: "words,chars" });
    gsap.from(split.chars, {
      scrollTrigger: { trigger: quote, start: "top 85%", once: true },
      opacity: 0,
      duration: 0.05,
      stagger: 0.02,
      ease: "none",
    });
  });

  // Photo entrance animations (except hero photo which is already animated)
  document
    .querySelectorAll(".photo-tinted:not(.hero-photo .photo-tinted)")
    .forEach((photo) => {
      gsap.from(photo, {
        scrollTrigger: { trigger: photo, start: "top 90%", once: true },
        opacity: 0,
        scale: 0.94,
        y: 24,
        duration: 0.8,
        ease: "power3.out",
      });
    });

  // Steps appear one after another
  document.querySelectorAll("[data-steps]").forEach((list) => {
    gsap.from(list.children, {
      scrollTrigger: { trigger: list, start: "top 80%", once: true },
      opacity: 0,
      x: -24,
      duration: 0.6,
      stagger: 0.15,
      ease: "power2.out",
    });
  });

  // Planner session list animation
  const plannerSessions = document.querySelector("[data-planner-sessions]");
  if (plannerSessions) {
    // Create observer to animate when sessions are added
    const observeSessionsList = () => {
      const sessions = plannerSessions.querySelectorAll("li");
      if (sessions.length > 0) {
        gsap.fromTo(
          sessions,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.06,
            ease: "power2.out",
            overwrite: true,
          },
        );
      }
    };

    // Observe mutations on the sessions list
    const observer = new MutationObserver(observeSessionsList);
    observer.observe(plannerSessions, { childList: true, subtree: false });
  }

  // Refresh ScrollTrigger after content loads
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
}
