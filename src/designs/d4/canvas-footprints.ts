/**
 * Canvas 2D animation for footprint trails showing dance step patterns.
 * Uses continuous looping animation with fade effects.
 */

interface FootprintTrail {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  createdAt: number;
  lifetime: number; // milliseconds
}

export function initFootprintCanvas(
  canvas: HTMLCanvasElement,
  options: {
    color?: string;
    loopDuration?: number;
  } = {},
): void {
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return;

  const ctx: CanvasRenderingContext2D = canvasCtx;

  const {
    color = "#0f5a9f",
    loopDuration = 3000, // 3 seconds for a full cycle
  } = options;

  // Set canvas size
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Define bachata basic step pattern (triangle shape)
  const stepWidth = width * 0.4;
  const stepHeight = height * 0.4;
  const centerX = width / 2;
  const centerY = height / 2;

  // Three points of the basic step
  const stepPoints = [
    { x: centerX, y: centerY - stepHeight / 2 }, // top
    { x: centerX - stepWidth / 2, y: centerY + stepHeight / 2 }, // bottom left
    { x: centerX + stepWidth / 2, y: centerY + stepHeight / 2 }, // bottom right
  ];

  const trails: FootprintTrail[] = [];

  const prefers = window.matchMedia("(prefers-reduced-motion: reduce)");
  let shouldAnimate = !prefers.matches;

  prefers.addEventListener("change", (e) => {
    shouldAnimate = !e.matches;
  });

  function drawFootprint(
    x: number,
    y: number,
    size: number,
    opacity: number,
    colorVal: string,
  ): void {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = colorVal;

    // Simple footprint shape: oval with small toe markers
    ctx.beginPath();
    ctx.ellipse(x, y, size * 1.2, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Toe marks
    ctx.fillRect(x - size * 0.3, y - size * 0.4, size * 0.15, size * 0.2);
    ctx.fillRect(x, y - size * 0.4, size * 0.15, size * 0.2);
    ctx.fillRect(x + size * 0.3, y - size * 0.4, size * 0.15, size * 0.2);

    ctx.restore();
  }

  function animate(currentTime: number): void {
    // Clear canvas
    ctx.fillStyle = "#f5f1e8";
    ctx.fillRect(0, 0, width, height);

    if (!shouldAnimate) {
      // Show static final pattern
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stepPoints[0].x, stepPoints[0].y);
      ctx.lineTo(stepPoints[1].x, stepPoints[1].y);
      ctx.lineTo(stepPoints[2].x, stepPoints[2].y);
      ctx.closePath();
      ctx.stroke();

      // Draw static footprints
      stepPoints.forEach((point) => {
        drawFootprint(point.x, point.y, 12, 0.5, color);
      });

      requestAnimationFrame(animate);
      return;
    }

    // Draw step pattern
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(stepPoints[0].x, stepPoints[0].y);
    ctx.lineTo(stepPoints[1].x, stepPoints[1].y);
    ctx.lineTo(stepPoints[2].x, stepPoints[2].y);
    ctx.closePath();
    ctx.stroke();

    // Progress through the cycle (0 to 1)
    const progress = (currentTime % loopDuration) / loopDuration;

    // Add new footprints along the path
    if (progress < 0.25) {
      // First segment: top to bottom-left
      const segProgress = progress / 0.25;
      const x =
        stepPoints[0].x + (stepPoints[1].x - stepPoints[0].x) * segProgress;
      const y =
        stepPoints[0].y + (stepPoints[1].y - stepPoints[0].y) * segProgress;
      trails.push({
        x,
        y,
        size: 10,
        opacity: 1,
        color: color,
        createdAt: currentTime,
        lifetime: 600,
      });
    } else if (progress < 0.5) {
      // Second segment: bottom-left to bottom-right
      const segProgress = (progress - 0.25) / 0.25;
      const x =
        stepPoints[1].x + (stepPoints[2].x - stepPoints[1].x) * segProgress;
      const y =
        stepPoints[1].y + (stepPoints[2].y - stepPoints[1].y) * segProgress;
      trails.push({
        x,
        y,
        size: 10,
        opacity: 1,
        color: color,
        createdAt: currentTime,
        lifetime: 600,
      });
    } else if (progress < 0.75) {
      // Third segment: bottom-right back to top
      const segProgress = (progress - 0.5) / 0.25;
      const x =
        stepPoints[2].x + (stepPoints[0].x - stepPoints[2].x) * segProgress;
      const y =
        stepPoints[2].y + (stepPoints[0].y - stepPoints[2].y) * segProgress;
      trails.push({
        x,
        y,
        size: 10,
        opacity: 1,
        color: color,
        createdAt: currentTime,
        lifetime: 600,
      });
    }

    // Update and draw trails
    for (let i = trails.length - 1; i >= 0; i--) {
      const trail = trails[i];
      const age = currentTime - trail.createdAt;

      if (age > trail.lifetime) {
        trails.splice(i, 1);
        continue;
      }

      const opacity = 1 - age / trail.lifetime;
      drawFootprint(trail.x, trail.y, trail.size, opacity, trail.color);
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

/**
 * Canvas animation showing the basic bachata step with interactive stepping.
 */
export function initStepDiagramCanvas(
  canvas: HTMLCanvasElement,
  options: {
    colors?: string[];
    stepCount?: number;
  } = {},
): void {
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return;

  const ctx: CanvasRenderingContext2D = canvasCtx;

  const colors = options.colors || ["#0f5a9f", "#ff8c42", "#ffd60a", "#4da6ff"];
  const stepCount = options.stepCount || 8;

  // Set canvas size
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const stepWidth = width * 0.15;
  const startY = height / 2;

  let currentStep = 0;

  function drawStep(
    x: number,
    y: number,
    isLeft: boolean,
    opacity: number = 1,
  ): void {
    ctx.save();
    ctx.globalAlpha = opacity;

    // Footprint shape
    const size = stepWidth;
    ctx.fillStyle = colors[(isLeft ? 0 : 1) % colors.length];

    // Basic footprint
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      size * 1.2,
      size * 0.6,
      isLeft ? -0.3 : 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.restore();
  }

  function animate(currentTime: number): void {
    // Clear canvas
    ctx.fillStyle = "#f5f1e8";
    ctx.fillRect(0, 0, width, height);

    // Draw connection line
    ctx.strokeStyle = "#0f5a9f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(stepWidth, startY);
    ctx.lineTo(width - stepWidth, startY);
    ctx.stroke();

    // Draw step sequence
    const stepDistance = (width - stepWidth * 2) / (stepCount - 1);

    for (let i = 0; i < stepCount; i++) {
      const x = stepWidth + i * stepDistance;
      const isLeft = i % 2 === 0;
      const opacity = Math.max(0, 1 - Math.abs(i - currentStep) / 2);

      drawStep(x, startY, isLeft, opacity);

      // Draw step number
      ctx.fillStyle = opacity > 0 ? "#2d3436" : "#999";
      ctx.font = `bold 10px sans-serif`;
      ctx.textAlign = "center";
      ctx.globalAlpha = opacity;
      ctx.fillText(`${i + 1}`, x, startY + stepWidth * 1.2);
      ctx.globalAlpha = 1;
    }

    // Auto-advance step
    if (currentTime % 3000 < 16) {
      currentStep = (currentStep + 1) % stepCount;
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
