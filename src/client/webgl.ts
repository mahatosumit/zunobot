import { prefersReducedMotion } from './dom';

export function hasWebGL2(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Heuristics for "this device can comfortably run the 3D view without being asked". Everyone else gets a button or the render. */
export function canAutoLoad3D(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 4) return false;
  if (prefersReducedMotion()) return false;
  return window.matchMedia('(min-width: 961px)').matches && window.matchMedia('(pointer: fine)').matches;
}
