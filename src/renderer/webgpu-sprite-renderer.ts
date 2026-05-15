import {
  loadImage,
  rasterizeImage,
  type SpriteDraw,
  type SpriteRenderer,
  type SpriteRenderEffects,
  type SpriteTexture,
  type SpriteTextureSource,
} from "./sprite-renderer";
import { SpriteRendererInitError } from "./sprite-renderer";

const FLOATS_PER_VERTEX = 8;

const SHADER = `
struct Uniforms {
  resolution: vec2f,
  lightPosition: vec2f,
  lightColor: vec4f,
  ambientColor: vec4f,
  clearColor: vec4f,
  time: f32,
  effectStrength: f32,
  shadowStrength: f32,
  paperStrength: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var spriteTexture: texture_2d<f32>;
@group(1) @binding(1) var spriteSampler: sampler;

struct VertexInput {
  @location(0) position: vec2f,
  @location(1) uv: vec2f,
  @location(2) alpha: f32,
  @location(3) color: vec3f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) positionPx: vec2f,
  @location(2) alpha: f32,
  @location(3) color: vec3f,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let clip = (input.position / uniforms.resolution) * 2.0 - 1.0;
  output.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
  output.uv = input.uv;
  output.positionPx = input.position;
  output.alpha = input.alpha;
  output.color = input.color;
  return output;
}

fn heightAt(uv: vec2f) -> f32 {
  let sampleColor = textureSample(spriteTexture, spriteSampler, clamp(uv, vec2f(0.0), vec2f(1.0)));
  return dot(sampleColor.rgb, vec3f(0.299, 0.587, 0.114)) * sampleColor.a;
}

fn hash12(point: vec2f) -> f32 {
  var p3 = fract(vec3f(point.x, point.y, point.x) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + vec3f(33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn paperNoise(point: vec2f) -> f32 {
  let cell = floor(point);
  var local = fract(point);
  local = local * local * (vec2f(3.0) - 2.0 * local);
  return mix(
    mix(hash12(cell), hash12(cell + vec2f(1.0, 0.0)), local.x),
    mix(hash12(cell + vec2f(0.0, 1.0)), hash12(cell + vec2f(1.0, 1.0)), local.x),
    local.y
  );
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var texel = textureSample(spriteTexture, spriteSampler, input.uv);
  texel = vec4f(texel.rgb * input.color, texel.a);
  let dimensions = vec2f(textureDimensions(spriteTexture));
  let texelSize = 1.0 / max(dimensions, vec2f(1.0));
  let left = heightAt(input.uv - vec2f(texelSize.x, 0.0));
  let right = heightAt(input.uv + vec2f(texelSize.x, 0.0));
  let up = heightAt(input.uv - vec2f(0.0, texelSize.y));
  let down = heightAt(input.uv + vec2f(0.0, texelSize.y));
  let alphaLeft = textureSample(spriteTexture, spriteSampler, clamp(input.uv - vec2f(texelSize.x, 0.0), vec2f(0.0), vec2f(1.0))).a;
  let alphaRight = textureSample(spriteTexture, spriteSampler, clamp(input.uv + vec2f(texelSize.x, 0.0), vec2f(0.0), vec2f(1.0))).a;
  let alphaUp = textureSample(spriteTexture, spriteSampler, clamp(input.uv - vec2f(0.0, texelSize.y), vec2f(0.0), vec2f(1.0))).a;
  let alphaDown = textureSample(spriteTexture, spriteSampler, clamp(input.uv + vec2f(0.0, texelSize.y), vec2f(0.0), vec2f(1.0))).a;
  let normal = normalize(vec3f((left - right) * 4.5, (up - down) * 4.5, 1.0));
  let lightOffset = (uniforms.lightPosition - input.positionPx) / max(max(uniforms.resolution.x, uniforms.resolution.y), 1.0);
  let lightDirection = normalize(vec3f(lightOffset * vec2f(1.0, -1.0), 0.45));
  let diffuse = max(dot(normal, lightDirection), 0.0);
  let halfVector = normalize(lightDirection + vec3f(0.0, 0.0, 1.0));
  let specular = pow(max(dot(normal, halfVector), 0.0), 18.0) * 0.13;
  let flicker = sin(uniforms.time * 0.0011 + input.positionPx.x * 0.005) * 0.018;
  let ambient = texel.rgb * uniforms.ambientColor.rgb;
  let litColor = ambient + texel.rgb * uniforms.lightColor.rgb * (diffuse * 0.42 + flicker) + uniforms.lightColor.rgb * specular;
  let shadowDirection = normalize(lightOffset + vec2f(0.0001));
  let shadowAlpha = textureSample(spriteTexture, spriteSampler, input.uv - shadowDirection * texelSize * 12.0).a * (1.0 - texel.a);
  let shadowColor = vec3f(0.18, 0.035, 0.09) * shadowAlpha * uniforms.shadowStrength;
  var color = mix(texel.rgb, litColor, uniforms.effectStrength) + shadowColor;
  let cardStrength = clamp(uniforms.paperStrength * (0.38 + uniforms.effectStrength * 0.32), 0.0, 0.7);
  let coarseFiber = paperNoise(input.positionPx * 0.42 + input.uv * dimensions * 0.18);
  let fineFiber = paperNoise(input.positionPx * 1.35 + vec2f(uniforms.time * 0.002, 0.0));
  let strand = sin((input.positionPx.x + input.positionPx.y * 0.35) * 0.65 + coarseFiber * 2.0) * 0.5 + 0.5;
  let grain = (coarseFiber - 0.5) * 0.08 + (fineFiber - 0.5) * 0.025 + (strand - 0.5) * 0.025;
  let edge = texel.a * clamp(1.0 - min(min(alphaLeft, alphaRight), min(alphaUp, alphaDown)), 0.0, 1.0);
  let quantized = floor(color * 9.0 + vec3f(0.5)) / vec3f(9.0);
  let warmPaper = color * vec3f(1.035, 1.0, 0.935) + vec3f(0.018, 0.012, 0.004);
  color = mix(color, quantized, cardStrength * 0.24 * texel.a);
  color = mix(color, warmPaper, cardStrength * 0.22 * texel.a);
  color = color + vec3f(grain) * cardStrength * texel.a;
  color = color * (1.0 - edge * cardStrength * 0.18);
  color = clamp(color, vec3f(0.0), vec3f(1.0));
  let alpha = max(texel.a, shadowAlpha * uniforms.shadowStrength) * input.alpha;
  return vec4f(color, alpha);
}`;

