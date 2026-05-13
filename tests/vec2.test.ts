import { describe, expect, test } from "bun:test";
import { add, rotate, scale } from "../src/math/vec2";

describe("vec2", () => {
  test("adds vectors", () => {
    expect(add([2, 3], [4, -1])).toEqual([6, 2]);
  });

  test("scales vectors", () => {
    expect(scale([3, -2], 2)).toEqual([6, -4]);
  });

  test("rotates vectors", () => {
    const [x, y] = rotate([1, 0], Math.PI / 2);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
  });
});
