import { add, rotate, scale, type Vec2 } from "../math/vec2";
import type { Quad } from "../renderer/renderer";

export const FLOATS_PER_VERTEX = 6;
export const VERTICES_PER_QUAD = 6;
export const FLOATS_PER_QUAD = FLOATS_PER_VERTEX * VERTICES_PER_QUAD;

const UNIT_CORNERS: readonly Vec2[] = [
  [-0.5, -0.5],
  [0.5, -0.5],
  [0.5, 0.5],
  [-0.5, -0.5],
  [0.5, 0.5],
  [-0.5, 0.5],
];

export function writeQuad(target: Float32Array<ArrayBufferLike>, quad: Quad, offset = 0): number {
  let cursor = offset;

  for (const corner of UNIT_CORNERS) {
    const p = add(quad.position, rotate(scale(corner, quad.size), quad.rotation));
    target[cursor++] = p[0];
    target[cursor++] = p[1];
    target[cursor++] = quad.color[0];
    target[cursor++] = quad.color[1];
    target[cursor++] = quad.color[2];
    target[cursor++] = quad.color[3];
  }

  return cursor;
}

export function packQuads(quads: readonly Quad[]): Float32Array<ArrayBuffer> {
  const data = new Float32Array(quads.length * FLOATS_PER_QUAD);
  let cursor = 0;

  for (const quad of quads) {
    cursor = writeQuad(data, quad, cursor);
  }

  return data;
}
