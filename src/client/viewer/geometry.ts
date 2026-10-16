import { type Mat4, type Vec3, cross, normalize, sub, rotationFromY, multiply, translation } from './math';

/** Plain, mergeable mesh data. Indices address vertices within this mesh. */
export interface MeshData {
  pos: number[];
  nor: number[];
  uv: number[];
  idx: number[];
}

const empty = (): MeshData => ({ pos: [], nor: [], uv: [], idx: [] });

/** Applies an affine transform to positions and the inverse-transpose to normals. */
export function transformMesh(m: MeshData, t: Mat4): MeshData {
  const n = normalMatrix(t);
  const out = empty();
  for (let i = 0; i < m.pos.length; i += 3) {
    const x = m.pos[i] as number, y = m.pos[i + 1] as number, z = m.pos[i + 2] as number;
    out.pos.push((t[0] as number) * x + (t[4] as number) * y + (t[8] as number) * z + (t[12] as number),
      (t[1] as number) * x + (t[5] as number) * y + (t[9] as number) * z + (t[13] as number),
      (t[2] as number) * x + (t[6] as number) * y + (t[10] as number) * z + (t[14] as number));
    const nx = m.nor[i] as number, ny = m.nor[i + 1] as number, nz = m.nor[i + 2] as number;
    const v = normalize([n[0] * nx + n[3] * ny + n[6] * nz, n[1] * nx + n[4] * ny + n[7] * nz, n[2] * nx + n[5] * ny + n[8] * nz]);
    out.nor.push(v[0], v[1], v[2]);
  }
  out.uv = m.uv.slice();
  out.idx = m.idx.slice();
  return out;
}

/** Inverse-transpose of the upper 3x3, column-major. */
type M3 = [number, number, number, number, number, number, number, number, number];
function normalMatrix(t: Mat4): M3 {
  const a = t[0] as number, b = t[1] as number, c = t[2] as number;
  const d = t[4] as number, e = t[5] as number, f = t[6] as number;
  const g = t[8] as number, h = t[9] as number, i = t[10] as number;
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e) || 1;
  const inv: M3 = [
    (e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det,
    (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det,
    (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det,
  ];
  // inv is the inverse (column-major); normals use its transpose.
  return [inv[0], inv[3], inv[6], inv[1], inv[4], inv[7], inv[2], inv[5], inv[8]];
}

export function merge(meshes: MeshData[]): MeshData {
  const out = empty();
  for (const m of meshes) {
    const base = out.pos.length / 3;
    for (const v of m.pos) out.pos.push(v);
    for (const v of m.nor) out.nor.push(v);
    for (const v of m.uv) out.uv.push(v);
    for (const i of m.idx) out.idx.push(i + base);
  }
  return out;
}

/** Box with rounded edges and corners. Smooth normals come from the offset-sphere construction. */
export function roundedBox(w: number, h: number, d: number, r: number, seg = 8): MeshData {
  const m = empty();
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const rr = Math.min(r, hx, hy, hz);
  const faces: Array<[Vec3, Vec3, Vec3]> = [
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  for (const [n, u, v] of faces) {
    const base = m.pos.length / 3;
    for (let j = 0; j <= seg; j++) {
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * 2 - 1, b = (j / seg) * 2 - 1;
        // Distribute vertices so corners get more resolution than flats.
        const sa = Math.sign(a) * Math.pow(Math.abs(a), 1.6), sb = Math.sign(b) * Math.pow(Math.abs(b), 1.6);
        const p: Vec3 = [0, 0, 0];
        p[0] = n[0] * hx + u[0] * sa * hx + v[0] * sb * hx;
        p[1] = n[1] * hy + u[1] * sa * hy + v[1] * sb * hy;
        p[2] = n[2] * hz + u[2] * sa * hz + v[2] * sb * hz;
        const inner: Vec3 = [
          Math.max(-(hx - rr), Math.min(hx - rr, p[0])),
          Math.max(-(hy - rr), Math.min(hy - rr, p[1])),
          Math.max(-(hz - rr), Math.min(hz - rr, p[2])),
        ];
        const nn = normalize(sub(p, inner));
        m.pos.push(inner[0] + nn[0] * rr, inner[1] + nn[1] * rr, inner[2] + nn[2] * rr);
        m.nor.push(nn[0], nn[1], nn[2]);
        m.uv.push(i / seg, j / seg);
      }
    }
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = base + j * (seg + 1) + i, b = a + 1, c = a + seg + 1, e = c + 1;
        // Winding chosen so the outward face is counter-clockwise for all six faces.
        const flip = cross(u, v)[0] * n[0] + cross(u, v)[1] * n[1] + cross(u, v)[2] * n[2] < 0;
        if (flip) m.idx.push(a, b, c, b, e, c);
        else m.idx.push(a, c, b, b, c, e);
      }
    }
  }
  return m;
}

