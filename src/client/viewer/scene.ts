import {
  type MeshData, capsuleBetween, cylinder, lathe, loft, merge, polygonFront, roundedBox, sphere, torus, transformMesh,
} from './geometry';
import { type Mat4, type Vec3, rotationY, rotationZ, translation } from './math';

/**
 * A stylised ZunoBot built from primitives, matched by eye to the supplied concept renders
 * (front view is the principal reference). It is NOT CAD geometry and encodes no validated dimensions.
 * Units are arbitrary; the model is about 3.07 units tall.
 */
export interface Material {
  id: string;
  /** sRGB colour, 0..1 */
  color: Vec3;
  rough: number;
  /** Clear-coat strength: glossy studio reflections on top of the base colour. */
  coat: number;
  /** Self-illumination (the display). */
  emissive?: number;
  textured?: boolean;
}
export interface Batch { material: Material; mesh: MeshData }
export interface RobotModel {
  batches: Batch[];
  /** World-space points the UI hotspots attach to. */
  anchors: Record<string, Vec3>;
  /** Approximate bounds used to frame the camera. */
  height: number;
  width: number;
}

const hex = (s: string): Vec3 => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];

export const MATERIALS = {
  white: { id: 'white', color: hex('#e9ecee'), rough: 0.42, coat: 0.32 },
  head: { id: 'head', color: hex('#eceef0'), rough: 0.36, coat: 0.4 },
  blue: { id: 'blue', color: hex('#1f6de6'), rough: 0.3, coat: 0.5 },
  dark: { id: 'dark', color: hex('#1a1d21'), rough: 0.42, coat: 0.35 },
  rubber: { id: 'rubber', color: hex('#141619'), rough: 0.78, coat: 0.05 },
  cream: { id: 'cream', color: hex('#e4ddbf'), rough: 0.5, coat: 0.2 },
  vent: { id: 'vent', color: hex('#0d0e10'), rough: 0.6, coat: 0.0 },
  glass: { id: 'glass', color: hex('#06080a'), rough: 0.12, coat: 0.9, emissive: 1.0, textured: true },
} satisfies Record<string, Material>;

const at = (m: MeshData, x: number, y: number, z: number): MeshData => transformMesh(m, translation(x, y, z));
const xf = (m: MeshData, t: Mat4): MeshData => transformMesh(m, t);

/** Hexagonal head outline (front view), counter-clockwise seen from +Z. */
function hexRing(hw: number, tw: number, hh: number, z: number, cy = 0): Vec3[] {
  return [[hw, cy, z], [tw, cy + hh, z], [-tw, cy + hh, z], [-hw, cy, z], [-tw, cy - hh, z], [tw, cy - hh, z]];
}

