import { FLOATS_PER_VERTEX, packQuads } from "../engine/geometry";
import type { Quad, Renderer2D } from "./renderer";
import { RendererInitError } from "./renderer";

const SHADER = `
struct Uniforms {
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec2f,
  @location(1) color: vec4f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let clip = (input.position / uniforms.resolution) * 2.0 - 1.0;
  output.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
  output.color = input.color;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}`;

export class WebGpuRenderer implements Renderer2D {
  readonly backend = "webgpu" as const;

  private readonly context: GPUCanvasContext;
  private readonly device: GPUDevice;
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;
  private readonly uniformBuffer: GPUBuffer;
  private vertexBuffer: GPUBuffer;
  private vertexCapacity = 0;
  private format: GPUTextureFormat;
  private width = 1;
  private height = 1;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
    device: GPUDevice,
    format: GPUTextureFormat,
  ) {
    this.context = context;
    this.device = device;
    this.format = format;

    this.uniformBuffer = device.createBuffer({
      label: "resolution uniform",
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      label: "quad bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.bindGroup = device.createBindGroup({
      label: "quad bind group",
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    const shaderModule = device.createShaderModule({
      label: "quad shader",
      code: SHADER,
    });

    this.pipeline = device.createRenderPipeline({
      label: "quad pipeline",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              {
                shaderLocation: 1,
                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x4",
              },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });

    this.vertexBuffer = this.createVertexBuffer(1);
  }

  static async create(canvas: HTMLCanvasElement): Promise<WebGpuRenderer> {
    if (!navigator.gpu) {
      throw new RendererInitError("WebGPU is not available", "webgpu");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new RendererInitError("No WebGPU adapter found", "webgpu");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new RendererInitError("Failed to create WebGPU canvas context", "webgpu");
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: "opaque",
    });

    return new WebGpuRenderer(canvas, context, device, format);
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

  render(quads: readonly Quad[]): void {
    const data = packQuads(quads);
    this.ensureVertexCapacity(data.byteLength);

    const resolution = new ArrayBuffer(2 * Float32Array.BYTES_PER_ELEMENT);
    new Float32Array(resolution).set([this.width, this.height]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, resolution);
    this.device.queue.writeBuffer(this.vertexBuffer, 0, data);

    const encoder = this.device.createCommandEncoder({ label: "frame encoder" });
    const pass = encoder.beginRenderPass({
      label: "quad pass",
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.03, g: 0.04, b: 0.055, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(data.length / FLOATS_PER_VERTEX);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
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
      label: "quad vertex buffer",
      size: capacity,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(1, value)));
}
