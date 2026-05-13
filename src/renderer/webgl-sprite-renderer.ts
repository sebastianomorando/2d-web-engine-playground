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

const FLOATS_PER_VERTEX = 5;

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_uv;
in float a_alpha;

uniform vec2 u_resolution;

out vec2 v_uv;
out vec2 v_position;
out float v_alpha;

void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_uv;
  v_position = a_position;
  v_alpha = a_alpha;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texture_size;
uniform vec2 u_light_position;
uniform vec3 u_light_color;
uniform vec3 u_ambient_color;
uniform float u_time;
uniform float u_effect_strength;
uniform float u_shadow_strength;

in vec2 v_uv;
in vec2 v_position;
in float v_alpha;
out vec4 out_color;

float heightAt(vec2 uv) {
  vec4 sampleColor = texture(u_texture, clamp(uv, vec2(0.0), vec2(1.0)));
  return dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114)) * sampleColor.a;
}

void main() {
  vec4 texel = texture(u_texture, v_uv);
  vec2 texelSize = 1.0 / max(u_texture_size, vec2(1.0));
  float left = heightAt(v_uv - vec2(texelSize.x, 0.0));
  float right = heightAt(v_uv + vec2(texelSize.x, 0.0));
  float up = heightAt(v_uv - vec2(0.0, texelSize.y));
  float down = heightAt(v_uv + vec2(0.0, texelSize.y));
  vec3 normal = normalize(vec3((left - right) * 4.5, (up - down) * 4.5, 1.0));
  vec2 lightOffset = (u_light_position - v_position) / max(max(u_resolution.x, u_resolution.y), 1.0);
  vec3 lightDirection = normalize(vec3(lightOffset * vec2(1.0, -1.0), 0.45));
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 halfVector = normalize(lightDirection + vec3(0.0, 0.0, 1.0));
  float specular = pow(max(dot(normal, halfVector), 0.0), 18.0) * 0.13;
  float flicker = sin(u_time * 0.0011 + v_position.x * 0.005) * 0.018;
  vec3 ambient = texel.rgb * u_ambient_color;
  vec3 litColor = ambient + texel.rgb * u_light_color * (diffuse * 0.42 + flicker) + u_light_color * specular;
  vec2 shadowDirection = normalize(lightOffset + vec2(0.0001));
  float shadowAlpha = texture(u_texture, v_uv - shadowDirection * texelSize * 12.0).a * (1.0 - texel.a);
  vec3 shadowColor = vec3(0.18, 0.035, 0.09) * shadowAlpha * u_shadow_strength;
  vec3 color = mix(texel.rgb, litColor, u_effect_strength) + shadowColor;
  float alpha = max(texel.a, shadowAlpha * u_shadow_strength) * v_alpha;
  out_color = vec4(color, alpha);
}`;

interface WebGlTextureRecord extends SpriteTexture {
  texture: WebGLTexture;
}

export class WebGlSpriteRenderer implements SpriteRenderer {
  readonly backend = "webgl2" as const;

  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly resolutionUniform: WebGLUniformLocation;
  private readonly textureSizeUniform: WebGLUniformLocation;
  private readonly lightPositionUniform: WebGLUniformLocation;
  private readonly lightColorUniform: WebGLUniformLocation;
  private readonly ambientColorUniform: WebGLUniformLocation;
  private readonly timeUniform: WebGLUniformLocation;
  private readonly effectStrengthUniform: WebGLUniformLocation;
  private readonly shadowStrengthUniform: WebGLUniformLocation;
  private readonly textures = new Map<string, WebGlTextureRecord>();
  private width = 1;
  private height = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) {
      throw new SpriteRendererInitError("WebGL2 is not available", "webgl2");
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    const vertexArray = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
    const textureSizeUniform = gl.getUniformLocation(program, "u_texture_size");
    const lightPositionUniform = gl.getUniformLocation(program, "u_light_position");
    const lightColorUniform = gl.getUniformLocation(program, "u_light_color");
    const ambientColorUniform = gl.getUniformLocation(program, "u_ambient_color");
    const timeUniform = gl.getUniformLocation(program, "u_time");
    const effectStrengthUniform = gl.getUniformLocation(program, "u_effect_strength");
    const shadowStrengthUniform = gl.getUniformLocation(program, "u_shadow_strength");

    if (
      !vertexArray ||
      !vertexBuffer ||
      !resolutionUniform ||
      !textureSizeUniform ||
      !lightPositionUniform ||
      !lightColorUniform ||
      !ambientColorUniform ||
      !timeUniform ||
      !effectStrengthUniform ||
      !shadowStrengthUniform
    ) {
      throw new SpriteRendererInitError("Failed to allocate WebGL2 sprite resources", "webgl2");
    }

    this.gl = gl;
    this.program = program;
    this.vertexArray = vertexArray;
    this.vertexBuffer = vertexBuffer;
    this.resolutionUniform = resolutionUniform;
    this.textureSizeUniform = textureSizeUniform;
    this.lightPositionUniform = lightPositionUniform;
    this.lightColorUniform = lightColorUniform;
    this.ambientColorUniform = ambientColorUniform;
    this.timeUniform = timeUniform;
    this.effectStrengthUniform = effectStrengthUniform;
    this.shadowStrengthUniform = shadowStrengthUniform;

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const stride = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const uvLocation = gl.getAttribLocation(program, "a_uv");
    const alphaLocation = gl.getAttribLocation(program, "a_alpha");

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(
      uvLocation,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT,
    );

    gl.enableVertexAttribArray(alphaLocation);
    gl.vertexAttribPointer(
      alphaLocation,
      1,
      gl.FLOAT,
      false,
      stride,
      4 * Float32Array.BYTES_PER_ELEMENT,
    );

    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = Math.max(1, Math.floor(width * devicePixelRatio));
    this.height = Math.max(1, Math.floor(height * devicePixelRatio));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.gl.viewport(0, 0, this.width, this.height);
  }

  async loadTextures(sources: readonly SpriteTextureSource[]): Promise<readonly SpriteTexture[]> {
    const loaded: SpriteTexture[] = [];

    for (const source of sources) {
      const image = await loadImage(source.url);
      const uploadSource =
        source.logicalWidth && source.logicalHeight
          ? rasterizeImage(image, source.logicalWidth, source.logicalHeight)
          : image;
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new SpriteRendererInitError(`Failed to create texture ${source.id}`, "webgl2");
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        uploadSource,
      );

      const record = {
        id: source.id,
        width: source.logicalWidth ?? image.naturalWidth,
        height: source.logicalHeight ?? image.naturalHeight,
        texture,
      };
      this.textures.set(source.id, record);
      loaded.push({ id: record.id, width: record.width, height: record.height });
    }

    return loaded;
  }

  render(draws: readonly SpriteDraw[], effects?: SpriteRenderEffects): void {
    const gl = this.gl;
    const resolvedEffects = this.resolveEffects(effects);

    gl.clearColor(
      resolvedEffects.clearColor.r,
      resolvedEffects.clearColor.g,
      resolvedEffects.clearColor.b,
      1,
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(this.resolutionUniform, this.width, this.height);
    gl.uniform2f(this.lightPositionUniform, resolvedEffects.lightPosition.x, resolvedEffects.lightPosition.y);
    gl.uniform3f(
      this.lightColorUniform,
      resolvedEffects.lightColor.r,
      resolvedEffects.lightColor.g,
      resolvedEffects.lightColor.b,
    );
    gl.uniform3f(
      this.ambientColorUniform,
      resolvedEffects.ambientColor.r,
      resolvedEffects.ambientColor.g,
      resolvedEffects.ambientColor.b,
    );
    gl.uniform1f(this.timeUniform, resolvedEffects.time);
    gl.uniform1f(this.effectStrengthUniform, resolvedEffects.strength);
    gl.uniform1f(this.shadowStrengthUniform, resolvedEffects.shadowStrength);
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    for (const draw of draws) {
      const texture = this.textures.get(draw.textureId);
      if (!texture) {
        continue;
      }

      const data = new Float32Array(draw.vertices.length * FLOATS_PER_VERTEX);
      let cursor = 0;
      for (const vertex of draw.vertices) {
        data[cursor++] = vertex.x;
        data[cursor++] = vertex.y;
        data[cursor++] = vertex.u;
        data[cursor++] = vertex.v;
        data[cursor++] = vertex.alpha;
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture.texture);
      gl.uniform2f(this.textureSizeUniform, texture.width, texture.height);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, draw.vertices.length);
    }
  }

  destroy(): void {
    for (const texture of this.textures.values()) {
      this.gl.deleteTexture(texture.texture);
    }

    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteVertexArray(this.vertexArray);
    this.gl.deleteProgram(this.program);
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
    };
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
    throw new SpriteRendererInitError("Failed to create WebGL2 sprite program", "webgl2");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown link error";
    gl.deleteProgram(program);
    throw new SpriteRendererInitError(log, "webgl2");
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
    throw new SpriteRendererInitError("Failed to create WebGL2 sprite shader", "webgl2");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown shader error";
    gl.deleteShader(shader);
    throw new SpriteRendererInitError(log, "webgl2");
  }

  return shader;
}
