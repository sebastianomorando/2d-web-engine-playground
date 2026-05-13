import type { Vec2 } from "../math/vec2";

export type Color = readonly [r: number, g: number, b: number, a: number];

export interface Quad {
  position: Vec2;
  size: number;
  rotation: number;
  color: Color;
}

export interface Renderer2D {
  readonly backend: "webgpu" | "webgl2";
  resize(width: number, height: number, devicePixelRatio: number): void;
  render(quads: readonly Quad[]): void;
  destroy(): void;
}

export class RendererInitError extends Error {
  constructor(
    message: string,
    public readonly backend: Renderer2D["backend"],
  ) {
    super(message);
    this.name = "RendererInitError";
  }
}