export function buildRobot(): RobotModel {
  const parts: Record<keyof typeof MATERIALS, MeshData[]> = { white: [], head: [], blue: [], dark: [], rubber: [], cream: [], vent: [], glass: [] };

  // --- Drive base -----------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const tire = lathe([
      [[0.12, -0.105], [0.235, -0.105], [0.265, -0.07]],
      [[0.265, -0.07], [0.275, 0], [0.265, 0.07]],
      [[0.265, 0.07], [0.235, 0.105], [0.12, 0.105]],
    ], 40);
    parts.rubber.push(at(xf(tire, rotationZ(Math.PI / 2)), side * 0.5, 0.275, 0.02));
    parts.dark.push(at(xf(cylinder(0.14, 0.215, 28), rotationZ(Math.PI / 2)), side * 0.5, 0.275, 0.02));
  }
  // Lower body: two bulging pods read as one shell with a centre channel
  parts.white.push(at(roundedBox(1.52, 1.1, 1.16, 0.34, 10), 0, 0.77, 0));
  parts.blue.push(at(roundedBox(0.36, 1.0, 0.05, 0.02, 3), 0, 0.77, 0.575));
  parts.cream.push(at(roundedBox(0.27, 0.27, 0.045, 0.02, 3), 0, 0.5, 0.6));
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      parts.vent.push(at(roundedBox(0.2, 0.034, 0.03, 0.012, 2), side * 0.6, 0.86 - i * 0.075, 0.51));
    }
  }

  // --- Torso ----------------------------------------------------------------------------------
  parts.white.push(at(roundedBox(1.16, 0.92, 0.98, 0.26, 10), 0, 1.65, 0));
  parts.blue.push(at(roundedBox(0.36, 0.3, 0.05, 0.02, 3), 0, 1.38, 0.5));
  // Chest panel: blue shell, white frame, pale window
  parts.blue.push(at(roundedBox(0.72, 0.48, 0.06, 0.07, 6), 0, 1.86, 0.5));
  parts.white.push(at(roundedBox(0.5, 0.28, 0.05, 0.03, 4), 0, 1.86, 0.535));
  parts.cream.push(at(roundedBox(0.43, 0.21, 0.04, 0.02, 3), 0, 1.86, 0.555));

  // --- Neck and head --------------------------------------------------------------------------
  parts.dark.push(at(cylinder(0.155, 0.22, 28), 0, 2.17, 0));
  const hy = 2.66;
  const bezel = loft(hexRing(0.69, 0.46, 0.41, 0.66, hy), hexRing(0.745, 0.5, 0.435, 0.6, hy));
  const shell = loft(hexRing(0.745, 0.5, 0.435, 0.6, hy), hexRing(0.5, 0.36, 0.4, -0.62, hy));
  parts.head.push(bezel, shell);
  // Display: a slightly smaller hexagon sitting on the bezel face
  const dw = 0.63, dt = 0.415, dh = 0.355;
  parts.glass.push(polygonFront([[dw, hy], [dt, hy + dh], [-dt, hy + dh], [-dw, hy], [-dt, hy - dh], [dt, hy - dh]], 0.664));

  // --- Arms (static pose, matched to the front render; not a movement claim) -----------------
  const shoulderY = 1.9;
  for (const side of [-1, 1]) {
    const disc = xf(cylinder(0.15, 0.13, 28), rotationZ(Math.PI / 2));
    parts.dark.push(at(disc, side * 0.64, shoulderY, 0));
    parts.blue.push(at(xf(torus(0.165, 0.032, 40, 12), rotationZ(Math.PI / 2)), side * 0.7, shoulderY, 0));
  }
  // Screen-left arm hangs
  {
    const sh: Vec3 = [-0.68, shoulderY, 0], el: Vec3 = [-0.82, 1.46, 0.04], wr: Vec3 = [-0.8, 0.98, 0.1];
    parts.blue.push(capsuleBetween(sh, el, 0.05));
    parts.dark.push(at(sphere(0.085), el[0], el[1], el[2]));
    parts.dark.push(capsuleBetween(el, wr, 0.078));
    parts.blue.push(capsuleBetween([el[0] + 0.01, el[1] - 0.2, el[2] + 0.005], [el[0] + 0.0, el[1] - 0.25, el[2] + 0.01], 0.085));
    parts.blue.push(capsuleBetween([wr[0], wr[1] + 0.02, wr[2]], [wr[0] - 0.005, wr[1] - 0.16, wr[2] + 0.01], 0.06));
  }
  // Screen-right arm bends forward and out
  {
    const sh: Vec3 = [0.68, shoulderY, 0], el: Vec3 = [0.8, 1.44, 0.1], wr: Vec3 = [1.18, 1.3, 0.52];
    parts.blue.push(capsuleBetween(sh, el, 0.05));
    parts.dark.push(at(sphere(0.085), el[0], el[1], el[2]));
    parts.dark.push(capsuleBetween(el, wr, 0.078));
    const mid: Vec3 = [el[0] + (wr[0] - el[0]) * 0.62, el[1] + (wr[1] - el[1]) * 0.62, el[2] + (wr[2] - el[2]) * 0.62];
    parts.blue.push(capsuleBetween([mid[0] - 0.03, mid[1] + 0.005, mid[2] - 0.03], [mid[0] + 0.03, mid[1] - 0.005, mid[2] + 0.03], 0.086));
    parts.blue.push(at(xf(roundedBox(0.17, 0.15, 0.14, 0.04, 4), rotationY(0.5)), wr[0] + 0.07, wr[1] + 0.02, wr[2] + 0.05));
    parts.blue.push(at(xf(roundedBox(0.06, 0.12, 0.06, 0.025, 3), rotationY(0.5)), wr[0] + 0.07, wr[1] + 0.14, wr[2] + 0.05));
  }

  const batches: Batch[] = (Object.keys(parts) as Array<keyof typeof MATERIALS>)
    .filter((k) => parts[k].length > 0)
    .map((k) => ({ material: MATERIALS[k], mesh: merge(parts[k]) }));

  return {
    batches,
    anchors: {
      display: [0.62, hy + 0.22, 0.7],
      torso: [0, 1.86, 0.58],
      drive: [0.5, 0.2, 0.12],
      arms: [0.98, 1.36, 0.32],
    },
    height: 3.07,
    width: 2.4,
  };
}

/** Draws the expressive display face. `blink` swaps the happy eyes for closed lines. */
export function drawFace(canvas: HTMLCanvasElement, blink: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b0d10');
  bg.addColorStop(1, '#13171b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.scale(w / 512, h / 300);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#38e8dc';
  ctx.shadowColor = 'rgba(56, 232, 220, 0.9)';
  ctx.shadowBlur = 22;
  ctx.lineWidth = 13;
  ctx.beginPath();
  if (blink) {
    ctx.moveTo(110, 120); ctx.lineTo(190, 120);
    ctx.moveTo(322, 120); ctx.lineTo(402, 120);
  } else {
    ctx.arc(150, 130, 40, Math.PI * 1.05, Math.PI * 1.95);
    ctx.moveTo(402, 130);
    ctx.arc(362, 130, 40, Math.PI * 1.05, Math.PI * 1.95);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 150, 100, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
  ctx.restore();
}

