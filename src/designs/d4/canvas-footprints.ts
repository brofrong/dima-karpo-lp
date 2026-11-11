/**
 * Canvas 2D step chart: two shoe prints walk the bachata basic
 * (side, close, side, tap — and back) on a loop, with the count underneath.
 */

interface StepChartOptions {
  leftColor?: string;
  rightColor?: string;
  tapColor?: string;
  inkColor?: string;
  /** Length of one count, in milliseconds. */
  beat?: number;
}

/** Foot positions, in slots, before each of the eight counts (and after the last). */
const LEFT = [-0.5, -1.5, -1.5, -2.5, -2.5, -2.5, -1.5, -1.5, -0.5];
const RIGHT = [0.5, 0.5, -0.5, -0.5, -1.5, -0.5, -0.5, 0.5, 0.5];
const SLOTS = [-2.5, -1.5, -0.5, 0.5];
const COUNTS = 8;

function easeInOut(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;
}

export function initStepChart(
  canvas: HTMLCanvasElement,
  options: StepChartOptions = {},
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  const {
    leftColor = "#0f5a9f",
    rightColor = "#ff8c42",
    tapColor = "#ffd60a",
    inkColor = "#2d3436",
    beat = 560,
  } = options;

  let width = 0;
  let height = 0;

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function shoe(
    x: number,
    y: number,
    length: number,
    color: string,
    onToe: boolean,
    alpha: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y - length * 0.16,
      length * 0.23,
      length * 0.33,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (!onToe) {
      ctx.beginPath();
      ctx.ellipse(
        x,
        y + length * 0.36,
        length * 0.16,
        length * 0.13,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  function draw(time: number): void {
    ctx.clearRect(0, 0, width, height);
    if (width === 0 || height === 0) return;

    const total = time / beat;
    const count = Math.floor(total) % COUNTS;
    const phase = total - Math.floor(total);
    const move = easeInOut(Math.min(phase / 0.6, 1));

    const slot = width / 5;
    const centerX = width / 2;
    const floorY = height * 0.4;
    const length = Math.min(height * 0.44, slot * 1.5);
    const toX = (position: number) => centerX + (position + 1) * slot;

    // Empty slots on the floor
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    for (const position of SLOTS) {
      ctx.beginPath();
      ctx.ellipse(
        toX(position),
        floorY,
        length * 0.3,
        length * 0.56,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.restore();

    const leftX = toX(LEFT[count] + (LEFT[count + 1] - LEFT[count]) * move);
    const rightX = toX(RIGHT[count] + (RIGHT[count + 1] - RIGHT[count]) * move);
    const leftMoves = LEFT[count] !== LEFT[count + 1];
    // Counts 4 and 8 are taps: the moving foot lands on the toe only.
    const isTap = count === 3 || count === 7;
    const lift = Math.sin(Math.min(phase / 0.6, 1) * Math.PI) * length * 0.1;

    // Ripple under a tap
    if (isTap && phase > 0.6) {
      const ripple = (phase - 0.6) / 0.4;
      ctx.save();
      ctx.strokeStyle = tapColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - ripple;
      ctx.beginPath();
      ctx.arc(
        leftMoves ? leftX : rightX,
        floorY - length * 0.16,
        length * (0.3 + ripple * 0.35),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }

    shoe(
      leftX,
      floorY - (leftMoves ? lift : 0),
      length,
      leftColor,
      isTap && leftMoves,
      1,
    );
    shoe(
      rightX,
      floorY - (leftMoves ? 0 : lift),
      length,
      rightColor,
      isTap && !leftMoves,
      1,
    );

    // The count: eight beads, the current one filled
    const beadY = height * 0.86;
    const beadGap = Math.min(width / 9.5, 34);
    const beadRadius = beadGap * 0.34;
    const firstX = centerX - (beadGap * (COUNTS - 1)) / 2;
    ctx.font = `${Math.round(beadRadius * 1.15)}px "Russo One", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let index = 0; index < COUNTS; index++) {
      const x = firstX + index * beadGap;
      const active = index === count;
      const tap = index === 3 || index === 7;
      ctx.beginPath();
      ctx.arc(
        x,
        beadY,
        active ? beadRadius * 1.25 : beadRadius,
        0,
        Math.PI * 2,
      );
      if (active) {
        ctx.fillStyle = tap ? tapColor : index < 4 ? leftColor : rightColor;
        ctx.fill();
      }
      ctx.strokeStyle = inkColor;
      ctx.globalAlpha = active ? 1 : 0.35;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = active && !tap ? "#ffffff" : inkColor;
      ctx.fillText(String(index + 1), x, beadY + 1);
      ctx.globalAlpha = 1;
    }
  }

  resize();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let visible = true;

  function tick(time: number): void {
    draw(time);
    frame = visible && !reducedMotion.matches ? requestAnimationFrame(tick) : 0;
  }

  function start(): void {
    if (frame === 0) frame = requestAnimationFrame(tick);
  }

  new ResizeObserver(() => {
    resize();
    // A still frame keeps the chart readable while the loop is paused.
    if (frame === 0) draw(0);
  }).observe(canvas);

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) start();
  }).observe(canvas);

  reducedMotion.addEventListener("change", start);
  document.fonts?.ready.then(() => {
    if (frame === 0) draw(0);
  });

  draw(0);
  start();
}
