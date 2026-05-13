import { describe, expect, test } from "bun:test";
import { FLOATS_PER_QUAD, packQuads, writeQuad } from "../src/engine/geometry";
import type { Quad } from "../src/renderer/renderer";

const quad: Quad = {
  position: [10, 20],
  size: 10,
  rotation: 0,
  color: [1, 0.5, 0.25, 1],
};

describe("quad geometry", () => {
  test("packs one quad into six colored vertices", () => {
    const data = packQuads([quad]);

    expect(data.length).toBe(FLOATS_PER_QUAD);
    expect([...data.slice(0, 6)]).toEqual([5, 15, 1, 0.5, 0.25, 1]);
    expect([...data.slice(-6)]).toEqual([5, 25, 1, 0.5, 0.25, 1]);
  });

  test("returns the next write offset", () => {
    const target = new Float32Array(FLOATS_PER_QUAD * 2);

    expect(writeQuad(target, quad, FLOATS_PER_QUAD)).toBe(FLOATS_PER_QUAD * 2);
  });
});
