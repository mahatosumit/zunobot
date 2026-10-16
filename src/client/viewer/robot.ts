import {
  BufferAttribute, BufferGeometry, CanvasTexture, CapsuleGeometry, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry, Mesh,
  MeshPhysicalMaterial, Quaternion, SRGBColorSpace, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3,
  type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * A stylised ZunoBot built from primitives, matched by eye to the supplied concept renders
 * (front view is the principal reference; side and rear views for depth and the back panel).
 * It is NOT CAD geometry and encodes no validated dimensions. Units are arbitrary: about 3 units tall.
 * The pose is static. Nothing here articulates, because no movement has been validated.
 */
export interface RobotModel {
  root: Group;
  /** Model-space points the UI hotspots attach to. */
  anchors: Record<string, Vector3>;
  /** Swap the display between the open-eyed and blinking face. */
  setBlink(on: boolean): void;
  height: number;
  width: number;
  dispose(): void;
}

type Vec = [number, number, number];

function materials() {
  const shell = (color: string, rough: number, coat: number) =>
    new MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: coat, clearcoatRoughness: 0.35 });
  return {
    white: shell('#eef0f1', 0.46, 0.35),
    head: shell('#f1f2f3', 0.4, 0.45),
    blue: shell('#1d68e0', 0.34, 0.6),
    dark: new MeshPhysicalMaterial({ color: '#1b1e23', roughness: 0.45, metalness: 0.25, clearcoat: 0.3 }),
    rubber: new MeshPhysicalMaterial({ color: '#15171a', roughness: 0.85, metalness: 0 }),
    cream: shell('#efe3a6', 0.5, 0.2),
    vent: new MeshPhysicalMaterial({ color: '#0c0d0f', roughness: 0.7 }),
    metal: new MeshPhysicalMaterial({ color: '#c9ced6', roughness: 0.25, metalness: 0.9 }),
    red: shell('#d8261d', 0.4, 0.5),
    glass: new MeshPhysicalMaterial({ color: '#000000', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#ffffff', emissiveIntensity: 1.6 }),
  };
}

/**
 * Bend a geometry's vertices in place (tapers, flares). Faceted shapes recompute normals; smooth shells keep their
 * original ones, because the bends are gentle and recomputing would break the smoothing across face seams.
 */
function warp<T extends BufferGeometry>(geo: T, fn: (p: Vector3) => void, faceted = false): T {
  const pos = geo.getAttribute('position') as BufferAttribute;
  const p = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    fn(p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  if (faceted) geo.computeVertexNormals();
  return geo;
}

/** Hexagon outline (front view), counter-clockwise. */
function hexShape(hw: number, tw: number, hh: number): Shape {
  const s = new Shape();
  s.moveTo(hw, 0); s.lineTo(tw, hh); s.lineTo(-tw, hh); s.lineTo(-hw, 0); s.lineTo(-tw, -hh); s.lineTo(tw, -hh); s.closePath();
  return s;
}

/** Draws the expressive display face. `blink` swaps the happy eyes for closed lines. */
export function drawFace(canvas: HTMLCanvasElement, blink: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#07090b');
  bg.addColorStop(1, '#101418');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.scale(w / 512, h / 300);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#38e8dc';
  ctx.shadowColor = 'rgba(56, 232, 220, 0.9)';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 13;
  ctx.beginPath();
  if (blink) {
    ctx.moveTo(115, 120); ctx.lineTo(190, 120);
    ctx.moveTo(322, 120); ctx.lineTo(397, 120);
  } else {
    ctx.arc(152, 132, 38, Math.PI * 1.05, Math.PI * 1.95);
    ctx.moveTo(398, 132);
    ctx.arc(360, 132, 38, Math.PI * 1.05, Math.PI * 1.95);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 145, 96, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.restore();
}

function faceTexture(blink: boolean): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 300;
  drawFace(c, blink);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildRobot(): RobotModel {
  const m = materials();
  const root = new Group();
  root.name = 'ZunoBot (stylised)';

  const add = (geo: BufferGeometry, mat: Material, at: Vec = [0, 0, 0], rot?: Vec): Mesh => {
    const mesh = new Mesh(geo, mat);
    mesh.position.set(...at);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  /** A capsule (or cylinder) spanning two points. */
  const up = new Vector3(0, 1, 0);
  const span = (a: Vec, b: Vec, r: number, mat: Material, capsule = true): Mesh => {
    const va = new Vector3(...a), vb = new Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const geo = capsule ? new CapsuleGeometry(r, Math.max(0.001, len), 6, 20) : new CylinderGeometry(r, r, len, 24);
    const mesh = add(geo, mat, va.clone().add(vb).multiplyScalar(0.5).toArray() as Vec);
    mesh.quaternion.copy(new Quaternion().setFromUnitVectors(up, dir.normalize()));
    return mesh;
  };
  const lerpV = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // --- Drive base: two driven wheels and a rear support point -------------------------------
  const tire = new LatheGeometry([
    new Vector2(0.17, -0.12), new Vector2(0.27, -0.12), new Vector2(0.295, -0.09), new Vector2(0.3, 0),
    new Vector2(0.295, 0.09), new Vector2(0.27, 0.12), new Vector2(0.17, 0.12),
  ], 48);
  for (const side of [-1, 1]) {
    add(tire, m.rubber, [side * 0.46, 0.3, 0.04], [0, 0, Math.PI / 2]);
    add(new CylinderGeometry(0.18, 0.18, 0.2, 32), m.dark, [side * 0.46, 0.3, 0.04], [0, 0, Math.PI / 2]);
  }
  add(new SphereGeometry(0.07, 20, 12), m.dark, [0, 0.07, -0.36]);

  // --- Lower body: two tall pods either side of a centre channel ---------------------------
  const pod = (side: number): BufferGeometry => warp(new RoundedBoxGeometry(0.62, 1.06, 1.0, 5, 0.2), (p) => {
    const t = (0.53 - p.y) / 1.06; // 0 at top, 1 at bottom: flare gently outwards and backwards
    if (p.x * side > 0) p.x += side * 0.035 * t;
    if (p.z < 0) p.z -= 0.07 * t;
  });
  for (const side of [-1, 1]) {
    add(pod(side), m.white, [side * 0.47, 0.75, 0]);
    for (let i = 0; i < 4; i++) add(new RoundedBoxGeometry(0.17, 0.028, 0.04, 2, 0.012), m.vent, [side * 0.34, 0.95 - i * 0.055, 0.5]);
  }
  add(new RoundedBoxGeometry(0.4, 1.06, 0.88, 3, 0.06), m.white, [0, 0.75, -0.02]);
  add(new RoundedBoxGeometry(0.34, 1.3, 0.06, 3, 0.02), m.blue, [0, 0.86, 0.44]);
  add(new RoundedBoxGeometry(0.25, 0.25, 0.04, 3, 0.02), m.white, [0, 0.66, 0.47]);
  add(new RoundedBoxGeometry(0.2, 0.2, 0.04, 3, 0.015), m.cream, [0, 0.66, 0.48]);
  // Rear: the blue centre strip continues down the back, framed by the wheel housings
  add(new RoundedBoxGeometry(0.3, 0.95, 0.06, 3, 0.02), m.blue, [0, 0.7, -0.46]);

  // --- Torso -------------------------------------------------------------------------------
  add(new RoundedBoxGeometry(1.16, 1.02, 0.9, 6, 0.3), m.white, [0, 1.6, 0]);
  add(new RoundedBoxGeometry(0.68, 0.5, 0.1, 4, 0.06), m.blue, [0, 1.85, 0.41]);
  add(new RoundedBoxGeometry(0.48, 0.3, 0.06, 3, 0.03), m.white, [0, 1.85, 0.46]);
  add(new RoundedBoxGeometry(0.41, 0.23, 0.04, 3, 0.02), m.cream, [0, 1.85, 0.48]);
  add(new CylinderGeometry(0.08, 0.08, 0.05, 32), m.red, [0, 1.84, -0.45], [Math.PI / 2, 0, 0]);

  // --- Neck and head -------------------------------------------------------------------------
  add(new CylinderGeometry(0.17, 0.19, 0.16, 32), m.dark, [0, 2.17, 0]);
  add(new CylinderGeometry(0.34, 0.34, 0.03, 40), m.dark, [0, 2.245, -0.02]).scale.set(1.3, 1, 1);
  const headY = 2.66, depth = 0.98, bevel = 0.04;
  const head = warp(new ExtrudeGeometry(hexShape(0.7, 0.5, 0.39), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1 }), (p) => {
    const t = Math.min(1, Math.max(0, p.z / depth)); // 0 at the back, 1 at the front
    p.x *= 0.8 + 0.2 * t;
    p.y *= 0.9 + 0.1 * t;
    p.z -= depth / 2;
  }, true);
  add(head, m.head, [0, headY, 0]);
  const front = depth / 2 + bevel;
  // Display: a dark hexagonal screen set into the bezel, with UVs normalised to its bounds.
  const disp = new ShapeGeometry(hexShape(0.61, 0.42, 0.33));
  {
    const pos = disp.getAttribute('position') as BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) + 0.61) / 1.22; uv[i * 2 + 1] = (pos.getY(i) + 0.33) / 0.66; }
    disp.setAttribute('uv', new BufferAttribute(uv, 2));
  }
  const faceOpen = faceTexture(false), faceBlink = faceTexture(true);
  m.glass.emissiveMap = faceOpen;
  const screen = add(disp, m.glass, [0, headY, front + 0.003]);
  screen.castShadow = false;

  // --- Arms: static pose matched to the front render (not a movement claim) ------------------
  const shoulderY = 1.86;
  for (const side of [-1, 1]) {
    add(new CylinderGeometry(0.14, 0.14, 0.12, 32), m.dark, [side * 0.62, shoulderY, 0], [0, 0, Math.PI / 2]);
    add(new TorusGeometry(0.15, 0.03, 12, 40), m.blue, [side * 0.68, shoulderY, 0], [0, Math.PI / 2, 0]);
    add(new SphereGeometry(0.035, 16, 10), m.metal, [side * 0.69, shoulderY, 0]);
  }
  // Screen-left arm hangs, ending in a simplified two-finger gripper
  {
    const sh: Vec = [-0.7, shoulderY, 0], el: Vec = [-0.85, 1.43, 0.05], wr: Vec = [-0.83, 0.98, 0.1];
    span(sh, el, 0.045, m.blue);
    add(new SphereGeometry(0.08, 24, 14), m.dark, el);
    span(el, wr, 0.075, m.dark);
    span(lerpV(el, wr, 0.55), lerpV(el, wr, 0.68), 0.082, m.blue, false);
    add(new RoundedBoxGeometry(0.11, 0.08, 0.11, 2, 0.02), m.blue, [wr[0], wr[1] - 0.07, wr[2]]);
    for (const f of [-1, 1]) add(new RoundedBoxGeometry(0.03, 0.13, 0.045, 2, 0.012), m.blue, [wr[0] + f * 0.03, wr[1] - 0.17, wr[2]]);
  }
  // Screen-right arm bends forward: the "thumbs up" pose from the render
  {
    const sh: Vec = [0.7, shoulderY, 0], el: Vec = [0.85, 1.42, 0.08], wr: Vec = [1.1, 1.33, 0.52];
    span(sh, el, 0.045, m.blue);
    add(new SphereGeometry(0.08, 24, 14), m.dark, el);
    span(el, wr, 0.075, m.dark);
    span(lerpV(el, wr, 0.6), lerpV(el, wr, 0.72), 0.082, m.blue, false);
    add(new RoundedBoxGeometry(0.15, 0.14, 0.15, 3, 0.04), m.blue, [wr[0] + 0.04, wr[1], wr[2] + 0.06], [0, 0.5, 0]);
    add(new RoundedBoxGeometry(0.055, 0.13, 0.055, 2, 0.02), m.blue, [wr[0] + 0.02, wr[1] + 0.12, wr[2] + 0.06], [0, 0.5, 0]);
  }

  return {
    root,
    anchors: {
      display: new Vector3(0.6, headY + 0.24, front),
      torso: new Vector3(0, 1.85, 0.52),
      drive: new Vector3(0.6, 0.3, 0.12),
      arms: new Vector3(0.98, 1.37, 0.32),
    },
    setBlink(on) {
      m.glass.emissiveMap = on ? faceBlink : faceOpen;
    },
    height: 3.05,
    width: 2.3,
    dispose() {
      const geos = new Set<BufferGeometry>();
      root.traverse((o) => { if (o instanceof Mesh) geos.add(o.geometry as BufferGeometry); });
      geos.forEach((g) => g.dispose());
      Object.values(m).forEach((mat) => mat.dispose());
      faceOpen.dispose();
      faceBlink.dispose();
    },
  };
}