interface WebGpuTextureRecord extends SpriteTexture {
  bindGroup: GPUBindGroup;
  texture: GPUTexture;
}

export class WebGpuSpriteRenderer implements SpriteRenderer {
  readonly backend = "webgpu" as const;

  private readonly context: GPUCanvasContext;
  private readonly device: GPUDevice;
  private readonly pipeline: GPURenderPipeline;
  private readonly uniformBuffer: GPUBuffer;
  private readonly uniformBindGroup: GPUBindGroup;
  private readonly textureBindGroupLayout: GPUBindGroupLayout;
  private readonly sampler: GPUSampler;
  private readonly textures = new Map<string, WebGpuTextureRecord>();
  private vertexBuffer: GPUBuffer;
  private vertexCapacity = 0;
  private width = 1;
  private height = 1;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
    device: GPUDevice,
    private readonly format: GPUTextureFormat,
  ) {
    this.context = context;
    this.device = device;
    this.uniformBuffer = device.createBuffer({
      label: "sprite frame uniforms",
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformBindGroupLayout = device.createBindGroupLayout({
      label: "sprite uniform layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.textureBindGroupLayout = device.createBindGroupLayout({
      label: "sprite texture layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
      ],
    });

    this.uniformBindGroup = device.createBindGroup({
      label: "sprite uniform bind group",
      layout: uniformBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    this.sampler = device.createSampler({
      label: "sprite sampler",
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    this.pipeline = device.createRenderPipeline({
      label: "sprite pipeline",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [uniformBindGroupLayout, this.textureBindGroupLayout],
      }),
      vertex: {
        module: device.createShaderModule({ label: "sprite shader", code: SHADER }),
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              {
                shaderLocation: 1,
                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x2",
              },
              {
                shaderLocation: 2,
                offset: 4 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32",
              },
              {
                shaderLocation: 3,
                offset: 5 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x3",
              },
            ],
          },
        ],
      },
      fragment: {
        module: device.createShaderModule({ label: "sprite shader fragment", code: SHADER }),
        entryPoint: "fragmentMain",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });

    this.vertexBuffer = this.createVertexBuffer(1);
  }

  static async create(canvas: HTMLCanvasElement): Promise<WebGpuSpriteRenderer> {
    if (!navigator.gpu) {
      throw new SpriteRendererInitError("WebGPU is not available", "webgpu");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new SpriteRendererInitError("No WebGPU adapter found", "webgpu");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new SpriteRendererInitError("Failed to create WebGPU canvas context", "webgpu");
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque" });

    return new WebGpuSpriteRenderer(canvas, context, device, format);
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = Math.max(1, Math.floor(width * devicePixelRatio));
    this.height = Math.max(1, Math.floor(height * devicePixelRatio));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });
  }

  async loadTextures(sources: readonly SpriteTextureSource[]): Promise<readonly SpriteTexture[]> {
    const loaded: SpriteTexture[] = [];

    for (const source of sources) {
      const image = await loadImage(source.url);
      const bitmapSource =
        source.logicalWidth && source.logicalHeight
          ? rasterizeImage(image, source.logicalWidth, source.logicalHeight)
          : image;
      const bitmap = await bitmapFromImage(bitmapSource);
      const texture = this.device.createTexture({
        label: source.id,
        size: [bitmap.width, bitmap.height],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      this.device.queue.copyExternalImageToTexture(
        { source: bitmap, flipY: false },
        { texture, premultipliedAlpha: true },
        [bitmap.width, bitmap.height],
      );

      const bindGroup = this.device.createBindGroup({
        label: `${source.id} bind group`,
        layout: this.textureBindGroupLayout,
        entries: [
          { binding: 0, resource: texture.createView() },
          { binding: 1, resource: this.sampler },
        ],
      });

      const record = {
        id: source.id,
        width: source.logicalWidth ?? bitmap.width,
        height: source.logicalHeight ?? bitmap.height,
        bindGroup,
        texture,
      };

      this.textures.set(source.id, record);
      loaded.push({ id: record.id, width: record.width, height: record.height });
    }

    return loaded;
  }

  render(draws: readonly SpriteDraw[], effects?: SpriteRenderEffects): void {
    const resolvedEffects = this.resolveEffects(effects);
    const drawCommands: Array<{
      texture: WebGpuTextureRecord;
      firstVertex: number;
      vertexCount: number;
    }> = [];
    const vertexCount = draws.reduce((total, draw) => total + draw.vertices.length, 0);
    const data = new Float32Array(vertexCount * FLOATS_PER_VERTEX);
    let cursor = 0;
    let firstVertex = 0;

    for (const draw of draws) {
      const texture = this.textures.get(draw.textureId);
      if (!texture) {
        continue;
      }

      for (const vertex of draw.vertices) {
        data[cursor++] = vertex.x;
        data[cursor++] = vertex.y;
        data[cursor++] = vertex.u;
        data[cursor++] = vertex.v;
        data[cursor++] = vertex.alpha;
        data[cursor++] = vertex.r ?? 1;
        data[cursor++] = vertex.g ?? 1;
        data[cursor++] = vertex.b ?? 1;
      }

      drawCommands.push({ texture, firstVertex, vertexCount: draw.vertices.length });
      firstVertex += draw.vertices.length;
    }

    this.ensureVertexCapacity(data.byteLength);
    if (data.byteLength > 0) {
      this.device.queue.writeBuffer(this.vertexBuffer, 0, data);
    }

    const uniforms = new ArrayBuffer(20 * Float32Array.BYTES_PER_ELEMENT);
    new Float32Array(uniforms).set([
      this.width,
      this.height,
      resolvedEffects.lightPosition.x,
      resolvedEffects.lightPosition.y,
      resolvedEffects.lightColor.r,
      resolvedEffects.lightColor.g,
      resolvedEffects.lightColor.b,
      1,
      resolvedEffects.ambientColor.r,
      resolvedEffects.ambientColor.g,
      resolvedEffects.ambientColor.b,
      1,
      resolvedEffects.clearColor.r,
      resolvedEffects.clearColor.g,
      resolvedEffects.clearColor.b,
      1,
      resolvedEffects.time,
      resolvedEffects.strength,
      resolvedEffects.shadowStrength,
      resolvedEffects.paperStrength,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);

    const encoder = this.device.createCommandEncoder({ label: "sprite frame encoder" });
    const pass = encoder.beginRenderPass({
      label: "sprite pass",
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: {
            r: resolvedEffects.clearColor.r,
            g: resolvedEffects.clearColor.g,
            b: resolvedEffects.clearColor.b,
            a: 1,
          },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.uniformBindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);

    for (const command of drawCommands) {
      pass.setBindGroup(1, command.texture.bindGroup);
      pass.draw(command.vertexCount, 1, command.firstVertex);
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
    for (const texture of this.textures.values()) {
      texture.texture.destroy();
    }

    this.vertexBuffer.destroy();
    this.uniformBuffer.destroy();
  }

  private ensureVertexCapacity(byteLength: number): void {
    if (byteLength <= this.vertexCapacity) {
      return;
    }

    this.vertexBuffer.destroy();
    this.vertexBuffer = this.createVertexBuffer(byteLength);
  }

  private createVertexBuffer(byteLength: number): GPUBuffer {
    const capacity = Math.max(256, nextPowerOfTwo(byteLength));
    this.vertexCapacity = capacity;
    return this.device.createBuffer({
      label: "sprite vertex buffer",
      size: capacity,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private resolveEffects(effects?: SpriteRenderEffects): SpriteRenderEffects {
    return {
      time: effects?.time ?? performance.now(),
      lightPosition: effects?.lightPosition ?? { x: this.width * 0.68, y: this.height * 0.2 },
      lightColor: effects?.lightColor ?? { r: 1, g: 0.95, b: 0.78 },
      ambientColor: effects?.ambientColor ?? { r: 0.9, g: 0.84, b: 0.82 },
      clearColor: effects?.clearColor ?? { r: 0.01, g: 0.012, b: 0.018 },
      strength: effects?.strength ?? 0,
      shadowStrength: effects?.shadowStrength ?? 0,
      paperStrength: effects?.paperStrength ?? 0.68,
    };
  }
}

async function bitmapFromImage(image: HTMLImageElement | HTMLCanvasElement): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(image);
  } catch {
    if (image instanceof HTMLCanvasElement) {
      throw new SpriteRendererInitError("Failed to create bitmap from rasterized SVG", "webgpu");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new SpriteRendererInitError("Failed to rasterize SVG image", "webgpu");
    }

    context.drawImage(image, 0, 0);
    return createImageBitmap(canvas);
  }
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(1, value)));
}
