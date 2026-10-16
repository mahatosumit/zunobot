/** Minimal column-major 4x4 matrix and vector helpers for the product viewer. */
export type Mat4 = Float32Array;
export type Vec3 = [number, number, number];

export const identity = (): Mat4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += (a[k * 4 + r] as number) * (b[c * 4 + k] as number);
      o[c * 4 + r] = s;
    }
  }
  return o;
}

export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat4 {
  const z = normalize(sub(eye, target));
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function normalize(a: Vec3): Vec3 {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function translation(x: number, y: number, z: number): Mat4 {
  const m = identity();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}
export function scaling(x: number, y: number, z: number): Mat4 {
  const m = identity();
  m[0] = x; m[5] = y; m[10] = z;
  return m;
}
export function rotationX(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a), m = identity();
  m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
  return m;
}
export function rotationY(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a), m = identity();
  m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
  return m;
}
export function rotationZ(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a), m = identity();
  m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
  return m;
}

/** Rotation that takes +Y onto the given direction (used to orient capsules and cylinders between two points). */
export function rotationFromY(dir: Vec3): Mat4 {
  const d = normalize(dir);
  const y: Vec3 = [0, 1, 0];
  const c = dot(y, d);
  if (c > 0.99999) return identity();
  if (c < -0.99999) return rotationX(Math.PI);
  const axis = normalize(cross(y, d));
  const angle = Math.acos(c);
  const [x, yy, z] = axis;
  const s = Math.sin(angle), co = Math.cos(angle), t = 1 - co;
  return new Float32Array([
    t * x * x + co, t * x * yy + s * z, t * x * z - s * yy, 0,
    t * x * yy - s * z, t * yy * yy + co, t * yy * z + s * x, 0,
    t * x * z + s * yy, t * yy * z - s * x, t * z * z + co, 0,
    0, 0, 0, 1,
  ]);
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const x = p[0], y = p[1], z = p[2];
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number),
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number),
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number),
  ];
}

/** Projects a world point to normalised device coordinates. `w` <= 0 means behind the camera. */
export function project(viewProj: Mat4, p: Vec3): { x: number; y: number; w: number } {
  const x = p[0], y = p[1], z = p[2];
  const cx = (viewProj[0] as number) * x + (viewProj[4] as number) * y + (viewProj[8] as number) * z + (viewProj[12] as number);
  const cy = (viewProj[1] as number) * x + (viewProj[5] as number) * y + (viewProj[9] as number) * z + (viewProj[13] as number);
  const cw = (viewProj[3] as number) * x + (viewProj[7] as number) * y + (viewProj[11] as number) * z + (viewProj[15] as number);
  return { x: cx / cw, y: cy / cw, w: cw };
}
