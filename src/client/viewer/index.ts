import { type Vec3, clamp, lerp, lerp3, lookAt, multiply, perspective, project } from './math';
import { createRenderer } from './renderer';
import { buildRobot, drawFace } from './scene';

/**
 * ZunoBot product viewer: a small, dependency-free WebGL 2 renderer.
 * Public surface is intentionally tiny (createViewer / ProductViewer) so it can be replaced by
 * a three.js / React Three Fiber implementation loading a real GLB once approved CAD exists.
 */
export interface AnchorState { x: number; y: number; facing: boolean }
export interface ViewerOptions {
  reducedMotion: boolean;
  onAnchors?: (anchors: Record<string, AnchorState>) => void;
  onAutoRotateChange?: (on: boolean) => void;
  /** Called if the GPU context is lost; the caller should fall back to the static render. */
  onLost?: () => void;
}
export interface ProductViewer {
  resetView(): void;
  focusPart(id: string | null): void;
  setAutoRotate(on: boolean): void;
  readonly autoRotate: boolean;
  dispose(): void;
}

const FOV = (28 * Math.PI) / 180;
const YAW_LIMIT = 1.25;
const PITCH_MIN = -0.02;
const PITCH_MAX = 0.42;
const BASE_PITCH = 0.1;
const BASE_TARGET: Vec3 = [0, 1.5, 0];

interface Focus { target: Vec3; zoom: number; yaw: number; pitch: number }
const FOCUS: Record<string, Focus> = {
  display: { target: [0, 2.55, 0], zoom: 0.52, yaw: 0.18, pitch: 0.06 },
  torso: { target: [0, 1.6, 0], zoom: 0.72, yaw: -0.18, pitch: 0.1 },
  drive: { target: [0, 0.55, 0], zoom: 0.7, yaw: 0.28, pitch: 0.2 },
  arms: { target: [0.45, 1.5, 0], zoom: 0.72, yaw: -0.5, pitch: 0.1 },
};
const HOME: Focus = { target: BASE_TARGET, zoom: 1, yaw: 0, pitch: BASE_PITCH };

