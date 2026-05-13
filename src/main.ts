import { createRenderer } from "./renderer/create-renderer";
import { createScene } from "./engine/scene";

const canvas = requiredElement<HTMLCanvasElement>("#renderer");
const backendLabel = requiredElement<HTMLSpanElement>("#backend");
const fpsLabel = requiredElement<HTMLSpanElement>("#fps");
const quadCountInput = requiredElement<HTMLInputElement>("#quad-count");
const quadCountValue = requiredElement<HTMLOutputElement>("#quad-count-value");
const motionInput = requiredElement<HTMLInputElement>("#motion");
const motionValue = requiredElement<HTMLOutputElement>("#motion-value");
const pauseButton = requiredElement<HTMLButtonElement>("#pause");

const renderer = await createRenderer(canvas);
backendLabel.textContent = renderer.backend;

const settings = {
  quadCount: Number(quadCountInput.value),
  motion: Number(motionInput.value),
};

let paused = false;
let lastTimestamp = performance.now();
let fps = 0;

quadCountInput.addEventListener("input", () => {
  settings.quadCount = Number(quadCountInput.value);
  quadCountValue.value = String(settings.quadCount);
});

motionInput.addEventListener("input", () => {
  settings.motion = Number(motionInput.value);
  motionValue.value = settings.motion.toFixed(2);
});

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
});

const resizeObserver = new ResizeObserver(() => resize());
resizeObserver.observe(canvas);
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

  if (!paused) {
    const quads = createScene(timestamp, canvas.width, canvas.height, settings);
    renderer.render(quads);
  }

  requestAnimationFrame(frame);
}

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing DOM node: ${selector}`);
  }

  return element;
}
