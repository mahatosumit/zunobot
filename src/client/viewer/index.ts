import {
  CanvasTexture, Color, DirectionalLight, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial, NeutralToneMapping, PCFShadowMap,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, ShadowMaterial, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildRobot } from './robot';

/**
 * ZunoBot product viewer (three.js). The public surface is intentionally tiny (createViewer / ProductViewer)
 * so the procedural model can be swapped for an approved GLB later without touching the page.
 *
 * Two modes share one scene:
 *  - "explore": drag / touch / keyboard orbit within limits, focus presets for each part, hotspot anchors.
 *  - "hero": no direct manipulation; the camera eases toward the pointer and turns a little as the hero scrolls away.
 * In both, only the camera moves. The robot itself never articulates.
 */
export interface AnchorState { x: number; y: number; facing: boolean }
export interface ViewerOptions {
  reducedMotion: boolean;
  mode?: 'explore' | 'hero';
  onAnchors?: (anchors: Record<string, AnchorState>) => void;
  onAutoRotateChange?: (on: boolean) => void;
  /** Called after the first frame has been drawn, so the caller can cross-fade from the poster. */
  onReady?: () => void;
  /** Called if the GPU context is lost; the caller should fall back to the static render. */
  onLost?: () => void;
}
export interface ProductViewer {
  resetView(): void;
  focusPart(id: string | null): void;
  setAutoRotate(on: boolean): void;
  readonly autoRotate: boolean;
  /** Hero mode: normalised pointer position, -1..1 on each axis. */
  setLook(x: number, y: number): void;
  /** Hero mode: how far the hero has scrolled out of view, 0..1. */
  setProgress(p: number): void;
  dispose(): void;
}

const FOV = 28;
const YAW_LIMIT = 2.1;
const PITCH_MIN = -0.02;
const PITCH_MAX = 0.42;
const BASE_PITCH = 0.1;
const BASE_TARGET = new Vector3(0, 1.5, 0);

interface Focus { target: [number, number, number]; zoom: number; yaw: number; pitch: number }
const FOCUS: Record<string, Focus> = {
  display: { target: [0, 2.6, 0], zoom: 0.5, yaw: 0.2, pitch: 0.06 },
  torso: { target: [0, 1.65, 0], zoom: 0.66, yaw: -0.22, pitch: 0.1 },
  drive: { target: [0, 0.5, 0], zoom: 0.62, yaw: 0.55, pitch: 0.2 },
  arms: { target: [0.5, 1.45, 0], zoom: 0.7, yaw: -0.55, pitch: 0.1 },
};
const HOME: Focus = { target: [BASE_TARGET.x, BASE_TARGET.y, BASE_TARGET.z], zoom: 1, yaw: 0, pitch: BASE_PITCH };

/** A soft radial blob under the robot: cheap ambient occlusion where it meets the floor. */
function contactShadow(): Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const mesh = new Mesh(new PlaneGeometry(2.3, 1.7), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  mesh.renderOrder = -1;
  return mesh;
}

