import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import DrawSVGPlugin from "gsap/DrawSVGPlugin";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

export function initPage(): void {
  // Initialize Lenis smooth scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  function raf(time: number) {
    lenis.raf(time);
    ScrollTrigger.update();
  }

  gsap.ticker.add(raf);

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // Marquee scroll-driven animation
  const marqueeElement =
    document.querySelector<HTMLElement>("[data-d3-marquee]");
  if (marqueeElement) {
    if (!prefersReducedMotion) {
      // Get the width of half the marquee (since it has duplicated content)
      const marqueeWidth = marqueeElement.scrollWidth / 2;

      // Create continuous scrolling animation with moderate speed
      const marqueeTimeline = gsap.timeline({ repeat: -1 });
      marqueeTimeline.fromTo(
        marqueeElement,
        { x: 0 },
        {
          x: -marqueeWidth,
          duration: 60, // base duration for continuous loop
          ease: "none",
        },
      );

      // Adjust speed based on scroll velocity (optional scroll-sync)
      ScrollTrigger.create({
        onUpdate: () => {
          // Adjust timeline playback speed based on scroll velocity
          const scrollVelocity = lenis.velocity;
          const timeScaleAdjustment = Math.max(
            0.5,
            Math.min(2, 1 + scrollVelocity * 0.05),
          );
          marqueeTimeline.timeScale(timeScaleAdjustment);
        },
      });
    }
  }

  if (!prefersReducedMotion) {
    // Hero parallax effect - SVG and photo respond to scroll
    const heroSvg = document.querySelector<SVGElement>(".d3-hero__svg");
    const heroPhoto = document.querySelector<HTMLElement>(".d3-hero__photo");

    if (heroSvg || heroPhoto) {
      gsap.to([heroSvg, heroPhoto], {
        scrollTrigger: {
          trigger: ".d3-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          markers: false,
        },
        y: 100,
        duration: 1,
      });
    }

    // Enhanced timeline animations - markers pop in and connectors fade
    const timelineMarkers = document.querySelectorAll<HTMLElement>(
      ".d3-timeline-marker",
    );
    timelineMarkers.forEach((marker, index) => {
      gsap.from(marker, {
        scrollTrigger: {
          trigger: marker,
          start: "top 80%",
          end: "top 60%",
          markers: false,
        },
        scale: 0,
        opacity: 0,
        duration: 0.4,
        delay: index * 0.1,
        ease: "back.out",
      });
    });

    // Animate timeline connector paths
    const connectorPaths = document.querySelectorAll<SVGPathElement>(
      ".d3-timeline-connector path",
    );
    connectorPaths.forEach((path, index) => {
      gsap.from(path, {
        scrollTrigger: {
          trigger: path,
          start: "top 80%",
          end: "top 50%",
          scrub: 0.5,
          markers: false,
        },
        opacity: 0,
        duration: 0.6,
        delay: index * 0.1,
      });
    });
  }

  // Split text animation for headings
  const headings = document.querySelectorAll(
    ".d3-hero__title, .d3-whois h2, .d3-whatdance h2, .d3-howitgoes h2, .d3-planner h2, .d3-faq h2, .d3-cta h2",
  );

  headings.forEach((heading) => {
    if (!(heading instanceof HTMLElement)) return;

    const split = new SplitText(heading, { type: "words,chars" });

    gsap.from(split.chars, {
      scrollTrigger: {
        trigger: heading,
        start: "top 80%",
        end: "top 50%",
        scrub: 0.5,
        markers: false,
      },
      opacity: 0,
      y: 20,
      stagger: 0.1,
      duration: 0.6,
    });
  });

  // Scroll-triggered animations for sections
  const sections = document.querySelectorAll(
    ".d3-whois, .d3-whatdance, .d3-howitgoes, .d3-planner, .d3-faq, .d3-cta",
  );

  sections.forEach((section) => {
    if (!(section instanceof HTMLElement)) return;

    gsap.from(section, {
      scrollTrigger: {
        trigger: section,
        start: "top 100%",
        end: "top 30%",
        scrub: 1,
        markers: false,
      },
      opacity: 0.8,
      y: 40,
      duration: 1,
    });
  });

  // Hover animation for dance cards
  const danceCards = document.querySelectorAll(".d3-dance-card");
  danceCards.forEach((card) => {
    if (!(card instanceof HTMLElement)) return;

    card.addEventListener("mouseenter", () => {
      gsap.to(card, {
        y: -8,
        duration: 0.3,
        overwrite: "auto",
      });
    });

    card.addEventListener("mouseleave", () => {
      gsap.to(card, {
        y: 0,
        duration: 0.3,
        overwrite: "auto",
      });
    });
  });

  // Hover animation for FAQ items
  const faqItems = document.querySelectorAll(".d3-faq-item");
  faqItems.forEach((item) => {
    if (!(item instanceof HTMLElement)) return;

    item.addEventListener("mouseenter", () => {
      gsap.to(item, {
        x: 4,
        duration: 0.3,
      });
    });

    item.addEventListener("mouseleave", () => {
      gsap.to(item, {
        x: 0,
        duration: 0.3,
      });
    });
  });

  // Button hover effects
  const buttons = document.querySelectorAll(".d3-btn");
  buttons.forEach((button) => {
    if (!(button instanceof HTMLElement)) return;

    button.addEventListener("mouseenter", () => {
      gsap.to(button, {
        scale: 1.05,
        duration: 0.3,
        overwrite: "auto",
      });
    });

    button.addEventListener("mouseleave", () => {
      gsap.to(button, {
        scale: 1,
        duration: 0.3,
        overwrite: "auto",
      });
    });
  });

  // Interactive SVG circles
  const interactiveCircles = document.querySelectorAll<SVGCircleElement>(
    ".d3-interactive-circle",
  );
  interactiveCircles.forEach((circle) => {
    const originalR = parseFloat(circle.getAttribute("r") || "8");
    const originalFill = circle.getAttribute("fill") || "#ff9500";

    // Define accent colors for different circles
    const accentColorMap: Record<string, string> = {
      "#ff6b6b": "#0064ff", // red -> blue
      "#ff9500": "#ff6b6b", // orange -> red
      "#0064ff": "#ff9500", // blue -> orange
      "#f09433": "#2d3436", // orange-warm -> dark
    };

    const newColor = accentColorMap[originalFill] || "#ff9500";

    circle.addEventListener("mouseenter", () => {
      gsap.to(circle, {
        attr: { r: originalR * 1.4, fill: newColor },
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
    });

    circle.addEventListener("mouseleave", () => {
      gsap.to(circle, {
        attr: { r: originalR, fill: originalFill },
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  });

  // FAQ accordion animation
  const faqDetails = document.querySelectorAll(".d3-faq-item");
  faqDetails.forEach((detail) => {
    if (!(detail instanceof HTMLElement)) return;

    const summary = detail.querySelector(".d3-faq-summary");
    if (!summary) return;

    summary.addEventListener("click", (e) => {
      e.preventDefault();

      const isOpen = detail.hasAttribute("open");

      if (!isOpen) {
        detail.setAttribute("open", "");
      } else {
        detail.removeAttribute("open");
      }
    });
  });
}
