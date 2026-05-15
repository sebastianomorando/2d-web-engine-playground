export type SpriteBackend = "webgpu" | "webgl2";

export interface SpriteTextureSource {
  id: string;
  url: string;
  logicalWidth?: number;
  logicalHeight?: number;
}

export interface SpriteTexture {
  id: string;
  width: number;
  height: number;
}

export interface SpriteVertex {
  x: number;
  y: number;
  u: number;
  v: number;
  alpha: number;
  r?: number;
  g?: number;
  b?: number;
}

export interface SpriteDraw {
  textureId: string;
  vertices: readonly SpriteVertex[];
}

export interface SpriteRenderEffects {
  time: number;
  lightPosition: {
    x: number;
    y: number;
  };
  lightColor: {
    r: number;
    g: number;
    b: number;
  };
  ambientColor: {
    r: number;
    g: number;
    b: number;
  };
  clearColor: {
    r: number;
    g: number;
    b: number;
  };
  strength: number;
  shadowStrength: number;
  paperStrength: number;
}

export interface SpriteRenderer {
  readonly backend: SpriteBackend;
  resize(width: number, height: number, devicePixelRatio: number): void;
  loadTextures(sources: readonly SpriteTextureSource[]): Promise<readonly SpriteTexture[]>;
  render(draws: readonly SpriteDraw[], effects?: SpriteRenderEffects): void;
  destroy(): void;
}

export class SpriteRendererInitError extends Error {
  constructor(
    message: string,
    public readonly backend: SpriteBackend,
  ) {
    super(message);
    this.name = "SpriteRendererInitError";
  }
}

export function trianglesFromQuad(
  topLeft: SpriteVertex,
  topRight: SpriteVertex,
  bottomRight: SpriteVertex,
  bottomLeft: SpriteVertex,
): readonly SpriteVertex[] {
  return [topLeft, topRight, bottomRight, topLeft, bottomRight, bottomLeft];
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

export function rasterizeImage(
  image: HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create 2D canvas for image rasterization");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
