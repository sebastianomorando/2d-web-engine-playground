import type { Renderer2D } from "./renderer";
import { WebGlRenderer } from "./webgl-renderer";
import { WebGpuRenderer } from "./webgpu-renderer";

export async function createRenderer(canvas: HTMLCanvasElement): Promise<Renderer2D> {
  try {
    return await WebGpuRenderer.create(canvas);
  } catch (error) {
    console.info("WebGPU unavailable, falling back to WebGL2.", error);
    return new WebGlRenderer(canvas);
  }
}
