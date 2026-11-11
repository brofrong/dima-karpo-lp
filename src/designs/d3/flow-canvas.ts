/**
 * Canvas 2D backdrop for the hero: three silk ribbons, each a bundle of thin
 * sine lines that twist as they drift. The pointer pushes the lines apart.
 */

interface Ribbon {
  /** Vertical position at the left edge, as a share of the height. */
  base: number;
  /** How far the ribbon climbs towards the right edge. */
  rise: number;
  amplitude: number;
  frequency: number;
  speed: number;
  /** Thickness of the bundle, as a share of the height. */
  spread: number;
  phase: number;
}

const RIBBONS: Ribbon[] = [
  {
    base: 0.92,
    rise: 0.42,
    amplitude: 0.1,
    frequency: 1.1,
    speed: 0.26,
    spread: 0.24,
    phase: 0,
  },
  {
    base: 1.04,
    rise: 0.3,
    amplitude: 0.08,
    frequency: 1.7,
    speed: -0.19,
    spread: 0.16,
    phase: 2.1,
  },
  {
    base: 0.7,
    rise: 0.5,
    amplitude: 0.07,
    frequency: 0.8,
    speed: 0.14,
    spread: 0.13,
    phase: 4.2,
  },
];
const LINES = 16;
const STEP = 14;
const POINTER_RADIUS = 170;

export function initFlowCanvas(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  let width = 0;
  let height = 0;
  const pointer = { x: 0, y: 0, strength: 0, target: 0 };

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time: number): void {
    ctx.clearRect(0, 0, width, height);
    if (width === 0 || height === 0) return;

    const seconds = time / 1000;
    pointer.strength += (pointer.target - pointer.strength) * 0.08;
    pointer.target *= 0.96;

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#ff9500");
    gradient.addColorStop(0.5, "#ff6b6b");
    gradient.addColorStop(1, "#0064ff");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.1;

    for (const ribbon of RIBBONS) {
      for (let line = 0; line < LINES; line++) {
        const offset = line / (LINES - 1) - 0.5;
        ctx.globalAlpha = 0.08 + 0.24 * (1 - Math.abs(offset) * 2);
        ctx.beginPath();

        for (let x = -STEP; x <= width + STEP; x += STEP) {
          const u = x / width;
          const wave = Math.sin(
            u * Math.PI * 2 * ribbon.frequency +
              seconds * ribbon.speed * 4 +
              ribbon.phase,
          );
          // The bundle narrows to a point and opens again: that reads as a twist.
          const twist = Math.sin(
            u * Math.PI * 1.6 + seconds * 0.35 + ribbon.phase,
          );
          let y =
            height * (ribbon.base - u * ribbon.rise + ribbon.amplitude * wave) +
            offset * height * ribbon.spread * twist;

          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const push = Math.exp(
            -(dx * dx + dy * dy) / (POINTER_RADIUS * POINTER_RADIUS),
          );
          y += (dy < 0 ? -1 : 1) * push * pointer.strength * 46;

          if (x === -STEP) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }

  resize();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // A moment of the loop that looks good as a still.
  const STILL = 4000;
  let frame = 0;
  let visible = true;

  function tick(time: number): void {
    draw(time);
    frame = visible && !reducedMotion.matches ? requestAnimationFrame(tick) : 0;
  }

  function start(): void {
    if (frame === 0 && visible && !reducedMotion.matches)
      frame = requestAnimationFrame(tick);
  }

  new ResizeObserver(() => {
    resize();
    if (frame === 0) draw(STILL);
  }).observe(canvas);

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    start();
  }).observe(canvas);

  reducedMotion.addEventListener("change", start);

  canvas.parentElement?.addEventListener("pointermove", (event) => {
    const box = canvas.getBoundingClientRect();
    pointer.x = event.clientX - box.left;
    pointer.y = event.clientY - box.top;
    pointer.target = 1;
  });

  draw(STILL);
  start();
}
