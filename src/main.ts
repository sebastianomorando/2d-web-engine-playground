import {
  FABULAB_TEXTURE_SOURCES,
  createFabulabScene,
  type FabulabSceneSettings,
  type PointerState,
} from "./engine/fabulab-scene";
import { createSpriteRenderer } from "./renderer/create-sprite-renderer";

const canvas = requiredElement<HTMLCanvasElement>("#renderer");
const viewportWrap = requiredElement<HTMLElement>(".viewport-wrap");
const backendLabel = requiredElement<HTMLSpanElement>("#backend");
const fpsLabel = requiredElement<HTMLSpanElement>("#fps");
const assetCountLabel = requiredElement<HTMLSpanElement>("#asset-count");
const parallaxInput = requiredElement<HTMLInputElement>("#parallax");
const parallaxValue = requiredElement<HTMLOutputElement>("#parallax-value");
const lightingInput = requiredElement<HTMLInputElement>("#lighting");
const lightingValue = requiredElement<HTMLOutputElement>("#lighting-value");
const dayCycleInput = requiredElement<HTMLInputElement>("#day-cycle");
const dayCycleValue = requiredElement<HTMLOutputElement>("#day-cycle-value");
const driftInput = requiredElement<HTMLInputElement>("#drift");
const driftValue = requiredElement<HTMLOutputElement>("#drift-value");
const entranceInput = requiredElement<HTMLInputElement>("#entrance");
const entranceValue = requiredElement<HTMLOutputElement>("#entrance-value");

const renderer = await createSpriteRenderer(canvas);
backendLabel.textContent = renderer.backend;
assetCountLabel.textContent = "loading";

const textures = await renderer.loadTextures(FABULAB_TEXTURE_SOURCES);
assetCountLabel.textContent = `${textures.length} layers`;

const settings: FabulabSceneSettings = {
  parallax: Number(parallaxInput.value),
  drift: Number(driftInput.value),
  entrance: Number(entranceInput.value),
};
let lighting = Number(lightingInput.value);
let dayCycleSpeed = Number(dayCycleInput.value);

const pointer: PointerState = { x: 0, y: 0 };
let lastTimestamp = performance.now();
let fps = 0;

parallaxInput.addEventListener("input", () => {
  settings.parallax = Number(parallaxInput.value);
  parallaxValue.value = settings.parallax.toFixed(2);
});

lightingInput.addEventListener("input", () => {
  lighting = Number(lightingInput.value);
  lightingValue.value = lighting.toFixed(2);
});

dayCycleInput.addEventListener("input", () => {
  dayCycleSpeed = Number(dayCycleInput.value);
  dayCycleValue.value = `${dayCycleSpeed.toFixed(2)}x`;
});

driftInput.addEventListener("input", () => {
  settings.drift = Number(driftInput.value);
  driftValue.value = settings.drift.toFixed(2);
});

entranceInput.addEventListener("input", () => {
  settings.entrance = Number(entranceInput.value);
  entranceValue.value = settings.entrance.toFixed(2);
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
});

canvas.addEventListener("pointerleave", () => {
  pointer.x = 0;
  pointer.y = 0;
});

let resizeQueued = false;
const resizeObserver = new ResizeObserver(() => queueResize());
resizeObserver.observe(viewportWrap);
resize();

window.addEventListener("beforeunload", () => {
  renderer.destroy();
});

requestAnimationFrame(frame);

function frame(timestamp: number): void {
  const delta = Math.max(0.001, timestamp - lastTimestamp);
  lastTimestamp = timestamp;
  fps = fps * 0.9 + (1000 / delta) * 0.1;
  fpsLabel.textContent = `${Math.round(fps)} fps`;

  const draws = createFabulabScene(
    textures,
    {
      width: canvas.width,
      height: canvas.height,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    pointer,
    timestamp,
    settings,
  );
  const sun = createSunCycle(timestamp, canvas.width, canvas.height, dayCycleSpeed);
  renderer.render(draws, {
    time: timestamp,
    lightPosition: {
      x: sun.lightPosition.x + canvas.width * pointer.x * 0.025,
      y: sun.lightPosition.y + canvas.height * pointer.y * 0.018,
    },
    lightColor: sun.lightColor,
    ambientColor: sun.ambientColor,
    clearColor: sun.clearColor,
    strength: lighting * sun.lightStrength,
    shadowStrength: lighting * sun.shadowStrength,
  });

  requestAnimationFrame(frame);
}

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
}

function queueResize(): void {
  if (resizeQueued) {
    return;
  }

  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    resize();
  });
}

function createSunCycle(
  timestamp: number,
  width: number,
  height: number,
  speed: number,
): {
  lightPosition: { x: number; y: number };
  lightColor: { r: number; g: number; b: number };
  ambientColor: { r: number; g: number; b: number };
  clearColor: { r: number; g: number; b: number };
  lightStrength: number;
  shadowStrength: number;
} {
  const dayDurationMs = 64_000;
  const cycle = ((timestamp * speed) % dayDurationMs) / dayDurationMs;
  const angle = cycle * Math.PI * 2 - Math.PI * 0.1;
  const heightFactor = Math.sin(angle);
  const horizon = smoothstep(-0.18, 0.22, heightFactor);
  const noon = smoothstep(0.35, 0.95, heightFactor);
  const warmEdge = (1 - noon) * horizon;
  const night = 1 - horizon;
  const x = width * (0.5 + Math.cos(angle) * 0.62);
  const y = height * (0.66 - heightFactor * 0.72);

  return {
    lightPosition: { x, y },
    lightColor: mixColor(
      mixColor({ r: 1.0, g: 0.46, b: 0.24 }, { r: 1.0, g: 0.95, b: 0.78 }, noon),
      { r: 0.34, g: 0.48, b: 0.92 },
      night * 0.85,
    ),
    ambientColor: {
      r: lerp(0.2, lerp(0.74, 0.95, noon), horizon),
      g: lerp(0.23, lerp(0.5, 0.88, noon), horizon),
      b: lerp(0.42, lerp(0.58, 0.92, noon), horizon),
    },
    clearColor: {
      r: lerp(0.015, lerp(0.2, 0.88, noon), horizon),
      g: lerp(0.018, lerp(0.08, 0.53, noon), horizon),
      b: lerp(0.05, lerp(0.18, 0.58, noon), horizon),
    },
    lightStrength: 0.12 + horizon * (0.62 + noon * 0.38) + warmEdge * 0.18,
    shadowStrength: 0.08 + horizon * (0.5 - noon * 0.24),
  };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = clamp01((value - edge0) / (edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

function mixColor(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  amount: number,
): { r: number; g: number; b: number } {
  return {
    r: lerp(from.r, to.r, amount),
    g: lerp(from.g, to.g, amount),
    b: lerp(from.b, to.b, amount),
  };
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * clamp01(amount);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing DOM node: ${selector}`);
  }

  return element;
}
