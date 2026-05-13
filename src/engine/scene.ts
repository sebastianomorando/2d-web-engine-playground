import type { Color, Quad } from "../renderer/renderer";

export interface SceneSettings {
  quadCount: number;
  motion: number;
}

const PALETTE: readonly Color[] = [
  [0.31, 0.82, 0.65, 0.92],
  [0.98, 0.7, 0.37, 0.88],
  [0.44, 0.63, 0.95, 0.9],
  [0.96, 0.43, 0.51, 0.88],
  [0.85, 0.9, 0.55, 0.86],
];

export function createScene(time: number, width: number, height: number, settings: SceneSettings): Quad[] {
  const quads: Quad[] = [];
  const count = Math.max(1, Math.floor(settings.quadCount));
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = Math.min(width, height) * 0.36;
  const motion = settings.motion;

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2 + time * 0.00022 * motion;
    const orbit = radius * (0.24 + 0.76 * ((i % 29) / 29));
    const wobble = Math.sin(time * 0.0013 * motion + i * 0.73) * 22 * motion;
    const size = 10 + 26 * ((i % 17) / 17);

    quads.push({
      position: [
        centerX + Math.cos(angle * 1.7) * orbit + wobble,
        centerY + Math.sin(angle * 1.13) * orbit,
      ],
      size,
      rotation: angle + time * 0.001 * motion,
      color: colorAt(i),
    });
  }

  return quads;
}

function colorAt(index: number): Color {
  return PALETTE[index % PALETTE.length] ?? [1, 1, 1, 1];
}