export function createViewer(mount: HTMLElement, opts: ViewerOptions): ProductViewer {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const faceOpen = document.createElement('canvas');
  const faceBlink = document.createElement('canvas');
  for (const c of [faceOpen, faceBlink]) { c.width = 512; c.height = 300; }
  drawFace(faceOpen, false);
  drawFace(faceBlink, true);

  const model = buildRobot();
  const renderer = createRenderer(canvas, model, { open: faceOpen, blink: faceBlink });
  mount.appendChild(canvas);

  // --- state ---------------------------------------------------------------------------------
  let width = 1, height = 1;
  let dprCap = window.matchMedia('(pointer: coarse)').matches ? 1.75 : 2;
  let mirror = true;
  let blink = false;
  let visible = true;
  let disposed = false;
  let autoRotate = !opts.reducedMotion;
  let raf = 0;
  let needsFrame = true;
  let lastT = 0;
  let autoT = 0;

  const cam = { yaw: 0, pitch: BASE_PITCH, target: [...BASE_TARGET] as Vec3, zoom: 1 };
  const goal = { yaw: 0, pitch: BASE_PITCH, target: [...BASE_TARGET] as Vec3, zoom: 1 };
  const frameTimes: number[] = [];

  const baseDistance = (): number => {
    const aspect = width / height;
    const t = Math.tan(FOV / 2);
    return Math.max((model.height / 2 + 0.62) / t, (model.width / 2 + 0.18) / (t * aspect));
  };

  function draw(): void {
    const dist = baseDistance() * cam.zoom;
    const eye: Vec3 = [
      cam.target[0] + dist * Math.sin(cam.yaw) * Math.cos(cam.pitch),
      cam.target[1] + dist * Math.sin(cam.pitch),
      cam.target[2] + dist * Math.cos(cam.yaw) * Math.cos(cam.pitch),
    ];
    const view = lookAt(eye, cam.target);
    const proj = perspective(FOV, width / height, 0.5, 60);
    const viewProj = multiply(proj, view);
    renderer.render(viewProj, eye, { mirror, blink });

    if (opts.onAnchors) {
      const out: Record<string, AnchorState> = {};
      for (const [id, p] of Object.entries(model.anchors)) {
        const q = project(viewProj, p);
        out[id] = { x: (q.x * 0.5 + 0.5) * 100, y: (1 - (q.y * 0.5 + 0.5)) * 100, facing: Math.abs(cam.yaw) < 1.05 && q.w > 0 };
      }
      opts.onAnchors(out);
    }
  }

  function tick(t: number): void {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0.016;
    lastT = t;

    if (autoRotate) {
      autoT += dt;
      goal.yaw = Math.sin((autoT / 16) * Math.PI * 2) * 0.32;
    }
    const k = 1 - Math.exp(-dt * 7);
    cam.yaw = lerp(cam.yaw, goal.yaw, k);
    cam.pitch = lerp(cam.pitch, goal.pitch, k);
    cam.zoom = lerp(cam.zoom, goal.zoom, k);
    const nt = lerp3(cam.target, goal.target, k);
    cam.target[0] = nt[0]; cam.target[1] = nt[1]; cam.target[2] = nt[2];

    draw();

    // Adaptive quality: if the first animated frames are slow, drop resolution and the floor reflection.
    if (frameTimes.length < 40 && dt > 0.001) {
      frameTimes.push(dt);
      if (frameTimes.length === 40) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        if (avg > 0.034 && dprCap > 1) { dprCap = 1; mirror = false; resize(); }
        else if (avg > 0.034) mirror = false;
      }
    }

    const settled = Math.abs(cam.yaw - goal.yaw) < 0.0005 && Math.abs(cam.pitch - goal.pitch) < 0.0005 && Math.abs(cam.zoom - goal.zoom) < 0.0005
      && Math.hypot(cam.target[0] - goal.target[0], cam.target[1] - goal.target[1], cam.target[2] - goal.target[2]) < 0.0005;
    if (autoRotate || !settled || needsFrame) {
      needsFrame = false;
      raf = requestAnimationFrame(tick);
    } else {
      lastT = 0; // idle: stop the loop until something changes
    }
  }

  function requestFrame(): void {
    needsFrame = true;
    if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }

  function resize(): void {
    const r = mount.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, dprCap));
    requestFrame();
  }

  // --- interaction ---------------------------------------------------------------------------
  const stopAuto = (): void => {
    if (!autoRotate) return;
    autoRotate = false;
    opts.onAutoRotateChange?.(false);
  };
  let dragging: { id: number; x: number; y: number; touch: boolean } | null = null;
  const onDown = (e: PointerEvent): void => {
    dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
    mount.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent): void => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
    dragging.x = e.clientX; dragging.y = e.clientY;
    if (dx !== 0 || dy !== 0) stopAuto();
    goal.yaw = clamp(goal.yaw - dx * 0.0085, -YAW_LIMIT, YAW_LIMIT);
    // Vertical drags on touch screens are left to page scrolling.
    if (!dragging.touch) goal.pitch = clamp(goal.pitch + dy * 0.004, PITCH_MIN, PITCH_MAX);
    requestFrame();
  };
  const onUp = (e: PointerEvent): void => {
    if (dragging && e.pointerId === dragging.id) {
      dragging = null;
      if (mount.hasPointerCapture(e.pointerId)) mount.releasePointerCapture(e.pointerId);
    }
  };
  const onKey = (e: KeyboardEvent): void => {
    const step = 0.14;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft': goal.yaw = clamp(goal.yaw + step, -YAW_LIMIT, YAW_LIMIT); break;
      case 'ArrowRight': goal.yaw = clamp(goal.yaw - step, -YAW_LIMIT, YAW_LIMIT); break;
      case 'ArrowUp': goal.pitch = clamp(goal.pitch - 0.05, PITCH_MIN, PITCH_MAX); break;
      case 'ArrowDown': goal.pitch = clamp(goal.pitch + 0.05, PITCH_MIN, PITCH_MAX); break;
      case 'Home': api.resetView(); break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); stopAuto(); requestFrame(); }
  };
  mount.addEventListener('pointerdown', onDown);
  mount.addEventListener('pointermove', onMove);
  mount.addEventListener('pointerup', onUp);
  mount.addEventListener('pointercancel', onUp);
  mount.addEventListener('keydown', onKey);

  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((en) => en.isIntersecting);
    if (visible) { lastT = 0; requestFrame(); }
  });
  io.observe(mount);
  const onVisibility = (): void => { if (!document.hidden) { lastT = 0; requestFrame(); } };
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (e: Event): void => { e.preventDefault(); opts.onLost?.(); };
  canvas.addEventListener('webglcontextlost', onLost);

  // Blink every few seconds (skipped under reduced motion)
  let blinkTimer = 0;
  const scheduleBlink = (): void => {
    blinkTimer = window.setTimeout(() => {
      if (disposed) return;
      if (visible && !document.hidden) {
        blink = true; requestFrame();
        window.setTimeout(() => { blink = false; requestFrame(); }, 150);
      }
      scheduleBlink();
    }, 3800 + Math.random() * 3200);
  };
  if (!opts.reducedMotion) scheduleBlink();

  const api: ProductViewer = {
    resetView() {
      Object.assign(goal, { yaw: HOME.yaw, pitch: HOME.pitch, zoom: HOME.zoom, target: [...HOME.target] as Vec3 });
      requestFrame();
    },
    focusPart(id) {
      const f = (id && FOCUS[id]) || HOME;
      Object.assign(goal, { yaw: f.yaw, pitch: f.pitch, zoom: f.zoom, target: [...f.target] as Vec3 });
      stopAuto();
      requestFrame();
    },
    setAutoRotate(on) {
      autoRotate = on && !opts.reducedMotion;
      if (autoRotate) autoT = Math.asin(clamp(cam.yaw / 0.32, -1, 1)) / (Math.PI * 2) * 16;
      opts.onAutoRotateChange?.(autoRotate);
      requestFrame();
    },
    get autoRotate() { return autoRotate; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(blinkTimer);
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('pointerup', onUp);
      mount.removeEventListener('pointercancel', onUp);
      mount.removeEventListener('keydown', onKey);
      canvas.removeEventListener('webglcontextlost', onLost);
      renderer.dispose();
      canvas.remove();
    },
  };

  resize();
  return api;
}
