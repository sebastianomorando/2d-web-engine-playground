import type { SpriteRenderer } from "./sprite-renderer";
import { WebGlSpriteRenderer } from "./webgl-sprite-renderer";
import { WebGpuSpriteRenderer } from "./webgpu-sprite-renderer";

export async function createSpriteRenderer(canvas: HTMLCanvasElement): Promise<SpriteRenderer> {
  try {
    return await WebGpuSpriteRenderer.create(canvas);
  } catch (error) {
    console.info("WebGPU sprite renderer unavailable, falling back to WebGL2.", error);
    return new WebGlSpriteRenderer(canvas);
  }
}