/** A strip is a polyline of [radius, y] points revolved around Y. Smooth normals within a strip, hard edges between strips. */
export function lathe(strips: Array<Array<[number, number]>>, segments = 36): MeshData {
  const m = empty();
  for (const strip of strips) {
    const base = m.pos.length / 3;
    const count = strip.length;
    // Profile normals (outward = rotate the tangent by -90 degrees in the r,y plane)
    const normals: Array<[number, number]> = strip.map((_, i) => {
      const prev = strip[Math.max(0, i - 1)] as [number, number];
      const next = strip[Math.min(count - 1, i + 1)] as [number, number];
      const tr = next[0] - prev[0], ty = next[1] - prev[1];
      const l = Math.hypot(tr, ty) || 1;
      return [ty / l, -tr / l];
    });
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      strip.forEach(([r, y], i) => {
        const [nr, ny] = normals[i] as [number, number];
        m.pos.push(r * ca, y, r * sa);
        m.nor.push(nr * ca, ny, nr * sa);
        m.uv.push(s / segments, i / (count - 1));
      });
    }
    for (let s = 0; s < segments; s++) {
      for (let i = 0; i < count - 1; i++) {
        const a = base + s * count + i, b = a + 1, c = a + count, d = c + 1;
        m.idx.push(a, b, c, b, d, c);
      }
    }
  }
  return m;
}

export function cylinder(radius: number, height: number, segments = 32, radiusTop = radius): MeshData {
  const h = height / 2;
  return lathe([[[0, -h], [radius, -h]], [[radius, -h], [radiusTop, h]], [[radiusTop, h], [0, h]]], segments);
}

/** Rounded-end cylinder from y=0 to y=length. */
export function capsule(radius: number, length: number, segments = 20, rings = 6): MeshData {
  const strip: Array<[number, number]> = [];
  for (let i = 0; i <= rings; i++) {
    const a = (i / rings) * (Math.PI / 2);
    strip.push([Math.sin(a) * radius, -Math.cos(a) * radius]);
  }
  for (let i = 0; i <= rings; i++) {
    const a = (i / rings) * (Math.PI / 2);
    strip.push([Math.cos(a) * radius, length + Math.sin(a) * radius]);
  }
  return lathe([strip], segments);
}

export function sphere(radius: number, segments = 28, rings = 16): MeshData {
  const strip: Array<[number, number]> = [];
  for (let i = 0; i <= rings; i++) {
    const a = -Math.PI / 2 + (i / rings) * Math.PI;
    strip.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return lathe([strip], segments);
}

export function torus(major: number, minor: number, segments = 40, tube = 14): MeshData {
  const strip: Array<[number, number]> = [];
  for (let i = 0; i <= tube; i++) {
    const a = (i / tube) * Math.PI * 2;
    strip.push([major + Math.cos(a) * minor, Math.sin(a) * minor]);
  }
  return lathe([strip], segments);
}

/** Capsule spanning two points. */
export function capsuleBetween(a: Vec3, b: Vec3, radius: number, segments = 20): MeshData {
  const dir = sub(b, a);
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  const t = multiply(translation(a[0], a[1], a[2]), rotationFromY(dir));
  return transformMesh(capsule(radius, len, segments), t);
}

/** Flat-shaded loft between two convex rings of equal vertex count, with fan caps. Rings are counter-clockwise seen from +Z. */
export function loft(front: Vec3[], back: Vec3[]): MeshData {
  const m = empty();
  const n = front.length;
  const push = (p: Vec3, nor: Vec3, uv: [number, number]): number => {
    m.pos.push(p[0], p[1], p[2]);
    m.nor.push(nor[0], nor[1], nor[2]);
    m.uv.push(uv[0], uv[1]);
    return m.pos.length / 3 - 1;
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const f0 = front[i] as Vec3, f1 = front[j] as Vec3, b0 = back[i] as Vec3, b1 = back[j] as Vec3;
    const nor = normalize(cross(sub(f1, f0), sub(b0, f0)));
    const a = push(f0, nor, [0, 0]), b = push(f1, nor, [1, 0]), c = push(b1, nor, [1, 1]), d = push(b0, nor, [0, 1]);
    m.idx.push(a, d, c, a, c, b);
  }
  for (const [ring, sign] of [[front, 1], [back, -1]] as const) {
    const nor: Vec3 = [0, 0, sign];
    const idxs = ring.map((p) => push(p, nor, [0, 0]));
    for (let i = 1; i < n - 1; i++) {
      if (sign > 0) m.idx.push(idxs[0] as number, idxs[i] as number, idxs[i + 1] as number);
      else m.idx.push(idxs[0] as number, idxs[i + 1] as number, idxs[i] as number);
    }
  }
  return m;
}

/** Convex polygon facing +Z at depth z, UVs fitted to the polygon's bounds (used for the display). */
export function polygonFront(points: Array<[number, number]>, z: number): MeshData {
  const m = empty();
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  for (const [x, y] of points) {
    m.pos.push(x, y, z);
    m.nor.push(0, 0, 1);
    m.uv.push((x - minX) / (maxX - minX), (y - minY) / (maxY - minY));
  }
  for (let i = 1; i < points.length - 1; i++) m.idx.push(0, i, i + 1);
  return m;
}
