export type Vec2 = readonly [x: number, y: number];

export function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function scale(v: Vec2, scalar: number): Vec2 {
  return [v[0] * scalar, v[1] * scalar];
}

export function rotate(v: Vec2, radians: number): Vec2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}