export function createViewer(mount: HTMLElement, opts: ViewerOptions): ProductViewer {
  const mode = opts.mode ?? 'explore';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new WebGLRenderer({ antialias: !coarse, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  // The robot and the lights never move, so the shadow map only needs drawing once.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  // Studio lighting: a warm key from front-left (it casts the floor shadow), a cool rim from behind, a soft hemisphere fill.
  const key = new DirectionalLight(new Color('#ffe1b3'), 2.4);
  key.position.set(-2.6, 5.2, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2.2; key.shadow.camera.right = 2.2;
  key.shadow.camera.top = 3.6; key.shadow.camera.bottom = -1.2;
  key.shadow.camera.near = 1; key.shadow.camera.far = 14;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 5;
  const rim = new DirectionalLight(new Color('#9cc0ff'), 1.5);
  rim.position.set(3, 3.2, -4);
  scene.add(key, rim, new HemisphereLight(new Color('#eef2fa'), new Color('#3b2c16'), 0.55));

  const floor = new Mesh(new PlaneGeometry(12, 12), new ShadowMaterial({ opacity: 0.28 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor, contactShadow());

  const robot = buildRobot();
  scene.add(robot.root);

  const camera = new PerspectiveCamera(FOV, 1, 0.3, 60);
  mount.appendChild(canvas);

  // --- state ---------------------------------------------------------------------------------
  let width = 1, height = 1;
  let dprCap = coarse ? 1.5 : 2;
  let visible = true;
  let disposed = false;
  let ready = false;
  let autoRotate = mode === 'explore' && !opts.reducedMotion;
  let raf = 0;
  let needsFrame = true;
  let lastT = 0;
  let autoT = 0;
  const look = { x: 0, y: 0, p: 0 };

  const cam = { yaw: 0, pitch: BASE_PITCH, target: BASE_TARGET.clone(), zoom: 1 };
  const goal = { yaw: 0, pitch: BASE_PITCH, target: BASE_TARGET.clone(), zoom: 1 };
  const frameTimes: number[] = [];
  const tmp = new Vector3();

  const baseDistance = (): number => {
    const aspect = width / height;
    const t = Math.tan(MathUtils.degToRad(FOV) / 2);
    const padY = mode === 'hero' ? 0.56 : 0.62;
    return Math.max((robot.height / 2 + padY) / t, (robot.width / 2 + 0.18) / (t * aspect));
  };

  function draw(): void {
    const dist = baseDistance() * cam.zoom;
    camera.position.set(
      cam.target.x + dist * Math.sin(cam.yaw) * Math.cos(cam.pitch),
      cam.target.y + dist * Math.sin(cam.pitch),
      cam.target.z + dist * Math.cos(cam.yaw) * Math.cos(cam.pitch),
    );
    camera.lookAt(cam.target);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);

    if (opts.onAnchors) {
      const out: Record<string, AnchorState> = {};
      for (const [id, p] of Object.entries(robot.anchors)) {
        tmp.copy(p).project(camera);
        out[id] = { x: (tmp.x * 0.5 + 0.5) * 100, y: (1 - (tmp.y * 0.5 + 0.5)) * 100, facing: Math.abs(cam.yaw) < 1.05 && tmp.z < 1 };
      }
      opts.onAnchors(out);
    }
    if (!ready) { ready = true; opts.onReady?.(); }
  }

  function tick(t: number): void {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0.016;
    lastT = t;

    if (mode === 'hero') {
      goal.yaw = -0.18 + look.x * 0.22 + look.p * 0.75;
      goal.pitch = BASE_PITCH + look.y * 0.05 + look.p * 0.12;
      goal.zoom = 1 - look.p * 0.08;
    } else if (autoRotate) {
      autoT += dt;
      goal.yaw = Math.sin((autoT / 16) * Math.PI * 2) * 0.45;
    }
    const k = 1 - Math.exp(-dt * (mode === 'hero' ? 3.5 : 7));
    cam.yaw = MathUtils.lerp(cam.yaw, goal.yaw, k);
    cam.pitch = MathUtils.lerp(cam.pitch, goal.pitch, k);
    cam.zoom = MathUtils.lerp(cam.zoom, goal.zoom, k);
    cam.target.lerp(goal.target, k);

    draw();

    // Adaptive quality: if the first animated frames are slow, drop resolution, then soft shadows.
    if (frameTimes.length < 40 && dt > 0.001) {
      frameTimes.push(dt);
      if (frameTimes.length === 40) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        if (avg > 0.034 && dprCap > 1) { dprCap = 1; resize(); }
        if (avg > 0.05) { key.shadow.radius = 1; renderer.shadowMap.needsUpdate = true; }
      }
    }

    const settled = Math.abs(cam.yaw - goal.yaw) < 0.0005 && Math.abs(cam.pitch - goal.pitch) < 0.0005
      && Math.abs(cam.zoom - goal.zoom) < 0.0005 && cam.target.distanceTo(goal.target) < 0.0005;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestFrame();
  }

  // --- interaction (explore mode only) -------------------------------------------------------
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
    goal.yaw = MathUtils.clamp(goal.yaw - dx * 0.0085, -YAW_LIMIT, YAW_LIMIT);
    // Vertical drags on touch screens are left to page scrolling.
    if (!dragging.touch) goal.pitch = MathUtils.clamp(goal.pitch + dy * 0.004, PITCH_MIN, PITCH_MAX);
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
      case 'ArrowLeft': goal.yaw = MathUtils.clamp(goal.yaw + step, -YAW_LIMIT, YAW_LIMIT); break;
      case 'ArrowRight': goal.yaw = MathUtils.clamp(goal.yaw - step, -YAW_LIMIT, YAW_LIMIT); break;
      case 'ArrowUp': goal.pitch = MathUtils.clamp(goal.pitch - 0.05, PITCH_MIN, PITCH_MAX); break;
      case 'ArrowDown': goal.pitch = MathUtils.clamp(goal.pitch + 0.05, PITCH_MIN, PITCH_MAX); break;
      case 'Home': api.resetView(); break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); stopAuto(); requestFrame(); }
  };
  if (mode === 'explore') {
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('pointerup', onUp);
    mount.addEventListener('pointercancel', onUp);
    mount.addEventListener('keydown', onKey);
  }

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
        robot.setBlink(true); requestFrame();
        window.setTimeout(() => { if (!disposed) { robot.setBlink(false); requestFrame(); } }, 150);
      }
      scheduleBlink();
    }, 3800 + Math.random() * 3200);
  };
  if (!opts.reducedMotion) scheduleBlink();

  const setGoal = (f: Focus): void => {
    goal.yaw = f.yaw; goal.pitch = f.pitch; goal.zoom = f.zoom;
    goal.target.set(...f.target);
  };

  const api: ProductViewer = {
    resetView() {
      setGoal(HOME);
      requestFrame();
    },
    focusPart(id) {
      setGoal((id && FOCUS[id]) || HOME);
      stopAuto();
      requestFrame();
    },
    setAutoRotate(on) {
      autoRotate = on && mode === 'explore' && !opts.reducedMotion;
      if (autoRotate) autoT = (Math.asin(MathUtils.clamp(cam.yaw / 0.45, -1, 1)) / (Math.PI * 2)) * 16;
      opts.onAutoRotateChange?.(autoRotate);
      requestFrame();
    },
    get autoRotate() { return autoRotate; },
    setLook(x, y) {
      look.x = MathUtils.clamp(x, -1, 1); look.y = MathUtils.clamp(y, -1, 1);
      requestFrame();
    },
    setProgress(p) {
      look.p = MathUtils.clamp(p, 0, 1);
      requestFrame();
    },
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
      robot.dispose();
      scene.traverse((o) => {
        if (o instanceof Mesh && !robot.root.getObjectById(o.id)) {
          o.geometry.dispose();
          const mat = o.material as MeshBasicMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
      });
      env.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };

  if (mode === 'hero') { goal.yaw = cam.yaw = -0.18; }
  resize();
  return api;
}
