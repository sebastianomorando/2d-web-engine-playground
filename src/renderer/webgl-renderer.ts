import { FLOATS_PER_VERTEX, packQuads } from "../engine/geometry";
import type { Quad, Renderer2D } from "./renderer";
import { RendererInitError } from "./renderer";

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec4 a_color;

uniform vec2 u_resolution;

out vec4 v_color;

void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_color = a_color;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 out_color;

void main() {
  out_color = v_color;
}`;

export class WebGlRenderer implements Renderer2D {
  readonly backend = "webgl2" as const;

  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly resolutionUniform: WebGLUniformLocation;
  private width = 1;
  private height = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) {
      throw new RendererInitError("WebGL2 is not available", "webgl2");
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    const vertexArray = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const resolutionUniform = gl.getUniformLocation(program, "u_resolution");

    if (!vertexArray || !vertexBuffer || !resolutionUniform) {
      throw new RendererInitError("Failed to allocate WebGL2 resources", "webgl2");
    }

    this.gl = gl;
    this.program = program;
    this.vertexArray = vertexArray;
    this.vertexBuffer = vertexBuffer;
    this.resolutionUniform = resolutionUniform;

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const stride = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const colorLocation = gl.getAttribLocation(program, "a_color");

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(
      colorLocation,
      4,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT,
    );
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = Math.max(1, Math.floor(width * devicePixelRatio));
    this.height = Math.max(1, Math.floor(height * devicePixelRatio));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.gl.viewport(0, 0, this.width, this.height);
  }

  render(quads: readonly Quad[]): void {
    const data = packQuads(quads);
    const gl = this.gl;

    gl.clearColor(0.03, 0.04, 0.055, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(this.resolutionUniform, this.width, this.height);
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, data.length / FLOATS_PER_VERTEX);
  }

  destroy(): void {
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteVertexArray(this.vertexArray);
    this.gl.deleteProgram(this.program);
  }
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    throw new RendererInitError("Failed to create WebGL2 program", "webgl2");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown link error";
    gl.deleteProgram(program);
    throw new RendererInitError(log, "webgl2");
  }

  return program;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new RendererInitError("Failed to create WebGL2 shader", "webgl2");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown shader error";
    gl.deleteShader(shader);
    throw new RendererInitError(log, "webgl2");
  }

  return shader;
}
